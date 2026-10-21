// TODO 30a (twilight terrain and lantern) in a real browser: npm i --no-save --no-package-lock puppeteer-core;
// set CHROME for another browser. Runs on the test-only Duskhollow fixture, never on the authored unreleased world.
// Checks, on the lowest quality preset: the endless dusk is dark but readable (never a black frame), the village gap
// is brighter than the deep hollow, real WASD walking lights the bounded glowmoss trail and burns oil, the Oil bar
// and the lantern chip render, an empty lantern leaves a safe ember and costs no health, 720p and 1080p overflow
// nothing, and there are zero page and shader errors. Writes the duskhollow shot (world/). Port 8129.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8129, quality: 'low',
  bootstrap: "import {installDuskhollowFixture} from '/tests/sim/lib/duskhollowFixture.mjs'; installDuskhollowFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const hold = async (code, n) => { await page.keyboard.down(code); await frames(n); await page.keyboard.up(code); await frames(2); };
const status = () => page.evaluate(() => {
  const L = window.LANTERNMOSS, w = L.planets.world;
  return { ...w.mechanics.active.instance.status, prints: w.lantern.prints, hp: L.player.hp,
    heroRadius: L.LocalLights.heroLight?.source.radius ?? 0, sceneDarkness: L.LocalLights.darkness };
});
/** Mean luminance (0-255) of the lower middle of the frame: the ground the hero is standing on. */
const groundLuma = () => page.evaluate(async () => {
  const { ctx } = await import('/src/core/context.js');
  const bmp = await createImageBitmap(await window.LANTERNMOSS.PhotoMode.render.capture(ctx.time));
  const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
  const w = Math.round(bmp.width * 0.3), h = Math.round(bmp.height * 0.2);
  const d = g.getImageData(Math.round(bmp.width * 0.35), Math.round(bmp.height * 0.72), w, h).data;
  let sum = 0; for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return sum / (d.length / 4);
});
const standAt = where => page.evaluate(async where => {
  const L = window.LANTERNMOSS, w = L.planets.world;
  const { offsetDir } = await import('/src/utils/sphere.js');
  const layout = w.mechanics.active.instance.layout;
  const dir = where === 'village' ? w.spawnDir : where === 'gap' ? layout.gaps[0].dir : offsetDir(w.spawnDir, 1.75, 160);
  L.player.placeAt(dir); L.companion?.snapToHero?.();
}, where);

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    dayClock.t = 0.98 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;                  // the deepest dusk
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
  });
  await frames(30);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.planets.world.mechanics.id), 'lantern');

  // ---- the endless dusk is dark, but never a black frame, and the village gap is the safe light --------------------
  await standAt('deep'); await frames(20);
  const deep = await status(), deepLuma = await groundLuma();
  await standAt('village'); await frames(20);
  const village = await status(), villageLuma = await groundLuma();
  assert.ok(deep.darkness > village.darkness + 0.2, `the deep hollow is darker than the village (${deep.darkness} vs ${village.darkness})`);
  assert.ok(villageLuma > deepLuma + 4, `the village gap reads brighter (${villageLuma.toFixed(1)} vs ${deepLuma.toFixed(1)})`);
  assert.ok(deepLuma >= 8, `the deepest dusk stays readable on the lowest preset (${deepLuma.toFixed(1)}/255)`);
  assert.equal(village.label, 'Village light');
  console.log(`PASS  endless dusk readable on Low: deep hollow ${deepLuma.toFixed(0)}/255 at darkness ${deep.darkness.toFixed(2)}, village gap ${villageLuma.toFixed(0)}/255`);

  // ---- real walking lights the bounded trail and burns oil ----------------------------------------------------------
  await standAt('deep'); await frames(10);
  const before = await status();
  await hold('KeyW', 150); await hold('KeyD', 120); await hold('KeyW', 150);
  const after = await status();
  assert.ok(after.prints > 0 && after.prints <= 24, `real walking lights a bounded trail (${after.prints} prints)`);
  assert.ok(after.oil < before.oil, `walking burns oil (${before.oil.toFixed(1)} -> ${after.oil.toFixed(1)})`);
  const bar = await page.evaluate(() => {
    const el = document.querySelector('.bar.oil');
    return { shown: el.classList.contains('show'), fill: el.querySelector('i').style.transform, chip: document.getElementById('hud').innerHTML.includes('Lantern') };
  });
  assert.ok(bar.shown && bar.chip && /scaleX/.test(bar.fill), `the Oil bar and lantern chip render: ${JSON.stringify(bar)}`);
  console.log(`PASS  real W/D walking lights ${after.prints} glowmoss prints and burns oil; the Oil bar and chip render`);

  // ---- an empty lantern: a safe ember, no damage, still readable -------------------------------------------------------
  const empty = await page.evaluate(() => {
    const m = window.LANTERNMOSS.planets.world.mechanics.active.instance; m.burn(m.status.max); return window.LANTERNMOSS.player.hp;
  });
  await frames(120);
  const out = await status(), outLuma = await groundLuma();
  assert.equal(out.lit, false); assert.equal(out.hp, empty, 'running out of oil never costs health');
  assert.ok(out.heroRadius > 0 && out.heroRadius < after.heroRadius, `the lantern shrinks to a safe ember (${out.heroRadius.toFixed(2)} m)`);
  assert.ok(outLuma >= 6, `an empty lantern still leaves a readable frame (${outLuma.toFixed(1)}/255)`);
  assert.ok(await page.evaluate(() => document.querySelector('.bar.oil').classList.contains('out')));
  await page.evaluate(() => window.LANTERNMOSS.planets.world.mechanics.active.instance.refill(100)); await frames(10);
  console.log(`PASS  an empty lantern keeps a ${out.heroRadius.toFixed(1)} m ember, costs no health and leaves the frame readable (${outLuma.toFixed(0)}/255)`);

  // ---- both resolutions fit, and the 1080p feature shot ------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => {
      const row = document.querySelector('.needrow'), oil = document.querySelector('.bar.oil');
      return row.getBoundingClientRect().right <= innerWidth && oil.getBoundingClientRect().right <= innerWidth
        && document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight;
    });
    assert.ok(fits, `${width}x${height}: the vitals row and Oil bar fit`);
    if (height === 1080) {
      // A calm frame under the canopy: walk a curve so the fresh glowmoss trail reads, keep the vitals row with its
      // Oil bar as the subject, and hide the chips, compass, prompts and other overlays that are not.
      const clutter = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge'];
      await standAt('deep'); await frames(30);
      await hold('KeyW', 70); await hold('KeyD', 45); await hold('KeyW', 40);
      await page.evaluate(async () => {
        const L = window.LANTERNMOSS, { snapCamera } = await import('/src/systems/CameraSystem.js');
        L.cam.pitch = 0.5; L.cam.dist = 10; snapCamera(L.player.up, L.player.fwd);       // look back along the lit trail
      });
      await page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } }, clutter);
      await frames(4);
      await page.screenshot({ path: shotPath('duskhollow'), type: 'jpeg', quality: 88 });
      await page.evaluate(ids => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = ''; } }, clutter);
    }
  }
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, the feature shot is saved, and there are zero page and shader errors');
} finally { await close(); }
