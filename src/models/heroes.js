/* Playable hero models. Each returns its part map (root, body, head, limbs + extras the animations drive):
   every hero has a `cape` (swung by animateHero); the per-hero overlays in src/entities/player/poses.js drive the rest
   (witch: staff + wandTip, knight: axe + bubble, ranger: bow + tails). */
import * as THREE from 'three';
import { fxMaterial } from '../fx/combatFx.js';
import { addTo, G, part } from '../render/meshes.js';
import { addSkirt, buildHumanoid } from './humanoid.js';

/** A flat fan (pie slice) in the local YZ plane, centred on angle `at` (0 = +Z, PI/2 = +Y): axe blades. */
function blade(r, thick, at, span) {
  const g = new THREE.CylinderGeometry(r, r, thick, 7, 1, false, at - span / 2, span); g.rotateZ(Math.PI / 2); return g;
}
/** A grip-centred bow arc in the local YZ plane: limbs along Y, bulging toward +Z, string behind at -Z. */
function bowArc(r, tube, half) {
  const g = new THREE.TorusGeometry(r, tube, 4, 14, half * 2); g.rotateZ(-half); g.rotateY(-Math.PI / 2); g.translate(0, 0, -r); return g;
}

export function buildWitch() {
  const hair = 0x9a62e0, hairHi = 0xbb8ff4, cloth = 0x2b2533, clothDk = 0x1f1a27, trim = 0x8a5ae0, gold = 0xffd36b;
  const h = buildHumanoid({ skin: 0xffe2cc, top: cloth, hem: clothDk, pants: cloth, shoes: 0x3a2444, belt: trim, sleeve: cloth, face: { eye: 0x4a1f78 } });
  const hd = h.head;
  // long purple hair: bangs, side locks and a straight fall down the back
  addTo(hd, part(G.ico(0.4, 1), hair), [0, 0.1, -0.07], [0, 0, 0], [1.02, 0.92, 1]);
  for (const i of [-1, 0, 1]) addTo(hd, part(G.cone(0.1, 0.28, 4), i ? hair : hairHi), [i * 0.13, 0.2, 0.26], [Math.PI - 0.35, 0, i * 0.2]);
  addTo(hd, part(G.cone(0.05, 0.32, 4), hairHi), [0.03, 0.5, 0.02], [0.5, 0, -0.4]);                                 // ahoge
  for (const sx of [-1, 1]) addTo(hd, part(G.box(0.1, 0.6, 0.13), hair), [sx * 0.34, -0.2, 0.05], [0, 0, sx * 0.06]);
  addTo(hd, part(G.box(0.62, 0.75, 0.14), hair), [0, -0.3, -0.34], [0.15, 0, 0]);
  addTo(hd, part(G.cone(0.3, 0.26, 4), hair), [0, -0.78, -0.42], [Math.PI + 0.15, 0, 0], [1.04, 1, 0.33]);  // pointed tips
  // black dress: flared skirt with a violet hem, glowing brooch and a high collar
  addTo(h.body, part(G.cyl(0.36, 0.5, 0.3, 8), cloth), [0, 0.44, 0]);
  addTo(h.body, part(G.cyl(0.51, 0.52, 0.05, 8), trim), [0, 0.3, 0]);
  addTo(h.body, part(G.cyl(0.21, 0.26, 0.12, 7), clothDk), [0, 1.13, 0]);
  addTo(h.body, part(G.box(0.12, 0.42, 0.03), trim), [0, 0.86, 0.29], [-0.12, 0, 0]);
  addTo(h.body, part(G.oct(0.06), 0xe0a8ff, { glow: true, intensity: 2.4 }), [0, 1.02, 0.28]);
  for (const arm of [h.armL, h.armR]) addTo(arm, part(G.box(0.16, 0.08, 0.17), trim), [0, -0.33, 0]);                      // violet cuffs
  const cape = new THREE.Group(); cape.position.set(0, 1.12, -0.21); h.body.add(cape);
  addTo(cape, part(G.box(0.58, 0.82, 0.04), clothDk), [0, -0.41, 0]);
  addTo(cape, part(G.box(0.5, 0.74, 0.02), 0x5a3a98), [0, -0.38, 0.03]);                                           // violet lining
  for (const sx of [-1, 1]) addTo(cape, part(G.cone(0.1, 0.18, 4), clothDk), [sx * 0.19, -0.86, 0], [Math.PI, 0, 0], [1, 1, 0.3]);
  // witch hat: black, violet band, gold buckle, bent tip and a moon charm (its own group: a vanity hat replaces it)
  const hat = new THREE.Group(); hd.add(hat);
  addTo(hat, part(G.cyl(0.58, 0.58, 0.05, 9), cloth), [0, 0.4, -0.04], [-0.08, 0, 0]);
  addTo(hat, part(G.cyl(0.35, 0.36, 0.09, 7), trim), [0, 0.46, -0.05], [-0.08, 0, 0]);
  addTo(hat, part(G.box(0.1, 0.09, 0.03), gold), [0, 0.46, 0.31], [-0.08, 0, 0]);
  addTo(hat, part(G.cyl(0.1, 0.34, 0.5, 7), cloth), [0.025, 0.72, -0.1], [-0.18, 0, -0.1]);
  addTo(hat, part(G.cone(0.1, 0.45, 7), cloth), [0.14, 1.09, -0.31], [-0.9, 0, -0.4]);
  addTo(hat, part(G.oct(0.07), 0xfff08a, { glow: true, intensity: 2.2 }), [0.3, 0.5, 0.2]);
  // magic staff (held upright by animateWitch): dark wood, gold bands, crescent head cradling the glowing orb
  const staff = new THREE.Group(); staff.position.set(0, -0.4, 0.06); staff.rotation.order = 'ZYX'; h.armR.add(staff);
  addTo(staff, part(G.cyl(0.03, 0.04, 1.9, 6), 0x4a2e3a), [0, 0.35, 0]);
  for (const y of [0, 1.12]) addTo(staff, part(G.cyl(0.05, 0.05, 0.06, 6), gold), [0, y, 0]);
  addTo(staff, part(new THREE.TorusGeometry(0.17, 0.03, 4, 10, Math.PI * 1.4), gold), [0, 1.44, 0], [0, 0, -Math.PI * 1.2]);
  for (const sx of [-1, 1]) addTo(staff, part(G.cone(0.03, 0.14, 4), gold), [sx * 0.15, 1.62, 0], [0, 0, -sx * 0.5]);
  h.wandTip = addTo(staff, part(G.ico(0.11, 1), 0xd8a8ff, { glow: true, intensity: 2.6 }), [0, 1.44, 0]);
  Object.assign(h, { cape, staff, staffTilt: 0, hat }); return h;
}

