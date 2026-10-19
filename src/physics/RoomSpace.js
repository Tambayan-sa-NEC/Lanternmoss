/* Flat combat floor, built from the existing cave layout. Actors keep a true world position and a fixed up;
   unlike a planet direction, their floor point contains x/z. Movement, blink and flight share swept wall checks.
   Room-centre paths follow the layout's doors, so enemies and pets can follow around corners. */
import * as THREE from 'three';
import { CAVE } from '../config/dungeons.js';
import { floorRects, roomAt, walkable } from '../world/caveLayout.js';

const V3 = THREE.Vector3;
export class RoomSpace {
  constructor(layout, origin) {
    this.layout = layout; this.origin = origin.clone(); this.up = new V3(0, 1, 0);
    this.rects = floorRects(layout); this.bodies = new Set();
    // Warded doorways (29e): local-space rectangles nothing may stand in or cross while they are up. Because every
    // reach, sweep and room route goes through contains(), a ward stops the hero, pets, monsters and their paths alike.
    this.blockers = [];
  }
  ground(p, lift = 0, out = new V3()) { return out.set(p.x, this.origin.y + lift, p.z); }
  point(actor) { return this.ground(actor.pos); }
  height(p) { return p.y - this.origin.y; }
  distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  advance(p, dir, distance) { return this.ground(p.clone().addScaledVector(dir, distance)); }
  toward(a, b) { const v = b.clone().sub(a); v.y = 0; return v.lengthSq() > 1e-10 ? v.normalize() : new V3(0, 0, -1); }
  contains(p, radius = 0) {
    const x = p.x - this.origin.x, z = p.z - this.origin.z;
    for (const b of this.blockers)
      if (x + radius > b.x0 && x - radius < b.x1 && z + radius > b.z0 && z - radius < b.z1) return false;
    if (walkable(this.rects, x, z, radius)) return true;
    // A large body can straddle two overlapping floor rectangles without fitting inside either one.
    // Check that the union covers its entire square footprint, using exact rectangle-edge slices.
    const x0 = x - radius, x1 = x + radius, z0 = z - radius, z1 = z + radius;
    const rects = this.rects.filter(r => r.x1 >= x0 && r.x0 <= x1 && r.z1 >= z0 && r.z0 <= z1);
    if (!rects.length) return false;
    const cuts = [...new Set([x0, x1, ...rects.flatMap(r => [Math.max(x0, r.x0), Math.min(x1, r.x1)])])].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const mid = (cuts[i - 1] + cuts[i]) / 2;
      const spans = rects.filter(r => r.x0 <= mid && r.x1 >= mid).sort((a, b) => a.z0 - b.z0);
      let covered = z0;
      for (const r of spans) { if (r.z0 > covered) return false; covered = Math.max(covered, r.z1); }
      if (covered < z1) return false;
    }
    return cuts.length > 1;
  }
  clear(a, b, radius = 0) {
    const n = Math.max(1, Math.ceil(this.distance(a, b) / CAVE.motion.sweep));
    const p = new V3();
    for (let i = 0; i <= n; i++) if (!this.contains(p.lerpVectors(a, b, i / n), radius)) return false;
    return true;
  }
  /** Move a world point in small steps, sliding along walls. Optional bodies are other solid room actors. */
  move(pos, displacement, radius, actor = null) {
    const n = Math.max(1, Math.ceil(displacement.length() / CAVE.motion.sweep));
    const d = displacement.clone().divideScalar(n), candidate = new V3(), normal = new V3(); let blocked = false;
    const free = p => this.contains(p, radius) && (!actor || [...this.bodies].every(b =>
      b === actor || b.solid === false || b.alive === false || b.dead ||
      Math.abs(b.pos.y - p.y) > (b.height ?? 1) || this.distance(p, b.pos) >= radius + b.radius ||
      (this.distance(pos, b.pos) < radius + b.radius && this.distance(p, b.pos) > this.distance(pos, b.pos))));
    for (let i = 0; i < n; i++) {
      candidate.copy(pos).add(d);
      if (free(candidate)) { pos.copy(candidate); continue; }
      blocked = true;
      candidate.copy(pos); candidate.x += d.x;
      if (free(candidate)) pos.x = candidate.x; else normal.x -= Math.sign(d.x);
      candidate.copy(pos); candidate.z += d.z;
      if (free(candidate)) pos.z = candidate.z; else normal.z -= Math.sign(d.z);
    }
    return blocked ? normal.normalize() : null;
  }
  attach(actor, point, { solid = true } = {}) {
    actor.space = this; actor.solid = solid; this.bodies.add(actor);
    this.place(actor, point); if (actor.selfCollider) actor.selfCollider.active = false;
    return actor;
  }
  place(actor, point, height = 0) {
    this.ground(point, height, actor.pos); actor.up.copy(this.up); actor.r = actor.pos.y;
    actor.vy = 0; actor.grounded = height === 0; actor.waterDepth = 0; actor.swimming = false;
  }
  detach(actor) { this.bodies.delete(actor); actor.space = null; }
  step(actor, velocity, dt, gravity) {
    const d = velocity.clone().multiplyScalar(dt); d.y = 0;
    const normal = this.move(actor.pos, d, actor.radius, actor.solid === false ? null : actor);
    actor.vy -= gravity * dt; actor.pos.y = Math.max(this.origin.y, actor.pos.y + actor.vy * dt);
    actor.grounded = actor.pos.y <= this.origin.y;
    if (actor.grounded) actor.vy = 0;
    actor.r = actor.pos.y; actor.up.copy(this.up); actor.waterDepth = 0; actor.swimming = false;
    return normal;
  }
  /** Next door/room on a connected route, or the goal itself when the straight path is clear. */
  waypoint(from, to, radius = 0) {
    if (this.clear(from, to, radius)) return to;
    const local = p => ({ x: p.x - this.origin.x, z: p.z - this.origin.z });
    const nearest = p => {
      const q = local(p), id = roomAt(this.layout, q.x, q.z);
      return id ?? this.layout.rooms.reduce((a, b) => Math.hypot(q.x - a.x, q.z - a.z) < Math.hypot(q.x - b.x, q.z - b.z) ? a : b).id;
    };
    const start = nearest(from), end = nearest(to), byId = new Map(this.layout.rooms.map(r => [r.id, r]));
    const prev = new Map([[start, null]]), queue = [start];
    for (let i = 0; i < queue.length && !prev.has(end); i++) for (const next of Object.values(byId.get(queue[i]).doors))
      if (next && !prev.has(next)) { prev.set(next, queue[i]); queue.push(next); }
    const path = []; for (let id = end; id; id = prev.get(id)) path.unshift(byId.get(id));
    const points = [];
    for (let i = 0; i < path.length; i++) {
      const a = path[i], b = path[i + 1];
      points.push(this.origin.clone().add(new V3(a.x, 0, a.z)));
      if (b) points.push(this.origin.clone().add(new V3((a.x + b.x) / 2, 0, (a.z + b.z) / 2)));
    }
    points.push(this.ground(to));
    for (let i = points.length - 1; i >= 0; i--)
      if (this.distance(from, points[i]) > CAVE.motion.waypointReach && this.clear(from, points[i], radius)) return points[i];
    return from;
  }
}
