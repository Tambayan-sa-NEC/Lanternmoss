/* NPC villager models. */
import * as THREE from 'three';
import { PLANETS } from '../config/planets.js';
import { addTo, G, part } from '../render/meshes.js';
import { addFace, buildHumanoid } from './humanoid.js';

export function buildWizard() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cyl(0.28, 0.58, 1.15, 7), 0x7a5cc8), [0, 0.58, 0]);
  addTo(body, part(G.cyl(0.59, 0.61, 0.09, 7), 0xffd36b), [0, 0.05, 0]);
  addTo(body, part(G.cyl(0.34, 0.36, 0.08, 7), 0xffd36b), [0, 0.86, 0]);
  const arms = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.33, 1.05, 0); body.add(g);
    addTo(g, part(G.cyl(0.1, 0.17, 0.46, 6), 0x7a5cc8), [0, -0.2, 0]); addTo(g, part(G.ico(0.085, 0), 0xffe2cc), [0, -0.46, 0]); arms.push(g); }
  arms[1].rotation.set(-0.5, 0, 0.35);
  const head = new THREE.Group(); head.position.set(0, 1.4, 0); body.add(head);
  addTo(head, part(G.ico(0.34, 1), 0xffe2cc), [0, 0, 0]);
  addFace(head, { z: 0.31, y: 0.01, sep: 0.12, big: 0.85 });
  addTo(head, part(G.cone(0.28, 0.62, 6), 0xfbf6ff), [0, -0.33, 0.14], [Math.PI + 0.25, 0, 0]);
  for (const sx of [-1, 1]) { addTo(head, part(G.box(0.14, 0.04, 0.04), 0xfbf6ff), [sx * 0.12, 0.12, 0.31], [0, 0, sx * -0.2]);
    addTo(head, part(G.box(0.16, 0.06, 0.06), 0xfbf6ff), [sx * 0.1, -0.1, 0.32], [0, 0, sx * 0.35]); }
  addTo(head, part(G.cyl(0.62, 0.62, 0.05, 9), 0x5a45a8), [0, 0.27, 0]);
  addTo(head, part(G.cone(0.35, 1.0, 7), 0x6a55c0), [-0.05, 0.78, -0.02], [-0.08, 0, 0.14]);
  addTo(head, part(G.cyl(0.36, 0.36, 0.08, 7), 0xffd36b), [0, 0.34, 0]);
  addTo(head, part(G.oct(0.09), 0xfff08a, { glow: true, intensity: 3 }), [-0.13, 1.27, -0.06]);
  const staff = new THREE.Group(); staff.position.set(0.55, 0, 0.25); root.add(staff);
  addTo(staff, part(G.cyl(0.035, 0.045, 1.95, 5), 0x8a5a3a), [0, 0.98, 0]);
  addTo(staff, part(new THREE.TorusGeometry(0.16, 0.03, 4, 8), 0x8a5a3a), [0, 2.05, 0]);
  const orb = addTo(staff, part(G.ico(0.14, 1), 0x8ff0ff, { glow: true, intensity: 2.4 }), [0, 2.05, 0]);
  return { root, body, head, armL: arms[0], armR: arms[1], orb };
}
export function buildBaker() {
  const h = buildHumanoid({ skin: 0xffd9c0, top: 0xffb38a, hem: 0xf29a74, pants: 0x7a5a4a, shoes: 0x5a3a2a, w: 1.25, face: { big: 0.9 } });
  addTo(h.body, part(G.box(0.5, 0.6, 0.06), 0xffffff), [0, 0.72, 0.36], [-0.1, 0, 0]);
  addTo(h.head, part(G.cyl(0.24, 0.26, 0.2, 7), 0xffffff), [0, 0.34, -0.02]);
  addTo(h.head, part(G.ico(0.3, 1), 0xffffff), [0, 0.55, -0.02], [0, 0, 0], [1, 0.72, 1]);
  addTo(h.head, part(G.ico(0.34, 1), 0x8a5a44), [0, 0.1, -0.1], [0, 0, 0], [1.03, 0.75, 0.95]);
  for (const sx of [-1, 1]) addTo(h.head, part(G.box(0.14, 0.05, 0.05), 0x8a5a44), [sx * 0.07, -0.1, 0.34], [0, 0, sx * 0.25]);
  const loaf = addTo(h.armL, part(G.cyl(0.08, 0.09, 0.7, 6), 0xe0a050), [0.02, -0.45, 0.12], [1.3, 0, 0.2]);
  for (let i = -1; i <= 1; i++) addTo(loaf, part(G.box(0.1, 0.03, 0.04), 0xfff0c8, { outline: false }), [0, i * 0.18, 0.08], [0.3, 0, 0]);
  h.armL.rotation.set(-0.6, 0, -0.15);
  return h;
}
export function buildBard() {
  const h = buildHumanoid({ skin: 0xffe6d2, top: 0x7cc46a, hem: 0x5fa653, pants: 0x8a6a4a, shoes: 0x5a3a2a, sleeve: 0xfff2d0 });
  addTo(h.head, part(G.ico(0.38, 1), 0x9a6a44), [0, 0.1, -0.08], [0, 0, 0], [1.02, 0.88, 1]);
  addTo(h.head, part(G.cone(0.42, 0.34, 7), 0xe0605a), [0.03, 0.38, -0.02], [0, 0, -0.18]);
  addTo(h.head, part(G.cone(0.05, 0.7, 4), 0xff9ad0), [-0.24, 0.55, -0.1], [0, 0, 0.9]);
  const lute = new THREE.Group(); lute.position.set(0.05, 0.78, 0.33); lute.rotation.z = 0.7; h.body.add(lute);
  addTo(lute, part(G.ico(0.22, 1), 0xd08850), [0, 0, 0], [0, 0, 0], [1, 1.15, 0.45]);
  addTo(lute, part(G.cyl(0.05, 0.05, 0.02, 7), 0x3a2340, { outline: false }), [0, 0.04, 0.1], [Math.PI / 2, 0, 0]);
  addTo(lute, part(G.box(0.07, 0.5, 0.05), 0x8a5a3a), [0, 0.45, 0]);
  h.armR.rotation.set(-0.7, 0, 0.3); h.lute = lute; return h;
}
export function buildSprite() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.cone(0.24, 0.5, 6), 0x8fe08a), [0, 0.25, 0], [Math.PI, 0, 0]);
  addTo(body, part(G.cyl(0.08, 0.1, 0.2, 6), 0xfff0e0), [0, 0.52, 0]);
  const head = new THREE.Group(); head.position.set(0, 0.8, 0); body.add(head);
  addTo(head, part(G.ico(0.26, 1), 0xfff0e0), [0, 0, 0]);
  addFace(head, { z: 0.24, y: -0.02, sep: 0.09, big: 0.8 });
  addTo(head, part(G.ico(0.28, 1), 0x9ff5d8), [0, 0.08, -0.06], [0, 0, 0], [1.05, 0.9, 1]);
  addTo(head, part(G.ico(0.07, 0), 0xff9ad0, { glow: true, intensity: 2.3 }), [0.2, 0.2, 0.1]);
  for (const sx of [-1, 1]) { addTo(head, part(G.cyl(0.01, 0.01, 0.3, 3), 0x5fb35e, { outline: false }), [sx * 0.1, 0.36, 0], [0, 0, -sx * 0.3]);
    addTo(head, part(G.ico(0.045, 0), 0xfff08a, { glow: true, intensity: 3 }), [sx * 0.15, 0.5, 0]); }
  const wings = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.06, 0.5, -0.12); body.add(g);
    addTo(g, part(G.ico(0.28, 0), 0xcffaff, { glow: true, intensity: 1.5 }), [sx * 0.26, 0.14, 0], [0, 0, sx * 0.4], [1, 0.08, 0.55]);
    addTo(g, part(G.ico(0.2, 0), 0xffd6f5, { glow: true, intensity: 1.5 }), [sx * 0.2, -0.12, 0], [0, 0, -sx * 0.4], [1, 0.08, 0.5]); wings.push(g); }
  return { root, body, head, wingL: wings[0], wingR: wings[1] };
}

