/* What the bag window (ui/InventoryUI.js) can ask the game to do. Kept here so the UI never reaches into gameplay. */
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { craft } from '../items/crafting.js';
import { audio } from '../systems/AudioSystem.js';
import { equipFromSlot, unequip } from './equipment.js';
import { useItemInSlot } from './itemUse.js';
import { lootName } from './loot.js';
import { dropFromSlot } from './pickups.js';
import { Hotbar } from './hotbar.js';
import { spendCoins } from './wallet.js';

const PROBLEM = { materials: 'You need more materials for that.', coins: 'Not enough coins for that.', space: 'No room in the bag for it.' };

export function bagCommands(bag) {
  return {
    use: slot => useItemInSlot(bag, slot),
    drop: slot => dropFromSlot(slot),
    unequip: where => unequip(bag, where),
    equip: (slot, where) => equipFromSlot(bag, slot, where),
    worn: () => ctx.player.equipment,
    held: () => Hotbar.selected,
    craft: recipe => {
      const r = craft(recipe, bag, ctx.player.coins, n => spendCoins(n));
      if (!r.ok) return { ok: false, message: PROBLEM[r.problem] };
      audio.sparkle(); emit('crafted', { itemId: recipe.result, qty: recipe.qty ?? 1, rarity: recipe.rarity ?? null });
      return { ok: true, message: `Crafted ${lootName(recipe.result, recipe.qty ?? 1, recipe.rarity ? { rarity: recipe.rarity } : null)}!` };
    },
  };
}
