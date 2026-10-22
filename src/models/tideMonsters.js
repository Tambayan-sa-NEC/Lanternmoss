/* Tidewhisper's regular monsters (TODO 27e), in the same toon + ink-outline style. Builders return the part names
   their behaviour modules drive (src/entities/enemies/behaviors/armoured.js, drifter.js, amphibian.js). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { batchRigidParts } from '../render/staticParts.js';

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
  return batchRigidParts({ root, body, plate, clawL, clawR, legs }, [clawL.userData.pincer, clawR.userData.pincer]);
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
  return batchRigidParts({ root, body, core, tentacles });
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
  return batchRigidParts({ root, body, fin, tail, finL, finR });
}

/** Old Ironclaw (mini boss): a giant hermit crab living in a sunken bronze bell that lies on its side, mouth forward.
    Parts: body (the crab: slides out of the bell to swap shells), bell (the shell: tinted per shell by the kit;
    `bellMats` are its own recolourable materials), clawL (small) / clawR (the big one, each with a `pincer`), legs[],
    eyes[]. def.look: { bell, crab, claw }. */
export function buildIronclaw(def = {}) {
  const L = { bell: 0xc8913a, crab: 0xe58a6e, claw: 0xd8603e, ...(def.look ?? {}) };
  const root = new THREE.Group(), body = group(root, 0, 0, 0), legs = [], eyes = [];
  // the crab: a curled soft abdomen (inside the bell), a head with eye stalks, walking legs and two claws
  addTo(body, part(G.ico(0.7, 1), 0xf4b8a0), [0, 0.95, -0.35], [0, 0, 0], [1.1, 0.9, 1.3]);
  addTo(body, part(G.ico(0.55, 1), L.crab), [0, 0.95, 0.55], [0, 0, 0], [1.2, 0.8, 0.9]);                // head
  for (const sx of [-1, 1]) {
    const stalk = group(body, sx * 0.25, 1.3, 0.75);
    addTo(stalk, part(G.cyl(0.06, 0.08, 0.5, 5), L.crab), [0, 0.22, 0]);
    addTo(stalk, part(G.ico(0.15, 1), 0xfff8e8), [0, 0.52, 0.02]);
    const eye = addTo(stalk, part(G.ico(0.07, 0), 0x241c38, { outline: false }), [0, 0.55, 0.14]); eyes.push(eye);
    for (let k = 0; k < 2; k++) {
      const leg = group(body, sx * 0.75, 0.75, 0.45 - k * 0.45);
      addTo(leg, part(G.box(0.6, 0.13, 0.14), L.crab), [sx * 0.28, 0.05, 0], [0, 0, sx * 0.5]);
      addTo(leg, part(G.box(0.12, 0.75, 0.12), L.claw), [sx * 0.6, -0.3, 0], [0, 0, sx * -0.2]); legs.push(leg);
    }
  }
  const claw = (sx, s) => {
    const c = group(body, sx * 0.7, 0.75, 1.0); c.scale.setScalar(s);
    addTo(c, part(G.box(0.2, 0.2, 0.55), L.crab), [0, 0, -0.15]);
    addTo(c, part(G.ico(0.38, 1), L.claw), [0, 0.05, 0.3], [0, 0, 0], [0.85, 0.75, 1.3]);
    const pincer = group(c, 0, 0.12, 0.62);
    addTo(pincer, part(G.cone(0.16, 0.55, 5), L.claw), [0, 0.02, 0.22], [Math.PI / 2 - 0.3, 0, 0]);
    addTo(c, part(G.cone(0.14, 0.48, 5), 0xf2a080), [0, -0.12, 0.82], [Math.PI / 2 + 0.25, 0, 0]);
    c.userData.pincer = pincer; return c;
  };
  const clawL = claw(-1, 0.7), clawR = claw(1, 1.15);
  // the bell: lying on its side over the crab's back, its mouth facing forward
  const bell = group(root, 0, 1.25, -0.45), bellMats = [];
  const bronze = part(G.cyl(0.55, 1.15, 1.7, 10), L.bell); bronze.rotation.x = Math.PI / 2; bell.add(bronze); bellMats.push(bronze.material = bronze.material.clone());
  const lip = addTo(bell, part(new THREE.TorusGeometry(1.12, 0.1, 6, 16), L.bell), [0, 0, 0.85]); lip.material = bronze.material;
  bell.userData.ownedMaterials = bellMats;                                                                  // freed by disposeTree
  addTo(bell, part(G.cyl(0.35, 0.45, 0.25, 8), 0x8a6a3a), [0, 0, -0.95], [Math.PI / 2, 0, 0]);               // crown
  addTo(bell, part(G.box(0.18, 0.5, 0.18), 0x8a6a3a), [0, 0, -1.2], [Math.PI / 2, 0, 0]);
  for (const [x, y, z] of [[0.7, 0.55, 0.1], [-0.8, 0.3, -0.2], [0.2, 0.8, -0.5], [-0.4, -0.75, 0.3]])
    addTo(bell, part(G.ico(0.18, 0), 0x6fb6a0), [x, y, z], [0, 0, 0], [1, 0.35, 1]);                         // verdigris
  for (const [x, y, z] of [[0.55, 0.75, 0.45], [-0.6, 0.7, -0.4], [0.9, 0.1, -0.3]])
    addTo(bell, part(G.cone(0.1, 0.14, 5), 0xe8e2cf), [x, y, z]);                                            // barnacles
  const glow = addTo(bell, part(G.ico(0.22, 1), 0xffd36b, { glow: true, intensity: 2.2 }), [0, -0.2, 0.55]);  // the clapper glows as it rings
  glow.visible = false;
  root.scale.setScalar(1.25);
  return { root, body, bell, bellMats, bellGlow: glow, clawL, clawR, legs, eyes };
}

