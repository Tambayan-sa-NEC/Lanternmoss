/* Little birds: hop and peck on the ground, take off and circle when the hero gets close. Flocks: a loose V of birds
   wheeling high over the planet. Plumage comes from the planet (PLANETS[i].wildlife.plumage), else the defaults. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { buildBird } from '../../models/creatures.js';
import { resolveCollisions } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { damp } from '../../utils/math.js';
import { mpick, mr } from '../../utils/random.js';
import { dirAlong, frameQuat, projectTangent, tangentFrame, tangentTo } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';

const V3 = THREE.Vector3;
const _toP = new V3(), _tv = new V3(), _tv2 = new V3(), _p = new V3();
const PLUMAGE = [{ body: 0x7fb8ff, belly: 0xfff0e0, wing: 0x5f98e8 }, { body: 0xb08a7a, belly: 0xff9068, wing: 0x8a6a5a }, { body: 0xffe066, belly: 0xfff6d0, wing: 0xf2c440 }, { body: 0xffffff, belly: 0xffe0ea, wing: 0xf0e6ff }];

export class Bird extends Walker {
  constructor(dir, plumage = null) {
    super(dir, 0.18); const c = mpick(plumage ?? PLUMAGE);
    Object.assign(this, buildBird(c)); scene.add(this.root); this.shadow = makeShadow(0.25); this.height = 0.45;
    this.state = 'ground'; this.timer = mr(0.5, 2); this.flyTime = 0; this.hopVel = 0; this.peck = 0; this.flap = 0; this.cruise = mr(7.5, 10);
    this.fwd.applyAxisAngle(this.up, Math.random() * 6.28);
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); }
  takeoff() {
    this.state = 'fly'; this.flyTime = mr(4, 8); this.grounded = false; _tv.copy(_toP).negate(); if (_tv.lengthSq() > 0.1) this.fwd.copy(_tv);
    if (Math.random() < 0.4) emote(this, '!', '#ff8a3d'); audio.chirp();
  }
  update(dt) {
    const time = ctx.time, dist = tangentTo(this.pos, this.up, ctx.player.pos, _toP);
    if (this.state === 'ground') {
      this.timer -= dt;
      if (dist < 4.8) this.takeoff();
      else if (this.grounded && this.timer < 0) {
        if (Math.random() < 0.3) { this.peck = 0.35; } else { this.vy = 3.2; this.grounded = false; this.hopVel = 1.6; this.fwd.applyAxisAngle(this.up, mr(-0.9, 0.9)); }
        if (dist < 16 && Math.random() < 0.12) { emote(this, '♪', '#7a6cff'); audio.chirp(); }
        this.timer = mr(0.4, 1.4);
      }
      _tv2.copy(this.fwd).multiplyScalar(this.grounded ? 0 : this.hopVel);
      const n = this.step(_tv2, dt, 20);
      if (n) { this.fwd.addScaledVector(n, 1.2); projectTangent(this.fwd, this.up).normalize(); }
      this.flap = this.grounded ? 0 : Math.sin(time * 30) * 0.6;
    }
    if (this.state === 'fly') {
      this.flyTime -= dt; this.fwd.applyAxisAngle(this.up, Math.sin(time * 0.7 + this.cruise) * 0.7 * dt);
      const gh = groundHeight(this.up), speed = this.flyTime > 0 ? 6.5 : 2.5;
      _p.copy(this.up).multiplyScalar(this.r).addScaledVector(this.fwd, speed * dt);
      if (this.r - gh < 2.5) resolveCollisions(_p, this.radius, null);
      this.up.copy(_p).normalize(); projectTangent(this.fwd, this.up).normalize();
      const gh2 = groundHeight(this.up), tgt = gh2 + (this.flyTime > 0 ? this.cruise : 0);
      this.r += (tgt - this.r) * damp(this.flyTime > 0 ? 1.1 : 1.7, dt);
      if (this.flyTime <= 0 && this.r - gh2 < 0.2) { this.state = 'ground'; this.grounded = true; this.r = gh2; this.vy = 0; this.timer = mr(1, 3); }
      this.pos.copy(this.up).multiplyScalar(this.r);
      this.flap = Math.sin(time * 17) * 0.95;
    }
    this.peck = Math.max(0, this.peck - dt);
    this.wingL.rotation.z = -this.flap; this.wingR.rotation.z = this.flap;
    this.head.rotation.x = this.peck > 0 ? Math.sin(this.peck / 0.35 * Math.PI) * 0.9 : 0;
    this.body.rotation.x = this.state === 'fly' ? -0.15 : 0;
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
}

/** A flock: a loose V of birds wheeling high over the planet, gliding now and then. */
export class Flock {
  constructor(dir, plumage = null) {
    this.up = dir.clone(); this.fwd = tangentFrame(dir)[0]; this.alt = mr(16, 22); this.turn = mr(-0.15, 0.15); this.t = Math.random() * 10;
    this.birds = [];
    const n = 5 + Math.floor(Math.random() * 4), c = mpick(plumage ?? PLUMAGE);
    for (let i = 0; i < n; i++) {
      const b = buildBird(c); b.root.scale.setScalar(1.5); scene.add(b.root);
      const row = Math.ceil(i / 2), side = i === 0 ? 0 : (i % 2 ? 1 : -1);
      this.birds.push({ ...b, back: row * 1.3 + mr(-0.2, 0.2), side: side * row * 1.1, bob: Math.random() * 6, phase: Math.random() * 6 });
    }
  }
  dispose() { for (const b of this.birds) { scene.remove(b.root); disposeTree(b.root); } }
  update(dt) {
    this.t += dt; if (Math.random() < dt * 0.1) this.turn = mr(-0.18, 0.18);
    this.fwd.applyAxisAngle(this.up, this.turn * dt);
    this.up.copy(dirAlong(this.up, this.fwd, 5.5 * dt)); projectTangent(this.fwd, this.up).normalize();
    const side = _tv.crossVectors(this.up, this.fwd).normalize(), glide = Math.sin(this.t * 0.4) > 0.6;
    for (const b of this.birds) {
      const d = dirAlong(dirAlong(this.up, this.fwd, -b.back), side, b.side);
      const h = groundHeight(d) + this.alt + Math.sin(this.t * 1.3 + b.bob) * 0.4;
      b.root.position.copy(d).multiplyScalar(h); frameQuat(d, _tv2.copy(this.fwd), b.root.quaternion);
      const flap = glide ? 0.15 : Math.sin(this.t * 11 + b.phase) * 0.9;
      b.wingL.rotation.z = -flap; b.wingR.rotation.z = flap;
    }
  }
}
