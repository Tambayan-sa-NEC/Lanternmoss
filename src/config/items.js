/* ---------------------------------------------------------------------
   ITEMS + INVENTORY: what every item is (static definitions) and how the bag behaves.
   Runtime state (which slot holds what, how many) lives in src/inventory/Inventory.js.

   Item definition fields (registry fills the defaults: src/items/ItemRegistry.js):
     id           unique key (never shown); everything refers to items by id
     name, description
     category     one of ITEM_CATEGORIES; decides the default action (src/items/itemActions.js)
     icon         { shape, color, art } drawn procedurally: `art` = the item's own picture (ITEM_ART_KINDS: SVG icon in
                  src/ui/itemArt.js, world model in src/models/items.js), `shape` = the plain fallback (ITEM_ICON_SHAPES);
                  or { src } for an image file
     stackable    default: true, except equipment / weapon / quest items
     maxStack     default: INVENTORY.defaultStackSize (1 when not stackable)
     rarity       one of RARITIES (default 'common')
     value        price in treats-equivalent coins, for shops later (default 0)
     use          list of effects applied when used: { effect: key of ITEM_EFFECTS, ...params }
     droppable    default: true, except quest items
     tags         free labels for grouping / filtering (e.g. 'treat' counts toward the Treats chip)
     props        optional item-specific static data
     equip        gear only (categories weapon / equipment): { slot (EQUIP_SLOTS), hero (only this hero can use it),
                  tier (1-3: which planet it belongs to, for drops), stats (bonuses at Common rarity: STATS) }.
                  A piece's rarity is rolled when it drops (stack props.rarity) and multiplies its stats.
   --------------------------------------------------------------------- */

export const ITEM_CATEGORIES = {
  consumable: 'Consumable',
  material: 'Material',
  equipment: 'Equipment',
  weapon: 'Weapon',
  quest: 'Quest item',
  misc: 'Miscellaneous',
};

/** statMult: how much stronger gear of this rarity is than its Common stats. */
export const RARITIES = {
  common: { label: 'Common', color: '#7a6a80', statMult: 1 },
  uncommon: { label: 'Uncommon', color: '#3f9a5a', statMult: 1.3 },
  rare: { label: 'Rare', color: '#3f74c8', statMult: 1.7 },
  legendary: { label: 'Legendary', color: '#d8820a', statMult: 2.3 },
};

/** Where gear goes on the hero (src/gameplay/equipment.js). */
export const EQUIP_SLOTS = { weapon: 'Weapon', armor: 'Armour', charm: 'Trinket' };

/** Stats gear can raise: how to show them, whether they're shares (shown as %), and the most gear may add in total. */
export const STATS = {
  damage:    { label: 'damage', pct: true, cap: 0.6 },
  maxHp:     { label: 'max HP' },
  maxMana:   { label: 'max {res}' },
  hpRegen:   { label: 'HP regen /s', dec: 1 },
  manaRegen: { label: '{res} regen /s', dec: 1 },
  armor:     { label: 'armour', pct: true, cap: 0.5 },
  moveSpeed: { label: 'move speed', pct: true, cap: 0.25 },
};

/** The hotbar (src/gameplay/hotbar.js): the first `size` slots of the hero's inventory, on the number keys
    (HOTBAR_KEYS, config/controls.js). New food, tonics and gear land here first; everything else goes in the bag. */
export const HOTBAR = { size: 9, useCooldown: 0.8, holdCategories: ['consumable', 'weapon', 'equipment'] };

/** Effects a usable item can apply ({param} placeholders are filled from the effect entry for tooltips). */
export const ITEM_EFFECTS = {
  heal: 'Restores {amount} HP',
  mana: 'Restores {amount} mana / stamina',
  buff: '{buffName} for {seconds}s',
};

/** Procedural icon / world-model shapes (CSS in styles/main.css, meshes in src/models/items.js). */
export const ITEM_ICON_SHAPES = ['orb', 'bun', 'cap', 'gem', 'petal', 'charm', 'crown', 'key'];
/** Per-item pictures (an icon.art value): each has an SVG icon (src/ui/itemArt.js) and a world model (src/models/items.js). */
export const ITEM_ART_KINDS = ['bun', 'tart', 'berry', 'bottle', 'bowl', 'flask', 'moonCharm', 'leafCharm', 'mushroom', 'shard', 'petal',
  'staff', 'axe', 'bow', 'cloak', 'mail', 'mantle', 'pendant', 'ring', 'locket', 'key', 'crown'];

export const INVENTORY = {
  slots: 24, columns: 6,          // bag size and grid width
  defaultStackSize: 20,
  pickupRadius: 1.3,               // walk this close to a world item to pick it up
  dropDistance: 1.4,               // dropped items land this far in front of the hero
  dropPickupDelay: 1.2,            // seconds before a dropped item can be picked up again (and you must step away first)
  fullNoticeCooldown: 2,           // seconds between "bag is full" messages
};

