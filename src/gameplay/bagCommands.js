/* What the bag window (ui/InventoryUI.js) can ask the game to do. Kept here so the UI never reaches into gameplay. */
import { ctx } from '../core/context.js';
import { craft } from '../items/crafting.js';
import { audio } from '../systems/AudioSystem.js';
import { unequip } from './equipment.js';
import { useItemInSlot } from './itemUse.js';
import { lootName } from './loot.js';
import { dropFromSlot } from './pickups.js';
import { Pets } from './Pets.js';
import { Quick } from './quickSlots.js';
import { spendCoins } from './wallet.js';

const PROBLEM = { materials: 'You need more materials for that.', coins: 'Not enough coins for that.', space: 'No room in the bag for it.' };

export function bagCommands(bag) {
  return {
    use: slot => useItemInSlot(bag, slot),
    drop: slot => dropFromSlot(slot),
    unequip: where => unequip(bag, where),
    worn: () => ctx.player.equipment,
    quick: (i, itemId) => Quick.assign(i, itemId),
    quickIds: () => Quick.ids,
    pets: () => ({ active: Pets.id, mode: Pets.mode, level: Pets.level, unlocked: Pets.unlocked, nameOf: id => Pets.nameOf(id),
      hp: id => (id === Pets.id ? Pets.hp ?? Pets.maxHp(id) : Pets.maxHp(id)), maxHp: id => Pets.maxHp(id), fainted: Pets.fainted }),
    choosePet: id => Pets.choose(id),
    renamePet: (id, name) => Pets.rename(id, name),
    petCommand: mode => Pets.command(mode),
    craft: recipe => {
      const r = craft(recipe, bag, ctx.player.coins, n => spendCoins(n));
      if (!r.ok) return { ok: false, message: PROBLEM[r.problem] };
      audio.sparkle();
      return { ok: true, message: `Crafted ${lootName(recipe.result, recipe.qty ?? 1, recipe.rarity ? { rarity: recipe.rarity } : null)}!` };
    },
  };
}
