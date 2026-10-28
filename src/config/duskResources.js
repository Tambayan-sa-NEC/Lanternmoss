/* DUSKHOLLOW'S ECONOMY (TODO 30c): its materials, lantern oil, shade crop and the Dusk set, with the recipes that
   turn one into the other. Shaped like config/coastalResources.js: the items are spread into ITEM_DEFINITIONS and the
   recipes into RECIPES, so the bag, the Craft tab, chests and the forge treat them like everything else.
   Where they are found: PLANETS duskhollow.resources (lumen veins, glowcap patches, the guarded moonstone vein).
   Spider silk is cut from the Gloomweavers' webs in 30f; until then it only arrives through chests and the shop. */
export const DUSK_ITEMS = [
  ...[
    ['lumenOre', 'Lumen Ore', 'Pale ore that keeps the caps\' light. An iron pickaxe frees it from the rock.', 'ore', 0xbfa8ff, 8, 'common'],
    ['lumenDust', 'Lumen Dust', 'Glowing dust shaken from lumen ore. Duskhollow\'s own material.', 'shard', 0xd8c8ff, 10, 'common'],
    ['lumenIngot', 'Lumen Ingot', 'Lumen ore smelted into a bar that glows from inside.', 'ingot', 0xcbb8ff, 26, 'uncommon'],
    ['spiderSilk', 'Spider Silk', 'Strong, soft silk cut from a gloomweaver\'s web. Light armour is lined with it.', 'herb', 0xe8e4f0, 12, 'common'],
    ['moonstone', 'Moonstone', 'A cold, bright stone from the guarded vein. It holds a lantern\'s light for hours.', 'gemstone', 0xdfe8ff, 65, 'rare'],
  ].map(([id, name, description, art, color, value, rarity]) => ({ id, name, description, category: 'material',
    icon: { shape: 'gem', art, color }, value, maxStack: 20, rarity })),
  { id: 'lumenOil', name: 'Lumen Oil', description: 'A flask of oil pressed from glowcaps and lumen dust. It fills a belt lantern to the brim.',
    category: 'consumable', icon: { shape: 'orb', art: 'flask', color: 0xffd98a }, maxStack: 10, value: 30, tags: ['lantern'],
    use: [{ effect: 'oil', amount: 100 }] },
  { id: 'shadeMushroom', name: 'Shade Mushroom', description: 'A fat, pale mushroom grown in the hollows. Filling, and it keeps you going.',
    category: 'consumable', tags: ['food'], icon: { shape: 'cap', art: 'mushroom', color: 0xc8bce0 }, maxStack: 10, value: 12,
    use: [{ effect: 'heal', amount: 30 }, { effect: 'energy', amount: 40 }] },
  { id: 'shadeSpores', name: 'Shade Spores', description: 'Spores that only take in deep shade. Plant them in a farm plot under the caps.',
    category: 'seed', icon: { shape: 'petal', art: 'seeds', color: 0xbfa8ff }, maxStack: 20, value: 6, props: { crop: 'shade' } },
  ...[
    ['duskHood', 'Dusk Hood', 'head', 'hood', { maxMana: 20, armor: 0.03 }],
    ['duskMantle', 'Dusk Mantle', 'armor', 'mantle', { maxHp: 34, armor: 0.08 }],
    ['duskBoots', 'Dusk Boots', 'feet', 'boots', { moveSpeed: 0.06, armor: 0.04 }],
    ['duskLantern', 'Dusk Lantern', 'charm', 'locket', { manaRegen: 1.6, hpRegen: 1.0 }],
  ].map(([id, name, slot, art, stats]) => ({ id, name, description: 'Lumen metal and spider silk, made into Dusk gear that keeps its own light.',
    category: 'equipment', props: { set: 'dusk', craftedOnly: true }, value: 110, icon: { shape: 'gem', art, color: 0xbfa8ff },
    equip: { slot, tier: 3, stats } })),
];

export const DUSK_RECIPES = [
  { id: 'lumenIngot', group: 'Smelting', station: 'forge', result: 'lumenIngot', needs: [['lumenOre', 2]], fuel: 2 },
  { id: 'lumenOil', group: 'Potions', station: 'brew', result: 'lumenOil', needs: [['glowcap', 3], ['lumenDust', 1]] },
  // Forge fees, like Tidewhisper's set: Duskhollow's own chests, veins and crops pay for one Dusk set
  // (BALANCE.budgets, docs/wiki/game-design/balance.md).
  ...['duskHood', 'duskMantle', 'duskBoots'].map((id, i) => ({ id, group: 'Armour', station: 'forge', result: id, rarity: 'rare',
    needs: [['lumenIngot', 2 + i], ['spiderSilk', 2 + i], ['lumenDust', 2]], fuel: 2, coins: [75, 85, 75][i] })),
  { id: 'duskLantern', group: 'Trinkets', station: 'forge', result: 'duskLantern', rarity: 'rare',
    needs: [['moonstone', 1], ['lumenIngot', 2], ['spiderSilk', 3]], fuel: 2, coins: 65 },
];
