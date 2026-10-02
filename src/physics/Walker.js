/* SURFACE WALKER: shared physics for the player, critters, NPCs and enemies. */
import * as THREE from 'three';
import { frameQuat, projectTangent, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { resolveCollisions } from './colliders.js';

const _p = new THREE.Vector3();

export class Walker {
  constructor(dir, radius) {
    this.up = dir.clone().normalize(); this.r = groundHeight(this.up); this.vy = 0; this.grounded = true; this.radius = radius;
    this.fwd = tangentFrame(this.up)[0]; this.pos = this.up.clone().multiplyScalar(this.r); this.selfCollider = null; this.hover = 0;
  }
  /** Move by a tangent velocity on the sphere; resolves collisions, re-aligns to gravity and transports the heading. */
  step(vel, dt, gravity = 26) {
    _p.copy(this.up).multiplyScalar(this.r).addScaledVector(vel, dt);
    const n = resolveCollisions(_p, this.radius, this.selfCollider);
    const normal = n ? n.clone() : null;
    this.up.copy(_p).normalize();                               // gravity always points to the planet centre
    projectTangent(this.fwd, this.up).normalize();              // parallel-transport heading (pole-safe)
    this.vy -= gravity * dt; this.r += this.vy * dt;
    const gh = groundHeight(this.up);
    if (this.r <= gh || (this.grounded && this.vy <= 0 && this.r - gh < 0.35)) { this.r = gh; this.vy = 0; this.grounded = true; }
    else this.grounded = false;
    this.pos.copy(this.up).multiplyScalar(this.r);
    return normal;
  }
  place(root) { root.position.copy(this.pos).addScaledVector(this.up, this.hover); frameQuat(this.up, this.fwd, root.quaternion); }
}