/** Mirelure, the Lantern Angler (Tidewhisper's boss): a huge round anglerfish with a lantern lure on a stalk over her
    brow. Parts: body, jaw (opens), lure (the stalk group: bends), lamp (its glowing bulb), tail, finL / finR, eyes[].
    def.look: { skin, belly, fin, lamp }. */
export function buildMirelure(def = {}) {
  const L = { skin: 0x3d5a78, belly: 0x9fb8c8, fin: 0x6a4a8a, lamp: 0xffd36b, ...(def.look ?? {}) };
  const root = new THREE.Group(), body = group(root, 0, 1.4, 0), eyes = [];
  addTo(body, part(G.ico(1.5, 1), L.skin), [0, 0, 0], [0, 0, 0], [1.15, 0.95, 1.25]);
  addTo(body, part(G.ico(1.2, 1), L.belly), [0, -0.55, 0.3], [0, 0, 0], [1.05, 0.55, 1.1]);
  for (const [x, y, z] of [[0.9, 0.7, -0.4], [-0.8, 0.9, 0.1], [0.3, 1.2, -0.9], [-0.5, 0.4, -1.2]])
    addTo(body, part(G.ico(0.14, 0), 0x2a4058), [x, y, z], [0, 0, 0], [1, 0.4, 1]);                          // spots
  const jaw = group(body, 0, -0.35, 1.0);                                                                     // the lower jaw, hinged
  addTo(jaw, part(G.ico(1.0, 1), L.skin), [0, -0.25, 0.35], [0, 0, 0], [1.3, 0.45, 0.9]);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 2.2;
    addTo(jaw, part(G.cone(0.09, 0.4, 4), 0xfff8e8), [Math.sin(a) * 1.05, 0.12, 0.35 + Math.cos(a) * 0.7], [0, 0, 0]);                 // lower teeth
    addTo(body, part(G.cone(0.08, 0.34, 4), 0xfff8e8), [Math.sin(a) * 1.15, -0.25, 1.05 + Math.cos(a) * 0.55 - 0.55], [Math.PI, 0, 0]);  // upper teeth
  }
  for (const sx of [-1, 1]) {
    addTo(body, part(G.ico(0.32, 1), 0xfff2c8), [sx * 0.75, 0.75, 0.95]);
    const eye = addTo(body, part(G.ico(0.14, 0), 0x241c38, { outline: false }), [sx * 0.8, 0.8, 1.22]); eyes.push(eye);
  }
  const fin = sx => { const f = group(body, sx * 1.55, -0.3, 0.1); addTo(f, part(G.cone(0.5, 1.1, 4), L.fin), [sx * 0.35, 0, -0.2], [Math.PI / 2, 0, -sx * 1.2], [0.3, 1, 1]); return f; };
  const finL = fin(-1), finR = fin(1);
  const tail = group(body, 0, 0.1, -1.75);
  addTo(tail, part(G.cone(0.9, 1.4, 4), L.fin), [0, 0, -0.5], [-Math.PI / 2, 0, 0], [0.25, 1, 1]);
  addTo(body, part(G.cone(0.35, 0.9, 4), L.fin), [0, 1.35, -0.6], [-0.4, 0, 0], [0.25, 1, 1]);                // dorsal fin
  const lure = group(body, 0, 1.25, 0.6);                                                                     // the stalk, arching forward
  for (let i = 0; i < 5; i++) addTo(lure, part(G.cyl(0.05, 0.06, 0.45, 5), L.fin), [0, 0.2 + i * 0.36, i * i * 0.07], [0.15 + i * 0.22, 0, 0]);
  const lamp = addTo(lure, part(G.ico(0.32, 1), L.lamp, { glow: true, intensity: 2.6 }), [0, 1.85, 1.3]);
  addTo(lure, part(G.cyl(0.24, 0.3, 0.12, 6), 0x8a6a3a), [0, 2.1, 1.3]);                                      // its little lantern cap
  root.scale.setScalar(1.35);
  return { root, body, jaw, lure, lamp, tail, finL, finR, eyes };
}

/** One of Mirelure's lures (real or false: they look the same) bobbing on the lagoon. Parts: body (the stalk),
    lamp (the glowing bulb that flickers). */
export function buildMireLure(def = {}) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  for (let i = 0; i < 3; i++) addTo(body, part(G.cyl(0.05, 0.06, 0.4, 5), 0x6a4a8a), [0, 0.2 + i * 0.36, i * 0.05], [0.1 * i, 0, 0]);
  const lamp = addTo(body, part(G.ico(0.3, 1), def.color ?? 0xffd36b, { glow: true, intensity: 2.6 }), [0, 1.2, 0.2]);
  addTo(body, part(G.cyl(0.22, 0.28, 0.12, 6), 0x8a6a3a), [0, 1.45, 0.2]);
  return { root, body, lamp };
}
