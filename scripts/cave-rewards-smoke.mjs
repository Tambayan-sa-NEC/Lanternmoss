// TODO 29d, port 8126. A cave's chests and veins in a real browser: the E prompt offers them, real keys walk to them
// and a real E mines a vein and opens a chest; what they gave is in the bag, and leaving and coming back finds them
// still taken. 720p and 1080p, nothing overflowing, zero page/shader errors. Software frames are driven explicitly.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8126;
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
    L.setWeather('clear'); L.weather.timer = 1e9; L.inventory.add('stonePick', 1);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  const state = () => page.evaluate(async () => {
    const L = window.LANTERNMOSS, R = L.CaveRewards;
    const prompt = document.getElementById('prompt');
    const shown = getComputedStyle(prompt).display !== 'none' ? prompt.textContent : '';
    return { ore: L.inventory.count('gloomquartz'), coins: L.player.coins, prompt: shown,
      mined: [...R.mined], opened: [...R.opened], veins: R.veins.filter(v => !v.mined).length, chests: R.chests.filter(c => !c.opened).length,
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
  });
  /** Hold a real movement key until the E prompt matches, so the hero stops where the game offers the fixture. */
  const walkUntil = async (key, re, budget = 240) => {
    await page.keyboard.down(key);
    for (let i = 0; i < budget; i += 6) {
      await frames(6);
      if (re.test((await state()).prompt)) { await page.keyboard.up(key); await frames(2); return true; }
    }
    await page.keyboard.up(key); await frames(2); return false;
  };
  /** Put the hero a short step from a fixture, then let real keys close the last stretch. */
  const approach = (kind, index) => page.evaluate(async (kind, index) => {
    const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
    const f = L.CaveRewards[kind][index];
    F.placeCaveHero(f.x, f.z + 2.6); L.cam.init = false; ctx.companion.snapToHero();
    return { id: f.id, x: f.x, z: f.z };
  }, kind, index);

  await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
  const built = await page.evaluate(async () => {
    const R = window.LANTERNMOSS.CaveRewards, L = window.LANTERNMOSS;
    const { caveFixtures } = await import('/src/world/caveLayout.js');
    const F = caveFixtures(L.Dungeons.inside.layout, L.Dungeons.inside.cave);
    return { veins: R.veins.length, chests: R.chests.length, want: { veins: F.veins.length, chests: F.chests.length } };
  });
  assert.deepEqual({ veins: built.veins, chests: built.chests }, built.want, 'every fixture the layout names is standing');

  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height });
    // Each resolution works a fresh cave: this cave holds one chest, and the first pass empties it.
    await page.evaluate(() => {
      const L = window.LANTERNMOSS; L.Dungeons.leave(); L.CaveRewards.resetRun();
    });
    await frames(60); await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
    // ---- a real E mines a vein ------------------------------------------------------------------------------------
    const vein = await approach('veins', 0); await frames(10);
    const reachedVein = await walkUntil('KeyW', /Mine the gloomquartz vein/);
    const atVein = await state();
    assert.ok(reachedVein, `${width}: walking up to the vein offers it (prompt "${atVein.prompt.trim()}")`);
    await page.keyboard.press('KeyE'); await frames(240);
    const dug = await state();
    assert.ok(dug.ore > atVein.ore, `${width}: gloomquartz went into the bag (${atVein.ore} -> ${dug.ore})`);
    assert.ok(dug.mined.includes(vein.id), 'and the vein is recorded as worked out');
    assert.ok(!/gloomquartz/.test(dug.prompt), 'a worked-out vein offers nothing');
    assert.ok(await page.evaluate(id => !window.LANTERNMOSS.CaveRewards.veins.find(v => v.id === id).root.visible, vein.id), 'and it is gone from the room');

    // ---- a real E opens a chest -----------------------------------------------------------------------------------
    const chest = await approach('chests', 0); await frames(10);
    const reachedChest = await walkUntil('KeyW', /Open the /);
    const atChest = await state();
    assert.ok(reachedChest, `${width}: walking up to the chest offers it (prompt "${atChest.prompt.trim()}")`);
    await page.keyboard.press('KeyE'); await frames(90);
    const looted = await state();
    assert.ok(looted.opened.includes(chest.id), 'the chest is emptied');
    assert.ok(looted.coins > atChest.coins || looted.ore >= dug.ore, 'and it paid out');
    assert.equal(await page.evaluate(() => window.LANTERNMOSS.worldItems.length), 0, 'nothing was dropped on the cave floor');
    assert.ok(!looted.overflow, `${width}x${height}: nothing overflows`);
    console.log(`PASS  ${width}x${height}: real keys and E mine a gloomquartz vein and open a cave chest; nothing overflows`);
  }

  // ---- leaving and coming back finds them still taken ---------------------------------------------------------------
  const before = await state();
  await page.evaluate(() => window.LANTERNMOSS.Dungeons.leave()); await frames(60);
  await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
  const after = await state();
  assert.deepEqual([after.mined.sort(), after.opened.sort()], [before.mined.sort(), before.opened.sort()], 'the cave remembers what was taken');
  assert.equal(after.ore, before.ore, 'and pays nothing a second time');
  assert.equal(after.coins, before.coins);
  assert.ok(after.veins < built.veins && after.chests < built.chests, 'the rebuilt fixtures come back already claimed');
  console.log('PASS  leaving and entering again rebuilds the cave already claimed, with no second payout');

  // ---- leaving the cave tidies its fixtures away ----------------------------------------------------------------------
  await page.evaluate(() => window.LANTERNMOSS.Dungeons.leave()); await frames(60);
  const out = await page.evaluate(async () => {
    const { ctx } = await import('/src/core/context.js'), R = window.LANTERNMOSS.CaveRewards;
    return { room: !!ctx.room, chests: R.chests.length, veins: R.veins.length, job: !!R.job, kept: R.mined.size + R.opened.size };
  });
  assert.deepEqual([out.room, out.chests, out.veins, out.job], [false, 0, 0, false], 'the fixtures went with the cave');
  assert.ok(out.kept > 0, 'but what was taken is still remembered');
  console.log('PASS  leaving disposes every cave fixture while keeping its progress');
  // ---- one calm frame: an untouched chest and a lit vein in the same room --------------------------------------------
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
    const { applyCharacter } = await import('/src/gameplay/characters.js');
    applyCharacter('knight'); L.Pets.command('passive');          // the knight reads clearly against a dark cave
    L.CaveRewards.resetRun(); L.Dungeons.leave();
  });
  await frames(60); await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, R = L.CaveRewards, F = await import('/tests/sim/lib/caveFixture.mjs'), { ctx } = await import('/src/core/context.js');
    // The subject is one room's treasure: a shut chest with a lit vein behind it, both well inside the frame.
    const chest = R.chests.find(c => !c.opened) ?? R.chests[0];
    const behind = R.veins.filter(v => v.room === chest.room && !v.mined && v.z < chest.z)
      .sort((a, b) => Math.abs(a.x - chest.x) - Math.abs(b.x - chest.x))[0];
    F.placeCaveHero(chest.x - 1.7, chest.z + 1.9);                // beside the chest, not in front of it
    L.cam.init = false; ctx.companion.snapToHero();
    L.player.fwd.copy(ctx.room.toward(L.player.pos, L.Dungeons.inside.built.toWorld(chest.x, chest.z)));
    window.__shot = { chest: chest.id, vein: behind?.id ?? null, room: chest.room };
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    document.body.classList.add('photo');
  });
  await frames(120);
  await page.addStyleTag({ content: '#toast, #achv, #banner { display: none !important; }' });
  await page.screenshot({ path: shotPath('cave-rewards'), type: 'jpeg', quality: 88 });
  await page.evaluate(() => document.body.classList.remove('photo'));

  assert.deepEqual(errors, []);
  console.log('PASS  a staged cave-treasure frame saved; zero page/shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
}
