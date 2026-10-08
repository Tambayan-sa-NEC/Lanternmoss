/* SURFACE WALKER: shared physics for the player, critters, NPCs and enemies.
   Over the terrain (src/world/terrain.js): ground steeper than WORLD.maxSlope can't be walked up (you slide along it,
   or jump: cliffs and rocks are climbable that way), solids with a top (rocks) can be stood on, and water slows you,
   then floats you once it's deep (waterDepth / swimming tell the owner, e.g. for splashes). */
import * as THREE from 'three';
import { WORLD } from '../config/game.js';
import { frameQuat, projectTangent, tangentFrame } from '../utils/sphere.js';
import { groundHeight, terrainGradient } from '../world/terrain.js';
import { resolveCollisions, support } from './colliders.js';

const _p = new THREE.Vector3(), _u = new THREE.Vector3(), _d = new THREE.Vector3(), _g = new THREE.Vector3();

export class Walker {
  constructor(dir, radius) {
    this.up = dir.clone().normalize(); this.r = groundHeight(this.up); this.vy = 0; this.grounded = true; this.radius = radius;
    this.fwd = tangentFrame(this.up)[0]; this.pos = this.up.clone().multiplyScalar(this.r); this.selfCollider = null; this.hover = 0;
    this.waterDepth = 0; this.swimming = false;
  }
  /** Is the move by displacement d (tangent) from here too steep to walk? (only on the ground, not on a rock) */
  tooSteep(d) {
    const run = d.length(); if (run < 1e-5 || !this.grounded) return false;
    const here = groundHeight(this.up); if (this.r - here > 0.3 && !this.swimming) return false;
    const there = groundHeight(_u.copy(this.up).multiplyScalar(this.r).add(d).normalize());
    return there - here > 0.004 && (there - here) / run > WORLD.maxSlope;
  }
  /** Move by a tangent velocity on the sphere; resolves collisions, re-aligns to gravity and transports the heading. */
  step(vel, dt, gravity = 26) {
    const W = WORLD.water, slow = this.waterDepth > 0.15 ? (this.swimming ? W.swim : W.wade) : 1;
    _d.copy(vel).multiplyScalar(dt * slow);
    if (this.tooSteep(_d)) {                                    // a cliff: slide along it instead (keep the part across the slope)
      terrainGradient(this.up, _g); const into = _d.dot(_g); if (into > 0) _d.addScaledVector(_g, -into);
      if (this.tooSteep(_d)) _d.set(0, 0, 0);
    }
    _p.copy(this.up).multiplyScalar(this.r).add(_d);
    const n = resolveCollisions(_p, this.radius, this.selfCollider);
    const normal = n ? n.clone() : null;
    this.up.copy(_p).normalize();                               // gravity always points to the planet centre
    projectTangent(this.fwd, this.up).normalize();              // parallel-transport heading (pole-safe)
    this.vy -= gravity * dt; this.r += this.vy * dt;
    const s = support(this.up), floor = s.h;
    this.waterDepth = s.water ? s.water.depth : 0; this.swimming = !!s.water && s.water.depth > W.deep;
    if (this.r <= floor || (this.grounded && this.vy <= 0 && this.r - floor < 0.35)) { this.r = floor; this.vy = 0; this.grounded = true; }
    else this.grounded = false;
    this.pos.copy(this.up).multiplyScalar(this.r);
    return normal;
  }
  place(root) { root.position.copy(this.pos).addScaledVector(this.up, this.hover); frameQuat(this.up, this.fwd, root.quaternion); }
}
