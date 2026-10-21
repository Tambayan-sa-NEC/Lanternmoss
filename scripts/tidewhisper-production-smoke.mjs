// Released catalog, loaded through the ordinary page entry. No candidate interception or test fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shotPath } from './shots.mjs';
import { tidewhisperBrowser } from './lib/tidewhisper-browser.mjs';

const { page, errors, close } = await tidewhisperBrowser({ port: 8143, candidate: false });
const frames = n => page.evaluate(async n => {
  const { ctx } = await import('/src/core/context.js'); ctx.paused = false;
  for (let i = 0; i < n; i++) window.LANTERNMOSS.update(1 / 60);
  ctx.paused = true;
}, n);
const reload = async () => {
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.LANTERNMOSS);
  await page.click('[data-act="continue"]');
  await page.waitForFunction(async () => (await import('/src/core/context.js')).ctx.started);
  await page.evaluate(async () => { (await import('/src/core/context.js')).ctx.paused = true; });
};
const portal = async () => {
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    ctx.paused = false; L.player.placeAt(L.Portals.gate.dir); L.player.invuln = 1e9;
  });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.LANTERNMOSS.PortalUI.isOpen);
};
const travel = async id => {
  await portal(); await page.click(`[data-destination="${id}"]`); await frames(125);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.planetId), id);
};

try {
  assert.deepEqual(await page.$$eval('#title .campaign .planet[data-released="true"] strong', nodes => nodes.map(n => n.textContent)),
    ['Lanternmoss', 'Emberfall', 'Frostveil', 'Tidewhisper']);
  assert.deepEqual(await page.evaluate(async () => {
    const { PLANET_CATALOG, PLANETS } = await import('/src/config/planets.js');
    return { ids: PLANETS.map(p => p.id), actual: PLANETS[3] === PLANET_CATALOG[3],
      testModules: performance.getEntriesByType('resource').some(e => /\/tests\/sim\/|candidate-entry/.test(e.name)) };
  }), { ids: ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper'], actual: true, testModules: false });
  await page.click('[data-act="play"]');
  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    L.CharacterSelect.pick('witch'); L.begin(); L.Tutorial.skip(); L.Pets.command('passive'); L.player.invuln = 1e9;
    L.player.level = 8; for (const id of ['lanternmoss', 'emberfall', 'frostveil']) L.planets.defeated.add(id);
    ctx.paused = true;
  });
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewport({ width, height }); await portal();
    assert.deepEqual(await page.$$eval('#portal-picker [data-destination]', nodes => nodes.map(n => n.dataset.destination)),
      ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']);
    assert.equal(await page.$eval('[data-destination="tidewhisper"]', node => node.disabled), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
    if (height === 1080) {
      await page.evaluate(() => { for (const id of ['hint', 'toast', 'save-notice']) document.getElementById(id).style.visibility = 'hidden'; });
      await page.screenshot({ path: shotPath('tidewhisper-portal'), type: 'jpeg', quality: 88 });
      await page.evaluate(() => { for (const id of ['hint', 'toast', 'save-notice']) document.getElementById(id).style.visibility = ''; });
    }
    await page.keyboard.press('Escape');
  }
  await travel('tidewhisper');
  const initial = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    const { ctx } = await import('/src/core/context.js');
    Quests.start('darkLighthouse');
    const node = L.Gathering.nodes[0]; node.deplete();
    if (!L.saves.save().ok) throw new Error('production save failed');
    return { id: L.planetId, index: ctx.planet, boss: ctx.boss.type,
      marlo: L.npcs.some(n => n.name === 'Marlo'), node: node.id };
  });
  assert.equal(initial.id, 'tidewhisper'); assert.equal(initial.index, 3);
  assert.equal(initial.boss, 'mirelure'); assert.ok(initial.marlo);
  await reload();
  assert.deepEqual(await page.evaluate(async id => {
    const { Quests } = await import('/src/gameplay/quests/Quests.js'), L = window.LANTERNMOSS;
    return { id: L.planetId, quest: Quests.st('darkLighthouse').status,
      depleted: !L.Gathering.nodes.find(n => n.id === id)?.ready };
  }, initial.node), { id: 'tidewhisper', quest: 'active', depleted: true });
  await travel('lanternmoss'); await travel('tidewhisper');
  console.log('PASS production portal, fourth-world travel, partial quest/node Continue, return and revisit');

  await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { Quests } = await import('/src/gameplay/quests/Quests.js');
    const { ctx } = await import('/src/core/context.js'), { offsetDir } = await import('/src/utils/sphere.js');
    const { dayClock } = await import('/src/gameplay/dayClock.js'), { DAY } = await import('/src/config/day.js');
    Quests.st('darkLighthouse').status = 'done'; L.player.placeAt(offsetDir(ctx.boss.home, .3, 15.5));
    dayClock.skip((.4 * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test');
  });
  await frames(60 * 9);
  assert.equal(await page.evaluate(() => window.LANTERNMOSS.BossGate.state), 'awake');
  await page.evaluate(async () => {
    const { ctx } = await import('/src/core/context.js'), { damageEnemy } = await import('/src/combat/damage.js');
    ctx.boss.mode = 'surfaced'; ctx.boss.surfaceT = 99; ctx.boss.hidden = false;
    damageEnemy(ctx.boss, ctx.boss.hp * 100);
  });
  await frames(60 * 5);
  await page.evaluate(() => { const L = window.LANTERNMOSS; L.Chests.open(L.Chests.bossChest); });
  await frames(60);
  assert.ok(await page.evaluate(() => window.LANTERNMOSS.saves.save().ok)); await reload();
  const win = await page.evaluate(async () => {
    const L = window.LANTERNMOSS, { ctx } = await import('/src/core/context.js');
    const { Quests } = await import('/src/gameplay/quests/Quests.js');
    return { id: L.planetId, dead: !ctx.boss.alive, complete: L.planets.complete,
      quest: Quests.st('darkLighthouse').status,
      crowns: L.inventory.count('tideCrown') + ctx.worldItems.filter(w => w.itemId === 'tideCrown').reduce((n, w) => n + w.quantity, 0),
      later: L.Portals.destinations().some(d => d.id === 'duskhollow' || d.id === 'lanternMoon') };
  });
  assert.deepEqual(win, { id: 'tidewhisper', dead: true, complete: true, quest: 'done', crowns: 1, later: false });
  const oldSave = readFileSync(new URL('../tests/fixtures/save-v1.json', import.meta.url), 'utf8');
  await page.evaluate(async data => {
    const { SAVE_KEY } = await import('/src/core/save.js');
    window.LANTERNMOSS.saves.suspended = true; // Preserve the injected legacy file across pagehide.
    localStorage.setItem(SAVE_KEY, data);
  }, oldSave);
  await reload();
  assert.deepEqual(await page.evaluate(async () => ({ id: window.LANTERNMOSS.planetId,
    level: window.LANTERNMOSS.player.level, tideReleased: (await import('/src/config/planets.js')).PLANETS.some(p => p.id === 'tidewhisper') })),
  { id: 'emberfall', level: 4, tideReleased: true });
  assert.deepEqual(errors, []);
  console.log('PASS production Mirelure completion and one Tide Crown through Continue; old v1 save opens; zero page/shader errors');
} finally { await close(); }
