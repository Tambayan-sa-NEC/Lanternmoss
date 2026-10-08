/* Vanity pieces drawn on the hero (src/gameplay/equipment.js applyVanity): a hat on the head (it replaces the witch's
   own hat) and a cape (it replaces the hero's own cape, keeping its swing: the run animation moves `cape`).
   One builder per item art kind (config/items.js icon.art), tinted with the item's colour. */
import * as THREE from 'three';
import { addTo, disposeTree, G, part } from '../render/meshes.js';

const torus = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 5, 16, arc);

/** Hats sit on the head group (its centre is the middle of the head, the hair tops out at ~0.47). */
const HATS = {
  strawHat: (g, c) => {
    addTo(g, part(G.cyl(0.66, 0.66, 0.05, 14), c), [0, 0.36, 0], [-0.06, 0, 0]);
    addTo(g, part(G.cyl(0.32, 0.36, 0.4, 12), c), [0, 0.56, -0.01], [-0.06, 0, 0]);
    addTo(g, part(G.cyl(0.365, 0.365, 0.08, 12), 0xe0605a), [0, 0.42, -0.01], [-0.06, 0, 0]);
    addTo(g, part(G.ico(0.07, 0), 0xffd36b), [0.3, 0.44, 0.14]);
  },
  flowerCrown: (g, c) => {
    addTo(g, part(torus(0.37, 0.045), 0x5fae5a), [0, 0.3, -0.02], [Math.PI / 2 - 0.12, 0, 0]);
    const cols = [c, 0xffffff, 0xffd36b, c, 0xc5a6ff, 0xffffff, c, 0xffd36b];
    cols.forEach((col, i) => {
      const a = i / cols.length * Math.PI * 2, x = Math.sin(a) * 0.37, z = Math.cos(a) * 0.37 - 0.02, y = 0.3 + Math.cos(a) * 0.045;
      addTo(g, part(G.ico(0.075, 0), col), [x, y + 0.04, z]);
      addTo(g, part(G.ico(0.03, 0), 0xffd36b, { outline: false }), [x * 1.12, y + 0.06, z * 1.12]);
    });
  },
  frogHat: (g, c) => {
    addTo(g, part(G.hemi(0.44, 10, 4), c), [0, 0.16, -0.02], [0, 0, 0], [1, 0.75, 1]);
    addTo(g, part(G.cyl(0.46, 0.46, 0.05, 12), new THREE.Color(c).multiplyScalar(0.8).getHex()), [0, 0.17, -0.02]);
    for (const sx of [-1, 1]) {
      addTo(g, part(G.ico(0.13, 1), c), [sx * 0.2, 0.5, 0.1]);
      addTo(g, part(G.ico(0.09, 1), 0xffffff), [sx * 0.2, 0.53, 0.18]);
      addTo(g, part(G.ico(0.045, 0), 0x2a1830, { outline: false }), [sx * 0.2, 0.54, 0.26]);
    }
    addTo(g, part(G.ico(0.04, 0), 0xff8fb1, { outline: false }), [0.26, 0.3, 0.33]);
  },
};

/** Capes hang from the cape pivot (at the shoulders, y down, a little behind the back). */
const CAPES = {
  cape: (g, c, def) => {
    const starry = def.id === 'starryCape', dark = new THREE.Color(c).multiplyScalar(0.75).getHex();
    if (starry) {
      addTo(g, part(G.box(0.62, 0.95, 0.04), c), [0, -0.47, 0]);
      addTo(g, part(G.box(0.54, 0.86, 0.02), 0x2a2a68), [0, -0.44, 0.03]);
      for (const [x, y] of [[-0.18, -0.25], [0.15, -0.4], [-0.05, -0.62], [0.2, -0.78], [-0.2, -0.82], [0.05, -0.15]])
        addTo(g, part(G.oct(0.04), 0xfff08a, { glow: true, intensity: 2.4 }), [x, y, -0.03]);
      for (const sx of [-1, 1]) addTo(g, part(G.cone(0.1, 0.2, 4), c), [sx * 0.2, -0.98, 0], [Math.PI, 0, 0], [1, 1, 0.3]);
      return;
    }
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) {             // overlapping leaves
      const x = (i - 1) * 0.19 + (row % 2) * 0.06, y = -0.12 - row * 0.22;
      addTo(g, part(G.oct(0.16), row % 2 ? c : dark), [x, y, -0.01 * row], [0, 0, (i - 1) * 0.2], [0.85, 1.25, 0.18]);
    }
    addTo(g, part(G.cyl(0.04, 0.04, 0.5, 5), 0x8a5a3a), [0, 0, 0.02], [0, 0, Math.PI / 2]);
  },
};

/** Puts `hatDef` (or nothing) on the hero's head and `backDef` (or nothing) on their back, replacing what was there. */
export function dressHero(P, hatDef, backDef) {
  if (!P?.head) return;
  if (P.vanityHat) { P.head.remove(P.vanityHat); disposeTree(P.vanityHat); P.vanityHat = null; }
  const hat = hatDef && HATS[hatDef.icon.art];
  if (hat) { const g = new THREE.Group(); hat(g, hatDef.icon.color ?? 0xffffff, hatDef); P.head.add(g); P.vanityHat = g; }
  if (P.hat) P.hat.visible = !hat;                                   // the witch's own hat
  if (!P.cape) return;
  P.capeKids ??= [...P.cape.children];
  if (P.vanityCape) { P.cape.remove(P.vanityCape); disposeTree(P.vanityCape); P.vanityCape = null; }
  const cape = backDef && CAPES[backDef.icon.art];
  if (cape) { const g = new THREE.Group(); cape(g, backDef.icon.color ?? 0xffffff, backDef); P.cape.add(g); P.vanityCape = g; }
  for (const k of P.capeKids) k.visible = !cape;
}

