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
import { propFlower, propRock, propSmallMushroom, propTree, TREE_KINDS } from './props.js';
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

/** A key of `weights` ({ key: weight }), drawn from the seeded world stream. */
function weighted(weights) {
  const e = Object.entries(weights), total = e.reduce((t, [, w]) => t + w, 0); let r = rand() * total;
  for (const [k, w] of e) if ((r -= w) <= 0) return k;
  return e[e.length - 1][0];
}
/** A spot on a pond's or lake's bank (willows like their feet wet). */
function bankSpot() {
  for (let i = 0; i < 8; i++) {
    const p = rpick(ponds); if (!p) return null;
    const d = offsetDir(p.dir, rr(0, 6.28), p.r + rr(2.5, 4.5));
    if (freeOfColliders(d, 2.2) && slopeAt(d) < 0.6) return d;
  }
  return null;
}

/** Trees (the planet's own kinds: flora.trees weights, an occasional giant), rocks, flower clusters and small mushrooms.
    Returns how many trees of each kind grew; every tree and rock is also listed in spots ({ trees, rocks }: { dir, kind,
    s, r }) so they can be chopped and mined (src/gameplay/Gathering.js). */
export function scatterFlora(B, flora = {}, spots = { trees: [], rocks: [] }) {
  const trees = flora.trees ?? { blossom: 4, pine: 3, shroom: 2 }, flowerColors = flora.flowers ?? FLOWER_COLORS, grown = {};
  for (let i = 0; i < n(flora.treeCount ?? 52); i++) {
    const kind = weighted(trees), d = kind === 'willow' ? bankSpot() ?? flatSpot(2.1) : flatSpot(2.1); if (!d) continue;
    const s = rand() < (flora.giants ?? 0.07) ? rr(1.6, 2.1) : rr(0.75, 1.35), k = TREE_KINDS[kind];
    propTree(B, surfM(d, rr(0, 6.28), s, -0.1), kind); grown[kind] = (grown[kind] ?? 0) + 1;
    spots.trees.push({ dir: d, kind, s, r: k.r * s });
    addCollider(d, k.r * s, { r: k.cam.r * s, base: k.cam.base * s, top: k.cam.top * s });
  }
  for (let i = 0; i < n(22); i++) {                                   // rocks: stand on them (the big boulders need a jump)
    const big = rand() < 0.3, d = flatSpot(big ? 2.8 : 1.8, 0.55); if (!d) continue; const s = big ? rr(1.6, 2.3) : rr(0.7, 1.4);
    propRock(B, surfM(d, rr(0, 6.28), s, -0.05)); spots.rocks.push({ dir: d, kind: 'rock', s, r: 1.05 * s });
    addCollider(d, 1.05 * s, s > 1.1 ? { r: 1.1 * s, top: 1.0 * s } : null, 1.0 * s);
  }
  B.decorative = true; // flowers and mushrooms have no gameplay identity or collider
  for (let c = 0; c < n(26); c++) {
    const center = flatSpot(1.0, 0.9); if (!center) continue; const col = rpick(flowerColors);
    for (let i = 0; i < 7; i++) {
      const d = offsetDir(center, rr(0, 6.28), rr(0.2, 2.4));
      if (!ponds.some(p => arcDist(d, p.dir) < p.r + 0.8) && freeOfColliders(d, 0.25)) propFlower(B, surfM(d, rr(0, 6.28), rr(0.8, 1.3), -0.02), rand() < 0.75 ? col : rpick(flowerColors));
    }
  }
  for (let c = 0; c < n(18); c++) {
    const center = flatSpot(0.8, 0.9); if (!center) continue;
    for (let i = 0; i < 4; i++) { const d = offsetDir(center, rr(0, 6.28), rr(0.1, 0.9)); if (freeOfColliders(d, 0.2)) propSmallMushroom(B, surfM(d, 0, rr(0.7, 1.5), -0.02)); }
  }
  B.decorative = false;
  return grown;
}

/** The wind the grass and wildflowers sway in (set by the weather, src/world/weather.js; time by World.update). */
export const WIND = { uTime: { value: 0 }, uWind: { value: 0.35 } };

