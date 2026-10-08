/* A treasure chest standing in the world: its model, collider and animations (falling in, opening, a rattle when
   it's locked). What's inside and who may open it is decided by src/gameplay/Chests.js. */
import * as THREE from 'three';
import { BOSS_CHEST, CHEST_KINDS } from '../config/chests.js';
import { ctx } from '../core/context.js';
import { ringFX } from '../fx/combatFx.js';
import { makeShadow, updateShadow } from '../fx/shadows.js';
import { sparkles } from '../fx/sparkles.js';
import { buildChestModel } from '../models/chest.js';
import { addCollider, removeCollider } from '../physics/colliders.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { clamp } from '../utils/math.js';
import { frameQuat } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { rng } from '../utils/random.js';

const OPEN_ANGLE = -1.95, OPEN_TIME = 0.5, GLOW_TIME = 3;
const easeOutBack = t => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const _p = new THREE.Vector3();

export class Chest {
  /** id: key in the opened set; opened: already emptied this adventure; fall: drops in from the sky (boss chest). */
  constructor(kind, dir, fwd, { id, opened = false, fall = false } = {}) {
    this.kind = kind; this.def = CHEST_KINDS[kind]; this.id = id;
    this.up = dir.clone().normalize(); this.fwd = fwd.clone();
    this.ground = groundHeight(this.up); this.pos = this.up.clone().multiplyScalar(this.ground);
    this.parts = buildChestModel({ look: this.def.look, locked: !!this.def.locked && !opened, beam: !!this.def.beam && !opened, scale: this.def.scale });
    this.root = this.parts.root; scene.add(this.root); frameQuat(this.up, this.fwd, this.root.quaternion);
    this.radius = 0.6 * this.def.scale; this.height = 0.9 * this.def.scale;
    this.collider = addCollider(this.up, this.radius);
    this.shadow = makeShadow(0.75 * this.def.scale); updateShadow(this.shadow, this.up, this.fwd, 0);
    this.opened = opened; this.openT = opened ? 99 : -1; this.rattleT = -1; this.seed = rng() * 10;
    this.fallT = fall ? 0 : -1;
    if (opened) this.parts.lid.rotation.x = OPEN_ANGLE;
    this.place(0);
  }
  /** Still dropping in (can't be opened yet). */
  get landing() { return this.fallT >= 0; }
  place(lift) { this.root.position.copy(this.up).multiplyScalar(this.ground + lift); }
  /** A world point above the chest, for the "E Open" prompt and loot. */
  top(extra = 0, out = new THREE.Vector3()) { return out.copy(this.up).multiplyScalar(this.ground + this.height + extra); }

  open() {
    this.opened = true; this.openT = 0; this.parts.inner.visible = true;
    const { lock, beam } = this.parts;
    if (lock) { lock.getWorldPosition(_p); sparkles.emit(_p, { count: 14, color: 0xffd36b, speed: 2, up: this.up, life: 0.6, size: 0.28 }); lock.visible = false; }
    if (beam) beam.visible = false;
    sparkles.emit(this.top(0.1), { count: this.kind === 'boss' ? 70 : 40, color: this.def.look.glow, speed: 3.2, up: this.up, upBias: 1.4, life: 1.1, size: 0.38 });
    audio.chestOpen(this.kind === 'boss');
  }
  /** Locked and you have no key: a shake and a clunk. */
  rattle() { this.rattleT = 0; audio.chestLocked(); }

  update(dt) {
    const { body, lid, inner, beam } = this.parts, t = ctx.time + this.seed;
    if (this.fallT >= 0) {                                               // the boss chest drops in and thumps down
      const k = clamp((this.fallT += dt) / BOSS_CHEST.fallTime, 0, 1);
      this.place(BOSS_CHEST.dropHeight * (1 - k * k));
      if (k >= 1) {
        this.fallT = -1; this.place(0); body.scale.y = this.def.scale * 0.7;
        ringFX(this.pos, 2.6, this.def.look.glow); audio.slam();
        sparkles.emit(this.top(-0.4), { count: 40, color: this.def.look.glow, speed: 3, up: this.up, upBias: 0.6, life: 0.9, size: 0.36 });
      }
    }
    body.scale.y += (this.def.scale - body.scale.y) * Math.min(1, dt * 10);   // recover from a squash
    if (this.openT >= 0 && this.openT < GLOW_TIME) {
      this.openT += dt;
      lid.rotation.x = OPEN_ANGLE * easeOutBack(clamp(this.openT / OPEN_TIME, 0, 1));
      if (this.openT < 0.12) body.scale.y = this.def.scale * (1 - this.openT * 1.2);       // a little squash as it pops
      inner.scale.setScalar(1 + Math.sin(this.openT * 9) * 0.06);
      if (this.openT >= GLOW_TIME) inner.visible = false;
    }
    let wobble = 0;
    if (this.rattleT >= 0) { this.rattleT += dt; wobble = Math.sin(this.rattleT * 40) * 0.09 * (1 - this.rattleT / 0.45); if (this.rattleT > 0.45) this.rattleT = -1; }
    else if (!this.opened && this.kind !== 'common' && t % 5 < 0.5) wobble = Math.sin(t * 30) * 0.03;   // something rustles inside...
    body.rotation.z = wobble;
    if (!this.opened && rng() < dt * (this.kind === 'common' ? 0.8 : 2.5)) {
      sparkles.emit(this.top(-0.2), { count: 1, color: this.def.look.glow, speed: 0.5, up: this.up, upBias: 1, life: 0.9, size: 0.26 });
    }
    if (beam?.visible) { beam.material.opacity = 0.13 + Math.sin(t * 3) * 0.04; beam.rotation.y = t * 0.6; }
  }

  dispose() {
    scene.remove(this.root, this.shadow); removeCollider(this.collider);
    this.parts.beam?.material.dispose(); disposeTree(this.root);
  }
}
