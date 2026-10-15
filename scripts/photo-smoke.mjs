// Photo mode (TODO 39) in a real browser: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// Real K / drag / wheel / Q input, toolbar clicks, a real PNG download with the frame in its pixels, 720p/1080p bounds,
// closing restores play, and zero page or shader errors. Writes docs/screenshots/photo-mode.jpg and photo-storybook.jpg.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8116;
const shots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(shots, { recursive: true });
const downloads = mkdtempSync(join(tmpdir(), 'lanternmoss-photo-'));
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let error = '', browser; server.stderr.on('data', d => { error += d; });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(error || `Server exited (${code})`))); });
const close = async () => {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
  rmSync(downloads, { recursive: true, force: true });
};
try {
  await ready;
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text()); });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'medium');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip();
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  await page.evaluate(async () => {   // a calm daytime frame by the village square
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    dayClock.t = 0.42 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9; L.player.invuln = 1e9;
    document.getElementById('toast').style.opacity = 0;
  });
  // Software rendering is far slower than 60 fps, so held keys and easing are driven by explicit frames, as in the
  // other browser checks (the paused branch of the real game update runs photo mode).
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  const hold = async (code, n) => { await page.keyboard.down(code); await frames(n); await page.keyboard.up(code); };
  await frames(30);

  // ---- K opens it: paused, HUD hidden, toolbar shown, camera handed over --------------------------------------------
  const state = () => page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js'), { cam } = await import('/src/systems/CameraSystem.js');
    const v = L.PhotoMode.view, vis = id => getComputedStyle(document.getElementById(id)).visibility;
    return { open: L.PhotoMode.isOpen, paused: ctx.paused, combat: vis('combat'), hint: vis('hint'), bar: getComputedStyle(document.querySelector('#photomode')).display,
      photo: !!cam.photo, yaw: v && [v.fwd.x, v.fwd.y, v.fwd.z], pitch: v?.pitch, dist: v?.dist, roll: v?.roll,
      filter: L.PhotoMode.filter, frame: L.PhotoMode.frame, pose: L.PhotoMode.pose,
      overflow: document.documentElement.scrollWidth > innerWidth || document.querySelector('#photomode .ph-bar').getBoundingClientRect().right > innerWidth };
  });
  await page.mouse.move(640, 300); await page.keyboard.press('KeyK'); await new Promise(r => setTimeout(r, 300));
  let s = await state();
  assert.deepEqual([s.open, s.paused, s.combat, s.hint, s.bar, s.photo], [true, true, 'hidden', 'hidden', 'flex', true], JSON.stringify(s));
  console.log('PASS  K opens photo mode: the world pauses, the HUD hides, the toolbar and free camera take over');

  // ---- drag orbits, the wheel zooms, Q tilts; all clamped -----------------------------------------------------------
  const before = s;
  await page.mouse.move(640, 300); await page.mouse.down(); await page.mouse.move(760, 340, { steps: 8 }); await page.mouse.up();
  await page.mouse.wheel({ deltaY: -120 }); await page.mouse.wheel({ deltaY: -120 });
  await hold('KeyQ', 20);
  s = await state();
  assert.ok(Math.hypot(...s.yaw.map((v, i) => v - before.yaw[i])) > 0.05, 'drag orbits the view');
  assert.ok(s.pitch > before.pitch && s.dist < before.dist && s.roll < 0, JSON.stringify({ s, before }));
  for (let i = 0; i < 40; i++) await page.mouse.wheel({ deltaY: 120 });
  await hold('KeyQ', 120);
  s = await state();
  const lim = await page.evaluate(async () => (await import('/src/config/photo.js')).PHOTO.camera);
  assert.ok(Math.abs(s.dist - lim.maxDist) < 1e-6 && Math.abs(s.roll + lim.maxRoll) < 1e-6, 'zoom and tilt stop at their limits');
  await hold('KeyE', 120); assert.ok(Math.abs((await state()).roll - lim.maxRoll) < 1e-6, 'E tilts the other way');
  await hold('KeyD', 20); await hold('KeyW', 20);
  await page.evaluate(async () => {   // the docs framing: the hero from the front, turned to a heading clear of props
    const L = window.LANTERNMOSS, { clearStage } = await import('/src/ui/showcase.js'), face = L.player.fwd.clone();
    clearStage(face, { bodies: [] }); Object.assign(L.PhotoMode.view, { roll: -0.08, dist: 4.6, pitch: 0.2 }); L.PhotoMode.view.fwd.copy(face).negate();
  });
  console.log('PASS  drag orbits, the wheel zooms and Q / E tilt the horizon, each within its limits');

  // ---- toolbar: filter, frame, pose and emote; then save a real PNG with the frame in it -----------------------------
  await page.click('[data-ph="filter"]'); await page.click('[data-ph="frame"]'); await page.click('[data-ph="pose"]'); await page.click('[data-emote="0"]');
  s = await state(); assert.deepEqual([s.filter, s.frame, s.pose], [1, 1, 1]);
  const labels = await page.$$eval('#photomode [data-ph]', bs => bs.map(b => b.textContent).join(' | '));
  assert.ok(/Filter: Warm/.test(labels) && /Frame: Polaroid/.test(labels) && /Pose: Wave/.test(labels), labels);
  await frames(60);
  const arm = await page.evaluate(() => window.LANTERNMOSS.player.armL.rotation.x);
  assert.ok(arm < -2.3, `the witch waves with her free hand (${arm})`);
  await page.screenshot({ path: shots + 'photo-mode.jpg', type: 'jpeg', quality: 86 });
  // pixels of a fresh capture: the polaroid paper is in the corner and the deeper bottom edge, the scene in the middle
  const probe = () => page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    const blob = await L.PhotoMode.render.capture(ctx.time), bmp = await createImageBitmap(blob);
    const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    const px = (x, y) => [...g.getImageData(Math.round(x * (bmp.width - 1)), Math.round(y * (bmp.height - 1)), 1, 1).data.slice(0, 3)];
    return { w: bmp.width, h: bmp.height, corner: px(0.005, 0.01), bottom: px(0.5, 0.95), middle: px(0.5, 0.5) };
  });
  const paper = c => c.every(v => v > 215);
  let p = await probe();
  assert.ok(paper(p.corner) && paper(p.bottom) && !paper(p.middle), `polaroid frame in the picture: ${JSON.stringify(p)}`);
  await page.keyboard.press('Enter');
  let file; for (let i = 0; i < 100 && !file; i++) { await new Promise(r => setTimeout(r, 100)); file = readdirSync(downloads).find(f => f.endsWith('.png')); }
  assert.ok(file && /^lanternmoss-lanternmoss-\d{8}-\d{6}\.png$/.test(file), `downloaded ${file}`);
  const png = readFileSync(join(downloads, file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png.readUInt32BE(16), p.w); assert.equal(png.readUInt32BE(20), p.h);
  assert.deepEqual(await page.evaluate(() => window.LANTERNMOSS.PhotoMode.lastSaved.name), file);
  console.log(`PASS  filter, frame, pose and emote from the toolbar; Enter saved ${file} (${p.w}x${p.h}) with the polaroid frame in its pixels`);

  // ---- keys and the bare view: storybook frame, night filter, cheer; then 1080p bounds ----------------------------------
  for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit5']) await page.keyboard.press(k);   // night, storybook, cheer, star
  s = await state(); assert.deepEqual([s.filter, s.frame, s.pose], [2, 2, 2]);
  p = await probe(); const ink = c => c.every(v => v < 140);
  assert.ok(!paper(p.middle) && (paper(p.corner) || ink(p.corner)), `storybook frame: ${JSON.stringify(p)}`);
  await page.keyboard.press('KeyH'); await frames(60);
  await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; });
  assert.equal(await page.$eval('#photomode .ph-bar', b => getComputedStyle(b).display), 'none', 'H hides the toolbar');
  await page.screenshot({ path: shots + 'photo-storybook.jpg', type: 'jpeg', quality: 86 });
  await page.keyboard.press('KeyH');
  await page.setViewport({ width: 1920, height: 1080 }); await new Promise(r => setTimeout(r, 400));
  s = await state(); assert.equal(s.overflow, false, '1080p: the toolbar fits');
  await page.setViewport({ width: 1280, height: 720 }); await new Promise(r => setTimeout(r, 400));
  s = await state(); assert.equal(s.overflow, false, '720p: the toolbar fits');
  console.log('PASS  number keys cycle filter / frame / pose (storybook in the picture), H hides the bar; 720p and 1080p fit');

  // ---- Esc closes: play resumes with the HUD, the normal camera and no filter --------------------------------------------
  await page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 300));
  s = await state();
  assert.deepEqual([s.open, s.paused, s.combat, s.photo, s.bar], [false, false, 'visible', false, 'none'], JSON.stringify(s));
  p = await probe(); assert.ok(!paper(p.corner), 'no frame after closing');
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.PhotoMode.render.paperPass.uniforms.uFilter.value), 0);
  await page.keyboard.press('KeyK'); await page.keyboard.press('KeyK'); await new Promise(r => setTimeout(r, 200));
  assert.equal((await state()).open, false, 'K toggles it closed too');
  assert.deepEqual(errors, []);
  console.log('PASS  Esc / K close it: play, HUD, follow camera and plain finish return; zero page or shader errors');
} finally { await close(); }
