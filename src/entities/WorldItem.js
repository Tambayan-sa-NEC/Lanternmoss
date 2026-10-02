/* An item lying in the world: a stack (item id + quantity) with a bobbing model, waiting to be picked up.
   Picking up is decided by src/gameplay/pickups.js; this class only holds state and draws itself. */
import { RARITIES } from '../config/items.js';
import { ctx } from '../core/context.js';
import { makeShadow, updateShadow } from '../fx/shadows.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { buildItemModel } from '../models/items.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { frameQuat, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const HOVER = 0.55;

export class WorldItem {
  /** pickupDelay: seconds before it can be collected (dropped items also wait until the hero steps away). */
  constructor(itemId, quantity, dir, { pickupDelay = 0, props = null } = {}) {
    this.def = itemRegistry.get(itemId); this.itemId = itemId; this.quantity = quantity; this.props = props;
    this.up = dir.clone().normalize(); this.fwd = tangentFrame(this.up)[0];
    this.pos = this.up.clone().multiplyScalar(groundHeight(this.up)); this.height = HOVER + 0.3;   // for emotes / distance checks
    Object.assign(this, buildItemModel(this.def)); scene.add(this.root);
    this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion);
    this.shadow = makeShadow(0.28); updateShadow(this.shadow, this.up, this.fwd, HOVER);
    this.delay = pickupDelay; this.armed = pickupDelay <= 0;   // armed = may be picked up
    this.blocked = false;                                       // the bag was full last time: wait for the hero to step off
    this.seed = Math.random() * 6.28;
    this.sparkleColor = parseInt(RARITIES[this.def.rarity].color.slice(1), 16);
  }
  update(dt) {
    const t = ctx.time + this.seed;
    this.spinner.position.y = HOVER + Math.sin(t * 2.4) * 0.08; this.spinner.rotation.y = t * 1.6;
    if (Math.random() < dt * (this.def.rarity === 'common' ? 1.5 : 4)) {
      sparkles.emit(this.spinner.getWorldPosition(this.pos.clone()), { count: 1, color: this.sparkleColor, speed: 0.4, up: this.up, upBias: 1, life: 0.7, size: 0.24 });
    }
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); }
}
