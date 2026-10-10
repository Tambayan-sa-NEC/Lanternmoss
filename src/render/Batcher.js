/* Static scenery batches by spatial cell and material, with optional cosmetic density. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand } from '../utils/random.js';
import { glowVC, outlineGeo, outlineMat, poolMat, toonVC } from './materials.js';

const rankAt = m => { const e = m.elements, n = Math.sin(e[12] * 12.9898 + e[13] * 78.233 + e[14] * 37.719) * 43758.5453; return n - Math.floor(n); };
export class Batcher {
  constructor({ cellSize = 0 } = {}) { this.cellSize = cellSize; this.buckets = new Map(); this.decorative = false; }
  add(geo, hex, m, o = {}) {
    const glow = !!o.glow, additive = !!o.additive, outline = o.outline ?? (!glow && !additive);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
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
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.applyMatrix4(m); g.computeVertexNormals();
    const rank = this.decorative ? (o.densityRank ?? rankAt(m)) : -1;
    this.store(g, additive ? poolMat : glow ? glowVC : toonVC, m, rank);
    if (outline) { const og = outlineGeo(geo); og.applyMatrix4(m); og.computeVertexNormals(); this.store(og, outlineMat, m, rank); }
  }
  store(geometry, material, m, rank) {
    const e = m.elements, cell = this.cellSize ? [e[12], e[13], e[14]].map(x => Math.floor(x / this.cellSize)).join(',') : 'all';
    const key = `${cell}/${material.id}/${rank < 0 ? 'solid' : 'decoration'}`;
    if (!this.buckets.has(key)) this.buckets.set(key, { material, items: [] });
    this.buckets.get(key).items.push({ geometry, rank });
  }
  at(M) { const densityRank = rankAt(M); return (g, c, l, o) => this.add(g, c, M.clone().multiply(l), { ...o, densityRank }); }
  build() {
    const group = new THREE.Group();
    for (const { material, items } of this.buckets.values()) {
      items.sort((a, b) => a.rank - b.rank);
      const geometry = mergeGeometries(items.map(i => i.geometry)), mesh = new THREE.Mesh(geometry, material);
      geometry.computeBoundingSphere();
      if (material === poolMat) mesh.renderOrder = 2;
      if (items[0].rank >= 0) {
        let count = 0;
        mesh.userData.densityStops = items.map(i => ({ rank: i.rank, count: count += i.geometry.index?.count ?? i.geometry.attributes.position.count }));
      }
      group.add(mesh); for (const i of items) i.geometry.dispose();
    }
    this.buckets.clear(); return group;
  }
}

export function setSceneryDensity(group, density) {
  group.traverse(mesh => {
    const stops = mesh.userData.densityStops; if (!stops) return;
    let count = 0; for (const stop of stops) { if (stop.rank >= density) break; count = stop.count; }
    mesh.geometry.setDrawRange(0, count); mesh.visible = count > 0;
  });
}
