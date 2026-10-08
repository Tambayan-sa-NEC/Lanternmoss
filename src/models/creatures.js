/* Animals: four-legged critters (cats, dogs, foxes, the wolf, bunnies and hares, deer, frogs, lizards), birds, pond
   fish, the flying pets (owl, wisp, dragon whelp) and the dragontoad. buildQuad options (config/critters.js):
     ear 'point' | 'flop' | 'big' | 'long' | 'none'; tail 'cat' | 'curl' | 'fox' | 'puff' | 'none'; antlers; frogEyes; spines */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { buildDragon } from './dragon.js';

export function buildQuad(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const L = o.len || 1, hl = o.leg || 0.22, w = o.w || 1;
  addTo(body, part(G.ico(0.3, 1), o.fur), [0, hl + 0.18, 0], [0, 0, 0], [0.85 * w, 0.75, 1.35 * L]);
  if (o.belly) addTo(body, part(G.ico(0.26, 1), o.belly, { outline: false }), [0, hl + 0.1, 0.06], [0, 0, 0], [0.7 * w, 0.6, 1.1 * L]);
  const head = new THREE.Group(); head.position.set(0, hl + 0.42, 0.36 * L + 0.08); body.add(head);
  addTo(head, part(G.ico(0.22, 1), o.fur), [0, 0, 0], [0, 0, 0], [1, 0.92, 0.95]);
  const sl = o.snout || 1; addTo(head, part(G.ico(0.1, 1), o.belly || o.fur), [0, -0.06, 0.16 + (sl - 1) * 0.05], [0, 0, 0], [1.1, 0.8, sl]);
  addTo(head, part(G.ico(0.035, 0), 0x2a1830, { outline: false }), [0, -0.03, 0.25 + (sl - 1) * 0.1]);
  for (const sx of [-1, 1]) {
    if (o.frogEyes) {                                                    // bulging eyes on top of the head
      addTo(head, part(G.ico(0.08, 1), o.fur), [sx * 0.11, 0.13, 0.08]);
      addTo(head, part(G.ico(0.05, 0), 0xffffff, { outline: false }), [sx * 0.12, 0.16, 0.13]);
      addTo(head, part(G.box(0.03, 0.04, 0.02), 0x2a1830, { outline: false }), [sx * 0.12, 0.16, 0.18]);
    } else {
      addTo(head, part(G.box(0.045, 0.075, 0.03), o.eye || 0x2a1830, o.eyeGlow ? { glow: true, intensity: 2 } : { outline: false }), [sx * 0.09, 0.04, 0.19], [0, sx * 0.4, 0]);
      addTo(head, part(G.box(0.018, 0.022, 0.01), 0xffffff, { glow: true, intensity: 1 }), [sx * 0.09 + 0.01, 0.06, 0.207], [0, sx * 0.4, 0]);
    }
    if (o.antlers) {                                                     // branching antlers
      const ant = new THREE.Group(); ant.position.set(sx * 0.09, 0.16, -0.02); ant.rotation.z = -sx * 0.35; head.add(ant);
      addTo(ant, part(G.cyl(0.018, 0.028, 0.42 * o.antlers, 4), 0xd8c0a0), [0, 0.2 * o.antlers, 0]);
      for (const [y, a] of [[0.18, 0.9], [0.32, -0.7]]) addTo(ant, part(G.cyl(0.014, 0.02, 0.18 * o.antlers, 4), 0xd8c0a0), [sx * 0.05, y * o.antlers, 0.03], [0.3, 0, -sx * a]);
    }
    if (o.ear === 'none') continue;
    if (o.ear === 'flop') addTo(head, part(G.box(0.09, 0.2, 0.05), o.earCol || o.fur), [sx * 0.19, 0.03, -0.02], [0, 0, sx * 0.55]);
    else if (o.ear === 'long') {                                         // bunny ears
      addTo(head, part(G.box(0.07, 0.34, 0.04), o.earCol || o.fur), [sx * 0.08, 0.3, -0.04], [-0.15, 0, -sx * 0.18]);
      addTo(head, part(G.box(0.035, 0.26, 0.01), 0xffb3c6, { outline: false }), [sx * 0.08, 0.3, -0.015], [-0.15, 0, -sx * 0.18]);
    } else { const big = o.ear === 'big' ? 1.5 : 1; addTo(head, part(G.cone(0.08 * big, 0.18 * big, 4), o.earCol || o.fur), [sx * 0.12, 0.2 + (big - 1) * 0.08, -0.02], [0, 0, -sx * 0.25]);
      addTo(head, part(G.cone(0.045 * big, 0.1 * big, 4), 0xffb3c6, { outline: false }), [sx * 0.12, 0.19 + (big - 1) * 0.08, 0.02], [0, 0, -sx * 0.25]); }
  }
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const g = new THREE.Group(); g.position.set(sx * 0.13 * w, hl + 0.05, sz * 0.24 * L); body.add(g);
    addTo(g, part(G.box(0.09, hl + 0.05, 0.09), o.paw && sz > 0 ? o.paw : o.fur), [0, -(hl + 0.05) / 2, 0]); legs.push(g); }
  const tail = new THREE.Group(); tail.position.set(0, hl + 0.26, -0.4 * L); body.add(tail); let tip = null;
  if (o.tail === 'none') { /* frogs */ }
  else if (o.tail === 'puff') addTo(tail, part(G.ico(0.09, 1), o.tailCol || o.belly || 0xffffff), [0, 0, -0.02]);
  else if (o.tail === 'cat') { tail.rotation.x = -0.55; addTo(tail, part(G.cyl(0.035, 0.05, 0.55, 5), o.tailCol || o.fur), [0, 0.27, 0]); }
  else if (o.tail === 'curl') { tail.rotation.x = -0.3; addTo(tail, part(new THREE.TorusGeometry(0.1, 0.045, 4, 8, Math.PI * 1.5), o.fur), [0, 0.1, 0], [0, Math.PI / 2, 0]); }
  else { tail.rotation.x = -1.15; addTo(tail, part(G.cone(0.17, 0.7, 6), o.fur), [0, 0.35, 0], [Math.PI, 0, 0]);
    tip = addTo(tail, part(G.ico(0.15, 1), o.tip || 0xc7a8ff, { glow: true, intensity: 2.6 }), [0, 0.74, 0]); }
  if (o.spines) for (let i = 0; i < 4; i++) addTo(body, part(G.cone(0.05, 0.14, 4), o.spines), [0, hl + 0.42, 0.18 - i * 0.14 * L]);
  return { root, body, head, legs, tail, tip };
}

