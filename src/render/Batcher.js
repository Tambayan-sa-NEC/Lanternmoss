/* Static batcher: merges all scenery into a handful of draw calls (toon / glow / additive light pools / outlines). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand } from '../utils/random.js';
import { glowVC, outlineGeo, outlineMat, poolMat, toonVC } from './materials.js';

export class Batcher {
  constructor() { this.toon = []; this.glow = []; this.add_ = []; this.outline = []; }
  /** o: glow / additive / outline / intensity / jitter (per-face brightness variation, drawn from the seeded rand) / radial (fade to rim). */
  add(geo, hex, m, o = {}) {
    const glow = !!o.glow, additive = !!o.additive, outline = o.outline ?? (!glow && !additive);
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    const pa = g.attributes.position, n = pa.count, cols = new Float32Array(n * 3), c = new THREE.Color(hex);
    const k0 = glow ? (o.intensity ?? 2.2) : (additive ? (o.intensity ?? 1) : 1), jit = o.jitter ?? (glow || additive ? 0 : 0.07);
    let maxR = 0; if (o.radial) for (let i = 0; i < n; i++) maxR = Math.max(maxR, Math.hypot(pa.getX(i), pa.getZ(i)));
    for (let i = 0; i < n; i += 3) {
      const j = 1 + (rand() - 0.5) * jit;
      for (let v = 0; v < 3; v++) {
        let f = k0 * j; if (o.radial) f *= Math.pow(1 - Math.hypot(pa.getX(i + v), pa.getZ(i + v)) / maxR, 1.5);
        cols[(i + v) * 3] = c.r * f; cols[(i + v) * 3 + 1] = c.g * f; cols[(i + v) * 3 + 2] = c.b * f;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.applyMatrix4(m); g.computeVertexNormals();
    (additive ? this.add_ : glow ? this.glow : this.toon).push(g);
    if (outline) { const og = outlineGeo(geo); og.applyMatrix4(m); og.computeVertexNormals(); this.outline.push(og); }
  }
  /** Returns an adder that places geometry relative to matrix M (used by the prop builders). */
  at(M) { return (g, c, l, o) => this.add(g, c, M.clone().multiply(l), o); }
  build() {
    const grp = new THREE.Group();
    if (this.toon.length) grp.add(new THREE.Mesh(mergeGeometries(this.toon), toonVC));
    if (this.glow.length) grp.add(new THREE.Mesh(mergeGeometries(this.glow), glowVC));
    if (this.add_.length) { const m = new THREE.Mesh(mergeGeometries(this.add_), poolMat); m.renderOrder = 2; grp.add(m); }
    if (this.outline.length) grp.add(new THREE.Mesh(mergeGeometries(this.outline), outlineMat));
    return grp;
  }
}
