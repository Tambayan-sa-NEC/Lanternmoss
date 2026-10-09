/* ---------------------------------------------------------------------
   PLANETS: the campaign, in order. Defeating a planet's boss carries the hero to the next entry
   (runtime: src/gameplay/PlanetProgression.js). Add a planet = add an entry here.
     seed     world-generation seed (same seed => same layout)
     palette  ground / grass / water / sky / fog colours
     scale    difficulty multipliers applied to every enemy's base stats from COMBAT.enemies:
              hp (also healing), damage, speed (movement, charges, projectiles), cooldown (<1 = attacks more often), xp
     roster   enemies spawned on arrival, in order. { type, count } spreads them over the wilds,
              { type, groups, size } makes camps, near: 'ponds' gathers them around far ponds
     boss     { type } from COMBAT.enemies (ai 'boss'), plus optional overrides (name, colours, look = model palette + motif);
              summon = what wakes it and arena = its ring (config/bossSummon.js explains both);
              each planet has its own boss type, and with it its own AI (gloomcap -> pyrrhax the dragon -> malgrath);
              trophy = item id (config/items.js) given to the hero when it falls
     forage   items lying around the planet to pick up: { item, count }
     resources what can be gathered there (config/resources.js NODE_KINDS): nodes [[kind, count, near]], near = 'village'
              (a short walk from the square: the first wood, stone and herbs) or none (anywhere in the wilds); rare =
              the rare gem veins, placed around the planet's mini boss (you have to get past it)
     flora    what grows there: trees ({ kind: weight }, src/world/props.js TREE_KINDS), treeCount, giants (share of
              giant trees), flowers (colours), tallGrass (colours), grass / tallCount / meadow (density multipliers)
     weather  { kind: weight } from config/weather.js WEATHER_KINDS: what blows over it
     miniBosses optional big fights out in the wilds: [{ type (COMBAT.enemies, miniBoss), near: 'lake' | 'far', overrides }]
     wildlife its animals: critters [[CRITTER_DEFS key, count, 'ponds' | 'far']], rare (one rare creature), birds,
              flocks, plumage (bird colours), fish (fish colours)
     material the planet's own crafting material ('@material' in chest loot, config/chests.js)
     chests   treasure chests out in the wilds: { kind (CHEST_KINDS in config/chests.js), count }
     terrain  the planet's shape (src/world/terrain.js), each part optional, heights in metres:
              hills    { amp, freq }            rolling fractal hills (freq: bumps around the planet, ~2 = 35 m apart)
              ridges   { amp, freq }            sharp mountain ridges
              plateaus { amp, freq, step, sharp }  flat-topped mesas in steps of `step`; sharp 0..1 = ramps..cliffs
              lakes    n                         extra big, deep lakes you can swim in
     palette.cliff / palette.peak   colour of steep slopes and of the highest ground
   --------------------------------------------------------------------- */

export const TRANSITION = {
  outroDelay: 4,          // seconds between the boss falling and the fade (victory banner time)
  fadeTime: 0.9,          // fade out, and fade in again on arrival
  healOnArrival: true,    // the hero lands on a new planet with full HP and mana / stamina
  introHintDelay: 6,      // seconds into the first adventure before the "find the boss" hint
};

