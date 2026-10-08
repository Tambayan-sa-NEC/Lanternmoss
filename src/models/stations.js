/* Crafting station models (config/stations.js): a workbench, a forge with its anvil, a cooking pot over a fire and a
   brewing stand. Each returns { root, glow (parts that flicker), smoke (a local point where steam / sparks rise) }.
   Local frame: y up, +z toward whoever uses it. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

const WOOD = 0xb0703a, WOOD_DK = 0x8a5230, STONE = 0xa8a2bf, STONE_DK = 0x8a84a0, STEEL = 0x5a5a6e, STEEL_LT = 0xb8bccc;

function workbench() {
  const g = new THREE.Group(), glow = [];
  addTo(g, part(G.box(1.5, 0.14, 0.75), WOOD), [0, 0.86, 0]);
  for (const [x, z] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]]) addTo(g, part(G.box(0.12, 0.84, 0.12), WOOD_DK), [x, 0.42, z]);
  addTo(g, part(G.box(1.3, 0.06, 0.6), WOOD_DK), [0, 0.22, 0]);                                     // lower shelf
  for (let i = 0; i < 3; i++) addTo(g, part(G.box(1.2, 0.06, 0.16), i % 2 ? WOOD : 0xc89060), [0, 0.28 + i * 0.065, -0.12 + i * 0.03]);   // planks on it
  // a saw and a hammer on top, a plank being cut
  addTo(g, part(G.box(0.5, 0.02, 0.16), STEEL_LT), [-0.3, 0.95, 0.1], [0, 0.4, 0]);
  addTo(g, part(G.box(0.14, 0.06, 0.08), 0xd06a4a), [-0.58, 0.96, 0.22], [0, 0.4, 0]);
  addTo(g, part(G.cyl(0.025, 0.025, 0.36, 5), WOOD_DK), [0.35, 0.95, 0.12], [0, 0, Math.PI / 2]);
  addTo(g, part(G.box(0.08, 0.1, 0.16), STEEL), [0.52, 0.96, 0.12]);
  addTo(g, part(G.box(0.7, 0.05, 0.22), 0xd8a870), [0.15, 0.96, -0.18], [0, -0.2, 0]);
  // a back board with tools hanging
  addTo(g, part(G.box(1.5, 0.7, 0.06), WOOD_DK), [0, 1.3, -0.36]);
  addTo(g, part(G.box(0.05, 0.36, 0.04), STEEL_LT), [-0.45, 1.28, -0.31]);
  addTo(g, part(G.cyl(0.11, 0.11, 0.03, 10), STEEL_LT), [0, 1.35, -0.31], [Math.PI / 2, 0, 0]);
  addTo(g, part(G.box(0.3, 0.05, 0.04), WOOD), [0.45, 1.4, -0.31], [0, 0, 0.5]);
  return { root: g, glow, smoke: new THREE.Vector3(0, 1.1, 0) };
}

function forge() {
  const g = new THREE.Group(), glow = [];
  // the furnace: stacked stone with a glowing mouth and a chimney
  addTo(g, part(G.box(1.1, 0.95, 0.9), STONE), [-0.4, 0.47, -0.05]);
  addTo(g, part(G.box(1.18, 0.12, 0.98), STONE_DK), [-0.4, 0.98, -0.05]);
  addTo(g, part(G.box(0.62, 0.42, 0.06), 0x2a1a20, { outline: false }), [-0.4, 0.45, 0.42]);
  glow.push(addTo(g, part(G.box(0.54, 0.16, 0.08), 0xff7a2a, { glow: true, intensity: 2.6 }), [-0.4, 0.32, 0.43]));
  glow.push(addTo(g, part(G.ico(0.1, 0), 0xffc04a, { glow: true, intensity: 2.8 }), [-0.5, 0.42, 0.42]));
  glow.push(addTo(g, part(G.ico(0.08, 0), 0xffc04a, { glow: true, intensity: 2.8 }), [-0.28, 0.4, 0.42]));
  addTo(g, part(G.cyl(0.18, 0.22, 1.0, 7), STONE_DK), [-0.55, 1.5, -0.2]);
  // the anvil on a stump
  addTo(g, part(G.cyl(0.26, 0.3, 0.5, 8), WOOD_DK), [0.55, 0.25, 0.1]);
  addTo(g, part(G.box(0.24, 0.16, 0.2), STEEL), [0.55, 0.58, 0.1]);
  addTo(g, part(G.box(0.62, 0.12, 0.26), STEEL), [0.55, 0.72, 0.1]);
  addTo(g, part(G.cone(0.09, 0.26, 4), STEEL), [0.93, 0.72, 0.1], [0, 0, -Math.PI / 2]);
  addTo(g, part(G.cyl(0.025, 0.025, 0.32, 5), WOOD), [0.5, 0.83, 0.18], [0, 0.5, Math.PI / 2]);
  addTo(g, part(G.box(0.08, 0.1, 0.14), STEEL_LT), [0.36, 0.84, 0.08], [0, 0.5, 0]);
  glow.push(addTo(g, part(G.box(0.22, 0.05, 0.06), 0xff9a3a, { glow: true, intensity: 2.2 }), [0.6, 0.8, 0.1]));   // a glowing bar on it
  return { root: g, glow, smoke: new THREE.Vector3(-0.55, 2.05, -0.2) };
}

function pot() {
  const g = new THREE.Group(), glow = [];
  for (let i = 0; i < 3; i++) {                                         // a tripod of poles
    const a = i * 2.094;
    addTo(g, part(G.cyl(0.035, 0.04, 1.7, 5), WOOD_DK), [Math.cos(a) * 0.45, 0.8, Math.sin(a) * 0.45], [Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28]);
  }
  addTo(g, part(G.cyl(0.015, 0.015, 0.5, 4), 0x3a2340, { outline: false }), [0, 1.35, 0]);
  addTo(g, part(G.hemi(0.42, 10, 4), 0x3a3448), [0, 0.98, 0], [Math.PI, 0, 0]);   // the cauldron
  addTo(g, part(G.cyl(0.43, 0.43, 0.06, 12), 0x4a445a), [0, 0.99, 0]);
  glow.push(addTo(g, part(G.cyl(0.38, 0.38, 0.03, 12), 0xf0a040, { glow: true, intensity: 1.4 }), [0, 0.98, 0]));   // the stew
  // the fire under it: logs and flames, a ring of stones
  for (let i = 0; i < 3; i++) addTo(g, part(G.cyl(0.06, 0.06, 0.6, 5), WOOD_DK), [0, 0.08, 0], [Math.PI / 2, i * 1.05, 0]);
  glow.push(addTo(g, part(G.cone(0.2, 0.42, 6), 0xff8a2a, { glow: true, intensity: 2.4 }), [0, 0.3, 0]));
  glow.push(addTo(g, part(G.cone(0.11, 0.3, 5), 0xffd04a, { glow: true, intensity: 2.6 }), [0.06, 0.28, 0.05]));
  for (let i = 0; i < 8; i++) addTo(g, part(G.dodec(0.1), i % 2 ? STONE : STONE_DK), [Math.cos(i * 0.785) * 0.5, 0.05, Math.sin(i * 0.785) * 0.5]);
  // a ladle and a sack of vegetables beside it
  addTo(g, part(G.cyl(0.02, 0.02, 0.7, 4), WOOD), [0.25, 1.2, 0.1], [0.5, 0, -0.5]);
  addTo(g, part(G.ico(0.24, 1), 0xd8b880), [0.85, 0.22, 0.2], [0, 0, 0], [1, 0.9, 1]);
  addTo(g, part(G.cone(0.05, 0.16, 5), 0xff9a3a), [0.82, 0.48, 0.24], [0.3, 0, 0.2]);
  return { root: g, glow, smoke: new THREE.Vector3(0, 1.15, 0) };
}

function brew() {
  const g = new THREE.Group(), glow = [];
  addTo(g, part(G.cyl(0.55, 0.55, 0.08, 12), WOOD), [0, 0.78, 0]);                          // a round table
  addTo(g, part(G.cyl(0.08, 0.12, 0.78, 6), WOOD_DK), [0, 0.39, 0]);
  addTo(g, part(G.cyl(0.32, 0.32, 0.05, 8), WOOD_DK), [0, 0.03, 0]);
  // the stand: a brass rod, three hanging flasks, a burner under the middle one
  addTo(g, part(G.cyl(0.03, 0.03, 0.8, 5), 0xd8b050), [0, 1.2, -0.1]);
  addTo(g, part(G.cyl(0.02, 0.02, 0.7, 4), 0xd8b050), [0, 1.52, -0.1], [0, 0, Math.PI / 2]);
  [[-0.3, 0xff5a7a], [0, 0x9f7aff], [0.3, 0x7fe07a]].forEach(([x, c]) => {
    glow.push(addTo(g, part(G.ico(0.11, 1), c, { glow: true, intensity: 1.8 }), [x, 1.22, -0.1]));
    addTo(g, part(G.cyl(0.03, 0.04, 0.14, 5), 0xe8f4ff), [x, 1.38, -0.1]);
  });
  glow.push(addTo(g, part(G.cone(0.06, 0.14, 5), 0x7fb8ff, { glow: true, intensity: 2.4 }), [0, 0.92, -0.1]));
  addTo(g, part(G.cyl(0.08, 0.1, 0.06, 6), STEEL), [0, 0.84, -0.1]);
  // bottles and a book on the table
  [[0.32, 0.15, 0xffd36b], [0.4, -0.12, 0x6a8aff], [-0.36, 0.2, 0xff8fb1]].forEach(([x, z, c]) => {
    addTo(g, part(G.cyl(0.06, 0.07, 0.16, 6), c), [x, 0.9, z]); addTo(g, part(G.cyl(0.025, 0.025, 0.06, 5), WOOD), [x, 1.0, z]);
  });
  addTo(g, part(G.box(0.26, 0.05, 0.2), 0x7a4ab8), [-0.22, 0.85, -0.18], [0, 0.4, 0]);
  return { root: g, glow, smoke: new THREE.Vector3(0, 1.4, -0.1) };
}

export const STATION_BUILDERS = { workbench, forge, pot, brew };