/** The dragontoad: a round, squat toad with a dragon's horns, a row of back spines, little bat wings and a spade-tipped
    tail. Same parts as buildQuad (legs, tail, head) so the critter animation drives it; wings flap in WalkingPet. */
export function buildToad(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = o.fur, belly = o.belly, accent = o.accent ?? 0xffb03d;
  addTo(body, part(G.ico(0.36, 1), skin), [0, 0.34, 0], [0, 0, 0], [1.25, 0.82, 1.15]);
  addTo(body, part(G.ico(0.3, 1), belly, { outline: false }), [0, 0.26, 0.12], [0, 0, 0], [1.05, 0.62, 0.9]);
  for (let i = 0; i < 5; i++) addTo(body, part(G.ico(0.05, 0), accent, { outline: false }), [((i * 37) % 7 - 3) * 0.07, 0.6, ((i * 53) % 5 - 2) * 0.09]);   // warts
  const head = new THREE.Group(); head.position.set(0, 0.5, 0.32); body.add(head);
  addTo(head, part(G.ico(0.25, 1), skin), [0, 0, 0], [0, 0, 0], [1.3, 0.75, 1]);
  addTo(head, part(G.box(0.36, 0.03, 0.04), 0x2a1830, { outline: false }), [0, -0.06, 0.24]);                       // wide grin
  for (const sx of [-1, 1]) {
    addTo(head, part(G.ico(0.1, 1), skin), [sx * 0.17, 0.14, 0.04]);
    addTo(head, part(G.ico(0.065, 0), 0xffe066, { glow: true, intensity: 1.6 }), [sx * 0.18, 0.16, 0.11]);
    addTo(head, part(G.box(0.02, 0.07, 0.02), 0x2a1830, { outline: false }), [sx * 0.18, 0.16, 0.17]);
    addTo(head, part(G.cone(0.045, 0.22, 4), 0xf3e6c8), [sx * 0.15, 0.26, -0.08], [-0.6, 0, -sx * 0.3]);                // horns
  }
  for (let i = 0; i < 4; i++) addTo(body, part(G.cone(0.06, 0.17, 4), accent), [0, 0.64 - i * 0.03, 0.1 - i * 0.14], [-0.4, 0, 0]);   // back spines
  const wings = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.2, 0.58, -0.05); body.add(g);
    addTo(g, part(G.cone(0.2, 0.36, 3), o.wing ?? accent), [sx * 0.18, 0.05, 0], [0, 0, -sx * 1.35], [1, 1, 0.25]); wings.push(g); }
  const legs = [];
  for (const [sx, sz, big] of [[-1, 1, 0.8], [1, 1, 0.8], [-1, -1, 1.25], [1, -1, 1.25]]) {
    const g = new THREE.Group(); g.position.set(sx * 0.26, 0.2, sz * 0.2); body.add(g);
    addTo(g, part(G.box(0.12 * big, 0.2, 0.14 * big), skin), [0, -0.1, 0]);
    addTo(g, part(G.box(0.16 * big, 0.04, 0.18 * big), belly), [0, -0.2, 0.04]); legs.push(g);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.32, -0.38); body.add(tail); tail.rotation.x = -1.0;
  addTo(tail, part(G.cone(0.08, 0.4, 5), skin), [0, 0.2, 0], [Math.PI, 0, 0]);
  addTo(tail, part(G.cone(0.1, 0.14, 3), accent), [0, 0.42, 0], [0, 0, 0], [1, 1, 0.4]);
  root.scale.setScalar(o.scale ?? 1);
  return { root, body, head, legs, tail, tip: null, wingL: wings[0], wingR: wings[1] };
}
export function buildBird(c) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(0.15, 1), c.body), [0, 0.2, 0], [0, 0, 0], [0.9, 0.85, 1.25]);
  addTo(body, part(G.ico(0.12, 1), c.belly, { outline: false }), [0, 0.16, 0.05], [0, 0, 0], [0.8, 0.7, 1]);
  const head = new THREE.Group(); head.position.set(0, 0.33, 0.11); body.add(head);
  addTo(head, part(G.ico(0.11, 1), c.body), [0, 0, 0]);
  addTo(head, part(G.cone(0.04, 0.11, 4), 0xffa84a), [0, -0.01, 0.13], [Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) addTo(head, part(G.box(0.03, 0.05, 0.02), 0x2a1830, { outline: false }), [sx * 0.065, 0.02, 0.08], [0, sx * 0.6, 0]);
  const wings = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.11, 0.24, 0); body.add(g);
    addTo(g, part(G.box(0.26, 0.03, 0.16), c.wing || c.body), [sx * 0.13, 0, -0.02]); wings.push(g); }
  addTo(body, part(G.box(0.1, 0.03, 0.16), c.wing || c.body), [0, 0.22, -0.2], [-0.35, 0, 0]);
  for (const sx of [-1, 1]) addTo(body, part(G.cyl(0.012, 0.012, 0.1, 3), 0xffa84a, { outline: false }), [sx * 0.05, 0.05, 0]);
  return { root, body, head, wingL: wings[0], wingR: wings[1] };
}
export function buildFish(c) {
  const root = new THREE.Group();
  addTo(root, part(G.ico(0.2, 1), c.body), [0, 0, 0], [0, 0, 0], [0.55, 0.8, 1.45]);
  if (c.spot) addTo(root, part(G.ico(0.1, 0), c.spot, { outline: false }), [0, 0.1, 0.05], [0, 0, 0], [0.9, 0.5, 1.4]);
  const tail = new THREE.Group(); tail.position.set(0, 0, -0.27); root.add(tail);
  addTo(tail, part(G.cone(0.15, 0.24, 4), c.fin || c.body), [0, 0, -0.1], [Math.PI / 2, 0, 0], [0.3, 1, 1]);
  addTo(root, part(G.cone(0.08, 0.16, 3), c.fin || c.body), [0, 0.16, 0], [0, 0, 0], [0.3, 1, 1]);
  for (const sx of [-1, 1]) addTo(root, part(G.box(0.02, 0.05, 0.03), 0x2a1830, { outline: false }), [sx * 0.1, 0.04, 0.18]);
  return { root, tail };
}
export function buildOwl() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(0.26, 1), 0x9a7a62), [0, 0, 0], [0, 0, 0], [0.95, 1.1, 0.9]);
  addTo(body, part(G.ico(0.2, 1), 0xf3e2c8, { outline: false }), [0, -0.05, 0.1], [0, 0, 0], [0.85, 0.95, 0.7]);
  const head = new THREE.Group(); head.position.set(0, 0.3, 0.02); body.add(head);
  addTo(head, part(G.ico(0.22, 1), 0x9a7a62), [0, 0, 0], [0, 0, 0], [1.1, 0.95, 1]);
  addTo(head, part(G.cyl(0.19, 0.19, 0.04, 8), 0xf3e2c8, { outline: false }), [0, 0, 0.16], [Math.PI / 2, 0, 0], [1.15, 1, 0.9]);
  for (const sx of [-1, 1]) {
    addTo(head, part(G.cyl(0.07, 0.07, 0.03, 8), 0xffd84a, { glow: true, intensity: 1.8 }), [sx * 0.085, 0.02, 0.19], [Math.PI / 2, 0, 0]);
    addTo(head, part(G.cyl(0.035, 0.035, 0.03, 6), 0x2a1830, { outline: false }), [sx * 0.085, 0.02, 0.205], [Math.PI / 2, 0, 0]);
    addTo(head, part(G.cone(0.05, 0.15, 4), 0x86664f), [sx * 0.15, 0.2, 0], [0, 0, -sx * 0.4]); }
  addTo(head, part(G.cone(0.035, 0.09, 4), 0xffb04a), [0, -0.05, 0.22], [Math.PI / 2 + 0.5, 0, 0]);
  const wings = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.22, 0.08, -0.02); body.add(g);
    addTo(g, part(G.box(0.36, 0.04, 0.22), 0x86664f), [sx * 0.18, 0, 0]); wings.push(g); }
  addTo(body, part(G.box(0.14, 0.04, 0.18), 0x86664f), [0, -0.18, -0.2], [-0.5, 0, 0]);
  root.scale.setScalar(0.85);
  return { root, body, head, wingL: wings[0], wingR: wings[1] };
}

