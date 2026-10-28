// TODO 30c (Duskhollow's resources, weather and music) in a real browser: npm i --no-save --no-package-lock
// puppeteer-core; set CHROME for another browser. Runs on the test-only Duskhollow fixture, never on the authored
// unreleased world. Checks, on the lowest quality preset: a real E mines a lumen vein with the iron pickaxe, the
// Craft tab lists the lumen chain and the Dusk set, really using a glowcap pours oil, the deep-dark weather visibly
// darkens the frame without going black, a real E plants shade spores in the farm, 720p and 1080p overflow nothing,
// and there are zero page and shader errors. Writes the duskhollow-lumen shot (activities/). Port 8131.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8131, quality: 'low',
  bootstrap: "import {installDuskhollowFixture} from '/tests/sim/lib/duskhollowFixture.mjs'; installDuskhollowFixture();" });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
const CLUTTER = ['hud', 'ebars', 'bossbar', 'compass', 'prompt', 'markers', 'tip', 'challenge', 'cresult', 'toast'];
const hide = on => page.evaluate((ids, on) => { for (const id of ids) { const el = document.getElementById(id); if (el) el.style.visibility = on ? 'hidden' : ''; } }, CLUTTER, on);
/** Mean luminance (0-255) of a band of the frame: `far` is the hollow beyond the hero's own lantern, `near` the
    ground they stand on, which the lantern keeps readable whatever the weather does. */
