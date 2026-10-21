/* Duskhollow's ambient bodies (TODO 30b). All builders share the Critter animation contract: a root, a body, a head,
   a tail and a `legs` list the walk cycle swings. Every one of them glows somewhere, so they read in the dusk. */
import * as THREE from 'three';
import { G, addTo, part } from '../render/meshes.js';
import { batchRigidParts } from '../render/staticParts.js';

const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const eyes = (head, w, z, color = 0x241c38) => { for (const s of [-1, 1]) addTo(head, part(G.ico(0.035, 0), color, { outline: false }), [s * w, 0.06, z]); };

/** A glow snail: a soft foot, a spiral shell lit from inside, and two eyestalks that lead the way. */
export function buildSnail(o) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0), head = group(body, 0, 0.19, 0.3), tail = group(body, 0, 0.1, -0.28), legs = [];
  addTo(body, part(G.ico(0.2, 0), o.fur), [0, 0.1, 0], [0, 0, 0], [0.9, 0.5, 1.9]);                 // the foot
  for (let i = 0; i < 3; i++) addTo(body, part(new THREE.TorusGeometry(0.2 - i * 0.05, 0.07 - i * 0.015, 4, 10), o.shell), [0, 0.26 + i * 0.04, -0.06], [Math.PI / 2, 0, 0]);
  addTo(body, part(G.ico(0.11, 0), o.accent, { glow: true, intensity: 2.4 }), [0, 0.3, -0.06]);     // the light inside the shell
  addTo(head, part(G.ico(0.11, 0), o.fur), [0, 0, 0], [0, 0, 0], [1, 0.8, 1.2]);
  for (const s of [-1, 1]) {
    addTo(head, part(G.cyl(0.015, 0.015, 0.2, 4), o.fur), [s * 0.06, 0.12, 0.02]);
    addTo(head, part(G.ico(0.035, 0), o.accent, { glow: true, intensity: 2 }), [s * 0.06, 0.23, 0.02]);
  }
  return batchRigidParts({ root, body, head, tail, legs });
}

/** A lantern bat: folded wings, big ears and a belly lantern. It hangs head-down under a cap until disturbed. */
export function buildBat(o) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0), head = group(body, 0, 0.34, 0.14), tail = group(body, 0, 0.1, -0.18), legs = [];
  addTo(body, part(G.ico(0.17, 1), o.fur), [0, 0.22, 0], [0, 0, 0], [0.85, 1.1, 0.9]);
  addTo(body, part(G.ico(0.1, 0), o.accent, { glow: true, intensity: 2.3 }), [0, 0.17, 0.12]);      // the belly lantern
  addTo(head, part(G.ico(0.13, 1), o.fur), [0, 0, 0], [0, 0, 0], [1, 0.9, 1]);
  eyes(head, 0.07, 0.11, o.eye ?? 0xffe066);
  for (const s of [-1, 1]) {
    addTo(head, part(G.cone(0.07, 0.19, 3), o.fur), [s * 0.1, 0.14, -0.02], [0, 0, s * 0.3]);       // ears
    const wing = group(body, s * 0.14, 0.26, 0);                                                     // wings double as the walk cycle's legs
    addTo(wing, part(G.box(0.3, 0.22, 0.02), o.wing ?? o.fur), [s * 0.16, -0.02, -0.03], [0, 0, s * 0.25]);
    addTo(wing, part(G.box(0.16, 0.13, 0.02), o.wing ?? o.fur), [s * 0.33, -0.1, -0.03], [0, 0, s * 0.5]);
    legs.push(wing);
  }
  addTo(tail, part(G.cone(0.04, 0.14, 4), o.fur), [0, 0, -0.06], [Math.PI / 2, 0, 0]);
  return batchRigidParts({ root, body, head, tail, legs });
}

/** A dusk cricket: a small green body, long folded hind legs and antennae you see twitching before you hear it. */
export function buildCricket(o) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0), head = group(body, 0, 0.14, 0.18), tail = group(body, 0, 0.12, -0.18), legs = [];
  addTo(body, part(G.ico(0.13, 0), o.fur), [0, 0.12, 0], [0, 0, 0], [0.8, 0.7, 1.6]);
  addTo(body, part(G.box(0.16, 0.02, 0.26), o.accent, { outline: false }), [0, 0.2, -0.03]);        // wing cases
  addTo(head, part(G.ico(0.09, 0), o.fur), [0, 0, 0]);
  eyes(head, 0.06, 0.06, 0x1a1428);
  for (const s of [-1, 1]) {
    addTo(head, part(G.cyl(0.008, 0.008, 0.26, 4), o.fur, { outline: false }), [s * 0.04, 0.1, 0.1], [0.9, 0, s * 0.3]);
    const leg = group(body, s * 0.1, 0.08, -0.08);
    addTo(leg, part(G.box(0.03, 0.2, 0.05), o.fur), [s * 0.04, 0.02, 0], [0.5, 0, s * 0.2]);
    legs.push(leg);
    const front = group(body, s * 0.09, 0.06, 0.1);
    addTo(front, part(G.box(0.02, 0.12, 0.02), o.fur), [s * 0.03, -0.04, 0]); legs.push(front);
  }
  return batchRigidParts({ root, body, head, tail, legs });
}

/** The Moonmoth: wide pale wings dusted with light, a furred body and feathered antennae. */
export function buildMoth(o) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0), head = group(body, 0, 0.42, 0.16), tail = group(body, 0, 0.3, -0.22), legs = [];
  addTo(body, part(G.ico(0.17, 1), o.fur), [0, 0.32, 0], [0, 0, 0], [0.8, 0.85, 1.5]);
  addTo(body, part(G.ico(0.12, 0), o.belly), [0, 0.28, 0.08], [0, 0, 0], [0.9, 0.6, 1]);
  addTo(head, part(G.ico(0.12, 1), o.fur), [0, 0, 0]);
  eyes(head, 0.07, 0.1, o.eye ?? 0xcffcff);
  for (const s of [-1, 1]) {
    addTo(head, part(G.cone(0.05, 0.22, 3), o.accent, { outline: false }), [s * 0.07, 0.12, 0.04], [-0.5, 0, s * 0.5]);
    const wing = group(body, s * 0.12, 0.36, 0);
    addTo(wing, part(G.ico(0.34, 1), o.wing, { glow: true, intensity: 1.6 }), [s * 0.34, 0.02, 0.02], [0, 0, s * 0.2], [1.5, 0.1, 1]);
    addTo(wing, part(G.ico(0.22, 1), o.wing, { glow: true, intensity: 1.9 }), [s * 0.3, 0, -0.26], [0, 0, s * 0.3], [1.2, 0.1, 0.9]);
    addTo(wing, part(G.ico(0.07, 0), o.accent, { glow: true, intensity: 2.6 }), [s * 0.42, 0.04, 0.02]);
    legs.push(wing);
  }
  return batchRigidParts({ root, body, head, tail, legs });
}

export const DUSK_BUILDERS = { snail: buildSnail, bat: buildBat, cricket: buildCricket, moth: buildMoth };
