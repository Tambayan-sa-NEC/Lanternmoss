// Bounty board (TODO 34) in a real browser: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// Real E at the board, the window at 720p/1080p, a real Claim click paying the reward, the claim surviving a full reload
// and Continue, and zero page or shader errors. Writes the bounty-board and bounty-window shots (village/, huds/).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8117;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
const close = async () => {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
};
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'medium');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('knight'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  // Software rendering is far below 60 fps: drive time with explicit frames.
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  // stand in front of the board, facing it, in a calm morning; the camera frames the hero and the board
  // (a step to the side, so the hero doesn't hide the notes)
  const toBoard = () => page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dirAlong, tangentToward } = await import('/src/utils/sphere.js');
    const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js'), b = L.Bounties.board, sq = L.planets.world.spawnDir;
    const front = tangentToward(b.dir, sq), side = front.clone().cross(b.dir).normalize();
    L.player.placeAt(dirAlong(dirAlong(b.dir, front, 1.5), side, 1.1)); L.player.fwd.copy(tangentToward(L.player.up, b.dir)); L.player.vel.set(0, 0, 0);
    L.player.invuln = 1e9; L.cam.pitch = 0.28; L.cam.dist = 6.5; resetView(tangentToward(L.player.up, dirAlong(b.dir, side, -0.4))); snapCamera(L.player.up, L.cam.fwd);
  });
  const tidy = () => page.evaluate(() => {   // toasts that are not the subject (an achievement toast overlaps the window)
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
    const achv = document.getElementById('achv'); if (achv) achv.style.visibility = 'hidden';
  });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    dayClock.t = 0.4 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await toBoard(); await frames(40);

  // ---- the board in the village; E opens the window --------------------------------------------------------------
  const prompt = await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label);
  assert.equal(prompt, 'Read the bounty board');
  // the docs shot: a still framing of the board with the hero beside it, from the first clear angle in front of it
  const framed = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { tangentToward } = await import('/src/utils/sphere.js');
    const { setShowcase, showcaseClear } = await import('/src/systems/CameraSystem.js'), b = L.Bounties.board, sq = L.planets.world.spawnDir;
    const { groundHeight } = await import('/src/world/terrain.js'), { dirAlong } = await import('/src/utils/sphere.js');
    const up = b.dir.clone(), front = tangentToward(b.dir, sq), look = dirAlong(b.dir, front, 1.1);     // just in front: outside the board's own collider
    const at = look.clone().multiplyScalar(groundHeight(look) + 1.2);
    for (const a of [0.45, -0.45, 0.8, -0.8, 0.2, -0.2, 0]) {
      const face = front.clone().applyAxisAngle(up, a);
      if (!showcaseClear(at, up, face, 5.5, 0.22)) continue;
      setShowcase({ at: out => out.copy(at), up, face, dist: 5.5, pitch: 0.22 }); return a;
    }
    return null;
  });
  assert.notEqual(framed, null, 'a clear view of the board');
  await frames(90); await tidy();
  await page.screenshot({ path: shotPath('bounty-board'), type: 'jpeg', quality: 86 });
  await page.evaluate(async () => (await import('/src/systems/CameraSystem.js')).setShowcase(null)); await toBoard(); await frames(10);
  await page.keyboard.press('KeyE'); await frames(2);
  const titles = await page.evaluate(() => window.LANTERNMOSS.Bounties.list.map(b => b.title));
  const shown = await page.$$eval('#bounty-menu .bounty-card strong', s => s.map(e => e.textContent));
  assert.deepEqual(shown, titles); assert.ok(await page.evaluate(async () => (await import('/src/core/context.js')).ctx.paused));
  assert.equal(await page.$$eval('#bounty-menu button[data-claim]:not(:disabled)', b => b.length), 0, 'nothing to claim yet');
  await page.keyboard.press('Escape'); await frames(2);
  assert.equal(await page.$eval('#bounty-menu', e => getComputedStyle(e).display), 'none');
  console.log(`PASS  the board stands in the village; real E opens today's jobs (${titles.join(' / ')}); Esc closes`);

  // ---- finish the jobs through the real event paths, claim one with a real click ------------------------------------
  const before = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { emit } = await import('/src/core/events.js'), { damageEnemy } = await import('/src/combat/damage.js');
    for (const b of L.Bounties.list) for (let n = 0; n < b.count; n++) {
      if (b.kind === 'defeat') { const e = L.spawnEnemy(b.target, 6); damageEnemy(e, 1e6); }
      if (b.kind === 'fish') emit('fishcaught', { itemId: b.target });
      if (b.kind === 'harvest') emit('harvested', { crop: 'carrot' });
      if (b.kind === 'bring' && n === 0) L.inventory.add(b.target, b.count);
    }
    return { coins: L.player.coins, ready: L.Bounties.list.map((_, i) => L.Bounties.ready(i)) };
  });
  assert.ok(before.ready.every(Boolean), JSON.stringify(before));
  await frames(30); await toBoard(); await frames(20);
  await page.keyboard.press('KeyE'); await frames(2);
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width: w, height: h }); await frames(2);
    const fits = await page.$eval('#bounty-menu .bounty-panel', p => { const r = p.getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth; });
    assert.ok(fits, `${w}x${h}: the board window fits`);
  }
  await tidy();
  await page.screenshot({ path: shotPath('bounty-window'), type: 'jpeg', quality: 86 });
  await page.click('#bounty-menu button[data-claim="0"]'); await frames(2);
  const after = await page.evaluate(() => { const L = window.LANTERNMOSS; return { coins: L.player.coins, claimed: [...L.Bounties.state.claimed], reward: L.Bounties.list[0].reward.coins,
    message: document.querySelector('#bounty-menu .home-message').textContent, done: document.querySelectorAll('#bounty-menu .bounty-done').length }; });
  assert.ok(after.coins - before.coins >= after.reward && after.claimed[0] && after.done === 1 && /Bounty claimed/.test(after.message), JSON.stringify(after));
  await page.keyboard.press('Escape'); await frames(2);
  console.log(`PASS  finished jobs show Claim; a real click paid +${after.coins - before.coins} coins and marked it claimed; 720p and 1080p fit`);

  // ---- a full reload and Continue keep the claim and the rest of the progress --------------------------------------
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  const restored = await page.evaluate(() => { const L = window.LANTERNMOSS; return { claimed: [...L.Bounties.state.claimed], ready: L.Bounties.list.map((_, i) => L.Bounties.ready(i)), notes: L.Bounties.board.parts.notes.map(n => n.visible) }; });
  assert.deepEqual(restored.claimed, [true, false, false]); assert.deepEqual(restored.ready, [false, true, true]); assert.deepEqual(restored.notes, [false, true, true]);
  assert.deepEqual(errors, []);
  console.log('PASS  a full reload and Continue keep the claim, the finished jobs and the board notes; zero page or shader errors');
} finally { await close(); }