export function buildKnight() {
  const hair = 0xe0482a, hairHi = 0xff7a3a, coat = 0xa3302a, coatDk = 0x7a2220, leather = 0x4a2a22, brass = 0xe0b04a, steel = 0xd8dde8;
  const h = buildHumanoid({ skin: 0xffe0c8, top: coat, hem: coatDk, pants: 0x4a3a34, shoes: 0x2e2220, belt: leather, sleeve: coat, w: 1.08 });
  const hd = h.head;
  // wild red hair swept back, leather headband
  addTo(hd, part(G.ico(0.39, 1), hair), [0, 0.12, -0.08], [0, 0, 0], [1.02, 0.85, 1]);
  for (const i of [-2, -1, 0, 1, 2]) addTo(hd, part(G.cone(0.11, 0.38, 4), i % 2 ? hairHi : hair),
    [i * 0.12, 0.36, -0.02 - Math.abs(i) * 0.05], [-0.75, 0, -i * 0.4]);
  for (const i of [-1, 0, 1]) addTo(hd, part(G.cone(0.1, 0.32, 4), hair), [i * 0.12, 0.05, -0.36], [-2.1, 0, i * 0.3]);   // back spikes
  for (const i of [-1, 1]) addTo(hd, part(G.cone(0.09, 0.26, 4), hair), [i * 0.12, 0.21, 0.27], [Math.PI - 0.4, 0, i * 0.25]);
  addTo(hd, part(new THREE.TorusGeometry(0.37, 0.03, 4, 14), leather), [0, 0.15, -0.02], [Math.PI / 2 - 0.12, 0, 0]);
  // red leather coat: open lapels over a linen shirt, brass buckle, baldric, dark fur collar, one leather pauldron
  addTo(h.body, part(G.box(0.16, 0.34, 0.04), 0xeadcc4), [0, 0.88, 0.29], [-0.1, 0, 0]);
  for (const sx of [-1, 1]) addTo(h.body, part(G.box(0.1, 0.4, 0.04), coatDk), [sx * 0.11, 0.88, 0.3], [-0.1, 0, sx * 0.3]);
  addTo(h.body, part(G.box(0.12, 0.09, 0.05), brass), [0, 0.66, 0.31]);
  addTo(h.body, part(G.box(0.07, 0.8, 0.03), leather), [0, 0.86, 0.32], [-0.1, 0, 0.62]);
  addTo(h.body, part(G.oct(0.045), brass), [-0.08, 0.95, 0.34]);
  addTo(h.body, part(new THREE.TorusGeometry(0.24, 0.085, 4, 9), 0x5a3a2e), [0, 1.12, -0.02], [Math.PI / 2 - 0.15, 0, 0]);
  addTo(h.body, part(G.ico(0.17, 0), leather), [-0.39, 1.08, 0], [0, 0, 0], [1, 0.7, 1.05]);
  for (const z of [-0.08, 0.08]) addTo(h.body, part(G.oct(0.03), brass), [-0.46, 1.13, z]);
  for (const from of [0.5, Math.PI * 2 - 2.4]) addSkirt(h.body, 0.45, 0.53, 0.42, from, 1.9, coat, coatDk, [0, 0.41, 0]);   // long coat, open at the front
  for (const arm of [h.armL, h.armR]) addTo(arm, part(G.box(0.16, 0.13, 0.17), leather), [0, -0.29, 0]);                    // bracers
  // back vent of the coat (the `cape` the run animation swings), hinged at its top edge
  const cape = new THREE.Group(); cape.position.set(0, 0.62, -0.46); h.body.add(cape);
  addSkirt(cape, 0.45, 0.53, 0.42, 2.4, Math.PI * 2 - 4.8, coat, coatDk, [0, -0.21, 0.46]);
  // two-handed double-bit axe, carried over the shoulder at rest (animateKnight)
  const axe = new THREE.Group(); axe.position.set(0, -0.42, 0.05); axe.rotation.order = 'ZYX'; h.armR.add(axe);
  const axeRoll = new THREE.Group(); axe.add(axeRoll);                       // turns the blades to face out while carried
  addTo(axeRoll, part(G.cyl(0.04, 0.045, 1.5, 6), 0x6a4430), [0, 0, 0.42], [Math.PI / 2, 0, 0]);
  for (const z of [0, -0.2]) addTo(axeRoll, part(G.cyl(0.053, 0.053, 0.12, 6), leather), [0, 0, z], [Math.PI / 2, 0, 0]);
  addTo(axeRoll, part(G.oct(0.065), brass), [0, 0, -0.36]);
  addTo(axeRoll, part(G.box(0.1, 0.16, 0.2), 0x5a5a66), [0, 0, 1.02]);
  addTo(axeRoll, part(blade(0.46, 0.05, -Math.PI / 2, 1.7), steel), [0, 0, 1.02]);
  addTo(axeRoll, part(blade(0.34, 0.05, Math.PI / 2, 1.5), steel), [0, 0, 1.02]);
  addTo(axeRoll, part(G.cyl(0.07, 0.07, 0.05, 6), brass), [0, 0, 0.9], [Math.PI / 2, 0, 0]);
  addTo(axeRoll, part(G.cone(0.05, 0.22, 4), steel), [0, 0, 1.22], [Math.PI / 2, 0, 0]);
  const bubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), fxMaterial(0x9fe8ff, 0.45));
  bubble.position.y = 1.0; bubble.visible = false; bubble.renderOrder = 4; h.root.add(bubble);
  Object.assign(h, { cape, axe, axeRoll, axeGrip: 0, armHoldR: -0.3, bubble }); return h;
}

