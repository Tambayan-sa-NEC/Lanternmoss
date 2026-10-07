/* ---------------------------------------------------------------------
   CRAFTING: turning materials into tools, food, potions, keys and gear (the Craft tab in the bag; runtime
   src/items/crafting.js).
     result   item id made (one, or `qty`)
     needs    [[item id, count], ...] taken from the bag
     coins    optional price on top (paid to nobody in particular: the moss keeps it)
     rarity   gear only: the rarity it comes out at (crafted gear is dependable rather than lucky)
     group    the heading it's listed under in the Craft tab (keep each group's recipes together)
     station  optional: made only standing at this station (config/stations.js); none = by hand, anywhere
   Weapons only show up for the hero who can wield them.
   --------------------------------------------------------------------- */

export const RECIPES = [
  // ---- tools: wood and stone from fallen branches and loose stones; the first tools are made by hand, anywhere
  { id: 'woodAxe', group: 'Tools', result: 'woodAxe', needs: [['wood', 3], ['stone', 2]] },
  { id: 'stonePick', group: 'Tools', result: 'stonePick', needs: [['wood', 2], ['stone', 3]] },
  { id: 'fishingRod', group: 'Tools', result: 'fishingRod', needs: [['wood', 4], ['sweetleaf', 2]] },
  { id: 'hoe', group: 'Tools', result: 'hoe', needs: [['wood', 3], ['stone', 1]] },
  { id: 'wateringCan', group: 'Tools', station: 'forge', result: 'wateringCan', needs: [['copperOre', 3], ['wood', 1]] },
  { id: 'copperPick', group: 'Tools', station: 'forge', result: 'copperPick', needs: [['copperOre', 5], ['wood', 2]], coins: 10 },
  // ---- food: fill your energy, and the meals give a buff
  { id: 'grilledPerch', group: 'Food', station: 'pot', result: 'grilledFish', needs: [['pondPerch', 1], ['wood', 1]] },
  { id: 'grilledEel', group: 'Food', station: 'pot', result: 'grilledFish', needs: [['cinderEel', 1], ['wood', 1]] },
  { id: 'grilledTrout', group: 'Food', station: 'pot', result: 'grilledFish', needs: [['iceTrout', 1], ['wood', 1]] },
  { id: 'sunBread', group: 'Food', station: 'pot', result: 'sunBread', needs: [['sunWheat', 3]] },
  { id: 'veggieStew', group: 'Food', station: 'pot', result: 'veggieStew', needs: [['moonCarrot', 2], ['sweetleaf', 1]] },
  { id: 'moonberryTart', group: 'Food', result: 'moonberryTart', needs: [['moonberry', 4], ['glowcap', 1]] },
  { id: 'pumpkinPie', group: 'Food', station: 'pot', result: 'pumpkinPie', needs: [['pumpkin', 1], ['sunWheat', 2], ['moonberry', 2]] },
  { id: 'emberStew', group: 'Food', station: 'pot', result: 'emberStew', needs: [['emberShard', 2], ['moonberry', 3]] },
  { id: 'pepperSkewer', group: 'Food', station: 'pot', result: 'pepperSkewer', needs: [['firePepper', 2], ['cinderEel', 1], ['wood', 1]] },
  { id: 'plumPorridge', group: 'Food', station: 'pot', result: 'plumPorridge', needs: [['snowPlum', 2], ['sunWheat', 1]] },
  { id: 'koiFeast', group: 'Food', station: 'pot', result: 'koiFeast', needs: [['goldenKoi', 1], ['sweetleaf', 2]] },
  // ---- potions and tonics
  { id: 'healingPotion', group: 'Potions', station: 'brew', result: 'healingPotion', needs: [['sweetleaf', 2], ['moonberry', 1]] },
  { id: 'glowTonic', group: 'Potions', result: 'glowTonic', needs: [['glowcap', 3]] },
  { id: 'starwater', group: 'Potions', station: 'brew', result: 'starwater', needs: [['glowcap', 2], ['sweetleaf', 1]] },
  { id: 'quickstepTonic', group: 'Potions', station: 'brew', result: 'quickstepTonic', needs: [['sweetleaf', 3], ['moonberry', 2]] },
  { id: 'stoneskinTonic', group: 'Potions', station: 'brew', result: 'stoneskinTonic', needs: [['stone', 2], ['sweetleaf', 2], ['ironOre', 1]] },
  { id: 'frostDraught', group: 'Potions', station: 'brew', result: 'frostDraught', needs: [['frostPetal', 2], ['glowcap', 2]] },
  // ---- weapons
  { id: 'glowStaff', group: 'Weapons', station: 'workbench', result: 'glowStaff', needs: [['glowcap', 6], ['moonberry', 2]], coins: 20, rarity: 'uncommon' },
  { id: 'mossAxe', group: 'Weapons', station: 'workbench', result: 'mossAxe', needs: [['glowcap', 6], ['moonberry', 2]], coins: 20, rarity: 'uncommon' },
  { id: 'thornBow', group: 'Weapons', station: 'workbench', result: 'thornBow', needs: [['glowcap', 6], ['moonberry', 2]], coins: 20, rarity: 'uncommon' },
  { id: 'starStaff', group: 'Weapons', station: 'forge', result: 'starStaff', needs: [['emberShard', 6], ['frostPetal', 3]], coins: 60, rarity: 'rare' },
  { id: 'emberAxe', group: 'Weapons', station: 'forge', result: 'emberAxe', needs: [['emberShard', 8]], coins: 60, rarity: 'rare' },
  { id: 'frostBow', group: 'Weapons', station: 'forge', result: 'frostBow', needs: [['frostPetal', 6], ['emberShard', 3]], coins: 60, rarity: 'rare' },
  // ---- armour: head, body, feet
  { id: 'mossHood', group: 'Armour', station: 'workbench', result: 'mossHood', needs: [['sweetleaf', 4], ['glowcap', 2]], coins: 5, rarity: 'uncommon' },
  { id: 'mossCloak', group: 'Armour', station: 'workbench', result: 'mossCloak', needs: [['glowcap', 5], ['moonberry', 3]], coins: 10, rarity: 'uncommon' },
  { id: 'wanderBoots', group: 'Armour', station: 'workbench', result: 'wanderBoots', needs: [['sweetleaf', 3], ['wood', 2]], coins: 5, rarity: 'uncommon' },
  { id: 'emberHelm', group: 'Armour', station: 'forge', result: 'emberHelm', needs: [['ironOre', 4], ['emberShard', 2]], coins: 30, rarity: 'uncommon' },
  { id: 'emberMail', group: 'Armour', station: 'forge', result: 'emberMail', needs: [['emberShard', 8], ['glowcap', 2]], coins: 40, rarity: 'uncommon' },
  { id: 'emberBoots', group: 'Armour', station: 'forge', result: 'emberBoots', needs: [['ironOre', 3], ['emberShard', 2]], coins: 30, rarity: 'uncommon' },
  { id: 'frostCirclet', group: 'Armour', station: 'forge', result: 'frostCirclet', needs: [['frostPetal', 4], ['frostDiamond', 1]], coins: 50, rarity: 'rare' },
  { id: 'frostMantle', group: 'Armour', station: 'forge', result: 'frostMantle', needs: [['frostPetal', 8], ['emberShard', 2]], coins: 60, rarity: 'rare' },
  { id: 'snowstepBoots', group: 'Armour', station: 'forge', result: 'snowstepBoots', needs: [['frostPetal', 4], ['ironOre', 2]], coins: 50, rarity: 'rare' },
  // ---- trinkets (two can be worn)
  { id: 'lanternPendant', group: 'Trinkets', station: 'forge', result: 'lanternPendant', needs: [['glowcap', 4], ['emberShard', 2]], coins: 15, rarity: 'uncommon' },
  { id: 'amethystBand', group: 'Trinkets', station: 'forge', result: 'amethystBand', needs: [['amethyst', 1], ['copperOre', 2]], coins: 20, rarity: 'rare' },
  { id: 'emberRing', group: 'Trinkets', station: 'forge', result: 'emberRing', needs: [['emberShard', 5]], coins: 30, rarity: 'uncommon' },
  { id: 'opalBrooch', group: 'Trinkets', station: 'forge', result: 'opalBrooch', needs: [['fireOpal', 1], ['ironOre', 2]], coins: 30, rarity: 'rare' },
  { id: 'frostLocket', group: 'Trinkets', station: 'forge', result: 'frostLocket', needs: [['frostPetal', 5]], coins: 40, rarity: 'rare' },
  { id: 'diamondCharm', group: 'Trinkets', station: 'forge', result: 'diamondCharm', needs: [['frostDiamond', 1], ['ironOre', 2]], coins: 40, rarity: 'rare' },
  // ---- vanity: only the look
  { id: 'flowerCrown', group: 'Vanity', result: 'flowerCrown', needs: [['sweetleaf', 3], ['moonberry', 2]] },
  { id: 'leafCape', group: 'Vanity', result: 'leafCape', needs: [['sweetleaf', 6], ['wood', 2]] },
  // ---- other
  { id: 'lanternKey', group: 'Other', result: 'lanternKey', needs: [['glowcap', 4], ['emberShard', 2]], coins: 15 },
];
