// Caves (TODO 29b) in a real browser: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// The cave is unreleased (no mouth on the surface), so the check enters it through Dungeons.enter. Real movement keys walk
// it room to room under the following room camera; the dark is readable (lit floor near a lantern, unlit floor not
// black); real E at the mouth leaves; 720p/1080p; zero page or shader errors. Writes the cave shot (world/). Port 8124.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8124;
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
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { RenderSystem } = await import('/src/systems/RenderSystem.js');   // for the cave render budget below
    const original = RenderSystem.prototype.render;
    RenderSystem.prototype.render = function (t) {
      this.renderer.info.autoReset = false; this.renderer.info.reset();
      original.call(this, t); window.__renderer = this.renderer;
    };
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  // Software rendering is far below 60 fps: drive time with explicit frames; a key is held across real frames.
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  const state = () => page.evaluate(() => { const s = window.LANTERNMOSS.Dungeons.inside; return s ? { x: s.x, z: s.z, room: s.room } : null; });
  await frames(10);
  // 29f released the original worlds' caves: the arch stands on the surface and E offers the way in.
  assert.ok(await page.evaluate(() => !!window.LANTERNMOSS.Dungeons.mouth?.parts), 'the cave mouth stands on the surface');
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.player.placeAt(L.Dungeons.mouth.dir); }); await frames(6);
  assert.match(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label ?? ''), /Enter /);

  // ---- in: the cave, the room camera, the dark ------------------------------------------------------------------------
  await page.evaluate(() => window.LANTERNMOSS.Dungeons.enter()); await frames(60);
  const layout = await page.evaluate(() => { const s = window.LANTERNMOSS.Dungeons.inside; return { rooms: s.layout.rooms.map(r => ({ id: r.id, x: r.x, z: r.z, doors: r.doors })), entrance: s.layout.entrance, mouth: s.layout.mouth }; });
  assert.ok((await state())?.room === layout.entrance, 'in the entrance room');
  // real keys: to the first neighbour of the entrance and back, each key held across frames
  const hold = async (code, n) => { await page.keyboard.down(code); await frames(n); await page.keyboard.up(code); await frames(2); };
  const e = layout.rooms.find(r => r.id === layout.entrance), [dir, next] = Object.entries(e.doors).find(([, id]) => id);
  const key = { n: 'KeyW', s: 'KeyS', e: 'KeyD', w: 'KeyA' }[dir];
  const start = await state();
  for (let i = 0; i < 6 && (await state()).z > e.z + 0.3; i++) await hold('KeyW', 8);   // to the room's centre line first: doors sit mid-wall
  for (let i = 0; i < 12 && (await state()).room !== next; i++) await hold(key, 30);
  const there = await state();
  assert.equal(there.room, next, `real ${key} walked from the entrance into ${next}`);
  const camera = await page.evaluate(async () => { const { camera } = await import('/src/render/scene.js'); const P = window.LANTERNMOSS.player; return camera.position.distanceTo(P.pos); });
  assert.ok(camera < 14, `the room camera followed (${camera.toFixed(1)} m)`);
  console.log(`PASS  real ${key} walked from the entrance (${start.x.toFixed(1)}, ${start.z.toFixed(1)}) into ${next}; the room camera followed`);

  // ---- the dark is readable, at 720p and 1080p; the shot ---------------------------------------------------------------
  /** Real keys toward (x, z): one axis at a time (doorways sit mid-wall), short holds, until within 0.4 m. */
  const goTo = async (x, z) => {
    for (let i = 0; i < 80; i++) {
      const s = await state(), dx = x - s.x, dz = z - s.z; if (Math.hypot(dx, dz) < 0.4) return true;
      const k = Math.abs(dz) > 0.3 && Math.abs(dx) <= 0.3 ? (dz < 0 ? 'KeyW' : 'KeyS') : dx < 0 ? 'KeyA' : 'KeyD';
      await hold(k, Math.max(2, Math.min(20, Math.round(Math.abs(k === 'KeyW' || k === 'KeyS' ? dz : dx) / 3.4 * 60))));
    }
    return false;
  };
  assert.ok(await goTo(there.x, e.z) && await goTo(e.x, e.z), 'back to the entrance room');
  assert.ok(await goTo(e.x, e.z + 1.2), 'to the shot spot');
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    await page.setViewport({ width: w, height: h }); await frames(4);
    const px = await page.evaluate(async () => {
      const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
      const bmp = await createImageBitmap(await L.PhotoMode.render.capture(ctx.time));
      const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
      const lum = (x, y) => { const d = g.getImageData(Math.round(x * (bmp.width - 1)), Math.round(y * (bmp.height - 1)), 1, 1).data; return 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]; };
      let max = 0, nonBlack = 0, n = 0;
      for (let y = 0.15; y < 0.85; y += 0.07) for (let x = 0.1; x < 0.9; x += 0.07) { const v = lum(x, y); max = Math.max(max, v); if (v > 12) nonBlack++; n++; }
      return { max, nonBlack: nonBlack / n, w: bmp.width };
    });
    assert.ok(px.max > 120 && px.nonBlack > 0.25, `${w}x${h}: lanterns light the cave, and it is not black (max ${px.max.toFixed(0)}, ${(px.nonBlack * 100).toFixed(0)}% visible)`);
    // A cave room must stay a small scene (29f). This is a regression guard, not a target: real timing is certified
    // only on the target device (docs/wiki/technical/performance.md).
    const budget = await page.evaluate(async () => {
      const { PERFORMANCE_BUDGET } = await import('/src/config/render.js'), r = window.__renderer;
      return { calls: r.info.render.calls, triangles: r.info.render.triangles, limit: PERFORMANCE_BUDGET.cave };
    });
    assert.ok(budget.calls <= budget.limit.calls && budget.triangles <= budget.limit.triangles,
      `${w}x${h}: the cave stays within its render budget (${budget.calls}/${budget.limit.calls} calls, ${budget.triangles}/${budget.limit.triangles} triangles)`);
    console.log(`  ${w}x${h} cave render: ${budget.calls} calls, ${budget.triangles} triangles`);
    if (w === 1280) {
      await page.evaluate(() => { document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed'); });
      await page.screenshot({ path: shotPath('cave'), type: 'jpeg', quality: 86 });
    }
  }
  console.log('PASS  720p and 1080p: lantern light and readable dark');

  // ---- real E at the mouth leaves -------------------------------------------------------------------------------------
  assert.ok(await goTo(layout.mouth.x, layout.mouth.z - 1.2), 'beside the mouth, outside the automatic exit patch');
  assert.match(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label ?? ''), /Leave the cave/);
  await page.keyboard.press('KeyE'); await frames(60);
  const out = await page.evaluate(async () => ({ inside: !!window.LANTERNMOSS.Dungeons.inside, indoors: (await import('/src/core/context.js')).ctx.indoors, dark: window.LANTERNMOSS.LocalLights.darkness }));
  assert.deepEqual(out, { inside: false, indoors: null, dark: 0 });
  assert.deepEqual(errors, []);
  console.log('PASS  real E at the mouth leaves the cave (daylight back); zero page or shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
}
