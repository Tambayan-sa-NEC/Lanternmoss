/* TODO 29d: what a cave holds, and what a save keeps of it. Pure checks only (no scene, no runtime):
   fixture placement from world/caveLayout.js, and the `caves` cleaner in core/save.js. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAVE, CAVE_VEINS, CAVES } from '../src/config/dungeons.js';
import { CHEST_KINDS } from '../src/config/chests.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { NODE_KINDS } from '../src/config/resources.js';
import { RECIPES } from '../src/config/crafting.js';
import { PLANETS } from '../src/config/planets.js';
import { caveFixtures, floorRects, generateCave, roomAt, walkable } from '../src/world/caveLayout.js';
import { cleanState } from '../src/core/save.js';

const SEEDS = [1, 7, 42, 1234, 99991, ...PLANETS.map(p => p.seed)];
const all = () => Object.values(CAVES).flatMap(cave => SEEDS.map(seed => {
  const L = generateCave(cave, seed); return { cave, seed, L, F: caveFixtures(L, cave) };
}));

test('a cave always holds the same rewards, with ids that belong to its own rooms', () => {
  for (const { cave, seed, L, F } of all()) {
    assert.deepEqual(caveFixtures(L, cave), F, `${cave.id}/${seed} is deterministic`);
    const rooms = new Set(L.rooms.map(r => r.id));
    for (const f of [...F.chests, ...F.veins]) {
      assert.ok(rooms.has(f.room), `${f.id} names a room of this cave`);
      assert.ok(f.id.startsWith(`${f.room}:`), `${f.id} is owned by its room`);
    }
    const ids = [...F.chests, ...F.veins].map(f => f.id);
    assert.equal(new Set(ids).size, ids.length, `${cave.id}/${seed}: no two fixtures share an id`);
  }
  // Different caves never collide, because every id starts with the cave's own id.
  const a = caveFixtures(generateCave(CAVES.lanternmoss, 1), CAVES.lanternmoss);
  const b = caveFixtures(generateCave(CAVES.emberfall, 1), CAVES.emberfall);
  for (const x of a.veins) assert.ok(!b.veins.some(y => y.id === x.id));
});

test('the entrance stays a safe empty room; the end room always holds the best chest', () => {
  for (const { cave, seed, L, F } of all()) {
    for (const f of [...F.chests, ...F.veins, ...F.spawns]) assert.notEqual(f.room, L.entrance, `${cave.id}/${seed}: nothing in the entrance`);
    const end = F.chests.find(c => c.room === L.end);
    assert.ok(end, `${cave.id}/${seed}: the end room has a chest`);
    assert.equal(end.kind, cave.endChest);
    for (const c of F.chests) assert.ok(CHEST_KINDS[c.kind], `${c.id}: a real chest kind`);
  }
});

test('no chest, vein or monster spawn blocks a doorway or stands in a wall', () => {
  for (const { cave, seed, L, F } of all()) {
    const rects = floorRects(L), byId = new Map(L.rooms.map(r => [r.id, r]));
    for (const f of [...F.chests, ...F.veins, ...F.spawns]) {
      const r = byId.get(f.room), radius = f.kind ? (CAVE_VEINS[f.kind]?.r ?? 0.7) : 0.4;
      assert.ok(walkable(rects, f.x, f.z, 0.35), `${cave.id}/${seed}: ${f.id ?? 'spawn'} stands on the floor`);
      assert.equal(roomAt(L, f.x, f.z), f.room, 'and inside its own room');
      // A doorway is CAVE.corridor wide, centred on the middle of the wall it pierces. Nothing may reach into one.
      for (const [dir, to] of Object.entries(r.doors)) {
        if (!to) continue;
        const across = dir === 'n' || dir === 's' ? Math.abs(f.x - r.x) : Math.abs(f.z - r.z);
        const along = dir === 'n' ? f.z - (r.z - r.d / 2) : dir === 's' ? (r.z + r.d / 2) - f.z
          : dir === 'w' ? f.x - (r.x - r.w / 2) : (r.x + r.w / 2) - f.x;
        assert.ok(across > CAVE.corridor / 2 + radius || along > radius + 0.5,
          `${cave.id}/${seed}: ${f.id ?? 'a spawn'} keeps out of the ${dir} doorway`);
      }
    }
  }
});

test('cave ore grows only in caves, and what it is for is reachable', () => {
  const surface = new Set(Object.keys(NODE_KINDS));
  for (const kind of Object.keys(CAVE_VEINS)) assert.ok(!surface.has(kind), `${kind} is never placed on a surface`);
  const caveDrops = new Set(Object.values(CAVE_VEINS).flatMap(v => v.drops.map(([item]) => item)));
  const surfaceDrops = new Set(Object.values(NODE_KINDS).flatMap(v => (v.drops ?? []).map(([item]) => item)));
  assert.ok(caveDrops.has('gloomquartz') && !surfaceDrops.has('gloomquartz'), 'gloomquartz comes out of caves and nowhere else');
  for (const item of caveDrops) assert.ok(ITEM_DEFINITIONS.some(d => d.id === item), `${item} is a real item`);
  assert.ok(RECIPES.some(r => r.needs.some(([i]) => i === 'gloomquartz')), 'and it is worth carrying home');
  for (const cave of Object.values(CAVES)) assert.ok(CAVE_VEINS[cave.ore], `${cave.id}: a real ore`);
});

test('cave progress is cleaned to one cave, and an old save simply starts with none', () => {
  const empty = { cave: null, opened: [], mined: [], cleared: [], visited: [] };
  for (const value of [null, undefined, {}, 'nonsense', { cave: 'not-a-cave', opened: ['x'] }])
    assert.deepEqual(cleanState('caves', value), empty, 'an unknown or missing cave keeps nothing');

  const cave = CAVES.lanternmoss, other = CAVES.emberfall;
  const L = generateCave(cave, PLANETS[0].seed), F = caveFixtures(L, cave);
  const raw = { cave: cave.id,
    opened: [F.chests[0].id, `${other.id}:r1:chest`, 'junk', 42],
    mined: [F.veins[0].id, `${other.id}:r1:v0`],
    cleared: [L.end, `${other.id}:r1`],
    visited: [L.entrance, L.entrance, `${other.id}:r0`] };
  const clean = cleanState('caves', raw);
  // Portal isolation: another planet's cave rows are dropped, so one planet's snapshot can never hold another's.
  assert.deepEqual(clean.opened, [F.chests[0].id]);
  assert.deepEqual(clean.mined, [F.veins[0].id]);
  assert.deepEqual(clean.cleared, [L.end]);
  assert.deepEqual(clean.visited, [L.entrance], 'and a repeated room is kept once');
  assert.deepEqual(cleanState('caves', clean), clean, 'cleaning is stable');
});

test('a player snapshot carries the cave pose, and an older one defaults to the surface', () => {
  const old = cleanState('player', { charId: 'witch', level: 3, coins: 5 });
  assert.deepEqual([old.cave, old.caveX, old.caveZ], [null, 0, 0], 'a save from before caves starts outside');
  const inside = cleanState('player', { charId: 'witch', level: 3, cave: CAVES.frostveil.id, caveX: 12.5, caveZ: -48 });
  assert.deepEqual([inside.cave, inside.caveX, inside.caveZ], [CAVES.frostveil.id, 12.5, -48]);
  assert.equal(cleanState('player', { charId: 'witch', level: 3, cave: 'made-up-cave' }).cave, null);
  const far = cleanState('player', { charId: 'witch', level: 3, cave: CAVES.frostveil.id, caveX: 1e9, caveZ: NaN });
  assert.ok(Math.abs(far.caveX) <= 400 && Number.isFinite(far.caveZ), 'a damaged pose is clamped, never NaN');
});
