// TODO 29c, port 8125. Real mouse/key casts in an unreleased cave at 720p/1080p, all heroes, pets, aiming,
// enemy health bars, wall movement, house peace and safe exit. Software frames are driven explicitly.
// The fighting happens in the widest ordinary room: the entrance is the safe room and, since 29e, the end room has
// a guardian of its own.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8125;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS|ERROR:/i.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 }); await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js');
    setSetting('pauseOnBlur', false); setSetting('quality', 'low'); setSetting('hitStop', false);
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height });
    for (const hero of ['witch', 'knight', 'ranger']) {
      await page.evaluate(async hero => {
        const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
        const { applyCharacter } = await import('/src/gameplay/characters.js');
        const { computeStats } = await import('/src/gameplay/equipment.js');
        const F = await import('/tests/sim/lib/caveFixture.mjs');
        F.clearCaveCombat(); applyCharacter(hero); L.Talents.clear(); L.player.level = 16; L.player.stats = computeStats(L.player);
        L.player.hp = L.player.stats.maxHp; L.player.mana = L.player.stats.maxMana; L.player.invuln = 1e9; L.Pets.command('passive');
        // The widest room that is not the end room: 29e keeps a guardian standing there, and this check is about
        // the hero's own kit, not the warden.
        const s = L.Dungeons.inside, r = s.layout.rooms.filter(r => r.id !== s.layout.end && r.id !== s.layout.entrance).sort((a, b) => b.w * b.d - a.w * a.d)[0];
        F.placeCaveHero(r.x, r.z + 2); L.cam.init = false; ctx.companion.snapToHero();
        F.spawnCaveEnemy('ogre', r.x + 1.1, r.z, { held: true, hp: 5000 });
      }, hero);
      await frames(8);
      // Click the actual floor under the enemy, so ground ray picking and turning are exercised too.
      const target = await page.evaluate(async () => {
        const { ctx } = await import('/src/core/context.js'), { camera } = await import('/src/render/scene.js'); camera.updateMatrixWorld();
        const p = ctx.enemies[0].pos.clone().project(camera);
        return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, hp: ctx.enemies[0].hp };
      });
      await page.mouse.click(target.x, target.y); await frames(45);
      const hit = await page.evaluate(async () => {
        const { ctx } = await import('/src/core/context.js'); return { hp: ctx.enemies[0].hp, bar: ctx.enemies[0].bar.style.display, face: ctx.player.fwd.x };
      });
      assert.ok(hit.hp < target.hp && hit.face > 0.05, `${hero}: mouse turns and casts on the room floor: ${JSON.stringify({ target, hit })}`);
      assert.equal(hit.bar, 'block', 'the damaged enemy health bar is visible');
      // Real G aims and confirms the hero's ultimate at the locked enemy.
      await page.evaluate(async () => {
        const { ctx } = await import('/src/core/context.js'), { kit, resetCooldowns } = await import('/src/combat/casting.js');
        ctx.player.mana = ctx.player.stats.maxMana; resetCooldowns(kit());
      });
      await page.keyboard.press('KeyG'); await frames(2);
      const aimed = await page.evaluate(async () => { const { aim } = await import('/src/combat/aiming.js'); return { id: aim.id, valid: aim.valid, y: aim.target?.y }; });
      assert.ok(aimed.id && aimed.valid && aimed.y < -2990, 'a ground marker aims at the room floor');
      await page.keyboard.press('KeyG'); await frames(90);
      assert.ok(await page.evaluate(async () => { const { ctx } = await import('/src/core/context.js'); return ctx.room.contains(ctx.player.pos, ctx.player.radius) && !ctx.player.motion; }));
      // A real movement key remains usable after an ultimate; the hero cannot walk through the room wall.
      await page.keyboard.down('KeyA'); await frames(200); await page.keyboard.up('KeyA'); await frames(2);
      const view = await page.evaluate(async () => {
        const { ctx } = await import('/src/core/context.js'), { camera } = await import('/src/render/scene.js');
        return { inside: ctx.room.contains(ctx.player.pos, ctx.player.radius), camera: camera.position.distanceTo(ctx.player.pos),
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
      });
      assert.ok(view.inside && view.camera < 14 && !view.overflow, `${hero}/${width}: walls hold, camera follows, nothing overflows`);
      console.log(`PASS  ${hero} ${width}x${height}: real click, ultimate keys, movement, health bar, room camera; no overflow`);
    }
  }
  // One calm, uncluttered combat frame in the wide end room; lanterns, hero, pet and two enemies read together.
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
    const { applyCharacter } = await import('/src/gameplay/characters.js'); F.clearCaveCombat(); applyCharacter('knight'); L.Pets.command('passive');
    const s = L.Dungeons.inside, r = s.layout.rooms.filter(r => r.id !== s.layout.end && r.id !== s.layout.entrance).sort((a, b) => b.w * b.d - a.w * a.d)[0];
    F.placeCaveHero(r.x, r.z + 2); L.cam.init = false; ctx.companion.snapToHero();
    const e = F.spawnCaveEnemy('goblin', r.x + 1.6, r.z, { static: true, hp: 500 }); e.fwd.copy(ctx.room.toward(e.pos, L.player.pos));
    F.spawnCaveEnemy('wisp', r.x - 2, r.z - 0.8, { static: true });
    L.player.fwd.copy(ctx.room.toward(L.player.pos, e.pos));
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    document.body.classList.add('photo');
  });
  await frames(120);
  await page.addStyleTag({ content: '#toast, #achv, #banner { display: none !important; }' });
  await page.screenshot({ path: shotPath('cave-combat'), type: 'jpeg', quality: 88 });
  await page.evaluate(() => document.body.classList.remove('photo'));
  // E at the mouth exits and restores the surface. Houses continue to reject combat input.
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'); F.clearCaveCombat();
    const m = L.Dungeons.inside.layout.mouth; F.placeCaveHero(m.x, m.z - 0.8);
  });
  await frames(2); await page.keyboard.press('KeyE'); await frames(60);
  assert.ok(await page.evaluate(async () => { const { ctx } = await import('/src/core/context.js'); return !ctx.room && !ctx.indoors && ctx.player.selfCollider.active && ctx.enemies.every(e => !e.space); }));
  await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).Houses.enter(0)); await frames(60);
  await page.keyboard.press('KeyQ'); await frames(20);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.projectiles.length), 0);
  assert.deepEqual(errors, []);
  console.log('PASS  real E leaves the cave; houses remain peaceful; zero page/shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
}
