/* The menus' still camera framings (no orbit; CameraSystem.setShowcase): the hero close up, and the pet showing off
   in front of the hero (Pets.presenting, PET_SHOWCASE in config/pets.js). clearStage turns the hero, if needed, to a
   heading where those views aren't blocked by a lamppost, a house or a hill.
   Used by src/ui/CharacterSelect.js and src/ui/PetMenu.js. */
import * as THREE from 'three';
import { PET_SHOWCASE } from '../config/pets.js';
import { ctx } from '../core/context.js';
import { showcaseClear } from '../systems/CameraSystem.js';
import { projectTangent } from '../utils/sphere.js';

/** The hero's framing: distance, pitch, the height looked at, and how far round from their front the camera sits. */
export const HERO_VIEW = { dist: 4.6, pitch: 0.22, lift: 1.05, turn: 0.5 };
const HEADINGS = [0, 1, -1, 2, -2, 3, -3, 4].map(k => k * Math.PI / 4);   // the current heading first, then round the compass
const viewOf = body => PET_SHOWCASE[body] ?? PET_SHOWCASE.walk;
const _fwd = new THREE.Vector3(), _at = new THREE.Vector3();

/** The point a pet's framing looks at: its show-off spot in front of the hero (not the pet, so hops don't move the camera). */
function petSpot(out, P, fwd, s) { return out.copy(P.pos).addScaledVector(fwd, s.ahead).addScaledVector(P.up, (s.height ?? 0) + s.lift); }

/** face = a tangent at the hero, from the subject toward the camera. */
export function heroShowcase(face) {
  const P = ctx.player, v = HERO_VIEW;
  return { at: out => out.copy(P.pos).addScaledVector(P.up, v.lift), up: P.up, face, dist: v.dist, pitch: v.pitch };
}
/** Sized for whichever body is out (a swap changes it on the fly). */
export function petShowcase(face) {
  const P = ctx.player, s = () => viewOf(ctx.companion?.def.body);
  return { at: out => petSpot(out, P, P.fwd, s()), up: P.up, face, get dist() { return s().dist; }, get pitch() { return s().pitch; } };
}

/** Finds a heading for the hero where the views are clear: the hero's own (hero = true) and the pet's for each body
    in `bodies`. Turns the hero to it and writes the camera side to `face`; false if nothing was clear (kept as is). */
export function clearStage(face, { hero = true, bodies = ['walk', 'fly'] } = {}) {
  const P = ctx.player, v = HERO_VIEW; projectTangent(P.fwd, P.up).normalize();
  for (const a of HEADINGS) for (const side of [1, -1]) {
    _fwd.copy(P.fwd).applyAxisAngle(P.up, a); face.copy(_fwd).applyAxisAngle(P.up, side * v.turn);
    if (hero && !showcaseClear(_at.copy(P.pos).addScaledVector(P.up, v.lift), P.up, face, v.dist, v.pitch)) continue;
    if (bodies.some(b => { const s = viewOf(b); return !showcaseClear(petSpot(_at, P, _fwd, s), P.up, face, s.dist, s.pitch); })) continue;
    P.fwd.copy(_fwd); return true;
  }
  face.copy(P.fwd).applyAxisAngle(P.up, v.turn);
  return false;
}
