// Real browser checks for the Tide rematches (TODO 31e), Tidewhisper's unreleased encounters in the borrowed development
// slot. Owns port 8145. npm i --no-save --no-package-lock puppeteer-core; CHROME overrides the browser (Edge by default).
// After both campaign wins, a real E at Mirelure's lair really starts the rematch; her decoy lamps are really lit and
// marked while the game is held near the end of the wind-up (720p and 1080p, low quality, nothing overflowing); Old
// Ironclaw's carillon really rings its row of waves; zero page and shader errors. Writes bosses/tidewhisper-mirelure-decoys.
// The game stays paused except for the script's own fixed 60 fps steps: software rendering is too slow for real time.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8145;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser, stderr = ''; server.stderr.on('data', d => { stderr += d; });
const CLUTTER = ['hud', 'compass', 'combat', 'ebars', 'bossbar', 'markers', 'tip', 'achv', 'toast', 'challenge', 'cresult'];
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(stderr || `server exited ${code}`))); });
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
  page.setDefaultTimeout(120000);
  await page.setViewport({ width: 1280, height: 720 }); await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.evaluate(async () => {
    const { installMirelureFixture } = await import('/tests/sim/lib/mirelureFixture.mjs'); window.mireFixture = installMirelureFixture();
    const { setSetting } = await import('/src/core/settings.js'); setSetting('quality', 'low'); setSetting('pauseOnBlur', false);
    window.LANTERNMOSS.planets.lairs = {};                                   // the page booted the real Lanternmoss first: forget its lair
    window.LANTERNMOSS.goToPlanet('lanternmoss');
  });
  await page.click('[data-act="play"]');
  const frames = n => page.evaluate(async n => { const { ctx } = await import('/src/core/context.js'); ctx.paused = false; for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); ctx.paused = true; }, n);

  // ---- both campaign wins ---------------------------------------------------------------------------------------------------
  const beaten = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js'), { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    const { Quests } = await import('/src/gameplay/quests/Quests.js'), { offsetDir } = await import('/src/utils/sphere.js'), { damageEnemy } = await import('/src/combat/damage.js');
    const { Chests } = await import('/src/gameplay/Chests.js'), { currentInteraction } = await import('/src/gameplay/Houses.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    (await import('/src/utils/random.js')).seedPlay(1); ctx.paused = true;
    dayClock.skip((.4 * DAY.length - dayClock.t + DAY.length) % DAY.length, 'test'); L.player.level = 8; Quests.st('darkLighthouse').status = 'done';
    const B = ctx.boss, crab = L.enemies.find(e => e.type === 'ironclaw');
    for (const e of L.enemies) if (e.def.respawn && e !== crab) e.vanish();
    L.player.invuln = 1e5; ctx.paused = false;
    crab.openT = 99; damageEnemy(crab, crab.def.hp * 3); for (let i = 0; i < 90; i++) L.update(1 / 60);
    L.player.placeAt(offsetDir(B.home, .3, 15.5)); for (let i = 0; i < 60 * 8 && L.BossGate.state !== 'awake'; i++) L.update(1 / 60);
    B.aggro(); for (let i = 0; i < 60 * 3 && !B.lures.length; i++) L.update(1 / 60);
    for (let i = 0; i < 60 && B.alive; i++) { B.mode = 'surfaced'; B.hidden = false; damageEnemy(B, B.def.hp * 3); L.update(1 / 60); }
    for (let i = 0; i < 60 * 7; i++) L.update(1 / 60);
    for (const c of Chests.list) {
      if (c.opened) continue;
      L.player.placeAt(c.up); for (let i = 0; i < 20; i++) L.update(1 / 60);
      const act = currentInteraction(); if (/Treasure chest/.test(act?.label ?? '')) act.run(); else c.open();
      for (let i = 0; i < 40; i++) L.update(1 / 60);
    }
    for (const w of [...ctx.worldItems]) { L.player.placeAt(w.up); for (let i = 0; i < 40; i++) L.update(1 / 60); }
    window.lair = B.home.clone(); window.crabHome = crab.home.clone();
    ctx.paused = true;
    return { mire: L.planets.defeated.has('lanternmoss'), crab: L.planets.miniDefeated.has(crab.portalId) };
  });
  assert.deepEqual(beaten, { mire: true, crab: true });

  // ---- a real E at the lair starts Mirelure's rematch ------------------------------------------------------------------------
  await page.evaluate(async () => {
    const { Rematch } = await import('/src/gameplay/Rematch.js'); Rematch.cool = {};
    window.LANTERNMOSS.player.placeAt(window.lair); window.LANTERNMOSS.player.vel.set(0, 0, 0);
  });
  await frames(30);
  const label = await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label ?? '');
  assert.match(label, /Challenge Mirelure again/, `the lair offers it (${label})`);
  await page.keyboard.down('KeyE'); await frames(2); await page.keyboard.up('KeyE'); await frames(50);
  const started = await page.evaluate(async () => {
    const { Rematch } = await import('/src/gameplay/Rematch.js'); window.B = Rematch.fighting;
    return { type: Rematch.fighting?.type, active: Rematch.active, kit: Rematch.fighting?.def.phases[0].title };
  });
  assert.deepEqual(started, { type: 'mirelure', active: 'lanternmoss', kit: 'The false lights return' });
  console.log('PASS  a real E at her lair starts the rematch, in her own phases');

  // ---- the decoy ring: held near the end of the wind-up, so every lamp and circle is on screen --------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height });
    const shown = await page.evaluate(async () => {
      const L = window.LANTERNMOSS, B = window.B, { ctx } = await import('/src/core/context.js'), { dom } = await import('/src/ui/dom.js');
      const { offsetDir, tangentToward } = await import('/src/utils/sphere.js'), { resetView } = await import('/src/systems/CameraSystem.js');
      const { lampsOf } = await import('/src/entities/enemies/behaviors/boss/signatures.js');
      ctx.paused = false;
      for (const p of B.def.phases) p.attacks = ['decoys'];
      B.mode = 'deep'; B.surfaceT = 0;
      const view = offsetDir(B.home, .3, 19.5), look = tangentToward(view, B.home);
      const stage = () => { L.player.placeAt(view); L.player.vel.set(0, 0, 0); L.player.invuln = 1e5; L.player.hp = L.player.stats.maxHp; };
      stage(); for (let i = 0; i < 10; i++) L.update(1 / 60);
      B.moveCd = {}; B.cool = 0; B.lastAttack = null; B.state = 'chase'; B.aggro();
      for (let i = 0; i < 180 && !(B.attack === 'decoys' && B.state === 'windup'); i++) { stage(); L.update(1 / 60); }
      for (let i = 0; i < 180 && B.timer > B.windupTime * .22; i++) { stage(); L.update(1 / 60); }   // nearly there, never past it
      resetView(look); L.cam.pitch = 1.0;
      for (let i = 0; i < 3; i++) { stage(); L.player.fwd.copy(look); L.cam.fwd.copy(look); L.update(1 / 60); }
      const lamps = lampsOf(B, 'decoys'), marks = B.lureTele?.decoys ?? [];
      const out = { attack: B.attack, state: B.state, lamps: lamps.length, lit: lamps.filter(l => l.lamp.root.visible).length,
        marked: marks.filter(m => m.disc.mesh.visible && m.edge.mesh.visible).length, want: B.def.attacks.decoys.count };
      ctx.paused = true;
      dom.hint.style.display = 'none'; dom.prompt.style.display = 'none'; dom.toast.style.opacity = 0;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return out;
    });
    assert.equal(shown.attack, 'decoys'); assert.equal(shown.state, 'windup', 'held inside the wind-up');
    assert.equal(shown.lamps, shown.want, 'every lamp is lit'); assert.equal(shown.lit, shown.want, 'and drawn');
    assert.equal(shown.marked, shown.want, 'each with its circle marked on the ground');
    await page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, CLUTTER);
    const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth, y: document.documentElement.scrollHeight > innerHeight }));
    assert.deepEqual(overflow, { x: false, y: false }, `${width}x${height}: nothing overflows`);
    await page.screenshot({ path: join(tmpdir(), `lanternmoss-31e-decoys-${height}.png`) });
    if (height === 720) await page.screenshot({ path: shotPath('tidewhisper-mirelure-decoys'), type: 'jpeg', quality: 88 });
    await page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, CLUTTER);
    console.log(`PASS  ${width}x${height} low: ${shown.want} decoy lamps lit, each with its circle, held near the end of the wind-up`);
  }

  // ---- and then the lamps burst, and the ring is gone ------------------------------------------------------------------------
  const after = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    ctx.paused = false; for (let i = 0; i < 90; i++) { L.player.hp = L.player.stats.maxHp; L.update(1 / 60); } ctx.paused = true;
    return L.enemies.filter(e => e.type === 'falseLure' && e.alive).length;
  });
  assert.equal(after, 0, 'every lamp has burst and gone out');

  // ---- Old Ironclaw rings its row of waves ------------------------------------------------------------------------------------
  const rung = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js'), { Rematch } = await import('/src/gameplay/Rematch.js');
    const { currentInteraction } = await import('/src/gameplay/Houses.js'), { offsetDir } = await import('/src/utils/sphere.js');
    ctx.paused = false; Rematch.cancel(); Rematch.cool = {}; for (let i = 0; i < 30; i++) L.update(1 / 60);
    L.player.placeAt(window.crabHome); for (let i = 0; i < 30; i++) L.update(1 / 60);
    const act = currentInteraction(); if (!/Ironclaw/.test(act?.label ?? '')) throw new Error(`no crab prompt: ${act?.label}`);
    act.run(); for (let i = 0; i < 40; i++) L.update(1 / 60);
    const crab = Rematch.fighting; crab.def = { ...crab.def, speed: 0 };
    for (const e of L.enemies) if (e !== crab && e.alive && e.def.respawn !== undefined) e.vanish();
    for (const p of crab.def.phases) p.attacks = ['carillon'];
    L.player.placeAt(offsetDir(crab.up, 0, 6)); crab.moveCd = {}; crab.cool = 0; crab.lastAttack = null; crab.state = 'chase'; crab.aggro();
    const seen = new Set();
    for (let i = 0; i < 60 * 8; i++) { L.player.hp = L.player.stats.maxHp; L.player.invuln = 1e5; L.update(1 / 60); for (const w of crab.waves) seen.add(w); }
    ctx.paused = true; return { rings: seen.size, want: crab.def.attacks.carillon.rings };
  });
  assert.equal(rung.rings, rung.want, 'the carillon rings its row of waves');
  console.log(`PASS  Old Ironclaw's carillon rings ${rung.rings} bell waves`);
  assert.deepEqual(errors, []);
  console.log('PASS  zero page and shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) {
    let timeout;
    try {
      await Promise.race([browser.close(), new Promise(resolve => {
        timeout = setTimeout(() => { const child = browser.process(); child?.kill(); browser.disconnect(); for (const stream of child?.stdio ?? []) stream?.destroy?.(); child?.unref(); resolve(); }, 10000);
      })]);
    } finally { clearTimeout(timeout); }
  }
}
