/* Pond fish: circle under the surface, speed up when the hero is near, and leap now and then. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { sparkles } from '../../fx/sparkles.js';
import { buildFish } from '../../models/creatures.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { damp } from '../../utils/math.js';
import { mpick, mr } from '../../utils/random.js';
import { arcDist, frameQuat } from '../../utils/sphere.js';

const V3 = THREE.Vector3;
const _tv = new V3();
const SCALES = [{ body: 0xff9a4a, spot: 0xffffff, fin: 0xffc38a }, { body: 0xffffff, spot: 0xff6a5a, fin: 0xffd0c8 }, { body: 0xffd84a, fin: 0xfff0a0 }, { body: 0x9ad0ff, spot: 0xffffff, fin: 0xd6ecff }];

export class Fish {
  constructor(pond) {
    this.pond = pond; Object.assign(this, buildFish(mpick(SCALES)));
    scene.add(this.root); this.theta = Math.random() * 6.28; this.rad = mr(0.8, pond.r * 0.62); this.radTarget = this.rad;
    this.w = mr(0.35, 0.6) * (Math.random() < 0.5 ? -1 : 1); this.boost = 0; this.jump = -1; this.pos = new V3(); this.up = pond.dir; this.height = 0.3;
  }
  update(dt) {
    const p = this.pond, near = arcDist(ctx.player.up, p.dir) < p.r + 2.6;
    if (near) this.boost = Math.min(1, this.boost + dt * 2); else this.boost = Math.max(0, this.boost - dt * 0.4);
    if (Math.random() < dt * 0.25) this.radTarget = mr(0.8, p.r * 0.65);
    this.rad += (this.radTarget - this.rad) * damp(0.6, dt);
    this.theta += this.w * (1 + this.boost * 2.2) * dt * (2 / Math.max(1, this.rad));
    let jh = 0, pitch = 0;
    if (this.jump >= 0) {
      this.jump += dt / 0.95; jh = Math.sin(Math.PI * Math.min(1, this.jump)) * 1.3; pitch = (0.5 - this.jump) * 2.2;
      if (this.jump >= 1) { this.jump = -1; this.splash(); }
    }
    const c = Math.cos(this.theta), s = Math.sin(this.theta);
    this.pos.copy(p.center).addScaledVector(p.t1, c * this.rad).addScaledVector(p.t2, s * this.rad).addScaledVector(p.dir, -0.38 + jh);
    _tv.copy(p.t1).multiplyScalar(-s).addScaledVector(p.t2, c).multiplyScalar(Math.sign(this.w));
    this.root.position.copy(this.pos); frameQuat(p.dir, _tv, this.root.quaternion); this.root.rotateX(-pitch);
    this.tail.rotation.y = Math.sin(ctx.time * (8 + this.boost * 10) + this.theta * 3) * 0.55;
  }
  splash() { sparkles.emit(this.pos.clone().addScaledVector(this.pond.dir, 0.2), { count: 16, color: 0xc8f6ff, speed: 2.2, up: this.pond.dir, upBias: 1.2, life: 0.7, size: 0.26 }); audio.plip(); }
  leap() { if (this.jump < 0) { this.jump = 0; this.splash(); } }
}
