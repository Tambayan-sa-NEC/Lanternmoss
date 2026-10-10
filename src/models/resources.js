/* Models for things you gather and grow (config/resources.js): resource nodes, the farm (fence, soil plots, a
   scarecrow) and crops at each stage, plus the fishing float. Same toon + outline style as the scenery. Each node
   returns { root, fruit }: `fruit` is what disappears while it regrows (berries, caps, crystals); a node that
   vanishes whole hides its root instead. */
import * as THREE from 'three';
import { gradientMap } from '../render/materials.js';
import { addTo, G, part } from '../render/meshes.js';
import { batchParts } from '../render/staticParts.js';

const lighter = (c, k = 0.4) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
const darker = (c, k = 0.3) => new THREE.Color(c).multiplyScalar(1 - k).getHex();
const WOOD = 0xb0703a, ROCK = 0xb6aec8;

/** One builder per node look: (root, fruit, def, rnd) where rnd() is a 0..1 source for small variations. */
const NODES = {
  branches: (g, f, d, rnd) => {
    for (let i = 0; i < 3; i++) addTo(f, part(G.cyl(0.06, 0.08, 1.1 + rnd() * 0.4, 5), i === 2 ? darker(d.color, 0.15) : d.color), [(i - 1) * 0.18, 0.08, 0], [Math.PI / 2, rnd() * 0.8 - 0.4 + i * 0.6, 0]);
    for (let i = 0; i < 3; i++) addTo(f, part(G.oct(0.09), 0x7fbf62), [rnd() * 0.6 - 0.3, 0.14, rnd() * 0.6 - 0.3], [0, rnd() * 6, 0.6], [1, 0.4, 1.4]);
  },
  pebbles: (g, f, d, rnd) => {
    for (let i = 0; i < 5; i++) addTo(f, part(G.dodec(0.12 + rnd() * 0.1), i % 2 ? d.color : lighter(d.color, 0.2)), [Math.cos(i * 1.3) * 0.28, 0.06, Math.sin(i * 1.3) * 0.28], [rnd(), rnd(), 0], [1, 0.7, 1]);
  },
  herb: (g, f, d, rnd) => {
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      addTo(f, part(G.oct(0.13), i % 2 ? d.color : lighter(d.color, 0.25)), [Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [0.6, 1.9, 0.25]);
    }
    for (let i = 0; i < 3; i++) addTo(f, part(G.ico(0.045, 0), 0xffffff, { glow: true, intensity: 1.3 }), [rnd() * 0.3 - 0.15, 0.44, rnd() * 0.3 - 0.15]);
  },
  bush: (g, f, d, rnd) => {
    const leaf = d.leaf ?? 0x5fa85a;
    addTo(g, part(G.ico(0.55, 1), leaf), [0, 0.45, 0], [0, 0, 0], [1, 0.85, 1]);
    addTo(g, part(G.ico(0.38, 1), lighter(leaf, 0.12)), [0.35, 0.35, 0.12], [0, 0, 0], [1, 0.85, 1]);
    addTo(g, part(G.ico(0.34, 1), darker(leaf, 0.08)), [-0.3, 0.32, -0.15], [0, 0, 0], [1, 0.85, 1]);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, y = 0.3 + (i % 3) * 0.18, r = 0.5 - (i % 3) * 0.1;
      addTo(f, part(G.ico(0.085, 1), d.color, { glow: true, intensity: 1.5 }), [Math.cos(a) * r, y, Math.sin(a) * r]);
    }
  },
  caps: (g, f, d, rnd) => {
    addTo(g, part(G.cyl(0.42, 0.5, 0.08, 7), 0x6fae62, { outline: false }), [0, 0.02, 0]);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7, r = i ? 0.24 : 0, s = i ? 0.75 + rnd() * 0.3 : 1.15;
      addTo(f, part(G.cyl(0.05 * s, 0.07 * s, 0.26 * s, 5), 0xfff0dc), [Math.cos(a) * r, 0.13 * s, Math.sin(a) * r]);
      addTo(f, part(G.hemi(0.17 * s, 7, 3), d.color, { glow: true, intensity: 1.7 }), [Math.cos(a) * r, 0.26 * s, Math.sin(a) * r]);
    }
  },
  flowers: (g, f, d, rnd) => {
    addTo(g, part(G.cyl(0.38, 0.45, 0.06, 7), 0x9ac8c0, { outline: false }), [0, 0.02, 0]);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26, r = i ? 0.24 : 0, h = 0.32 + rnd() * 0.15;
      addTo(g, part(G.cyl(0.015, 0.02, h, 4), 0x6fbf62), [Math.cos(a) * r, h / 2, Math.sin(a) * r]);
      for (let k = 0; k < 5; k++) addTo(f, part(G.cone(0.04, 0.12, 4), d.color, { glow: true, intensity: 1.5 }),
        [Math.cos(a) * r + Math.cos(k * 1.26) * 0.05, h + 0.02, Math.sin(a) * r + Math.sin(k * 1.26) * 0.05], [Math.PI / 2, 0, -k * 1.26 + Math.PI / 2]);
    }
  },
  vein: (g, f, d, rnd) => {
    addTo(g, part(G.dodec(0.8), ROCK), [0, 0.3, 0], [0.2, rnd() * 3, 0.1], [1.15, 0.75, 1]);
    addTo(g, part(G.dodec(0.45), lighter(ROCK, 0.1)), [0.55, 0.2, 0.3], [0.5, 0.3, 0], [1, 0.8, 1]);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.4, r = 0.35 + (i % 2) * 0.2;
      addTo(f, part(G.oct(0.24 + rnd() * 0.1), d.color, d.glow ? { glow: true, intensity: 1.9 } : {}), [Math.cos(a) * r, 0.55 + (i % 3) * 0.12, Math.sin(a) * r * 0.8],
        [Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6], [0.7, 1.5, 0.7]);
    }
  },
};

