/* CAMERA: third-person, surface-aligned, collision-aware rig around the player. */
import * as THREE from 'three';
import { CAMERA, PLAYER } from '../config/game.js';
import { ctx } from '../core/context.js';
import { settings } from '../core/settings.js';
import { cameraBlocked } from '../physics/colliders.js';
import { camera } from '../render/scene.js';
import { clamp, damp } from '../utils/math.js';
import { mr } from '../utils/random.js';
import { projectTangent } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const V3 = THREE.Vector3;

/** fwd/up = view heading and up (transported around the sphere); pitch/dist = what the player asked for,
    effPitch/curDist = what obstacles allow; init = false snaps the follow target on the next frame. */
export const cam = { room: null, fwd: new V3(), up: new V3(), target: new V3(), pitch: CAMERA.pitch, effPitch: CAMERA.pitch, dist: settings.cameraDistance, curDist: settings.cameraDistance,
  lastDrag: -99, init: false, shake: 0 };

export function initCamera(player) { cam.fwd.copy(player.fwd); cam.up.copy(player.up); }
export function shakeCamera(amount) { cam.shake = Math.max(cam.shake, amount * settings.screenShake / 100); }
/** Jump straight to a new view frame (after respawning or restarting) instead of easing there. */
export function snapCamera(up, fwd) { cam.up.copy(up); cam.fwd.copy(fwd); cam.init = false; }
/** The default gameplay framing, looking along fwd. */
export function resetView(fwd) { cam.fwd.copy(fwd); cam.dist = settings.cameraDistance; cam.pitch = CAMERA.pitch; cam.init = false; }
/** Mouse-drag orbit (dx, dy in pixels), scaled by the sensitivity setting (and optionally inverted vertically). */
export function dragCamera(dx, dy) {
  const k = settings.mouseSensitivity / 100, sy = settings.invertY ? -1 : 1;
  cam.fwd.applyAxisAngle(cam.up, -dx * 0.005 * k); cam.pitch = clamp(cam.pitch + dy * 0.004 * k * sy, -0.05, 1.15); cam.lastDrag = ctx.time;
}
export function zoomCamera(sign) { cam.dist = clamp(cam.dist * (1 + sign * 0.1), CAMERA.minDist, CAMERA.maxDist); }
/** Indoors: a fixed dollhouse view looking down into the room from `back` (null = the normal follow camera). */
export function setRoomView(view) { cam.room = view; cam.init = false; }
const ROOM_PITCH = 0.92;
function updateRoomCamera(dt) {
  const P = ctx.player, { up, back } = cam.room, d = clamp(cam.dist, 5, 10);
  _tv.copy(P.pos).addScaledVector(up, 1.0);
  if (!cam.init) { cam.target.copy(_tv); cam.init = true; } else cam.target.lerp(_tv, damp(8, dt));
  camera.position.copy(cam.target).addScaledVector(back, Math.cos(ROOM_PITCH) * d).addScaledVector(up, Math.sin(ROOM_PITCH) * d);
  camera.up.copy(up); camera.lookAt(cam.target); cam.up.copy(up); cam.fwd.copy(back).negate();
}
/** Turns the view around the hero by `rad` (dragging on the character-select screen). */
export function spinCamera(rad) { cam.fwd.applyAxisAngle(cam.up, rad); }
/** Slow showcase orbit behind the menus: eases to `dist` and `pitch` while turning at `speed` rad/s. */
export function orbitCamera(dt, dist = 5.5, speed = 0.3, pitch = CAMERA.pitch) {
  cam.fwd.applyAxisAngle(cam.up, dt * speed); cam.dist += (dist - cam.dist) * damp(1.5, dt); cam.pitch += (pitch - cam.pitch) * damp(1.5, dt);
}

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
  if (cam.room) { updateRoomCamera(dt); return applyShake(dt); }
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
  applyShake(dt);
}
function applyShake(dt) {
  if (cam.shake <= 0) return;
  cam.shake = Math.max(0, cam.shake - dt); const a = cam.shake * 0.5;
  camera.position.add(_tv.set(mr(-a, a), mr(-a, a), mr(-a, a)));
}
