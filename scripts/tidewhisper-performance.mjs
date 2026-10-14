// Actual fourth-world browser measurements; diagnostics by default. --release writes certification ONLY on a passing Iris Xe.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
import { PERFORMANCE_BUDGET } from '../src/config/render.js';
const release = process.argv.includes('--release');
const cwd = fileURLToPath(new URL('..', import.meta.url));
const candidateCommit = execFileSync('git', ['rev-parse','HEAD'], { cwd, encoding:'utf8' }).trim();
const dirty = !!execFileSync('git', ['status','--porcelain','--untracked-files=no'], { cwd, encoding:'utf8' }).trim();
const { page, errors, close } = await tidewhisperBrowser({ port: 8115, software: false });
try {
  const device = await page.evaluate(async () => {
    const { RenderSystem } = await import('/src/systems/RenderSystem.js'), original = RenderSystem.prototype.render;
    window.__tidePerf = { frames: [], left: 0, warmup: 0, last: null };
    RenderSystem.prototype.render = function(time) {
      const start = performance.now(); this.renderer.info.autoReset = false; this.renderer.info.reset(); original.call(this, time);
      window.__tideRenderer = this.renderer;
      const p = window.__tidePerf;
      if (p.warmup > 0) { p.warmup--; p.last = start; }
      else if (p.left > 0 && p.last !== null) {
        p.frames.push({ frameMs: start - p.last, ...this.renderer.info.render }); p.left--; p.last = start;
      }
    };
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.goToPlanet('tidewhisper');
    return { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio };
  });
  const rows = [];
  for (const [scene, phase, weather] of [['village', .4, 'clear'], ['night', .88, 'clear'], ['weather', .4, 'squall']]) {
    await page.evaluate(async ({ phase, weather }) => {
      const { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
      const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js');
      const { seedPlay } = await import('/src/utils/random.js'); seedPlay(1);
      const L = window.LANTERNMOSS; dayClock.t = phase * DAY.length; L.setWeather(weather); L.weather.timer = 1e9;
      L.player.placeAt(L.planets.world.spawnDir); L.player.invuln = 1e9;
      L.cam.pitch = .38; L.cam.dist = 8.5; resetView(L.player.fwd); snapCamera(L.player.up, L.player.fwd);
      Object.assign(window.__tidePerf, { frames: [], left: 120, warmup: 30, last: null });
    }, { phase, weather });
    await page.waitForFunction(() => window.__tidePerf.left === 0, { timeout: 240000, polling: 100 });
    const measurement = await page.evaluate(() => {
      const frames = window.__tidePerf.frames, sorted = frames.map(f => f.frameMs).sort((a,b) => a-b);
      const gl = window.__tideRenderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { samples: frames.length, p95FrameMs: sorted[Math.ceil(sorted.length * .95)-1],
        calls: Math.max(...frames.map(f => f.calls)), triangles: Math.max(...frames.map(f => f.triangles)),
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    });
    const row = { scene, ...measurement }; rows.push(row); console.log(JSON.stringify(row));
  }
  assert.deepEqual(errors, []);
  const gpu = rows[0].gpu, iris = /Iris(?:\(R\))?\s+Xe/i.test(gpu);
  const report = { measuredAt: new Date().toISOString(), candidateCommit, dirty, device: iris ? 'Intel Iris Xe' : gpu,
    browser: device, quality: 'low', viewport: [1280,720], candidate: true, rows };
  writeFileSync(new URL('../docs/tidewhisper-performance.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  const ceiling = PERFORMANCE_BUDGET.ceilings.tidewhisper;
  if (release) {
    assert.ok(!dirty, 'commit candidate source changes before recording release evidence');
    assert.ok(iris && rows.every(r => /Iris(?:\(R\))?\s+Xe/i.test(r.gpu)), `Iris Xe required; actual GPU: ${gpu}`);
    assert.ok(rows.every(r => r.samples >= 90 && r.p95FrameMs > 0 && r.p95FrameMs <= PERFORMANCE_BUDGET.targetFrameMs), 'frame-time acceptance failed');
    assert.ok(rows.every(r => r.calls > 0 && r.calls <= ceiling?.calls && r.triangles > 0 && r.triangles <= ceiling?.triangles), 'render-count acceptance failed');
    writeFileSync(new URL('../docs/releases/tidewhisper.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS Iris Xe certification saved; release flag still requires the complete 27h checklist.');
  } else console.log('Diagnostic report saved; no release certification written.');
} finally { await close(); }
