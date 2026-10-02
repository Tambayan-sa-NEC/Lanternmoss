/* The village: houses, the standing-stone circle and the lantern-lit paths that join them. */
import * as THREE from 'three';
import { addCollider, freeOfColliders } from '../physics/colliders.js';
import { G, LM } from '../render/meshes.js';
import { rpick, rr } from '../utils/random.js';
import { arcDist, dirAlong, offsetDir, randomDir, slerpDir, tangentToward } from '../utils/sphere.js';
import { placed, isFree } from './placement.js';
import { propCottage, propLantern, propMushroomHouse } from './props.js';
import { ponds, surfM, surfMFacing } from './terrain.js';

const V3 = THREE.Vector3;

/** kind = 'cottage' or a mushroom-cap colour. Houses face the village centre unless fwd is given. */
function placeHouse(B, houses, spawnDir, dir, kind, fwd) {
  fwd = fwd || tangentToward(dir, spawnDir);
  const M = surfMFacing(dir, fwd, 1, -0.15);
  if (kind === 'cottage') propCottage(B, M); else propMushroomHouse(B, M, kind);
  const r = kind === 'cottage' ? 2.0 : 1.8;
  addCollider(dir, r, { r: kind === 'cottage' ? 2.2 : 2.9, top: 4.8 });
  placed.push({ dir, r: 3.4 });
  const door = dirAlong(dir, fwd, r + 1.4);
  houses.push({ dir, door, fwd, r, kind });
  return houses[houses.length - 1];
}

function buildStoneCircle(B, stoneCenter) {
  for (let i = 0; i < 7; i++) {
    const d = offsetDir(stoneCenter, i / 7 * Math.PI * 2, 5.2), fwd = tangentToward(d, stoneCenter), s = rr(0.85, 1.15);
    const A = B.at(surfMFacing(d, fwd, s, -0.2));
    A(G.box(1.0, 3.2, 0.7), rpick([0xb6aec8, 0xa8a2bf]), LM(0, 1.5, 0, rr(-0.06, 0.06), rr(-0.2, 0.2), rr(-0.06, 0.06)), { jitter: 0.12 });
    A(G.box(1.04, 0.3, 0.74), 0x8fcf7a, LM(0, 3.05, 0, 0, 0, 0.05));
    A(G.box(0.28, 0.55, 0.06), 0x8ff3ff, LM(0, 1.7, 0.36), { glow: true, intensity: 2.4 });
    addCollider(d, 0.72 * s, { r: 0.85 * s, top: 3.2 * s });
  }
  const A = B.at(surfM(stoneCenter, 0, 1, -0.1));
  A(G.cyl(1.2, 1.45, 0.55, 7), 0xa8a2bf, LM(0, 0.27, 0));
  A(G.cyl(1.25, 1.25, 0.08, 7), 0x8fcf7a, LM(0, 0.56, 0));
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; A(G.ico(0.1, 0), 0x9ff0ff, LM(Math.cos(a) * 3.3, 0.15, Math.sin(a) * 3.3), { glow: true, intensity: 2 }); }
  addCollider(stoneCenter, 1.45);
}

/** Stepping-stone paths along a minimum spanning tree between the village centre, the stone circle and every door. */
function buildPaths(B, spawnDir, stoneCenter, houses) {
  const nodes = [{ dir: spawnDir.clone() }, { dir: offsetDir(stoneCenter, Math.PI, 0) }, ...houses.map(h => ({ dir: h.door }))];
  nodes[1].dir = dirAlong(stoneCenter, tangentToward(stoneCenter, spawnDir), 6.6);
  const inTree = [0], edges = [];
  while (inTree.length < nodes.length) {
    let best = null;
    for (const i of inTree) for (let j = 0; j < nodes.length; j++) {
      if (inTree.includes(j)) continue;
      const d = arcDist(nodes[i].dir, nodes[j].dir); if (!best || d < best.d) best = { i, j, d };
    }
    inTree.push(best.j); edges.push(best);
  }
  const tmp = new V3(), nxt = new V3();
  for (const e of edges) {
    const a = nodes[e.i].dir, b = nodes[e.j].dir, n = Math.max(2, Math.floor(e.d / 1.35));
    for (let k = 0; k <= n; k++) {
      const t = k / n; slerpDir(a, b, t, tmp); slerpDir(a, b, Math.min(1, t + 0.01), nxt);
      const pathT = tangentToward(tmp, t < 1 ? nxt : b), side = new V3().crossVectors(pathT, tmp).normalize();
      const d = dirAlong(tmp.clone(), side, rr(-0.35, 0.35));
      if (ponds.some(p => arcDist(d, p.dir) < p.r + 0.9) || !freeOfColliders(d, 0.5)) continue;
      B.add(G.cyl(0.46, 0.52, 0.12, 6), rpick([0xefdcc6, 0xe2cfbd, 0xf5e6d2]), surfM(d, rr(0, 6), rr(0.8, 1.1), -0.02));
      placed.push({ dir: d, r: 0.6 });
      if (k % 5 === 2) {
        const ld = dirAlong(tmp.clone(), side, (k % 10 === 2 ? 1 : -1) * 1.45);
        if (!ponds.some(p => arcDist(ld, p.dir) < p.r + 1) && freeOfColliders(ld, 0.8)) {
          propLantern(B, surfM(ld, rr(0, 6), 1, -0.05)); addCollider(ld, 0.28); placed.push({ dir: ld, r: 0.6 });
        }
      }
    }
  }
}

/** Builds the whole village into B. Returns the house list plus the named houses villagers live by. */
export function buildVillage(B, spawnDir, stoneCenter) {
  const houses = [], place = (dir, kind) => placeHouse(B, houses, spawnDir, dir, kind);
  const houseA = place(offsetDir(spawnDir, 0.65, 11), 0xf26d6d);
  const cottage = place(offsetDir(spawnDir, 2.35, 11.5), 'cottage');
  place(offsetDir(spawnDir, 4.3, 12), 0xf49ac1);
  for (const kind of [0xe8795a, 'cottage', 0xa98cf0]) {
    for (let i = 0; i < 200; i++) { const d = randomDir(); if (arcDist(d, spawnDir) > 26 && isFree(d, 4)) { place(d, kind); break; } }
  }
  buildStoneCircle(B, stoneCenter);
  buildPaths(B, spawnDir, stoneCenter, houses);
  return { houses, houseA, cottage };
}
