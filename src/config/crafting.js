/* ---------------------------------------------------------------------
   CRAFTING: turning materials into food, tonics, keys and gear (the Craft tab in the bag; runtime src/items/crafting.js).
     result   item id made (one, or `qty`)
     needs    [[item id, count], ...] taken from the bag
     coins    optional price on top (paid to nobody in particular: the moss keeps it)
     rarity   gear only: the rarity it comes out at (crafted gear is dependable rather than lucky)
   Weapons only show up for the hero who can wield them.
   --------------------------------------------------------------------- */

export const RECIPES = [
  // ---- food and tonics
  { id: 'glowTonic', result: 'glowTonic', needs: [['glowcap', 3]] },
  { id: 'moonberryTart', result: 'moonberryTart', needs: [['moonberry', 4], ['glowcap', 1]] },
  { id: 'emberStew', result: 'emberStew', needs: [['emberShard', 2], ['moonberry', 3]] },
  { id: 'frostDraught', result: 'frostDraught', needs: [['frostPetal', 2], ['glowcap', 2]] },
  { id: 'lanternKey', result: 'lanternKey', needs: [['glowcap', 4], ['emberShard', 2]], coins: 15 },
  // ---- weapons
  { id: 'glowStaff', result: 'glowStaff', needs: [['glowcap', 6], ['moonberry', 2]], coins: 20, rarity: 'uncommon' },
  { id: 'mossAxe', result: 'mossAxe', needs: [['glowcap', 6], ['moonberry', 2]], coins: 20, rarity: 'uncommon' },
  { id: 'thornBow', result: 'thornBow', needs: [['glowcap', 6], ['moonberry', 2]], coins: 20, rarity: 'uncommon' },
  { id: 'starStaff', result: 'starStaff', needs: [['emberShard', 6], ['frostPetal', 3]], coins: 60, rarity: 'rare' },
  { id: 'emberAxe', result: 'emberAxe', needs: [['emberShard', 8]], coins: 60, rarity: 'rare' },
  { id: 'frostBow', result: 'frostBow', needs: [['frostPetal', 6], ['emberShard', 3]], coins: 60, rarity: 'rare' },
  // ---- armour and trinkets
  { id: 'mossCloak', result: 'mossCloak', needs: [['glowcap', 5], ['moonberry', 3]], coins: 10, rarity: 'uncommon' },
  { id: 'lanternPendant', result: 'lanternPendant', needs: [['glowcap', 4], ['emberShard', 2]], coins: 15, rarity: 'uncommon' },
  { id: 'emberMail', result: 'emberMail', needs: [['emberShard', 8], ['glowcap', 2]], coins: 40, rarity: 'uncommon' },
  { id: 'emberRing', result: 'emberRing', needs: [['emberShard', 5]], coins: 30, rarity: 'uncommon' },
  { id: 'frostMantle', result: 'frostMantle', needs: [['frostPetal', 8], ['emberShard', 2]], coins: 60, rarity: 'rare' },
  { id: 'frostLocket', result: 'frostLocket', needs: [['frostPetal', 5]], coins: 40, rarity: 'rare' },
];
