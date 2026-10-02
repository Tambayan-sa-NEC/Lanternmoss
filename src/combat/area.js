/* Area queries shared by the hero's area abilities, boss attacks and hazards: who stands inside a ground circle,
   whether a spot can be landed on, and where on the ground the mouse cursor points. Distances are measured along the
   surface (a flying boss low enough to reach still counts as "inside"; one soaring out of reach does not). */
import * as THREE from 'three';
import { PLANET_RADIUS as R } from '../config/game.js';
import { ctx } from '../core/context.js';
import { colliders } from '../physics/colliders.js';
import { camera } from '../render/scene.js';
import { arcDist, dirAlong, tangentToward } from '../utils/sphere.js';
import { groundHeight, ponds } from '../world/terrain.js';

const V3 = THREE.Vector3;
const _ray = new THREE.Ray(), _ndc = new V3(), _sphere = new THREE.Sphere(new V3(), R), _hit = new V3(), _u = new V3();

/** Highest an enemy can hover and still be caught by ground area effects (a diving boss climbing away is out of reach). */
export const AREA_MAX_ALT = 4.5;

/** Living, targetable enemies whose footprint overlaps the ground circle (center = surface direction, radius = arc length). */
export function enemiesInArea(center, radius, maxAlt = AREA_MAX_ALT) {
  const out = [];
  for (const e of ctx.enemies) {
    if (!e.alive || e.hidden || e.hover > maxAlt) continue;
    if (arcDist(e.up, center) < radius + e.def.radius) out.push(e);
  }
  return out;
}

/** True when the hero is inside the ground circle; grounded = also require feet near the ground (jumpable attacks). */
export function playerInArea(center, radius, grounded = false) {
  const P = ctx.player; if (P.dead) return false;
  if (grounded && P.r - groundHeight(P.up) > 0.9) return false;
  return arcDist(P.up, center) < radius + P.radius;
}

/** Fraction 0 (centre) .. 1 (edge) of how far from the centre the hero / an enemy is, for damage falloff. */
export function edgeFraction(up, center, radius) { return Math.min(1, arcDist(up, center) / Math.max(0.01, radius)); }

/** A spot the hero can stand on: not in a pond and not inside a tree, rock, house or pond edge. */
export function landable(dir, radius) {
  if (ponds.some(p => arcDist(dir, p.dir) < p.r + 0.4)) return false;
  for (const c of colliders) if (c.active && arcDist(dir, c.dir) < c.r + radius) return false;
  return true;
}

/** Nearest landable spot to `dir` along the line back toward `from` (then in small circles around it), or null. */
export function nearestLandable(from, dir, radius) {
  if (landable(dir, radius)) return dir.clone();
  const back = tangentToward(dir, from), total = arcDist(from, dir);
  for (let s = 0.6; s < total; s += 0.6) { const d = dirAlong(dir, back, s); if (landable(d, radius)) return d; }
  return null;
}

/** dir clamped to at most `range` along the surface from `from`. */
export function clampRange(from, dir, range) {
  const d = arcDist(from, dir); return d <= range ? dir.clone() : dirAlong(from, tangentToward(from, dir), range);
}

const below = p => p.length() < groundHeight(_u.copy(p).normalize());
/** Surface direction under a screen point (NDC -1..1), or null when it points at the sky. Marches the view ray
    against the real terrain height (a sphere test misses grazing rays toward the horizon, where hills rise above R). */
export function groundUnderScreen(nx, ny) {
  _ndc.set(nx, ny, 0.5).unproject(camera);
  _ray.origin.copy(camera.position); _ray.direction.copy(_ndc).sub(camera.position).normalize();
  _sphere.radius = R + 1.5;                                       // above the highest hill: skip the empty sky
  if (!_ray.intersectSphere(_sphere, _hit)) return null;
  let a = Math.max(0, _hit.distanceTo(_ray.origin) - 0.01), b = -1;
  if (_ray.origin.length() < R + 1.5) a = 0;
  for (let t = a; t < a + 80; t += 0.5) if (below(_ray.at(t, _hit))) { b = t; break; }
  if (b < 0) return null;
  for (let i = 0, lo = Math.max(a, b - 0.5); i < 10; i++) {       // bisect to the ground
    const mid = (lo + b) / 2; if (below(_ray.at(mid, _hit))) b = mid; else lo = mid;
  }
  return _u.copy(_ray.at(b, _hit)).normalize().clone();
}
