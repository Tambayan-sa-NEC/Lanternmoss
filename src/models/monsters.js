/* Enemy models. Builders must keep returning the part names Enemy.animate / the behaviour modules drive
   (legs/arms, body/core/ring, mound...). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { buildDemonLord } from './bosses.js';
import { buildDragon } from './dragon.js';
import { buildHumanoid } from './humanoid.js';

export function buildGoblin() {
  const h = buildHumanoid({ skin: 0x8fcf5a, top: 0x8a6a4a, hem: 0x6a5238, pants: 0x5a4a3a, shoes: 0x3a2a2a, belt: 0x3a2a2a, sleeve: 0x8fcf5a,
    face: { blush: 0x6fae4a } });
  for (const sx of [-1, 1]) addTo(h.head, part(G.cone(0.08, 0.38, 4), 0x8fcf5a), [sx * 0.38, 0.05, -0.02], [0, 0, -sx * 1.2]);
  addTo(h.head, part(G.cone(0.06, 0.2, 4), 0x7fbf4a), [0, -0.06, 0.36], [Math.PI / 2, 0, 0]);
  addTo(h.head, part(G.cone(0.32, 0.34, 6), 0x7a5a3a), [0, 0.32, -0.04], [0, 0, 0.15]);
  const dagger = new THREE.Group(); dagger.position.set(0, -0.42, 0.05); h.armR.add(dagger);
  addTo(dagger, part(G.box(0.05, 0.12, 0.05), 0x5a3a2a), [0, 0, 0]);
  addTo(dagger, part(G.box(0.04, 0.08, 0.36), 0xd6d6e6), [0, 0, 0.2]);
  h.root.scale.setScalar(0.78); return h;
}
export function buildOgre() {
  const h = buildHumanoid({ skin: 0xa3b38a, top: 0x8a6a9a, hem: 0x6a4a7a, pants: 0x5a4a3a, shoes: 0x4a3a2a, belt: 0x5a3a2a, sleeve: 0xa3b38a,
    w: 1.5, face: { blush: 0x8a9a6a, big: 0.8 } });
  addTo(h.body, part(G.ico(0.36, 1), 0x9a7aaa), [0, 0.8, 0.12], [0, 0, 0], [1.2, 1, 1]);
  for (const sx of [-1, 1]) addTo(h.head, part(G.cone(0.045, 0.16, 4), 0xfff6e6), [sx * 0.11, -0.16, 0.3], [-0.2, 0, 0]);
  addTo(h.head, part(G.box(0.42, 0.07, 0.08), 0x7a8a6a), [0, 0.1, 0.32]);
  addTo(h.head, part(G.ico(0.12, 0), 0x4a3a2a), [0, 0.38, -0.05]);
  const club = new THREE.Group(); club.position.set(0, -0.42, 0.05); h.armR.add(club);
  addTo(club, part(G.cyl(0.06, 0.15, 0.95, 6), 0x8a5a3a), [0, 0, 0.45], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) addTo(club, part(G.cone(0.04, 0.12, 4), 0xd6d6e6), [Math.cos(i * 2.1) * 0.14, Math.sin(i * 2.1) * 0.14, 0.75], [0, 0, i * 2.1 - Math.PI / 2]);
  h.root.scale.setScalar(1.55); return h;
}
export function buildWisp() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cone(0.42, 1.0, 7), 0x4a2e6a), [0, 0.45, 0]);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; addTo(body, part(G.cone(0.1, 0.3, 4), 0x4a2e6a), [Math.cos(a) * 0.3, -0.1, Math.sin(a) * 0.3], [Math.PI, 0, 0]); }
  addTo(body, part(G.ico(0.2, 1), 0x2a1840), [0, 0.55, 0.2]);
  for (const sx of [-1, 1]) addTo(body, part(G.box(0.06, 0.1, 0.03), 0x9ff3ff, { glow: true, intensity: 2.6 }), [sx * 0.07, 0.58, 0.38]);
  const core = addTo(body, part(G.ico(0.16, 1), 0xb27cff, { glow: true, intensity: 2.6 }), [0, 0.3, 0.45]);
  const ring = addTo(body, part(new THREE.TorusGeometry(0.55, 0.025, 4, 18), 0xb27cff, { glow: true, intensity: 1.8 }), [0, 0.45, 0], [Math.PI / 2, 0, 0]);
  return { root, body, core, ring };
}
export function buildSlime(scale = 1) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(0.5, 1), 0x7fd48a), [0, 0.35, 0], [0, 0, 0], [1, 0.72, 1]);
  addTo(body, part(G.cone(0.08, 0.22, 4), 0x5fb35e), [0.05, 0.75, -0.05], [0, 0, 0.2]);
  addTo(body, part(G.ico(0.06, 0), 0xff9ad0, { glow: true, intensity: 2 }), [0.08, 0.86, -0.05]);
  for (const sx of [-1, 1]) { addTo(body, part(G.box(0.07, 0.12, 0.03), 0x2a1830, { outline: false }), [sx * 0.15, 0.45, 0.44]);
    addTo(body, part(G.box(0.025, 0.035, 0.02), 0xffffff, { glow: true, intensity: 1 }), [sx * 0.15 + 0.015, 0.48, 0.46]); }
  root.scale.setScalar(scale); return { root, body };
}

// ---- later-planet monsters (procedural PLACEHOLDER art, same toon + outline style); bosses live in ./bosses.js ----

/** Puffcap: an angry puffball mushroom with a lit fuse. Parts: body (swells on the fuse). */
export function buildPuffcap() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cyl(0.18, 0.22, 0.3, 6), 0xfff0dc), [0, 0.15, 0]);
  addTo(body, part(G.ico(0.42, 1), 0xff7a9a), [0, 0.52, 0], [0, 0, 0], [1, 0.8, 1]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; addTo(body, part(G.ico(0.07, 0), 0xffffff, { outline: false }), [Math.cos(a) * 0.3, 0.72, Math.sin(a) * 0.3]); }
  for (const sx of [-1, 1]) {
    addTo(body, part(G.box(0.07, 0.11, 0.03), 0x2a1830, { outline: false }), [sx * 0.12, 0.47, 0.37]);
    addTo(body, part(G.box(0.12, 0.03, 0.03), 0x2a1830, { outline: false }), [sx * 0.12, 0.56, 0.36], [0, 0, sx * 0.4]);    // angry brows
  }
  addTo(body, part(G.cone(0.04, 0.14, 4), 0xffd36b, { glow: true, intensity: 2.6 }), [0, 0.95, 0]);                           // fuse spark
  return { root, body };
}

