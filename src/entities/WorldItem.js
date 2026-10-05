/* An item lying in the world: a stack (item id + quantity) with a bobbing model, waiting to be picked up.
   Picking up is decided by src/gameplay/pickups.js; this class only holds state and draws itself. */
import * as THREE from 'three';
import { RARITIES } from '../config/items.js';
import { ctx } from '../core/context.js';
import { makeShadow, updateShadow } from '../fx/shadows.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { buildItemModel } from '../models/items.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { frameQuat, slerpDir, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const HOVER = 0.55, POP_HEIGHT = 1.8;
const _d = new THREE.Vector3();

export class WorldItem {
  /** pickupDelay: seconds before it can be collected; stepAway: and only once the hero has stepped off it (dropped items).
      from + popTime: hops out of a chest (from that surface direction) over popTime seconds. */
  constructor(itemId, quantity, dir, { pickupDelay = 0, props = null, stepAway = true, from = null, popTime = 0 } = {}) {
    this.def = itemRegistry.get(itemId); this.itemId = itemId; this.quantity = quantity; this.props = props;
    this.up = dir.clone().normalize(); this.fwd = tangentFrame(this.up)[0];
    this.pos = this.up.clone().multiplyScalar(groundHeight(this.up)); this.height = HOVER + 0.3;   // for emotes / distance checks
    Object.assign(this, buildItemModel(this.def)); scene.add(this.root);
    this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion);
    this.shadow = makeShadow(0.28); updateShadow(this.shadow, this.up, this.fwd, HOVER);
    this.delay = Math.max(pickupDelay, popTime); this.armed = this.delay <= 0;   // armed = may be picked up
    this.stepAway = stepAway;
    this.from = from?.clone().normalize() ?? null; this.popTime = popTime; this.popT = 0;
    if (this.from) this.hop(0);
    this.blocked = false;                                       // the bag was full last time: wait for the hero to step off
    this.seed = Math.random() * 6.28;
    this.sparkleColor = parseInt(RARITIES[this.def.rarity].color.slice(1), 16);
  }
  /** Partway (k in 0..1) through the hop out of a chest: along the ground from `from`, up and over. */
  hop(k) {
    slerpDir(this.from, this.up, k, _d).normalize();
    this.root.position.copy(_d).multiplyScalar(groundHeight(_d) + POP_HEIGHT * 4 * k * (1 - k));
    frameQuat(_d, this.fwd, this.root.quaternion);
  }
  update(dt) {
    const t = ctx.time + this.seed;
    if (this.from) {
      const k = Math.min(1, (this.popT += dt) / this.popTime); this.hop(k);
      if (k >= 1) { this.from = null; this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion); }
    }
    this.spinner.position.y = HOVER + Math.sin(t * 2.4) * 0.08; this.spinner.rotation.y = t * 1.6;
    if (Math.random() < dt * (this.def.rarity === 'common' ? 1.5 : 4)) {
      sparkles.emit(this.spinner.getWorldPosition(this.pos.clone()), { count: 1, color: this.sparkleColor, speed: 0.4, up: this.up, upBias: 1, life: 0.7, size: 0.24 });
    }
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); }
}
