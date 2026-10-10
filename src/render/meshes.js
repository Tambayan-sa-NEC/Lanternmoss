/* Building blocks for the procedural models: primitive geometries, outlined toon parts and local transforms. */
import * as THREE from 'three';
import { facet, glowMat, outlineGeo, outlineMat, toonMat } from './materials.js';

const V3 = THREE.Vector3;

export const G = {
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
  cyl: (rt, rb, h, s = 6) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 6) => new THREE.ConeGeometry(r, h, s),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  oct: r => new THREE.OctahedronGeometry(r, 0),
  dodec: r => new THREE.DodecahedronGeometry(r, 0),
  hemi: (r, ws = 9, hs = 4) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2),
};

/** A dynamic mesh part with toon (or glow) material and its outline hull as a child.
    o.glow = unlit HDR colour (blooms), o.intensity = glow multiplier, o.outline = force the ink line on/off. */
export function part(geo, hex, o = {}) {
  const glow = !!o.glow, outline = o.outline ?? !glow;
  const m = new THREE.Mesh(facet(geo), glow ? glowMat(hex, o.intensity ?? 2.2) : toonMat(hex));
  if (outline) m.add(new THREE.Mesh(outlineGeo(geo), outlineMat));
  return m;
}
export function addTo(parent, mesh, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  mesh.position.set(...p); mesh.rotation.set(...r); if (typeof s === 'number') mesh.scale.setScalar(s); else mesh.scale.set(...s);
  parent.add(mesh); return mesh;
}
/** Frees the geometries of a model built from part() (materials are shared and cached, so they are kept). */
export function disposeTree(obj) {
  const disposed = new Set(); obj.traverse(o => {
    if (o.geometry && !disposed.has(o.geometry)) { o.geometry.dispose(); disposed.add(o.geometry); }
    if (o.isInstancedMesh) o.dispose();
  });
}

const _e = new THREE.Euler(), _qq = new THREE.Quaternion(), _ss = new V3(), _tt = new V3();
/** Local transform helper for building props (Euler order YXZ). */
export function LM(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ'); _qq.setFromEuler(_e); return new THREE.Matrix4().compose(_tt.set(x, y, z), _qq, _ss.set(sx, sy, sz));
}
