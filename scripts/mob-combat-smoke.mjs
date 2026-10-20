// TODO 45b/45c, port 8128. Monsters fighting each other in a real browser at 720p/1080p: a goblin brawl that lands
// real damage, a wisp's orb hitting a goblin, no damage numbers for a brawl (they are the hero's feedback), a boss
// swinging over a lesser monster without touching it, and the hero reclaiming a monster mid-fight.
// Needs puppeteer-core: npm i --no-save --no-package-lock puppeteer-core. Software frames are driven explicitly.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8128;
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
    setSetting('pauseOnBlur', false); setSetting('quality', 'low'); setSetting('hitStop', false); setSetting('damageNumbers', true);
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('stay'); L.player.invuln = 1e9;
    L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);

  /** Two monsters set on each other a short walk from the hero, with everything else cleared away. */
  const stage = (a, b, apart) => page.evaluate(async ({ a, b, apart }) => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    const { offsetDir } = await import('/src/utils/sphere.js');
    for (const e of [...ctx.enemies]) { e.dispose(); ctx.enemies.splice(ctx.enemies.indexOf(e), 1); }
    const at = offsetDir(ctx.player.up, 0, 7);
    const put = (type, dir) => { const e = L.spawnEnemy(type, 3); e.spawn(dir); e.home.copy(dir); return e; };
    const one = put(a, at), two = put(b, offsetDir(at, 0.5, apart));
    one.provoke(two);
    return { one: one.hp, two: two.hp };
  }, { a, b, apart });
  const read = () => page.evaluate(async () => {
    const { ctx } = await import('/src/core/context.js');
    const [one, two] = ctx.enemies;
    return { oneHp: one?.hp, twoHp: two?.hp, oneFoe: one?.foe === two, twoFoe: two?.foe === one,
      numbers: document.querySelectorAll('.ft, .float, #floats > *').length, bars: ctx.enemies.filter(e => e.bar.style.display !== 'none').length };
  });

  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height }); await frames(8);

    // ---- a goblin brawl, in the real renderer
    const before = await stage('goblin', 'goblin', 1.6);
    await frames(360);
    const after = await read();
    assert.ok(after.twoHp < before.two, `${width}x${height}: a goblin's swipe damages the goblin it is fighting (${before.two} -> ${after.twoHp})`);
    assert.ok(after.twoFoe, `${width}x${height}: and the one that was hit turns on its attacker`);
    assert.equal(after.numbers, 0, `${width}x${height}: a brawl shows no damage numbers - they are the hero's feedback`);

    // ---- a ghost's orb, across kinds. A wisp keeps its distance, charges and fires on its own cooldown, so this
    // needs a long enough window rather than a frozen target: twenty seconds, where it lands in about eight.
    // The hero steps well away first: otherwise the goblin notices them, runs for them, and the check becomes about
    // where it wandered rather than about the orb.
    await page.evaluate(async () => {
      const { ctx } = await import('/src/core/context.js');
      const { offsetDir } = await import('/src/utils/sphere.js');
      ctx.player.placeAt(offsetDir(ctx.player.up, 1.4, 90)); ctx.player.vel.set(0, 0, 0);
    });
    await frames(10);
    const shot = await stage('wisp', 'goblin', 6);
    await frames(1200);
    const orb = await read();
    assert.ok(orb.twoHp < shot.two, `${width}x${height}: a wisp's orb damages a goblin (${shot.two} -> ${orb.twoHp})`);

    // ---- the hero reclaims a monster mid-brawl
    await stage('goblin', 'goblin', 1.6); await frames(120);
    const reclaimed = await page.evaluate(async () => {
      const { ctx } = await import('/src/core/context.js');
      const { damageEnemy } = await import('/src/combat/damage.js');
      damageEnemy(ctx.enemies[0], 1);
      return ctx.enemies[0].foe;
    });
    assert.equal(reclaimed, null, `${width}x${height}: a hit from the hero ends the brawl`);

    // ---- a boss swings over a lesser monster
    const boss = await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
      const { offsetDir } = await import('/src/utils/sphere.js');
      for (const e of [...ctx.enemies]) if (e !== ctx.boss) { e.dispose(); ctx.enemies.splice(ctx.enemies.indexOf(e), 1); }
      L.wakeBoss();
      const B = ctx.boss; ctx.player.placeAt(offsetDir(B.home, 0.3, 7)); ctx.player.invuln = 1e9;
      const g = L.spawnEnemy('goblin', 3); g.spawn(offsetDir(B.home, 0.3, 5)); g.home.copy(g.up.clone());
      B.aggro();
      return { name: B.def.name, goblin: g.hp };
    });
    await page.evaluate(() => { const L = window.LANTERNMOSS; for (let i = 0; i < 1200; i++) { L.update(1 / 60); L.player.invuln = 1e9; L.player.hp = L.player.stats.maxHp; } });
    const bossOut = await page.evaluate(async () => {
      const { ctx } = await import('/src/core/context.js');
      const g = ctx.enemies.find(e => e.type === 'goblin');
      return { hp: g?.hp, foe: g?.foe, bossFoe: ctx.boss?.foe ?? null };
    });
    assert.equal(bossOut.hp, boss.goblin, `${width}x${height}: ${boss.name} never damages the goblin standing in its attacks (${boss.goblin} hp)`);
    assert.equal(bossOut.foe, null, `${width}x${height}: and never provokes it`);
    assert.equal(bossOut.bossFoe, null, `${width}x${height}: and is never drawn into a brawl itself`);

    // ---- nothing overflows
    const over = await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth, y: document.documentElement.scrollHeight > innerHeight }));
    assert.equal(over.x, false, `${width}x${height}: no horizontal overflow`);
    assert.equal(over.y, false, `${width}x${height}: no vertical overflow`);
    console.log(`PASS ${width}x${height}: brawl damage, orb damage, no numbers, hero reclaim, boss harmless, no overflow`);
  }

  // ---- the feature screenshot: a goblin and an ogre going at each other, the hero watching.
  // Taken on a fresh page: the boss bar, the bestiary toast and the health bars of the checks above are not the subject.
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 }); await page.click('[data-act="play"]');
  // The checks above left a save, so Play asks first: answer it the way a player would, rather than starting behind it.
  const confirmNew = await page.$('[data-go="confirm-new"]');
  if (confirmNew) await confirmNew.click();
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js');
    setSetting('pauseOnBlur', false); setSetting('quality', 'high'); setSetting('hitStop', false);
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('stay');
    L.player.invuln = 1e9; L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await frames(30);
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    const { offsetDir } = await import('/src/utils/sphere.js');
    const { clearStage } = await import('/src/ui/showcase.js');
    const THREE = await import('three');
    for (const e of [...ctx.enemies]) { e.dispose(); ctx.enemies.splice(ctx.enemies.indexOf(e), 1); }
    const { SPAWN_DIR } = await import('/src/world/World.js');
    ctx.player.placeAt(offsetDir(SPAWN_DIR, 0.9, 38));       // open meadow: no houses, lanterns or villagers in the way
    ctx.player.vel.set(0, 0, 0);
    const face = new THREE.Vector3();
    clearStage(face, { bodies: [] });                        // an unobstructed view, the hero turned to it
    // clearStage leaves `face` at the showcase side-angle; the picture wants the hero's own heading, straight at the pair
    L.cam.fwd.copy(ctx.player.fwd); L.cam.init = false;
    L.cam.dist = L.cam.curDist = 8; L.cam.pitch = L.cam.effPitch = 0.3;      // in close, looking slightly down on them
    const { advance } = await import('/src/combat/space.js');
    const put = (type, dir) => { const e = L.spawnEnemy(type, 3); e.spawn(dir); e.home.copy(dir); return e; };
    // squarely along the hero's facing, one either side of it, so the camera frames the pair
    const P = ctx.player, right = new THREE.Vector3().crossVectors(P.up, P.fwd).normalize();
    // Off to one side of the hero's view, so neither the witch nor the scenery behind her stands in front of them.
    const ahead = advance(advance(P.up, P.fwd, 5), right, 2.4);
    const a = put('goblin', advance(ahead, right, 1.1)), b = put('ogre', advance(ahead, right.clone().negate(), 1.1));
    a.fwd.copy(b.pos).sub(a.pos).normalize(); b.fwd.copy(a.pos).sub(b.pos).normalize();
    a.provoke(b); b.provoke(a);
    // A moment part-way through their fight, landed through the real rule rather than waited for, so the two stay
    // squared up for the picture instead of drifting apart or breaking off.
    const { hitMob } = await import('/src/combat/damage.js');
    for (let i = 0; i < 3; i++) { hitMob(a, b, b.def.hp * 0.12); hitMob(b, a, a.def.hp * 0.1); }
    ctx.player.invuln = 1e9;
  });
  await frames(6);
  await page.evaluate(() => {                                // nothing in the frame that is not the subject
    document.getElementById('toast').style.display = 'none';   // a fading toast is still a toast in the frame
    document.getElementById('hint').style.display = 'none';  // the controls card, which a player folds away with H
  });
  const staged = await page.evaluate(async () => {
    const { ctx } = await import('/src/core/context.js');
    return { monsters: ctx.enemies.length, foes: ctx.enemies.filter(e => e.foe).length,
      hurt: ctx.enemies.filter(e => e.hp < e.def.hp).length,
      bossBar: getComputedStyle(document.getElementById('bossbar')).display,
      toasts: getComputedStyle(document.getElementById('toast')).display !== 'none' &&
        Number(getComputedStyle(document.getElementById('toast')).opacity) > 0.01 ? 1 : 0,
      menus: [...document.querySelectorAll('#pause, #title, #dialog, [data-go="confirm-new"]')]
        .filter(el => el.getClientRects().length > 0)        // really on screen, not inside a hidden parent
        .map(el => el.id || el.dataset.go) };
  });
  console.log('staged:', JSON.stringify(staged));
  assert.equal(staged.monsters, 2, 'exactly the two monsters the picture is about');
  assert.ok(staged.foes >= 1, 'still set on each other in the frame (a hurt goblin may break off to flee, which is its own rule)');
  assert.ok(staged.hurt >= 1, 'and the fight has drawn blood, so the health bars tell the story');
  assert.equal(staged.bossBar, 'none', 'no boss bar left over from the checks above');
  assert.equal(staged.toasts, 0, 'and no toast in the frame');
  assert.deepEqual(staged.menus, [], 'and no menu or dialog covering the picture');
  await page.screenshot({ path: shotPath('mob-brawl'), type: 'jpeg', quality: 86 });
  console.log(`saved ${shotPath('mob-brawl')} (${JSON.stringify(staged)})`);
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('All mob combat browser checks passed (720p + 1080p, real WebGL).');
} finally {
  if (browser) await Promise.race([browser.close(), new Promise(r => setTimeout(r, 15000))]);
  server.kill();
}