/** A resource node's model: { root, fruit }. seed varies the look a little (same seed = same look). */
export function buildNode(def, seed = 1) {
  let s = seed * 9301 % 233280; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const root = new THREE.Group(), fruit = new THREE.Group(); root.add(fruit);
  (NODES[def.look] ?? NODES.pebbles)(root, fruit, def, rnd);
  const body = batchParts(root, fruit); batchParts(fruit);
  return { root, fruit, body };
}
export const NODE_LOOKS = Object.keys(NODES);

// ---------------------------------------------------------------- the farm
const SOIL = { wild: 0x8fc070, dry: 0x9a6a44, wet: 0x6a4430 };
/** A soil plot: { root, soil (its material: wild / dry / wet colours), weeds (shown until tilled), furrows, crop (an
    empty group the crop model goes in) }. */
export function buildPlot() {
  const root = new THREE.Group(), soil = new THREE.MeshToonMaterial({ color: SOIL.wild, gradientMap });
  const bed = new THREE.Mesh(G.box(1.42, 0.16, 1.42), soil); bed.position.y = 0.03; root.add(bed);
  const furrows = new THREE.Group(); root.add(furrows);
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(G.box(1.3, 0.07, 0.18), soil); m.position.set(0, 0.13, (i - 1) * 0.42); furrows.add(m); }
  const weeds = new THREE.Group(); root.add(weeds);
  for (let i = 0; i < 6; i++) addTo(weeds, part(G.cone(0.05, 0.3, 3), i % 2 ? 0x7fc574 : 0x9adb7e, { outline: false }), [Math.cos(i * 2.2) * 0.45, 0.24, Math.sin(i * 2.2) * 0.45], [0.2, i, 0.2]);
  addTo(weeds, part(G.dodec(0.09), ROCK), [0.3, 0.14, -0.35]);
  batchParts(weeds);
  const crop = new THREE.Group(); crop.position.y = 0.12; root.add(crop);
  return { root, soil, weeds, furrows, crop };
}
export const SOIL_COLORS = SOIL;

