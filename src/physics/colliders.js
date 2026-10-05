/* COLLIDERS: vertical cylinders in the planet's local frame.
   colliders    = static scenery (trees, rocks, houses...; `water` ones don't stop spells). One with a `top` is a solid
                  you can stand on (rocks): it only blocks walkers lower than its top, and supportHeight() counts it as floor
   dynColliders = moving bodies (player, critters, NPCs, enemies), resolved in creation order
   camColliders = static colliders that also block the camera (subset of colliders, with a height range) */
import * as THREE from 'three';
import { PLANET_RADIUS as R, WORLD } from '../config/game.js';
import { arcDist, projectTangent } from '../utils/sphere.js';
import { groundHeight, waterAt } from '../world/terrain.js';

const V3 = THREE.Vector3;
export const colliders = [], dynColliders = [], camColliders = [], solids = [];

/** cam = { r, base, top } also blocks the camera; top = height you can stand on (a climbable solid). */
export function addCollider(dir, r, cam = null, top = null) {
  const c = { dir: dir.clone().normalize(), r, cull: Math.cos(Math.min(Math.PI, (r + 2.0) / R)), active: true };
  c.baseH = groundHeight(c.dir);
  if (top !== null) { c.top = top; solids.push(c); }
  if (cam) {
    Object.assign(c, { camR: cam.r, camBase: cam.base ?? 0, camTop: cam.top,
      camCull: Math.cos(Math.min(Math.PI, (cam.r + 2) / R)) }); camColliders.push(c);
  }
  colliders.push(c); return c;
}
/** Removes one static collider (a chest that's taken away). */
export function removeCollider(c) {
  let i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1);
  i = camColliders.indexOf(c); if (i >= 0) camColliders.splice(i, 1);
  i = solids.indexOf(c); if (i >= 0) solids.splice(i, 1);
}
/** Forgets all scenery colliders (the planet is being replaced). Moving bodies keep theirs. */
export function clearStaticColliders() { colliders.length = 0; camColliders.length = 0; solids.length = 0; }
/** A moving collider that tracks dirRef (the body's own `up` vector, shared by reference). */
export function addDyn(dirRef, r) { const c = { dir: dirRef, r, cull: Math.cos((r + 2.0) / R), active: true }; dynColliders.push(c); return c; }
export function removeDyn(c) { const i = dynColliders.indexOf(c); if (i >= 0) dynColliders.splice(i, 1); }

const _cv = new V3(), _cu = new V3(), _cn = new V3();
function pushOut(list, p, len, radius, self) {
  let hit = false;
  for (let i = 0; i < list.length; i++) {
    const c = list[i]; if (c === self || !c.active) continue;
    if (_cu.dot(c.dir) < c.cull) continue;                       // cheap broadphase
    if (c.top !== undefined && len - c.baseH >= c.top - WORLD.stepHeight) continue;   // on top of (or stepping onto) a solid
    _cv.copy(c.dir).multiplyScalar(len).sub(p);                  // vector to collider axis at same altitude
    _cv.addScaledVector(_cu, -_cv.dot(_cu));                     // flatten into local tangent plane
    const dist = _cv.length(), min = c.r + radius;
    if (dist < min) {
      if (dist < 1e-5) { _cv.set(1, 0.3, 0.2); projectTangent(_cv, _cu); } else _cv.divideScalar(dist);
      if (dist < 1e-5) _cv.normalize();
      p.addScaledVector(_cv, -(min - dist));                     // push out along contact normal => natural sliding
      _cn.addScaledVector(_cv, -1); hit = true;
    }
  }
  return hit;
}
/** Resolves overlaps of a moving circle (radius) at world position p (modified in place). Returns the push normal or null. */
export function resolveCollisions(p, radius, self) {
  let hit = false; _cn.set(0, 0, 0);
  for (let it = 0; it < 2; it++) {
    const len = p.length(); _cu.copy(p).divideScalar(len);
    if (pushOut(colliders, p, len, radius, self)) hit = true;
    if (pushOut(dynColliders, p, len, radius, self)) hit = true;
  }
  return hit && _cn.lengthSq() > 1e-8 ? _cn.normalize() : null;
}

const _cu2 = new V3();
export function cameraBlocked(q) {
  const len = q.length(); _cu2.copy(q).divideScalar(len);
  if (len < groundHeight(_cu2) + 0.35) return true;
  for (const c of camColliders) {
    if (_cu2.dot(c.dir) < c.camCull) continue;
    const along = q.dot(c.dir), h = along - c.baseH; if (h < c.camBase || h > c.camTop) continue;
    if (len * len - along * along < c.camR * c.camR) return true;
  }
  return false;
}

const _su = new V3();
/** What a walker at direction dir stands on: the ground, the top of a solid (a rock) it's over, and, for a swimmer in
    deep water, the depth it floats at. Returns { h (distance from the planet centre), water (waterAt or null) }. */
export function support(dir) {
  let h = groundHeight(dir);
  for (const s of solids) {
    if (!s.active || dir.dot(s.dir) < s.cull) continue;
    _su.copy(dir).sub(_cv.copy(s.dir).multiplyScalar(dir.dot(s.dir)));        // tangential offset from the solid's axis
    if (_su.length() * R < s.r * 0.92) h = Math.max(h, s.baseH + s.top);
  }
  const water = waterAt(dir);
  if (water && water.depth > WORLD.water.deep) h = Math.max(h, water.level - WORLD.water.swimDepth);
  return { h, water };
}
/** Just the height of support(dir). */
export function supportHeight(dir) { return support(dir).h; }

export function freeOfColliders(dir, rad) { for (const c of colliders) if (arcDist(dir, c.dir) < c.r + rad) return false; return true; }

const _hs = new V3();
/** True if a point overlaps a static collider (trees, rocks, houses...). Pond water does not block spells. */
export function hitsStatic(p, radius) {
  const len = p.length(); _hs.copy(p).divideScalar(len);
  for (const c of colliders) {
    if (c.water || !c.active || _hs.dot(c.dir) < c.cull) continue;
    _cv.copy(c.dir).multiplyScalar(len).sub(p); _cv.addScaledVector(_hs, -_cv.dot(_hs)); if (_cv.length() < c.r + radius) return true;
  }
  return false;
}
