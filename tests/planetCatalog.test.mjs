import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLANET_CATALOG, PLANETS } from '../src/config/planets.js';
import { campaignComplete, nextCampaignPlanet, populationProblem, releasedPlanets, validatePlanetCatalog } from '../src/config/planetRules.js';
import { storyKeyAllowed } from '../src/config/npcs.js';
import { resolveHouse } from '../src/config/houses.js';
import { portalDestinations } from '../src/gameplay/portalRules.js';
import { cleanState, sanitizeSave } from '../src/core/save.js';
import { ACHIEVEMENTS } from '../src/config/achievements.js';
import { emptyJournal, progress } from '../src/gameplay/journalRules.js';

const moon = { ...PLANETS[2], id: 'lanternMoon', name: 'The Lantern Moon', act: 2, released: true, secret: true,
  unlock: { bosses: ['frostveil'], night: true, rareGifts: ['moonFriend'] } };
const destinations = (catalog, defeated, state = {}, keys = 100) => Object.fromEntries(
  portalDestinations('lanternmoss', defeated, null, keys, { catalog, ...state }).map(p => [p.id, p]));

test('catalog distinguishes released Act I from incomplete Act II metadata', () => {
  assert.deepEqual(PLANETS.map(p => [p.id, p.seed, p.act]), [
    ['lanternmoss', 20260930, 1], ['emberfall', 77412, 1], ['frostveil', 31415, 1],
  ]);
  assert.deepEqual(PLANET_CATALOG.filter(p => !p.released).map(p => p.id), ['tidewhisper', 'duskhollow', 'lanternMoon']);
  assert.equal(PLANET_CATALOG.at(-1).secret, true);
  assert.deepEqual(releasedPlanets(PLANET_CATALOG), PLANETS);
  assert.throws(() => validatePlanetCatalog([...PLANET_CATALOG, PLANETS[0]]), /duplicate/);
  assert.throws(() => validatePlanetCatalog([{ ...PLANETS[0], released: 'yes' }]), /metadata/);
  assert.throws(() => validatePlanetCatalog([{ ...PLANETS[0], released: false }]), /starting world/);
  assert.throws(() => validatePlanetCatalog([PLANETS[0], { ...PLANET_CATALOG[3], released: true }]), /generation data/);
});

