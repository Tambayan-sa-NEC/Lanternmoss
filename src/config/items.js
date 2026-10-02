/* ---------------------------------------------------------------------
   ITEMS + INVENTORY: what every item is (static definitions) and how the bag behaves.
   Runtime state (which slot holds what, how many) lives in src/inventory/Inventory.js.

   Item definition fields (registry fills the defaults: src/items/ItemRegistry.js):
     id           unique key (never shown); everything refers to items by id
     name, description
     category     one of ITEM_CATEGORIES; decides the default action (src/items/itemActions.js)
     icon         { shape, color } drawn procedurally (shapes: see ITEM_ICON_SHAPES), or { src } for an image file
     stackable    default: true, except equipment / weapon / quest items
     maxStack     default: INVENTORY.defaultStackSize (1 when not stackable)
     rarity       one of RARITIES (default 'common')
     value        price in treats-equivalent coins, for shops later (default 0)
     use          list of effects applied when used: { effect: key of ITEM_EFFECTS, ...params }
     droppable    default: true, except quest items
     tags         free labels for grouping / filtering (e.g. 'treat' counts toward the Treats chip)
     props        optional item-specific static data
   --------------------------------------------------------------------- */

export const ITEM_CATEGORIES = {
  consumable: 'Consumable',
  material: 'Material',
  equipment: 'Equipment',
  weapon: 'Weapon',
  quest: 'Quest item',
  misc: 'Miscellaneous',
};

export const RARITIES = {
  common: { label: 'Common', color: '#7a6a80' },
  uncommon: { label: 'Uncommon', color: '#3f9a5a' },
  rare: { label: 'Rare', color: '#3f74c8' },
  legendary: { label: 'Legendary', color: '#d8820a' },
};

/** Effects a usable item can apply ({param} placeholders are filled from the effect entry for tooltips). */
export const ITEM_EFFECTS = {
  heal: 'Restores {amount} HP',
  mana: 'Restores {amount} mana / stamina',
  buff: '{buffName} for {seconds}s',
};

/** Procedural icon / world-model shapes (CSS in styles/main.css, meshes in src/models/items.js). */
export const ITEM_ICON_SHAPES = ['orb', 'bun', 'cap', 'gem', 'petal', 'charm', 'crown'];

export const INVENTORY = {
  slots: 24, columns: 6,          // bag size and grid width
  defaultStackSize: 20,
  keys: ['KeyI', 'Tab'],           // open / close (Escape also closes)
  pickupRadius: 1.3,               // walk this close to a world item to pick it up
  dropDistance: 1.4,               // dropped items land this far in front of the hero
  dropPickupDelay: 1.2,            // seconds before a dropped item can be picked up again (and you must step away first)
  fullNoticeCooldown: 2,           // seconds between "bag is full" messages
};

export const ITEM_DEFINITIONS = [
  // ---- consumables ----
  { id: 'honeyBun', name: 'Honey-moss Bun', description: "Pim's warm, sticky bun. A favourite treat.", category: 'consumable',
    icon: { shape: 'bun', color: 0xe8a858 }, maxStack: 10, value: 8, use: [{ effect: 'heal', amount: 35 }], tags: ['treat'] },
  { id: 'moonberryTart', name: 'Moonberry Tart', description: 'The crows gave it four stars. Restores your magic, or your second wind.', category: 'consumable',
    icon: { shape: 'bun', color: 0xb48cff }, maxStack: 10, rarity: 'uncommon', value: 14, use: [{ effect: 'mana', amount: 50 }, { effect: 'heal', amount: 15 }], tags: ['treat'] },
  { id: 'moonberry', name: 'Moonberry', description: 'A glowing purple berry that grows in the wilds. A small snack.', category: 'consumable',
    icon: { shape: 'orb', color: 0xc7a8ff }, value: 2, use: [{ effect: 'heal', amount: 12 }] },
  { id: 'moonHopCharm', name: 'Moon-Hop Charm', description: "One of Old Bramble's charms. Jumps feel floaty for a while.", category: 'consumable',
    icon: { shape: 'charm', color: 0xd6ccff }, maxStack: 5, rarity: 'rare', value: 30, use: [{ effect: 'buff', kind: 'moon', seconds: 30 }] },
  { id: 'featherCharm', name: 'Feather-Step Charm', description: "Fern's sprite magic, folded into a leaf. Run like the wind for a while.", category: 'consumable',
    icon: { shape: 'charm', color: 0xb8ffe0 }, maxStack: 5, rarity: 'rare', value: 30, use: [{ effect: 'buff', kind: 'feather', seconds: 30 }] },
  // ---- materials (kept for crafting and shops later) ----
  { id: 'glowcap', name: 'Glowcap', description: 'A softly glowing mushroom cap from Lanternmoss.', category: 'material',
    icon: { shape: 'cap', color: 0x9ff0ff }, maxStack: 30, value: 3 },
  { id: 'emberShard', name: 'Ember Shard', description: 'Still warm. Found on the slopes of Emberfall.', category: 'material',
    icon: { shape: 'gem', color: 0xff8a4a }, maxStack: 30, rarity: 'uncommon', value: 6 },
  { id: 'frostPetal', name: 'Frost Petal', description: 'A flower petal that never melts, from Frostveil.', category: 'material',
    icon: { shape: 'petal', color: 0xbff4ff }, maxStack: 30, rarity: 'uncommon', value: 6 },
  // ---- quest items: one per defeated boss ----
  { id: 'mossCrown', name: "Gloomcap's Crown", description: 'Proof that you freed Lanternmoss from the Moss King.', category: 'quest',
    icon: { shape: 'crown', color: 0xb48cff }, rarity: 'legendary', value: 0 },
  { id: 'emberCrown', name: "Cindercap's Crown", description: 'Proof that you freed Emberfall from the Ember King.', category: 'quest',
    icon: { shape: 'crown', color: 0xff7a4a }, rarity: 'legendary', value: 0 },
  { id: 'frostCrown', name: "Rimecap's Crown", description: 'Proof that you freed Frostveil, the last planet.', category: 'quest',
    icon: { shape: 'crown', color: 0x8fd8ff }, rarity: 'legendary', value: 0 },
];
