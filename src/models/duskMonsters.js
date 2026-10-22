/* Duskhollow's regular monsters (TODO 30e), in the same toon + ink-outline style.
   Builders return the part names their behaviour modules drive
   (src/entities/enemies/behaviors/lightbound.js, mimic.js). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { settings } from '../core/settings.js';

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

/** Accessibility (TODO 30f): with `roundBeetles` on, every spider on this world draws its beetle silhouette
    instead. Both shapes are built once and one is hidden, so the toggle takes effect the very next frame and costs
    no rebuild; the hidden one is not drawn. The regular Gloomweaver and (in 30g) Grandmother Gloomweaver share this
    one switch, so the setting can never leave a hero facing one of each. */
export function showSpiderLook(e) {
  const beetle = !!settings.roundBeetles;
  if (e.spider) e.spider.visible = !beetle;
  if (e.beetle) e.beetle.visible = beetle;
}

/** The spider / beetle pair every Duskhollow spider wears. `scale` sizes it for a regular weaver or a mini boss.
    Parts: body (the whole creature, for hit pops), spider, beetle, legs[8], fangs[2], eyes[n]. */
export function buildSpiderLook(def = {}, scale = 1) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  const fur = def.color ?? 0x5a4a78, mark = def.capColor ?? 0xd8c0ff;
  body.scale.setScalar(scale);

  const spider = group(body, 0, 0, 0);                                 // round and fuzzy, not leggy and spindly
  addTo(spider, part(G.ico(0.42, 1), fur), [0, 0.42, -0.08], [0, 0, 0], [1, 0.92, 1.1]);
  addTo(spider, part(G.ico(0.26, 1), fur), [0, 0.44, 0.34]);           // the head, tucked into the body
  for (let i = 0; i < 5; i++) addTo(spider, part(G.ico(0.07, 0), mark, { glow: true, intensity: 1.4 }),
    [Math.cos(i * 1.26) * 0.2, 0.62 + Math.sin(i * 1.26) * 0.12, -0.2]);   // the mark on its back
  const eyes = [];
  for (const sx of [-1, 1]) for (const [dx, dy] of [[0.1, 0.06], [0.2, -0.02]])
    eyes.push(addTo(spider, part(G.ico(0.045, 0), 0xfff0a0, { glow: true, intensity: 2 }), [sx * dx, 0.5 + dy, 0.52]));
  const fangs = [];
  for (const sx of [-1, 1]) {
    const f = group(spider, sx * 0.08, 0.36, 0.5);
    addTo(f, part(G.cone(0.05, 0.18, 4), 0xfff6e6), [0, -0.08, 0], [0.4, 0, 0]);
    fangs.push(f);
  }

  const beetle = group(body, 0, 0, 0);                                 // the accessible silhouette: a round beetle
  beetle.visible = false;
  addTo(beetle, part(G.ico(0.44, 1), fur), [0, 0.42, 0], [0, 0, 0], [1, 0.8, 1.15]);
  addTo(beetle, part(G.box(0.05, 0.3, 0.74), 0x2a2140, { outline: false }), [0, 0.68, -0.02]);   // the shell's seam
  addTo(beetle, part(G.ico(0.22, 1), fur), [0, 0.34, 0.46], [0, 0, 0], [1, 0.9, 0.8]);
  for (const sx of [-1, 1]) addTo(beetle, part(G.cone(0.05, 0.26, 4), mark, { glow: true, intensity: 1.6 }), [sx * 0.1, 0.5, 0.6], [-0.7, 0, sx * 0.3]);
  for (const sx of [-1, 1]) eyes.push(addTo(beetle, part(G.ico(0.05, 0), 0xfff0a0, { glow: true, intensity: 2 }), [sx * 0.11, 0.4, 0.62]));

  const legs = [];                                                     // eight legs, shared by both silhouettes
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, k = i % 4;
    const l = group(body, side * 0.34, 0.34, 0.3 - k * 0.22);
    addTo(l, part(G.cyl(0.035, 0.03, 0.46, 4), 0x2a2140), [side * 0.12, -0.14, 0], [0, 0, side * 0.9]);
    legs.push(l);
  }
  return { root, body, spider, beetle, legs, fangs, eyes };
}

/** Gloomweaver: the regular spider of the hollows. */
export function buildGloomweaver(def = {}) { return buildSpiderLook(def, 1); }

/** Snuffer: a small hooded thief with a stolen flask on its belt (shown only while it is carrying oil).
    Parts: body, hood, legs[2], flask. */
