/* Ground warnings for the newer enemy attacks. A long flat mesh would float off this small curved planet, so lanes
   and rings are drawn as a row of glowing discs laid along the surface. */
import * as THREE from 'three';
import { discGeo, fxMaterial, groundPoint } from '../../../fx/combatFx.js';
import { scene } from '../../../render/scene.js';
import { dirAlong, frameQuat, tangentFrame } from '../../../utils/sphere.js';

const _d = new THREE.Vector3();

/** count discs sharing one material, registered on the enemy (hidden by hideTele, removed on dispose). */
export function makeDots(e, count, color, k = 1.2) {
  const mat = fxMaterial(color, k), dots = [];
  for (let i = 0; i < count; i++) { const m = new THREE.Mesh(discGeo, mat); m.renderOrder = 3; m.visible = false; scene.add(m); dots.push(m); e.fxMeshes.push(m); }
  return { dots, mat };
}

/** Lays the dots along the great circle from surface direction `from`, heading `dir` (tangent there), over `length`. */
export function layLane(lane, from, dir, length, width, opacity) {
  lane.mat.opacity = opacity; const n = lane.dots.length;
  lane.dots.forEach((m, i) => placeDot(m, dirAlong(from, dir, (i + 0.5) / n * length), width * 0.5));
}

/** Lays the dots in a circle of `radius` (arc length) around surface direction `center`. */
export function layRing(ring, center, radius, size, opacity) {
  const [t1, t2] = tangentFrame(center); ring.mat.opacity = opacity; const n = ring.dots.length;
  ring.dots.forEach((m, i) => {
    const a = i / n * Math.PI * 2; _d.copy(t1).multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
    placeDot(m, dirAlong(center, _d, radius), size);
  });
}

export function hideDots(set) { for (const m of set.dots) m.visible = false; }

function placeDot(m, dir, size) { m.visible = true; m.position.copy(groundPoint(dir, 0.1)); frameQuat(dir, tangentFrame(dir)[0], m.quaternion); m.scale.setScalar(size); }

/** Shows the enemy's warning disc at a ground point, growing with k (0..1). */
export function showDisc(e, pos, radius, k) {
  e.tele.visible = true; e.tele.position.copy(groundPoint(pos, 0.1)); frameQuat(e.up, e.fwd, e.tele.quaternion);
  e.tele.scale.setScalar(radius * (0.4 + 0.6 * k)); e.tele.material.opacity = 0.25 + 0.5 * k;
}
