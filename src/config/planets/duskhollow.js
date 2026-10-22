/* Planned world: content and release acceptance belong to its own TODO.
   Terrain, endless dusk and the belt lantern: 30a. Flora and wildlife: 30b; economy, weather and music: 30c;
   Wick and the Old Road: 30d; regular enemies: 30e-30f; Grandmother Gloomweaver: 30g; Umbra: 30h. Release: 30i.
   `boss.summon` is Umbra's gate (30d): level 11 and Wick's quest, whose three moonwells stand in the first three
   gaps below. Her fight, trophy and arena arrive with 30h.
   `canopy` is the giant lumen caps overhead, read by src/world/mechanics/lantern.js:
     height       metres the caps hang above the ground (the canopy models arrive in 30b)
     village      radius in metres of the gap the village sits in, the world's safe light
     gaps         the authored gaps of starlight, as { angle (radians around the village), distance (metres),
                  radius (metres of open sky) }; LANTERN.canopy supplies cover, gapCover, villageCover and fade. */
import { DUSK_NPCS, DUSK_HOUSES } from '../duskVillage.js';
export default { id: 'duskhollow', name: 'Duskhollow', act: 2, released: false, secret: false,
  npcs: DUSK_NPCS, houses: DUSK_HOUSES,
  expectedLevel: [10, 13], lowLevel: 12, scale: { hp: 3.4, damage: 2.25, speed: 1.3, cooldown: 0.75, xp: 3.1 },
  seed: 161803, mechanic: 'lantern',
  terrain: { hills: { amp: 3.4, freq: 1.9 }, ridges: { amp: 13, freq: 1.25 }, lakes: 1 },
  canopy: { height: 25, village: 24, gaps: [
    { angle: 0.9, distance: 52, radius: 11 },
    { angle: 2.6, distance: 74, radius: 9 },
    { angle: 4.2, distance: 58, radius: 13 },
    { angle: 5.6, distance: 96, radius: 10 },
    { angle: 3.3, distance: 128, radius: 12 },
  ] },
  palette: { ground: [0x47406a, 0x514a78, 0x3d3760, 0x5b5486], meadow: 0x6f66a8, sand: 0x5a5280, bed: 0x2e2a4a, cliff: 0x3a3558, peak: 0x8e86c0,
    grass: [0x46806e, 0x3d7a6a, 0x529a7e, 0x3a6d60], water: { deep: 0x1b2448, light: 0x5fd0c0 },
    sky: { horizon: 0x6a4e86, mid: 0x3a3366, zenith: 0x161634 }, fog: 0x3b3566 },
  flora: { canopy: { caps: 18, glowcaps: 40, ferns: 26, moonflowers: 22 },   // 30b: the canopy never grows over a gap
    trees: { lumenCap: 1, glowcap: 3 }, flowers: [0xbff4ff, 0xd8b8ff, 0x9ff3c8, 0xfff0a0],
    tallGrass: [0x46806e, 0x529a7e, 0x3a6d60], grass: 0.8, tallCount: 0.6, meadow: 0.5 },
  wildlife: { critters: [['glowSnail', 5], ['lanternBat', 6, 'caps'], ['duskCricket', 7]], rare: 'moonmoth',
    villagePets: false, fireflies: 7, birds: 0, flocks: 0,
    fish: [{ body: 0xe8eef0, spot: 0xcfe4ff, fin: 0xf4fbff }, { body: 0xdfe8ff, spot: 0xffffff, fin: 0xe8f4ff }] },   // pale blind fish in the glowing pools
  roster: [   // 30e: the shades of the hollows, and the mimics hiding among the real glowcaps ('glowcaps' placement)
    { type: 'shadeling', groups: 4, size: 3 }, { type: 'mosslurk', count: 7, near: 'glowcaps' },
    // 30f: the spinners string their own webs where they stand; the thieves roam for lantern oil
    { type: 'gloomweaver', groups: 2, size: 2 }, { type: 'snuffer', count: 6 },
  ],
  weather: { clear: 4, fog: 2, breezy: 2, sporeDrift: 3, deepDark: 2 },   // no rain under the canopy (30c)
  music: 'musicBox', material: 'lumenDust',
  chests: [{ kind: 'common', count: 8 }, { kind: 'rare', count: 3 }],
  forage: [{ item: 'glowcap', count: 10 }, { item: 'spiderSilk', count: 6 }, { item: 'shadeSpores', count: 4 }],
  resources: { nodes: [['branches', 7, 'village'], ['pebbles', 6, 'village'], ['sweetleaf', 5, 'village'],
    ['glowcaps', 12], ['branches', 6], ['pebbles', 6], ['lumenVein', 10], ['ironVein', 6], ['sweetleaf', 6]],
    rare: [['moonstoneVein', 2]] },
  tagline: 'an endless dusk under glowing caps',
  arrival: 'Duskhollow. The caps hold back the sky here, so the day never quite arrives. Keep the lantern on your belt fed, and the moss will light your way home.',
  boss: { type: 'umbra', summon: { level: 11, quest: 'oldRoad' } } };