export function buildRanger() {
  const skin = 0xffe6d2, hair = 0xeef2ff, tunic = 0x4f9a5a, tunicDk = 0x3a7a48, leather = 0x9a6a40, leatherDk = 0x5a3a2a,
    ribbon = 0x6fd08a, wood = 0xb07a44;
  const h = buildHumanoid({ skin, top: tunic, hem: tunicDk, pants: 0x2f4a36, shoes: leatherDk, belt: leatherDk, sleeve: tunic, face: { eye: 0x1f5a48 } });
  const hd = h.head;
  // white hair: bangs, side locks and twin pigtails on pivots (swayed by animateRanger)
  addTo(hd, part(G.ico(0.4, 1), hair), [0, 0.11, -0.07], [0, 0, 0], [1.03, 0.9, 1]);
  for (const i of [-1, 0, 1]) addTo(hd, part(G.cone(0.1, 0.27, 4), hair), [i * 0.14, 0.21, 0.26], [Math.PI - 0.35, 0, i * 0.25]);
  for (const sx of [-1, 1]) addTo(hd, part(G.box(0.08, 0.36, 0.1), hair), [sx * 0.3, -0.06, 0.16], [0, 0, sx * 0.1]);
  const tails = [];
  for (const sx of [-1, 1]) {
    const t = new THREE.Group(); t.position.set(sx * 0.3, 0.16, -0.2); hd.add(t); tails.push(t);
    addTo(t, part(G.ico(0.075, 0), ribbon), [0, 0, 0]);
    for (const k of [-1, 1]) addTo(t, part(G.cone(0.05, 0.14, 3), ribbon), [sx * 0.04, 0.04, k * 0.08], [k * 1.2, 0, 0]);   // bow loops
    addTo(t, part(G.ico(0.15, 1), hair), [sx * 0.07, -0.2, -0.02], [0, 0, 0], [0.9, 1.35, 0.9]);
    addTo(t, part(G.ico(0.12, 1), hair), [sx * 0.1, -0.5, -0.02], [0, 0, 0], [0.85, 1.3, 0.85]);
    addTo(t, part(G.cone(0.09, 0.26, 5), hair), [sx * 0.11, -0.74, -0.02], [Math.PI, 0, 0]);
  }
  // long pointed elf ears and a silver circlet with a leaf-green gem
  for (const sx of [-1, 1]) addTo(hd, part(G.cone(0.075, 0.42, 4), skin), [sx * 0.5, 0.06, -0.02], [-0.25, 0, -sx * (Math.PI / 2 - 0.45)], [1, 1, 0.55]);
  addTo(hd, part(new THREE.TorusGeometry(0.37, 0.02, 4, 14), 0xe8eef6), [0, 0.17, -0.01], [Math.PI / 2 - 0.15, 0, 0]);
  addTo(hd, part(G.oct(0.05), 0x8fffb0, { glow: true, intensity: 2.2 }), [0, 0.23, 0.36]);
  // forest tunic: leaf tabard, leather corset, quiver strap, bracer on the bow arm
  addTo(h.body, part(G.box(0.3, 0.3, 0.04), tunicDk), [0, 0.86, 0.29], [-0.1, 0, 0]);
  addTo(h.body, part(G.cone(0.21, 0.2, 4), tunicDk), [0, 0.42, 0.34], [Math.PI, 0, 0], [1, 1, 0.2]);
  addTo(h.body, part(G.cyl(0.315, 0.345, 0.14, 7), leather), [0, 0.72, 0]);
  addTo(h.body, part(G.box(0.06, 0.78, 0.03), leatherDk), [0, 0.86, 0.3], [-0.1, 0, -0.62]);
  addTo(h.armL, part(G.box(0.16, 0.16, 0.17), leather), [0, -0.27, 0]);
  addTo(h.body, part(G.oct(0.05), 0xe8eef6), [0, 1.07, 0.24]);
  const quiver = new THREE.Group(); quiver.position.set(0.1, 0.9, -0.33); quiver.rotation.z = -0.45; h.body.add(quiver);
  addTo(quiver, part(G.cyl(0.1, 0.085, 0.56, 7), leather), [0, 0, 0]);
  addTo(quiver, part(G.cyl(0.105, 0.105, 0.05, 7), leatherDk), [0, 0.27, 0]);
  for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.05;
    addTo(quiver, part(G.cyl(0.012, 0.012, 0.2, 4), 0xe8d6b0), [x, 0.36, (i % 2) * 0.03]);
    addTo(quiver, part(G.box(0.012, 0.12, 0.07), i === 1 ? ribbon : 0xffffff), [x, 0.47, (i % 2) * 0.03]); }
  // short hooded cloak (the `cape` the run animation swings)
  const cape = new THREE.Group(); cape.position.set(0, 1.12, -0.24); h.body.add(cape);
  addTo(cape, part(G.box(0.52, 0.5, 0.04), 0x2f6a46), [0, -0.25, 0]);
  addTo(cape, part(G.cone(0.26, 0.2, 4), 0x2f6a46), [0, -0.58, 0], [Math.PI, 0, 0], [1, 1, 0.15]);
  addTo(h.body, part(G.ico(0.2, 1), 0x2f6a46), [0, 1.18, -0.3], [0, 0, 0], [1.3, 0.6, 0.7]);                   // folded hood
  // longbow in the left hand (kept upright by animateRanger), arrows fly from it
  const bowHold = new THREE.Group(); bowHold.position.set(0, -0.4, 0.05); bowHold.rotation.order = 'ZYX'; h.armL.add(bowHold);
  const bow = new THREE.Group(); bowHold.add(bow);                           // yawed open at rest so the curve reads, square to the target when drawn
  const R = 0.68, half = 0.95, tipY = R * Math.sin(half), tipZ = R * Math.cos(half) - R;
  addTo(bow, part(bowArc(R, 0.04, half), wood), [0, 0, 0]);
  addTo(bow, part(G.box(0.07, 0.16, 0.08), leatherDk), [0, 0, 0]);
  for (const sy of [-1, 1]) {
    addTo(bow, part(G.cone(0.035, 0.16, 4), 0xe8eef6), [0, sy * (tipY + 0.05), tipZ + 0.04], [sy > 0 ? 0.6 : Math.PI - 0.6, 0, 0]);   // recurved silver tips
    addTo(bow, part(G.oct(0.035), 0x8fffb0, { glow: true, intensity: 2 }), [0, sy * 0.24, 0.035]);
  }
  addTo(bow, part(G.box(0.018, tipY * 2, 0.018), 0xfff8ee, { outline: false }), [0, 0, tipZ]);
  Object.assign(h, { cape, bowHold, bow, tails }); return h;
}

/** The ranger's arrow (Projectile shape 'arrow'): points along local +Z. */
export function buildArrow(color) {
  const g = new THREE.Group();
  addTo(g, part(G.cyl(0.022, 0.022, 0.8, 4), 0xe8d6b0), [0, 0, 0], [Math.PI / 2, 0, 0]);
  addTo(g, part(G.cone(0.07, 0.2, 4), color, { glow: true, intensity: 2.6 }), [0, 0, 0.48], [Math.PI / 2, 0, 0]);
  for (const r of [0, Math.PI / 2]) addTo(g, part(G.box(0.012, 0.12, 0.18), 0xffffff), [0, 0, -0.34], [0, 0, r]);
  return g;
}

/** CHARACTERS[id].model -> builder. */
export const HERO_BUILDERS = { witch: buildWitch, knight: buildKnight, ranger: buildRanger };
