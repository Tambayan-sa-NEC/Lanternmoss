/* Shared chibi humanoid rig (legs, torso, arms, big head) and the anime face used by heroes, villagers and goblins. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

export function addFace(head, { eye = 0x2a1830, blush = 0xff9fb0, z = 0.335, y = -0.02, sep = 0.13, big = 1 } = {}) {
  for (const sx of [-1, 1]) {
    addTo(head, part(G.box(0.075 * big, 0.14 * big, 0.04), eye, { outline: false }), [sx * sep, y, z], [0, sx * 0.35, 0]);
    addTo(head, part(G.box(0.03, 0.04, 0.02), 0xffffff, { glow: true, intensity: 1 }), [sx * sep + 0.016, y + 0.035 * big, z + 0.022], [0, sx * 0.35, 0]);
    addTo(head, part(G.ico(0.06, 0), blush, { outline: false }), [sx * (sep + 0.08), y - 0.09, z - 0.045], [0, 0, 0], [1, 0.45, 0.4]);
  }
  addTo(head, part(G.box(0.07, 0.022, 0.02), 0x8a3a4a, { outline: false }), [0, y - 0.13, z - 0.005]);
}
export function buildHumanoid(c) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const w = c.w || 1; const legs = [], arms = [];
  for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * 0.14 * w, 0.52, 0); body.add(hip);
    addTo(hip, part(G.box(0.17, 0.42, 0.19), c.pants), [0, -0.2, 0]); addTo(hip, part(G.box(0.2, 0.14, 0.27), c.shoes), [0, -0.45, 0.03]); legs.push(hip); }
  addTo(body, part(G.cyl(0.25 * w, 0.34 * w, 0.55, 7), c.top), [0, 0.82, 0]);
  addTo(body, part(G.cyl(0.35 * w, 0.41 * w, 0.17, 7), c.hem || c.top), [0, 0.56, 0]);
  addTo(body, part(G.cyl(0.27 * w, 0.29 * w, 0.06, 7), c.belt || 0x7a4a3a), [0, 0.66, 0]);
  for (const sx of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(sx * (0.29 * w + 0.05), 1.04, 0); sh.rotation.z = sx * 0.08; body.add(sh);
    addTo(sh, part(G.box(0.13, 0.38, 0.14), c.sleeve || c.top), [0, -0.17, 0]); addTo(sh, part(G.ico(0.085, 0), c.skin), [0, -0.4, 0]); arms.push(sh); }
  const head = new THREE.Group(); head.position.set(0, 1.42, 0); body.add(head);
  addTo(head, part(G.ico(0.36, 1), c.skin), [0, 0, 0]); addFace(head, c.face || {});
  return { root, body, head, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1] };
}
