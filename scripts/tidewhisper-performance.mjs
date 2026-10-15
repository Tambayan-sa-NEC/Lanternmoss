// Actual fourth-world browser measurements; diagnostics by default. --release writes certification ONLY on a passing Iris Xe.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
import { PERFORMANCE_BUDGET } from '../src/config/render.js';
import { frameLimitMs } from '../src/config/contentGate.js';
const release = process.argv.includes('--release');
const cwd = fileURLToPath(new URL('..', import.meta.url));
const candidateCommit = execFileSync('git', ['rev-parse','HEAD'], { cwd, encoding:'utf8' }).trim();
const dirty = !!execFileSync('git', ['status','--porcelain','--untracked-files=no'], { cwd, encoding:'utf8' }).trim();
const { browser, page, errors, close } = await tidewhisperBrowser({ port: 8115, software: false });
try {
  // p95FrameMs is the real interval between rendered frames: the only number that includes browser compositing, GC and
  // everything else. The browser paces frames at 60 Hz (uncapping flags have no effect, headless or headed), so even an
  // empty page measures ~16.7 ms with jitter. Record that empty-page clock in the same browser so the report shows how
  // close to the frame clock the game is. Per-frame CPU (game loop) and GPU (timer query) times are diagnostics only:
  // they omit browser work and can read well under the real interval.
  const clockPage = await browser.newPage(); await clockPage.setContent('<canvas></canvas>');
  const frameClock = await clockPage.evaluate(() => new Promise(resolve => {
    const t = [], tick = now => { t.push(now); if (t.length <= 240) return requestAnimationFrame(tick);
      const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
      resolve({ samples: d.length, medianMs: d[d.length >> 1], p95Ms: d[Math.ceil(d.length * .95) - 1] }); };
    requestAnimationFrame(tick);
  }));
  await clockPage.close(); await page.bringToFront();
  console.log(JSON.stringify({ emptyPageFrameClock: frameClock }));
  const device = await page.evaluate(async () => {
    const { RenderSystem } = await import('/src/systems/RenderSystem.js'), original = RenderSystem.prototype.render;
    const p = window.__tidePerf = { frames: [], pending: [], left: 0, warmup: 0, last: null, current: null };
    let timer = null;
    RenderSystem.prototype.render = function(time) {
      const start = performance.now(), gl = this.renderer.getContext();
      timer ??= gl.getExtension('EXT_disjoint_timer_query_webgl2') ?? false;
      for (const q of p.pending.splice(0)) {                       // collect finished GPU timings from earlier frames
        if (!gl.getQueryParameter(q.query, gl.QUERY_RESULT_AVAILABLE)) { p.pending.push(q); continue; }
        if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) q.frame.gpuMs = gl.getQueryParameter(q.query, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(q.query);
      }
      const measuring = p.warmup <= 0 && p.left > 0 && p.last !== null, query = measuring && timer ? gl.createQuery() : null;
      if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      this.renderer.info.autoReset = false; this.renderer.info.reset(); original.call(this, time);
      if (query) gl.endQuery(timer.TIME_ELAPSED_EXT);
      window.__tideRenderer = this.renderer;
      if (p.warmup > 0) p.warmup--;
      else if (measuring) {
        const frame = { intervalMs: start - p.last, cpuMs: null, gpuMs: null, ...this.renderer.info.render };
        p.frames.push(frame); p.current = frame; p.left--;
        if (query) p.pending.push({ query, frame });
      }
      p.last = start;
    };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(now => {
      p.current = null; const start = performance.now(); callback(now);
      if (p.current) p.current.cpuMs = performance.now() - start;
    });
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
    await page.waitForFunction(() => window.__tidePerf.left === 0 && !window.__tidePerf.pending.length, { timeout: 240000, polling: 100 });
    const measurement = await page.evaluate(() => {
      const frames = window.__tidePerf.frames;
      const p95 = key => { const v = frames.map(f => f[key]).filter(x => x !== null).sort((a,b) => a-b); return v.length ? v[Math.ceil(v.length * .95)-1] : null; };
      const gl = window.__tideRenderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { samples: frames.length, p95FrameMs: p95('intervalMs'), p95CpuMs: p95('cpuMs'), p95GpuMs: p95('gpuMs'),
        calls: Math.max(...frames.map(f => f.calls)), triangles: Math.max(...frames.map(f => f.triangles)),
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    });
    const row = { scene, ...measurement }; rows.push(row); console.log(JSON.stringify(row));
  }
  assert.deepEqual(errors, []);
  const gpu = rows[0].gpu, iris = /Iris(?:\(R\))?\s+Xe/i.test(gpu);
  const report = { measuredAt: new Date().toISOString(), candidateCommit, dirty, device: iris ? 'Intel Iris Xe' : gpu,
    browser: device, quality: 'low', viewport: [1280,720], candidate: true,
    frameMetric: 'p95FrameMs = real interval between rendered frames; p95CpuMs (game loop) and p95GpuMs (timer query, null if unavailable) are diagnostics that omit browser work',
    frameClock, rows };
  writeFileSync(new URL('../docs/tidewhisper-performance.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  const ceiling = PERFORMANCE_BUDGET.ceilings.tidewhisper;
  if (release) {
    assert.ok(!dirty, 'commit candidate source changes before recording release evidence');
    assert.ok(iris && rows.every(r => /Iris(?:\(R\))?\s+Xe/i.test(r.gpu)), `Iris Xe required; actual GPU: ${gpu}`);
    assert.ok(rows.every(r => r.samples >= 90 && r.p95FrameMs > 0 && r.p95FrameMs <= frameLimitMs(PERFORMANCE_BUDGET.targetFrameMs, frameClock)),
      `frame-time acceptance failed (limit ${frameLimitMs(PERFORMANCE_BUDGET.targetFrameMs, frameClock).toFixed(2)} ms)`);
    assert.ok(rows.every(r => r.calls > 0 && r.calls <= ceiling?.calls && r.triangles > 0 && r.triangles <= ceiling?.triangles), 'render-count acceptance failed');
    writeFileSync(new URL('../docs/releases/tidewhisper.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS Iris Xe certification saved; release flag still requires the complete 27h checklist.');
  } else console.log('Diagnostic report saved; no release certification written.');
} finally { await close(); }
