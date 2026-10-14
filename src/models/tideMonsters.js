/* Tidewhisper's regular monsters (TODO 27e), in the same toon + ink-outline style. Builders return the part names
   their behaviour modules drive (src/entities/enemies/behaviors/armoured.js, drifter.js, amphibian.js). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

/** Shellback: a broad armoured crab that holds a barnacled shield plate low in front of its face (the plate is what
    blocks hits); its eyes peek over the top. Parts: body, plate (the front shield), clawL / clawR (each with a
    `pincer`), legs[6]. */
export function buildShellback() {
  const root = new THREE.Group(), body = group(root, 0, 0, 0), legs = [];
  addTo(body, part(G.ico(0.6, 1), 0x2f8a8f), [0, 0.62, -0.12], [0, 0, 0], [1.4, 0.48, 1.0]);           // carapace
  addTo(body, part(G.ico(0.5, 1), 0xf0c99a), [0, 0.46, -0.08], [0, 0, 0], [1.3, 0.3, 0.95]);           // pale belly
  for (const [x, z, s] of [[-0.42, -0.35, 0.1], [0.25, -0.5, 0.08], [0.5, -0.15, 0.07], [-0.12, -0.6, 0.06]])
    addTo(body, part(G.cone(s, s * 1.4, 5), 0xe8e2cf), [x, 0.86 - Math.abs(x) * 0.2, z]);                 // barnacles
  for (const sx of [-1, 1]) {                                                                           // eyes on stalks, over the shield
    const stalk = group(body, sx * 0.2, 0.8, 0.28);
    addTo(stalk, part(G.cyl(0.04, 0.05, 0.36, 5), 0x2f8a8f), [0, 0.16, 0]);
    addTo(stalk, part(G.ico(0.11, 1), 0xfff8e8), [0, 0.38, 0]);
    addTo(stalk, part(G.ico(0.05, 0), 0x241c38, { outline: false }), [0, 0.4, 0.09]);
    for (let k = 0; k < 3; k++) {                                                                       // legs, two segments down to the sand
      const leg = group(body, sx * 0.62, 0.55, 0.12 - k * 0.3);
      addTo(leg, part(G.box(0.42, 0.08, 0.09), 0x26747a), [sx * 0.2, 0.06, 0], [0, 0, sx * 0.45]);
      addTo(leg, part(G.box(0.08, 0.5, 0.08), 0x26747a), [sx * 0.42, -0.2, 0], [0, 0, sx * -0.25]); legs.push(leg);
    }
  }
  const plate = group(body, 0, 0.52, 0.62);                                                               // the shield plate
  addTo(plate, part(G.ico(0.42, 1), 0x1d5f69), [0, 0, 0], [0, 0, 0], [1.45, 0.85, 0.32]);
  addTo(plate, part(G.box(1.0, 0.07, 0.08), 0xffb38a), [0, 0.32, 0.04]);                                  // coral rim
  for (const [x, y] of [[-0.3, 0.05], [0.22, -0.1], [0.05, 0.14]]) addTo(plate, part(G.cone(0.06, 0.09, 5), 0xe8e2cf), [x, y, 0.14], [Math.PI / 2, 0, 0]);
  const claw = sx => {
    const c = group(body, sx * 0.78, 0.5, 0.45);
    addTo(c, part(G.box(0.12, 0.12, 0.34), 0x2f8a8f), [0, 0, -0.12]);                                     // arm
    addTo(c, part(G.ico(0.24, 1), 0xff8f6a), [0, 0, 0.18], [0, 0, 0], [0.9, 0.75, 1.25]);                 // palm
    const pincer = group(c, 0, 0.06, 0.38);                                                             // upper finger (opens)
    addTo(pincer, part(G.cone(0.1, 0.34, 5), 0xff8f6a), [0, 0.02, 0.14], [Math.PI / 2 - 0.3, 0, 0]);
    addTo(c, part(G.cone(0.09, 0.3, 5), 0xffb38a), [0, -0.08, 0.5], [Math.PI / 2 + 0.25, 0, 0]);          // lower finger
    c.userData.pincer = pincer; return c;
  };
  const clawL = claw(-1), clawR = claw(1);
  root.scale.setScalar(1.1);
  return { root, body, plate, clawL, clawR, legs };
}

