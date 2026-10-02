/* Who the hero is aiming at (soft lock-on) and who they hit last (the owl follows up on it). */
import * as THREE from 'three';
import { COMBAT } from '../config/combat.js';
import { ctx } from '../core/context.js';
import { cam } from '../systems/CameraSystem.js';
import { projectTangent, tangentTo } from '../utils/sphere.js';

const V3 = THREE.Vector3;
export const targeting = { aim: null, lastHit: null, lastHitT: -99 };

const _aim = new V3(), _a2 = new V3();
/** Nearest living enemy inside a cone around the camera direction. */
function findAimTarget() {
  const player = ctx.player;
  _aim.copy(cam.fwd); projectTangent(_aim, player.up).normalize();
  const cosMax = Math.cos(THREE.MathUtils.degToRad(COMBAT.autoAimAngle)); let best = null, bestScore = Infinity;
  for (const e of ctx.enemies) {
    if (!e.alive || e.hidden) continue; const d = tangentTo(player.pos, player.up, e.pos, _a2);
    if (d > COMBAT.autoAimRange || d < 0.01) continue; const c = _aim.dot(_a2); if (c < cosMax) continue;
    const score = (1 - c) * 20 + d * 0.15; if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
}
/** Tangent direction to cast in: toward the locked target, else along the camera. */
export function aimDirection() {
  const out = new V3(), player = ctx.player, t = targeting.aim;
  if (t && t.alive) tangentTo(player.pos, player.up, t.pos, out); else { out.copy(cam.fwd); projectTangent(out, player.up).normalize(); }
  return out;
}
export function updateAim() { targeting.aim = ctx.player.dead ? null : findAimTarget(); }
export function noteHit(e) { targeting.lastHit = e; targeting.lastHitT = ctx.time; }
/** Drops an enemy that just died from the lock-on. */
export function forgetTarget(e) { if (targeting.aim === e) targeting.aim = null; }
export function clearTargets() { targeting.aim = targeting.lastHit = null; }
