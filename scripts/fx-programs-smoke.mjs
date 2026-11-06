// Short-lived effects must not recompile shader programs mid-play. Edge/SwiftShader; owns port 8160.
// Emote bubbles, damage numbers, ground rings and swing arcs come and go repeatedly; once each has been drawn once,
// later ones must reuse the same compiled programs (a compile is a frame hitch).
import assert from 'node:assert/strict';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8160, candidate: false });
try {
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    const { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('knight'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    L.player.invuln = 1e9; dayClock.t = .4 * DAY.length; dayClock.update = () => {}; L.setWeather('clear'); ctx.paused = false;
    const { RenderSystem } = await import('/src/systems/RenderSystem.js'), render = RenderSystem.prototype.render;
    const probe = window.__fxProbe = { frames: 0, links: 0, hooked: false };
    RenderSystem.prototype.render = function(time) {
      if (!probe.hooked) { probe.hooked = true; const gl = this.renderer.getContext(), link = gl.linkProgram.bind(gl);
        gl.linkProgram = p => { probe.links++; return link(p); }; }
      render.call(this, time); probe.frames++; probe.programs = this.renderer.info.programs.length;
    };
  });
  const frames = async n => { const start = await page.evaluate(() => window.__fxProbe.frames);
    await page.waitForFunction(s => window.__fxProbe.frames >= s, { timeout: 60000 }, start + n); };
  // One cycle: every effect once, drawn, then played out to its end with explicit frames.
  const cycle = () => page.evaluate(async () => {
    const L = window.LANTERNMOSS, P = L.player;
    const { emote } = await import('/src/fx/emotes.js'), { floatText, ringFX, arcFX } = await import('/src/fx/combatFx.js');
    emote(P, 'heart'); floatText(P.pos, '12', '#ffd166'); ringFX(P.pos, 3, '#9fe2ff'); arcFX(P.pos, P.up, P.fwd, 2.4, 110, '#ffffff');
  });
  const finish = () => page.evaluate(() => { for (let i = 0; i < 150; i++) window.LANTERNMOSS.update(1 / 60); });
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height });
    await frames(3);
    await cycle(); await frames(3); await finish(); await frames(3);           // warm: first use may compile
    const before = await page.evaluate(() => ({ links: window.__fxProbe.links, programs: window.__fxProbe.programs }));
    for (let i = 0; i < 4; i++) { await cycle(); await frames(3); await finish(); await frames(3); }
    const after = await page.evaluate(() => ({ links: window.__fxProbe.links, programs: window.__fxProbe.programs,
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight }));
    assert.equal(after.links - before.links, 0, `${width}x${height}: effects recompiled ${after.links - before.links} shader programs over 4 cycles`);
    assert.equal(after.programs, before.programs, `${width}x${height}: program count changed ${before.programs} -> ${after.programs}`);
    assert.equal(after.overflow, false);
    console.log(`PASS ${width}x${height}: 4 effect cycles, 0 shader compiles, ${after.programs} programs, no overflow`);
  }
  assert.deepEqual(errors, []); console.log('PASS zero page/shader errors');
} finally { await close(); }
