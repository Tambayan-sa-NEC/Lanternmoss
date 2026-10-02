/* Playable hero models. Each returns its part map (root, body, head, limbs + extras the animations drive). */
import * as THREE from 'three';
import { fxMaterial } from '../fx/combatFx.js';
import { addTo, G, part } from '../render/meshes.js';
import { buildHumanoid } from './humanoid.js';

export function buildWitch() {
  const hair = 0xf7a1c4;
  const h = buildHumanoid({ skin: 0xffe2cc, top: 0x6ccfc0, hem: 0x58b8aa, pants: 0x46508a, shoes: 0x7a4a3a, sleeve: 0x6ccfc0 });
  const hd = h.head;
  addTo(hd, part(G.ico(0.4, 1), hair), [0, 0.1, -0.07], [0, 0, 0], [1.02, 0.92, 1]);
  for (const i of [-1, 0, 1]) addTo(hd, part(G.cone(0.1, 0.28, 4), hair), [i * 0.13, 0.2, 0.26], [Math.PI - 0.35, 0, i * 0.2]);
  addTo(hd, part(G.cone(0.05, 0.32, 4), hair), [0.03, 0.5, 0.02], [0.5, 0, -0.4]);                    // ahoge
  addTo(hd, part(G.ico(0.17, 1), hair), [0, 0.08, -0.43], [0, 0, 0], [0.8, 1.1, 0.8]);
  addTo(hd, part(G.cone(0.14, 0.55, 5), hair), [0, -0.28, -0.47], [Math.PI - 0.25, 0, 0]);            // ponytail
  for (const sx of [-1, 1]) addTo(hd, part(G.box(0.1, 0.42, 0.13), hair), [sx * 0.34, -0.1, 0.05], [0, 0, sx * 0.08]);
  addTo(hd, part(G.oct(0.07), 0xfff08a, { glow: true, intensity: 2.2 }), [0.28, 0.24, 0.16]);
  addTo(h.body, part(new THREE.TorusGeometry(0.22, 0.075, 4, 8), 0xff8a65), [0, 1.12, 0], [Math.PI / 2, 0, 0]);
  addTo(h.body, part(G.box(0.13, 0.34, 0.05), 0xff8a65), [0.1, 0.98, -0.27], [0.3, 0, 0.1]);
  const cape = new THREE.Group(); cape.position.set(0, 1.12, -0.21); h.body.add(cape);
  addTo(cape, part(G.box(0.54, 0.74, 0.04), 0x7a6ff0), [0, -0.37, 0]);
  // magician hat + wand (placeholder art)
  addTo(hd, part(G.cyl(0.56, 0.56, 0.05, 9), 0x5a4ab0), [0, 0.4, -0.04], [-0.08, 0, 0]);
  addTo(hd, part(G.cyl(0.35, 0.36, 0.08, 7), 0xffd36b), [0, 0.46, -0.05], [-0.08, 0, 0]);
  addTo(hd, part(G.cone(0.34, 0.85, 7), 0x6a58c8), [0.04, 0.84, -0.12], [-0.2, 0, -0.12]);
  const wand = new THREE.Group(); wand.position.set(0, -0.4, 0.05); h.armR.add(wand);
  addTo(wand, part(G.cyl(0.025, 0.035, 0.55, 5), 0x8a5a3a), [0, 0, 0.18], [Math.PI / 2, 0, 0]);
  h.wandTip = addTo(wand, part(G.oct(0.07), 0xffd6ff, { glow: true, intensity: 2.6 }), [0, 0, 0.47]);
  h.cape = cape; return h;
}
export function buildKnight() {
  const h = buildHumanoid({ skin: 0xffe0c8, top: 0xc9d2e6, hem: 0x3f6fc8, pants: 0x46508a, shoes: 0x6a5a6a, belt: 0x8a5a3a, sleeve: 0xb9c3da });
  const hd = h.head, hair = 0x7a4a2a;
  addTo(hd, part(G.ico(0.39, 1), hair), [0, 0.12, -0.08], [0, 0, 0], [1.02, 0.85, 1]);
  for (const i of [-1, 0, 1]) addTo(hd, part(G.cone(0.1, 0.32, 4), hair), [i * 0.15, 0.4, 0.04 - Math.abs(i) * 0.06], [-0.55, 0, -i * 0.55]);   // spiky hair
  for (const i of [-1, 1]) addTo(hd, part(G.cone(0.09, 0.24, 4), hair), [i * 0.12, 0.21, 0.27], [Math.PI - 0.4, 0, i * 0.2]);
  addTo(hd, part(new THREE.TorusGeometry(0.37, 0.028, 4, 14), 0xffd36b), [0, 0.15, -0.02], [Math.PI / 2 - 0.12, 0, 0]);       // gold circlet
  addTo(h.body, part(G.box(0.42, 0.52, 0.04), 0x3f6fc8), [0, 0.78, 0.3], [-0.08, 0, 0]);                                   // tabard
  addTo(h.body, part(G.oct(0.07), 0xffd36b), [0, 0.88, 0.33]);
  for (const sx of [-1, 1]) addTo(h.body, part(G.ico(0.15, 0), 0xc9d2e6), [sx * 0.36, 1.08, 0], [0, 0, 0], [1, 0.7, 1]);   // pauldrons
  const cape = new THREE.Group(); cape.position.set(0, 1.12, -0.21); h.body.add(cape);
  addTo(cape, part(G.box(0.56, 0.78, 0.04), 0xd84a4a), [0, -0.39, 0]);
  const sword = new THREE.Group(); sword.position.set(0, -0.42, 0.05); h.armR.add(sword);
  addTo(sword, part(G.cyl(0.025, 0.025, 0.18, 5), 0x6a4a3a), [0, 0, 0.02], [Math.PI / 2, 0, 0]);
  addTo(sword, part(G.box(0.24, 0.045, 0.05), 0xffd36b), [0, 0, 0.12]);
  addTo(sword, part(G.box(0.065, 0.03, 0.85), 0xeef3ff), [0, 0, 0.57]);
  const shield = new THREE.Group(); shield.position.set(-0.07, -0.25, 0.02); h.armL.add(shield);
  addTo(shield, part(G.cyl(0.29, 0.29, 0.06, 8), 0x3f6fc8), [0, 0, 0], [0, 0, Math.PI / 2]);
  addTo(shield, part(G.box(0.03, 0.3, 0.07), 0xffd36b), [-0.04, 0, 0]); addTo(shield, part(G.box(0.03, 0.07, 0.3), 0xffd36b), [-0.04, 0, 0]);
  const bubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), fxMaterial(0x9fe8ff, 0.45));
  bubble.position.y = 1.0; bubble.visible = false; bubble.renderOrder = 4; h.root.add(bubble);
  Object.assign(h, { cape, sword, shield, bubble }); return h;
}

/** CHARACTERS[id].model -> builder. */
export const HERO_BUILDERS = { witch: buildWitch, knight: buildKnight };
