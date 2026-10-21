/* GLOWMOSS FOOTPRINTS (TODO 30a, LANTERN.foot): the carpet of moss lighting up where the hero walks, Duskhollow's
   signature effect. One instanced mesh of flat glowing discs laid on the ground, so the whole trail is a single
   additive draw call. The pool is bounded: the oldest print is reused once `max` are alight, and the scenery-density
   setting scales the live count down (0 turns the trail off) without touching gameplay.
   The mechanic that owns the world (world/mechanics/lantern.js) prints, updates and disposes it. */
import * as THREE from 'three';
import { LANTERN } from '../config/lantern.js';
import { scene } from '../render/scene.js';
import { groundHeight } from '../world/terrain.js';
import { arcDist, matrixAt, tangentFrame } from '../utils/sphere.js';

const F = LANTERN.foot;
const _pos = new THREE.Vector3(), _col = new THREE.Color(), _hide = new THREE.Matrix4().makeScale(0, 0, 0);

export class Glowmoss {
  constructor(max = F.max) {
    const geo = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, _col.set(0, 0, 0));                       // allocates the instance colours
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 3;
    this.base = new THREE.Color(F.color).multiplyScalar(F.glow);
    this.max = max; this.limit = max; this.head = 0;
    this.life = new Float32Array(max); this.walked = 0; this.last = null;
    for (let i = 0; i < max; i++) { this.mesh.setMatrixAt(i, _hide); this.mesh.setColorAt(i, _col.set(0, 0, 0)); }
    scene.add(this.mesh);
  }

  /** Lights one print on the ground at surface direction `dir`, facing tangent `fwd` (any tangent will do). */
  print(dir, fwd = null) {
    if (this.limit <= 0) return null;
    const i = this.head; this.head = (this.head + 1) % this.limit;
    _pos.copy(dir).multiplyScalar(groundHeight(dir) + F.lift);
    this.mesh.setMatrixAt(i, matrixAt(_pos, dir, fwd ?? tangentFrame(dir)[0], F.radius));
    this.mesh.instanceMatrix.needsUpdate = true;
    this.life[i] = F.life; this.fade(i, 1);
    return i;
  }

  /** Prints as the hero walks: one every LANTERN.foot.spacing metres of ground covered, never while airborne. */
  track(dir, fwd, grounded) {
    if (!grounded) { this.last = null; return null; }
    if (!this.last) { this.last = dir.clone(); this.walked = F.spacing; }
    this.walked += arcDist(this.last, dir);                            // metres over the planet's surface
    this.last.copy(dir);
    if (this.walked < F.spacing) return null;
    this.walked = 0; return this.print(dir, fwd);
  }

  update(dt) {
    let changed = false;
    for (let i = 0; i < this.limit; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] = Math.max(0, this.life[i] - dt); changed = true;
      this.fade(i, this.life[i] / F.life);
    }
    if (changed) this.mesh.instanceColor.needsUpdate = true;
  }
  fade(i, k) {
    this.mesh.setColorAt(i, _col.copy(this.base).multiplyScalar(k * k));   // additive: black is invisible
    this.mesh.instanceColor.needsUpdate = true;
  }
  /** Scenery density scales the trail; prints beyond the limit are put out so none are left hanging. */
  applyDensity(density) {
    this.limit = Math.max(0, Math.min(this.max, Math.floor(this.max * density)));
    this.head = this.limit > 0 ? this.head % this.limit : 0;
    for (let i = this.limit; i < this.max; i++) { this.life[i] = 0; this.fade(i, 0); }
    this.mesh.visible = this.limit > 0;
  }
  /** Live prints, for the checks. */
  get lit() { let n = 0; for (let i = 0; i < this.limit; i++) if (this.life[i] > 0) n++; return n; }

  dispose() {
    scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh.dispose();
  }
}
