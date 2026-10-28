// TODO 29g: Tideglass Cavern in the released Tidewhisper world, at high tide and on Low quality.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';

const { page, errors, close } = await tidewhisperBrowser({ port: 8148, candidate: false, quality: 'low' });
const frames = n => page.evaluate(n => { for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60); }, n);
try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const { RenderSystem } = await import('/src/systems/RenderSystem.js');
    const render = RenderSystem.prototype.render;
    RenderSystem.prototype.render = function(t) {
      this.renderer.info.autoReset = false; this.renderer.info.reset(); render.call(this, t); window.__caveRenderer = this.renderer;
    };
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('stay'); L.player.invuln = 1e9;
    dayClock.skip((0.9 * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test');
    L.goToPlanet('tidewhisper'); L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await frames(30);
  const mouth = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, D = L.Dungeons;
    const { dryGround } = await import('/src/world/terrain.js'), { CAVE } = await import('/src/config/dungeons.js');
    return { name: D.mouth?.cave.name, built: !!D.mouth?.parts,
      highDry: dryGround(D.mouth.dir, CAVE.entrance.clearance, { high: true }) };
  });
  assert.deepEqual(mouth, { name: 'Tideglass Cavern', built: true, highDry: true });
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.player.placeAt(L.Dungeons.mouth.dir); });
  await frames(10);
  assert.equal(await page.evaluate(async () => (await import('/src/gameplay/Houses.js')).currentInteraction()?.label),
    'Enter Tideglass Cavern');
  await page.keyboard.press('KeyE'); await frames(75);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Dungeons.inside?.cave.id), 'tidewhisper-cave');
  console.log('PASS  the Tideglass mouth stays dry at high tide, and real E enters its cave');

  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(12);
    const view = await page.evaluate(async () => {
      const L = window.LANTERNMOSS, r = window.__caveRenderer;
      const { PERFORMANCE_BUDGET } = await import('/src/config/render.js');
      const { ctx } = await import('/src/core/context.js');
      const bmp = await createImageBitmap(await L.PhotoMode.render.capture(ctx.time));
      const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
      let max = 0, lit = 0, samples = 0;
      for (let y = 0.15; y < 0.85; y += 0.07) for (let x = 0.1; x < 0.9; x += 0.07) {
        const d = g.getImageData(Math.round(x * (bmp.width - 1)), Math.round(y * (bmp.height - 1)), 1, 1).data;
        const v = 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]; max = Math.max(max, v); if (v > 12) lit++; samples++;
      }
      bmp.close();
      return { darkness: L.LocalLights.darkness, lights: L.LocalLights.count,
        max, litFraction: lit / samples,
        calls: r.info.render.calls, triangles: r.info.render.triangles, budget: PERFORMANCE_BUDGET.cave,
        fits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight };
    });
    assert.equal(view.darkness, 1); assert.ok(view.lights >= 2 && view.fits);
    assert.ok(view.max > 120 && view.litFraction > 0.25, `${width}x${height}: lanterns must keep the room readable`);
    assert.ok(view.calls <= view.budget.calls && view.triangles <= view.budget.triangles,
      `${width}x${height}: ${view.calls} calls / ${view.triangles} triangles`);
    if (height === 1080) {
      await page.evaluate(() => {
        for (const id of ['combat', 'petcard', 'hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'toast', 'hint']) {
          const el = document.getElementById(id); if (el) el.style.visibility = 'hidden';
        }
      });
      await frames(8); await page.screenshot({ path: shotPath('tidewhisper-cave'), type: 'jpeg', quality: 88 });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS  lantern-lit cave fits Low at 720p/1080p, meets cave draw budgets, and has zero page/shader errors');
} finally { await close(); }
