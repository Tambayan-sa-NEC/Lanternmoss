/* ---------------------------------------------------------------------
   RESOURCES: gathering, fishing and farming (runtime: src/gameplay/Gathering.js, Fishing.js, Farm.js; node looks:
   src/models/resources.js). Where each planet's nodes grow is PLANETS[i].resources (config/planets.js).

   NODE_KINDS   things growing or lying around that you work with E (or the held tool's use):
     name, verb   the prompt ("Pick the Moonberry bush")
     tool, tier   the tool kind needed (config/items.js TOOL_KINDS) and its least tier; none = by hand
     hits         tool swings before it gives (by hand: one quick pick)
     drops        [[item, n | [min, max]], ...] what it gives each time; extra = [[item, chance]] bonus finds (seeds)
     regrow       seconds before it can be worked again; vanish = it's gone until then (else only its fruit is)
     look, color  the model (src/models/resources.js) and its tint; r = how big it is (reach and spacing)
     rare         a rare node: placed by PLANETS[i].resources.rare, near the planet's mini boss (behind a fight)
   SCENERY      the planet's own trees and rocks (src/world/scatter.js) can be worked too: trees give wood with an
                axe (not crystal spires), rocks give stone with a pickaxe. They never vanish; they rest instead.
   FISHING      cast at a pond, wait for the bite, then stop the needle in the green (a small timing game)
   CROPS        what seeds grow into; `days` = how many full days of watered growth (config/day.js DAY.length)
   FARM         the plot by each village: tilled with a hoe, planted with seeds, watered with a can (or by rain)
   --------------------------------------------------------------------- */

export const GATHER = {
  reach: 1.6,                 // metres from a node's edge where E works
  swing: 0.45,                // seconds per tool swing
  pick: 0.5,                  // seconds to pick something by hand
  cancelMove: 0.5,            // walking this far away stops the job
};

export const NODE_KINDS = {
  // ---- by hand: everywhere (starting materials: wood and stone for your first tools)
  branches: { name: 'Fallen branches', verb: 'Gather', look: 'branches', color: 0xb0703a, drops: [['wood', [2, 3]]], regrow: 150, vanish: true, r: 0.7 },
  pebbles: { name: 'Loose stones', verb: 'Gather', look: 'pebbles', color: 0xb6aec8, drops: [['stone', [2, 3]]], regrow: 150, vanish: true, r: 0.6 },
  sweetleaf: { name: 'Sweetleaf', verb: 'Pick', look: 'herb', color: 0x7fd07a, drops: [['sweetleaf', [1, 2]]],
    extra: [['carrotSeeds', 0.2], ['wheatSeeds', 0.14], ['pumpkinSeeds', 0.06]], regrow: 120, vanish: true, r: 0.5 },
  // ---- by hand: each planet's own berries, mushrooms and flowers
  moonberryBush: { name: 'Moonberry bush', verb: 'Pick', look: 'bush', color: 0xc7a8ff, leaf: 0x5fa85a, drops: [['moonberry', [2, 3]]], regrow: 180, r: 0.9 },
  pepperBush: { name: 'Fire pepper bush', verb: 'Pick', look: 'bush', color: 0xff4a3a, leaf: 0x8a9a3a, drops: [['firePepper', [2, 3]]], regrow: 180, r: 0.9 },
  plumBush: { name: 'Snow plum bush', verb: 'Pick', look: 'bush', color: 0x7fa8ff, leaf: 0xa8d0c8, drops: [['snowPlum', [2, 3]]], regrow: 180, r: 0.9 },
  glowcaps: { name: 'Glowcap patch', verb: 'Pick', look: 'caps', color: 0x9ff0ff, drops: [['glowcap', [2, 3]]], regrow: 160, r: 0.6 },
  frostFlowers: { name: 'Frost flowers', verb: 'Pick', look: 'flowers', color: 0xbff4ff, drops: [['frostPetal', [2, 3]]], regrow: 160, r: 0.6 },
  // ---- mining: a pickaxe
  copperVein: { name: 'Copper vein', verb: 'Mine', tool: 'pick', tier: 1, hits: 3, look: 'vein', color: 0xd8844a, drops: [['copperOre', [1, 2]], ['stone', [0, 1]]], regrow: 240, r: 1.0 },
  emberVein: { name: 'Ember vein', verb: 'Mine', tool: 'pick', tier: 1, hits: 3, look: 'vein', color: 0xff8a4a, glow: true, drops: [['emberShard', [1, 2]], ['stone', [0, 1]]], regrow: 240, r: 1.0 },
  ironVein: { name: 'Iron vein', verb: 'Mine', tool: 'pick', tier: 2, hits: 4, look: 'vein', color: 0x8a8fa8, drops: [['ironOre', [1, 2]], ['stone', [0, 1]]], regrow: 300, r: 1.0 },
  amethystVein: { name: 'Amethyst vein', verb: 'Mine', tool: 'pick', tier: 2, hits: 5, look: 'vein', color: 0xb070ff, glow: true, drops: [['amethyst', 1]], regrow: 600, r: 1.1, rare: true },
  opalVein: { name: 'Fire opal vein', verb: 'Mine', tool: 'pick', tier: 2, hits: 5, look: 'vein', color: 0xff6a3a, glow: true, drops: [['fireOpal', 1]], regrow: 600, r: 1.1, rare: true },
  diamondVein: { name: 'Frost diamond vein', verb: 'Mine', tool: 'pick', tier: 2, hits: 5, look: 'vein', color: 0xbff4ff, glow: true, drops: [['frostDiamond', 1]], regrow: 600, r: 1.1, rare: true },
};