export function buildSnuffer(def = {}) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  const cloth = def.color ?? 0x3b3356, lamp = def.capColor ?? 0xffc06a;
  addTo(body, part(G.cone(0.34, 0.72, 6), cloth), [0, 0.36, 0]);
  const hood = group(body, 0, 0.66, 0);
  addTo(hood, part(G.cone(0.26, 0.38, 6), cloth), [0, 0.06, -0.04], [0.25, 0, 0]);
  addTo(hood, part(G.ico(0.17, 1), 0x191230, { outline: false }), [0, 0, 0.1]);
  for (const sx of [-1, 1]) addTo(hood, part(G.ico(0.04, 0), lamp, { glow: true, intensity: 2.4 }), [sx * 0.07, 0.01, 0.22]);
  for (const sx of [-1, 1]) addTo(body, part(G.ico(0.09, 0), cloth), [sx * 0.3, 0.42, 0.04]);      // little hands
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = group(body, sx * 0.12, 0.14, 0);
    addTo(l, part(G.cyl(0.05, 0.045, 0.28, 4), 0x241c38), [0, -0.12, 0]);
    legs.push(l);
  }
  const flask = group(body, 0.26, 0.42, 0.12);
  addTo(flask, part(G.cyl(0.09, 0.11, 0.2, 6), 0x6a5a3a), [0, 0, 0]);
  addTo(flask, part(G.ico(0.07, 0), lamp, { glow: true, intensity: 2.6 }), [0, 0.04, 0]);
  flask.visible = false;
  return { root, body, hood, legs, flask };
}

/** A sticky web: a sagging sheet of silk between two anchors, with a few strands reaching out of it.
    Parts: body, sheet (the sheet itself, whose opacity breathes). */
export function buildGloomweb(def = {}) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  const silk = def.color ?? 0xd8c0ff;
  const sheet = new THREE.Mesh(new THREE.CircleGeometry(def.radius ?? 1.5, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: silk, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  sheet.position.y = 0.12; sheet.renderOrder = 2; body.add(sheet);
  const r = def.radius ?? 1.5;
  for (let i = 0; i < 9; i++) {                                        // the strands, reaching up out of the sheet
    const a = i / 9 * Math.PI * 2;
    addTo(body, part(G.cyl(0.012, 0.012, 0.55, 3), silk, { outline: false }), [Math.cos(a) * r * 0.66, 0.34, Math.sin(a) * r * 0.66], [0.2 * Math.cos(a), 0, 0.2 * Math.sin(a)]);
  }
  for (let ring = 1; ring <= 2; ring++) addTo(body, part(new THREE.TorusGeometry(r * ring / 2.4, 0.02, 3, 12).rotateX(Math.PI / 2), silk, { outline: false }), [0, 0.15, 0]);
  return { root, body, sheet };
}

/** Grandmother Gloomweaver: the same spider (or beetle) her grandchildren are, grown huge, with a pale shawl of old
    silk over her back. Parts: the ones buildSpiderLook returns, plus `shawl`. */
export function buildGrandweaver(def = {}) {
  const parts = buildSpiderLook(def, 2.3);
  const shawl = addTo(parts.spider, part(G.ico(0.5, 1), 0xe8d0ff, { glow: true, intensity: 0.9 }), [0, 0.6, -0.16], [0, 0, 0], [1.25, 0.5, 1.2]);
  addTo(parts.beetle, part(G.ico(0.5, 1), 0xe8d0ff, { glow: true, intensity: 0.9 }), [0, 0.62, -0.1], [0, 0, 0], [1.2, 0.45, 1.3]);
  return { ...parts, shawl };
}

/** An anchor strand: a thick cable of silk running up out of sight, with an ember at the top once it starts to char.
    Parts: body, strand (shrinks back up the stalk as it burns), ember. */
export function buildGloomAnchor(def = {}) {
  const root = new THREE.Group(), body = group(root, 0, 0, 0);
  const silk = def.color ?? 0xe8d0ff, h = def.height ?? 6;
  const strand = group(body, 0, 0, 0);
  addTo(strand, part(G.cyl(0.07, 0.11, h, 5), silk, { glow: true, intensity: 0.8 }), [0, h / 2, 0]);
  for (let i = 0; i < 3; i++) addTo(strand, part(G.cyl(0.03, 0.03, h * 0.8, 4), silk, { outline: false }),
    [Math.cos(i * 2.1) * 0.16, h * 0.44, Math.sin(i * 2.1) * 0.16], [0.03, 0, 0.03]);
  for (const r of [0.5, 0.34]) addTo(body, part(new THREE.TorusGeometry(r, 0.03, 3, 10).rotateX(Math.PI / 2), silk, { outline: false }), [0, 0.12, 0]);
  const ember = addTo(body, part(G.ico(0.2, 0), 0xff9a4a, { glow: true, intensity: 3 }), [0, h, 0]);
  ember.visible = false;
  return { root, body, strand, ember };
}