/** Ramhorn: a shelled beetle with one big horn. Parts: body, head, legs[4]. */
export function buildRamhorn() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(0.5, 1), 0x3f6f7a), [0, 0.55, -0.05], [0, 0, 0], [1, 0.75, 1.3]);
  addTo(body, part(G.box(0.06, 0.5, 1.1), 0x2f5560), [0, 0.86, -0.05]);
  const head = new THREE.Group(); head.position.set(0, 0.5, 0.6); body.add(head);
  addTo(head, part(G.ico(0.26, 1), 0x2a4048), [0, 0, 0]);
  addTo(head, part(G.cone(0.14, 0.7, 6), 0xe8d6b0), [0, 0.12, 0.38], [Math.PI / 2 - 0.35, 0, 0]);
  for (const sx of [-1, 1]) addTo(head, part(G.box(0.06, 0.06, 0.03), 0xff7a5a, { glow: true, intensity: 2.2 }), [sx * 0.13, 0.06, 0.22]);
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const g = new THREE.Group(); g.position.set(sx * 0.32, 0.4, sz * 0.32); body.add(g);
    addTo(g, part(G.box(0.1, 0.4, 0.1), 0x24363c), [0, -0.2, 0], [0, 0, sx * 0.25]); legs.push(g);
  }
  return { root, body, head, legs };
}