/** Glimmer-style pet wisp: a glowing little spirit with a face and petal wings (parts like buildOwl: body, head, wings). */
export function buildWispPet(color = 0x9ff3ff) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const head = new THREE.Group(); body.add(head);
  addTo(head, part(G.ico(0.24, 1), color, { glow: true, intensity: 0.9 }), [0, 0, 0]);
  addTo(head, part(G.ico(0.16, 1), 0xffffff, { glow: true, intensity: 1.1, outline: false }), [0, 0.02, 0.06]);
  for (const sx of [-1, 1]) addTo(head, part(G.ico(0.035, 0), 0x2a1830, { outline: false }), [sx * 0.07, 0.03, 0.21]);
  addTo(head, part(G.cone(0.08, 0.22, 5), color, { glow: true, intensity: 0.9 }), [0, -0.24, -0.08], [Math.PI - 0.5, 0, 0]);
  const wings = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.16, 0.08, -0.06); body.add(g);
    addTo(g, part(G.ico(0.2, 0), 0xffd6f5, { glow: true, intensity: 0.9 }), [sx * 0.16, 0.06, 0], [0, 0, sx * 0.4], [1, 0.1, 0.55]); wings.push(g); }
  return { root, body, head, wingL: wings[0], wingR: wings[1] };
}

/** A dragon whelp: Pyrrhax's model in miniature, a little rounder and paler. */
export function buildWhelp() {
  const d = buildDragon({ look: { scale: 1, body: 0xe0503a, belly: 0xffc878, dark: 0x9a2f24, horn: 0xfff0d8, membrane: 0xff8a5a, eye: 0xfff07a } });
  d.root.scale.setScalar(0.1); d.head.scale.setScalar(1.4);
  return d;
}
