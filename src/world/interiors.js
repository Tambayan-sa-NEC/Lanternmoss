/* HOUSE INTERIORS: small rooms built on demand far away from the planet (beyond the camera's reach from anywhere on
   it), so they never mix with the world. Local frame: x right, y up, z toward the camera / the door. The walls nearest
   the camera stay low (a dollhouse cut-away) so the room is always visible.
   buildRoom(def, layout) -> { root, shape, obstacles [{ x, z, r }], spots [{ kind, x, z }], entrance { x, z }, residentAt,
   bedAt, tableAt, dispose() }. Furniture kinds: see ANCHORS; config/houses.js lists which a house has. */
import * as THREE from 'three';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';

const V3 = THREE.Vector3;
/** Where rooms are built: thousands of units from the planet (whose camera far plane is 1500). */
export const ROOM_ORIGIN = new V3(0, 3000, 0);
export const ROOM_UP = new V3(0, 1, 0);

const WOOD = 0x9a6a4a, WOOD_DK = 0x6a4430, CREAM = 0xfff1d6, FLOOR = 0xc98f6a, FLOOR2 = 0xb57e5c;

/** Furniture spots per layout: [x, z, rotationY], a list when a house can have several of a kind. */
const ANCHORS = {
  mushroom: {
    bed: [-2.6, -2.1, 0.55], table: [1.3, 0.2, 0], rug: [0, 0.7, 0], chest: [-3.3, 0.8, 1.4], lamp: [-2.2, -3.5, 0], plant: [3.4, 1.2, 0],
    bookshelf: [[0.7, -4.0, 0], [-1.3, -3.85, 0.35]], telescope: [2.8, -2.3, -0.6], instruments: [2.6, -2.6, -0.5], kettle: [2.8, -2.2, -0.6],
    yarn: [-1.3, 1.5, 0], window: [-0.6, -4.45, 0], fireplace: [0.4, -4.1, 0], anvil: [2.5, -1.7, -0.4],
  },
  cottage: {
    oven: [-3.0, -2.5, 0], counter: [-0.7, -1.3, 0], bed: [3.0, -2.2, 0], table: [2.1, 0.7, 0], rug: [0, 0.9, 0], chest: [-3.4, 1.1, 1.57],
    shelf: [1.1, -3.05, 0], bookshelf: [[-1.4, -3.05, 0], [1.3, -3.05, 0]], lamp: [3.5, 1.7, 0], plant: [-3.5, -0.3, 0],
    window: [-2.2, -3.35, 0], fireplace: [0.1, -3.05, 0], anvil: [-2.0, -0.9, 0], kettle: [-3.0, -2.5, 0],
  },
};
/** Collision radius of solid furniture (rugs, windows and yarn are walk-through). */
const SOLID = { bed: 1.0, table: 0.85, chest: 0.55, lamp: 0.3, plant: 0.4, bookshelf: 0.75, telescope: 0.45, instruments: 0.55, kettle: 0.5,
  fireplace: 0.8, anvil: 0.55, oven: 1.0, counter: 1.1, shelf: 0.5 };
/** Furniture you can use (an "E ..." prompt within reach). */
const INTERACTIVE = new Set(['bed', 'chest', 'bookshelf', 'kettle', 'oven', 'instruments', 'telescope', 'fireplace', 'anvil']);