/** Partition the already seeded layout. Bounds include wind sway and stay full-size when density changes. */
export function chunkInstances(source, cellSize = 24) {
  const cells = new Map(), matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, matrix);
    const key = matrix.elements.slice(12, 15).map(x => Math.floor(x / cellSize)).join(',');
    if (!cells.has(key)) cells.set(key, []); cells.get(key).push(i);
  }
  const group = new THREE.Group();
  for (const indices of cells.values()) {
    const mesh = new THREE.InstancedMesh(source.geometry, source.material, indices.length);
    indices.forEach((index, i) => {
      source.getMatrixAt(index, matrix); mesh.setMatrixAt(i, matrix);
      if (source.instanceColor) { source.getColorAt(index, color); mesh.setColorAt(i, color); }
    });
    mesh.computeBoundingSphere(); mesh.boundingSphere.radius += 2;
    mesh.userData.fullCount = indices.length; group.add(mesh);
  }
  source.dispose(); return group;
}
/** A toon material whose instances lean with the wind, more the higher a vertex sits (y in the instance's frame). */
function swayMaterial(color = 0xffffff) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uWind = WIND.uWind;
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iw = instanceMatrix[3].xyz;
        float k = max(position.y, 0.0) * uWind;
        transformed.x += (sin(uTime * 1.9 + iw.x * 0.35 + iw.z * 0.21) * 0.6 + 0.45) * k * 0.55;
        transformed.z += cos(uTime * 1.4 + iw.y * 0.3) * k * 0.25;
      #endif`);
  };
  m.customProgramCacheKey = () => 'sway';
  return m;
}
/** A spot for low plants: not in water, not inside a big collider (and, with avoid, not near those spots). */
function plantSpot(d, avoid = []) {
  if (ponds.some(p => arcDist(d, p.dir) < p.r + 0.6)) return false;
  if (colliders.some(c => c.r > 0.9 && arcDist(d, c.dir) < c.r)) return false;
  return avoid.every(([a, r]) => arcDist(d, a) > r);
}

/** Instanced grass tufts (no outline, cheap, swaying), kept off ponds and large colliders. */
export function createGrass(colors, count = 1) {
  const tuft = mergeGeometries([0, 1, 2].map(i => facet(new THREE.ConeGeometry(0.07, 0.5, 3, 1, true)).applyMatrix4(LM(Math.cos(i * 2.1) * 0.08, 0.22, Math.sin(i * 2.1) * 0.08, Math.cos(i * 2.1) * 0.35, 0, Math.sin(i * 2.1) * 0.35))));
  const N = n(1400 * count), mesh = new THREE.InstancedMesh(tuft, swayMaterial(), N);
  const col = new THREE.Color(); let k = 0;
  for (let i = 0; i < N * 3 && k < N; i++) {
    const d = randomDir(); if (!plantSpot(d)) continue;
    mesh.setMatrixAt(k, surfM(d, rr(0, 6.28), rr(0.7, 1.4), -0.03)); mesh.setColorAt(k, col.set(rpick(colors))); k++;
  }
  mesh.count = k; return mesh;
}
/** Patches of tall grass (knee-high, swaying), out in the wilds: not in the village square. */
export function createTallGrass(colors, village, count = 1) {
  const blades = mergeGeometries([0, 1, 2, 3, 4].map(i => facet(new THREE.ConeGeometry(0.06, 1.0, 3, 1, true))
    .applyMatrix4(LM(Math.cos(i * 1.26) * 0.14, 0.46, Math.sin(i * 1.26) * 0.14, Math.cos(i * 1.26) * 0.28, 0, Math.sin(i * 1.26) * 0.28, 1, rr(0.8, 1.25), 1))));
  const N = n(520 * count), mesh = new THREE.InstancedMesh(blades, swayMaterial(), N), col = new THREE.Color(); let k = 0;
  for (let c = 0; c < N && k < N; c++) {
    const center = flatSpot(1.5, 0.8); if (!center || !plantSpot(center, [[village, 16]])) continue;
    const base = rpick(colors);
    for (let i = 0; i < 14 && k < N; i++) {
      const d = offsetDir(center, rr(0, 6.28), rr(0, 3.2)); if (!plantSpot(d, [[village, 16]])) continue;
      mesh.setMatrixAt(k, surfM(d, rr(0, 6.28), rr(0.75, 1.3), -0.05)); mesh.setColorAt(k, col.set(base).multiplyScalar(rr(0.85, 1.1))); k++;
    }
  }
  mesh.count = k; return mesh;
}
/** Wildflowers dotted through the meadows: a green stem and a coloured head per flower, both swaying. */
export function createMeadowFlowers(colors, count = 1) {
  const stemGeo = facet(new THREE.CylinderGeometry(0.018, 0.026, 0.42, 4)).translate(0, 0.21, 0);
  const headGeo = facet(new THREE.IcosahedronGeometry(0.075, 0)).translate(0, 0.44, 0);
  const N = n(700 * count), stems = new THREE.InstancedMesh(stemGeo, swayMaterial(0x6fbf62), N), heads = new THREE.InstancedMesh(headGeo, swayMaterial(), N);
  const col = new THREE.Color(); let k = 0;
  for (let c = 0; c < N && k < N; c++) {
    const center = flatSpot(0.8, 0.9); if (!center) continue; const base = rpick(colors);
    for (let i = 0; i < 9 && k < N; i++) {
      const d = offsetDir(center, rr(0, 6.28), rr(0, 2.6)); if (!plantSpot(d)) continue;
      const M = surfM(d, rr(0, 6.28), rr(0.8, 1.3), -0.02); stems.setMatrixAt(k, M); heads.setMatrixAt(k, M);
      heads.setColorAt(k, col.set(rand() < 0.8 ? base : rpick(colors)).multiplyScalar(1.15)); k++;
    }
  }
  stems.count = heads.count = k; return [stems, heads];
}