export const ITEM_DEFINITIONS = [
  // ---- consumables ----
  { id: 'honeyBun', name: 'Honey-moss Bun', description: "Pim's warm, sticky bun. A favourite treat.", category: 'consumable',
    icon: { shape: 'bun', color: 0xe8a858, art: 'bun' }, maxStack: 10, value: 8, use: [{ effect: 'heal', amount: 35 }], tags: ['treat'] },
  { id: 'moonberryTart', name: 'Moonberry Tart', description: 'The crows gave it four stars. Restores your magic, or your second wind.', category: 'consumable',
    icon: { shape: 'bun', color: 0xb48cff, art: 'tart' }, maxStack: 10, rarity: 'uncommon', value: 14, use: [{ effect: 'mana', amount: 50 }, { effect: 'heal', amount: 15 }], tags: ['treat'] },
  { id: 'moonberry', name: 'Moonberry', description: 'A glowing purple berry that grows in the wilds. A small snack.', category: 'consumable',
    icon: { shape: 'orb', color: 0xc7a8ff, art: 'berry' }, value: 2, use: [{ effect: 'heal', amount: 12 }] },
  { id: 'glowTonic', name: 'Glowcap Tonic', description: 'Glowcaps steeped until the bottle hums. Refills your magic, or your second wind.', category: 'consumable',
    icon: { shape: 'orb', color: 0x7fe8ff, art: 'bottle' }, maxStack: 10, rarity: 'uncommon', value: 12, use: [{ effect: 'mana', amount: 45 }] },
  { id: 'emberStew', name: 'Ember Stew', description: 'Moonberries simmered over an ember shard. Hearty, and a little spicy.', category: 'consumable',
    icon: { shape: 'bun', color: 0xe86a3a, art: 'bowl' }, maxStack: 10, rarity: 'uncommon', value: 16, use: [{ effect: 'heal', amount: 65 }] },
  { id: 'frostDraught', name: 'Frost-petal Draught', description: 'Cold, clear and sparkling. Mends wounds and wakes the mind.', category: 'consumable',
    icon: { shape: 'orb', color: 0xbff4ff, art: 'flask' }, maxStack: 10, rarity: 'rare', value: 22, use: [{ effect: 'heal', amount: 45 }, { effect: 'mana', amount: 45 }] },
  { id: 'moonHopCharm', name: 'Moon-Hop Charm', description: "One of Old Bramble's charms. Jumps feel floaty for a while.", category: 'consumable',
    icon: { shape: 'charm', color: 0xd6ccff, art: 'moonCharm' }, maxStack: 5, rarity: 'rare', value: 30, use: [{ effect: 'buff', kind: 'moon', seconds: 30 }] },
  { id: 'featherCharm', name: 'Feather-Step Charm', description: "Fern's sprite magic, folded into a leaf. Run like the wind for a while.", category: 'consumable',
    icon: { shape: 'charm', color: 0xb8ffe0, art: 'leafCharm' }, maxStack: 5, rarity: 'rare', value: 30, use: [{ effect: 'buff', kind: 'feather', seconds: 30 }] },
  // ---- materials (crafting: config/crafting.js) ----
  { id: 'glowcap', name: 'Glowcap', description: 'A softly glowing mushroom cap from Lanternmoss. Crafts tonics and Lanternmoss gear.', category: 'material',
    icon: { shape: 'cap', color: 0x9ff0ff, art: 'mushroom' }, maxStack: 30, value: 3 },
  { id: 'emberShard', name: 'Ember Shard', description: 'Still warm. Found on the slopes of Emberfall. Crafts stews and Emberfall gear.', category: 'material',
    icon: { shape: 'gem', color: 0xff8a4a, art: 'shard' }, maxStack: 30, rarity: 'uncommon', value: 6 },
  { id: 'frostPetal', name: 'Frost Petal', description: 'A flower petal that never melts, from Frostveil. Crafts draughts and Frostveil gear.', category: 'material',
    icon: { shape: 'petal', color: 0xbff4ff, art: 'petal' }, maxStack: 30, rarity: 'uncommon', value: 6 },
  // ---- weapons: one hero each (equip.hero); stats grow with the piece's rarity (RARITIES[].statMult) ----
  { id: 'glowStaff', name: 'Glowcap Staff', description: 'A crooked staff with a glowcap lantern at the tip. Spells come out a little brighter.', category: 'weapon',
    icon: { shape: 'gem', color: 0x9ff0ff, art: 'staff' }, value: 30, equip: { slot: 'weapon', hero: 'witch', tier: 1, stats: { damage: 0.08, maxMana: 10 } } },
  { id: 'starStaff', name: 'Starfall Staff', description: 'Carved from a fallen star\'s branch. It hums before every spell.', category: 'weapon',
    icon: { shape: 'gem', color: 0xffd36b, art: 'staff' }, value: 70, equip: { slot: 'weapon', hero: 'witch', tier: 2, stats: { damage: 0.15, manaRegen: 2 } } },
  { id: 'mossAxe', name: 'Mossbark Axe', description: 'A woodcutter\'s axe wrapped in living moss. Sturdy and kind to its wielder.', category: 'weapon',
    icon: { shape: 'gem', color: 0x8fd07a, art: 'axe' }, value: 30, equip: { slot: 'weapon', hero: 'knight', tier: 1, stats: { damage: 0.08, maxHp: 12 } } },
  { id: 'emberAxe', name: 'Ember Greataxe', description: 'Forged in Emberfall. The edge never quite stops glowing.', category: 'weapon',
    icon: { shape: 'gem', color: 0xff8a4a, art: 'axe' }, value: 70, equip: { slot: 'weapon', hero: 'knight', tier: 2, stats: { damage: 0.15, armor: 0.03 } } },
  { id: 'thornBow', name: 'Thornwood Bow', description: 'Strung with spider silk. Light enough to shoot on the run.', category: 'weapon',
    icon: { shape: 'gem', color: 0x8fd07a, art: 'bow' }, value: 30, equip: { slot: 'weapon', hero: 'ranger', tier: 1, stats: { damage: 0.08, moveSpeed: 0.03 } } },
  { id: 'frostBow', name: 'Frostwind Bow', description: 'Ice-blue and whisper-quiet. Arrows leave a trail of snowflakes.', category: 'weapon',
    icon: { shape: 'gem', color: 0x8fd8ff, art: 'bow' }, value: 70, equip: { slot: 'weapon', hero: 'ranger', tier: 2, stats: { damage: 0.15, manaRegen: 2 } } },
  // ---- armour (any hero) ----
  { id: 'mossCloak', name: 'Moss Cloak', description: 'Soft, green and surprisingly tough. Smells of rain.', category: 'equipment',
    icon: { shape: 'gem', color: 0x6fbf6a, art: 'cloak' }, value: 25, equip: { slot: 'armor', tier: 1, stats: { maxHp: 12, armor: 0.03 } } },
  { id: 'emberMail', name: 'Ember Mail', description: 'Little scales of cooled ember, warm to wear.', category: 'equipment',
    icon: { shape: 'gem', color: 0xd86a3a, art: 'mail' }, value: 55, equip: { slot: 'armor', tier: 2, stats: { maxHp: 20, armor: 0.06 } } },
  { id: 'frostMantle', name: 'Frost Mantle', description: 'Woven from frost petals. Wounds close a little faster under it.', category: 'equipment',
    icon: { shape: 'gem', color: 0x9fd8ff, art: 'mantle' }, value: 80, equip: { slot: 'armor', tier: 3, stats: { maxHp: 28, armor: 0.05, hpRegen: 1 } } },
  // ---- trinkets (any hero; the charm slot, not to be confused with the one-use charms above) ----
  { id: 'lanternPendant', name: 'Lantern Pendant', description: 'A tiny lantern on a chain. Its light keeps your magic topped up.', category: 'equipment',
    icon: { shape: 'gem', color: 0xffd36b, art: 'pendant' }, value: 25, equip: { slot: 'charm', tier: 1, stats: { manaRegen: 2, maxMana: 8 } } },
  { id: 'emberRing', name: 'Ember Ring', description: 'A ring with a coal-red stone. Your blows land a little harder.', category: 'equipment',
    icon: { shape: 'gem', color: 0xff6a4a, art: 'ring' }, value: 55, equip: { slot: 'charm', tier: 2, stats: { damage: 0.06 } } },
  { id: 'frostLocket', name: 'Frost Locket', description: 'A cold silver locket. Light on your feet, quick to mend.', category: 'equipment',
    icon: { shape: 'gem', color: 0xbfe8ff, art: 'locket' }, value: 80, equip: { slot: 'charm', tier: 3, stats: { moveSpeed: 0.06, hpRegen: 1 } } },
  // ---- keys ----
  { id: 'lanternKey', name: 'Lantern Key', description: 'A little brass key with a glowing bow. It opens one locked Lantern chest.', category: 'misc',
    icon: { shape: 'key', color: 0xffd36b, art: 'key' }, maxStack: 5, rarity: 'rare', value: 12, tags: ['key'] },
  // ---- quest items: one per defeated boss ----
  { id: 'mossCrown', name: "Gloomcap's Crown", description: 'Proof that you freed Lanternmoss from the Moss King.', category: 'quest',
    icon: { shape: 'crown', color: 0xb48cff, art: 'crown' }, rarity: 'legendary', value: 0 },
  { id: 'emberCrown', name: "Pyrrhax's Horn Crown", description: 'Proof that you freed Emberfall from the red dragon.', category: 'quest',
    icon: { shape: 'crown', color: 0xff7a4a, art: 'crown' }, rarity: 'legendary', value: 0 },
  { id: 'frostCrown', name: "Malgrath's Crown", description: 'Proof that you cast down the Winged Demon Lord and freed Frostveil, the last planet.', category: 'quest',
    icon: { shape: 'crown', color: 0x8fd8ff, art: 'crown' }, rarity: 'legendary', value: 0 },
];
