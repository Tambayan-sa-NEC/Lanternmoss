/* GROUND DECALS: glowing shapes that hug the terrain (area-ability aim, boss warnings, lingering zones).
   A flat mesh would float off this small curved planet, so each decal keeps a flat unit template and re-projects
   every vertex onto the ground whenever it is placed. Template plane: x = right, y = forward (heading).
     disc    filled circle, radius 1          ring    circle outline, radius 1 (thin: a hairline one, for big circles)
     sector  wedge of `arc` radians centred on +y, radius 1
     lane    rectangle 1 wide, from y = 0 to y = 1 (scaled by width x length) */
import * as THREE from 'three';
import { scene } from '../render/scene.js';
import { dirAlong, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { fxMaterial } from './combatFx.js';

const V3 = THREE.Vector3;
const _right = new V3(), _off = new V3(), _fwd = new V3();

const TEMPLATES = {
  disc: () => new THREE.RingGeometry(0.0001, 1, 40, 5),
  ring: () => new THREE.RingGeometry(0.9, 1, 64, 1),
  thin: () => new THREE.RingGeometry(0.975, 1, 96, 1),
  sector: arc => new THREE.RingGeometry(0.0001, 1, 24, 5, Math.PI / 2 - arc / 2, arc),
  lane: () => new THREE.PlaneGeometry(1, 1, 1, 18).translate(0, 0.5, 0),
};

export class GroundDecal {
  /** o: arc (sector only, radians), k (glow strength), lift (height over the ground), order (render order). */
  constructor(shape, color, o = {}) {
    this.template = TEMPLATES[shape](o.arc ?? Math.PI / 3);
    this.geo = this.template.clone(); this.lift = o.lift ?? 0.12;
    this.mesh = new THREE.Mesh(this.geo, fxMaterial(color, o.k ?? 1.2));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = o.order ?? 3; this.mesh.visible = false; scene.add(this.mesh);
  }
  get visible() { return this.mesh.visible; }
  set opacity(v) { this.mesh.material.opacity = v; }
  setColor(color, k = 1.2) { this.mesh.material.color.set(color).multiplyScalar(k); }
  /** Lays the decal on the ground around surface direction `center`, heading `fwd` (any tangent; null = arbitrary),
      scaled sx sideways and sy forward (radius, or width x length for a lane). */
  place(center, fwd, sx, sy = sx) {
    if (fwd) _fwd.copy(fwd); else _fwd.copy(tangentFrame(center)[1]);
    _right.crossVectors(_fwd, center).normalize(); _fwd.crossVectors(center, _right).normalize();
    const src = this.template.attributes.position, dst = this.geo.attributes.position;
    for (let i = 0; i < src.count; i++) {
      _off.copy(_right).multiplyScalar(src.getX(i) * sx).addScaledVector(_fwd, src.getY(i) * sy);
      const arc = _off.length(), d = arc > 1e-5 ? dirAlong(center, _off.divideScalar(arc), arc) : center;
      const h = groundHeight(d) + this.lift; dst.setXYZ(i, d.x * h, d.y * h, d.z * h);
    }
    dst.needsUpdate = true; this.mesh.visible = true;
    return this;
  }
  hide() { this.mesh.visible = false; }
  dispose() { scene.remove(this.mesh); this.geo.dispose(); this.template.dispose(); this.mesh.material.dispose(); }
}
