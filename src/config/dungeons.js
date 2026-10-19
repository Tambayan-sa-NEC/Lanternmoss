/* CAVES (TODO 29): a cave per main planet, entered from the surface, built from a kit of rooms joined from a seed
   (layout rules: src/world/caveLayout.js; the 3D rooms: src/world/caves.js; entering, walking and leaving:
   src/gameplay/Dungeons.js). Caves are dark: the shared local light (render/lighting.js) lights them.
     CAVE      shared rules
       cell        the grid step between room centres (m); rooms sit on a grid, joined by corridors
       corridor    a corridor's width (m), and so each doorway's
       wallHeight  how tall the walls are drawn (m)
       darkness    the local-light darkness inside (1 = fully dark: the hero's light and the lanterns show the way)
       lantern     each room's lanterns: their light radius (m), colour and strength
       mouthReach  how near the cave mouth (m) "Leave the cave" is offered; stepping back onto it also leaves
       motion      sweep: maximum wall-check step (m), waypointReach: distance at which a route point is reached (m)
       entrance    where a planet's cave mouth stands on the surface: distance from the village square (m) and the
                   clearance it needs (m)
       reward    cave rewards (29d, runtime src/gameplay/CaveRewards.js): chestReach/veinReach are how near (m) E
                 offers a chest or a vein; veinInset keeps a room's fixtures off its walls (m) and spawnInset does
                 the same for its monsters; clearedBy is how many monsters must fall for a room to count as cleared
       puzzle    the way to the end room (29e, runtime src/gameplay/CavePuzzles.js): reach is how near (m) E lights a
                 lantern switch or works the locked door; switches/stones is how many a puzzle room holds; plateRadius
                 is how near a stone's centre must be to press a plate (m); stoneRadius is a push stone's footprint
                 and pushSpeed how fast it slides; inset keeps the puzzle off the room's walls (m)
       guardian  the end room's keeper: how much tougher it is than its ordinary kind (the same shape as the planets'
                 ELITE), and the halo that marks it
       shortcut  the way home the guardian's fall opens: how near (m) E takes it
     ROOM_KIT  the room pieces: w x d (m) of floor, and how many lanterns stand in it. `entrance` starts every cave,
               `end` is its farthest room, `hall` and `chamber` fill the rest (picked by the seed).
     CAVE_VEINS  the ore veins that only grow in caves (the mining fields of config/resources.js NODE_KINDS:
                 verb, tool, tier, hits, drops). Cave ore is found nowhere on the surface.
     CAVES     per planet: id (stable: room ids derive from it), name, released (the surface mouth only appears for
               a released cave; 29f releases the original worlds' caves), seed salt, rooms [min, max] and colours,
               its rewards: `ore` (a CAVE_VEINS kind), `veins` [min, max] per room, `chest` (a CHEST_KINDS kind
               for an ordinary room) and `endChest` (the end room's); and its way in to the end (29e): `puzzle`
               ('lanterns' or 'stones'), `guardian` (a COMBAT.enemies type, made into the cave's keeper) and
               `guardianLoot` (a LOOT_TABLES id). 29f gives each world its own ore and roster.
   Room ids are `${cave.id}:r${n}`, numbered in generation order, so the same planet always builds the same cave. */
export const CAVE = {
  cell: 16, corridor: 2.6, wallHeight: 3.4, darkness: 1,
  lantern: { radius: 6.5, color: 0xffc77a, intensity: 1.1 },
  mouthReach: 1.6,
  motion: { sweep: 0.2, waypointReach: 0.3 },
  entrance: { distance: [34, 60], clearance: 3 },
  reward: { chestReach: 2.2, veinReach: 2.2, veinInset: 1.9, spawnInset: 2.4, clearedBy: 1 },
  puzzle: { reach: 1.8, switches: 3, stones: 2, plateRadius: 0.9, stoneRadius: 0.55, pushSpeed: 1.9, inset: 2.0 },
  guardian: { hp: 2.6, damage: 1.3, xp: 2.5, scale: 1.3, halo: 0xbf7aff },
  shortcut: { reach: 1.8 },
};

/* Cave ore: mined with a pickaxe, like a surface vein, but these kinds are never placed on a planet's surface
   (config/resources.js owns those), so gloomquartz can only come out of a cave. */
export const CAVE_VEINS = {
  gloomVein: { name: 'Gloomquartz vein', verb: 'Mine', tool: 'pick', tier: 1, hits: 4, color: 0x9f8cff, glow: true,
    drops: [['gloomquartz', [1, 2]], ['stone', [0, 1]]], r: 1.0 },
  cinderVein: { name: 'Cinderquartz vein', verb: 'Mine', tool: 'pick', tier: 1, hits: 4, color: 0xff9a5a, glow: true,
    drops: [['cinderquartz', [1, 2]], ['stone', [0, 1]]], r: 1.0 },
  rimeVein: { name: 'Rimequartz vein', verb: 'Mine', tool: 'pick', tier: 2, hits: 4, color: 0xbfe8ff, glow: true,
    drops: [['rimequartz', [1, 2]], ['stone', [0, 1]]], r: 1.0 },
};

export const ROOM_KIT = {
  entrance: { w: 8, d: 8, lanterns: 2 },
  hall: { w: 9, d: 7, lanterns: 2 },
  chamber: { w: 12, d: 11, lanterns: 3 },
  end: { w: 13, d: 13, lanterns: 4 },
};

export const CAVES = {
  lanternmoss: { id: 'lanternmoss-cave', name: 'Mossroot Hollow', released: true, salt: 0x3a7e, rooms: [5, 7],
    colors: { floor: 0x55604a, wall: 0x3f4639, accent: 0x9fe08a },
    ore: 'gloomVein', veins: [1, 2], chest: 'common', endChest: 'rare',
    puzzle: 'lanterns', guardian: 'ogre', guardianLoot: 'caveGuardian', guardianExtra: [['gloomquartz', 3]],
    lantern: 0xffc77a,
    roster: [{ type: 'goblin', count: 3 }, { type: 'wisp', count: 2 }, { type: 'slime', count: 1 }] },
  emberfall: { id: 'emberfall-cave', name: 'Cinder Warren', released: true, salt: 0x51c3, rooms: [6, 8],
    colors: { floor: 0x6a4a3a, wall: 0x4a3028, accent: 0xff9a5a },
    ore: 'cinderVein', veins: [1, 2], chest: 'common', endChest: 'rare',
    puzzle: 'stones', guardian: 'ramhorn', guardianLoot: 'caveGuardian', guardianExtra: [['cinderquartz', 3]],
    lantern: 0xffa05a,
    roster: [{ type: 'goblin', count: 3 }, { type: 'puffcap', count: 3 }, { type: 'ramhorn', count: 2 }] },
  frostveil: { id: 'frostveil-cave', name: 'Rimeglass Grotto', released: true, salt: 0x2bf1, rooms: [6, 8],
    colors: { floor: 0x5a6a7a, wall: 0x3e4a58, accent: 0xbfe8ff },
    ore: 'rimeVein', veins: [1, 2], chest: 'common', endChest: 'rare',
    puzzle: 'lanterns', guardian: 'hexlantern', guardianLoot: 'caveGuardian', guardianExtra: [['rimequartz', 3]],
    lantern: 0xbfe0ff,
    roster: [{ type: 'thornmole', count: 3 }, { type: 'hexlantern', count: 2 }, { type: 'goblin', count: 3 }] },
};
