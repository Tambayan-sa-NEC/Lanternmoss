/* Cats, dogs and spirit foxes: wander, nap, and react when the hero comes close. */
import * as THREE from 'three';
import { CRITTER_DEFS } from '../../config/critters.js';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { buildQuad } from '../../models/creatures.js';
import { addDyn, removeDyn } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { clamp, damp } from '../../utils/math.js';
import { mpick, mr } from '../../utils/random.js';
import { projectTangent, tangentTo, turnToward } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3();

export class Critter extends Walker {
  constructor(defKey, dir) {
    const def = CRITTER_DEFS[defKey]; super(dir, def.kind === 'dog' ? 0.38 : 0.32);
    this.def = def; this.kind = def.kind; Object.assign(this, buildQuad(def)); scene.add(this.root);
    this.shadow = makeShadow(0.45); this.height = 0.85; this.fwd.applyAxisAngle(this.up, Math.random() * 6.28);
    this.state = 'idle'; this.timer = mr(1, 3); this.speed = 0; this.phase = Math.random() * 10; this.cool = 0; this.turnRate = 0; this.sit = 0; this.trailT = 0;
    this.baseSpeed = { cat: 1.4, dog: 1.9, fox: 2.3 }[this.kind];
    this.selfCollider = addDyn(this.up, this.radius * 0.8);
    this.toP = new V3();      // tangent direction toward the player, refreshed every update (also read by animate)
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); removeDyn(this.selfCollider); }
  react() {
    this.cool = 9 + Math.random() * 4;
    if (this.kind === 'cat') {
      if (this.state === 'nap' || Math.random() < 0.45) { emote(this, '!', '#ff8a3d'); this.vy = 4.2; this.grounded = false; this.state = 'flee'; this.timer = 1.8; }
      else { emote(this, 'heart'); this.state = 'sit'; this.timer = 4; this.vy = 2.5; this.grounded = false; }
      audio.meow();
    } else if (this.kind === 'dog') {
      emote(this, Math.random() < 0.6 ? 'heart' : '!', Math.random() < 0.5 ? '#ff6b9a' : '#ff8a3d');
      this.state = 'follow'; this.timer = 7; this.vy = 3.6; this.grounded = false; audio.bark();
    } else {
      emote(this, 'star', '#b58cff'); this.state = 'spin'; this.timer = 0.9;
      sparkles.emit(this.pos.clone().addScaledVector(this.up, 0.6), { count: 30, color: 0xd8b8ff, speed: 2.5, up: this.up, upBias: 0.8, life: 1.1, size: 0.3 }); audio.sparkle();
    }
  }
  update(dt) {
    const toP = this.toP, dist = tangentTo(this.pos, this.up, ctx.player.pos, toP);
    this.cool -= dt; this.timer -= dt;
    if (this.cool <= 0 && dist < 4.2 && !['flee', 'spin'].includes(this.state)) this.react();
    let target = 0;
    switch (this.state) {
      case 'idle':
        if (this.timer < 0) {
          if (this.kind === 'cat' && Math.random() < 0.3) { this.state = 'nap'; this.timer = mr(6, 10); }
          else { this.state = 'wander'; this.timer = mr(2, 5); this.turnRate = mr(-1.2, 1.2); }
        }
        break;
      case 'wander':
        target = this.baseSpeed; this.fwd.applyAxisAngle(this.up, this.turnRate * dt);
        if (this.timer < 0) { this.state = 'idle'; this.timer = mr(1.2, 4); }
        break;
      case 'nap':
        if (Math.random() < dt * 0.4) emote(this, 'z', '#7a6cff');
        if (this.timer < 0) { this.state = 'idle'; this.timer = 1; }
        break;
      case 'sit':
        turnToward(this.fwd, toP, this.up, damp(5, dt)); if (this.timer < 0) { this.state = 'idle'; this.timer = 1; }
        break;
      case 'follow':
        turnToward(this.fwd, toP, this.up, damp(6, dt)); target = dist > 2.2 ? Math.min(6, dist * 1.8) : 0;
        if (dist < 2.6 && this.grounded && Math.random() < dt * 1.4) { this.vy = 3.4; this.grounded = false; }
        if (this.timer < 0) { this.state = 'idle'; this.timer = 2; }
        break;
      case 'flee':
        _tv.copy(toP).negate(); turnToward(this.fwd, _tv, this.up, damp(8, dt)); target = this.kind === 'fox' ? 6.2 : 4.2;
        if (this.timer < 0) { this.state = 'idle'; this.timer = mr(1, 3); }
        break;
      case 'spin':
        this.fwd.applyAxisAngle(this.up, 9 * dt); target = 2.4; if (this.timer < 0) { this.state = 'flee'; this.timer = 2.6; }
        break;
    }
    this.speed += (target - this.speed) * damp(6, dt);
    _tv2.copy(this.fwd).multiplyScalar(this.speed);
    const n = this.step(_tv2, dt, 24);
    if (n && this.speed > 0.3) { this.fwd.addScaledVector(n, 0.9); projectTangent(this.fwd, this.up).normalize(); this.turnRate = -this.turnRate; }
    // spirit fox: sparkle trail from its glowing tail
    if (this.tip && this.speed > 1) {
      this.trailT -= dt;
      if (this.trailT < 0) { this.trailT = 0.04; this.tip.getWorldPosition(_tv); sparkles.emit(_tv, { count: 1, color: mpick([0xc7a8ff, 0xffd6f5, 0xbff4ff]), speed: 0.4, life: 0.9, size: 0.28 }); }
    }
    this.animate(dt, dist);
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
  /** Legs, sitting, tail wag and head-turn toward the player (uses this.toP from the latest update). */
  animate(dt, dist) {
    const time = ctx.time, toP = this.toP, s = this.speed; this.phase += dt * (2 + s * 5.5);
    const sw = Math.min(1, s / 1.4) * 0.8, a = Math.sin(this.phase) * sw, [fl, fr, bl, br] = this.legs;
    const sitT = (this.state === 'sit' || this.state === 'nap') ? 1 : 0; this.sit += (sitT - this.sit) * damp(6, dt);
    fl.rotation.x = a; br.rotation.x = a - this.sit * 1.2; fr.rotation.x = -a; bl.rotation.x = -a - this.sit * 1.2;
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.04 * Math.min(1, s) - this.sit * (this.state === 'nap' ? 0.16 : 0.06);
    this.body.rotation.x = -this.sit * (this.state === 'nap' ? 0 : 0.3);
    const wag = this.state === 'follow' ? 18 : this.kind === 'cat' ? 2.5 : 6;
    this.tail.rotation.z = Math.sin(time * wag + this.phase) * (this.kind === 'cat' ? 0.35 : 0.5);
    // look at the player when close
    let look = 0; if (dist < 6 && this.state !== 'nap') { _tv.crossVectors(this.fwd, toP); look = clamp(Math.atan2(_tv.dot(this.up), this.fwd.dot(toP)), -0.8, 0.8); }
    this.head.rotation.y += (look - this.head.rotation.y) * damp(6, dt);
    this.head.rotation.x = this.state === 'nap' ? 0.4 : Math.sin(time * 1.3 + this.phase * 0.1) * 0.05;
  }
}