// ---- planet locals (a villager who lives on that planet only; src/entities/npc/npcDefs.js createLocalDefs) ----

/** Cinder, Emberfall's smith: soot-dark apron, goggles up on the forehead, a bandana and a hammer. */
export function buildSmith() {
  const h = buildHumanoid({ skin: 0xd9a07a, top: 0x8a4a32, hem: 0x6a3424, pants: 0x4a3a34, shoes: 0x2e2220, belt: 0x3a2a22, sleeve: 0xd9a07a, w: 1.3, face: { big: 0.85 } });
  addTo(h.body, part(G.box(0.56, 0.66, 0.06), 0x3a3034), [0, 0.7, 0.37], [-0.1, 0, 0]);                       // leather apron
  addTo(h.body, part(G.box(0.12, 0.1, 0.04), 0xffb347, { glow: true, intensity: 1.6 }), [0.12, 0.62, 0.41]);    // glowing ember in the pocket
  addTo(h.head, part(G.ico(0.38, 1), 0x2e2220), [0, 0.12, -0.08], [0, 0, 0], [1.04, 0.86, 1]);                // short dark hair
  addTo(h.head, part(new THREE.TorusGeometry(0.37, 0.05, 4, 14), 0xe0482a), [0, 0.12, -0.02], [Math.PI / 2 - 0.1, 0, 0]);   // bandana
  for (const sx of [-1, 1]) addTo(h.head, part(G.cyl(0.09, 0.09, 0.08, 8), 0xffd36b, { glow: true, intensity: 1.4 }), [sx * 0.13, 0.27, 0.27], [Math.PI / 2 - 0.5, 0, 0]);
  addTo(h.head, part(G.box(0.4, 0.04, 0.04), 0x3a2a22), [0, 0.27, 0.24], [-0.5, 0, 0]);                        // goggle strap
  const hammer = new THREE.Group(); hammer.position.set(0, -0.42, 0.05); h.armR.add(hammer);
  addTo(hammer, part(G.cyl(0.035, 0.04, 0.7, 5), 0x6a4430), [0, 0, 0.28], [Math.PI / 2, 0, 0]);
  addTo(hammer, part(G.box(0.16, 0.16, 0.3), 0x5a5a66), [0, 0, 0.62], [0, Math.PI / 2, 0]);
  h.armR.rotation.set(-0.4, 0, 0.15);
  return h;
}

