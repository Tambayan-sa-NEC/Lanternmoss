// Actual fourth-world browser measurements; diagnostics by default. --release writes certification ONLY on a passing Iris Xe.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { cpus, freemem, totalmem, platform, release as osRelease } from 'node:os';
import { fileURLToPath } from 'node:url';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
import { PERFORMANCE_BUDGET } from '../src/config/render.js';
import { frameLimitMs } from '../src/config/contentGate.js';
const release = process.argv.includes('--release');
const outputArg = process.argv.indexOf('--output');
assert.ok(outputArg < 0 || process.argv[outputArg + 1], '--output requires a file path');
const output = outputArg < 0 ? new URL('../docs/tidewhisper-performance.json', import.meta.url) : process.argv[outputArg + 1];
const cwd = fileURLToPath(new URL('..', import.meta.url));
const candidateCommit = execFileSync('git', ['rev-parse','HEAD'], { cwd, encoding:'utf8' }).trim();
const dirty = !!execFileSync('git', ['status','--porcelain','--untracked-files=no'], { cwd, encoding:'utf8' }).trim();
const host = { platform: platform(), osRelease: osRelease(), cpu: cpus()[0]?.model, totalMemoryBytes: totalmem(), freeMemoryBeforeBrowserBytes: freemem() };
const { browser, page, errors, close } = await tidewhisperBrowser({ port: 8115, software: false });
try {
  // p95FrameMs is the real interval between rendered frames: the only number that includes browser compositing, GC and
  // everything else. On 60 Hz hosts even an empty page measures ~16.7 ms with jitter. Higher-refresh clocks fall back
  // to the fixed target through frameLimitMs. Record the empty-page clock in the same browser so the report shows how
  // close to the frame clock the game is. Per-frame CPU (game loop) and GPU (timer query) times are diagnostics only:
  // they omit browser work and can read well under the real interval.
  const session = await page.createCDPSession();
  const browserSession = await browser.target().createCDPSession();
  const { gpu: gpuInfo } = await browserSession.send('SystemInfo.getInfo');
  // The empty-page clock must not compete with the game's title-screen renderer in another tab.
  await session.send('Page.setWebLifecycleState', { state: 'frozen' });
  const clockPage = await browser.newPage(); await clockPage.setContent('<canvas></canvas>');
  const frameClock = await clockPage.evaluate(() => new Promise(resolve => {
    const t = [], tick = now => { t.push(now); if (t.length <= 240) return requestAnimationFrame(tick);
      const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
      resolve({ samples: d.length, medianMs: d[d.length >> 1], p95Ms: d[Math.ceil(d.length * .95) - 1] }); };
    requestAnimationFrame(tick);
  }));
  await clockPage.close(); await session.send('Page.setWebLifecycleState', { state: 'active' }); await page.bringToFront();
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
    // Hold authored light/tide phase steady while real render time continues normally.
    const { dayClock } = await import('/src/gameplay/dayClock.js'); dayClock.update = () => {};
    return { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio };
  });
  const rows = [];
  for (const seed of [1, 7]) for (const hero of ['witch', 'knight', 'ranger']) {
    await page.evaluate(async ({ seed, hero }) => {
      const L = window.LANTERNMOSS;
      L.CharacterSelect.pick(hero); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.goToPlanet('tidewhisper');
      const { seedPlay } = await import('/src/utils/random.js'); seedPlay(seed);
    }, { seed, hero });
    for (const [scene, phase, weather] of [['village', .4, 'clear'], ['night', .88, 'clear'], ['weather', .4, 'squall']]) {
      await page.evaluate(async ({ phase, weather, seed, scene }) => {
        const { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
        const { resetView, snapCamera } = await import('/src/systems/CameraSystem.js');
        const { seedPlay } = await import('/src/utils/random.js'); seedPlay(seed);
        const L = window.LANTERNMOSS; dayClock.t = phase * DAY.length; L.setWeather(weather); L.weather.timer = 1e9;
        L.player.placeAt(L.planets.world.spawnDir); L.player.invuln = 1e9;
        L.cam.pitch = .38; L.cam.dist = 8.5; resetView(L.player.fwd); snapCamera(L.player.up, L.player.fwd);
        const { ctx } = await import('/src/core/context.js'); ctx.paused = false;
        // Finish travel/camera/world setup before counting warmup or wall-clock samples.
        for (let i = 0; i < (scene === 'village' ? 120 : 2); i++) L.update(1/60);
        Object.assign(window.__tidePerf, { frames: [], left: 120, warmup: 30, last: null });
      }, { phase, weather, seed, scene });
      await page.waitForFunction(() => window.__tidePerf.left === 0 && !window.__tidePerf.pending.length, { timeout: 240000, polling: 100 });
      const measurement = await page.evaluate(async () => {
        const frames = window.__tidePerf.frames;
        const p95 = key => { const v = frames.map(f => f[key]).filter(x => x !== null).sort((a,b) => a-b); return v.length ? v[Math.ceil(v.length * .95)-1] : null; };
        const gl = window.__tideRenderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
        const { ctx } = await import('/src/core/context.js'), { settings } = await import('/src/core/settings.js');
        return { samples: frames.length, fps: 1000 / (frames.reduce((n,f) => n + f.intervalMs, 0) / frames.length),
          p95FrameMs: p95('intervalMs'), p95CpuMs: p95('cpuMs'), p95GpuMs: p95('gpuMs'),
          calls: Math.max(...frames.map(f => f.calls)), triangles: Math.max(...frames.map(f => f.triangles)),
          drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], quality: settings.quality,
          paused: ctx.paused, hidden: document.hidden, planetId: ctx.planetId, started: ctx.started,
          heroId: ctx.player.charId, level: ctx.player.level, petId: window.LANTERNMOSS.Pets.id,
          gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
      });
      assert.equal(measurement.planetId, 'tidewhisper'); assert.equal(measurement.quality, 'low');
      assert.equal(measurement.heroId, hero); assert.equal(measurement.started, true);
      assert.equal(measurement.paused, false); assert.equal(measurement.hidden, false); assert.equal(measurement.samples, 120);
      const row = { seed, hero, scene, phase, weather, ...measurement }; rows.push(row); console.log(JSON.stringify(row));
    }
    }
    assert.deepEqual(errors, []);
    assert.equal(rows.length, 18);
    assert.equal(new Set(rows.map(r => `${r.seed}/${r.hero}/${r.scene}`)).size, 18);
    const gpu = rows[0].gpu, iris = /Iris(?:\(R\))?\s+Xe/i.test(gpu);
    const report = { measuredAt: new Date().toISOString(), candidateCommit, dirty, device: iris ? 'Intel Iris Xe' : gpu,
      host, gpuDevices: gpuInfo?.devices ?? [], browser: device, quality: 'low', viewport: [1280,720], candidate: true,
      profile: 'stationary invulnerable hero at village spawn, passive default pet, authored generation seed, runtime seeds 1/7; fixed day/tide phase; 30 warmup and 120 real render intervals per row; empty-clock page measured with game tab frozen',
      frameMetric: 'p95FrameMs = real interval between rendered frames; p95CpuMs (game loop) and p95GpuMs (timer query, null if unavailable) are diagnostics that omit browser work',
      errors, frameClock, rows };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
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
