/* ---------------------------------------------------------------------
   CHESTS: treasure out in the wilds (runtime: src/gameplay/Chests.js, entity: src/entities/Chest.js).
   Where they go per planet is PLANETS[i].chests (config/planets.js): [{ kind, count }].

   CHEST_KINDS   what each chest is: name, look, loot table, locked (needs a Lantern Key), placement
     minFromVillage / minFromLair   keep this far (arc) from the village square and the boss lair
   LOOT_TABLES   what's inside: coins [min, max] (x (1 + coinsPerPlanet * planet index)), `guaranteed` entries,
                 then `rolls` picks from `pool` (by weight; a picked entry isn't picked twice)
     entry       { item, qty: n | [min, max], weight }; item may be '@material' (the planet's forage material,
                 PLANETS[i].material), '@trophy' (the planet's boss trophy) or '@gear' (a piece of equipment for this
                 planet and the current hero, its rarity rolled from GEAR_RARITY[entry.rarity])
   GEAR_RARITY   rarity odds (weights) for '@gear' by source
   MONSTER_DROPS what defeated monsters leave behind (runtime: src/gameplay/drops.js): a chance that grows with the
                 monster's XP, then one roll of LOOT_TABLES[table]. Bosses drop their chest instead.
   KEYS          Lantern Keys for locked chests: monsters drop them now and then while a locked chest is still waiting
                 on the planet and you have none (pity = a guaranteed drop after that many kills without one);
                 Old Bramble also hands you one, once per adventure (src/entities/npc/npcDefs.js).
   BOSS_CHEST    the chest that falls where a boss is beaten; portal travel is a separate choice; unopened treasure remains here.
   --------------------------------------------------------------------- */

export const CHEST_KINDS = {
  common: { name: 'Mossy chest', loot: 'common', look: { wood: 0xb0703a, lid: 0xc07e44, trim: 0xd8b070, glow: 0xfff0a0 },
    scale: 1, minFromVillage: 14, minFromLair: 10 },
  rare: { name: 'Lantern chest', loot: 'rare', locked: true, look: { wood: 0x5a4a8a, lid: 0x6a58a0, trim: 0xffd36b, glow: 0xb48cff },
    scale: 1.15, minFromVillage: 24, minFromLair: 12 },
  boss: { name: 'Treasure chest', loot: 'boss', look: { wood: 0x8a3a4a, lid: 0xa04a58, trim: 0xffd36b, glow: 0xffd36b },
    scale: 1.4, beam: true },
};

export const LOOT_TABLES = {
  common: {
    coins: [4, 6], rolls: 2,
    pool: [
      { item: 'moonberry', qty: [2, 3], weight: 5 },
      { item: '@material', qty: [2, 3], weight: 5 },
      { item: 'honeyBun', qty: 1, weight: 3 },
      { item: 'moonberryTart', qty: 1, weight: 1.5 },
      { item: 'featherCharm', qty: 1, weight: 0.6 },
      { item: 'moonHopCharm', qty: 1, weight: 0.6 },
      { item: '@gear', rarity: 'chest', weight: 1.2 },
      { item: 'carrotSeeds', qty: [2, 3], weight: 1.5 },
      { item: 'wheatSeeds', qty: [2, 3], weight: 1 },
    ],
  },
  rare: {
    coins: [14, 18], rolls: 2,
    guaranteed: [{ item: 'moonberryTart', qty: 2 }],
    pool: [
      { item: 'featherCharm', qty: 1, weight: 3 },
      { item: 'moonHopCharm', qty: 1, weight: 3 },
      { item: 'honeyBun', qty: 2, weight: 2 },
      { item: '@material', qty: [3, 5], weight: 2 },
      { item: '@gear', rarity: 'rare', weight: 4 },
      { item: 'starryCape', qty: 1, weight: 1 },
      { item: 'pumpkinSeeds', qty: 2, weight: 1 },
    ],
  },
  boss: {
    coins: [40, 55], rolls: 1,
    guaranteed: [{ item: '@trophy', qty: 1 }, { item: '@gear', rarity: 'boss' }, { item: 'moonberryTart', qty: 2 }, { item: 'honeyBun', qty: 2 }],
    pool: [
      { item: 'featherCharm', qty: 2, weight: 1 },
      { item: 'moonHopCharm', qty: 2, weight: 1 },
    ],
  },
  monster: {
    rolls: 1,
    pool: [
      { item: 'moonberry', qty: [1, 2], weight: 5 },
      { item: '@material', qty: [1, 2], weight: 5 },
      { item: 'honeyBun', qty: 1, weight: 1 },
      { item: 'glowTonic', qty: 1, weight: 0.8 },
      { item: '@gear', rarity: 'monster', weight: 1 },
    ],
  },
};

export const GEAR_RARITY = {
  monster: { common: 70, uncommon: 25, rare: 5 },
  chest:   { common: 45, uncommon: 40, rare: 15 },
  rare:    { uncommon: 45, rare: 45, legendary: 10 },
  boss:    { rare: 65, legendary: 35 },
};

/** What a mini boss (hydra, basilisk) leaves where it falls: one roll of this table, every time, plus its own
    `extra` items (by monster type). */
export const MINI_BOSS_LOOT = { table: 'rare', extra: { hydra: [['frogHat', 1]] } };

export const MONSTER_DROPS = {
  chance: 0.1,             // base chance a defeated monster drops something...
  perXp: 0.005,            // ...plus this per XP it's worth (a goblin ~15%, an ogre ~30%)
  max: 0.45,
  table: 'monster',
};

export const LOOT = {
  coinsPerPlanet: 0.25,     // each planet further multiplies chest coins by 1 + this x planet index
  popDistance: [1.3, 2.1], // loot hops out this far (arc) from the chest
  popTime: 0.55,           // seconds for an item's hop
};

export const KEYS = {
  item: 'lanternKey',
  dropChance: 0.12,        // per monster defeated, while a locked chest waits and you have no key
  pity: 10,                // kills without a key before one is guaranteed
};

/** Only an actual Lantern chest rolls this travel key; mini boss loot sharing the rare table does not. */
export const WAYFARER_KEYS = { item: 'wayfarerKey', chance: 0.04 };

export const BOSS_CHEST = {
  dropHeight: 7,           // it falls from this high...
  fallTime: 0.9,           // ...over this long
  travelDelay: 3.5,        // legacy timing constant; portal travel no longer starts automatically
};

export const CHEST_REACH = 2.0;   // arc distance at which "E Open ..." appears