export const PLANETS = [
  {
    id: 'lanternmoss', outfit: null, outfitColors: [], lowLevel: 3, name: 'Lanternmoss', tagline: 'a tiny cozy planet of lanterns and moss', seed: 20260930,
    terrain: { hills: { amp: 5, freq: 2.2 }, ridges: { amp: 2, freq: 3.4 }, lakes: 2 },
    palette: { ground: [0x8fd07a, 0x9edb86, 0xb3e393, 0x84c874], meadow: 0xd4eb9c, sand: 0xf3dcaa, bed: 0x5fae9e, cliff: 0xb8ae9c, peak: 0xb6e39a,
      grass: [0x7fc574, 0x9adb7e, 0xa9e28a, 0x8fd07a], water: { deep: 0x3f9cc4, light: 0x9fe8e4 },
      sky: { horizon: 0xffd9ae, mid: 0xf6b1c8, zenith: 0x8d9be6 }, fog: 0xffd6b4 },
    scale: { hp: 1, damage: 1, speed: 1, cooldown: 1, xp: 1 },
    roster: [
      { type: 'goblin', groups: 2, size: 3 }, { type: 'ogre', count: 2 }, { type: 'wisp', count: 3 }, { type: 'slime', count: 4, near: 'ponds' },
    ],
    boss: { type: 'gloomcap', trophy: 'mossCrown', summon: { level: 2, seals: { count: 3, type: 'thornSeal' } }, arena: { wall: 'thorns' } },
    flora: { trees: { blossom: 3, oak: 3, pine: 2, shroom: 2, willow: 1.5, birch: 1 }, treeCount: 56,
      flowers: [0xff8fb1, 0x8ff0ff, 0xffd36b, 0xc5a6ff, 0xffa87a], tallGrass: [0x8fd07a, 0x9adb7e, 0x7fc574] },
    weather: { clear: 5, breezy: 3, rain: 3, storm: 1, fog: 2 },
    wildlife: { critters: [['bunny', 6], ['deer', 3, 'far'], ['frog', 7, 'ponds']], rare: 'goldBunny', birds: 8, flocks: 2 },
    miniBosses: [{ type: 'hydra', near: 'lake' }],
    material: 'glowcap', chests: [{ kind: 'common', count: 7 }, { kind: 'rare', count: 2 }],
    forage: [{ item: 'glowcap', count: 18 }, { item: 'moonberry', count: 14 }, { item: 'featherCharm', count: 1 }, { item: 'moonHopCharm', count: 1 }],
    resources: { nodes: [['branches', 8, 'village'], ['pebbles', 7, 'village'], ['sweetleaf', 7, 'village'], ['branches', 10], ['pebbles', 8],
      ['sweetleaf', 14], ['moonberryBush', 12], ['glowcaps', 10], ['copperVein', 10]], rare: [['amethystVein', 2]] },
    arrival: 'A purple light beyond the lanterns marks the lair of Gloomcap, the Moss King. Break the thorn seals around it to wake it, then defeat it to travel on!',
  },
  {
    id: 'emberfall', outfit: 'neckerchief', outfitColors: [0xe0482a, 0x3a8ad0, 0xffd36b, 0x2f9a5a], lowLevel: 5, name: 'Emberfall', tagline: 'warm winds, ember ponds and quicker foes', seed: 77412,
    terrain: { hills: { amp: 3, freq: 1.9 }, plateaus: { amp: 11, freq: 1.6, step: 3.2, sharp: 0.85 }, lakes: 1 },
    palette: { ground: [0xd99a6c, 0xe0a878, 0xe8b88a, 0xcf8f62], meadow: 0xf0c890, sand: 0xf6d8a8, bed: 0xc9603c, cliff: 0xb0644a, peak: 0xf2c18e,
      grass: [0xc98a50, 0xd89a5a, 0xe0a868, 0xbf7f48], water: { deep: 0xe0603a, light: 0xffb070 },
      sky: { horizon: 0xffc29a, mid: 0xf08a7a, zenith: 0x7a5aa8 }, fog: 0xf6b896 },
    scale: { hp: 1.6, damage: 1.35, speed: 1.1, cooldown: 0.9, xp: 1.5 },
    roster: [
      { type: 'goblin', groups: 2, size: 4 }, { type: 'ramhorn', count: 3 }, { type: 'puffcap', count: 5 }, { type: 'wisp', count: 3 },
      { type: 'slime', count: 3, near: 'ponds' },
    ],
    boss: { type: 'pyrrhax', trophy: 'emberCrown', summon: { level: 4, sigils: { count: 3, item: 'emberSigil', elites: 4 } }, arena: { wall: 'fire' } },
    flora: { trees: { ember: 4, crystal: 2, shroom: 1, pine: 1 }, treeCount: 46, flowers: [0xffb03d, 0xff6a4a, 0xffe08a, 0xff8fb1],
      tallGrass: [0xc98a50, 0xd8a060, 0xb87a40], meadow: 0.6 },
    weather: { clear: 5, breezy: 3, embers: 4, fog: 1 },
    miniBosses: [{ type: 'basilisk', near: 'far' }],
    wildlife: { critters: [['lizard', 7], ['sandHare', 5], ['frog', 3, 'ponds']], rare: 'emberSalamander', birds: 6, flocks: 2,
      plumage: [{ body: 0xff7a4a, belly: 0xffe0b0, wing: 0xd85a2a }, { body: 0xffc04a, belly: 0xfff0c8, wing: 0xe8a030 }, { body: 0x6a4a5a, belly: 0xffa070, wing: 0x4a3040 }],
      fish: [{ body: 0xff6a3a, spot: 0xffe08a, fin: 0xffb070 }, { body: 0xffd36b, fin: 0xfff0a0 }] },
    material: 'emberShard', chests: [{ kind: 'common', count: 7 }, { kind: 'rare', count: 2 }],
    forage: [{ item: 'emberShard', count: 18 }, { item: 'moonberry', count: 12 }, { item: 'featherCharm', count: 1 }, { item: 'moonHopCharm', count: 1 }],
    resources: { nodes: [['branches', 7, 'village'], ['pebbles', 6, 'village'], ['sweetleaf', 6, 'village'], ['branches', 8], ['pebbles', 8],
      ['sweetleaf', 10], ['pepperBush', 12], ['glowcaps', 4], ['emberVein', 10], ['ironVein', 8], ['copperVein', 5]], rare: [['opalVein', 2]] },
    arrival: 'Emberfall! Watch for puffcaps that burst and ramhorns that charge. Pyrrhax the red dragon sleeps under the orange light: the golden elites carry the sigils that wake it.',
  },
  {
    id: 'frostveil', outfit: 'scarf', outfitColors: [0xe0605a, 0x4a7ae0, 0xffc83a, 0xff8fc0], lowLevel: 7, name: 'Frostveil', tagline: 'the last, coldest and fiercest planet', seed: 31415,
    terrain: { hills: { amp: 3, freq: 2.0 }, ridges: { amp: 11, freq: 1.7 }, lakes: 2 },
    palette: { ground: [0xcfe3f0, 0xdbeaf5, 0xe8f2fa, 0xc4dbea], meadow: 0xffffff, sand: 0xe6eef6, bed: 0x7fb6d6, cliff: 0x9aa6c4, peak: 0xffffff,
      grass: [0xa8d8c8, 0xb8e0d8, 0xc8eae0, 0x98ccc0], water: { deep: 0x6fb6e0, light: 0xd8f6ff },
      sky: { horizon: 0xdff0ff, mid: 0xb8c8f0, zenith: 0x6f7fd0 }, fog: 0xd6e6f6 },
    scale: { hp: 2.4, damage: 1.75, speed: 1.2, cooldown: 0.8, xp: 2.2 },
    roster: [
      { type: 'goblin', groups: 2, size: 3 }, { type: 'ogre', count: 3 }, { type: 'thornmole', count: 4 }, { type: 'hexlantern', count: 3 },
      { type: 'ramhorn', count: 3 }, { type: 'puffcap', count: 4 }, { type: 'wisp', count: 2 },
    ],
    boss: { type: 'malgrath', trophy: 'frostCrown', summon: { level: 6, quest: 'frostHearts', night: true }, arena: { wall: 'hellfire' } },
    flora: { trees: { snowpine: 5, birch: 2, crystal: 2 }, treeCount: 54, flowers: [0xbff4ff, 0xd8b8ff, 0xffffff, 0x9fd8ff],
      tallGrass: [0xa8d8c8, 0xc8eae0, 0x98ccc0], meadow: 0.5 },
    weather: { clear: 3, snow: 4, blizzard: 2, fog: 2, breezy: 1 },
    miniBosses: [{ type: 'hydra', near: 'lake', overrides: { name: 'The Frost Hydra, Ice-Fanged', color: 0x7fb8e0, capColor: 0xbff4ff,
      look: { skin: 0x7aa8d0, belly: 0xe8f4ff, fin: 0xbff4ff, eye: 0x9ff3ff } } }],
    wildlife: { critters: [['snowHare', 6], ['reindeer', 3, 'far']], rare: 'auroraHare', birds: 6, flocks: 1,
      plumage: [{ body: 0xffffff, belly: 0xe8f4ff, wing: 0xc8dcf0 }, { body: 0x7fb8ff, belly: 0xffffff, wing: 0x5f98e8 }, { body: 0x3a3a4a, belly: 0xffffff, wing: 0x2a2a38 }],
      fish: [{ body: 0x9ad0ff, spot: 0xffffff, fin: 0xd6ecff }, { body: 0xffffff, spot: 0x7fb8ff, fin: 0xe8f4ff }] },
    material: 'frostPetal', chests: [{ kind: 'common', count: 8 }, { kind: 'rare', count: 3 }],
    forage: [{ item: 'frostPetal', count: 18 }, { item: 'moonberry', count: 12 }, { item: 'featherCharm', count: 1 }, { item: 'moonHopCharm', count: 1 }],
    resources: { nodes: [['branches', 7, 'village'], ['pebbles', 6, 'village'], ['sweetleaf', 6, 'village'], ['branches', 8], ['pebbles', 8],
      ['sweetleaf', 10], ['plumBush', 12], ['frostFlowers', 10], ['ironVein', 10], ['copperVein', 5]], rare: [['diamondVein', 2]] },
    arrival: 'Frostveil, the final planet. Thornmoles tunnel under the snow and hexlanterns shield their friends. Malgrath, the Winged Demon Lord, only rises at night for a hero Tuva trusts.',
  },
];
