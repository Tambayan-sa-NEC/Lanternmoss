/* The planet mesh: a faceted icosphere displaced by groundHeight, coloured by meadow noise, pond shores, steepness
   (cliff faces take the palette's cliff colour) and height (the highest ground blends toward its peak colour). */
import * as THREE from 'three';
import { PLANET_RADIUS as R, WORLD } from '../config/game.js';
import { outlineGeo, outlineMat, toonVC } from '../render/materials.js';
import { clamp, smoothstep } from '../utils/math.js';
import { rand } from '../utils/random.js';
import { arcDist } from '../utils/sphere.js';
import { groundHeight, maxRelief, ponds } from './terrain.js';

/** palette: ground (4 meadow greens), meadow, sand, bed (pond floor), cliff and peak colours. */
export function buildPlanet(palette) {
  const geo = new THREE.IcosahedronGeometry(1, WORLD.meshDetail);      // non-indexed, faceted
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); const h = groundHeight(v); pos.setXYZ(i, v.x * h, v.y * h, v.z * h); }
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo.computeVertexNormals();
  const greens = palette.ground.map(h => new THREE.Color(h));
  const meadow = new THREE.Color(palette.meadow), sand = new THREE.Color(palette.sand), bed = new THREE.Color(palette.bed);
  const cliff = new THREE.Color(palette.cliff ?? 0xb8ae9c), peak = new THREE.Color(palette.peak ?? palette.meadow), top = maxRelief();
  const cols = new Float32Array(pos.count * 3), cen = new THREE.Vector3(), c = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    cen.set(0, 0, 0); for (let k = 0; k < 3; k++) cen.add(v.fromBufferAttribute(pos, i + k));
    const height = cen.length() / 3 - R; cen.normalize();
    a.fromBufferAttribute(pos, i + 1).sub(v.fromBufferAttribute(pos, i)); b.fromBufferAttribute(pos, i + 2).sub(v);
    const up = Math.abs(n.crossVectors(a, b).normalize().dot(cen));                     // 1 = flat, 0 = vertical
    const nz = Math.sin(cen.x * 5.1 + 1) * Math.sin(cen.y * 4.3) + 0.5 * Math.sin(cen.z * 6.7 + cen.y * 2);
    c.copy(greens[clamp(Math.floor((nz + 1.5) / 3 * 4), 0, 3)]);
    if (rand() < 0.07) c.copy(meadow);
    c.lerp(peak, smoothstep(top * 0.45, top * 0.85, height) * 0.85);                     // high ground
    c.lerp(cliff, smoothstep(0.78, 0.6, up));                                              // steep faces
    for (const p of ponds) { const d = arcDist(cen, p.dir); if (d < p.r + 0.2) c.copy(bed); else if (d < p.r + 1.3) c.copy(sand); }
    c.multiplyScalar(1 + (rand() - 0.5) * 0.06);
    for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = c.r; cols[(i + k) * 3 + 1] = c.g; cols[(i + k) * 3 + 2] = c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, toonVC);
  const og = outlineGeo(geo); mesh.add(new THREE.Mesh(og, outlineMat));
  return mesh;
}
