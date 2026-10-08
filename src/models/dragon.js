/* The red dragon boss (Pyrrhax): a four-legged wyrm with a long neck, horned head, a jaw that opens for bites and
   fire, a segmented tail and two great bat wings (folded at rest, spread for its leap).
   def.look = { scale, body, belly, dark, horn, membrane, eye } (config/combat.js); def.capColor = fire glow.
   Parts (driven by src/entities/enemies/behaviors/boss/dragon.js): root, body, neck, head, jaw, core (mouth fire),
   legs[4] (front L, front R, back L, back R), tail[] (segment pivots, base first), wingL / wingR. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { addWing } from './bosses.js';

const LOOK = { scale: 1.25, body: 0xc0392b, belly: 0xf0b060, dark: 0x7a1f1a, horn: 0xf3e6c8, membrane: 0x8a2420, eye: 0xffe066 };

export function buildDragon(def = {}) {
  const L = { ...LOOK, ...def.look }, fire = def.capColor ?? 0xff8a3a;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  // ---- torso: barrel chest, pale belly plates, a ridge of back spikes
  addTo(body, part(G.ico(0.8, 1), L.body), [0, 1.3, 0], [0, 0, 0], [1.05, 0.9, 1.55]);
  addTo(body, part(G.ico(0.7, 1), L.belly), [0, 1.05, 0.12], [0, 0, 0], [0.88, 0.68, 1.42]);
  for (let i = 0; i < 4; i++) addTo(body, part(G.box(0.7 - i * 0.06, 0.05, 0.22), L.dark), [0, 0.62 + i * 0.02, 0.7 - i * 0.42], [0.1, 0, 0]);
  for (let i = 0; i < 6; i++) addTo(body, part(G.cone(0.13, 0.42 - Math.abs(i - 2) * 0.05, 4), L.dark), [0, 2.0 - Math.abs(i - 2) * 0.05, 0.95 - i * 0.4], [-0.35, 0, 0]);
  // ---- neck and head (neck pivot tilts up-forward; the head pivot sits at its end)
  const neck = new THREE.Group(); neck.position.set(0, 1.65, 1.05); neck.rotation.x = -0.6; body.add(neck);
  [[0.44, 0.25], [0.38, 0.7], [0.33, 1.12]].forEach(([r, z]) => addTo(neck, part(G.ico(r, 1), L.body), [0, 0, z], [0, 0, 0], [1, 0.95, 1.2]));
  for (let i = 0; i < 3; i++) addTo(neck, part(G.cone(0.08, 0.26, 4), L.dark), [0, 0.36 - i * 0.04, 0.25 + i * 0.44], [-0.6, 0, 0]);
  const head = new THREE.Group(); head.position.set(0, 0, 1.45); head.rotation.x = 0.55; neck.add(head);
  addTo(head, part(G.ico(0.38, 1), L.body), [0, 0.04, 0.05], [0, 0, 0], [1, 0.85, 1.2]);
  addTo(head, part(G.box(0.42, 0.24, 0.62), L.body), [0, -0.02, 0.55], [0.08, 0, 0]);                        // snout
  addTo(head, part(G.box(0.46, 0.08, 0.22), L.dark), [0, 0.15, 0.3], [0.25, 0, 0]);                          // brow ridge
  for (const sx of [-1, 1]) {
    addTo(head, part(G.box(0.12, 0.05, 0.05), L.eye, { glow: true, intensity: 3 }), [sx * 0.19, 0.1, 0.36], [0, sx * 0.4, sx * 0.2]);
    addTo(head, part(G.cone(0.09, 0.62, 5), L.horn), [sx * 0.2, 0.22, -0.12], [-1.0, 0, -sx * 0.35]);       // swept-back horns
    addTo(head, part(G.cone(0.05, 0.3, 4), L.horn), [sx * 0.3, 0.05, -0.05], [-1.2, 0, -sx * 0.9]);
    addTo(head, part(G.box(0.04, 0.03, 0.03), 0x2a0a08, { outline: false }), [sx * 0.1, 0.07, 0.86]);          // nostrils
    for (let i = 0; i < 3; i++) addTo(head, part(G.cone(0.025, 0.09, 4), 0xfff6e6), [sx * (0.17 - i * 0.03), -0.16, 0.42 + i * 0.16], [Math.PI, 0, 0]);
  }
  const core = addTo(head, part(G.ico(0.14, 1), fire, { glow: true, intensity: 3 }), [0, -0.14, 0.62]);     // fire in the throat
  const jaw = new THREE.Group(); jaw.position.set(0, -0.16, 0.12); head.add(jaw);
  addTo(jaw, part(G.box(0.38, 0.11, 0.62), L.dark), [0, -0.05, 0.38]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) addTo(jaw, part(G.cone(0.022, 0.08, 4), 0xfff6e6), [sx * (0.15 - i * 0.03), 0.03, 0.3 + i * 0.16]);
  // ---- legs: thick upper limb, shin, clawed foot (pivots at the hip / shoulder)
  const legs = [];
  for (const [sx, z] of [[-1, 0.75], [1, 0.75], [-1, -0.75], [1, -0.75]]) {
    const g = new THREE.Group(); g.position.set(sx * 0.66, 1.0, z); body.add(g); legs.push(g);
    addTo(g, part(G.box(0.34, 0.62, 0.42), L.body), [0, -0.22, 0], [0, 0, sx * 0.08]);
    addTo(g, part(G.box(0.26, 0.5, 0.3), L.dark), [0, -0.68, 0.06]);
    addTo(g, part(G.box(0.38, 0.14, 0.5), L.dark), [0, -0.94, 0.12]);
    for (const dx of [-0.12, 0, 0.12]) addTo(g, part(G.cone(0.04, 0.16, 4), L.horn), [dx, -0.96, 0.42], [Math.PI / 2, 0, 0]);
  }
  // ---- tail: nested segments trailing behind (each pivot is the next one's parent), ending in a spade
  const tail = []; let parent = body, at = [0, 1.28, -1.1];
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(...at); seg.rotation.x = i ? 0.05 : -0.3; parent.add(seg); tail.push(seg);
    const r = 0.36 * Math.pow(0.84, i);
    addTo(seg, part(G.ico(r, 1), L.body), [0, 0, -0.3], [0, 0, 0], [1, 0.85, 1.7]);
    addTo(seg, part(G.cone(0.07 * Math.pow(0.85, i), 0.24, 4), L.dark), [0, r * 0.8, -0.3], [-0.5, 0, 0]);
    parent = seg; at = [0, 0, -0.58];
  }
  addTo(parent, part(G.cone(0.26, 0.5, 4), L.dark), [0, 0, -0.75], [-Math.PI / 2, 0, 0], [1, 1, 0.25]);   // spade tip
  // ---- wings at the shoulders, folded along the back at rest
  const w = { span: 2.7, bone: L.dark, skin: L.membrane, inner: new THREE.Color(fire).multiplyScalar(0.45).getHex() };
  const wingL = addWing(body, -1, [-0.45, 1.9, 0.45], w), wingR = addWing(body, 1, [0.45, 1.9, 0.45], w);
  root.scale.setScalar(L.scale);
  return { root, body, neck, head, jaw, core, legs, tail, wingL, wingR };
}