test('keys and defeated ids cannot reach unreleased worlds or jump over a release gap', () => {
  const d = destinations(PLANET_CATALOG, ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']);
  assert.equal(d.tidewhisper, undefined); assert.equal(d.duskhollow, undefined); assert.equal(d.lanternMoon, undefined);
  const catalog = [...PLANET_CATALOG.slice(0, 4), { ...PLANETS[2], id: 'duskhollow', act: 2 }];
  assert.equal(destinations(catalog, ['frostveil', 'tidewhisper']).duskhollow.enabled, false);
  assert.equal(nextCampaignPlanet(catalog, 'frostveil'), null);
  assert.deepEqual(portalDestinations('tidewhisper', [], null, 999), []);
});

test('a released secret requires its configured boss, night and rare-friend gates independently of keys', () => {
  const catalog = [...PLANETS, moon];
  for (const [defeated, state] of [
    [[], { night: true, rareGifts: ['moonFriend'] }],
    [['frostveil'], { night: false, rareGifts: ['moonFriend'] }],
    [['frostveil'], { night: true, rareGifts: [] }],
  ]) {
    const d = destinations(catalog, defeated, state).lanternMoon;
    assert.equal(d.enabled, false); assert.equal(d.name, '?'); assert.equal(d.home, false);
  }
  const d = destinations(catalog, ['frostveil'], { night: true, rareGifts: ['moonFriend'] }, 0).lanternMoon;
  assert.equal(d.enabled, true); assert.equal(d.cost, 0); assert.equal(d.name, moon.name);
  assert.equal(destinations([...PLANETS, { ...moon, unlock: null }], ['frostveil'], { night: true }).lanternMoon.enabled, false);
  assert.equal(destinations(catalog, ['lanternMoon']).lanternMoon.enabled, true, 'its own win preserves return access');
});

test('campaign completion and successors exclude secrets and unfinished metadata', () => {
  assert.equal(campaignComplete(PLANET_CATALOG, ['lanternmoss', 'frostveil']), false);
  assert.equal(campaignComplete(PLANET_CATALOG, PLANETS.map(p => p.id)), true);
  assert.equal(campaignComplete([...PLANETS, moon], PLANETS.map(p => p.id)), true);
  const tide = { ...PLANETS[2], id: 'tidewhisper', act: 2 };
  assert.equal(campaignComplete([...PLANETS, tide, moon], PLANETS.map(p => p.id)), false);
  assert.equal(nextCampaignPlanet([...PLANETS, tide, moon], 'frostveil'), tide);
  assert.equal(nextCampaignPlanet([...PLANETS, tide, moon], tide.id), null);
  assert.equal(campaignComplete([], []), false);
});

test('a small secret roster must declare a positive minimum; ordinary-world population still grows', () => {
  const small = { ...moon, roster: [{ type: 'goblin', count: 3 }] };
  assert.match(populationProblem(small, PLANETS[2]), /at least/);
  assert.equal(populationProblem({ ...small, population: { min: 3 } }, PLANETS[2]), null);
  assert.match(populationProblem({ ...small, population: { min: 4 } }, PLANETS[2]), /at least/);
  assert.match(populationProblem({ ...small, population: { min: 0 } }, PLANETS[2]), /positive integer/);
  assert.match(populationProblem({ ...small, secret: false, population: { min: 3 } }, PLANETS[2]), /secret world/);
});

test('local story memory and house ownership derive from planet data, including new names', () => {
  const future = { id: 'tidewhisper', released: true, npcs: { locals: [{ name: 'Marlo' }] } };
  assert.ok(storyKeyAllowed([future], 'tidewhisper:Marlo'));
  assert.ok(storyKeyAllowed([future], 'Marlo'), 'legacy unqualified local keys remain supported');
  assert.equal(storyKeyAllowed([{ ...future, released: false }], 'tidewhisper:Marlo'), false);
  assert.equal(storyKeyAllowed([future], 'frostveil:Marlo'), false);
  assert.deepEqual(Object.keys(cleanState('story', { Cinder: {}, 'emberfall:Cinder': {}, 'frostveil:Cinder': {}, Tuva: {} })),
    ['Cinder', 'emberfall:Cinder', 'Tuva']);
  assert.equal(resolveHouse(4, 'emberfall').owner, 'Cinder'); assert.equal(resolveHouse(5, 'frostveil').owner, 'Tuva');
  assert.equal(resolveHouse(4, 1).owner, 'Cinder'); assert.equal(resolveHouse(4, 'tidewhisper'), null);
});

test('version-1 saves keep their campaign snapshots but discard unreleased destination/state claims', () => {
  const old = JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8'));
  const save = sanitizeSave(old);
  assert.equal(save.planetId, old.planetId); assert.deepEqual(save.planets, old.planets);
  old.planetId = 'tidewhisper'; old.planets.tidewhisper = { chests: {} };
  old.systems.progression.defeated.push('tidewhisper');
  const cleaned = sanitizeSave(old);
  assert.equal(cleaned.planetId, 'lanternmoss'); assert.equal(cleaned.planets.tidewhisper, undefined);
  assert.equal(cleaned.systems.progression.defeated.includes('tidewhisper'), false);
  assert.equal(cleanState('portals', { stranded: { at: 'tidewhisper', from: 'frostveil' } }).stranded, null);
});

test('the original three-world achievement requires those bosses rather than any three boss wins', () => {
  const a = ACHIEVEMENTS.find(a => a.id === 'allBosses'), j = emptyJournal();
  assert.deepEqual(a.goal.bosses, ['gloomcap', 'pyrrhax', 'malgrath']);
  j.defeated = { gloomcap: 1, pyrrhax: 1, futureBoss: 1, otherBoss: 1 };
  assert.deepEqual(progress(a, j), { have: 2, need: 3, done: false });
  j.defeated.malgrath = 1; assert.equal(progress(a, j).done, true);
});
