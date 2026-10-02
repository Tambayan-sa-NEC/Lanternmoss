/* NPC villager models. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { addFace, buildHumanoid } from './humanoid.js';

export function buildWizard() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cyl(0.28, 0.58, 1.15, 7), 0x7a5cc8), [0, 0.58, 0]);
  addTo(body, part(G.cyl(0.59, 0.61, 0.09, 7), 0xffd36b), [0, 0.05, 0]);
  addTo(body, part(G.cyl(0.34, 0.36, 0.08, 7), 0xffd36b), [0, 0.86, 0]);
  const arms = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.33, 1.05, 0); body.add(g);
    addTo(g, part(G.cyl(0.1, 0.17, 0.46, 6), 0x7a5cc8), [0, -0.2, 0]); addTo(g, part(G.ico(0.085, 0), 0xffe2cc), [0, -0.46, 0]); arms.push(g); }
  arms[1].rotation.set(-0.5, 0, 0.35);
  const head = new THREE.Group(); head.position.set(0, 1.4, 0); body.add(head);
  addTo(head, part(G.ico(0.34, 1), 0xffe2cc), [0, 0, 0]);
  addFace(head, { z: 0.31, y: 0.01, sep: 0.12, big: 0.85 });
  addTo(head, part(G.cone(0.28, 0.62, 6), 0xfbf6ff), [0, -0.33, 0.14], [Math.PI + 0.25, 0, 0]);
  for (const sx of [-1, 1]) { addTo(head, part(G.box(0.14, 0.04, 0.04), 0xfbf6ff), [sx * 0.12, 0.12, 0.31], [0, 0, sx * -0.2]);
    addTo(head, part(G.box(0.16, 0.06, 0.06), 0xfbf6ff), [sx * 0.1, -0.1, 0.32], [0, 0, sx * 0.35]); }
  addTo(head, part(G.cyl(0.62, 0.62, 0.05, 9), 0x5a45a8), [0, 0.27, 0]);
  addTo(head, part(G.cone(0.35, 1.0, 7), 0x6a55c0), [-0.05, 0.78, -0.02], [-0.08, 0, 0.14]);
  addTo(head, part(G.cyl(0.36, 0.36, 0.08, 7), 0xffd36b), [0, 0.34, 0]);
  addTo(head, part(G.oct(0.09), 0xfff08a, { glow: true, intensity: 3 }), [-0.13, 1.27, -0.06]);
  const staff = new THREE.Group(); staff.position.set(0.55, 0, 0.25); root.add(staff);
  addTo(staff, part(G.cyl(0.035, 0.045, 1.95, 5), 0x8a5a3a), [0, 0.98, 0]);
  addTo(staff, part(new THREE.TorusGeometry(0.16, 0.03, 4, 8), 0x8a5a3a), [0, 2.05, 0]);
  const orb = addTo(staff, part(G.ico(0.14, 1), 0x8ff0ff, { glow: true, intensity: 2.4 }), [0, 2.05, 0]);
  return { root, body, head, armL: arms[0], armR: arms[1], orb };
}
export function buildBaker() {
  const h = buildHumanoid({ skin: 0xffd9c0, top: 0xffb38a, hem: 0xf29a74, pants: 0x7a5a4a, shoes: 0x5a3a2a, w: 1.25, face: { big: 0.9 } });
  addTo(h.body, part(G.box(0.5, 0.6, 0.06), 0xffffff), [0, 0.72, 0.36], [-0.1, 0, 0]);
  addTo(h.head, part(G.cyl(0.24, 0.26, 0.2, 7), 0xffffff), [0, 0.34, -0.02]);
  addTo(h.head, part(G.ico(0.3, 1), 0xffffff), [0, 0.55, -0.02], [0, 0, 0], [1, 0.72, 1]);
  addTo(h.head, part(G.ico(0.34, 1), 0x8a5a44), [0, 0.1, -0.1], [0, 0, 0], [1.03, 0.75, 0.95]);
  for (const sx of [-1, 1]) addTo(h.head, part(G.box(0.14, 0.05, 0.05), 0x8a5a44), [sx * 0.07, -0.1, 0.34], [0, 0, sx * 0.25]);
  const loaf = addTo(h.armL, part(G.cyl(0.08, 0.09, 0.7, 6), 0xe0a050), [0.02, -0.45, 0.12], [1.3, 0, 0.2]);
  for (let i = -1; i <= 1; i++) addTo(loaf, part(G.box(0.1, 0.03, 0.04), 0xfff0c8, { outline: false }), [0, i * 0.18, 0.08], [0.3, 0, 0]);
  h.armL.rotation.set(-0.6, 0, -0.15);
  return h;
}
export function buildBard() {
  const h = buildHumanoid({ skin: 0xffe6d2, top: 0x7cc46a, hem: 0x5fa653, pants: 0x8a6a4a, shoes: 0x5a3a2a, sleeve: 0xfff2d0 });
  addTo(h.head, part(G.ico(0.38, 1), 0x9a6a44), [0, 0.1, -0.08], [0, 0, 0], [1.02, 0.88, 1]);
  addTo(h.head, part(G.cone(0.42, 0.34, 7), 0xe0605a), [0.03, 0.38, -0.02], [0, 0, -0.18]);
  addTo(h.head, part(G.cone(0.05, 0.7, 4), 0xff9ad0), [-0.24, 0.55, -0.1], [0, 0, 0.9]);
  const lute = new THREE.Group(); lute.position.set(0.05, 0.78, 0.33); lute.rotation.z = 0.7; h.body.add(lute);
  addTo(lute, part(G.ico(0.22, 1), 0xd08850), [0, 0, 0], [0, 0, 0], [1, 1.15, 0.45]);
  addTo(lute, part(G.cyl(0.05, 0.05, 0.02, 7), 0x3a2340, { outline: false }), [0, 0.04, 0.1], [Math.PI / 2, 0, 0]);
  addTo(lute, part(G.box(0.07, 0.5, 0.05), 0x8a5a3a), [0, 0.45, 0]);
  h.armR.rotation.set(-0.7, 0, 0.3); h.lute = lute; return h;
}
export function buildSprite() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cone(0.24, 0.5, 6), 0x8fe08a), [0, 0.25, 0], [Math.PI, 0, 0]);
  addTo(body, part(G.cyl(0.08, 0.1, 0.2, 6), 0xfff0e0), [0, 0.52, 0]);
  const head = new THREE.Group(); head.position.set(0, 0.8, 0); body.add(head);
  addTo(head, part(G.ico(0.26, 1), 0xfff0e0), [0, 0, 0]);
  addFace(head, { z: 0.24, y: -0.02, sep: 0.09, big: 0.8 });
  addTo(head, part(G.ico(0.28, 1), 0x9ff5d8), [0, 0.08, -0.06], [0, 0, 0], [1.05, 0.9, 1]);
  addTo(head, part(G.ico(0.07, 0), 0xff9ad0, { glow: true, intensity: 2.3 }), [0.2, 0.2, 0.1]);
  for (const sx of [-1, 1]) { addTo(head, part(G.cyl(0.01, 0.01, 0.3, 3), 0x5fb35e, { outline: false }), [sx * 0.1, 0.36, 0], [0, 0, -sx * 0.3]);
    addTo(head, part(G.ico(0.045, 0), 0xfff08a, { glow: true, intensity: 3 }), [sx * 0.15, 0.5, 0]); }
  const wings = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.06, 0.5, -0.12); body.add(g);
    addTo(g, part(G.ico(0.28, 0), 0xcffaff, { glow: true, intensity: 1.5 }), [sx * 0.26, 0.14, 0], [0, 0, sx * 0.4], [1, 0.08, 0.55]);
    addTo(g, part(G.ico(0.2, 0), 0xffd6f5, { glow: true, intensity: 1.5 }), [sx * 0.2, -0.12, 0], [0, 0, -sx * 0.4], [1, 0.08, 0.5]); wings.push(g); }
  return { root, body, head, wingL: wings[0], wingR: wings[1] };
}
