/* A deterministic village landmark, placed after seeded scenery/resources so existing layouts keep their IDs. */
import * as THREE from 'three';
import { PLANETS } from '../config/planets.js';
import { addCollider, freeOfColliders, removeCollider } from '../physics/colliders.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { arcDist, matrixAt, offsetDir, tangentToward } from '../utils/sphere.js';
import { groundHeight, ponds, slopeAt } from './terrain.js';

export const PORTAL_COLORS = [0x9fea8f, 0xff9966, 0x9fe9ff];

export function buildPortal(world, avoid = []) {
  let dir = null;
  for (let r = 7; r <= 16 && !dir; r += 1) for (let a = 0; a < Math.PI * 2 && !dir; a += 0.12) {
    const d = offsetDir(world.spawnDir, a + 1.5, r);
    if (freeOfColliders(d, 2.6) && slopeAt(d) < 0.3 && !ponds.some(p => arcDist(d, p.dir) < p.r + 3)
      && !avoid.some(([at, radius]) => arcDist(d, at) < radius + 3)) dir = d;
  }
  if (!dir) throw new Error('No clear village portal site');
  const root = new THREE.Group(), fwd = tangentToward(dir, world.spawnDir), colliders = [];
  addTo(root, part(G.cyl(2.1, 2.3, 0.18, 12), 0x9a8fa7), [0, 0.05, 0]);
  for (const x of [-1.65, 1.65]) {
    addTo(root, part(G.box(0.5, 3.6, 0.6), 0x645063), [x, 1.8, 0]);
    const post = dir.clone().multiplyScalar(groundHeight(dir)).addScaledVector(new THREE.Vector3().crossVectors(fwd, dir), x).normalize();
    colliders.push(addCollider(post, 0.35, { r: 0.4, top: 3.8 }));
  }
  addTo(root, part(G.box(3.9, 0.45, 0.7), 0x645063), [0, 3.7, 0]);
  const lights = PLANETS.map((p, i) => {
    const lantern = addTo(root, part(G.oct(0.38), PORTAL_COLORS[i % PORTAL_COLORS.length], { glow: true }), [(i - (PLANETS.length - 1) / 2) * 0.85, 3.1, 0]);
    const dark = addTo(root, part(G.oct(0.38), 0x665d70), lantern.position.toArray());
    return { lantern, dark };
  });
  root.matrixAutoUpdate = false; root.matrix.copy(matrixAt(dir.clone().multiplyScalar(groundHeight(dir)), dir, fwd)); scene.add(root);
  return { dir, root, lights, dispose() { scene.remove(root); disposeTree(root); colliders.forEach(removeCollider); } };
}
