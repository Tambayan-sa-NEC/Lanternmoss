// Real WebGL benchmark: village at night in each planet's heaviest particle weather, at 1920x1080.
// npm i --no-save --no-package-lock puppeteer-core; CHROME selects Chrome/Edge. --quick shortens sampling.
// --baseline measures high only, before optimization; normal runs measure high/medium/low and check ceilings.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url)), port = 8095;
const args = new Set(process.argv.slice(2)), baseline = args.has('--baseline'), quick = args.has('--quick');
const output = new URL(baseline ? '../docs/performance-baseline.json' : '../docs/performance-results.json', import.meta.url);
const samples = quick ? 20 : 90, warmup = quick ? 12 : 30;
const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
let browser;
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.LANTERNMOSS, { timeout: 60000 });
  const device = await page.evaluate(async () => {
    const { RenderSystem } = await import('/src/systems/RenderSystem.js');
    const original = RenderSystem.prototype.render;
    window.__perf = { frames: [], left: 0, last: null, warmup: 0 };
    RenderSystem.prototype.render = function(time) {
      const start = performance.now(); this.renderer.info.autoReset = false; this.renderer.info.reset();
      original.call(this, time);
      const p = window.__perf, end = performance.now();
      if (p.warmup > 0) { p.warmup--; p.last = start; }
      else if (p.left > 0 && p.last !== null) {
        p.frames.push({ frameMs: start - p.last, renderMs: end - start, ...this.renderer.info.render }); p.left--; p.last = start;
      }
      window.__renderer = this.renderer;
    };
    const { seedPlay } = await import('/src/utils/random.js'); seedPlay(1);
    const { setSetting } = await import('/src/core/settings.js'); setSetting('pauseOnBlur', false);
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin();
    return { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio };
  });
  const rows = [];
  for (const planetId of ['lanternmoss', 'emberfall', 'frostveil']) for (const quality of baseline ? ['high'] : ['high', 'medium', 'low']) {
    const scene = await page.evaluate(async ({ planetId, quality, warmup, samples }) => {
      const { setSetting } = await import('/src/core/settings.js'); const { dayClock } = await import('/src/gameplay/dayClock.js');
      const { DAY } = await import('/src/config/day.js'); const { WEATHER_KINDS, WEATHER } = await import('/src/config/weather.js');
      const { seedPlay } = await import('/src/utils/random.js'); const { ctx } = await import('/src/core/context.js');
      const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js');
      const L = window.LANTERNMOSS; L.PauseMenu.close(); seedPlay(1); setSetting('quality', quality);
      L.goToPlanet(planetId); dayClock.t = DAY.length * 0.88;
      const world = L.planets.world;
      const weather = Object.keys(world.planet.weather).sort((a, b) => {
        const weight = id => Object.keys(WEATHER.counts).reduce((sum, k) => sum + (WEATHER_KINDS[id][k] ?? 0) * WEATHER.counts[k], 0);
        return weight(b) - weight(a);
      })[0];
      L.setWeather(weather); L.weather.timer = 1e9;
      L.player.placeAt(world.spawnDir); L.player.invuln = 1e9; L.player.lastHurt = ctx.time; L.Pets.command('passive');
      L.cam.pitch = 0.38; L.cam.dist = 8.5; resetView(L.player.fwd); snapCamera(L.player.up, L.player.fwd);
      Object.assign(window.__perf, { frames: [], left: samples, last: null, warmup });
      return { planetId, quality, weather };
    }, { planetId, quality, warmup, samples });
    await page.waitForFunction(() => window.__perf.left === 0, { timeout: 180000, polling: 100 });
    const measurement = await page.evaluate(() => {
      const frames = window.__perf.frames, mean = key => frames.reduce((n, f) => n + f[key], 0) / frames.length;
      const sorted = frames.map(f => f.frameMs).sort((a, b) => a - b), r = window.__renderer, gl = r.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { samples: frames.length, fps: 1000 / mean('frameMs'), frameMs: mean('frameMs'), p95FrameMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
        renderMs: mean('renderMs'), calls: Math.max(...frames.map(f => f.calls)), triangles: Math.max(...frames.map(f => f.triangles)),
        points: Math.max(...frames.map(f => f.points)), lines: Math.max(...frames.map(f => f.lines)),
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    });
    const row = { ...scene, ...measurement }; rows.push(row); console.log(JSON.stringify(row));
  }
  if (errors.length) throw new Error(errors.join('\n'));
  writeFileSync(output, JSON.stringify({ version: 1, measuredAt: new Date().toISOString(), mode: quick ? 'quick' : 'full', device, rows }, null, 2) + '\n');
  if (!baseline) {
    const { PERFORMANCE_BUDGET } = await import('../src/config/render.js');
    for (const row of rows) {
      const limit = PERFORMANCE_BUDGET.ceilings[row.planetId];
      if (row.calls > limit.calls || row.triangles > limit.triangles) throw new Error(`${row.planetId}/${row.quality} exceeds render budget`);
    }
    const screenshots = fileURLToPath(new URL('../docs/screenshots/', import.meta.url)); mkdirSync(screenshots, { recursive: true });
    await page.evaluate(() => window.LANTERNMOSS.PauseMenu.open());
    await page.keyboard.press('F3');
    await page.waitForSelector('#perf-overlay:not([hidden])');
    await page.waitForFunction(() => document.getElementById('perf-overlay').textContent.includes('triangles'));
    assert.match(await page.$eval('#perf-overlay', e => e.textContent), /\d.*FPS.*ms\/frame/);
    await page.keyboard.press('F3'); await page.waitForSelector('#perf-overlay[hidden]');
    await page.keyboard.press('F3'); await page.waitForSelector('#perf-overlay:not([hidden])');
    await page.evaluate(() => { const L = window.LANTERNMOSS; L.PauseMenu.show('settings'); });
    assert.equal(await page.$$eval('[data-set$="Density"]', elements => elements.length), 5);
    const settingsShot = fileURLToPath(new URL('../docs/screenshots/performance-settings.jpg', import.meta.url));
    await page.screenshot({ path: settingsShot, type: 'jpeg', quality: 84 });
    await page.evaluate(() => window.LANTERNMOSS.PauseMenu.close());
    await page.screenshot({ path: `${screenshots}performance.jpg`, type: 'jpeg', quality: 84 });
  }
  console.log(`Saved ${fileURLToPath(output)}`);
} finally { await browser?.close(); server.kill(); }
