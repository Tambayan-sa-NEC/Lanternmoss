import test from 'node:test';
import assert from 'node:assert/strict';
import { CAVE, CAVES, ROOM_KIT } from '../src/config/dungeons.js';
import { PLANETS } from '../src/config/planets.js';
import { DIRS, floorRects, generateCave, roomAt, walkable } from '../src/world/caveLayout.js';

const SEEDS = [1, 7, 42, 1234, 99991, ...PLANETS.map(p => p.seed)];
const all = () => Object.entries(CAVES).flatMap(([planet, cave]) => SEEDS.map(seed => ({ planet, cave, seed, L: generateCave(cave, seed) })));

test('the same cave and seed always give the same rooms, ids, kinds and doors; another seed gives another cave', () => {
  for (const { cave, seed, L } of all()) assert.deepEqual(generateCave(cave, seed), L, `${cave.id} / ${seed}`);
  const c = CAVES.lanternmoss, a = generateCave(c, 1), b = generateCave(c, 2);
  assert.notDeepEqual(a.rooms.map(r => [r.gx, r.gz]), b.rooms.map(r => [r.gx, r.gz]));
  for (const { cave, L } of all()) L.rooms.forEach((r, i) => assert.equal(r.id, `${cave.id}:r${i}`));
});

test('every room is reachable from the entrance, doors pair up both ways, and the end is the deepest room', () => {
  for (const { cave, seed, L } of all()) {
    const byId = new Map(L.rooms.map(r => [r.id, r])), seen = new Set([L.entrance]), queue = [L.entrance];
    while (queue.length) for (const id of Object.values(byId.get(queue.shift()).doors)) if (id && !seen.has(id)) { seen.add(id); queue.push(id); }
    assert.equal(seen.size, L.rooms.length, `${cave.id}/${seed}: all rooms reachable`);
    for (const r of L.rooms) for (const [d, id] of Object.entries(r.doors)) if (id) {
      const o = byId.get(id), [dx, dz] = DIRS[d];
      assert.deepEqual([o.gx - r.gx, o.gz - r.gz], [dx, dz], 'a door leads to the neighbouring cell');
      assert.equal(Object.values(o.doors).filter(x => x === r.id).length, 1, 'and back');
    }
    assert.equal(L.links.length, L.rooms.length - 1, 'a tree: no loops, no orphans');
    assert.equal(byId.get(L.end).depth, Math.max(...L.rooms.map(r => r.depth)));
    assert.equal(byId.get(L.entrance).kind, 'entrance'); assert.equal(byId.get(L.end).kind, 'end');
    assert.equal(byId.get(L.entrance).doors.s, null, 'the entrance keeps its south side for the mouth');
  }
});

test('room counts stay in range, rooms never overlap, and every room fits its grid cell', () => {
  for (const { cave, seed, L } of all()) {
    assert.ok(L.rooms.length >= cave.rooms[0] && L.rooms.length <= cave.rooms[1], `${cave.id}/${seed}: ${L.rooms.length}`);
    assert.equal(new Set(L.rooms.map(r => `${r.gx},${r.gz}`)).size, L.rooms.length);
    for (const r of L.rooms) {
      assert.ok(r.w < CAVE.cell - 2 && r.d < CAVE.cell - 2, 'room smaller than its cell, leaving corridor room');
      assert.deepEqual([r.w, r.d], [ROOM_KIT[r.kind].w, ROOM_KIT[r.kind].d]);
    }
  }
});

test('a walker can go from every room to each neighbour, and stand at the mouth; walls stop it', () => {
  for (const { cave, seed, L } of all()) {
    const R = floorRects(L), byId = new Map(L.rooms.map(r => [r.id, r]));
    for (const l of L.links) {
      const a = byId.get(l.a), b = byId.get(l.b);
      for (let k = 0; k <= 80; k++) assert.ok(walkable(R, a.x + (b.x - a.x) * k / 80, a.z + (b.z - a.z) * k / 80), `${cave.id}/${seed}: ${l.a} -> ${l.b} at ${k}`);
    }
    assert.ok(walkable(R, L.mouth.x, L.mouth.z), 'the mouth');
    assert.equal(roomAt(L, L.mouth.x, L.mouth.z), L.entrance);
    const e = byId.get(L.entrance);
    assert.equal(walkable(R, e.x - e.w / 2 - 0.5, e.z), e.doors.w !== null, 'beyond the west wall only through a door');
    assert.equal(walkable(R, e.x + e.w / 2 - 0.2, e.z + e.d / 2 - 0.2), false, 'not hugging a corner');
  }
});
