// Immutable matrix traversal regression: Edge, real movement, 720p/1080p; owns port 8141.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
import { discardWebGL } from './lib/discard-webgl.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8141 });
try {
  await page.evaluate(async () => {
    const { RenderSystem } = await import('/src/systems/RenderSystem.js');
    const render = RenderSystem.prototype.render;
    RenderSystem.prototype.render = function(time) { window.__staticRender = this; return render.call(this, time); };
    const L = window.LANTERNMOSS; L.CharacterSelect.pick('ranger'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    const { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    dayClock.t = .4 * DAY.length; dayClock.update = () => {};
  });
  for (const [width, height] of [[1280,720], [1920,1080]]) {
    await page.setViewport({ width, height });
    for (const planet of ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']) {
      await page.evaluate(async planet => {
        const { ctx } = await import('/src/core/context.js'); ctx.paused = false;
        const L = window.LANTERNMOSS; L.goToPlanet(planet); L.setWeather('clear'); L.player.invuln = 1e9;
      }, planet);
      await page.keyboard.down('KeyW');
      await page.evaluate(() => { for (let i = 0; i < 90; i++) window.LANTERNMOSS.update(1/60); });
      await page.keyboard.up('KeyW');
      const before = await page.evaluate(async () => {
        const { ctx } = await import('/src/core/context.js'); ctx.paused = true;
        const { scene } = await import('/src/render/scene.js');
        const render = window.__staticRender;
        scene.updateMatrixWorld(); render.render(ctx.time);
        if (render.renderer.getContext().isContextLost()) throw new Error('WebGL context lost');
        if (!render.renderer.info.render.calls) throw new Error('No draw calls in checked frame');
        window.__staticMatrices = new Map(); scene.traverse(o => window.__staticMatrices.set(o, o.matrixWorld.toArray()));
        window.__staticRoots = [];
        scene.traverseVisible(o => { if (Object.hasOwn(o, 'updateMatrixWorld')) window.__staticRoots.push(o); });
        if (!window.__staticRoots.length) throw new Error('No immutable branch shortcuts found');
        return render.canvas.toDataURL('image/png');
      });
      const after = await page.evaluate(async () => {
        const { scene } = await import('/src/render/scene.js'), { ctx } = await import('/src/core/context.js');
        // Exercise the optimization's immutable branches. Forcing the entire scene also updates unrelated,
        // intentionally dormant objects; the unchanged baseline has those differences too.
        for (const root of window.__staticRoots) root.updateMatrixWorld(true);
        window.__staticRender.render(ctx.time);
        const changed = []; scene.traverse(o => { const old = window.__staticMatrices.get(o); if (!old || old.some((n,i) => Math.abs(n-o.matrixWorld.elements[i]) > 1e-9)) changed.push({type:o.type,name:o.name,visible:o.visible,parent:o.parent?.type,old:old?.slice(12,15),now:o.matrixWorld.elements.slice(12,15)}); });
        window.__staticChanged = changed;
        return window.__staticRender.canvas.toDataURL('image/png');
      });
      writeFileSync(join(tmpdir(), `lanternmoss-static-${planet}-${height}.png`), Buffer.from(after.split(',')[1], 'base64'));
      const changed = await page.evaluate(() => window.__staticChanged);
      assert.equal(changed.length, 0, `${planet}: forced traversal changes world matrices: ${JSON.stringify(changed.slice(0,8))}`);
      assert.equal(after === before, true, `${planet}: forced traversal changes canvas pixels at ${width}x${height}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS ${planet} ${width}x${height}: movement, identical matrices and canvas pixels after forced traversal; no overflow`);
    }
  }
  await page.evaluate(() => { window.__tideRenderer = window.__staticRender.renderer; });
  await discardWebGL(page); await discardWebGL(page); // repeated loss is safe while the old RAF loop remains active
  await page.evaluate(() => new Promise(resolve => { let n=0; const tick=()=>++n===5?resolve():requestAnimationFrame(tick); requestAnimationFrame(tick); }));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await discardWebGL(page); // the initial title renderer has not been captured by the performance probe
  await page.evaluate(() => new Promise(resolve => { let n=0; const tick=()=>++n===5?resolve():requestAnimationFrame(tick); requestAnimationFrame(tick); }));
  assert.deepEqual(errors, []); console.log('PASS safe captured/title context cleanup with a live RAF loop; zero page/shader errors');
} finally { await close(); }
