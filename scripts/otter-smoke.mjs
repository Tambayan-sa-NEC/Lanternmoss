// TODO 27i: real B/menu selection and V pearl dive on the test-only Tidewhisper candidate at 720p and 1080p.
import assert from 'node:assert/strict';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
const { page, errors, close } = await tidewhisperBrowser({ port: 8142 });
const frames = n => page.evaluate(n => { const { update } = window.LANTERNMOSS; for (let i = 0; i < n; i++) update(1 / 60); }, n);
try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { emit } = await import('/src/core/events.js');
    const { ctx } = await import('/src/core/context.js'), { dayClock } = await import('/src/gameplay/dayClock.js');
    const { DAY } = await import('/src/config/day.js');
    const { offsetDir } = await import('/src/utils/sphere.js'), { dryGround } = await import('/src/world/terrain.js');
    const { freeOfColliders } = await import('/src/physics/colliders.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.player.invuln = 1e9;
    L.goToPlanet(3); emit('questcomplete', { id: 'darkLighthouse' });
    dayClock.t = .4 * DAY.length; L.setWeather('clear'); L.weather.timer = 1e9;
    const beach = L.Gathering.nodes.find(n => n.kind === 'clamBed');
    const spots = []; for (const r of [3, 5, 7]) for (let a = 0; a < 6.28; a += .45) spots.push(offsetDir(beach.up, a, r));
    const dry = spots.find(d => dryGround(d, .7, { high: true }) && freeOfColliders(d, 1));
    if (!dry) throw new Error('no clear beach staging point');
    L.player.placeAt(dry); L.companion.snapToHero();
    ctx.paused = false;
  });
  await frames(25);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Pets.unlocked.has('otter')), true);
  await page.keyboard.press('KeyB'); await frames(3);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.PetMenu.isOpen), true, 'B opens the pet menu');
  await page.click('[data-pet="otter"]'); await frames(180);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.Pets.id), 'otter', 'real click selects the otter');
  const modelCost = await page.evaluate(() => {
    let meshes = 0, triangles = 0;
    window.LANTERNMOSS.companion.root.traverse(o => { if (!o.isMesh) return; meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
    return { meshes, triangles: Math.round(triangles) };
  });
  assert.ok(modelCost.meshes <= 20 && modelCost.triangles <= 2500, `otter model stays bounded: ${JSON.stringify(modelCost)}`);
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 }); await frames(2);
    const fits = await page.evaluate(() => {
      const panel = document.getElementById('petmenu'), card = panel.querySelector('[data-pet="otter"]'), detail = panel.querySelector('.pm-detail');
      return !!card && !!detail && card.getBoundingClientRect().right <= innerWidth && detail.getBoundingClientRect().right <= innerWidth &&
        document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight;
    });
    assert.ok(fits, `${width}x${height} pet menu fits`);
    if (height === 1080) {
      await page.evaluate(async () => {
        (await import('/src/core/settings.js')).setSetting('bloom', false);
        document.getElementById('toast').style.opacity = 0;
        const hint = document.getElementById('hint'); hint?.classList.add('collapsed');
        const notice = document.getElementById('achv'); if (notice) notice.style.visibility = 'hidden';
        document.getElementById('cresult')?.classList.remove('show');
        for (const id of ['hud', 'ebars', 'bossbar', 'save-notice']) document.getElementById(id).style.visibility = 'hidden';
      });
      await frames(2);
      await page.screenshot({ path: shotPath('otter'), type: 'jpeg', quality: 88 });
    }
  }
  await page.keyboard.press('KeyB'); await frames(2);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.PetMenu.isOpen), false);
  const before = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    const { dryGround } = await import('/src/world/terrain.js');
    dayClock.t = .9 * DAY.length; L.update(1/60);
    const bed = L.Gathering.nodes.find(n => n.kind === 'clamBed' && n.regrowT <= 0 && !dryGround(n.up));
    if (!bed) throw new Error('no submerged clam bed');
    L.player.placeAt(bed.up); L.companion.snapToHero(); L.Pets.abilityCd = 0;
    window.otterBedId = bed.id;
    return L.inventory.count('pearl');
  });
  await page.keyboard.press('KeyV'); await frames(2);
  const after = await page.evaluate(() => {
    const L = window.LANTERNMOSS, bed = L.Gathering.nodes.find(n => n.id === window.otterBedId);
    return { pearls: L.inventory.count('pearl'), dives: L.Pets.divesToday, cooldown: L.Pets.abilityCd, bedRest: bed.regrowT };
  });
  assert.equal(after.pearls, before + 1, 'real V input grants exactly one pearl');
  assert.equal(after.dives, 1); assert.ok(after.cooldown > 0 && after.bedRest > 0);
  await page.evaluate(() => { const L = window.LANTERNMOSS; if (!L.saves.save().ok) throw new Error('save failed'); });
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]'); await page.waitForFunction(() => window.LANTERNMOSS.planetId === 'tidewhisper');
  const restored = await page.evaluate(() => ({ id: window.LANTERNMOSS.Pets.id, dives: window.LANTERNMOSS.Pets.divesToday,
    pearls: window.LANTERNMOSS.inventory.count('pearl') }));
  assert.deepEqual(restored, { id: 'otter', dives: 1, pearls: before + 1 }, 'Continue restores pet and yield once');
  assert.deepEqual(errors, [], 'no page or shader errors');
  console.log(`PASS otter menu/select, real V dive, Continue, 720p/1080p bounds, model ${modelCost.meshes} meshes/${modelCost.triangles} triangles, zero errors`);
} finally { await close(); }
