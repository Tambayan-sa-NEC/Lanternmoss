/* CAVE LAYOUT (config/dungeons.js): rooms on a grid, joined into a tree by a seeded walk, so every room is reachable
   and the same seed always gives the same cave (room ids, kinds, positions, doors). Pure (no scene / DOM),
   unit-tested in tests/caveLayout.test.mjs. Coordinates are the cave's own flat floor: x across, z down the screen;
   the entrance room is at (0, 0) and its mouth on its +z (south) wall. */
import { CAVE, CAVE_VEINS, ROOM_KIT } from '../config/dungeons.js';
import { mulberry32 } from '../utils/random.js';

const OVERLAP = 0.6;
export const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const OPPOSITE = { n: 's', e: 'w', s: 'n', w: 'e' };

/** The cave for `cave` (a CAVES entry) and a seed: { id, rooms, links, entrance, end, mouth }. */
export function generateCave(cave, seed) {
  const rng = mulberry32((seed ^ cave.salt) >>> 0);
  const [lo, hi] = cave.rooms, count = lo + Math.floor(rng() * (hi - lo + 1));
  const rooms = [], at = new Map(), key = (x, z) => `${x},${z}`;
  const add = (gx, gz, depth) => {
    const r = { id: `${cave.id}:r${rooms.length}`, n: rooms.length, gx, gz, depth, kind: 'hall', doors: { n: null, e: null, s: null, w: null } };
    rooms.push(r); at.set(key(gx, gz), r); return r;
  };
  add(0, 0, 0);
  const links = [];
  for (let guard = 0; rooms.length < count && guard < 500; guard++) {
    const from = rooms[Math.floor(rng() * rooms.length)];
    const free = Object.entries(DIRS).filter(([d, [dx, dz]]) => !(from.n === 0 && d === 's') && !at.has(key(from.gx + dx, from.gz + dz)));
    if (!free.length) continue;
    const [d, [dx, dz]] = free[Math.floor(rng() * free.length)];
    const to = add(from.gx + dx, from.gz + dz, from.depth + 1);
    from.doors[d] = to.id; to.doors[OPPOSITE[d]] = from.id; links.push({ a: from.id, b: to.id, dir: d });
  }
  const end = rooms.slice(1).reduce((best, r) => (r.depth > best.depth ? r : best), rooms[1] ?? rooms[0]);
  for (const r of rooms) {
    r.kind = r.n === 0 ? 'entrance' : r === end ? 'end' : rng() < 0.45 ? 'chamber' : 'hall';
    const k = ROOM_KIT[r.kind]; r.w = k.w; r.d = k.d; r.x = r.gx * CAVE.cell; r.z = r.gz * CAVE.cell;
  }
  const entrance = rooms[0];
  return { id: cave.id, rooms, links, entrance: entrance.id, end: end.id, mouth: { x: 0, z: entrance.d / 2 - 0.6 } };
}

/** Floor rectangles: every room, and a corridor along each link. A corridor reaches OVERLAP into both rooms, so a
    walker's margin at a room wall never leaves a gap in the doorway. */
export function floorRects(layout) {
  const byId = new Map(layout.rooms.map(r => [r.id, r])), out = layout.rooms.map(r => ({ room: r.id, x0: r.x - r.w / 2, x1: r.x + r.w / 2, z0: r.z - r.d / 2, z1: r.z + r.d / 2 }));
  const half = CAVE.corridor / 2, o = OVERLAP;
  for (const l of layout.links) {
    const a = byId.get(l.a), b = byId.get(l.b);
    if (l.dir === 'e' || l.dir === 'w') {
      const [left, right] = a.x < b.x ? [a, b] : [b, a];
      out.push({ corridor: `${l.a}|${l.b}`, x0: left.x + left.w / 2 - o, x1: right.x - right.w / 2 + o, z0: a.z - half, z1: a.z + half });
    } else {
      const [top, bottom] = a.z < b.z ? [a, b] : [b, a];
      out.push({ corridor: `${l.a}|${l.b}`, x0: a.x - half, x1: a.x + half, z0: top.z + top.d / 2 - o, z1: bottom.z - bottom.d / 2 + o });
    }
  }
  return out;
}

