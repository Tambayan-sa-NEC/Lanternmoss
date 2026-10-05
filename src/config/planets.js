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
              each planet has its own boss type, and with it its own AI (gloomcap -> pyrrhax the dragon -> malgrath);
              trophy = item id (config/items.js) given to the hero when it falls
     forage   items lying around the planet to pick up: { item, count }
     material the planet's own crafting material ('@material' in chest loot, config/chests.js)
     chests   treasure chests out in the wilds: { kind (CHEST_KINDS in config/chests.js), count }
   --------------------------------------------------------------------- */

export const TRANSITION = {
  outroDelay: 4,          // seconds between the boss falling and the fade (victory banner time)
  fadeTime: 0.9,          // fade out, and fade in again on arrival
  healOnArrival: true,    // the hero lands on a new planet with full HP and mana / stamina
  introHintDelay: 6,      // seconds into the first adventure before the "find the boss" hint
};

export const PLANETS = [
  {
    name: 'Lanternmoss', tagline: 'a tiny cozy planet of lanterns and moss', seed: 20260930,
    palette: { ground: [0x8fd07a, 0x9edb86, 0xb3e393, 0x84c874], meadow: 0xd4eb9c, sand: 0xf3dcaa, bed: 0x5fae9e,
      grass: [0x7fc574, 0x9adb7e, 0xa9e28a, 0x8fd07a], water: { deep: 0x3f9cc4, light: 0x9fe8e4 },
      sky: { horizon: 0xffd9ae, mid: 0xf6b1c8, zenith: 0x8d9be6 }, fog: 0xffd6b4 },
    scale: { hp: 1, damage: 1, speed: 1, cooldown: 1, xp: 1 },
    roster: [
      { type: 'goblin', groups: 2, size: 3 }, { type: 'ogre', count: 2 }, { type: 'wisp', count: 3 }, { type: 'slime', count: 4, near: 'ponds' },
    ],
    boss: { type: 'gloomcap', trophy: 'mossCrown' },
    material: 'glowcap', chests: [{ kind: 'common', count: 4 }, { kind: 'rare', count: 1 }],
    forage: [{ item: 'glowcap', count: 8 }, { item: 'moonberry', count: 6 }, { item: 'featherCharm', count: 1 }, { item: 'moonHopCharm', count: 1 }],
    arrival: 'A purple light beyond the lanterns marks the lair of Gloomcap, the Moss King. Defeat it to travel on!',
  },
  {
    name: 'Emberfall', tagline: 'warm winds, ember ponds and quicker foes', seed: 77412,
    palette: { ground: [0xd99a6c, 0xe0a878, 0xe8b88a, 0xcf8f62], meadow: 0xf0c890, sand: 0xf6d8a8, bed: 0xc9603c,
      grass: [0xc98a50, 0xd89a5a, 0xe0a868, 0xbf7f48], water: { deep: 0xe0603a, light: 0xffb070 },
      sky: { horizon: 0xffc29a, mid: 0xf08a7a, zenith: 0x7a5aa8 }, fog: 0xf6b896 },
    scale: { hp: 1.6, damage: 1.35, speed: 1.1, cooldown: 0.9, xp: 1.5 },
    roster: [
      { type: 'goblin', groups: 2, size: 4 }, { type: 'ramhorn', count: 3 }, { type: 'puffcap', count: 5 }, { type: 'wisp', count: 3 },
      { type: 'slime', count: 3, near: 'ponds' },
    ],
    boss: { type: 'pyrrhax', trophy: 'emberCrown' },
    material: 'emberShard', chests: [{ kind: 'common', count: 4 }, { kind: 'rare', count: 1 }],
    forage: [{ item: 'emberShard', count: 8 }, { item: 'moonberry', count: 5 }, { item: 'featherCharm', count: 1 }, { item: 'moonHopCharm', count: 1 }],
    arrival: 'Emberfall! Watch for puffcaps that burst and ramhorns that charge. Pyrrhax the red dragon waits under the orange light.',
  },
  {
    name: 'Frostveil', tagline: 'the last, coldest and fiercest planet', seed: 31415,
    palette: { ground: [0xcfe3f0, 0xdbeaf5, 0xe8f2fa, 0xc4dbea], meadow: 0xffffff, sand: 0xe6eef6, bed: 0x7fb6d6,
      grass: [0xa8d8c8, 0xb8e0d8, 0xc8eae0, 0x98ccc0], water: { deep: 0x6fb6e0, light: 0xd8f6ff },
      sky: { horizon: 0xdff0ff, mid: 0xb8c8f0, zenith: 0x6f7fd0 }, fog: 0xd6e6f6 },
    scale: { hp: 2.4, damage: 1.75, speed: 1.2, cooldown: 0.8, xp: 2.2 },
    roster: [
      { type: 'goblin', groups: 2, size: 3 }, { type: 'ogre', count: 3 }, { type: 'thornmole', count: 4 }, { type: 'hexlantern', count: 3 },
      { type: 'ramhorn', count: 3 }, { type: 'puffcap', count: 4 }, { type: 'wisp', count: 2 },
    ],
    boss: { type: 'malgrath', trophy: 'frostCrown' },
    material: 'frostPetal', chests: [{ kind: 'common', count: 5 }, { kind: 'rare', count: 2 }],
    forage: [{ item: 'frostPetal', count: 8 }, { item: 'moonberry', count: 5 }, { item: 'featherCharm', count: 1 }, { item: 'moonHopCharm', count: 1 }],
    arrival: 'Frostveil, the final planet. Thornmoles tunnel under the snow and hexlanterns shield their friends. Malgrath, the Winged Demon Lord, waits under the crimson light.',
  },
];
