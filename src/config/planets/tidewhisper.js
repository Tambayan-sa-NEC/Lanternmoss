// Terrain/tides: 27a; flora/wildlife: 27b; economy/weather/music: 27c; village: 27d; regular enemies: 27e; Old Ironclaw: 27f; Mirelure: 27g. Release: 27h.
import { COASTAL_NPCS, COASTAL_HOUSES } from '../coastalVillage.js';
export default { id: 'tidewhisper', name: 'Tidewhisper', act: 2, released: false, secret: false,
  village:{coastal:true},outfit:'beach',outfitColors:[0x4bacc0,0xf4d18a,0xff987b,0x6dc39b],npcs:COASTAL_NPCS,houses:COASTAL_HOUSES,
  expectedLevel: [7, 10], lowLevel: 9,
  roster: [   // coastal groups: near 'beach' | 'shallows' | 'surf' (src/combat/spawning.js); the returning wisps glow sea-green
    { type: 'shellback', groups: 3, size: 3, near: 'beach' }, { type: 'jellybell', count: 8, near: 'shallows' }, { type: 'surfSkipper', count: 6, near: 'surf' },
    { type: 'wisp', count: 3, overrides: { color: 0x5fe8c0, look: { robe: 0x1d5a56, face: 0x0e3438 } } },
  ], scale: { hp: 2.9, damage: 2, speed: 1.25, cooldown: 0.78, xp: 2.6 },
  material: 'seaglass', music: 'seaWaltz', weather: { clear: 5, breezy: 3, seaMist: 2, squall: 2 },
  forage: [], // Coastal gathering/washups supply the loose materials; do not inherit Act I forage.
  chests: [{ kind: 'common', count: 8 }, { kind: 'rare', count: 3 }],
  resources: { coastal: true, catches: [['silverSprat',80],['goldenKoi',3]], nodes: [['driftwood',6],['shells',6],['seaweed',5],['seaglass',6],['saltPan',4],['clamBed',6],['coralReef',5],['shipwreckIron',3],['pebbles',6,'village'],['sweetleaf',5,'village']], rare: [['blackPearlBed',2]] },
  seed: 271828, mechanic: 'tides', physics: { seaLevel: 71, seaMaxLevel: 72.5 },
  tides: { low: 71, high: 72.5, lowAt: 0.4, drainLevel: 68.8, drainSeconds: 40 },
  terrain: { archipelago: { bed: -4, islands: [
    { angle: 0, distance: 0, radius: 43, height: 4.5 },
    { angle: 0, distance: 55, radius: 18, height: 3 },
    { angle: 0, distance: 110, radius: 26, height: 3 },
    { angle: 2.2, distance: 90, radius: 22, height: 3.7 },
    { angle: 4.5, distance: 128, radius: 21, height: 3.2 },
    { angle: 3.4, distance: 185, radius: 17, height: 2.8 },
  ], bars: [{ from: 0, to: 1, width: 3, height: -0.65 }, { from: 1, to: 2, width: 2.8, height: -0.65 }],
  lagoon: { island: 2, radius: 18, bed: -2.5 } } },
  palette: { ground: [0x79c9ab, 0x8bd6b6, 0x9ae0c2, 0x6fbca5], meadow: 0xa5dfb5, sand: 0xf4dfb2, bed: 0xd0c4a8, cliff: 0xa8bbc0, peak: 0xbce8c3,
    grass: [0x70bda0, 0x88ceb0, 0x91d7b7, 0x79c9ab], water: { deep: 0x176997, light: 0x67e0db },
    sky: { horizon: 0xffd4b0, mid: 0xabe3df, zenith: 0x6bbacb }, fog: 0xcce9df },
  tagline: 'islands, lanterns and the turning tide',
  flora:{trees:{lanternPalm:1,kelp:1,coralFan:1},coastal:{trees:{lanternPalm:18,kelp:12,coralFan:10},plants:{duneGrass:64,seaThrift:28,seaLavender:28}},grass:.35,tallCount:0,meadow:0},
  wildlife:{coastal:true,villagePets:false,critters:[['hermitCrab',6,'beach'],['seaTurtle',4,'beach'],['harborSeal',3,'rocks']],rare:'pearlTurtle',
    birds:6,flocks:1,plumage:[{species:'gull',body:0xf4f6ee,belly:0xffffff,wing:0xa5b6bd},{species:'tern',body:0xd7e3e7,belly:0xffffff,wing:0x778f9d}],
    shoals:3,fishPerShoal:8,lanternfish:8},
  arrival: 'Tidewhisper. Afternoon low tide opens the sandbars; at night the sea takes them back. The village and farm stay above high water.',
  miniBosses: [{ type: 'ironclaw', near: 'pearlBeach' }],   // guards the black pearl beds on the far beach (27f)
  boss: { type: 'mirelure', trophy: 'tideCrown', summon:{level:8,quest:'darkLighthouse',lowTide:true}, arena: { wall: 'surf' } } };
