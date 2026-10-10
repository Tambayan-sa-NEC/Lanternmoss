/* What the bag window (ui/InventoryUI.js) can ask the game to do. Kept here so the UI never reaches into gameplay. */
import { STATIONS } from '../config/stations.js';
import { RECIPES } from '../config/crafting.js';
import { RUNES } from '../config/magic.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { craft, maxCraftable } from '../items/crafting.js';
import { enchantProblem } from '../items/enchanting.js';
import { audio } from '../systems/AudioSystem.js';
import { equipFromSlot, refreshStats, unequip } from './equipment.js';
import { RecipeBook } from './RecipeBook.js';
import { useItemInSlot } from './itemUse.js';
import { lootName } from './loot.js';
import { dropFromSlot } from './pickups.js';
import { Hotbar } from './hotbar.js';
import { Stations } from './Stations.js';
import { spendCoins } from './wallet.js';

const PROBLEM = { quantity: 'Choose a whole crafting quantity from 1 to 10000.', materials: 'You need more materials for that.', fuel: 'The forge needs more fuel for that: wood, charcoal or ember shards.', coins: 'Not enough coins for that.', space: 'No room in the bag for it.',
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
    known: id => RecipeBook.knows(id),
    favourites: () => RecipeBook.favourites,
    favourite: id => RecipeBook.favourite(id),
    enchant: (target, rune) => {
      if (ctx.player.dead) return { ok: false, message: "You can't do that while fainted." };
      const [where, key] = String(target).split(':'), slot = Number(key);
      const w = where === 'worn' ? ctx.player.equipment[key] : where === 'bag' && Number.isInteger(slot) ? bag.getSlot(slot) : null;
      const def = w && bag.registry.get(w.itemId);
      const problem = enchantProblem(def, w?.props, rune, bag, ctx.player.charId, Stations.here());
      if (problem) return { ok: false, message: problem };
      bag.remove(rune, 1);
      const props = { ...w.props, enchantment: rune };
      if (where === 'worn') { w.props = props; refreshStats(); bag.notify('change', { slots: [] }); }
      else bag.updateProps(slot, props);
      audio.sparkle(); Stations.celebrate('forge');
      return { ok: true, message: `Enchanted ${def.name} with ${RUNES[rune].name}.` };
    },
    craft: (recipe, batches = 1) => {
      recipe = RECIPES.find(r => r.id === recipe?.id);
      if (!recipe || !RecipeBook.knows(recipe.id)) return { ok: false, message: 'Learn that recipe first.' };
      if (ctx.player.dead) return { ok: false, message: "You can't do that while fainted." };
      const at = Stations.here();
      if (batches === 'all') {
        if (recipe.group !== 'Smelting') return { ok: false, message: 'Smelt all is for smelting recipes.' };
        batches = maxCraftable(recipe, bag, ctx.player.coins, at);
        if (!batches) return { ok: false, message: 'Nothing can be smelted: check materials, fuel, station and bag space.' };
      }
      const r = craft(recipe, bag, ctx.player.coins, n => spendCoins(n), at, batches);
      if (!r.ok) { const m = PROBLEM[r.problem]; return { ok: false, message: typeof m === 'function' ? m(recipe) : m }; }
      audio.sparkle(); if (recipe.station) Stations.celebrate(at);
      const qty = (recipe.qty ?? 1) * batches;
      emit('crafted', { itemId: recipe.result, qty, rarity: recipe.rarity ?? null, station: recipe.station ?? null });
      return { ok: true, message: `Crafted ${lootName(recipe.result, qty, recipe.rarity ? { rarity: recipe.rarity } : null)}!` };
    },
  };
}
