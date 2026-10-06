/* Mini boss models (TODO 15): the Hydra and the Basilisk. Parts are what their kits animate
   (src/entities/enemies/behaviors/boss/hydra.js, basilisk.js). def.look recolours them (the Frostveil hydra). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

/** Hydra: a scaly mound with five long necks (the last two hidden until it grows them). Parts: body, necks[] =
    { pivot, head, jaw }, belly. */
export function buildHydra(def = {}) {
  const L = { skin: 0x3f9a8a, belly: 0xd8e8a0, fin: 0xff7a9a, eye: 0xffe066, ...(def.look ?? {}) };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  addTo(body, part(G.ico(1.25, 1), L.skin), [0, 0.95, -0.2], [0, 0, 0], [1.35, 0.85, 1.25]);
  addTo(body, part(G.ico(1.0, 1), L.belly, { outline: false }), [0, 0.7, 0.35], [0, 0, 0], [1.2, 0.6, 0.9]);
  for (let i = 0; i < 6; i++) addTo(body, part(G.cone(0.16, 0.5, 4), L.fin), [((i % 3) - 1) * 0.5, 1.95, -0.7 + Math.floor(i / 3) * 0.5], [-0.3, 0, 0]);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) addTo(body, part(G.cyl(0.22, 0.3, 0.7, 6), L.skin), [sx * 1.1, 0.3, sz * 0.7]);
  const tail = new THREE.Group(); tail.position.set(0, 0.7, -1.4); body.add(tail);
  addTo(tail, part(G.cone(0.45, 1.8, 6), L.skin), [0, 0, -0.8], [-Math.PI / 2, 0, 0]);
  const necks = [];
  const spots = [[0, 0], [-0.75, 0.35], [0.75, 0.35], [-1.2, 0.9], [1.2, 0.9]];       // x, and how far each leans out
  spots.forEach(([x, lean], i) => {
    const pivot = new THREE.Group(); pivot.position.set(x * 0.7, 1.5, 0.55); pivot.rotation.set(-0.35, 0, -x * 0.35 - lean * Math.sign(x) * 0.2); body.add(pivot);
    for (let s = 0; s < 4; s++) addTo(pivot, part(G.cyl(0.24 - s * 0.03, 0.28 - s * 0.03, 0.62, 7), L.skin), [0, 0.3 + s * 0.55, s * 0.08], [0.12, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, 2.45, 0.35); pivot.add(head);
    addTo(head, part(G.box(0.48, 0.34, 0.7), L.skin), [0, 0, 0.18]);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.14, 0.0); head.add(jaw);
    addTo(jaw, part(G.box(0.42, 0.12, 0.62), L.belly), [0, -0.04, 0.2]);
    for (const sx of [-1, 1]) {
      addTo(head, part(G.box(0.1, 0.09, 0.06), L.eye, { glow: true, intensity: 2.2 }), [sx * 0.19, 0.1, 0.34]);
      addTo(head, part(G.cone(0.07, 0.34, 4), L.fin), [sx * 0.17, 0.22, -0.12], [-0.9, 0, -sx * 0.4]);
      for (let t = 0; t < 2; t++) addTo(head, part(G.cone(0.03, 0.1, 3), 0xffffff, { outline: false }), [sx * 0.13 - t * sx * 0.08, -0.18, 0.42], [Math.PI, 0, 0]);
    }
    pivot.visible = i < 3; necks.push({ pivot, head, jaw, base: pivot.rotation.clone() });
  });
  root.scale.setScalar(def.look?.scale ?? 1);
  return { root, body, necks, tail };
}

/** Basilisk: a long, low serpent-lizard with a crested head and huge eyes. Parts: body, head, jaw, eyes[], crest, segs[]
    (body segments behind the head), legs[]. */
export function buildBasilisk(def = {}) {
  const L = { skin: 0x5a7a3a, belly: 0xe8d890, crest: 0xd8302a, eye: 0xfff066, ...(def.look ?? {}) };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const segs = [];
  for (let i = 0; i < 7; i++) {
    const r = 0.62 - i * 0.07, g = new THREE.Group(); g.position.set(0, 0.62 - i * 0.04, 0.4 - i * 0.78); body.add(g);
    addTo(g, part(G.ico(r, 1), L.skin), [0, 0, 0], [0, 0, 0], [1.05, 0.85, 1.25]);
    addTo(g, part(G.ico(r * 0.85, 1), L.belly, { outline: false }), [0, -r * 0.35, 0.05], [0, 0, 0], [1, 0.5, 1.1]);
    if (i < 5) addTo(g, part(G.cone(0.1, 0.32, 4), L.crest), [0, r * 0.85, 0], [-0.3, 0, 0]);
    segs.push(g);
  }
  const head = new THREE.Group(); head.position.set(0, 0.9, 1.15); body.add(head);
  addTo(head, part(G.box(0.7, 0.42, 0.85), L.skin), [0, 0, 0.1]);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.2, -0.1); head.add(jaw);
  addTo(jaw, part(G.box(0.62, 0.14, 0.82), L.belly), [0, -0.04, 0.25]);
  const eyes = [];
  for (const sx of [-1, 1]) {
    eyes.push(addTo(head, part(G.ico(0.13, 1), L.eye, { glow: true, intensity: 1.7 }), [sx * 0.28, 0.14, 0.28]));
    addTo(head, part(G.box(0.03, 0.16, 0.03), 0x1a1018, { outline: false }), [sx * 0.3, 0.14, 0.4]);
  }
  const crest = new THREE.Group(); crest.position.set(0, 0.24, -0.1); head.add(crest);
  for (let i = 0; i < 5; i++) addTo(crest, part(G.cone(0.07, 0.6 - Math.abs(i - 2) * 0.12, 4), L.crest), [(i - 2) * 0.14, 0.25, -0.1], [-0.5, 0, (i - 2) * 0.25]);
  const legs = [];
  for (const [sx, z] of [[-1, 0.2], [1, 0.2], [-1, -1.4], [1, -1.4]]) {
    const g = new THREE.Group(); g.position.set(sx * 0.55, 0.5, z); body.add(g);
    addTo(g, part(G.box(0.2, 0.5, 0.22), L.skin), [sx * 0.08, -0.25, 0], [0, 0, sx * 0.35]); legs.push(g);
  }
  root.scale.setScalar(def.look?.scale ?? 1.25);
  return { root, body, head, jaw, eyes, crest, segs, legs };
}
