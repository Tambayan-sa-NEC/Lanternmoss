/* CAMERA: third-person, surface-aligned, collision-aware rig around the player. */
import * as THREE from 'three';
import { CAMERA, PLAYER } from '../config/game.js';
import { ctx } from '../core/context.js';
import { cameraBlocked } from '../physics/colliders.js';
import { camera } from '../render/scene.js';
import { clamp, damp } from '../utils/math.js';
import { mr } from '../utils/random.js';
import { projectTangent } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const V3 = THREE.Vector3;

/** fwd/up = view heading and up (transported around the sphere); pitch/dist = what the player asked for,
    effPitch/curDist = what obstacles allow; init = false snaps the follow target on the next frame. */
export const cam = { fwd: new V3(), up: new V3(), target: new V3(), pitch: CAMERA.pitch, effPitch: CAMERA.pitch, dist: CAMERA.dist, curDist: CAMERA.dist,
  lastDrag: -99, init: false, shake: 0 };

export function initCamera(player) { cam.fwd.copy(player.fwd); cam.up.copy(player.up); }
export function shakeCamera(amount) { cam.shake = Math.max(cam.shake, amount); }
/** Jump straight to a new view frame (after respawning or restarting) instead of easing there. */
export function snapCamera(up, fwd) { cam.up.copy(up); cam.fwd.copy(fwd); cam.init = false; }
/** The default gameplay framing, looking along fwd. */
export function resetView(fwd) { cam.fwd.copy(fwd); cam.dist = CAMERA.dist; cam.pitch = CAMERA.pitch; cam.init = false; }
/** Mouse-drag orbit (dx, dy in pixels). */
export function dragCamera(dx, dy) {
  cam.fwd.applyAxisAngle(cam.up, -dx * 0.005); cam.pitch = clamp(cam.pitch + dy * 0.004, -0.05, 1.15); cam.lastDrag = ctx.time;
}
export function zoomCamera(sign) { cam.dist = clamp(cam.dist * (1 + sign * 0.1), CAMERA.minDist, CAMERA.maxDist); }
/** Slow showcase orbit behind the character-select screen. */
export function orbitCamera(dt) { cam.fwd.applyAxisAngle(cam.up, dt * 0.3); cam.dist += (5.5 - cam.dist) * damp(2, dt); }

const _off = new V3(), _q = new V3(), _tv = new V3();
/** March from the head outward along the given pitch; returns the farthest unobstructed distance. */
function camMarch(pitch) {
  _off.copy(cam.fwd).multiplyScalar(-Math.cos(pitch)).addScaledVector(cam.up, Math.sin(pitch));
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    _q.copy(cam.target).addScaledVector(_off, i / steps * cam.dist);
    if (cameraBlocked(_q)) return Math.max(1.4, (i - 1) / steps * cam.dist - 0.3);
  }
  return cam.dist;
}

export function updateCamera(dt) {
  const P = ctx.player;
  if (!cam.init) { cam.target.copy(P.pos).addScaledVector(P.up, 1.4); cam.init = true; }
  cam.up.lerp(P.up, damp(10, dt)).normalize();
  projectTangent(cam.fwd, cam.up).normalize();                 // transport camera heading across the sphere (pole-safe)
  // gently swing behind the character while moving (never fights the mouse, never flips when backing up)
  const hs = P.vel.length();
  if (hs > 0.5 && ctx.time - cam.lastDrag > 1.5) {
    const d = cam.fwd.dot(P.fwd);
    if (d > -0.4) { cam.fwd.lerp(P.fwd, damp(1.3, dt) * clamp(d + 0.4, 0, 1) * Math.min(1, hs / PLAYER.walkSpeed)); projectTangent(cam.fwd, cam.up).normalize(); }
  }
  _tv.copy(P.pos).addScaledVector(P.up, 1.4); cam.target.lerp(_tv, damp(16, dt));
  // If a prop blocks the view, first try lifting the camera over it (keeps a nice back view), then pull in.
  let bestP = cam.pitch, bestD = -1;
  for (const p0 of [cam.pitch, cam.pitch + 0.25, cam.pitch + 0.5]) {
    const p = Math.min(Math.max(p0, cam.pitch), Math.max(cam.pitch, 0.95)), d = camMarch(p);
    if (d >= cam.dist * 0.6) { bestP = p; bestD = d; break; } if (d > bestD + 0.5) { bestD = d; bestP = p; }
  }
  if (bestD < 3) { const d = camMarch(1.2); if (d > bestD + 1) { bestD = d; bestP = 1.2; } }   // last resort: look down from above
  cam.effPitch += (bestP - cam.effPitch) * damp(5, dt);
  const allowed = camMarch(cam.effPitch);                        // _off now holds the direction for effPitch
  if (allowed < cam.curDist) cam.curDist = allowed; else cam.curDist += (allowed - cam.curDist) * damp(3, dt);
  camera.position.copy(cam.target).addScaledVector(_off, cam.curDist);
  const len = camera.position.length(); _tv.copy(camera.position).divideScalar(len);
  const gh = groundHeight(_tv) + 0.6; if (len < gh) camera.position.copy(_tv).multiplyScalar(gh);
  camera.up.copy(cam.up); camera.lookAt(cam.target);
  if (cam.shake > 0) {
    cam.shake = Math.max(0, cam.shake - dt); const a = cam.shake * 0.5;
    camera.position.add(_tv.set(mr(-a, a), mr(-a, a), mr(-a, a)));
  }
}