// ---------------------------------------------------------------- furniture
const F = {
  bed(g) {
    addTo(g, part(G.box(1.3, 0.4, 2.1), WOOD), [0, 0.2, 0]);
    addTo(g, part(G.box(1.2, 0.2, 2.0), 0xfff6ee), [0, 0.5, 0]);
    addTo(g, part(G.box(1.24, 0.12, 1.3), 0x8fb8ff), [0, 0.64, 0.32]);
    addTo(g, part(G.box(0.8, 0.18, 0.4), 0xffffff), [0, 0.68, -0.68]);
    addTo(g, part(G.box(1.3, 0.8, 0.12), WOOD_DK), [0, 0.5, -1.04]);
  },
  table(g) {
    addTo(g, part(G.cyl(0.75, 0.75, 0.1, 10), WOOD), [0, 0.78, 0]);
    addTo(g, part(G.cyl(0.12, 0.18, 0.78, 6), WOOD_DK), [0, 0.39, 0]);
    for (const a of [1, -1.8]) addTo(g, part(G.cyl(0.26, 0.26, 0.45, 7), WOOD), [Math.sin(a) * 1.05, 0.22, Math.cos(a) * 1.05]);
    addTo(g, part(G.cyl(0.11, 0.09, 0.16, 7), 0xffffff), [0.25, 0.91, 0.1]);
  },
  rug(g) { addTo(g, part(G.cyl(1.6, 1.6, 0.03, 16), 0xe07a8a), [0, 0.02, 0]); addTo(g, part(G.cyl(1.2, 1.2, 0.035, 16), 0xffd36b), [0, 0.025, 0]); },
  chest(g) {                                                       // lid hinged at the back (g.userData.lid; opens with rotation.x < 0)
    addTo(g, part(G.box(1.0, 0.55, 0.65), 0xb0703a), [0, 0.28, 0]);
    for (const x of [-0.35, 0.35]) addTo(g, part(G.box(0.08, 0.57, 0.68), 0xffd36b), [x, 0.29, 0]);
    addTo(g, part(G.box(0.14, 0.16, 0.06), 0xffd36b), [0, 0.47, 0.34]);
    const lid = new THREE.Group(); lid.position.set(0, 0.55, -0.33); g.add(lid); g.userData.lid = lid;
    addTo(lid, part(new THREE.CylinderGeometry(0.33, 0.33, 1.0, 8, 1, false, 0, Math.PI), 0xc07e44), [0, 0, 0.33], [0, 0, Math.PI / 2]);
    for (const x of [-0.35, 0.35]) addTo(lid, part(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 8, 1, false, 0, Math.PI), 0xffd36b), [x, 0, 0.33], [0, 0, Math.PI / 2]);
  },
  lamp(g) {
    addTo(g, part(G.cyl(0.05, 0.08, 1.6, 6), WOOD_DK), [0, 0.8, 0]);
    addTo(g, part(G.cone(0.32, 0.36, 8), 0xffe6b0), [0, 1.7, 0]);
    addTo(g, part(G.ico(0.13, 1), 0xffd36b, { glow: true, intensity: 2.8 }), [0, 1.55, 0]);
  },
  plant(g) {
    addTo(g, part(G.cyl(0.28, 0.22, 0.45, 8), 0xd27a5a), [0, 0.22, 0]);
    for (let i = 0; i < 5; i++) { const a = i * 1.26; addTo(g, part(G.ico(0.24, 0), 0x6fbf6a), [Math.cos(a) * 0.18, 0.62 + (i % 2) * 0.18, Math.sin(a) * 0.18]); }
  },
  bookshelf(g) {
    addTo(g, part(G.box(1.5, 2.1, 0.45), WOOD), [0, 1.05, 0]);
    const cols = [0xe0605a, 0x5a8ae0, 0xffd36b, 0x6fbf6a, 0xb48cff, 0xff9ad0];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) addTo(g, part(G.box(0.17, 0.42 + (i % 3) * 0.06, 0.32), cols[(i + r * 2) % 6]), [-0.56 + i * 0.22, 0.42 + r * 0.62, 0.08]);
  },
  telescope(g) {
    for (const a of [0, 2.1, 4.2]) addTo(g, part(G.cyl(0.03, 0.04, 1.3, 4), WOOD_DK), [Math.sin(a) * 0.25, 0.6, Math.cos(a) * 0.25], [Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]);
    addTo(g, part(G.cyl(0.13, 0.17, 1.2, 8), 0xffd36b), [0, 1.35, -0.1], [-0.9, 0, 0]);
    addTo(g, part(G.ico(0.08, 1), 0x9ff3ff, { glow: true, intensity: 2.5 }), [0, 1.7, -0.62]);
  },
  instruments(g) {
    addTo(g, part(G.ico(0.32, 1), 0xd08850), [0, 0.6, 0], [0.3, 0, 0], [1, 1.2, 0.45]);
    addTo(g, part(G.box(0.08, 0.7, 0.06), WOOD_DK), [0, 1.1, -0.18], [0.3, 0, 0]);
    addTo(g, part(G.cyl(0.25, 0.25, 0.32, 10), 0xe07a8a), [0.55, 0.16, 0.2]);
    addTo(g, part(G.cyl(0.26, 0.26, 0.04, 10), 0xfff6ee), [0.55, 0.33, 0.2]);
  },
  kettle(g) {
    addTo(g, part(G.box(0.9, 0.8, 0.7), 0x5a5a66), [0, 0.4, 0]);
    addTo(g, part(G.ico(0.11, 1), 0xff8a3a, { glow: true, intensity: 2.6 }), [0, 0.3, 0.36]);
    addTo(g, part(G.ico(0.22, 1), 0x8fd8ff), [0, 0.98, 0], [0, 0, 0], [1, 0.8, 1]);
    addTo(g, part(G.cone(0.05, 0.25, 5), 0x8fd8ff), [0.24, 1.0, 0], [0, 0, -1.1]);
  },
  yarn(g) {
    addTo(g, part(G.cyl(0.36, 0.3, 0.3, 8), WOOD), [0, 0.15, 0]);
    for (const [x, c] of [[-0.12, 0xff8fb1], [0.12, 0x8fb8ff], [0, 0xffd36b]]) addTo(g, part(G.ico(0.15, 1), c), [x, 0.36, x ? 0 : 0.12]);
  },
  window(g) {
    addTo(g, part(G.box(1.1, 1.0, 0.12), WOOD_DK), [0, 1.5, 0]);
    addTo(g, part(G.box(0.9, 0.82, 0.14), 0xbfe6ff, { glow: true, intensity: 1.6 }), [0, 1.5, 0]);
    addTo(g, part(G.box(0.06, 0.82, 0.16), WOOD_DK), [0, 1.5, 0]);
  },
  fireplace(g) {
    addTo(g, part(G.box(1.6, 1.3, 0.6), 0xa08070), [0, 0.65, 0]);
    addTo(g, part(G.box(0.9, 0.7, 0.3), 0x3a2a2a), [0, 0.45, 0.2]);
    g.userData.fire = addTo(g, part(G.cone(0.25, 0.5, 5), 0xff8a3a, { glow: true, intensity: 3 }), [0, 0.4, 0.28]);
    addTo(g, part(G.box(1.8, 0.14, 0.7), WOOD), [0, 1.35, 0.05]);
  },
  anvil(g) {
    addTo(g, part(G.cyl(0.25, 0.32, 0.5, 6), WOOD_DK), [0, 0.25, 0]);
    addTo(g, part(G.box(0.85, 0.3, 0.4), 0x4a4a56), [0, 0.65, 0]);
    addTo(g, part(G.cone(0.2, 0.4, 4), 0x4a4a56), [0.55, 0.65, 0], [0, 0, -Math.PI / 2]);
    addTo(g, part(G.ico(0.07, 0), 0xff8a3a, { glow: true, intensity: 3 }), [-0.1, 0.84, 0]);
  },
  oven(g) {
    addTo(g, part(G.box(1.8, 1.7, 1.2), 0xc0705a), [0, 0.85, 0]);
    addTo(g, part(G.cyl(0.5, 0.5, 0.2, 10, 1), 0x3a2a2a), [0, 0.8, 0.55], [Math.PI / 2, 0, 0]);
    g.userData.fire = addTo(g, part(G.ico(0.28, 1), 0xff8a3a, { glow: true, intensity: 2.6 }), [0, 0.75, 0.5], [0, 0, 0], [1, 0.7, 0.4]);
    addTo(g, part(G.cyl(0.18, 0.2, 0.9, 6), 0xa05a48), [0.5, 2.1, -0.2]);
  },
  counter(g) {
    addTo(g, part(G.box(2.6, 0.95, 0.8), WOOD), [0, 0.48, 0]);
    addTo(g, part(G.box(2.7, 0.08, 0.9), 0xfff6ee), [0, 0.98, 0]);
    for (let i = 0; i < 4; i++) addTo(g, part(G.cyl(0.08, 0.09, 0.5, 6), 0xe0a050), [-0.9 + i * 0.55, 1.1, 0], [1.4, 0, 0.2]);
  },
  shelf(g) {
    addTo(g, part(G.box(1.4, 0.1, 0.4), WOOD), [0, 1.5, 0]);
    for (let i = 0; i < 3; i++) addTo(g, part(G.ico(0.17, 1), 0xe0a050), [-0.4 + i * 0.4, 1.7, 0], [0, 0, 0], [1.2, 0.8, 1]);
  },
};

