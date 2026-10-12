/* Appended after existing world population: the six original houses and seed-relative resource IDs are preserved. */
import { Batcher } from '../render/Batcher.js';
import { addCollider, freeOfColliders, removeCollider } from '../physics/colliders.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { arcDist, dirAlong, offsetDir, tangentToward } from '../utils/sphere.js';
import { propCottage } from './props.js';
import { groundHeight, ponds, slopeAt, surfMFacing } from './terrain.js';

export function buildHomeCottage(world, avoid = []) {
  let dir = null;
  for (let ring = 18; ring <= 44 && !dir; ring += 1) for (let a = 0; a < Math.PI * 2 && !dir; a += 0.08) {
    const d = offsetDir(world.spawnDir, a + 0.4, ring), fwd = tangentToward(d, world.spawnDir), door = dirAlong(d, fwd, 3.4);
    if (!freeOfColliders(d, 3) || !freeOfColliders(door, 1.2) || slopeAt(d) > 0.2 || slopeAt(door) > 0.3) continue;
    if (ponds.some(p => arcDist(d, p.dir) < p.r + 4) || avoid.some(([at, r]) => arcDist(d, at) < r + 3)) continue;
    if ([0, 1.57, 3.14, 4.71].some(b => Math.abs(groundHeight(offsetDir(d, b, 1.8)) - groundHeight(d)) > 0.6)) continue;
    dir = d;
  }
  if (!dir) throw new Error('No clear cottage site near the village');
  const fwd = tangentToward(dir, world.spawnDir), B = new Batcher();
  propCottage(B, surfMFacing(dir, fwd, 1, -0.15)); const root = B.build(); scene.add(root);
  const collider = addCollider(dir, 2, { r: 2.2, top: 4.8 });
  return { dir, door: dirAlong(dir, fwd, 3.4), fwd, r: 2, kind: 'cottage', root,
    dispose() { scene.remove(root); disposeTree(root); removeCollider(collider); } };
}
