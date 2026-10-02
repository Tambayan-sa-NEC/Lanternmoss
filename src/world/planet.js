/* The planet mesh: a faceted icosphere displaced by groundHeight, coloured by meadow noise and pond shores. */
import * as THREE from 'three';
import { outlineGeo, outlineMat, toonVC } from '../render/materials.js';
import { clamp } from '../utils/math.js';
import { rand } from '../utils/random.js';
import { arcDist } from '../utils/sphere.js';
import { groundHeight, ponds } from './terrain.js';

export function buildPlanet() {
  const geo = new THREE.IcosahedronGeometry(1, 22);      // non-indexed, faceted
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); const h = groundHeight(v); pos.setXYZ(i, v.x * h, v.y * h, v.z * h); }
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo.computeVertexNormals();
  const greens = [0x8fd07a, 0x9edb86, 0xb3e393, 0x84c874].map(h => new THREE.Color(h));
  const meadow = new THREE.Color(0xd4eb9c), sand = new THREE.Color(0xf3dcaa), bed = new THREE.Color(0x5fae9e);
  const cols = new Float32Array(pos.count * 3), cen = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    cen.set(0, 0, 0); for (let k = 0; k < 3; k++) cen.add(v.fromBufferAttribute(pos, i + k)); cen.normalize();
    const n = Math.sin(cen.x * 5.1 + 1) * Math.sin(cen.y * 4.3) + 0.5 * Math.sin(cen.z * 6.7 + cen.y * 2);
    c.copy(greens[clamp(Math.floor((n + 1.5) / 3 * 4), 0, 3)]);
    if (rand() < 0.07) c.copy(meadow);
    for (const p of ponds) { const a = arcDist(cen, p.dir); if (a < p.r + 0.2) c.copy(bed); else if (a < p.r + 1.3) c.copy(sand); }
    c.multiplyScalar(1 + (rand() - 0.5) * 0.06);
    for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = c.r; cols[(i + k) * 3 + 1] = c.g; cols[(i + k) * 3 + 2] = c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, toonVC);
  const og = outlineGeo(geo); mesh.add(new THREE.Mesh(og, outlineMat));
  return mesh;
}
