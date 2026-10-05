/* Free-spot searches for scatter placement (seeded, at generation) and runtime spawning (unseeded). */
import { freeOfColliders } from '../physics/colliders.js';
import { mr, rand, rr } from '../utils/random.js';
import { arcDist, offsetDir, randomDir } from '../utils/sphere.js';
import { ponds, slopeAt } from './terrain.js';

/** {dir, r} occupancy discs claimed by generated scenery. */
export const placed = [];

export function isFree(dir, r) {
  for (const p of placed) if (arcDist(dir, p.dir) < r + p.r) return false;
  for (const p of ponds) if (arcDist(dir, p.dir) < p.r + r + 0.9) return false;
  return true;
}
/** Seeded: a random free spot (optionally within [near.min, near.max] of near.dir), claimed in `placed`. */
export function findSpot(r, near = null, tries = 120) {
  for (let i = 0; i < tries; i++) {
    const d = near ? offsetDir(near.dir, rand() * Math.PI * 2, rr(near.min, near.max)) : randomDir();
    if (isFree(d, r)) { placed.push({ dir: d, r }); return d; }
  }
  return null;
}
/** Unseeded: a spot clear of colliders and ponds and not on a cliff, between minA and maxA from base (or anywhere when
    base is null). */
export function spawnSpot(base, minA, maxA, rad = 0.8) {
  for (let i = 0; i < 80; i++) {
    const d = base ? offsetDir(base, Math.random() * 6.28, mr(minA, maxA)) : randomDir(Math.random);
    if (freeOfColliders(d, rad) && !ponds.some(p => arcDist(d, p.dir) < p.r + 1) && (i > 60 || slopeAt(d) < 0.8)) return d;
  }
  return base ? base.clone() : randomDir(Math.random);
}