/** Tuva, Frostveil's snow keeper: a round fur coat and hood with little ears, pink earmuffs and a warm lantern. */
export function buildSnowKeeper() {
  const h = buildHumanoid({ skin: 0xffe6da, top: 0xf2f6ff, hem: 0xd8e6f6, pants: 0x8aa0c8, shoes: 0x5a6a8a, belt: 0x8fd8ff, sleeve: 0xf2f6ff, w: 1.45, face: { blush: 0xff9fc0 } });
  addTo(h.body, part(G.ico(0.42, 1), 0xf8fbff), [0, 0.7, 0], [0, 0, 0], [1.25, 0.9, 1.1]);                      // puffy coat
  addTo(h.head, part(G.hemi(0.42, 9, 4), 0xf8fbff), [0, 0.02, -0.04], [-0.2, 0, 0]);                           // fur hood
  for (const sx of [-1, 1]) {
    addTo(h.head, part(G.cone(0.1, 0.18, 5), 0xf8fbff), [sx * 0.22, 0.42, -0.06], [0, 0, -sx * 0.4]);         // hood ears
    addTo(h.head, part(G.ico(0.11, 1), 0xff9fc0), [sx * 0.37, 0, 0]);                                           // earmuffs
  }
  const lantern = new THREE.Group(); lantern.position.set(0, -0.48, 0.08); h.armL.add(lantern);
  addTo(lantern, part(G.box(0.18, 0.22, 0.18), 0x5a6a8a), [0, -0.12, 0]);
  addTo(lantern, part(G.ico(0.08, 1), 0xffd36b, { glow: true, intensity: 3 }), [0, -0.12, 0]);
  h.armL.rotation.set(-0.5, 0, -0.1);
  return { ...h, lanternGlow: lantern };
}

// ---- outfits: the travelling villagers dress for each new planet ----

/** Outfit colours per planet; each villager gets one that stands out from their own clothes (outfitColor). */
export const OUTFIT_COLORS = Object.fromEntries(PLANETS.map(p => [p.id, p.outfitColors]));
/** The palette colour furthest from the villager's own colour (so a scarf never vanishes against a robe). */
export function outfitColor(planet, own) {
  const o = new THREE.Color(own), dist = c => { const x = new THREE.Color(c); return (x.r - o.r) ** 2 + (x.g - o.g) ** 2 + (x.b - o.b) ** 2; };
  return (OUTFIT_COLORS[PLANETS[planet]?.id]?.length ? OUTFIT_COLORS[PLANETS[planet].id] : [0xffffff]).reduce((best, c) => (dist(c) > dist(best) ? c : best));
}

