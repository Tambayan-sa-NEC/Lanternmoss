// Local light (TODO 29a) in a real browser: npm i --no-save --no-package-lock puppeteer-core; set CHROME for another browser.
// The harness: the village at night with darkness 1 and three lanterns (glowing, bloomed, with real lights). Checks that
// every patched shader compiles (zero shader errors), that changing the darkness never recompiles a program, that the
// pool switches its real lights together, that lit ground is brighter and unlit ground stays readable (not black) on the
// Low and High presets, the render cost with darkness 0 vs 1 at 1080p (a diagnostic on this machine, not certification),
// 720p/1080p, and zero page errors. Writes the lighting-harness shot (world/). Port 8123.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), port = 8123;
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
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false); setSetting('quality', 'low');
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('start')).display === 'none', { timeout: 60000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('cresult')).opacity) < 0.01, { timeout: 60000 });
  const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
  // night in the village, calm weather, the HUD hidden for clean pixels; the camera looks over the hero at the lanterns
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    dayClock.t = 0.9 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    document.body.classList.add('photo'); document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
  });
  await frames(30);
  const programs = () => page.evaluate(() => window.LANTERNMOSS.PhotoMode.render.renderer.info.programs.length);
  const render = () => page.evaluate(async () => { const { ctx } = await import('/src/core/context.js'); window.LANTERNMOSS.PhotoMode.render.render(ctx.time); });
  await render(); const p0 = await programs();

  // ---- darkness alone never recompiles ---------------------------------------------------------------------------------
  await page.evaluate(() => window.LANTERNMOSS.LocalLights.setDarkness(1)); await frames(2); await render();
  const p1 = await programs();
  await page.evaluate(() => window.LANTERNMOSS.LocalLights.setDarkness(0)); await frames(2); await render();
  const p2 = await programs();
  assert.equal(p1, p0, 'darkness 0 -> 1 compiled nothing new'); assert.equal(p2, p0, 'and back');
  console.log(`PASS  every patched shader compiles; darkness 0 -> 1 -> 0 compiles no new program (${p0} programs)`);

  // ---- the harness: three lanterns around the hero ----------------------------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, THREE = await import('three'), { scene } = await import('/src/render/scene.js'), { glowMat } = await import('/src/render/materials.js');
    const { dirAlong, tangentToward } = await import('/src/utils/sphere.js'), { groundHeight } = await import('/src/world/terrain.js');
    const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js'), P = L.player;
    const ahead = tangentToward(P.up, L.planets.world.spawnDir).negate(), side = ahead.clone().cross(P.up).normalize(); window.harnessSide = side; window.harnessAhead = ahead;
    window.harness = [[4, 0], [7, 3], [7, -3]].map(([f, s]) => {
      const d = dirAlong(dirAlong(P.up, ahead, f), side, s), pos = d.clone().multiplyScalar(groundHeight(d) + 1.6);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), glowMat(0xffd36b, 3)); glow.position.copy(pos); scene.add(glow);
      return { glow, light: L.LocalLights.add({ at: pos, radius: 5, color: 0xffd36b, intensity: 0.8, real: true }), pos };
    });
    P.fwd.copy(ahead); L.cam.pitch = 0.42; L.cam.dist = 9; resetView(ahead); snapCamera(P.up, ahead);
  });
  await frames(5);
  const sample = () => page.evaluate(async () => {
    const { ctx } = await import('/src/core/context.js'), L = window.LANTERNMOSS, { camera } = await import('/src/render/scene.js');
    // Measure terrain, not a foreground prop or a wandering actor at the projected pixel. The unmodified parent
    // also fails when a village object obscures a lantern sample. Keep the actual ground, lights and shaders.
    const { scene } = await import('/src/render/scene.js'), world = L.planets.world;
    world.scenery.visible = false; world.fireflies.visible = false;
    for (const g of world.grass) g.visible = false;
    for (const a of [ctx.player, ctx.companion, ...ctx.npcs, ...ctx.critters, ...ctx.birds, ...ctx.enemies].filter(Boolean)) {
      scene.remove(a.root, a.shadow);
      if (a.tele) scene.remove(a.tele);
    }
    const bmp = await createImageBitmap(await L.PhotoMode.render.capture(ctx.time));
    const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
    const lum = (x, y) => { const d = g.getImageData(Math.round(x * (bmp.width - 1)), Math.round(y * (bmp.height - 1)), 1, 1).data; return 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]; };
    // ground under each lantern, projected to the screen; and the dark ground well away from all of them
    const lit = window.harness.map(h => { const v = h.pos.clone().addScaledVector(h.pos.clone().normalize(), -1.5).project(camera); return lum((v.x + 1) / 2, (1 - v.y) / 2); });
    // unlit: ground 14 m ahead and 10 m to each side, about 10 m from the nearest lantern (beyond its 5 m radius and its
    // real light's 7 m reach) and inside the view
    const { dirAlong } = await import('/src/utils/sphere.js'), { groundHeight } = await import('/src/world/terrain.js');
    const off = s => { const d = dirAlong(dirAlong(L.player.up, window.harnessAhead, 14), window.harnessSide, s), v = d.clone().multiplyScalar(groundHeight(d)).project(camera);
      if (Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) throw new Error(`unlit sample off screen: ${v.x.toFixed(2)}, ${v.y.toFixed(2)}`); return lum((v.x + 1) / 2, (1 - v.y) / 2); };
    return { lit, dark: Math.min(off(10), off(-10)), lights: L.LocalLights.litPointLights(), pool: L.LocalLights.pool.map(l => l.visible) };
  });
  const result = {};
  for (const quality of ['low', 'high']) {
    await page.evaluate(async q => { (await import('/src/core/settings.js')).setSetting('quality', q); }, quality); await frames(3);
    await page.evaluate(() => window.LANTERNMOSS.LocalLights.setDarkness(0)); await frames(2); const surface = await sample();
    await page.evaluate(() => window.LANTERNMOSS.LocalLights.setDarkness(1)); await frames(2); const dark = await sample();
    result[quality] = { surface, dark };
    assert.equal(dark.lights, 4, `${quality}: four real lights while lanterns are near`); assert.ok(dark.pool.every(Boolean));
    assert.ok(dark.lit.every(l => l > dark.dark + 20), `${quality}: ground under every lantern is clearly brighter (${dark.lit.map(Math.round)} vs ${Math.round(dark.dark)})`);
    assert.ok(dark.dark >= 6, `${quality}: unlit ground stays readable, not black (${dark.dark.toFixed(1)})`);
    if (quality === 'low') await page.screenshot({ path: shotPath('lighting-harness'), type: 'jpeg', quality: 86 });
  }
  console.log(`PASS  the harness (night, darkness 1, three lanterns): lit ground ${result.low.dark.lit.map(Math.round).join('/')} and unlit ${result.low.dark.dark.toFixed(0)} on Low, ${result.high.dark.lit.map(Math.round).join('/')} and ${result.high.dark.dark.toFixed(0)} on High (0-255 luminance)`);

  // ---- the real lights switch together; removing the lanterns turns the pool off -----------------------------------------
  await page.evaluate(() => { for (const h of window.harness) h.light.remove(); }); await frames(2);
  assert.deepEqual(await page.evaluate(() => [window.LANTERNMOSS.LocalLights.litPointLights(), window.LANTERNMOSS.LocalLights.pool.some(l => l.visible)]), [0, false]);
  console.log('PASS  removing the lanterns turns all four real lights off together');

  // ---- render cost at 1080p: darkness 0 vs 1 (diagnostic) -----------------------------------------------------------------
  await page.setViewport({ width: 1920, height: 1080 }); await frames(2);
  const cost = await page.evaluate(async () => {
    const { ctx } = await import('/src/core/context.js'), R = window.LANTERNMOSS.PhotoMode.render, L = window.LANTERNMOSS;
    const time = d => { L.LocalLights.setDarkness(d); L.update(1 / 60); for (let i = 0; i < 5; i++) R.render(ctx.time); const t = performance.now(); for (let i = 0; i < 30; i++) R.render(ctx.time); R.renderer.getContext().finish(); return (performance.now() - t) / 30; };
    const a = time(0), b = time(1), c = time(0); return { off: (a + c) / 2, on: b };
  });
  console.log(`INFO  render cost at 1080p High in SwiftShader: darkness 0 ${cost.off.toFixed(1)} ms, darkness 1 ${cost.on.toFixed(1)} ms per frame (software rendering; not a hardware measurement)`);
  await page.setViewport({ width: 1280, height: 720 }); await frames(2);
  assert.deepEqual(errors, []);
  console.log('PASS  720p and 1080p; zero page or shader errors');
} finally {
  server.kill(); server.stdout?.destroy(); server.stderr?.destroy(); server.unref();
  if (browser) { let timer; try { await Promise.race([browser.close(), new Promise(r => { timer = setTimeout(() => { browser.process()?.kill(); r(); }, 10000); })]); } finally { clearTimeout(timer); } }
}
