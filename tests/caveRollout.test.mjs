/* TODO 29f: the three original worlds' caves, configured and released. Pure checks only: that each cave is open to
   players, that its ore, palette, roster, guardian and loot are its own, and that what it asks for actually exists
   and fits the smallest cave its room range can generate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAVE, CAVE_VEINS, CAVES } from '../src/config/dungeons.js';
import { COMBAT } from '../src/config/combat.js';
import { LOOT_TABLES } from '../src/config/chests.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { RECIPES } from '../src/config/crafting.js';
import { NODE_KINDS } from '../src/config/resources.js';
import { PLANET_CATALOG, PLANETS } from '../src/config/planets.js';
import { releasedEnemyTypes } from '../src/config/releasedEnemies.js';
import { caveEnding, caveFixtures, caveMonsters, generateCave } from '../src/world/caveLayout.js';

const ORIGINALS = ['lanternmoss', 'emberfall', 'frostveil'];
const item = id => ITEM_DEFINITIONS.find(d => d.id === id);
const planetOf = key => PLANET_CATALOG.find(p => p.id === key);
const entries = () => ORIGINALS.map(key => ({ key, cave: CAVES[key], planet: planetOf(key) }));

test('every original world has a released cave, and only those worlds do', () => {
  for (const { key, cave, planet } of entries()) {
    assert.ok(cave, `${key} has a cave`);
    assert.equal(cave.released, true, `${cave.id} is released`);
    assert.equal(planet.released, true, `${key} itself is a released world`);
  }
  assert.deepEqual(Object.keys(CAVES).sort(), [...ORIGINALS].sort(), 'no cave is configured for an unreleased world yet');
});

test('each cave has an ore of its own, mined nowhere else, and worth carrying home', () => {
  const ores = entries().map(({ cave }) => cave.ore);
  assert.equal(new Set(ores).size, ores.length, 'no two caves share a vein kind');
  const drops = new Map();
  for (const { cave } of entries()) {
    const vein = CAVE_VEINS[cave.ore];
    assert.ok(vein, `${cave.id}: ${cave.ore} is a real vein`);
    assert.ok(!NODE_KINDS[cave.ore], `${cave.ore} is never placed on a planet surface`);
    for (const [id] of vein.drops) {
      assert.ok(item(id), `${cave.id}: ${id} is a real item`);
      if (id === 'stone') continue;                                   // the rubble every vein leaves
      assert.ok(!drops.has(id), `${id} belongs to ${cave.id} alone, not also ${drops.get(id)}`);
      drops.set(id, cave.id);
      assert.ok(!Object.values(NODE_KINDS).some(n => (n.drops ?? []).some(([s]) => s === id)), `${id} drops from no surface node`);
      assert.ok(RECIPES.some(r => r.needs.some(([i]) => i === id)), `${id} is used by a recipe`);
    }
  }
  assert.equal(drops.size, ORIGINALS.length, 'one distinct gem per cave');
});

test('each cave looks like its own place', () => {
  const seen = new Set();
  for (const { cave } of entries()) {
    for (const key of ['floor', 'wall', 'accent']) assert.ok(Number.isInteger(cave.colors[key]), `${cave.id}: ${key} colour`);
    const palette = Object.values(cave.colors).join(',');
    assert.ok(!seen.has(palette), `${cave.id} has a palette of its own`); seen.add(palette);
    assert.ok(Number.isInteger(cave.lantern), `${cave.id}: its own lantern colour`);
    assert.ok(cave.name && cave.name !== CAVES.lanternmoss.name || cave.id === CAVES.lanternmoss.id, `${cave.id}: its own name`);
  }
});

test("a cave's monsters are its own world's, so the bestiary and journal stay in step", () => {
  const before = releasedEnemyTypes(PLANET_CATALOG, COMBAT.enemies);
  for (const { key, cave, planet } of entries()) {
    const own = new Set((planet.roster ?? []).map(g => g.type));
    assert.ok(cave.roster?.length, `${cave.id} has a roster`);
    for (const group of cave.roster) {
      assert.ok(COMBAT.enemies[group.type], `${cave.id}: ${group.type} is a real monster`);
      assert.ok(own.has(group.type), `${cave.id}: ${group.type} already roams ${key} above ground`);
      assert.ok(Number.isInteger(group.count) && group.count > 0, `${cave.id}: ${group.type} needs a positive count`);
    }
    assert.ok(own.has(cave.guardian), `${cave.id}: its warden ${cave.guardian} is one of ${key}'s own kinds`);
  }
  // Because every cave kind already roams its world, releasing the caves adds no enemy type to the released set.
  assert.deepEqual([...releasedEnemyTypes(PLANET_CATALOG, COMBAT.enemies)].sort(), [...before].sort());
});

test("a warden's purse is real, and each one leaves something only its own cave gives", () => {
  const extras = new Set();
  for (const { cave } of entries()) {
    assert.ok(LOOT_TABLES[cave.guardianLoot], `${cave.id}: ${cave.guardianLoot} is a real loot table`);
    assert.ok(cave.guardianExtra?.length, `${cave.id} leaves a keepsake of its own`);
    for (const [id, qty] of cave.guardianExtra) {
      assert.ok(item(id), `${cave.id}: ${id} is a real item`);
      assert.ok(Number.isInteger(qty) && qty > 0, `${cave.id}: ${id} needs a positive quantity`);
      assert.ok(!extras.has(id), `${id} is left by one cave only`); extras.add(id);
      assert.ok(CAVE_VEINS[cave.ore].drops.some(([d]) => d === id), `${cave.id}: its warden leaves its own ore`);
    }
  }
});

test('every roster fits the smallest cave its room range can generate', () => {
  for (const { cave } of entries()) {
    const wanted = cave.roster.reduce((n, g) => n + g.count, 0);
    // The entrance, the puzzle room and the end room hold no wandering monsters.
    const ordinary = cave.rooms[0] - 3, spots = ordinary * 3;
    assert.ok(spots >= wanted, `${cave.id}: ${wanted} monsters need ${wanted} of ${spots} spots in its smallest cave`);
    let worst = Infinity;
    for (let seed = 0; seed < 400; seed++) worst = Math.min(worst, caveMonsters(generateCave(cave, seed), cave).length);
    assert.equal(worst, wanted, `${cave.id}: every seed places the whole roster`);
  }
});

test('no wandering monster stands in the entrance, the puzzle room or the warden\'s room', () => {
  for (const { cave } of entries()) for (const seed of [1, 7, ...PLANETS.map(p => p.seed)]) {
    const L = generateCave(cave, seed), E = caveEnding(L, cave), monsters = caveMonsters(L, cave);
    for (const m of monsters) {
      assert.notEqual(m.room, L.entrance, `${cave.id}/${seed}: the entrance stays safe`);
      assert.notEqual(m.room, E.puzzle.room, 'the puzzle room keeps to its puzzle');
      assert.notEqual(m.room, L.end, 'and the end room is the warden\'s alone');
    }
    const ids = monsters.map(m => m.id);
    assert.equal(new Set(ids).size, ids.length, 'no two monsters share an id');
    assert.deepEqual(caveMonsters(L, cave), monsters, 'and the same cave always holds the same few');
    // Nothing a cave spawns may stand inside a chest, a vein or the hero's way in.
    const F = caveFixtures(L, cave);
    for (const m of monsters) for (const f of [...F.chests, ...F.veins])
      if (f.room === m.room) assert.ok(Math.hypot(f.x - m.x, f.z - m.z) > CAVE.reward.veinInset * 0.5, `${m.id} stands clear of ${f.id}`);
  }
});
