/* PROP BUILDERS: static scenery, written into a Batcher (B) at matrix M. All randomness is the seeded world stream. */
import * as THREE from 'three';
import { G, LM } from '../render/meshes.js';
export { TREE_KINDS } from '../config/flora.js';
import { rand, rpick, rr } from '../utils/random.js';
import { AX_Y } from '../utils/sphere.js';

const V3 = THREE.Vector3;

export function propMushroomHouse(B, M, cap) {
  const A = B.at(M);
  A(G.cyl(1.25, 1.55, 2.6, 9), 0xfff1d6, LM(0, 1.3, 0));
  A(G.hemi(2.75, 10, 4), cap, LM(0, 2.3, 0, 0, 0, 0, 1, 0.78, 1), { jitter: 0.1 });
  A(G.cyl(2.72, 2.4, 0.2, 10), 0xf6d4b0, LM(0, 2.28, 0));
  for (let i = 0; i < 8; i++) { const th = i / 8 * Math.PI * 2 + rr(-0.3, 0.3), ph = rr(0.35, 1.25);
    const nrm = new V3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    const p = new V3(nrm.x * 2.72, nrm.y * 2.72 * 0.78 + 2.3, nrm.z * 2.72);
    const q = new THREE.Quaternion().setFromUnitVectors(AX_Y, nrm);
    A(G.ico(rr(0.28, 0.42), 0), 0xffffff, new THREE.Matrix4().compose(p, q, new V3(1, 0.35, 1)), { jitter: 0 }); }
  A(G.box(0.85, 1.3, 0.14), 0x8a5a44, LM(0, 0.65, 1.48));
  A(G.cyl(0.43, 0.43, 0.14, 8), 0x8a5a44, LM(0, 1.3, 1.46, Math.PI / 2, 0, 0));
  A(G.ico(0.07, 0), 0xffe08a, LM(0.26, 0.7, 1.58), { glow: true, intensity: 2.5 });
  for (const a of [0.9, -0.9, 2.4]) {
    A(G.cyl(0.36, 0.36, 0.1, 8), 0x7a5040, LM(Math.sin(a) * 1.36, 1.6, Math.cos(a) * 1.36, Math.PI / 2, a, 0));
    A(G.cyl(0.28, 0.28, 0.12, 8), 0xffc86a, LM(Math.sin(a) * 1.4, 1.6, Math.cos(a) * 1.4, Math.PI / 2, a, 0), { glow: true, intensity: 2.6 }); }
  A(G.cyl(0.18, 0.22, 0.9, 6), 0xa58474, LM(1.0, 3.9, -0.7, 0, 0, -0.15));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.3; if (Math.abs(a - Math.PI * 2) < 0.4 || a < 0.4) continue;
    A(G.dodec(0.28), 0xcfc6d8, LM(Math.sin(a) * 1.75, 0.08, Math.cos(a) * 1.75, rr(0, 3), rr(0, 3), 0, 1, 0.6, 1)); }
  A(G.cyl(0.6, 0.7, 0.14, 7), 0xd9c7b8, LM(0, 0.05, 2.0));
}
export function propCottage(B, M) {
  const A = B.at(M);
  A(G.box(3.0, 2.1, 2.4), 0xffe6d6, LM(0, 1.05, 0));
  A(G.cone(2.55, 1.8, 4), 0x7478d6, LM(0, 3.0, 0, 0, Math.PI / 4, 0), { jitter: 0.1 });
  A(G.box(0.45, 1.2, 0.45), 0xb08a7a, LM(0.8, 3.4, -0.4));
  for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) A(G.box(0.18, 2.15, 0.18), 0x8a5f4c, LM(x, 1.05, z));
  A(G.box(3.1, 0.16, 2.5), 0x8a5f4c, LM(0, 2.1, 0));
  A(G.box(0.75, 1.25, 0.1), 0x8a5a44, LM(0, 0.62, 1.22));
  A(G.ico(0.06, 0), 0xffe08a, LM(0.24, 0.65, 1.3), { glow: true, intensity: 2.5 });
  for (const [x, z, ry] of [[-0.95, 1.21, 0], [0.95, 1.21, 0], [1.51, 0, Math.PI / 2], [-1.51, 0, Math.PI / 2]]) {
    A(G.box(0.7, 0.7, 0.08), 0x6a4a3a, LM(x, 1.25, z, 0, ry, 0));
    A(G.box(0.55, 0.55, 0.1), 0xffc86a, LM(x, 1.25, z, 0, ry, 0), { glow: true, intensity: 2.6 });
    if (z > 1) { A(G.box(0.75, 0.16, 0.25), 0x9a6a4a, LM(x, 0.82, z + 0.1));
      for (let k = -1; k <= 1; k++) A(G.ico(0.09, 0), rpick([0xff8fb1, 0xffd36b, 0xb89cff]), LM(x + k * 0.22, 0.98, z + 0.12), { glow: true, intensity: 1.8 }); } }
  A(G.cyl(0.6, 0.7, 0.14, 7), 0xd9c7b8, LM(0, 0.05, 1.9));
}
/** What each tree kind (config/flora.js TREE_KINDS) looks like. */
const TREE_BUILDERS = {
  blossom(A) {                // puffy blossom tree
    const [c1, c2] = rpick([[0xffb7d0, 0xff9cc0], [0xb4efc6, 0x96dfae], [0xffd49e, 0xffbf80], [0xd8c2ff, 0xbfa6ff]]);
    A(G.cyl(0.2, 0.34, 2.8, 6), 0x9b6b5a, LM(0, 1.4, 0, 0, 0, 0.05));
    A(G.cyl(0.08, 0.13, 1.1, 5), 0x9b6b5a, LM(0.42, 2.3, 0, 0, 0, -0.8));
    A(G.ico(1.4, 1), c1, LM(0, 3.5, 0, 0, 0, 0, 1, 0.88, 1), { jitter: 0.1 });
    A(G.ico(0.95, 1), c2, LM(0.95, 3.05, 0.3), { jitter: 0.1 });
    A(G.ico(0.85, 1), c1, LM(-0.8, 3.15, -0.45), { jitter: 0.1 });
    A(G.ico(0.7, 1), c2, LM(0.1, 4.35, 0.2), { jitter: 0.1 });
    for (let i = 0; i < 3; i++) { const a = rr(0, 6.28); A(G.ico(0.11, 0), 0xfff2a0, LM(Math.cos(a) * 1.2, 2.45, Math.sin(a) * 1.2), { glow: true, intensity: 2.6 }); }
  },
  pine(A) {                   // whimsical spiral pine
    const c = rpick([0x6fcfb8, 0x8fa7f0, 0x9ad48a]);
    A(G.cyl(0.16, 0.26, 1.6, 5), 0x8a5f4c, LM(0, 0.8, 0));
    for (let i = 0; i < 3; i++) A(G.cone(1.5 - i * 0.38, 1.6, 7), c, LM(0, 1.9 + i * 1.05, 0, 0, i * 0.5, (i - 1) * 0.08), { jitter: 0.12 });
    A(G.oct(0.22), 0xfff0a0, LM(0.1, 4.95, 0), { glow: true, intensity: 3 });
  },
  shroom(A) {                 // giant glowing mushroom tree
    const cap = rpick([0x7fd6d0, 0xf5a3c7, 0xb9a3ff]);
    A(G.cyl(0.3, 0.45, 3.2, 7), 0xfff0dc, LM(0, 1.6, 0, 0, 0, 0.06));
    A(G.hemi(1.9, 9, 3), cap, LM(0.1, 3.1, 0, 0, 0, 0, 1, 0.55, 1), { jitter: 0.1 });
    A(G.cyl(1.88, 1.4, 0.18, 9), 0xfbe3f0, LM(0.1, 3.08, 0));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + rr(0, 0.5), rad = rr(0.6, 1.3);
      A(G.ico(0.16, 0), 0xcffcff, LM(0.1 + Math.cos(a) * rad, 3.1 + Math.sqrt(Math.max(0, 1.9 * 1.9 - rad * rad)) * 0.55, Math.sin(a) * rad, 0, 0, 0, 1, 0.5, 1), { glow: true, intensity: 2.2 }); }
  },
  oak(A) {                    // broad round oak: a thick trunk, low branches, a wide two-tone crown
    const [c1, c2] = rpick([[0x8fd07a, 0x74b862], [0xa8d870, 0x8cc05a], [0x7cc49a, 0x5fae84]]);
    A(G.cyl(0.32, 0.5, 2.4, 7), 0x8a5f4c, LM(0, 1.2, 0));
    for (const [x, rz] of [[-0.55, 0.9], [0.6, -0.85]]) A(G.cyl(0.1, 0.16, 1.2, 5), 0x8a5f4c, LM(x, 2.3, 0, 0, 0, rz));
    A(G.ico(1.7, 1), c1, LM(0, 3.6, 0, 0, 0, 0, 1.25, 0.8, 1.2), { jitter: 0.12 });
    A(G.ico(1.1, 1), c2, LM(1.25, 3.2, 0.4), { jitter: 0.12 }); A(G.ico(1.15, 1), c2, LM(-1.2, 3.3, -0.3), { jitter: 0.12 });
    A(G.ico(0.9, 1), c1, LM(0.2, 4.6, 0.3), { jitter: 0.12 });
    for (let i = 0; i < 4; i++) { const a = rr(0, 6.28); A(G.ico(0.13, 0), rpick([0xff7a7a, 0xffd36b]), LM(Math.cos(a) * 1.6, 2.9, Math.sin(a) * 1.6)); }   // fruit
  },
  willow(A) {                 // weeping willow: hanging curtains of leaves
    const c = rpick([0x9ad88a, 0x8fd0a0, 0xb0e090]);
    A(G.cyl(0.24, 0.4, 2.6, 6), 0x7a5a48, LM(0, 1.3, 0, 0, 0, 0.08));
    A(G.ico(1.4, 1), c, LM(0.2, 3.3, 0, 0, 0, 0, 1.3, 0.6, 1.3), { jitter: 0.08 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + rr(-0.2, 0.2), rad = rr(1.2, 1.7);
      A(G.cone(0.42, 2.2, 5), c, LM(0.2 + Math.cos(a) * rad, 2.0, Math.sin(a) * rad, Math.PI, 0, 0, 1, 1, 0.5), { jitter: 0.05 }); }
  },
  birch(A) {                  // tall, slim, white-barked, a light crown
    const c = rpick([0xd8f08a, 0xffe08a, 0xb8e890]);
    A(G.cyl(0.14, 0.22, 4.4, 6), 0xf4f0e8, LM(0, 2.2, 0));
    for (let i = 0; i < 5; i++) A(G.box(0.26, 0.06, 0.05), 0x3a3038, LM(0, 0.6 + i * 0.75, 0.17, 0, rr(0, 6), 0), { outline: false });
    A(G.ico(1.0, 1), c, LM(0, 4.7, 0, 0, 0, 0, 0.9, 1.3, 0.9), { jitter: 0.12 });
    A(G.ico(0.7, 1), c, LM(0.5, 3.9, 0.2), { jitter: 0.12 }); A(G.ico(0.6, 1), c, LM(-0.45, 4.0, -0.2), { jitter: 0.12 });
  },
  crystal(A) {                // a cluster of glowing crystal spires
    const c = rpick([0x9ff3ff, 0xd8b8ff, 0xffb8e0, 0xb8ffd8]);
    A(G.dodec(0.7), 0xa9a4b8, LM(0, 0.25, 0, 0, 0, 0, 1.3, 0.6, 1.3));
    A(G.oct(0.55), c, LM(0, 1.9, 0, 0, 0, 0, 0.8, 3.2, 0.8), { glow: true, intensity: 1.6 });
    for (const [x, z, h, rz] of [[0.6, 0.2, 1.8, -0.35], [-0.55, 0.3, 1.4, 0.4], [0.1, -0.6, 1.2, 0.2]])
      A(G.oct(0.32), c, LM(x, h * 0.55, z, 0, 0, rz, 0.8, h * 1.6, 0.8), { glow: true, intensity: 1.4 });
  },
  ember(A) {                  // Emberfall ash tree: a charred, twisted trunk, glowing orange leaves
    const c = rpick([0xff8a3a, 0xffb03d, 0xff6a4a]);
    A(G.cyl(0.2, 0.42, 2.8, 6), 0x3a2a28, LM(0, 1.4, 0, 0, 0, 0.12));
    A(G.cyl(0.08, 0.14, 1.4, 5), 0x3a2a28, LM(-0.5, 2.6, 0, 0, 0, 0.9)); A(G.cyl(0.07, 0.12, 1.2, 5), 0x3a2a28, LM(0.5, 2.8, 0.2, 0, 0, -0.8));
    for (const [x, y, z, r] of [[0, 3.5, 0, 1.2], [-1.0, 3.1, 0.1, 0.8], [1.0, 3.3, 0.3, 0.75], [0.2, 4.2, -0.2, 0.65]])
      A(G.ico(r, 1), c, LM(x, y, z, 0, 0, 0, 1, 0.8, 1), { glow: true, intensity: 1.15 });
    for (let i = 0; i < 3; i++) A(G.ico(0.1, 0), 0xffe08a, LM(rr(-1, 1), rr(2.4, 3), rr(-1, 1)), { glow: true, intensity: 3 });
  },
  snowpine(A) {               // Frostveil pine: dark tiers, each capped with snow
    const c = rpick([0x3f7a6a, 0x4a6a8a, 0x3a6a5a]);
    A(G.cyl(0.16, 0.26, 1.4, 5), 0x6a4a3c, LM(0, 0.7, 0));
    for (let i = 0; i < 4; i++) {
      const r = 1.6 - i * 0.34, y = 1.6 + i * 0.95;
      A(G.cone(r, 1.4, 7), c, LM(0, y, 0, 0, i * 0.4, 0), { jitter: 0.08 });
      A(G.cone(r * 0.82, 0.5, 7), 0xf4faff, LM(0, y + 0.45, 0, 0, i * 0.4, 0));
    }
  },
};
/** kind: a TREE_KINDS key (numbers 0-2 = the original blossom / pine / mushroom trees). */
export function propTree(B, M, kind) {
  const id = typeof kind === 'number' ? ['blossom', 'pine', 'shroom'][kind] : kind;
  TREE_BUILDERS[id](B.at(M));
}
export function propRock(B, M) {
  const A = B.at(M);
  A(G.dodec(1), rpick([0xb8b0c8, 0xc4b9c9, 0xa9a9c2]), LM(0, 0.32, 0, 0.2, 0, 0.1, 1.2, 0.75, 1));
  A(G.dodec(0.92), 0x8fcf7a, LM(0, 0.62, 0, 0.2, 0, 0.1, 1.08, 0.32, 0.92));
  A(G.dodec(0.38), 0xb8b0c8, LM(1.1, 0.12, 0.5, 1, 0, 0.4, 1, 0.8, 1));
}
export function propLantern(B, M) {
  const A = B.at(M);
  A(G.cyl(0.07, 0.1, 1.7, 5), 0x5a4050, LM(0, 0.85, 0));
  A(G.box(0.4, 0.06, 0.4), 0x5a4050, LM(0, 1.72, 0));
  A(G.box(0.27, 0.34, 0.27), 0xffb85c, LM(0, 1.95, 0), { glow: true, intensity: 3.4 });
  A(G.cone(0.3, 0.24, 4), 0x5a4050, LM(0, 2.24, 0, 0, Math.PI / 4, 0));
  A(G.ico(0.06, 0), 0x5a4050, LM(0, 2.4, 0));
  A(new THREE.CircleGeometry(2.3, 14).rotateX(-Math.PI / 2), 0xffa048, LM(0, 0.08, 0), { additive: true, radial: true, intensity: 0.45 });
}
export function propFlower(B, M, col) {
  const A = B.at(M), kind = Math.floor(rand() * 3);
  A(G.cyl(0.025, 0.035, 0.5, 4), 0x5fb35e, LM(0, 0.25, 0), { outline: false });
  A(G.cone(0.1, 0.04, 4), 0x7fd07a, LM(0.08, 0.12, 0, 0, 0, -0.9), { outline: false });
  if (kind === 0) A(G.ico(0.13, 0), col, LM(0, 0.56, 0), { glow: true, intensity: 1.9 });
  else if (kind === 1) A(G.cone(0.14, 0.2, 5), col, LM(0, 0.5, 0, Math.PI, 0, 0), { glow: true, intensity: 1.9 });
  else { A(G.cyl(0.17, 0.17, 0.03, 6), 0xfff6f0, LM(0, 0.52, 0, 0.3, 0, 0), { outline: false }); A(G.ico(0.07, 0), col, LM(0, 0.55, 0.01), { glow: true, intensity: 2.0 }); }
}
export function propSmallMushroom(B, M) {
  const A = B.at(M), glow = rand() < 0.4;
  A(G.cyl(0.05, 0.07, 0.3, 5), 0xfff0dc, LM(0, 0.15, 0));
  A(G.hemi(0.17, 6, 2), glow ? 0x9ff0ff : rpick([0xff7a7a, 0xffa6c9]), LM(0, 0.28, 0), glow ? { glow: true, intensity: 1.8 } : {});
}
