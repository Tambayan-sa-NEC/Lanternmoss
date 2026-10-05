/* Quick-use slots (config/items.js QUICK_SLOTS): keys 6, 7 and 8 each use one consumable straight from the bag.
   A slot remembers an item id, not a stack, so it keeps working as stacks come and go (it shows 0 when you run out).
   New consumables you pick up fill an empty slot by themselves; the bag's "Quick" buttons reassign them. */
import { QUICK_SLOTS } from '../config/items.js';
import { ctx } from '../core/context.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { actionFor } from '../items/itemActions.js';
import { toast } from '../ui/toast.js';
import { useItemInSlot } from './itemUse.js';

export const Quick = {
  ids: QUICK_SLOTS.keys.map(() => null),
  cd: 0,                                          // shared cooldown after a quick use (seconds left)

  /** Can this item sit in a quick slot? (things you use up) */
  fits(itemId) { const d = itemRegistry.get(itemId); return !!d && actionFor(d) === 'use'; },
  assign(i, itemId) {
    if (!this.fits(itemId) || i < 0 || i >= this.ids.length) return false;
    const was = this.ids.indexOf(itemId); if (was >= 0) this.ids[was] = this.ids[i];   // swap if it was elsewhere
    this.ids[i] = itemId; return true;
  },
  clear(i) { this.ids[i] = null; },
  /** A consumable just landed in the bag: give it an empty slot if it has none. */
  autoAssign(itemId) {
    if (!this.fits(itemId) || this.ids.includes(itemId)) return;
    const free = this.ids.indexOf(null); if (free >= 0) this.ids[free] = itemId;
  },
  count(i) { return this.ids[i] ? ctx.player.inventory.count(this.ids[i]) : 0; },

  /** Key i pressed. Returns the use result (or null when nothing happened). */
  use(i) {
    const P = ctx.player, id = this.ids[i], key = QUICK_SLOTS.labels[i];
    if (P.dead || this.cd > 0) return null;
    if (!id) { toast(`Quick slot ${key} is empty: pick a snack in the bag and press "Quick ${key}".`); return null; }
    const slot = P.inventory.find(id), name = itemRegistry.get(id).name;
    if (slot < 0) { toast(`No ${name} left.`); return null; }
    const r = useItemInSlot(P.inventory, slot);
    toast(r.message); if (r.ok) this.cd = QUICK_SLOTS.cooldown;
    return r;
  },
  update(dt) { this.cd = Math.max(0, this.cd - dt); },
  reset() { this.ids.fill(null); this.cd = 0; },
};