/** Jellybell: a floating bell-shaped jellyfish with a glowing heart and trailing tentacles that sit below the water.
    Parts: body (the bell, pulses), core (glows brighter before a sting), tentacles[]. */
export function buildJellybell(def = {}) {
  const glow = def.color ?? 0x9fe8ff;
  const root = new THREE.Group(), body = group(root, 0, 0.45, 0), tentacles = [];
  addTo(body, part(G.hemi(0.5, 10, 4), 0xc6f2ff), [0, 0, 0], [0, 0, 0], [1, 0.85, 1]);
  addTo(body, part(G.cyl(0.5, 0.42, 0.1, 10), 0x8fd6ec), [0, 0, 0]);                                    // bell rim
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; addTo(body, part(G.ico(0.05, 0), 0xffffff, { glow: true, intensity: 1.4 }), [Math.cos(a) * 0.46, 0.02, Math.sin(a) * 0.46]); }
  const core = addTo(body, part(G.ico(0.17, 1), glow, { glow: true, intensity: 2.4 }), [0, -0.04, 0]);           // glows under the bell
  for (const sx of [-1, 1]) addTo(body, part(G.box(0.05, 0.08, 0.02), 0x241c38, { outline: false }), [sx * 0.12, 0.25, 0.42]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.3, t = group(body, Math.cos(a) * 0.25, -0.02, Math.sin(a) * 0.25);
    addTo(t, part(G.cone(0.05, 0.75, 4), 0x9fe0f0), [0, -0.38, 0], [Math.PI, 0, 0]); tentacles.push(t);
  }
  return { root, body, core, tentacles };
}

/** Surf skipper: a goggle-eyed mudskipper raider with a sail fin and a shell dagger. Parts: body, fin (the only part
    that shows while it lurks under the surf), tail, finL / finR (front fins it walks on). */
export function buildSurfSkipper() {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  addTo(body, part(G.ico(0.34, 1), 0x7f9a5c), [0, 0.35, 0.05], [0, 0, 0], [0.9, 0.75, 1.5]);
  addTo(body, part(G.ico(0.26, 1), 0xe7d7a6), [0, 0.24, 0.12], [0, 0, 0], [0.85, 0.45, 1.35]);            // belly
  for (const [x, z] of [[-0.15, -0.1], [0.12, 0.15], [0.05, -0.3]]) addTo(body, part(G.ico(0.045, 0), 0x4f6f45, { outline: false }), [x, 0.58, z]);
  for (const sx of [-1, 1]) {                                                                           // goggling eyes on top
    addTo(body, part(G.ico(0.11, 1), 0xfff8e8), [sx * 0.12, 0.66, 0.36]);
    addTo(body, part(G.ico(0.05, 0), 0x241c38, { outline: false }), [sx * 0.13, 0.7, 0.45]);
  }
  addTo(body, part(G.box(0.26, 0.03, 0.03), 0x3a2a2a, { outline: false }), [0, 0.36, 0.55]);             // grumpy mouth
  const fin = group(body, 0, 0.6, -0.05);
  addTo(fin, part(G.cone(0.22, 0.5, 3), 0x3fa0a8), [0, 0.18, 0], [0, 0, 0], [0.25, 1, 1.5]);
  addTo(fin, part(G.box(0.03, 0.34, 0.03), 0xffd36b), [0, 0.16, 0.12]);                                   // fin spine
  const tail = group(body, 0, 0.3, -0.48);
  addTo(tail, part(G.cone(0.2, 0.45, 4), 0x6f8a4c), [0, 0, -0.18], [-Math.PI / 2, 0, 0], [1, 1, 0.35]);
  const pectoral = sx => { const f = group(body, sx * 0.28, 0.18, 0.28); addTo(f, part(G.ico(0.12, 0), 0x6f8a4c), [sx * 0.08, -0.06, 0.04], [0, 0, 0], [1.4, 0.4, 1]); return f; };
  const finL = pectoral(-1), finR = pectoral(1);
  addTo(finR, part(G.cone(0.05, 0.32, 4), 0xf5e6c8), [0.12, 0, 0.2], [Math.PI / 2, 0, 0]);                // shell dagger
  return { root, body, fin, tail, finL, finR };
}
