/* TODO 29e: the last stretch of a cave. Pure checks only (no scene, no runtime): where `caveEnding` puts the puzzle,
   the warded door, the key chest, the guardian and the way home, that every puzzle it writes can actually be solved,
   and the `cavePuzzles` cleaner in core/save.js. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAVE, CAVES } from '../src/config/dungeons.js';
import { COMBAT } from '../src/config/combat.js';
import { CHEST_KINDS, LOOT_TABLES } from '../src/config/chests.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';
import { caveEnding, caveFixtures, floorRects, generateCave, roomAt, routeToEnd, walkable } from '../src/world/caveLayout.js';
import { cleanState } from '../src/core/save.js';

const SEEDS = [1, 7, 42, 1234, 99991, ...PLANETS.map(p => p.seed)];
const all = () => Object.values(CAVES).flatMap(cave => SEEDS.map(seed => {
  const L = generateCave(cave, seed); return { cave, seed, L, E: caveEnding(L, cave) };
}));
const roomOf = (L, id) => L.rooms.find(r => r.id === id);

test('the end room is never next to the entrance, so there is always a room to put the puzzle in', () => {
  // caveEnding relies on this: the puzzle room is the end's parent, and the entrance must stay the safe empty room.
  for (const cave of Object.values(CAVES)) for (let seed = 0; seed < 600; seed++) {
    const L = generateCave(cave, seed);
    assert.ok(roomOf(L, L.end).depth >= 2, `${cave.id}/${seed}: the end is at least two rooms in`);
    const path = routeToEnd(L);
    assert.equal(path[0], L.entrance); assert.equal(path[path.length - 1], L.end);
    assert.ok(path.length >= 3, 'and the route passes through at least one room between them');
  }
});

test('the ending is deterministic, and sits on the only route to the end room', () => {
  for (const { cave, seed, L, E } of all()) {
    assert.deepEqual(caveEnding(L, cave), E, `${cave.id}/${seed} is deterministic`);
    const path = routeToEnd(L);
    assert.equal(E.puzzle.room, path[path.length - 2], 'the puzzle room is the end room\'s parent');
    assert.notEqual(E.puzzle.room, L.entrance, 'never the entrance');
    assert.notEqual(E.puzzle.room, L.end, 'and never the end room itself');
    assert.equal(E.keyChest.room, E.puzzle.room, 'the key waits in the puzzle room');
    assert.equal(E.door.room, E.puzzle.room); assert.equal(E.door.to, L.end, 'the door is the way into the end room');
    assert.equal(E.guardian.room, L.end); assert.equal(E.shortcut.room, L.end);
    assert.ok(COMBAT.enemies[E.guardian.type], `${cave.id}: the guardian is a real monster kind`);
    assert.ok(LOOT_TABLES[E.guardian.loot], `${cave.id}: its loot is a real table`);
    assert.ok(CHEST_KINDS[E.keyChest.kind]);
    assert.ok(ITEM_DEFINITIONS.some(d => d.id === E.keyChest.item), 'and the key is a real item');
  }
});

test('the ward closes the doorway it stands in, and nothing else', () => {
  for (const { cave, seed, L, E } of all()) {
    const room = roomOf(L, E.puzzle.room), end = roomOf(L, L.end), d = E.door;
    assert.ok(d.x1 > d.x0 && d.z1 > d.z0, `${cave.id}/${seed}: the ward has an area`);
    // It lies between the two rooms, and spans the corridor it closes.
    const across = d.dir === 'n' || d.dir === 's';
    assert.ok(Math.abs((across ? d.x1 - d.x0 : d.z1 - d.z0) - CAVE.corridor) < 1e-9, 'as wide as the corridor');
    assert.ok(Math.min(room.x, end.x) - 0.6 <= d.x && d.x <= Math.max(room.x, end.x) + 0.6);
    assert.ok(Math.min(room.z, end.z) - 0.6 <= d.z && d.z <= Math.max(room.z, end.z) + 0.6);
    // Standing in the doorway is ordinarily possible: the ward is what takes that away at runtime.
    assert.ok(walkable(floorRects(L), d.x, d.z, 0.35), 'the doorway itself is floor');
  }
});

test('every puzzle a cave writes can be solved: a stone can reach each plate, and nothing blocks a doorway', () => {
  for (const { cave, seed, L, E } of all()) {
    const room = roomOf(L, E.puzzle.room), rects = floorRects(L), P = E.puzzle;
    const pieces = [...P.switches, ...P.plates, ...P.stones, E.keyChest, E.guardian, E.shortcut];
    for (const f of pieces) {
      assert.ok(walkable(rects, f.x, f.z, 0.4), `${cave.id}/${seed}: ${f.id} stands on the floor`);
      assert.equal(roomAt(L, f.x, f.z), f.room ?? E.puzzle.room, `${f.id} is inside its own room`);
    }
    for (const f of pieces) {
      const r = roomOf(L, f.room ?? E.puzzle.room);
      for (const [dir, to] of Object.entries(r.doors)) {
        if (!to) continue;
        const across = dir === 'n' || dir === 's' ? Math.abs(f.x - r.x) : Math.abs(f.z - r.z);
        const along = dir === 'n' ? f.z - (r.z - r.d / 2) : dir === 's' ? (r.z + r.d / 2) - f.z
          : dir === 'w' ? f.x - (r.x - r.w / 2) : (r.x + r.w / 2) - f.x;
        assert.ok(across > CAVE.corridor / 2 + 0.6 || along > 1.1, `${cave.id}/${seed}: ${f.id} keeps out of the ${dir} doorway`);
      }
    }
    if (P.kind === 'stones') {
      assert.equal(P.stones.length, P.plates.length, 'a stone for every plate');
      assert.equal(P.switches.length, 0);
      P.stones.forEach((st, i) => {
        const pl = P.plates[i];
        assert.ok(Math.abs(st.x - pl.x) < 1e-9, `${cave.id}/${seed}: ${st.id} lines up with its plate`);
        // The whole straight push, stone-sized, stays on the floor of this room: the hero can always finish it.
        const steps = Math.ceil(Math.abs(st.z - pl.z) / 0.25);
        for (let k = 0; k <= steps; k++) {
          const z = st.z + (pl.z - st.z) * (k / steps);
          assert.ok(walkable(rects, st.x, z, CAVE.puzzle.stoneRadius), `${st.id} can be pushed through ${z.toFixed(2)}`);
          assert.equal(roomAt(L, st.x, z), room.id, 'without leaving the room');
        }
        // And the hero has somewhere to stand behind it to start the push.
        assert.ok(walkable(rects, st.x, st.z + 0.9, 0.35), `there is room to shoulder ${st.id}`);
      });
    } else {
      assert.equal(P.kind, 'lanterns');
      assert.equal(P.switches.length, CAVE.puzzle.switches); assert.equal(P.stones.length + P.plates.length, 0);
    }
    const ids = pieces.map(f => f.id);
    assert.equal(new Set(ids).size, ids.length, 'no two pieces share an id');
    // The puzzle must not sit on top of the key chest it unseals, nor the rewards 29d already put in this room.
    const fixtures = caveFixtures(L, cave);
    for (const f of [...P.switches, ...P.plates, ...P.stones])
      for (const other of [E.keyChest, ...fixtures.veins.filter(v => v.room === room.id), ...fixtures.chests.filter(c => c.room === room.id)])
        assert.ok(Math.hypot(f.x - other.x, f.z - other.z) > 1.1, `${f.id} stands clear of ${other.id}`);
  }
});

test('both puzzle kinds are actually used across the caves', () => {
  const kinds = new Set(Object.values(CAVES).map(cave => caveEnding(generateCave(cave, 1), cave).puzzle.kind));
  assert.deepEqual([...kinds].sort(), ['lanterns', 'stones'], 'the three caves between them use both kinds');
});

test('puzzle progress is cleaned to one cave, and an older save simply has none', () => {
  const empty = { cave: null, lit: [], unlocked: [], beaten: [], opened: [], stones: [] };
  for (const value of [null, undefined, {}, 'nonsense', { cave: 'not-a-cave', lit: ['x'] }])
    assert.deepEqual(cleanState('cavePuzzles', value), empty, 'an unknown or missing cave keeps nothing');

  const cave = CAVES.emberfall, other = CAVES.frostveil;
  const L = generateCave(cave, PLANETS[1].seed), E = caveEnding(L, cave);
  const clean = cleanState('cavePuzzles', { cave: cave.id,
    lit: [`${E.puzzle.room}:sw0`, `${other.id}:r1:sw0`, 'junk'],
    unlocked: [E.door.id, `${other.id}:r1:door`],
    beaten: [E.guardian.id, `${other.id}:r1:guardian`],
    opened: [E.keyChest.id, E.shortcut.id, `${other.id}:r1:keychest`],
    stones: [{ id: E.puzzle.stones[0].id, x: 3.5, z: -2.25 }, { id: `${other.id}:r1:st0`, x: 1, z: 1 }, { id: 'junk', x: 0, z: 0 }] });
  // Portal isolation: another planet's cave rows are dropped, exactly as the rewards record is.
  assert.deepEqual(clean.unlocked, [E.door.id]);
  assert.deepEqual(clean.beaten, [E.guardian.id]);
  assert.deepEqual(clean.opened, [E.keyChest.id, E.shortcut.id]);
  assert.deepEqual(clean.lit, [`${E.puzzle.room}:sw0`]);
  assert.deepEqual(clean.stones, [{ id: E.puzzle.stones[0].id, x: 3.5, z: -2.25 }], 'a stone keeps where it was left');
  assert.deepEqual(cleanState('cavePuzzles', clean), clean, 'cleaning is stable');
  const wild = cleanState('cavePuzzles', { cave: cave.id, stones: [{ id: E.puzzle.stones[0].id, x: 1e9, z: NaN }] });
  assert.ok(Math.abs(wild.stones[0].x) <= 400 && Number.isFinite(wild.stones[0].z), 'a damaged position is clamped, never NaN');
});
