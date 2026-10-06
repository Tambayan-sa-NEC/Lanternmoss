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
     equip        gear only (categories weapon / equipment): { slot (a GEAR_KINDS key: what kind of piece it is),
                  hero (only this hero can use it), tier (1-3: which planet it belongs to, for drops),
                  stats (bonuses at Common rarity: STATS; vanity pieces have none) }.
                  A piece's rarity is rolled when it drops (stack props.rarity) and multiplies its stats.
                  Which worn slot a kind goes in: EQUIP_SLOTS (two trinket slots take the same kind).
     tool         tools only (category tool): { kind (TOOL_KINDS), tier (a better pickaxe mines more) }; used from
                  the hotbar (src/gameplay/Gathering.js, Farm.js)
     props.crop   seeds only: the crop they grow (config/resources.js CROPS)
   --------------------------------------------------------------------- */

export const ITEM_CATEGORIES = {
  consumable: 'Consumable',
  material: 'Material',
  tool: 'Tool',
  seed: 'Seeds',
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

/** Kinds of gear (an item's equip.slot). Vanity pieces only change how the hero looks (src/models/vanity.js). */
export const GEAR_KINDS = {
  weapon: { label: 'Weapon' }, head: { label: 'Headgear' }, armor: { label: 'Armour' }, feet: { label: 'Boots' },
  charm: { label: 'Trinket' }, hat: { label: 'Hat', vanity: true }, back: { label: 'Cape', vanity: true },
};
/** The hero's worn slots, in the order the bag's equipment side shows them (src/ui/InventoryUI.js): each takes one
    kind of gear (`fits`). Two trinket slots; the vanity slots are drawn over whatever armour is worn. */
export const EQUIP_SLOTS = {
  head: { label: 'Head', fits: 'head' }, armor: { label: 'Body', fits: 'armor' }, feet: { label: 'Feet', fits: 'feet' },
  weapon: { label: 'Weapon', fits: 'weapon' }, charm: { label: 'Trinket', fits: 'charm' }, charm2: { label: 'Trinket', fits: 'charm' },
  hat: { label: 'Hat', fits: 'hat' }, back: { label: 'Cape', fits: 'back' },
};

/** Tools (category tool): what each kind works on. Held from the hotbar (src/gameplay/Gathering.js, Farm.js). */
export const TOOL_KINDS = {
  axe: { label: 'Axe', use: 'chops trees for wood' },
  pick: { label: 'Pickaxe', use: 'mines rocks and ore veins' },
  rod: { label: 'Fishing rod', use: 'fishes in ponds and lakes' },
  hoe: { label: 'Hoe', use: 'tills the soil of a farm plot' },
  can: { label: 'Watering can', use: 'waters planted crops' },
};

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
export const HOTBAR = { size: 9, useCooldown: 0.8, holdCategories: ['consumable', 'weapon', 'equipment', 'tool'] };

/** Effects a usable item can apply ({param} placeholders are filled from the effect entry for tooltips). */
export const ITEM_EFFECTS = {
  heal: 'Restores {amount} HP',
  mana: 'Restores {amount} mana / stamina',
  energy: 'Fills {amount} energy',
  buff: '{buffName} for {seconds}s',
};

/** Procedural icon / world-model shapes (CSS in styles/main.css, meshes in src/models/items.js). */
export const ITEM_ICON_SHAPES = ['orb', 'bun', 'cap', 'gem', 'petal', 'charm', 'crown', 'key'];
/** Per-item pictures (an icon.art value): each has an SVG icon (src/ui/itemArt.js) and a world model (src/models/items.js). */
export const ITEM_ART_KINDS = ['bun', 'tart', 'berry', 'bottle', 'bowl', 'flask', 'moonCharm', 'leafCharm', 'mushroom', 'shard', 'petal',
  'staff', 'axe', 'bow', 'cloak', 'mail', 'mantle', 'pendant', 'ring', 'locket', 'key', 'crown',
  'log', 'stone', 'ore', 'gemstone', 'herb', 'pepper', 'plum', 'carrot', 'wheat', 'pumpkin', 'seeds', 'fish', 'bread', 'skewer',
  'pickaxe', 'rod', 'hoe', 'can', 'helm', 'boots', 'hood', 'strawHat', 'flowerCrown', 'frogHat', 'cape'];

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
    icon: { shape: 'bun', color: 0xe8a858, art: 'bun' }, maxStack: 10, value: 8, use: [{ effect: 'heal', amount: 35 }, { effect: 'energy', amount: 30 }], tags: ['treat'] },
  { id: 'moonberryTart', name: 'Moonberry Tart', description: 'The crows gave it four stars. Restores your magic, or your second wind.', category: 'consumable',
    icon: { shape: 'bun', color: 0xb48cff, art: 'tart' }, maxStack: 10, rarity: 'uncommon', value: 14, use: [{ effect: 'mana', amount: 50 }, { effect: 'heal', amount: 15 }, { effect: 'energy', amount: 25 }], tags: ['treat'] },
  { id: 'moonberry', name: 'Moonberry', description: 'A glowing purple berry that grows in the wilds. A small snack.', category: 'consumable',
    icon: { shape: 'orb', color: 0xc7a8ff, art: 'berry' }, value: 2, use: [{ effect: 'heal', amount: 12 }, { effect: 'energy', amount: 6 }] },
  { id: 'glowTonic', name: 'Glowcap Tonic', description: 'Glowcaps steeped until the bottle hums. Refills your magic, or your second wind.', category: 'consumable',
    icon: { shape: 'orb', color: 0x7fe8ff, art: 'bottle' }, maxStack: 10, rarity: 'uncommon', value: 12, use: [{ effect: 'mana', amount: 45 }] },
  { id: 'emberStew', name: 'Ember Stew', description: 'Moonberries simmered over an ember shard. Hearty, and a little spicy.', category: 'consumable',
    icon: { shape: 'bun', color: 0xe86a3a, art: 'bowl' }, maxStack: 10, rarity: 'uncommon', value: 16, use: [{ effect: 'heal', amount: 65 }, { effect: 'energy', amount: 45 }] },
  { id: 'frostDraught', name: 'Frost-petal Draught', description: 'Cold, clear and sparkling. Mends wounds and wakes the mind.', category: 'consumable',
    icon: { shape: 'orb', color: 0xbff4ff, art: 'flask' }, maxStack: 10, rarity: 'rare', value: 22, use: [{ effect: 'heal', amount: 45 }, { effect: 'mana', amount: 45 }] },
  // ---- food you grow, pick or catch (src/gameplay/Gathering.js, Farm.js): small snacks raw, better cooked
  { id: 'firePepper', name: 'Fire Pepper', description: 'A crinkly red pepper from the bushes of Emberfall. Hot enough to make you hit harder.', category: 'consumable',
    icon: { shape: 'orb', color: 0xff4a3a, art: 'pepper' }, value: 4, use: [{ effect: 'energy', amount: 8 }, { effect: 'buff', kind: 'might', seconds: 20 }] },
  { id: 'snowPlum', name: 'Snow Plum', description: 'A frosted blue plum from Frostveil. Sweet, cold and good for the mind.', category: 'consumable',
    icon: { shape: 'orb', color: 0x7fa8ff, art: 'plum' }, value: 4, use: [{ effect: 'energy', amount: 12 }, { effect: 'mana', amount: 15 }] },
  { id: 'moonCarrot', name: 'Moon Carrot', description: 'A crunchy carrot with a silvery top, grown in your own plot.', category: 'consumable',
    icon: { shape: 'orb', color: 0xff9a3a, art: 'carrot' }, value: 5, use: [{ effect: 'energy', amount: 16 }, { effect: 'heal', amount: 10 }] },
  { id: 'pondPerch', name: 'Pond Perch', description: 'A stripy little fish from the ponds of Lanternmoss. Better grilled.', category: 'consumable',
    icon: { shape: 'orb', color: 0x8fbf6a, art: 'fish' }, maxStack: 10, value: 6, use: [{ effect: 'energy', amount: 10 }, { effect: 'heal', amount: 8 }], tags: ['fish'] },
  { id: 'cinderEel', name: 'Cinder Eel', description: 'A warm, wriggly eel from the ember ponds. Better grilled (it nearly is already).', category: 'consumable',
    icon: { shape: 'orb', color: 0xe8603a, art: 'fish' }, maxStack: 10, value: 8, use: [{ effect: 'energy', amount: 10 }, { effect: 'heal', amount: 10 }], tags: ['fish'] },
  { id: 'iceTrout', name: 'Ice Trout', description: 'A pale, glassy trout from the frozen lakes. Better grilled.', category: 'consumable',
    icon: { shape: 'orb', color: 0x9fd0ff, art: 'fish' }, maxStack: 10, value: 10, use: [{ effect: 'energy', amount: 12 }, { effect: 'heal', amount: 12 }], tags: ['fish'] },
  { id: 'goldenKoi', name: 'Golden Koi', description: 'A rare, gleaming koi. Lucky to catch, luckier to eat: the Koi Feast is fit for a hero.', category: 'consumable',
    icon: { shape: 'orb', color: 0xffc23a, art: 'fish' }, maxStack: 5, rarity: 'rare', value: 30, use: [{ effect: 'energy', amount: 20 }, { effect: 'heal', amount: 30 }], tags: ['fish'] },
  // ---- meals (cooked in the Craft tab): fill up and give a buff
  { id: 'grilledFish', name: 'Grilled Fish', description: 'Any fish, a stick and a little fire. Simple and filling.', category: 'consumable',
    icon: { shape: 'bun', color: 0xd89a5a, art: 'skewer' }, maxStack: 10, value: 12, use: [{ effect: 'heal', amount: 40 }, { effect: 'energy', amount: 40 }] },
  { id: 'veggieStew', name: 'Veggie Stew', description: 'Moon carrots and sweetleaf, simmered slow. Wounds mend while it warms you.', category: 'consumable',
    icon: { shape: 'bun', color: 0xf0a040, art: 'bowl' }, maxStack: 10, rarity: 'uncommon', value: 18, use: [{ effect: 'energy', amount: 55 }, { effect: 'buff', kind: 'mend', seconds: 60 }] },
  { id: 'sunBread', name: 'Sun Bread', description: 'A golden loaf from your own wheat. Keeps you going for ages.', category: 'consumable',
    icon: { shape: 'bun', color: 0xe8b860, art: 'bread' }, maxStack: 10, value: 12, use: [{ effect: 'energy', amount: 50 }, { effect: 'heal', amount: 15 }] },
  { id: 'pumpkinPie', name: 'Pumpkin Pie', description: 'A whole pie, just for you. You feel mighty after a slice (or four).', category: 'consumable',
    icon: { shape: 'bun', color: 0xf08a2a, art: 'tart' }, maxStack: 10, rarity: 'rare', value: 26, use: [{ effect: 'energy', amount: 70 }, { effect: 'buff', kind: 'might', seconds: 90 }] },
  { id: 'pepperSkewer', name: 'Ember Skewer', description: "Emberfall's favourite: fish and fire peppers on a stick. Spicy strength.", category: 'consumable',
    icon: { shape: 'bun', color: 0xff5a3a, art: 'skewer' }, maxStack: 10, rarity: 'uncommon', value: 20, use: [{ effect: 'energy', amount: 50 }, { effect: 'buff', kind: 'might', seconds: 60 }] },
  { id: 'plumPorridge', name: 'Plum Porridge', description: "Frostveil's breakfast: warm wheat and snow plums. Light on your feet all morning.", category: 'consumable',
    icon: { shape: 'bun', color: 0x8fa8ff, art: 'bowl' }, maxStack: 10, rarity: 'uncommon', value: 20, use: [{ effect: 'energy', amount: 50 }, { effect: 'buff', kind: 'swift', seconds: 60 }] },
  { id: 'koiFeast', name: 'Koi Feast', description: 'A golden koi, roasted with sweetleaf. Full, healed and hard to hurt.', category: 'consumable',
    icon: { shape: 'bun', color: 0xffc23a, art: 'skewer' }, maxStack: 5, rarity: 'legendary', value: 60, use: [{ effect: 'energy', amount: 100 }, { effect: 'heal', amount: 100 }, { effect: 'buff', kind: 'ward', seconds: 120 }] },
  // ---- potions
  { id: 'healingPotion', name: 'Healing Potion', description: 'Sweetleaf and moonberry, bottled. A big gulp of health.', category: 'consumable',
    icon: { shape: 'orb', color: 0xff5a7a, art: 'bottle' }, maxStack: 10, rarity: 'uncommon', value: 15, use: [{ effect: 'heal', amount: 70 }] },
  { id: 'starwater', name: 'Starwater Potion', description: 'Glowcaps and sweetleaf in clear water. Refills your magic, or your second wind, almost all the way.', category: 'consumable',
    icon: { shape: 'orb', color: 0x6a8aff, art: 'flask' }, maxStack: 10, rarity: 'uncommon', value: 15, use: [{ effect: 'mana', amount: 80 }] },
  { id: 'stoneskinTonic', name: 'Stoneskin Tonic', description: 'Tastes like a cave. For a while, blows hurt a lot less.', category: 'consumable',
    icon: { shape: 'orb', color: 0xa8a2bf, art: 'flask' }, maxStack: 10, rarity: 'rare', value: 22, use: [{ effect: 'buff', kind: 'ward', seconds: 60 }] },
  { id: 'quickstepTonic', name: 'Quickstep Tonic', description: 'Fizzy and green. Your feet want to go places, fast.', category: 'consumable',
    icon: { shape: 'orb', color: 0x7fe07a, art: 'bottle' }, maxStack: 10, rarity: 'uncommon', value: 18, use: [{ effect: 'buff', kind: 'swift', seconds: 60 }] },
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
  { id: 'wood', name: 'Wood', description: 'Sturdy logs and branches. Tools, rods and campfire cooking all start here.', category: 'material',
    icon: { shape: 'gem', color: 0xb0703a, art: 'log' }, maxStack: 40, value: 1 },
  { id: 'stone', name: 'Stone', description: 'Good honest stone. Picks, hoes and the odd tonic.', category: 'material',
    icon: { shape: 'gem', color: 0xb6aec8, art: 'stone' }, maxStack: 40, value: 1 },
  { id: 'copperOre', name: 'Copper Ore', description: 'Green-flecked copper from the veins of Lanternmoss. Better tools and trinkets.', category: 'material',
    icon: { shape: 'gem', color: 0xd8844a, art: 'ore' }, maxStack: 30, value: 4 },
  { id: 'ironOre', name: 'Iron Ore', description: 'Heavy, dark iron from deep veins (a copper pickaxe gets it out). Helmets and boots.', category: 'material',
    icon: { shape: 'gem', color: 0x8a8fa8, art: 'ore' }, maxStack: 30, rarity: 'uncommon', value: 7 },
  { id: 'amethyst', name: 'Amethyst', description: 'A violet gem from a vein near the Hydra\'s lake. Sets into a fine ring.', category: 'material',
    icon: { shape: 'gem', color: 0xb070ff, art: 'gemstone' }, maxStack: 10, rarity: 'rare', value: 20 },
  { id: 'fireOpal', name: 'Fire Opal', description: 'A gem with a flame inside, from the Basilisk\'s hunting grounds.', category: 'material',
    icon: { shape: 'gem', color: 0xff6a3a, art: 'gemstone' }, maxStack: 10, rarity: 'rare', value: 26 },
  { id: 'frostDiamond', name: 'Frost Diamond', description: 'Cold, flawless and very rare. Guarded by the Frost Hydra.', category: 'material',
    icon: { shape: 'gem', color: 0xbff4ff, art: 'gemstone' }, maxStack: 10, rarity: 'rare', value: 32 },
  { id: 'sweetleaf', name: 'Sweetleaf', description: 'A soft, fragrant herb that grows everywhere. Potions, stews, capes.', category: 'material',
    icon: { shape: 'petal', color: 0x7fd07a, art: 'herb' }, maxStack: 30, value: 2 },
  { id: 'sunWheat', name: 'Sun Wheat', description: 'Golden wheat from your farm plot. Bread and porridge.', category: 'material',
    icon: { shape: 'petal', color: 0xf0c860, art: 'wheat' }, maxStack: 30, value: 3 },
  { id: 'pumpkin', name: 'Pumpkin', description: 'A big round pumpkin from your farm plot. One thing comes to mind: pie.', category: 'material',
    icon: { shape: 'orb', color: 0xf08a2a, art: 'pumpkin' }, maxStack: 10, value: 8 },
  // ---- seeds (plant them in a tilled farm plot: src/gameplay/Farm.js)
  { id: 'carrotSeeds', name: 'Moon Carrot Seeds', description: 'Plant in a tilled farm plot and water. Quick to grow.', category: 'seed',
    icon: { shape: 'orb', color: 0xff9a3a, art: 'seeds' }, value: 3, props: { crop: 'carrot' } },
  { id: 'wheatSeeds', name: 'Sun Wheat Seeds', description: 'Plant in a tilled farm plot and water. Grows a little slower than carrots.', category: 'seed',
    icon: { shape: 'orb', color: 0xf0c860, art: 'seeds' }, value: 3, props: { crop: 'wheat' } },
  { id: 'pumpkinSeeds', name: 'Pumpkin Seeds', description: 'Plant in a tilled farm plot and water it over two days. Worth the wait.', category: 'seed',
    icon: { shape: 'orb', color: 0xf08a2a, art: 'seeds' }, value: 5, rarity: 'uncommon', props: { crop: 'pumpkin' } },
  // ---- tools (hold them from the hotbar: E or right click by a tree, rock, vein, pond or farm plot)
  { id: 'woodAxe', name: 'Woodcutter\'s Axe', description: 'Chops trees for wood. The tree keeps growing; it just needs a rest after.', category: 'tool',
    icon: { shape: 'gem', color: 0xb6aec8, art: 'axe' }, value: 10, tool: { kind: 'axe', tier: 1 } },
  { id: 'stonePick', name: 'Stone Pickaxe', description: 'Mines rocks for stone, and copper and ember veins.', category: 'tool',
    icon: { shape: 'gem', color: 0xb6aec8, art: 'pickaxe' }, value: 10, tool: { kind: 'pick', tier: 1 } },
  { id: 'copperPick', name: 'Copper Pickaxe', description: 'A harder pick: iron veins and gem veins too.', category: 'tool',
    icon: { shape: 'gem', color: 0xd8844a, art: 'pickaxe' }, rarity: 'uncommon', value: 30, tool: { kind: 'pick', tier: 2 } },
  { id: 'fishingRod', name: 'Fishing Rod', description: 'Cast at a pond or lake, wait for the bite, then reel in at the right moment.', category: 'tool',
    icon: { shape: 'gem', color: 0xb0703a, art: 'rod' }, value: 12, tool: { kind: 'rod', tier: 1 } },
  { id: 'hoe', name: 'Garden Hoe', description: 'Tills a farm plot so seeds can go in.', category: 'tool',
    icon: { shape: 'gem', color: 0xb6aec8, art: 'hoe' }, value: 8, tool: { kind: 'hoe', tier: 1 } },
  { id: 'wateringCan', name: 'Watering Can', description: 'Waters a planted plot for the day. (Rain does it for you.)', category: 'tool',
    icon: { shape: 'gem', color: 0x7fb8e0, art: 'can' }, value: 12, tool: { kind: 'can', tier: 1 } },
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
  // ---- headgear and boots (any hero) ----
  { id: 'mossHood', name: 'Moss Hood', description: 'A soft green hood stitched with sweetleaf. Keeps the rain off and the bumps soft.', category: 'equipment',
    icon: { shape: 'gem', color: 0x6fbf6a, art: 'hood' }, value: 20, equip: { slot: 'head', tier: 1, stats: { maxHp: 8, armor: 0.02 } } },
  { id: 'emberHelm', name: 'Ember Helm', description: 'Iron and ember, hammered into a helm with little horns.', category: 'equipment',
    icon: { shape: 'gem', color: 0xd86a3a, art: 'helm' }, value: 50, equip: { slot: 'head', tier: 2, stats: { maxHp: 14, armor: 0.04 } } },
  { id: 'frostCirclet', name: 'Frost Circlet', description: 'A circlet with a frost diamond set in it. Thoughts come clear and quick.', category: 'equipment',
    icon: { shape: 'gem', color: 0xbff4ff, art: 'crown' }, value: 80, equip: { slot: 'head', tier: 3, stats: { maxMana: 15, manaRegen: 1.5, armor: 0.02 } } },
  { id: 'wanderBoots', name: 'Wanderer\'s Boots', description: 'Soft boots for long walks between lanterns.', category: 'equipment',
    icon: { shape: 'gem', color: 0xb0703a, art: 'boots' }, value: 20, equip: { slot: 'feet', tier: 1, stats: { moveSpeed: 0.03 } } },
  { id: 'emberBoots', name: 'Ember Greaves', description: 'Iron-capped boots that shrug off hot ground.', category: 'equipment',
    icon: { shape: 'gem', color: 0xd86a3a, art: 'boots' }, value: 50, equip: { slot: 'feet', tier: 2, stats: { moveSpeed: 0.03, armor: 0.03 } } },
  { id: 'snowstepBoots', name: 'Snowstep Boots', description: 'Fur-lined, frost-petal stitched. You barely leave a footprint.', category: 'equipment',
    icon: { shape: 'gem', color: 0xbfe8ff, art: 'boots' }, value: 80, equip: { slot: 'feet', tier: 3, stats: { moveSpeed: 0.05, hpRegen: 0.6 } } },
  // ---- trinkets (any hero; the charm slot, not to be confused with the one-use charms above) ----
  { id: 'lanternPendant', name: 'Lantern Pendant', description: 'A tiny lantern on a chain. Its light keeps your magic topped up.', category: 'equipment',
    icon: { shape: 'gem', color: 0xffd36b, art: 'pendant' }, value: 25, equip: { slot: 'charm', tier: 1, stats: { manaRegen: 2, maxMana: 8 } } },
  { id: 'emberRing', name: 'Ember Ring', description: 'A ring with a coal-red stone. Your blows land a little harder.', category: 'equipment',
    icon: { shape: 'gem', color: 0xff6a4a, art: 'ring' }, value: 55, equip: { slot: 'charm', tier: 2, stats: { damage: 0.06 } } },
  { id: 'frostLocket', name: 'Frost Locket', description: 'A cold silver locket. Light on your feet, quick to mend.', category: 'equipment',
    icon: { shape: 'gem', color: 0xbfe8ff, art: 'locket' }, value: 80, equip: { slot: 'charm', tier: 3, stats: { moveSpeed: 0.06, hpRegen: 1 } } },
  { id: 'amethystBand', name: 'Amethyst Band', description: 'A copper band set with an amethyst. Your magic runs a little deeper.', category: 'equipment',
    icon: { shape: 'gem', color: 0xb070ff, art: 'ring' }, value: 45, equip: { slot: 'charm', tier: 1, stats: { maxMana: 10, manaRegen: 1 } } },
  { id: 'opalBrooch', name: 'Opal Brooch', description: 'A fire opal pinned in iron. It warms you, and your blows.', category: 'equipment',
    icon: { shape: 'gem', color: 0xff6a3a, art: 'pendant' }, value: 70, equip: { slot: 'charm', tier: 2, stats: { damage: 0.05, hpRegen: 0.5 } } },
  { id: 'diamondCharm', name: 'Diamond Ward', description: 'A frost diamond in a silver cage. Hard as ice, and so are you.', category: 'equipment',
    icon: { shape: 'gem', color: 0xbff4ff, art: 'locket' }, value: 100, equip: { slot: 'charm', tier: 3, stats: { armor: 0.04, maxHp: 15 } } },
  // ---- vanity: hats and capes that only change the hero's look (src/models/vanity.js) ----
  { id: 'strawHat', name: 'Straw Hat', description: "Pim's thank-you for your first harvest. Every farmer needs one.", category: 'equipment', rarity: 'uncommon',
    icon: { shape: 'gem', color: 0xf0d080, art: 'strawHat' }, value: 10, equip: { slot: 'hat', tier: 1, stats: {} } },
  { id: 'flowerCrown', name: 'Flower Crown', description: 'Wildflowers and sweetleaf, woven into a crown.', category: 'equipment', rarity: 'uncommon',
    icon: { shape: 'gem', color: 0xff8fb1, art: 'flowerCrown' }, value: 12, equip: { slot: 'hat', tier: 1, stats: {} } },
  { id: 'frogHat', name: 'Toad Cap', description: 'A floppy hat with big toad eyes. Found by the Hydra\'s lake, still a little damp.', category: 'equipment', rarity: 'rare',
    icon: { shape: 'gem', color: 0x7fcf6a, art: 'frogHat' }, value: 25, equip: { slot: 'hat', tier: 1, stats: {} } },
  { id: 'leafCape', name: 'Leaf Cape', description: 'A cape of overlapping sweetleaves. Rustles nicely when you run.', category: 'equipment', rarity: 'uncommon',
    icon: { shape: 'gem', color: 0x6fcf6a, art: 'cape' }, value: 12, equip: { slot: 'back', tier: 1, stats: {} } },
  { id: 'starryCape', name: 'Starry Cape', description: 'Midnight blue, sprinkled with stars that glow. Found only in Lantern chests.', category: 'equipment', rarity: 'rare',
    icon: { shape: 'gem', color: 0x4a4aa8, art: 'cape' }, value: 40, equip: { slot: 'back', tier: 1, stats: {} } },
  // ---- gifts from rare creatures (config/critters.js): befriend one to get its charm ----
  { id: 'goldenClover', name: 'Golden Clover', description: 'A four-leaf clover from a Golden Moonbunny. Luck makes you quicker and quick to mend.', category: 'equipment',
    icon: { shape: 'charm', color: 0xffd36b, art: 'leafCharm' }, value: 70, equip: { slot: 'charm', tier: 1, stats: { hpRegen: 1.2, moveSpeed: 0.05 } } },
  { id: 'emberScale', name: 'Ember Scale', description: 'A warm scale an Ember Salamander shed for you. Harder hits, a tougher hide.', category: 'equipment',
    icon: { shape: 'gem', color: 0xff6a3a, art: 'pendant' }, value: 90, equip: { slot: 'charm', tier: 2, stats: { damage: 0.07, armor: 0.04 } } },
  { id: 'auroraFeather', name: 'Aurora Feather', description: 'A shimmering feather left by an Aurora Hare. Your magic runs deep and returns fast.', category: 'equipment',
    icon: { shape: 'charm', color: 0x9ff3ff, art: 'moonCharm' }, value: 110, equip: { slot: 'charm', tier: 3, stats: { maxMana: 20, manaRegen: 1.5 } } },
  // ---- keys ----
  { id: 'lanternKey', name: 'Lantern Key', description: 'A little brass key with a glowing bow. It opens one locked Lantern chest.', category: 'misc',
    icon: { shape: 'key', color: 0xffd36b, art: 'key' }, maxStack: 5, rarity: 'rare', value: 12, tags: ['key'] },
  // ---- sigils: carried by elites, offered at a boss's lair (config/bossSummon.js) ----
  { id: 'emberSigil', name: 'Ember Sigil', description: 'A warm, humming seal-stone carried by an Emberfall elite. Three of them wake Pyrrhax.', category: 'quest',
    icon: { shape: 'gem', color: 0xff7a3a, art: 'shard' }, maxStack: 9, rarity: 'rare', value: 0 },
  // ---- quest items: one per defeated boss ----
  { id: 'mossCrown', name: "Gloomcap's Crown", description: 'Proof that you freed Lanternmoss from the Moss King.', category: 'quest',
    icon: { shape: 'crown', color: 0xb48cff, art: 'crown' }, rarity: 'legendary', value: 0 },
  { id: 'emberCrown', name: "Pyrrhax's Horn Crown", description: 'Proof that you freed Emberfall from the red dragon.', category: 'quest',
    icon: { shape: 'crown', color: 0xff7a4a, art: 'crown' }, rarity: 'legendary', value: 0 },
  { id: 'frostCrown', name: "Malgrath's Crown", description: 'Proof that you cast down the Winged Demon Lord and freed Frostveil, the last planet.', category: 'quest',
    icon: { shape: 'crown', color: 0x8fd8ff, art: 'crown' }, rarity: 'legendary', value: 0 },
];
