/* World models for items lying on the ground, one per icon shape (procedural PLACEHOLDER art, same toon + outline
   style). An item definition with icon.src would need a sprite or model here to replace the shape. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

const SHAPES = {
  orb: (g, c) => { addTo(g, part(G.ico(0.17, 1), c, { glow: true, intensity: 1.8 }), [0, 0, 0]); addTo(g, part(G.cone(0.05, 0.12, 4), 0x5fb35e), [0, 0.18, 0]); },
  bun: (g, c) => { addTo(g, part(G.hemi(0.22, 8, 3), c), [0, -0.04, 0], [0, 0, 0], [1, 0.8, 1]); addTo(g, part(G.cyl(0.22, 0.2, 0.08, 8), 0xf6e0c0), [0, -0.06, 0]); },
  cap: (g, c) => { addTo(g, part(G.cyl(0.05, 0.07, 0.2, 5), 0xfff0dc), [0, -0.08, 0]); addTo(g, part(G.hemi(0.2, 7, 3), c, { glow: true, intensity: 1.6 }), [0, 0.02, 0]); },
  gem: (g, c) => { addTo(g, part(G.oct(0.2), c, { glow: true, intensity: 2.2 }), [0, 0, 0], [0, 0, 0], [0.8, 1.3, 0.8]); },
  petal: (g, c) => { for (let i = 0; i < 5; i++) addTo(g, part(G.cone(0.08, 0.26, 4), c, { glow: true, intensity: 1.6 }), [Math.cos(i * 1.26) * 0.1, 0, Math.sin(i * 1.26) * 0.1], [Math.PI / 2, 0, -i * 1.26 + Math.PI / 2]); },
  charm: (g, c) => { addTo(g, part(new THREE.TorusGeometry(0.17, 0.035, 4, 12), 0xffd36b), [0, 0, 0]); addTo(g, part(G.oct(0.09), c, { glow: true, intensity: 2.6 }), [0, 0, 0]); },
  crown: (g, c) => {
    addTo(g, part(G.cyl(0.2, 0.2, 0.12, 8), c), [0, -0.05, 0]);
    for (let i = 0; i < 5; i++) addTo(g, part(G.cone(0.05, 0.16, 4), 0xffd36b), [Math.cos(i * 1.26) * 0.18, 0.08, Math.sin(i * 1.26) * 0.18]);
  },
};

/** Parts: root (placed on the ground), spinner (bobs and turns). */
export function buildItemModel(def) {
  const root = new THREE.Group(), spinner = new THREE.Group(); root.add(spinner);
  (SHAPES[def.icon.shape] || SHAPES.orb)(spinner, def.icon.color ?? 0xffffff);
  return { root, spinner };
}
