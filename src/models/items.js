/* World models for items lying on the ground (procedural PLACEHOLDER art, same toon + outline style): one per
   icon.art kind (ITEM_ART_KINDS, matching the SVG icons in src/ui/itemArt.js), tinted with the item's colour; an item
   without one falls back to its plain icon.shape. An item with icon.src would need a sprite or model here. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

const SHAPES = {
  orb: (g, c) => { addTo(g, part(G.ico(0.17, 1), c, { glow: true, intensity: 1.8 }), [0, 0, 0]); addTo(g, part(G.cone(0.05, 0.12, 4), 0x5fb35e), [0, 0.18, 0]); },
  bun: (g, c) => { addTo(g, part(G.hemi(0.22, 8, 3), c), [0, -0.04, 0], [0, 0, 0], [1, 0.8, 1]); addTo(g, part(G.cyl(0.22, 0.2, 0.08, 8), 0xf6e0c0), [0, -0.06, 0]); },
  cap: (g, c) => { addTo(g, part(G.cyl(0.05, 0.07, 0.2, 5), 0xfff0dc), [0, -0.08, 0]); addTo(g, part(G.hemi(0.2, 7, 3), c, { glow: true, intensity: 1.6 }), [0, 0.02, 0]); },
  gem: (g, c) => { addTo(g, part(G.oct(0.2), c, { glow: true, intensity: 2.2 }), [0, 0, 0], [0, 0, 0], [0.8, 1.3, 0.8]); },
  petal: (g, c) => { for (let i = 0; i < 5; i++) addTo(g, part(G.cone(0.08, 0.26, 4), c, { glow: true, intensity: 1.6 }), [Math.cos(i * 1.26) * 0.1, 0, Math.sin(i * 1.26) * 0.1], [Math.PI / 2, 0, -i * 1.26 + Math.PI / 2]); },
  charm: (g, c) => { addTo(g, part(new THREE.TorusGeometry(0.17, 0.035, 4, 12), 0xffd36b), [0, 0, 0]); addTo(g, part(G.oct(0.09), c, { glow: true, intensity: 2.6 }), [0, 0, 0]); },
  key: (g, c) => {
    addTo(g, part(new THREE.TorusGeometry(0.1, 0.035, 5, 12), c, { glow: true, intensity: 1.6 }), [0, 0.14, 0]);
    addTo(g, part(G.box(0.05, 0.3, 0.05), c), [0, -0.07, 0]);
    for (const y of [-0.17, -0.1]) addTo(g, part(G.box(0.1, 0.04, 0.05), c), [0.06, y, 0]);
  },
  crown: (g, c) => {
    addTo(g, part(G.cyl(0.2, 0.2, 0.12, 8), c), [0, -0.05, 0]);
    for (let i = 0; i < 5; i++) addTo(g, part(G.cone(0.05, 0.16, 4), 0xffd36b), [Math.cos(i * 1.26) * 0.18, 0.08, Math.sin(i * 1.26) * 0.18]);
  },
};

const GOLD = 0xffd36b, WOOD = 0xb0703a, STEEL = 0xdfe6f0, CREAM = 0xf6e0c0;
const lighter = (c, k = 0.45) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
const torus = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 5, 14, arc);

/** One builder per art kind: (group, colour). Sized to sit in a ~0.45 unit box like the shapes above. */
const ART = {
  scroll: (g, c) => { addTo(g, part(G.box(0.27, 0.34, 0.025), c), [0, 0, 0]); for (const y of [-0.17, 0.17]) addTo(g, part(G.cyl(0.045, 0.045, 0.34, 8), CREAM), [0, y, 0], [0, 0, Math.PI / 2]); addTo(g, part(G.box(0.16, 0.02, 0.01), WOOD), [0, 0.03, 0.02]); },
  bun: (g, c) => { addTo(g, part(G.hemi(0.22, 8, 3), c), [0, -0.04, 0], [0, 0, 0], [1, 0.8, 1]); addTo(g, part(G.cyl(0.22, 0.2, 0.08, 8), CREAM), [0, -0.06, 0]); },
  tart: (g, c) => {
    addTo(g, part(G.cyl(0.24, 0.19, 0.1, 9), 0xe8b878), [0, -0.06, 0]); addTo(g, part(G.cyl(0.21, 0.21, 0.03, 9), c), [0, 0, 0]);
    for (let i = 0; i < 3; i++) addTo(g, part(G.ico(0.06), lighter(c), { glow: true, intensity: 1.3 }), [Math.cos(i * 2.1) * 0.09, 0.05, Math.sin(i * 2.1) * 0.09]);
  },
  berry: (g, c) => {
    addTo(g, part(G.ico(0.13, 1), c, { glow: true, intensity: 1.6 }), [-0.06, -0.02, 0]); addTo(g, part(G.ico(0.11, 1), c, { glow: true, intensity: 1.6 }), [0.08, 0.04, 0.02]);
    addTo(g, part(G.cone(0.05, 0.12, 4), 0x5fb35e), [0.08, 0.18, 0], [0, 0, -0.5]);
  },
  bottle: (g, c) => {
    addTo(g, part(G.ico(0.15, 1), c, { glow: true, intensity: 1.5 }), [0, -0.05, 0]); addTo(g, part(G.cyl(0.05, 0.06, 0.12, 6), c, { glow: true, intensity: 1.5 }), [0, 0.12, 0]);
    addTo(g, part(G.cyl(0.055, 0.055, 0.06, 6), WOOD), [0, 0.2, 0]);
  },
  bowl: (g, c) => { addTo(g, part(G.hemi(0.2, 9, 3), 0xc8804a), [0, 0.04, 0], [Math.PI, 0, 0]); addTo(g, part(G.cyl(0.19, 0.19, 0.02, 9), c), [0, 0.03, 0]); },
  flask: (g, c) => {
    addTo(g, part(G.cone(0.17, 0.26, 7), c, { glow: true, intensity: 1.5 }), [0, -0.03, 0]); addTo(g, part(G.cyl(0.045, 0.045, 0.12, 6), lighter(c)), [0, 0.15, 0]);
    addTo(g, part(G.cyl(0.05, 0.05, 0.05, 6), WOOD), [0, 0.22, 0]);
  },
  moonCharm: (g, c) => { addTo(g, part(torus(0.17, 0.035), GOLD), [0, 0, 0]); addTo(g, part(torus(0.1, 0.045, Math.PI * 1.3), c, { glow: true, intensity: 2.2 }), [0, 0, 0], [0, 0, 0.9]); },
  leafCharm: (g, c) => { addTo(g, part(torus(0.17, 0.035), GOLD), [0, 0, 0]); addTo(g, part(G.oct(0.11), c, { glow: true, intensity: 2.2 }), [0, 0, 0], [0, 0, 0.6], [0.55, 1.2, 0.3]); },
  mushroom: (g, c) => { addTo(g, part(G.cyl(0.05, 0.07, 0.2, 5), 0xfff0dc), [0, -0.08, 0]); addTo(g, part(G.hemi(0.2, 7, 3), c, { glow: true, intensity: 1.6 }), [0, 0.02, 0]); },
  shard: (g, c) => { addTo(g, part(G.oct(0.2), c, { glow: true, intensity: 2.2 }), [0, 0, 0], [0, 0, 0.2], [0.7, 1.4, 0.7]); addTo(g, part(G.oct(0.09), c, { glow: true, intensity: 2.2 }), [0.13, -0.1, 0], [0, 0, -0.5], [0.7, 1.3, 0.7]); },
  petal: (g, c) => { for (let i = 0; i < 5; i++) addTo(g, part(G.cone(0.08, 0.26, 4), c, { glow: true, intensity: 1.6 }), [Math.cos(i * 1.26) * 0.1, 0, Math.sin(i * 1.26) * 0.1], [Math.PI / 2, 0, -i * 1.26 + Math.PI / 2]); },
  staff: (g, c) => {
    addTo(g, part(G.cyl(0.025, 0.03, 0.62, 5), WOOD), [0, -0.05, 0], [0, 0, 0.25]);
    addTo(g, part(G.ico(0.09, 1), c, { glow: true, intensity: 2.4 }), [-0.08, 0.27, 0]); addTo(g, part(torus(0.1, 0.018), GOLD), [-0.08, 0.27, 0]);
  },
  axe: (g, c) => {
    addTo(g, part(G.cyl(0.025, 0.03, 0.6, 5), WOOD), [0, -0.04, 0], [0, 0, 0.2]);
    addTo(g, part(G.box(0.2, 0.18, 0.04), c), [-0.13, 0.17, 0], [0, 0, 0.2]); addTo(g, part(G.box(0.06, 0.2, 0.05), STEEL), [-0.22, 0.15, 0], [0, 0, 0.2]);
  },
  bow: (g, c) => { addTo(g, part(torus(0.24, 0.025, Math.PI), c), [0.04, 0, 0], [0, 0, Math.PI / 2]); addTo(g, part(G.cyl(0.006, 0.006, 0.48, 3), 0xffffff, { outline: false }), [0.04, 0, 0]); },
  cloak: (g, c) => { addTo(g, part(G.cone(0.24, 0.42, 7), c), [0, -0.02, 0]); addTo(g, part(torus(0.08, 0.03), lighter(c, 0.3)), [0, 0.17, 0], [Math.PI / 2, 0, 0]); addTo(g, part(G.ico(0.035), GOLD), [0, 0.14, 0.08]); },
  mail: (g, c) => {
    addTo(g, part(G.box(0.3, 0.32, 0.14), c), [0, -0.02, 0]);
    for (const x of [-0.19, 0.19]) addTo(g, part(G.box(0.1, 0.12, 0.13), lighter(c, 0.2)), [x, 0.08, 0]);
    addTo(g, part(G.box(0.31, 0.04, 0.15), GOLD), [0, -0.08, 0]);
  },
  mantle: (g, c) => { addTo(g, part(G.cone(0.26, 0.3, 8), c), [0, -0.04, 0]); addTo(g, part(torus(0.12, 0.05), lighter(c, 0.6)), [0, 0.1, 0], [Math.PI / 2, 0, 0]); },
  pendant: (g, c) => { addTo(g, part(torus(0.16, 0.012), GOLD), [0, 0.08, 0]); addTo(g, part(G.box(0.1, 0.13, 0.08), c, { glow: true, intensity: 2 }), [0, -0.12, 0]); addTo(g, part(G.cone(0.07, 0.06, 4), GOLD), [0, -0.02, 0]); },
  ring: (g, c) => { addTo(g, part(torus(0.12, 0.035), GOLD), [0, -0.04, 0]); addTo(g, part(G.oct(0.07), c, { glow: true, intensity: 2.4 }), [0, 0.11, 0]); },
  locket: (g, c) => { addTo(g, part(torus(0.15, 0.012), STEEL), [0, 0.1, 0]); addTo(g, part(G.cyl(0.11, 0.11, 0.05, 10), STEEL), [0, -0.1, 0], [Math.PI / 2, 0, 0]); addTo(g, part(G.oct(0.05), c, { glow: true, intensity: 2.2 }), [0, -0.1, 0.035]); },
  key: (g, c) => {
    addTo(g, part(torus(0.1, 0.035), c, { glow: true, intensity: 1.6 }), [0, 0.14, 0]);
    addTo(g, part(G.box(0.05, 0.3, 0.05), c), [0, -0.07, 0]);
    for (const y of [-0.17, -0.1]) addTo(g, part(G.box(0.1, 0.04, 0.05), c), [0.06, y, 0]);
  },
  crown: (g, c) => { addTo(g, part(G.cyl(0.2, 0.2, 0.12, 8), c), [0, -0.05, 0]); for (let i = 0; i < 5; i++) addTo(g, part(G.cone(0.05, 0.16, 4), GOLD), [Math.cos(i * 1.26) * 0.18, 0.08, Math.sin(i * 1.26) * 0.18]); },
  // ---- resources (TODO 16)
  log: (g, c) => { for (const [y, z] of [[-0.06, -0.07], [-0.06, 0.07], [0.07, 0]]) { addTo(g, part(G.cyl(0.07, 0.07, 0.4, 7), c), [0, y, z], [0, 0, Math.PI / 2]); addTo(g, part(G.cyl(0.055, 0.055, 0.41, 7), lighter(c, 0.4), { outline: false }), [0, y, z], [0, 0, Math.PI / 2]); } },
  stone: (g, c) => { addTo(g, part(G.dodec(0.17), c), [0, -0.02, 0], [0.3, 0.5, 0], [1.1, 0.8, 1]); addTo(g, part(G.dodec(0.09), lighter(c, 0.2)), [0.15, -0.08, 0.06]); },
  ore: (g, c) => { addTo(g, part(G.dodec(0.17), 0xb6aec8), [0, -0.02, 0], [0.3, 0.5, 0], [1.1, 0.8, 1]); for (const [x, y, z] of [[0.1, 0.08, 0.08], [-0.1, 0.03, 0.12], [0.02, 0.12, -0.08]]) addTo(g, part(G.oct(0.06), c, { glow: true, intensity: 1.4 }), [x, y, z]); },
  gemstone: (g, c) => { addTo(g, part(G.oct(0.17), c, { glow: true, intensity: 2.4 }), [0, 0, 0], [0, 0.4, 0], [1, 0.8, 1]); addTo(g, part(G.cyl(0.12, 0.17, 0.06, 6), lighter(c), { glow: true, intensity: 2 }), [0, 0.1, 0]); },
  herb: (g, c) => { addTo(g, part(G.cyl(0.015, 0.015, 0.36, 4), 0x5fa85a), [0, -0.02, 0]); for (let i = 0; i < 5; i++) addTo(g, part(G.oct(0.07), i % 2 ? c : lighter(c, 0.3)), [Math.cos(i * 2.4) * 0.07, -0.1 + i * 0.06, Math.sin(i * 2.4) * 0.07], [0, i * 2.4, 0.9], [0.7, 1.4, 0.25]); },
  pepper: (g, c) => { addTo(g, part(G.cone(0.08, 0.34, 6), c, { glow: true, intensity: 1.3 }), [0, -0.04, 0], [Math.PI + 0.3, 0, 0]); addTo(g, part(G.cyl(0.03, 0.05, 0.06, 5), 0x5fb35e), [0, 0.15, 0.04]); },
  plum: (g, c) => { addTo(g, part(G.ico(0.15, 1), c), [0, -0.02, 0]); addTo(g, part(G.cone(0.04, 0.12, 4), 0x5fb35e), [0.04, 0.15, 0], [0, 0, -0.6]); addTo(g, part(G.ico(0.04), 0xffffff, { outline: false }), [-0.06, 0.05, 0.11]); },
  carrot: (g, c) => { addTo(g, part(G.cone(0.08, 0.36, 6), c), [0, -0.05, 0], [Math.PI, 0, 0.2]); for (let i = 0; i < 3; i++) addTo(g, part(G.cone(0.035, 0.16, 4), 0x6fbf62), [0.03 + (i - 1) * 0.03, 0.2, 0], [0, 0, (i - 1) * 0.4]); },
  wheat: (g, c) => { for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.07; addTo(g, part(G.cyl(0.01, 0.01, 0.42, 3), 0xd8b050), [x, -0.04, 0], [0, 0, (i - 1) * 0.15]); addTo(g, part(G.oct(0.05), c), [x * 1.6, 0.18, 0], [0, 0, (i - 1) * 0.15], [0.8, 2, 0.8]); } },
  pumpkin: (g, c) => { for (let i = 0; i < 6; i++) addTo(g, part(G.ico(0.13, 1), c), [Math.cos(i * 1.05) * 0.07, -0.03, Math.sin(i * 1.05) * 0.07], [0, 0, 0], [0.8, 0.95, 0.8]); addTo(g, part(G.cyl(0.025, 0.035, 0.08, 5), 0x5fa85a), [0, 0.12, 0]); },
  seeds: (g, c) => { addTo(g, part(G.cyl(0.13, 0.15, 0.2, 8), 0xe8c890), [0, -0.05, 0]); addTo(g, part(G.cone(0.13, 0.12, 8), 0xd8b070), [0, 0.11, 0]); addTo(g, part(G.ico(0.05), c), [0, -0.04, 0.14]); },
  fish: (g, c) => { addTo(g, part(G.ico(0.13, 1), c), [0, 0, 0], [0, 0, 0], [1.7, 0.75, 0.45]); addTo(g, part(G.cone(0.1, 0.14, 4), lighter(c, 0.3)), [-0.27, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.3]); addTo(g, part(G.ico(0.025), 0x2a1830, { outline: false }), [0.15, 0.03, 0.05]); },
  bread: (g, c) => { addTo(g, part(G.ico(0.17, 1), c), [0, -0.03, 0], [0, 0, 0], [1.4, 0.75, 0.9]); for (let i = 0; i < 3; i++) addTo(g, part(G.box(0.03, 0.02, 0.15), lighter(c, 0.4), { outline: false }), [(i - 1) * 0.1, 0.09, 0], [0, 0.4, 0]); },
  skewer: (g, c) => { addTo(g, part(G.cyl(0.012, 0.012, 0.6, 4), WOOD), [0, 0, 0], [0, 0, 0.9]); for (let i = 0; i < 3; i++) addTo(g, part(G.ico(0.07, 0), i === 1 ? 0x6fbf6a : c), [(i - 1) * 0.1, (i - 1) * -0.08, 0]); },
  pickaxe: (g, c) => { addTo(g, part(G.cyl(0.025, 0.03, 0.6, 5), WOOD), [0, -0.04, 0], [0, 0, 0.2]); addTo(g, part(torus(0.22, 0.03, Math.PI * 0.8), c), [-0.06, 0.08, 0], [0, 0, Math.PI * 0.1 + 0.2]); },
  rod: (g, c) => { addTo(g, part(G.cyl(0.015, 0.025, 0.66, 5), c), [0, 0, 0], [0, 0, 0.5]); addTo(g, part(G.cyl(0.05, 0.05, 0.03, 8), STEEL), [0.1, -0.18, 0.03], [Math.PI / 2, 0, 0]); addTo(g, part(G.ico(0.04), 0xff6a6a), [-0.15, -0.1, 0]); },
  hoe: (g, c) => { addTo(g, part(G.cyl(0.025, 0.03, 0.62, 5), WOOD), [0, -0.02, 0], [0, 0, 0.2]); addTo(g, part(G.box(0.16, 0.05, 0.1), c), [-0.1, 0.27, 0], [0, 0, 0.2]); },
  can: (g, c) => { addTo(g, part(G.cyl(0.12, 0.13, 0.22, 9), c), [0, -0.04, 0]); addTo(g, part(G.cyl(0.02, 0.03, 0.22, 5), c), [0.16, 0.02, 0], [0, 0, -0.9]); addTo(g, part(torus(0.08, 0.018, Math.PI), lighter(c, 0.2)), [0, 0.08, 0], [0, Math.PI / 2, 0]); },
  helm: (g, c) => { addTo(g, part(G.hemi(0.18, 9, 3), c), [0, -0.06, 0]); addTo(g, part(G.cyl(0.19, 0.19, 0.05, 9), c), [0, -0.07, 0]); for (const sx of [-1, 1]) addTo(g, part(G.cone(0.035, 0.12, 4), 0xf6ead8), [sx * 0.14, 0.07, 0], [0, 0, -sx * 0.6]); },
  boots: (g, c) => { for (const sx of [-1, 1]) { addTo(g, part(G.box(0.1, 0.2, 0.1), c), [sx * 0.08, 0, -0.02]); addTo(g, part(G.box(0.1, 0.07, 0.17), c), [sx * 0.08, -0.08, 0.04]); } },
  hood: (g, c) => { addTo(g, part(G.cone(0.2, 0.36, 8), c), [0, 0, 0]); addTo(g, part(G.ico(0.1, 1), 0xffe2cc, { outline: false }), [0, -0.05, 0.1], [0, 0, 0], [1, 1, 0.5]); },
  strawHat: (g, c) => { addTo(g, part(G.cyl(0.24, 0.24, 0.03, 12), c), [0, -0.05, 0]); addTo(g, part(G.cyl(0.11, 0.13, 0.12, 10), c), [0, 0.02, 0]); addTo(g, part(G.cyl(0.135, 0.135, 0.035, 10), 0xe0605a), [0, -0.01, 0]); },
  flowerCrown: (g, c) => { addTo(g, part(torus(0.17, 0.025), 0x5fae5a), [0, 0, 0], [Math.PI / 2, 0, 0]); for (let i = 0; i < 6; i++) addTo(g, part(G.ico(0.045, 0), i % 2 ? c : 0xffffff), [Math.cos(i * 1.05) * 0.17, 0.03, Math.sin(i * 1.05) * 0.17]); },
  frogHat: (g, c) => { addTo(g, part(G.hemi(0.19, 9, 3), c), [0, -0.06, 0]); for (const sx of [-1, 1]) { addTo(g, part(G.ico(0.06, 1), c), [sx * 0.09, 0.11, 0.04]); addTo(g, part(G.ico(0.035, 0), 0xffffff), [sx * 0.09, 0.12, 0.08]); } },
  ingot: (g, c) => { for (const [y, z] of [[-0.06, -0.08], [-0.06, 0.08], [0.07, 0]]) addTo(g, part(G.box(0.32, 0.12, 0.14), c), [0, y, z], [0, 0, 0], [1, 1, 1]); },
  coal: (g, c) => { for (const [x, y, z] of [[-0.08, -0.04, 0], [0.09, -0.05, 0.05], [0.01, 0.07, -0.03]]) addTo(g, part(G.dodec(0.1), c), [x, y, z]); addTo(g, part(G.ico(0.035), 0xff8a3a, { glow: true, intensity: 2.2 }), [0.06, 0.02, 0.1]); },
  cape: (g, c) => { addTo(g, part(G.box(0.3, 0.4, 0.03), c), [0, -0.02, 0], [0.15, 0, 0]); addTo(g, part(G.cyl(0.02, 0.02, 0.3, 5), GOLD), [0, 0.18, 0.03], [0, 0, Math.PI / 2]); },
};

/** The item's own world model, for things the hero holds (a tool in hand while gathering: src/gameplay/Gathering.js). */
export function buildHeldModel(def) { const g = new THREE.Group(); (ART[def.icon.art] || SHAPES.orb)(g, def.icon.color ?? 0xffffff); return g; }

/** Parts: root (placed on the ground), spinner (bobs and turns). */
export function buildItemModel(def) {
  const root = new THREE.Group(), spinner = new THREE.Group(); root.add(spinner);
  (ART[def.icon.art] || SHAPES[def.icon.shape] || SHAPES.orb)(spinner, def.icon.color ?? 0xffffff);
  return { root, spinner };
}
