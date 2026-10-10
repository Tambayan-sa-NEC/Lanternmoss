import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SAVE_SYSTEMS, SAVE_OWNERS, DEVICE_SYSTEMS, STATELESS_EXPORTS, TRANSIENT_SYSTEMS,
  SAVE_KEY, SaveStore, SaveRegistry, sanitizeSave, parseSave, cleanState } from '../src/core/save.js';
import { PLANETS } from '../src/config/planets.js';

const fixture = () => JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8'));
test('v1 fixture remains readable, with independent planet snapshots and one explicit slot', () => {
  const raw = fixture(), clean = sanitizeSave(raw);
  assert.deepEqual(clean, { ...raw, systems: { ...raw.systems, tutorial: cleanState('tutorial', null) } });
  assert.equal(clean.systems.tutorial.status, 'skipped', 'older adventures do not unexpectedly start a guide');
  assert.equal(clean.slot, 0); assert.equal(clean.planetId, 'emberfall');
  assert.equal(clean.systems.player.level, 4);
  assert.equal(clean.planets.lanternmoss.chests.opened[0], 'lanternmoss:0');
  assert.equal(clean.planets.emberfall.farm.plots[0].crop, 'carrot');
  assert.deepEqual(sanitizeSave(clean), clean);
});
test('damaged, foreign, missing-player and future saves are rejected without overwriting', () => {
  const disk = new Map([[SAVE_KEY, JSON.stringify(fixture())]]);
  const store = new SaveStore(() => ({ getItem: key => disk.get(key), setItem: (key, v) => disk.set(key, v) }));
  const old = disk.get(SAVE_KEY);
  for (const text of ['{', 'null', '{}', JSON.stringify({ ...fixture(), version: 99 }), JSON.stringify({ ...fixture(), game: 'other' })]) {
    assert.equal(store.import(text).ok, false); assert.equal(disk.get(SAVE_KEY), old);
  }
  assert.equal(sanitizeSave({ ...fixture(), systems: {} }), null);
});
test('load clamps numbers and drops unknown items, heroes, pets, directions and planets', () => {
  const raw = fixture(); raw.planetId = 'missing'; raw.planets.missing = {};
  Object.assign(raw.systems.player, { charId: 'missing', level: 1000, xp: -50, coins: -9, hp: Infinity, up: [0, 0, 0] });
  raw.systems.inventory[0] = { itemId: 'wood', quantity: 1e9, props: { rarity: 'bad', injected: true } };
  raw.systems.inventory[1] = { itemId: 'missing', quantity: 2 };
  Object.assign(raw.systems.pets, { active: 'missing', unlocked: ['missing'], names: { owl: '<script>alert</script>', missing: 'boo' } });
  raw.systems.challenges.run = { id: 'fireflyCatch', anchor: [0, 1, 0], items: [] };
  const clean = sanitizeSave(raw);
  assert.equal(clean.planetId, PLANETS[0].id); assert.ok(!clean.planets.missing);
  assert.equal(clean.systems.player.charId, 'witch'); assert.equal(clean.systems.player.level, 10);
  assert.equal(clean.systems.player.coins, 0); assert.equal(clean.systems.player.up, null);
  assert.ok(Number.isFinite(clean.systems.player.hp)); assert.equal(clean.systems.inventory[1], null);
  assert.equal(clean.systems.inventory[0].props, null); assert.ok(clean.systems.inventory[0].quantity < 1e9);
  assert.equal(clean.systems.pets.active, 'owl'); assert.ok(!clean.systems.pets.names.missing);
  assert.equal(clean.systems.challenges.run, null);
  assert.equal(cleanState('equipment', { weapon: { itemId: 'wood' } }).weapon, null);
});
test('quota, blocked and absent storage report failure and keep the existing save', () => {
  const old = JSON.stringify(fixture());
  const store = new SaveStore(() => ({ getItem: () => old, setItem: () => { throw new Error('quota'); } }));
  assert.equal(store.write(fixture()).ok, false); assert.deepEqual(store.read().data, sanitizeSave(fixture()));
  assert.equal(new SaveStore(() => { throw new Error('blocked'); }).read().ok, false);
  assert.equal(new SaveStore(() => undefined).write(fixture()).ok, false);
  assert.equal(parseSave('x'.repeat(3 * 1024 * 1024)).ok, false);
});
test('registry requires every owner, rejects duplicate keys and round-trips every system in the fixture', () => {
  const registry = new SaveRegistry(); assert.throws(() => registry.assertComplete(), /Missing save system/);
  const data = sanitizeSave(fixture()), states = {};
  for (const [key, scope] of Object.entries(SAVE_SYSTEMS)) {
    states[key] = structuredClone(scope === 'adventure' ? data.systems[key] : data.planets.emberfall[key]);
    registry.register(key, { toJSON: () => states[key], load: value => { states[key] = value; } });
  }
  assert.throws(() => registry.register('player', { toJSON() {}, load() {} }), /Invalid save registration/);
  const before = registry.snapshot('emberfall', data.savedAt);
  for (const key of Object.keys(states)) states[key] = null;
  registry.load(before); registry.restorePlanet('emberfall');
  assert.deepEqual(registry.snapshot('emberfall', data.savedAt), before);
});

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)]);
}
test('every state export is registered, device-local or explicitly transient', () => {
  const src = new URL('../src/', import.meta.url);
  const paths = [...files(new URL('gameplay/', src)), ...['entities/player/Player.js', 'entities/npc/NPC.js',
    'entities/wildlife/wildlife.js', 'inventory/Inventory.js', 'combat/casting.js'].map(p => new URL(p, src))];
  const seen = new Set();
  for (const url of paths) {
    const path = url.href.slice(src.href.length), text = readFileSync(url, 'utf8');
    for (const match of text.matchAll(/export\s+(?:class\s+(\w+)|const\s+(\w+)\s*=\s*\{)/g)) {
      const name = match[1] ?? match[2], owner = `${path}:${name}`;
      if (STATELESS_EXPORTS.has(name) || TRANSIENT_SYSTEMS[path] || DEVICE_SYSTEMS[owner]) continue;
      assert.ok(Object.hasOwn(SAVE_OWNERS, owner), `Unclassified state owner: ${owner}`);
      assert.ok(Object.hasOwn(SAVE_SYSTEMS, SAVE_OWNERS[owner]), `Missing save registration: ${owner}`);
      seen.add(SAVE_OWNERS[owner]);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(SAVE_SYSTEMS).sort());
});
test('planet ids are stable and gameplay has no numeric planet equality checks', () => {
  assert.deepEqual(PLANETS.map(p => p.id), ['lanternmoss', 'emberfall', 'frostveil']);
  for (const url of files(new URL('../src/', import.meta.url)).filter(u => u.pathname.endsWith('.js'))) {
    assert.doesNotMatch(readFileSync(url, 'utf8'), /\bplanet\s*={2,3}\s*\d+/, url.pathname);
  }
});