const luma = (band = 'far') => page.evaluate(async band => {
  const { ctx } = await import('/src/core/context.js');
  const bmp = await createImageBitmap(await window.LANTERNMOSS.PhotoMode.render.capture(ctx.time));
  const cv = new OffscreenCanvas(bmp.width, bmp.height), g = cv.getContext('2d'); g.drawImage(bmp, 0, 0);
  const top = band === 'far' ? 0.08 : 0.72, height = 0.2;
  const d = g.getImageData(Math.round(bmp.width * 0.2), Math.round(bmp.height * top), Math.round(bmp.width * 0.6), Math.round(bmp.height * height)).data;
  let sum = 0; for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return sum / (d.length / 4);
}, band);

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    dayClock.t = 0.55 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    document.getElementById('toast').style.opacity = 0; document.getElementById('hint').classList.add('collapsed');
  });
  await frames(30);

  // ---- a real E mines a lumen vein with the iron pickaxe --------------------------------------------------------
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
    const { snapCamera } = await import('/src/systems/CameraSystem.js');
    const vein = L.Gathering.nodes.find(n => n.kind === 'lumenVein');
    L.inventory.add('ironPick', 1); L.Hotbar.select(L.inventory.find('ironPick'));
    L.player.placeAt(offsetDir(vein.up, 1.1, 1.3)); L.companion?.snapToHero?.();
    L.player.fwd.copy(tangentToward(L.player.up, vein.up));
    L.cam.pitch = 0.28; L.cam.dist = 6; snapCamera(L.player.up, L.player.fwd);
    window.veinId = vein.id;
  });
  await frames(10);
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(prompt, /Mine the Lumen vein/i, `the E prompt offers the vein (${prompt})`);
  for (let i = 0; i < 6 && !(await page.evaluate(() => window.LANTERNMOSS.inventory.count('lumenOre') > 0)); i++) {
    await page.keyboard.press('KeyE'); await frames(60);
  }
  const mined = await page.evaluate(() => ({ ore: window.LANTERNMOSS.inventory.count('lumenOre'),
    dust: window.LANTERNMOSS.inventory.count('lumenDust') }));
  assert.ok(mined.ore > 0, `real E mining gives lumen ore (${JSON.stringify(mined)})`);
  console.log(`PASS  real E with an iron pickaxe mines ${mined.ore} lumen ore (and ${mined.dust} dust)`);

  // ---- the shot: the hero swinging at a glowing lumen vein, seen from the side ---------------------------------------
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); await frames(6);
  // A vein that is still whole: a mined one puts its glow away while it regrows.
  const framed = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir, tangentToward } = await import('/src/utils/sphere.js');
    const { snapCamera } = await import('/src/systems/CameraSystem.js');
    const { camera } = await import('/src/render/scene.js');
    const vein = L.Gathering.nodes.find(n => n.kind === 'lumenVein' && n.regrowT <= 0 && n.id !== window.veinId);
    if (!vein) return null;
    L.player.placeAt(offsetDir(vein.up, 1.1, 1.6));
    L.player.fwd.copy(tangentToward(L.player.up, vein.up));
    if (L.companion) L.companion.root.visible = false;               // the pet steps out of the frame
    const at = vein.root.position.clone();
    // The first angle that puts the vein clearly beside the hero rather than behind them.
    for (const yaw of [0.9, -0.9, 1.3, -1.3, 0.6, -0.6]) {
      const look = L.player.fwd.clone().applyAxisAngle(L.player.up, yaw);
      L.cam.pitch = 0.26; L.cam.dist = 4.6; snapCamera(L.player.up, look);
      L.update(1 / 60); camera.updateMatrixWorld();
      const v = at.clone().project(camera);
      if (Math.abs(v.x) > 0.2 && Math.abs(v.x) < 0.7 && Math.abs(v.y) < 0.55) return { yaw, x: v.x, y: v.y };
    }
    return null;
  });
  assert.ok(framed, 'the lumen vein can be framed beside the hero');
  await frames(120);                                                  // let the last emote bubble fade
  await hide(true); await frames(2);
  await page.screenshot({ path: shotPath('duskhollow-lumen'), type: 'jpeg', quality: 88 });
  await hide(false);
  await page.evaluate(() => { const L = window.LANTERNMOSS; if (L.companion) L.companion.root.visible = true; });

  // ---- the Craft tab lists the lumen chain and the Dusk set ---------------------------------------------------------
  const craft = await page.evaluate(() => {
    const L = window.LANTERNMOSS;
    L.inventory.add('lumenOre', 4); L.inventory.add('glowcap', 6); L.inventory.add('lumenDust', 4);
    L.InventoryUI.open('craft');
    const text = document.getElementById('inventory').innerText;
    return { lumenIngot: text.includes('Lumen Ingot'), lumenOil: text.includes('Lumen Oil'), dusk: text.includes('Dusk Mantle') };
  });
  assert.ok(craft.lumenIngot && craft.lumenOil && craft.dusk, `the Craft tab lists them: ${JSON.stringify(craft)}`);
  await page.keyboard.press('KeyI'); await frames(4);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.InventoryUI.isOpen), false, 'I closes the bag again');
  const poured = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { useItemInSlot } = await import('/src/gameplay/itemUse.js');
    const lamp = L.planets.world.mechanics.active.instance; lamp.burn(1e6);
    const used = useItemInSlot(L.inventory, L.inventory.find('glowcap'));
    return { ok: used.ok, oil: lamp.status.oil };
  });
  assert.ok(poured.ok && poured.oil > 0, `a glowcap tips straight into the lantern (${JSON.stringify(poured)})`);
  console.log(`PASS  the Craft tab lists the lumen chain and the Dusk set; a glowcap pours ${poured.oil} oil`);

  // ---- the deep dark darkens the frame, without going black ---------------------------------------------------------
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.setWeather('clear', true); L.weather.timer = 1e9; });
  await frames(30); const clear = await luma(), clearNear = await luma('near');
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.setWeather('deepDark', true); L.weather.timer = 1e9; });
  await frames(30);
  const deep = await luma(), deepNear = await luma('near');
  const state = await page.evaluate(() => {
    const s = window.LANTERNMOSS.planets.world.mechanics.active.instance.status;
    return { darkness: s.darkness, deepDark: s.deepDark, radius: s.radius, hp: window.LANTERNMOSS.player.hp };
  });
  assert.ok(deep < clear - 6, `the deep dark darkens the hollow (${clear.toFixed(1)} -> ${deep.toFixed(1)})`);
  assert.ok(deep >= 6, `and never goes black (${deep.toFixed(1)}/255)`);
  assert.ok(deepNear >= clearNear * 0.6 && deepNear >= 20,
    `the ground under the lantern stays readable (${clearNear.toFixed(1)} -> ${deepNear.toFixed(1)}/255)`);
  assert.ok(state.deepDark > 0.9 && state.darkness < 1 && state.hp === 100, 'the dusk thickens and still costs no health');
  console.log(`PASS  deep dark takes the hollow from ${clear.toFixed(0)}/255 to ${deep.toFixed(0)}/255 at darkness ${state.darkness.toFixed(2)}, while the lit ground holds ${deepNear.toFixed(0)}/255 and the lantern ${state.radius.toFixed(1)} m`);

  // ---- a real E plants shade spores in the farm ------------------------------------------------------------------------
  const plotIndex = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { offsetDir, arcDist } = await import('/src/utils/sphere.js');
    L.setWeather('clear', true); L.weather.timer = 1e9;
    // A plot with nothing else to work nearby, so E is the plot's own prompt and not a vein's.
    const i = L.Farm.plots.findIndex(p => L.Gathering.nodes.every(n => arcDist(n.up, p.dir) > 3.5));
    const plot = L.Farm.plots[i < 0 ? 0 : i]; plot.s.tilled = true; L.Farm.look(plot);
    L.inventory.add('shadeSpores', 2); L.Hotbar.select(L.inventory.find('shadeSpores'));
    const { snapCamera } = await import('/src/systems/CameraSystem.js');
    const { tangentToward } = await import('/src/utils/sphere.js');
    L.player.placeAt(offsetDir(plot.dir, 0, 0.6)); L.companion?.snapToHero?.();
    L.player.fwd.copy(tangentToward(L.player.up, plot.dir));         // face the plot, so its prompt is on screen
    L.cam.pitch = 0.35; L.cam.dist = 6; snapCamera(L.player.up, L.player.fwd);
    window.plotIndex = i < 0 ? 0 : i;
    return window.plotIndex;
  });
  assert.ok(plotIndex >= 0);
  await frames(10);
  const farmPrompt = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { arcDist } = await import('/src/utils/sphere.js');
    const plot = L.Farm.plots[window.plotIndex];
    return { prompt: document.getElementById('prompt').textContent, dist: arcDist(L.player.up, plot.dir),
      tilled: plot.s.tilled, farm: L.Farm.target()?.label ?? null, seeds: !!L.Farm.seeds(),
      shown: document.getElementById('prompt').style.display };
  });
  assert.equal(farmPrompt.shown, 'block', `the prompt is on screen (${JSON.stringify(farmPrompt)})`);
  assert.match(farmPrompt.prompt, /Plant Shade Spores/i, `the farm offers the spores (${JSON.stringify(farmPrompt)})`);
  await page.keyboard.press('KeyE'); await frames(10);
  const planted = await page.evaluate(() => {
    const L = window.LANTERNMOSS, plot = L.Farm.plots[window.plotIndex];
    return { crop: plot.s.crop, watered: plot.s.watered, raining: L.Farm.raining(), shaded: L.Farm.shaded() };
  });
  assert.equal(planted.crop, 'shade', `real E plants the shade crop (${JSON.stringify(planted)})`);
  assert.ok(planted.shaded && !planted.raining, 'in shade, with no rain anywhere');
  console.log('PASS  real E plants shade spores in the farm under the caps, where it never rains');

  // ---- both resolutions fit ---------------------------------------------------------------------------------------------
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(4);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, `${width}x${height}: nothing overflows`);
  }
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log('PASS  720p and 1080p overflow nothing, the feature shot is saved, and there are zero page and shader errors');
} finally { await close(); }