/** Can a walker of `radius` stand at (x, z)? Its whole footprint must be on the floor of one room or corridor, or
    straddle a doorway (a room and its corridor overlap there). */
export function walkable(rects, x, z, radius = 0.35) {
  const inside = (r, m) => x >= r.x0 + m && x <= r.x1 - m && z >= r.z0 + m && z <= r.z1 - m;
  if (rects.some(r => inside(r, radius))) return true;
  // in a doorway: on the floor of some rect with the margin across the corridor only
  return rects.some(r => r.corridor && inside(r, 0) &&
    ((r.x1 - r.x0 > r.z1 - r.z0) ? z >= r.z0 + radius && z <= r.z1 - radius : x >= r.x0 + radius && x <= r.x1 - radius));
}

/* ---------------------------------------------------------------- the rewards in the rooms (29d)
   Fixtures are placed from the room's own id, not from the generation order, so a room keeps its chest and its
   veins whatever else changes, and a saved cave rebuilds exactly the same ones. Spots hug the walls at
   CAVE.reward.veinInset and stay clear of every doorway (a door gap is CAVE.corridor wide, centred on its wall),
   so nothing a cave gives out can block the way through. The entrance room stays empty: it is the safe room. */

/** A small stable hash of a string, for a per-room random stream. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** The six wall spots a room can put a vein in, clear of its doorways: [x, z] in cave coordinates. */
function veinSpots(r) {
  const m = CAVE.reward.veinInset, hw = r.w / 2 - m, hd = r.d / 2 - m;
  return [[r.x - r.w * 0.3, r.z - hd], [r.x + r.w * 0.3, r.z - hd],
    [r.x - hw, r.z - r.d * 0.34], [r.x - hw, r.z + r.d * 0.34],
    [r.x + hw, r.z - r.d * 0.34], [r.x + hw, r.z + r.d * 0.34]];
}

/** Where a room's monsters come in: clear of its chest at the centre and of its walls. */
function spawnSpots(r) {
  const m = CAVE.reward.spawnInset, hw = Math.max(0, r.w / 2 - m), hd = Math.max(0, r.d / 2 - m);
  return [[r.x - hw * 0.8, r.z + hd * 0.6], [r.x + hw * 0.8, r.z + hd * 0.6], [r.x, r.z - hd * 0.8]];
}

/** Every reward a cave holds: { chests, veins, spawns }, each entry with a stable id and room coordinates.
    Pure and deterministic: the same cave and layout always give the same fixtures. */
export function caveFixtures(layout, cave) {
  const chests = [], veins = [], spawns = [], [lo, hi] = cave.veins ?? [0, 0];
  for (const r of layout.rooms) {
    if (r.id === layout.entrance) continue;                       // the way in stays a safe, empty room
    const rng = mulberry32(hash(`${r.id}:rewards`));
    const kind = r.id === layout.end ? cave.endChest : r.kind === 'chamber' ? cave.chest : null;
    if (kind) chests.push({ id: `${r.id}:chest`, room: r.id, kind, x: r.x, z: r.z });
    const spots = veinSpots(r), n = Math.min(spots.length, lo + Math.floor(rng() * (hi - lo + 1)));
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    for (let i = 0; i < n && cave.ore; i++) veins.push({ id: `${r.id}:v${i}`, room: r.id, kind: cave.ore, x: spots[i][0], z: spots[i][1] });
    for (const [x, z] of spawnSpots(r)) spawns.push({ room: r.id, x, z });
  }
  return { chests, veins, spawns };
}

/** How far a fixture of `kind` reaches out (m), for placement checks. */
export const veinRadius = kind => CAVE_VEINS[kind]?.r ?? 1;

/** The room (id) containing (x, z), or null in a corridor. */
export function roomAt(layout, x, z) {
  return layout.rooms.find(r => Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2)?.id ?? null;
}
