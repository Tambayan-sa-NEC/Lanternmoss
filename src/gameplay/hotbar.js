/* THE HOTBAR: the first HOTBAR.size slots of the hero's inventory (config/items.js), shown along the bottom of the
   screen. Number keys 1-9 (or a click) pick the slot the hero holds; pressing the held slot's number again (or a
   right click) uses what's held:
     food, tonics, charms   eaten / drunk (never wasted when they'd do nothing)
     weapons, armour, trinkets   equipped (whatever was worn goes into that hotbar slot instead)
     materials, keys, trophies   nothing to do in your hands: a hint says where they're used
   Placeable things (TODO 17) will be put down from here. */
import { HOTBAR } from '../config/items.js';
import { ctx } from '../core/context.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { actionFor } from '../items/itemActions.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { useItemInSlot } from './itemUse.js';

export const Hotbar = {
  selected: 0,      // the held slot (0-based)
  cd: 0,            // seconds before the next use
  changedAt: -99,   // when the held item last changed (the HUD shows its name for a moment)

  /** The held stack, or null. */
  held() { return ctx.player.inventory.getSlot(this.selected); },
  heldDef() { const s = this.held(); return s ? itemRegistry.get(s.itemId) : null; },

  /** Number key / click on slot i: hold it, or use it if it's already held. */
  select(i, { fromKey = true } = {}) {
    if (i < 0 || i >= HOTBAR.size) return null;
    if (i === this.selected && fromKey) return this.use();
    this.selected = i; this.changedAt = ctx.time; audio.blip();
    return null;
  },
  /** Uses the held item. Returns the use result, or null when nothing happened. */
  use() {
    const P = ctx.player, stack = this.held();
    if (!stack) { toast('Your hands are empty: put food or gear on the hotbar from the bag (I).'); return null; }
    if (P.dead || this.cd > 0) return null;
    const def = itemRegistry.get(stack.itemId), action = actionFor(def);
    if (action === 'use' || action === 'equip') {
      const r = useItemInSlot(P.inventory, this.selected);
      toast(r.message); if (r.ok) { this.cd = HOTBAR.useCooldown; this.changedAt = ctx.time; }
      return r;
    }
    toast(def.category === 'material' ? `${def.name} is for crafting: open the bag (I) and its Craft tab.`
      : def.tags.includes('key') ? `${def.name}: walk up to a locked Lantern chest to use it.`
      : action === 'inspect' ? def.description : `${def.name}: nothing to do with it in your hands.`);
    return null;
  },
  update(dt) { this.cd = Math.max(0, this.cd - dt); },
  reset() { this.selected = 0; this.cd = 0; this.changedAt = -99; },
};
