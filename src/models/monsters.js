/* Enemy models. Builders must keep returning the part names Enemy.animate drives (legs/arms or body/core/ring). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { buildHumanoid } from './humanoid.js';

export function buildGoblin() {
  const h = buildHumanoid({ skin: 0x8fcf5a, top: 0x8a6a4a, hem: 0x6a5238, pants: 0x5a4a3a, shoes: 0x3a2a2a, belt: 0x3a2a2a, sleeve: 0x8fcf5a,
    face: { blush: 0x6fae4a } });
  for (const sx of [-1, 1]) addTo(h.head, part(G.cone(0.08, 0.38, 4), 0x8fcf5a), [sx * 0.38, 0.05, -0.02], [0, 0, -sx * 1.2]);
  addTo(h.head, part(G.cone(0.06, 0.2, 4), 0x7fbf4a), [0, -0.06, 0.36], [Math.PI / 2, 0, 0]);
  addTo(h.head, part(G.cone(0.32, 0.34, 6), 0x7a5a3a), [0, 0.32, -0.04], [0, 0, 0.15]);
  const dagger = new THREE.Group(); dagger.position.set(0, -0.42, 0.05); h.armR.add(dagger);
  addTo(dagger, part(G.box(0.05, 0.12, 0.05), 0x5a3a2a), [0, 0, 0]);
  addTo(dagger, part(G.box(0.04, 0.08, 0.36), 0xd6d6e6), [0, 0, 0.2]);
  h.root.scale.setScalar(0.78); return h;
}
export function buildOgre() {
  const h = buildHumanoid({ skin: 0xa3b38a, top: 0x8a6a9a, hem: 0x6a4a7a, pants: 0x5a4a3a, shoes: 0x4a3a2a, belt: 0x5a3a2a, sleeve: 0xa3b38a,
    w: 1.5, face: { blush: 0x8a9a6a, big: 0.8 } });
  addTo(h.body, part(G.ico(0.36, 1), 0x9a7aaa), [0, 0.8, 0.12], [0, 0, 0], [1.2, 1, 1]);
  for (const sx of [-1, 1]) addTo(h.head, part(G.cone(0.045, 0.16, 4), 0xfff6e6), [sx * 0.11, -0.16, 0.3], [-0.2, 0, 0]);
  addTo(h.head, part(G.box(0.42, 0.07, 0.08), 0x7a8a6a), [0, 0.1, 0.32]);
  addTo(h.head, part(G.ico(0.12, 0), 0x4a3a2a), [0, 0.38, -0.05]);
  const club = new THREE.Group(); club.position.set(0, -0.42, 0.05); h.armR.add(club);
  addTo(club, part(G.cyl(0.06, 0.15, 0.95, 6), 0x8a5a3a), [0, 0, 0.45], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) addTo(club, part(G.cone(0.04, 0.12, 4), 0xd6d6e6), [Math.cos(i * 2.1) * 0.14, Math.sin(i * 2.1) * 0.14, 0.75], [0, 0, i * 2.1 - Math.PI / 2]);
  h.root.scale.setScalar(1.55); return h;
}
export function buildWisp() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cone(0.42, 1.0, 7), 0x4a2e6a), [0, 0.45, 0]);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; addTo(body, part(G.cone(0.1, 0.3, 4), 0x4a2e6a), [Math.cos(a) * 0.3, -0.1, Math.sin(a) * 0.3], [Math.PI, 0, 0]); }
  addTo(body, part(G.ico(0.2, 1), 0x2a1840), [0, 0.55, 0.2]);
  for (const sx of [-1, 1]) addTo(body, part(G.box(0.06, 0.1, 0.03), 0x9ff3ff, { glow: true, intensity: 2.6 }), [sx * 0.07, 0.58, 0.38]);
  const core = addTo(body, part(G.ico(0.16, 1), 0xb27cff, { glow: true, intensity: 2.6 }), [0, 0.3, 0.45]);
  const ring = addTo(body, part(new THREE.TorusGeometry(0.55, 0.025, 4, 18), 0xb27cff, { glow: true, intensity: 1.8 }), [0, 0.45, 0], [Math.PI / 2, 0, 0]);
  return { root, body, core, ring };
}
export function buildSlime(scale = 1) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(0.5, 1), 0x7fd48a), [0, 0.35, 0], [0, 0, 0], [1, 0.72, 1]);
  addTo(body, part(G.cone(0.08, 0.22, 4), 0x5fb35e), [0.05, 0.75, -0.05], [0, 0, 0.2]);
  addTo(body, part(G.ico(0.06, 0), 0xff9ad0, { glow: true, intensity: 2 }), [0.08, 0.86, -0.05]);
  for (const sx of [-1, 1]) { addTo(body, part(G.box(0.07, 0.12, 0.03), 0x2a1830, { outline: false }), [sx * 0.15, 0.45, 0.44]);
    addTo(body, part(G.box(0.025, 0.035, 0.02), 0xffffff, { glow: true, intensity: 1 }), [sx * 0.15 + 0.015, 0.48, 0.46]); }
  root.scale.setScalar(scale); return { root, body };
}

/** COMBAT.enemies key -> builder. */
export const ENEMY_BUILDERS = { goblin: buildGoblin, ogre: buildOgre, wisp: buildWisp, slime: () => buildSlime(1), slimeling: () => buildSlime(0.55) };
