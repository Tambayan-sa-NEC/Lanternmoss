/* TERRAIN: the height function shared by the planet mesh, physics and placement.
   Ponds carve into it, so every pond must exist before anything samples groundHeight for placement. */
import { PLANET_RADIUS as R } from '../config/game.js';
import { smoothstep } from '../utils/math.js';
import { dirAlong, matrixAt, tangentFrame } from '../utils/sphere.js';

export const ponds = [];

function baseHeight(d) {
  return R + 0.34 * Math.sin(d.x * 3.1 + 0.7) * Math.sin(d.y * 2.6 + 1.3)
           + 0.24 * Math.sin(d.z * 4.3 + d.x * 2.1) + 0.12 * Math.sin(d.y * 7.7 + d.z * 5.3 + 1.0);
}
export function groundHeight(d) {
  let h = baseHeight(d);
  for (const p of ponds) {
    const c = d.dot(p.dir); if (c < p.cull) continue;
    const a = Math.acos(Math.min(1, c)) * R; h -= p.depth * (1 - smoothstep(p.r - 1.5, p.r + 0.6, a));
  }
  return h;
}
export function addPond(dir, r) {
  const p = { dir: dir.clone().normalize(), r, depth: 1.8, cull: Math.cos((r + 0.8) / R), fish: [], jumpCool: 3 };
  ponds.push(p); return p;
}
/** Water level = just below the lowest shore point on the rim, measured along the pond's normal. */
export function computeWaterLevel(p) {
  let lo = Infinity; const [t1, t2] = tangentFrame(p.dir);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2; const t = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
    const d = dirAlong(p.dir, t, p.r); lo = Math.min(lo, groundHeight(d) * d.dot(p.dir));
  }
  p.water = lo - 0.08; p.t1 = t1; p.t2 = t2; p.center = p.dir.clone().multiplyScalar(p.water);
}

/** Matrix placing an object on the ground at direction dir, rotated by yaw about the surface normal. */
export function surfM(dir, yaw = 0, s = 1, lift = 0) {
  const [t1, t2] = tangentFrame(dir);
  const fwd = t1.multiplyScalar(Math.cos(yaw)).addScaledVector(t2, Math.sin(yaw));
  return matrixAt(dir.clone().multiplyScalar(groundHeight(dir) + lift), dir, fwd, s);
}
export function surfMFacing(dir, fwd, s = 1, lift = 0) { return matrixAt(dir.clone().multiplyScalar(groundHeight(dir) + lift), dir, fwd, s); }