/** An accessory set for planet `planet` on a villager's head pivot (headR = head radius, to scale it), or null on
    the home planet. color = the scarf / neckerchief colour. hat = they already wear a big hat (no earmuffs). */
export function buildOutfit(planet, { headR = 0.36, color = 0xffffff, hat = false } = {}) {
  const outfit = PLANETS[planet]?.outfit;
  if (!outfit) return null;
  const g = new THREE.Group(), s = headR / 0.36; g.scale.setScalar(s);
  if (outfit === 'neckerchief') {                         // Emberfall: a bright neckerchief knotted at the front
    addTo(g, part(new THREE.TorusGeometry(0.27, 0.06, 4, 12), color), [0, -0.36, 0], [Math.PI / 2, 0, 0]);
    addTo(g, part(G.cone(0.14, 0.24, 3), color), [0, -0.48, 0.24], [Math.PI + 0.3, 0, 0], [1, 1, 0.35]);
  } else {                                                // Frostveil: a chunky knitted scarf (+ earmuffs unless hatted)
    addTo(g, part(new THREE.TorusGeometry(0.28, 0.09, 5, 12), color), [0, -0.36, 0], [Math.PI / 2, 0, 0]);
    addTo(g, part(G.box(0.14, 0.42, 0.06), color), [0.16, -0.58, 0.22], [0.2, 0, 0.15]);
    for (const y of [-0.5, -0.64]) addTo(g, part(G.box(0.15, 0.03, 0.07), 0xffffff, { outline: false }), [0.16, y, 0.24], [0.2, 0, 0.15]);
    if (!hat) for (const sx of [-1, 1]) addTo(g, part(G.ico(0.1, 1), 0xffffff), [sx * 0.37, 0, 0]);
  }
  return g;
}

// ---- indoor residents (src/gameplay/Houses.js): they live inside their house ----

/** Granny Thimble: silver bun, round spectacles, a knitted shawl and needles. */
export function buildGranny() {
  const h = buildHumanoid({ skin: 0xffe2cc, top: 0xb48cc8, hem: 0x9a74b0, pants: 0x7a6a8a, shoes: 0x5a4a5a, belt: 0xffd36b, sleeve: 0xb48cc8, w: 1.2, face: { big: 0.85 } });
  addTo(h.head, part(G.ico(0.38, 1), 0xe8e8f0), [0, 0.1, -0.07], [0, 0, 0], [1.03, 0.85, 1]);
  addTo(h.head, part(G.ico(0.17, 1), 0xe8e8f0), [0, 0.36, -0.22]);                                   // bun
  for (const sx of [-1, 1]) addTo(h.head, part(new THREE.TorusGeometry(0.08, 0.015, 4, 10), 0xffd36b), [sx * 0.13, 0.0, 0.34]);
  addTo(h.body, part(new THREE.TorusGeometry(0.3, 0.09, 5, 12), 0xff8fb1), [0, 1.08, 0], [Math.PI / 2, 0, 0]);   // shawl
  addTo(h.armR, part(G.cyl(0.015, 0.015, 0.5, 4), 0xd8c08a), [0.05, -0.45, 0.1], [0.8, 0, 0.3]);
  return h;
}

/** Moth the librarian: a tall reader with big round glasses, a long coat and a book under one arm. */
export function buildLibrarian() {
  const h = buildHumanoid({ skin: 0xf0d6c0, top: 0x5a6ab0, hem: 0x4a5a98, pants: 0x3a3a5a, shoes: 0x2a2a3a, belt: 0xd8c08a, sleeve: 0x5a6ab0 });
  addTo(h.head, part(G.ico(0.38, 1), 0x6a5a8a), [0, 0.12, -0.08], [0, 0, 0], [1.03, 0.85, 1]);
  for (const sx of [-1, 1]) addTo(h.head, part(new THREE.TorusGeometry(0.1, 0.022, 4, 12), 0x3a2a40), [sx * 0.13, 0.0, 0.34]);
  addTo(h.head, part(G.box(0.08, 0.02, 0.02), 0x3a2a40), [0, 0.0, 0.35]);
  const book = addTo(h.armL, part(G.box(0.3, 0.38, 0.08), 0xe0605a), [0.05, -0.42, 0.14], [0.2, 0, 0]);
  addTo(book, part(G.box(0.26, 0.34, 0.09), 0xfff6ee, { outline: false }), [0.03, 0, 0]);
  return h;
}