/** Floor, walls (low toward the camera), door frame and a warm backdrop that hides the sky. */
function shell(root, layout) {
  const wallH = 2.7, lowH = 0.5;
  if (layout === 'cottage') {
    const hx = 4.3, hz = 3.5;
    for (let i = 0; i < 8; i++) addTo(root, part(G.box(8.6, 0.1, 0.88), i % 2 ? FLOOR : FLOOR2), [0, 0, -hz + 0.44 + i * 0.875]);
    addTo(root, part(G.box(8.8, wallH, 0.3), 0xffe6d6), [0, wallH / 2, -hz - 0.15]);                 // back wall
    for (const sx of [-1, 1]) addTo(root, part(G.box(0.3, wallH, 7.3), 0xffe6d6), [sx * (hx + 0.15), wallH / 2, 0]);
    for (const sx of [-1, 1]) addTo(root, part(G.box(3.6, lowH, 0.3), 0xffe6d6), [sx * 2.5, lowH / 2, hz + 0.15]);   // low front wall, door gap
    addTo(root, part(G.box(8.8, 0.2, 0.32), 0x7478d6), [0, wallH, -hz - 0.15]);
    for (const x of [-hx, hx]) addTo(root, part(G.box(0.2, wallH + 0.1, 0.2), 0x8a5f4c), [x, wallH / 2, -hz]);
    return { shape: { kind: 'rect', hx: hx - 0.45, hz: hz - 0.45 }, entrance: { x: 0, z: hz - 0.6 } };
  }
  const R = 4.6;
  addTo(root, part(G.cyl(R + 0.2, R + 0.2, 0.1, 24), FLOOR), [0, 0, 0]);
  for (let i = 0; i < 6; i++) addTo(root, part(G.box(0.05, 0.11, 2 * R), FLOOR2), [-R + 0.8 + i * 1.6, 0, 0]);
  const n = 18;
  for (let i = 0; i < n; i++) {                                         // ring of wall panels; the camera side stays low
    const a = (i + 0.5) / n * Math.PI * 2, x = Math.sin(a) * (R + 0.15), z = Math.cos(a) * (R + 0.15);
    if (z > R * 0.85 && Math.abs(x) < 0.9) continue;                  // the doorway
    const h = z > R * 0.2 ? lowH : wallH;
    addTo(root, part(G.box(1.7, h, 0.3), CREAM), [x, h / 2, z], [0, a, 0]);
    if (h === wallH) addTo(root, part(G.box(1.7, 0.22, 0.34), 0xe8795a), [x, wallH, z], [0, a, 0]);   // cap-coloured trim
  }
  return { shape: { kind: 'circle', r: R - 0.45 }, entrance: { x: 0, z: R - 0.6 } };
}

