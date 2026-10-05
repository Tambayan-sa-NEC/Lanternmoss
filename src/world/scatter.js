/* Natural scatter: pond decoration, trees, rocks, flowers, small mushrooms and instanced grass. Counts grow with the
   planet (WORLD.scatter); nothing is put on cliff faces (slopeAt). Rocks are solids you can stand on (a collider with a
   `top`); the big boulders need a jump. Ponds and lakes have no wall: you can wade and swim in them. */
import { WORLD } from '../config/game.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCollider, colliders, freeOfColliders } from '../physics/colliders.js';
import { facet, gradientMap } from '../render/materials.js';
import { G, LM } from '../render/meshes.js';
import { rand, rpick, rr } from '../utils/random.js';
import { arcDist, dirAlong, matrixAt, offsetDir, randomDir } from '../utils/sphere.js';
import { findSpot } from './placement.js';
import { propFlower, propRock, propSmallMushroom, propTree } from './props.js';
import { ponds, slopeAt, surfM } from './terrain.js';

const n = base => Math.round(base * WORLD.scatter);
/** A free spot (findSpot) that isn't on a steep slope. */
function flatSpot(r, maxSlope = 0.7) { for (let i = 0; i < 6; i++) { const d = findSpot(r); if (!d) return null; if (slopeAt(d) <= maxSlope) return d; } return null; }

export const FLOWER_COLORS = [0xff8fb1, 0x8ff0ff, 0xffd36b, 0xc5a6ff, 0xffa87a];

/** Rim stones, reeds and lily pads (the water itself can be waded and swum in: src/physics/Walker.js). */
export function decoratePonds(B) {
  for (const p of ponds) {
    const rim = Math.floor(p.r * 2.6);
    for (let i = 0; i < rim; i++) {
      if (rand() < 0.3) continue; const a = i / rim * 6.28 + rr(-0.1, 0.1);
      const t = p.t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(p.t2, Math.sin(a)), d = dirAlong(p.dir, t, p.r + rr(0.25, 0.6));
      B.add(G.dodec(rr(0.25, 0.42)), rpick([0xcfc6d8, 0xbdb4cc]), surfM(d, rr(0, 6), 1, 0.02).multiply(LM(0, 0, 0, 0, 0, 0, 1, 0.6, 1)));
    }
    for (let i = 0; i < 5; i++) {
      const a = rr(0, 6.28), t = p.t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(p.t2, Math.sin(a));
      const d = dirAlong(p.dir, t, p.r + 0.9); const A = B.at(surfM(d, 0));
      for (let k = 0; k < 3; k++) A(G.cone(0.05, 1.1, 3), 0x6fb46a, LM(rr(-0.2, 0.2), 0.5, rr(-0.2, 0.2), rr(-0.15, 0.15), 0, rr(-0.15, 0.15)), { outline: false });
      A(G.cyl(0.06, 0.06, 0.3, 5), 0x9a6a4a, LM(0, 1.1, 0));
    }
    for (let i = 0; i < Math.round(p.r); i++) {
      const a = rr(0, 6.28), rad = rr(1, p.r * 0.75);
      const pos = p.center.clone().addScaledVector(p.t1, Math.cos(a) * rad).addScaledVector(p.t2, Math.sin(a) * rad).addScaledVector(p.dir, 0.04);
      const M = matrixAt(pos, p.dir, p.t1, rr(0.8, 1.2)); const A = B.at(M);
      A(G.cyl(0.5, 0.5, 0.05, 8), 0x7fcf7a, LM(0, 0, 0)); if (rand() < 0.6) A(G.cone(0.14, 0.16, 5), 0xffa6d0, LM(0.1, 0.1, 0.1, Math.PI, 0, 0), { glow: true, intensity: 1.9 });
    }
  }
}

export function scatterFlora(B) {
  for (let i = 0; i < n(52); i++) {
    const d = flatSpot(2.1); if (!d) continue; const kind = rand() < 0.45 ? 0 : rand() < 0.6 ? 1 : 2, s = rr(0.8, 1.3);
    propTree(B, surfM(d, rr(0, 6.28), s, -0.1), kind);
    const cam = kind === 0 ? { r: 1.8 * s, base: 2.2 * s, top: 4.9 * s } : kind === 1 ? { r: 1.3 * s, base: 1.1 * s, top: 5 * s } : { r: 1.9 * s, base: 2.7 * s, top: 3.9 * s };
    addCollider(d, (kind === 2 ? 0.5 : 0.42) * s, cam);
  }
  for (let i = 0; i < n(22); i++) {                                   // rocks: stand on them (the big boulders need a jump)
    const big = rand() < 0.3, d = flatSpot(big ? 2.8 : 1.8, 0.55); if (!d) continue; const s = big ? rr(1.6, 2.3) : rr(0.7, 1.4);
    propRock(B, surfM(d, rr(0, 6.28), s, -0.05));
    addCollider(d, 1.05 * s, s > 1.1 ? { r: 1.1 * s, top: 1.0 * s } : null, 1.0 * s);
  }
  for (let c = 0; c < n(26); c++) {
    const center = flatSpot(1.0, 0.9); if (!center) continue; const col = rpick(FLOWER_COLORS);
    for (let i = 0; i < 7; i++) {
      const d = offsetDir(center, rr(0, 6.28), rr(0.2, 2.4));
      if (!ponds.some(p => arcDist(d, p.dir) < p.r + 0.8) && freeOfColliders(d, 0.25)) propFlower(B, surfM(d, rr(0, 6.28), rr(0.8, 1.3), -0.02), rand() < 0.75 ? col : rpick(FLOWER_COLORS));
    }
  }
  for (let c = 0; c < n(18); c++) {
    const center = flatSpot(0.8, 0.9); if (!center) continue;
    for (let i = 0; i < 4; i++) { const d = offsetDir(center, rr(0, 6.28), rr(0.1, 0.9)); if (freeOfColliders(d, 0.2)) propSmallMushroom(B, surfM(d, 0, rr(0.7, 1.5), -0.02)); }
  }
}

/** Instanced grass tufts (no outline, cheap), kept off ponds and large colliders. */
export function createGrass(colors) {
  const tuft = mergeGeometries([0, 1, 2].map(i => facet(new THREE.ConeGeometry(0.07, 0.5, 3, 1, true)).applyMatrix4(LM(Math.cos(i * 2.1) * 0.08, 0.22, Math.sin(i * 2.1) * 0.08, Math.cos(i * 2.1) * 0.35, 0, Math.sin(i * 2.1) * 0.35))));
  const N = n(900), mesh = new THREE.InstancedMesh(tuft, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap }), N);
  const col = new THREE.Color(); let k = 0;
  for (let i = 0; i < N * 3 && k < N; i++) {
    const d = randomDir();
    if (ponds.some(p => arcDist(d, p.dir) < p.r + 0.6)) continue;
    if (colliders.some(c => c.r > 0.9 && arcDist(d, c.dir) < c.r)) continue;
    mesh.setMatrixAt(k, surfM(d, rr(0, 6.28), rr(0.7, 1.4), -0.03)); mesh.setColorAt(k, col.set(rpick(colors))); k++;
  }
  mesh.count = k; return mesh;
}
