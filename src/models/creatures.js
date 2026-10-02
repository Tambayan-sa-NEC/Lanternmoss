/* Animals: four-legged critters (cats, dogs, foxes, the wolf), birds, pond fish and Pip the owl. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

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
    addTo(head, part(G.box(0.045, 0.075, 0.03), o.eye || 0x2a1830, o.eyeGlow ? { glow: true, intensity: 2 } : { outline: false }), [sx * 0.09, 0.04, 0.19], [0, sx * 0.4, 0]);
    addTo(head, part(G.box(0.018, 0.022, 0.01), 0xffffff, { glow: true, intensity: 1 }), [sx * 0.09 + 0.01, 0.06, 0.207], [0, sx * 0.4, 0]);
    if (o.ear === 'flop') addTo(head, part(G.box(0.09, 0.2, 0.05), o.earCol || o.fur), [sx * 0.19, 0.03, -0.02], [0, 0, sx * 0.55]);
    else { const big = o.ear === 'big' ? 1.5 : 1; addTo(head, part(G.cone(0.08 * big, 0.18 * big, 4), o.earCol || o.fur), [sx * 0.12, 0.2 + (big - 1) * 0.08, -0.02], [0, 0, -sx * 0.25]);
      addTo(head, part(G.cone(0.045 * big, 0.1 * big, 4), 0xffb3c6, { outline: false }), [sx * 0.12, 0.19 + (big - 1) * 0.08, 0.02], [0, 0, -sx * 0.25]); }
  }
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const g = new THREE.Group(); g.position.set(sx * 0.13 * w, hl + 0.05, sz * 0.24 * L); body.add(g);
    addTo(g, part(G.box(0.09, hl + 0.05, 0.09), o.paw && sz > 0 ? o.paw : o.fur), [0, -(hl + 0.05) / 2, 0]); legs.push(g); }
  const tail = new THREE.Group(); tail.position.set(0, hl + 0.26, -0.4 * L); body.add(tail); let tip = null;
  if (o.tail === 'cat') { tail.rotation.x = -0.55; addTo(tail, part(G.cyl(0.035, 0.05, 0.55, 5), o.tailCol || o.fur), [0, 0.27, 0]); }
  else if (o.tail === 'curl') { tail.rotation.x = -0.3; addTo(tail, part(new THREE.TorusGeometry(0.1, 0.045, 4, 8, Math.PI * 1.5), o.fur), [0, 0.1, 0], [0, Math.PI / 2, 0]); }
  else { tail.rotation.x = -1.15; addTo(tail, part(G.cone(0.17, 0.7, 6), o.fur), [0, 0.35, 0], [Math.PI, 0, 0]);
    tip = addTo(tail, part(G.ico(0.15, 1), o.tip || 0xc7a8ff, { glow: true, intensity: 2.6 }), [0, 0.74, 0]); }
  return { root, body, head, legs, tail, tip };
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
