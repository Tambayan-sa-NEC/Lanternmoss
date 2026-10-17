import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RoomSpace } from '../src/physics/RoomSpace.js';
import { CAVES } from '../src/config/dungeons.js';
import { generateCave } from '../src/world/caveLayout.js';

const V = THREE.Vector3, origin = new V(0, -3000, 0);
const space = () => new RoomSpace(generateCave(CAVES.lanternmoss, 271828), origin);
const actor = radius => ({ pos: new V(), up: new V(), radius, height: 2, selfCollider: { active: true } });

test('room positions remain distinct under the same up, and height and gravity use the flat floor', () => {
  const s = space(), a = s.attach(actor(0.35), origin.clone().add(new V(1, 0, 1))), b = s.attach(actor(0.35), origin.clone().add(new V(-1, 0, 1)));
  assert.deepEqual(a.up, b.up); assert.equal(s.distance(s.point(a), s.point(b)), 2);
  a.vy = 6; a.grounded = false; s.step(a, new V(0, 0, -1), 0.1, 24);
  assert.ok(a.pos.y > origin.y && a.pos.z < 1 && !a.grounded);
  for (let i = 0; i < 90; i++) s.step(a, new V(), 1 / 60, 24);
  assert.equal(a.pos.y, origin.y); assert.equal(a.vy, 0); assert.ok(a.grounded); assert.equal(a.waterDepth, 0);
});

test('swept movement holds walls during a dash, slides, and does not cross an enemy body', () => {
  const s = space(), a = s.attach(actor(0.35), origin.clone());
  const r = s.layout.rooms[0], west = !r.doors.w;
  const d = west ? new V(-100, 0, 1) : new V(1, 0, 100);
  s.move(a.pos, d, a.radius, a);
  assert.ok(s.contains(a.pos, a.radius)); assert.ok(Math.abs(a.pos.x) < 4 && Math.abs(a.pos.z) < 4);
  s.place(a, origin); const b = s.attach(actor(0.5), origin.clone().add(new V(2, 0, 0)));
  s.move(a.pos, new V(3, 0, 0), a.radius, a);
  assert.ok(s.distance(a.pos, b.pos) >= a.radius + b.radius);
  s.place(a, b.pos); s.move(a.pos, new V(0, 0, -1.5), a.radius, a);
  assert.ok(s.distance(a.pos, b.pos) > 1, 'a scripted landing overlapping a body can move away');
});

test('room navigation follows connected doorways and line checks reject walls', () => {
  const s = space(), target = s.layout.rooms.at(-1), to = origin.clone().add(new V(target.x, 0, target.z)), at = origin.clone();
  let turns = 0;
  for (let i = 0; i < 3000 && s.distance(at, to) > 0.4; i++) {
    const next = s.waypoint(at, to, 0.35); assert.ok(s.contains(next, 0.35));
    const before = at.clone(); s.move(at, s.toward(at, next).multiplyScalar(0.12), 0.35);
    assert.ok(s.contains(at, 0.35)); if (before.distanceTo(at) > 0) turns++;
  }
  assert.ok(s.distance(at, to) < 0.4 && turns > 10, 'walked through the room graph');
  const entry = s.layout.rooms[0];
  assert.equal(s.clear(origin, origin.clone().add(new V(0, 0, entry.d))), false, 'solid floor boundaries block a straight attack');
});

test('an ogre footprint crosses room/corridor joins and cannot fit through a narrower corridor', () => {
  const s = space(), link = s.layout.links[0], a = s.layout.rooms.find(r => r.id === link.a), b = s.layout.rooms.find(r => r.id === link.b);
  const from = origin.clone().add(new V(a.x, 0, a.z)), to = origin.clone().add(new V(b.x, 0, b.z));
  assert.ok(s.clear(from, to, 0.85), 'the original ogre fits continuously through a doorway, not just at its ends');
  assert.equal(s.clear(from, to, 1.4), false, 'a body wider than the corridor is still blocked');
  const at = from.clone(); s.move(at, to.clone().sub(from), 0.85);
  assert.ok(s.distance(at, to) < 0.01, 'the large actor actually walks across the join');
});
