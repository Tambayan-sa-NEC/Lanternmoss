/* What the bag window (ui/InventoryUI.js) can ask the game to do. Kept here so the UI never reaches into gameplay. */
import { STATIONS } from '../config/stations.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { craft } from '../items/crafting.js';
import { audio } from '../systems/AudioSystem.js';
import { equipFromSlot, unequip } from './equipment.js';
import { useItemInSlot } from './itemUse.js';
import { lootName } from './loot.js';
import { dropFromSlot } from './pickups.js';
import { Hotbar } from './hotbar.js';
import { Stations } from './Stations.js';
import { spendCoins } from './wallet.js';

const PROBLEM = { materials: 'You need more materials for that.', fuel: 'The forge needs more fuel for that: wood, charcoal or ember shards.', coins: 'Not enough coins for that.', space: 'No room in the bag for it.',
  station: r => `That's made at the ${STATIONS[r.station].name}: stand at one (the village's crafting corner) and try again.` };

export function bagCommands(bag) {
  return {
    use: slot => useItemInSlot(bag, slot),
    drop: slot => dropFromSlot(slot),
    unequip: where => unequip(bag, where),
    equip: (slot, where) => equipFromSlot(bag, slot, where),
    worn: () => ctx.player.equipment,
    held: () => Hotbar.selected,
    station: () => Stations.here(),
    craft: recipe => {
      const at = Stations.here(), r = craft(recipe, bag, ctx.player.coins, n => spendCoins(n), at);
      if (!r.ok) { const m = PROBLEM[r.problem]; return { ok: false, message: typeof m === 'function' ? m(recipe) : m }; }
      audio.sparkle(); if (recipe.station) Stations.celebrate(at);
      emit('crafted', { itemId: recipe.result, qty: recipe.qty ?? 1, rarity: recipe.rarity ?? null, station: recipe.station ?? null });
      return { ok: true, message: `Crafted ${lootName(recipe.result, recipe.qty ?? 1, recipe.rarity ? { rarity: recipe.rarity } : null)}!` };
    },
  };
}
