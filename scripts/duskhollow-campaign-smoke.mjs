// TODO 30i: the campaign path in a real browser, at Low and both desktop resolutions.
// Before release, use a test-only catalog substitute; --release checks the shipped entry point.
import assert from 'node:assert/strict';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';
import { PLANETS } from '../src/config/planets.js';

const release = process.argv.includes('--release');
assert.ok(!release || PLANETS.some(planet => planet.id === 'duskhollow' && planet.released),
  '--release requires the shipped Duskhollow world');
const { page, errors, close } = await tidewhisperBrowser({ port: 8147, quality: 'low', candidate: !release,
  bootstrap: "import {installDuskhollowCandidate} from '/tests/sim/lib/duskhollowCandidate.mjs'; installDuskhollowCandidate();" });
const frames = n => page.evaluate(n => {
  const L = window.LANTERNMOSS;
  for (let i = 0; i < n; i++) L.update(1 / 60);
}, n);
const useAt = async (kind, index, pattern) => {
  await page.evaluate(async ([kind, index]) => {
    const L = window.LANTERNMOSS, R = L.OldRoad;
    let dir = kind === 'brazier' ? R.brazier.dir : R[kind][index].dir;
    if (kind === 'brazier') {
      const { offsetDir, arcDist } = await import('/src/utils/sphere.js');
      const wick = L.npcs.find(n => n.name === 'Wick');
      dir = Array.from({ length: 12 }, (_, i) => offsetDir(R.brazier.dir, i * Math.PI / 6, 1.5))
        .sort((a, b) => arcDist(b, wick.up) - arcDist(a, wick.up))[0];
    }
    L.player.placeAt(dir);
  }, [kind, index]);
  await frames(10);
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent);
  assert.match(prompt, pattern, `the ${kind} prompt (${prompt})`);
  await page.keyboard.press('KeyE'); await frames(8);
};

try {
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { setSetting } = await import('/src/core/settings.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive');
    L.player.level = 11; L.player.invuln = 1e9;
    for (const id of ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']) L.planets.defeated.add(id);
    setSetting('roundBeetles', true);
    L.setWeather('clear'); L.weather.timer = 1e9;
  });
  await frames(10);
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.evaluate(() => { window.LANTERNMOSS.player.placeAt(window.LANTERNMOSS.Portals.gate.dir); });
    await frames(8); await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
    assert.equal(await page.$eval('[data-destination="duskhollow"]', el => el.disabled), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight),
      `${width}x${height} portal fits`);
    if (height === 720) await page.keyboard.press('Escape');
  }
  await page.click('[data-destination="duskhollow"]'); await frames(120);
  await page.evaluate(() => window.LANTERNMOSS.Pets.command('stay'));
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.planetId), 'duskhollow');
  assert.equal(await page.evaluate(async () => (await import('/src/core/settings.js')).settings.roundBeetles), true);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
  console.log('PASS  Low preset and beetle accessibility: campaign portal and Duskhollow travel fit at 720p and 1080p');

  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    const wick = L.npcs.find(n => n.name === 'Wick');
    if (!wick) throw new Error('Wick missing from Duskhollow');
    Quests.offerFor(wick).choice.onYes(); Quests.stepLineFor(wick);
  });
  await frames(10);
  assert.equal(await page.evaluate(async () => (await import('/src/gameplay/quests/Quests.js')).Quests.st('oldRoad').step), 1);
  const beforeOil = await page.evaluate(() => window.LANTERNMOSS.planets.world.mechanics.active.instance.status.oil);
  await useAt('brazier', 0, /Take the village flame/);
  await useAt('lamps', 0, /Light the waylamp/);
  for (let i = 0; i < 3; i++) {
    await useAt('wells', i, /Light the moonwell/);
  }
  await frames(45);
  const road = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    return { wells: L.planets.world.mechanics.active.instance.wellsLit, step: Quests.st('oldRoad').step };
  });
  assert.deepEqual(road, { wells: 3, step: 2 });
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    Quests.stepLineFor(L.npcs.find(n => n.name === 'Wick'));
  });
  await frames(10);
  const done = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    return { quest: Quests.st('oldRoad').status, oilFlasks: L.inventory.count('lumenOil'), gate: L.BossGate.state,
      oil: L.planets.world.mechanics.active.instance.status.oil };
  });
  assert.equal(done.quest, 'done'); assert.ok(done.oilFlasks >= 2); assert.equal(done.gate, 'ready');
  assert.ok(done.oil < beforeOil, 'the belt lantern consumed oil during the route');
  console.log('PASS  real E relights three moonwells; Wick rewards oil and opens Umbra at level 11');

  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]'); await page.waitForFunction(() => window.LANTERNMOSS.planetId === 'duskhollow');
  const restored = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    return { quest: Quests.st('oldRoad').status, wells: L.planets.world.mechanics.active.instance.wellsLit,
      oilFlasks: L.inventory.count('lumenOil') };
  });
  assert.deepEqual(restored, { quest: 'done', wells: 3, oilFlasks: done.oilFlasks });
  assert.deepEqual(errors, []);
  console.log('PASS  Continue restores the quest, moonwells and oil; zero page/shader errors');
} finally { await close(); }
