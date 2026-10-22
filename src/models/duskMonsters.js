/* Duskhollow's regular monsters (TODO 30e), in the same toon + ink-outline style.
   Builders return the part names their behaviour modules drive
   (src/entities/enemies/behaviors/lightbound.js, mimic.js). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

/** Shadeling: two bodies in one. `stain` is the flat shadow it is out in the dusk - a dark disc on the ground with a
    pair of pale eyes and nothing else to hit. `solid` is what your light catches: a hunched smoke-coloured figure
    with the same eyes, ragged arms and three wisps turning around its head. The behaviour shows one or the other.
    Parts: body (= solid, for the hit pop), stain, solid, eyes[2], wisps[3]. */
export function buildShadeling(def = {}) {
  const root = new THREE.Group();
  const glow = def.boundColor ?? 0xbfa8ff, dark = 0x241c38;

  const stain = group(root, 0, 0.06, 0);                               // the shadow on the ground
  addTo(stain, part(G.cyl(0.52, 0.46, 0.05, 9), dark, { outline: false }), [0, 0, 0]);
  addTo(stain, part(G.cyl(0.3, 0.24, 0.06, 7), 0x160f24, { outline: false }), [0, 0.03, 0.1]);
  for (const sx of [-1, 1]) addTo(stain, part(G.ico(0.07, 0), glow, { glow: true, intensity: 2.2 }), [sx * 0.14, 0.07, 0.24]);

  const solid = group(root, 0, 0, 0);                                  // what the light catches
  addTo(solid, part(G.ico(0.42, 1), dark), [0, 0.62, 0], [0, 0, 0], [0.95, 1.25, 0.9]);
  addTo(solid, part(G.cone(0.34, 0.5, 6), dark), [0, 0.18, 0], [Math.PI, 0, 0]);
  const eyes = [];
  for (const sx of [-1, 1]) eyes.push(addTo(solid, part(G.ico(0.085, 0), glow, { glow: true, intensity: 2.6 }), [sx * 0.15, 0.78, 0.3]));
  for (const sx of [-1, 1]) {
    const arm = group(solid, sx * 0.34, 0.66, 0);
    addTo(arm, part(G.cone(0.1, 0.46, 4), 0x1b1430), [0, -0.2, 0], [0, 0, sx * 0.4]);
  }
  const wisps = [];
  for (let i = 0; i < 3; i++) {
    const w = group(solid, 0, 0.5, 0);
    addTo(w, part(G.ico(0.055, 0), glow, { glow: true, intensity: 2 }), [0.36 + i * 0.05, 0, 0]);
    wisps.push(w);
  }
  return { root, body: solid, stain, solid, eyes, wisps };
}

/** Mosslurk: a mimic wearing a cluster of glowcaps. Disguised, only `caps` shows and it is indistinguishable from a
    real patch; sprung, a wide lipless mouth opens under the caps, eyes blink on and six stubby legs come out.
    Parts: body (the lump the caps sit on), caps, mouth, eyes[2], legs[6]. */
export function buildMosslurk(def = {}) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  const cap = def.capColor ?? 0x9ff0ff, flesh = 0x6a4a7a, stalk = 0xe8dfc8;

  addTo(body, part(G.ico(0.46, 1), flesh), [0, 0.34, 0], [0, 0, 0], [1.1, 0.8, 1.1]);
  const caps = group(body, 0, 0.5, 0);
  for (const [x, z, s] of [[0, 0, 1], [-0.3, 0.18, 0.72], [0.28, -0.14, 0.66], [0.1, 0.3, 0.55]]) {
    addTo(caps, part(G.cyl(0.05 * s, 0.07 * s, 0.3 * s, 5), stalk), [x, 0.15 * s, z]);
    addTo(caps, part(G.cone(0.26 * s, 0.22 * s, 7), cap, { glow: true, intensity: 1.5 }), [x, 0.38 * s, z]);
  }
  const mouth = addTo(body, part(G.box(0.56, 0.16, 0.1), 0x1b1026), [0, 0.26, 0.4]);
  for (let i = 0; i < 5; i++) addTo(mouth, part(G.cone(0.045, 0.12, 4), 0xfff6e6), [-0.2 + i * 0.1, 0.02, 0.04]);
  const eyes = [];
  for (const sx of [-1, 1]) eyes.push(addTo(body, part(G.ico(0.075, 0), 0xffe6a0, { glow: true, intensity: 2.2 }), [sx * 0.16, 0.48, 0.34]));
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, l = group(body, Math.cos(a) * 0.34, 0.16, Math.sin(a) * 0.34);
    addTo(l, part(G.cyl(0.05, 0.04, 0.3, 4), flesh), [0, -0.12, 0], [0, 0, Math.cos(a) * 0.5]);
    legs.push(l);
  }
  return { root, body, caps, mouth, eyes, legs };
}
