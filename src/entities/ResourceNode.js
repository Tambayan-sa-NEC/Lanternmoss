/* Something growing or lying around that can be gathered (config/resources.js NODE_KINDS): a bush, a herb, fallen
   branches, an ore vein. Holds its own state and draws itself; what working it does is src/gameplay/Gathering.js.
   Once worked it regrows: its fruit (berries, caps, crystals) disappears for a while, or the whole thing does. */
import { NODE_KINDS } from '../config/resources.js';
import { densityFor } from '../config/settings.js';
import { settings } from '../core/settings.js';
import { ctx } from '../core/context.js';
import { sparkles } from '../fx/sparkles.js';
import { buildNode } from '../models/resources.js';
import { addCollider, removeCollider } from '../physics/colliders.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { frameQuat, tangentFrame } from '../utils/sphere.js';
import { groundHeight, dryGround } from '../world/terrain.js';
import { washCycle, lowTide } from '../config/coastalResources.js';
import { DAY } from '../config/day.js';
import { dayClock } from '../gameplay/dayClock.js';

export class ResourceNode {
  constructor(kind, dir, seed = 1) {
    this.kind = kind; this.def = NODE_KINDS[kind];
    this.up = dir.clone().normalize();
    const [t1, t2] = tangentFrame(this.up), a = seed * 2.39996;
    this.fwd = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
    this.pos = this.up.clone().multiplyScalar(groundHeight(this.up) - 0.04); this.height = 1;
    Object.assign(this, buildNode(this.def, seed)); scene.add(this.root);
    this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion);
    this.regrowT = 0; this.shake = 0; this.claimedCycle = -1;
    const look = this.def.look;
    this.collider = look === 'vein' ? addCollider(this.up, 0.85, null, 0.8) : look === 'bush' ? addCollider(this.up, 0.5) : null;
  }
  get clock() { return (dayClock.day-1)*DAY.length+dayClock.t; }
  get ready() { return (this.def.washup || this.regrowT <= 0) && (!this.def.coastal || dryGround(this.up) &&
    (!this.def.lowTide || lowTide(this.clock)) && (!this.def.washup || washCycle(this.clock)>this.claimedCycle)); }
  syncCoastal() {
    if(!this.def.coastal)return;
    if(this.def.vanish)this.root.visible=this.ready;
    else this.fruit.visible=this.ready;
  }
  /** A blow or a tug: it wobbles. */
  hit() { this.shake = 1; }
  /** Worked: gone (or bare) until it regrows. */
  deplete() {
    if(this.def.washup)this.claimedCycle=washCycle(this.clock);
    this.regrowT = this.def.regrow; this.shake = 0;
    if (this.def.vanish) { this.root.visible = false; if (this.collider) this.collider.active = false; } else this.fruit.visible = false;
  }
  /** A point over it (prompts, sparkles). */
  top(h = 0.6) { return this.pos.clone().addScaledVector(this.up, h); }
  applyDensity() {
    // Render gates preserve root/fruit visibility owned by depletion and save restoration.
    const distance = ctx.player ? this.pos.distanceTo(ctx.player.pos) : 0;
    const visible = distance <= 18 + 42 * densityFor('resource', settings);
    this.body.visible = visible;
    for (const child of this.fruit.children) child.visible = visible;
  }
  update(dt) {
    this.applyDensity();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 4); const s = Math.sin(this.shake * 30) * this.shake;
      this.root.scale.set(1 + s * 0.06, 1 - s * 0.08, 1 + s * 0.06);
    }
    if (this.regrowT > 0 && (this.regrowT -= dt) <= 0) {
      this.root.visible = this.fruit.visible = true; if (this.collider) this.collider.active = true;
      sparkles.emit(this.top(0.5), { count: 10, color: this.def.color ?? 0xffffff, speed: 1.2, up: this.up, upBias: 0.9, life: 0.7, size: 0.28 });
    }
    this.syncCoastal();
  }
  dispose() { scene.remove(this.root); disposeTree(this.root); if (this.collider) removeCollider(this.collider); }
}