/** Thornmole: a spiny digging mole. Parts: body (sinks while tunnelling), mound (dirt bump shown underground). */
export function buildThornmole() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(0.42, 1), 0x8a6a5a), [0, 0.38, 0], [0, 0, 0], [1, 0.85, 1.2]);
  for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; addTo(body, part(G.cone(0.08, 0.38, 4), 0xd8c08a), [Math.sin(a) * 0.3, 0.62 + Math.cos(a) * 0.08, -0.1 - Math.abs(a) * 0.05], [-0.5, 0, -a * 0.6]); }
  addTo(body, part(G.ico(0.12, 1), 0xffa6b8), [0, 0.32, 0.52]);
  for (const sx of [-1, 1]) {
    addTo(body, part(G.box(0.05, 0.03, 0.03), 0x2a1830, { outline: false }), [sx * 0.13, 0.46, 0.45]);
    addTo(body, part(G.cone(0.07, 0.22, 4), 0xf0e6d0), [sx * 0.3, 0.12, 0.38], [Math.PI / 2, 0, sx * 0.4]);                 // digging claws
  }
  const mound = addTo(root, part(G.hemi(0.6, 8, 3), 0x9a7a5a), [0, -0.05, 0], [0, 0, 0], [1, 0.45, 1]); mound.visible = false;
  return { root, body, mound };
}

/** Hexlantern: a hooded floating lantern spirit. Parts: body, core (glows brighter while casting). */
export function buildHexlantern() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cone(0.34, 0.5, 6), 0x3a4a5a), [0, 0.95, 0]);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addTo(body, part(G.box(0.05, 0.55, 0.05), 0x3a4a5a), [x * 0.2, 0.45, z * 0.2]);
  addTo(body, part(G.box(0.5, 0.06, 0.5), 0x3a4a5a), [0, 0.15, 0]);
  const core = addTo(body, part(G.ico(0.17, 1), 0x8fffc0, { glow: true, intensity: 2.8 }), [0, 0.45, 0]);
  for (const sx of [-1, 1]) addTo(body, part(G.box(0.05, 0.08, 0.02), 0xffffff, { glow: true, intensity: 2 }), [sx * 0.08, 0.8, 0.25]);
  addTo(body, part(G.cone(0.2, 0.35, 5), 0x8fffc0, { glow: true, intensity: 1.2 }), [0, -0.1, 0], [Math.PI, 0, 0]);
  return { root, body, core };
}

/** COMBAT.enemies key -> builder (called with the enemy's stats, which most builders ignore). */
/** Thorn Seal: a standing stone wrapped in thorny vines, a glowing rune crystal on top. Parts: body, crystal. */
export function buildThornSeal(def = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const glow = def.color ?? 0xb48cff;
  addTo(body, part(G.cyl(0.62, 0.78, 0.35, 6), 0x8a8478), [0, 0.17, 0]);
  addTo(body, part(G.cyl(0.42, 0.55, 1.9, 6), 0x9a9488), [0, 1.2, 0]);
  addTo(body, part(G.cone(0.42, 0.45, 6), 0x9a9488), [0, 2.37, 0]);
  addTo(body, part(G.box(0.08, 0.9, 0.04), glow, { glow: true, intensity: 1.8, outline: false }), [0, 1.25, 0.47]);     // the rune
  for (let i = 0; i < 9; i++) {                                                                                       // thorny vines
    const a = i * 2.4, y = 0.35 + i * 0.2, r = 0.5 - i * 0.012;
    addTo(body, part(G.cone(0.06, 0.32, 4), 0x5a7a2a), [Math.cos(a) * r, y, Math.sin(a) * r], [Math.PI / 2, -a, 0.6]);
    addTo(body, part(G.ico(0.11, 0), 0x6a8a3a), [Math.cos(a) * (r - 0.05), y, Math.sin(a) * (r - 0.05)]);
  }
  const crystal = part(G.ico(0.3, 0), glow, { glow: true, intensity: 2.4 }); crystal.position.set(0, 2.85, 0); body.add(crystal);
  return { root, body, crystal };
}

export const ENEMY_BUILDERS = { goblin: buildGoblin, ogre: buildOgre, wisp: buildWisp, slime: () => buildSlime(1), slimeling: () => buildSlime(0.55),
  puffcap: buildPuffcap, ramhorn: buildRamhorn, thornmole: buildThornmole, hexlantern: buildHexlantern,
  gloomcap: buildDemonLord, pyrrhax: buildDragon, malgrath: buildDemonLord, thornSeal: buildThornSeal };