export function buildRoom(def, layout) {
  const root = new THREE.Group(); root.position.copy(ROOM_ORIGIN); scene.add(root);
  const { shape, entrance } = shell(root, layout);
  addTo(root, part(G.cyl(0.65, 0.75, 0.04, 8), 0xd9c7b8), [entrance.x, 0.06, entrance.z]);              // doormat
  const back = new THREE.Mesh(new THREE.SphereGeometry(46, 16, 10), new THREE.MeshBasicMaterial({ color: 0x2a1e2e, side: THREE.BackSide, fog: false }));
  back.renderOrder = -5; root.add(back);
  const light = new THREE.PointLight(0xffc88a, 18, 16, 1.6); light.position.set(0, 2.6, 0); root.add(light);
  const obstacles = [], spots = [], used = {}, A = ANCHORS[layout];
  const fires = [];
  for (const kind of def.props) {
    const anchor = A[kind]; if (!anchor) continue;
    const k = used[kind] = (used[kind] ?? -1) + 1, at = Array.isArray(anchor[0]) ? anchor[k] : (k ? null : anchor);
    if (!at) continue;
    const g = new THREE.Group(); g.position.set(at[0], 0, at[1]); g.rotation.y = at[2]; root.add(g); F[kind](g);
    if (g.userData.fire) fires.push(g.userData.fire);
    if (SOLID[kind]) obstacles.push({ x: at[0], z: at[1], r: SOLID[kind] });
    if (INTERACTIVE.has(kind)) spots.push({ kind, x: at[0], z: at[1], index: k, obj: g });
  }
  const tableAt = A.table, bedAt = A.bed;
  return {
    root, shape, obstacles, spots, entrance, tableAt: { x: tableAt[0], z: tableAt[1] }, bedAt: { x: bedAt[0], z: bedAt[1], ry: bedAt[2] },
    residentAt: { x: tableAt[0] - 1.3, z: tableAt[1] - 0.6 }, light, fires,
    /** Local room coordinates -> world point (y = height over the floor). */
    toWorld(x, z, y = 0, out = new V3()) { return out.set(x, y, z).add(ROOM_ORIGIN); },
    dispose() { scene.remove(root); disposeTree(root); back.material.dispose(); },
  };
}