export const SCENERY = {
  tree: { verb: 'Chop', tool: 'axe', tier: 1, hits: 3, drops: [['wood', [2, 3]]], rest: 180, reach: 1.3 },
  rock: { verb: 'Mine', tool: 'pick', tier: 1, hits: 3, drops: [['stone', [2, 3]]], rest: 180, reach: 1.1 },
};

export const FISHING = {
  reach: 2.6,                 // stand within this of a pond's edge (or wade in)
  cast: 2.6,                  // the float lands this far out from the hero (kept inside the water)
  bite: [2.5, 6],             // seconds until something bites
  react: 2.4,                 // seconds to press E after the bite before it swims off
  meter: { sweeps: 1.25, zone: 0.26, time: 4 },   // needle sweeps per second, green zone (share of the bar), time to reel
  // per planet index: [[item, weight]]; a big lake (radius >= lakeRadius) makes the golden koi likelier (x lakeBonus)
  catches: [
    [['pondPerch', 80], ['goldenKoi', 5]],
    [['cinderEel', 80], ['goldenKoi', 5]],
    [['iceTrout', 80], ['goldenKoi', 5]],
  ],
  lakeRadius: 8, lakeBonus: 3,
  feel: { goldenKoi: { zone: 0.13, sweeps: 1.7 } },   // harder fish: a smaller zone, a quicker needle
};

export const CROPS = {
  carrot: { name: 'Moon Carrot', seed: 'carrotSeeds', harvest: [['moonCarrot', [2, 3]]], days: 0.6,
    look: { leaf: 0x6fbf62, fruit: 0xff9a3a, kind: 'root' } },
  wheat: { name: 'Sun Wheat', seed: 'wheatSeeds', harvest: [['sunWheat', [3, 4]], ['wheatSeeds', [0, 1]]], days: 0.8,
    look: { leaf: 0x9acf62, fruit: 0xf0c860, kind: 'stalks' } },
  pumpkin: { name: 'Pumpkin', seed: 'pumpkinSeeds', harvest: [['pumpkin', [1, 2]], ['pumpkinSeeds', [0, 1]]], days: 1.3,
    look: { leaf: 0x5fa85a, fruit: 0xf08a2a, kind: 'gourd' } },
};

export const FARM = {
  grid: [3, 2],               // plots across, rows
  spacing: 1.75,              // metres between plot centres
  distance: [15, 24],         // from the village centre
  reach: 1.2,                 // metres from a plot's centre where E works on it
  rainWaters: ['rain', 'storm', 'snow', 'blizzard'],   // weather that waters every planted plot (config/weather.js)
};