/** The farm's frame: a low fence round w x d metres (open on the side facing +z, the village), a sign and a scarecrow. */
export function buildFarmFrame(w, d) {
  const root = new THREE.Group(), hw = w / 2, hd = d / 2;
  const post = (x, z) => addTo(root, part(G.cyl(0.07, 0.08, 0.8, 5), WOOD), [x, 0.4, z]);
  const rail = (x, z, len, along) => addTo(root, part(G.box(along ? len : 0.06, 0.07, along ? 0.06 : len), lighter(WOOD, 0.15)), [x, 0.55, z]);
  for (const sx of [-1, 1]) { post(sx * hw, -hd); post(sx * hw, hd); post(sx * hw, 0); rail(sx * hw, 0, d, false); }
  post(0, -hd); rail(0, -hd, w, true);
  for (const sx of [-1, 1]) { post(sx * hw * 0.45, hd); rail(sx * hw * 0.725, hd, hw * 0.55, true); }   // an opening in the middle of the front
  // sign by the opening
  addTo(root, part(G.cyl(0.05, 0.05, 1.1, 5), WOOD), [hw * 0.45 + 0.45, 0.55, hd + 0.3]);
  addTo(root, part(G.box(0.8, 0.42, 0.06), 0xf0d8a8), [hw * 0.45 + 0.45, 1.1, hd + 0.3]);
  addTo(root, part(G.ico(0.07, 0), 0x7fbf62, { outline: false }), [hw * 0.45 + 0.25, 1.12, hd + 0.34]);
  addTo(root, part(G.ico(0.06, 0), 0xff9a3a, { outline: false }), [hw * 0.45 + 0.55, 1.1, hd + 0.34]);
  // scarecrow in the back corner, in a straw hat
  const sc = new THREE.Group(); sc.position.set(-hw + 0.6, 0, -hd + 0.6); root.add(sc);
  addTo(sc, part(G.cyl(0.05, 0.06, 1.7, 5), WOOD), [0, 0.85, 0]);
  addTo(sc, part(G.cyl(0.04, 0.04, 1.2, 5), WOOD), [0, 1.3, 0], [0, 0, Math.PI / 2]);
  addTo(sc, part(G.box(0.5, 0.6, 0.26), 0x7a8acf), [0, 1.2, 0]);
  addTo(sc, part(G.ico(0.24, 1), 0xf0d8a8), [0, 1.75, 0]);
  addTo(sc, part(G.cyl(0.4, 0.4, 0.04, 10), 0xf0d080), [0, 1.93, 0]);
  addTo(sc, part(G.cyl(0.18, 0.2, 0.18, 8), 0xf0d080), [0, 2.02, 0]);
  for (const sx of [-1, 1]) addTo(sc, part(G.box(0.05, 0.05, 0.02), 0x3a2340, { outline: false }), [sx * 0.08, 1.78, 0.23]);
  batchParts(root);
  return root;
}

/** A crop at growth stage 0 (sprout) .. 3 (ripe): look = CROPS[id].look. */
export function buildCrop(look, stage) {
  const g = new THREE.Group(), s = [0.35, 0.65, 0.9, 1][stage];
  const spots = [[-0.42, -0.42], [0, -0.42], [0.42, -0.42], [-0.42, 0.42], [0, 0.42], [0.42, 0.42]];
  spots.forEach(([x, z], n) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p);
    if (look.kind === 'stalks') {
      for (let i = 0; i < 3; i++) {
        addTo(p, part(G.cyl(0.015, 0.02, 0.7, 3), stage === 3 ? 0xd8b050 : look.leaf), [(i - 1) * 0.07, 0.35, 0], [0, 0, (i - 1) * 0.12]);
        if (stage >= 2) addTo(p, part(G.oct(0.06), stage === 3 ? look.fruit : lighter(look.leaf, 0.3)), [(i - 1) * 0.12, 0.74, 0], [0, 0, (i - 1) * 0.12], [0.7, 2.2, 0.7]);
      }
    } else {
      for (let i = 0; i < 4; i++) addTo(p, part(G.oct(0.1), i % 2 ? look.leaf : lighter(look.leaf, 0.2)), [Math.cos(i * 1.57) * 0.08, 0.2, Math.sin(i * 1.57) * 0.08],
        [Math.cos(i * 1.57) * 0.6, 0, Math.sin(i * 1.57) * 0.6], [0.6, 2, 0.25]);
      if (stage === 3 && look.kind === 'root') addTo(p, part(G.cone(0.1, 0.16, 6), look.fruit), [0, 0.04, 0]);
      if (stage >= 2 && look.kind === 'gourd' && n % 2 === 0) {
        const r = stage === 3 ? 0.3 : 0.15;
        for (let i = 0; i < 5; i++) addTo(p, part(G.ico(r * 0.62, 1), stage === 3 ? look.fruit : lighter(look.leaf, 0.35)), [Math.cos(i * 1.26) * r * 0.4, r * 0.7, Math.sin(i * 1.26) * r * 0.4]);
      }
    }
  });
  batchParts(g); return g;
}

/** The fishing float: a red-and-white bobber. */
export function buildFloat() {
  const root = new THREE.Group();
  addTo(root, part(G.ico(0.11, 1), 0xff5a5a), [0, 0.04, 0]);
  addTo(root, part(G.hemi(0.11, 8, 2), 0xffffff), [0, 0.04, 0], [Math.PI, 0, 0]);
  addTo(root, part(G.cyl(0.015, 0.015, 0.14, 4), 0x3a2340), [0, 0.18, 0]);
  return root;
}
