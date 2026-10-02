/* Geometry on the planet's surface. Positions are unit "directions" from the planet centre;
   headings are tangent vectors kept perpendicular to the local up. */
import * as THREE from 'three';
import { PLANET_RADIUS as R } from '../config/game.js';
import { clamp } from './math.js';
import { rand } from './random.js';

const V3 = THREE.Vector3;
const AX_X = new V3(1, 0, 0);
export const AX_Y = new V3(0, 1, 0);

export function randomDir(rng = rand) {
  const z = rng() * 2 - 1, t = rng() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  return new V3(s * Math.cos(t), z, s * Math.sin(t));
}
/** Any orthonormal tangent basis at a surface direction (used only for static placement). */
export function tangentFrame(up) {
  const ref = Math.abs(up.y) < 0.9 ? AX_Y : AX_X;
  const t1 = new V3().crossVectors(ref, up).normalize(); const t2 = new V3().crossVectors(up, t1).normalize(); return [t1, t2];
}
/** Remove the component of v along up (in place). This is our parallel transport on the sphere. */
export function projectTangent(v, up) { return v.addScaledVector(up, -v.dot(up)); }
/** Great-circle distance between two surface directions, in world units. */
export function arcDist(a, b) { return Math.acos(clamp(a.dot(b), -1, 1)) * R; }
export function dirAlong(base, tan, arc) { const th = arc / R; return base.clone().multiplyScalar(Math.cos(th)).addScaledVector(tan, Math.sin(th)).normalize(); }
export function offsetDir(base, heading, arc) {
  const [t1, t2] = tangentFrame(base);
  return dirAlong(base, t1.multiplyScalar(Math.cos(heading)).addScaledVector(t2, Math.sin(heading)), arc);
}
export function slerpDir(a, b, t, out = new V3()) {
  const om = Math.acos(clamp(a.dot(b), -1, 1)); if (om < 1e-5) return out.copy(a);
  const s = Math.sin(om); return out.copy(a).multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(b, Math.sin(t * om) / s);
}
export function tangentToward(fromDir, toDir) {
  const t = toDir.clone().sub(fromDir); projectTangent(t, fromDir);
  return t.lengthSq() > 1e-10 ? t.normalize() : tangentFrame(fromDir)[0];
}
/** Tangent direction (written to out) and distance from a surface point toward a target point. */
export function tangentTo(from, up, to, out) {
  out.copy(to).sub(from); projectTangent(out, up); const d = out.length();
  if (d > 1e-5) out.divideScalar(d); return d;
}
/** Smoothly rotate a tangent heading toward a target tangent direction. */
export function turnToward(fwd, target, up, k) {
  if (fwd.dot(target) < -0.97) fwd.addScaledVector(new V3().crossVectors(up, fwd), 0.3);
  fwd.lerp(target, k); projectTangent(fwd, up).normalize();
}

const _mx = new V3(), _mz = new V3(), _mb = new THREE.Matrix4();
/** Quaternion whose local +Y = up and local +Z = fwd (characters and props face +Z). */
export function frameQuat(up, fwd, q = new THREE.Quaternion()) {
  _mx.crossVectors(up, fwd).normalize(); _mz.crossVectors(_mx, up);
  _mb.makeBasis(_mx, up, _mz); return q.setFromRotationMatrix(_mb);
}
export function matrixAt(pos, up, fwd, s = 1) {
  const sc = typeof s === 'number' ? new V3(s, s, s) : s;
  return new THREE.Matrix4().compose(pos.clone(), frameQuat(up, fwd), sc);
}
