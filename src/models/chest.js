/* Treasure chest model (procedural PLACEHOLDER art, same toon + outline style), facing +Z.
   Parts: root (on the ground), body (squashes when it opens), lid (hinged at the back: rotation.x < 0 opens it),
   inner (the glow inside, shown once open), lock (padlock on locked chests), beam (light pillar on the boss chest). */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';

const W = 1.0, H = 0.55, D = 0.66;

export function buildChestModel({ look, locked = false, beam = false, scale = 1 }) {
  const root = new THREE.Group(), body = new THREE.Group(), lid = new THREE.Group();
  root.add(body); body.scale.setScalar(scale);
  // the box
  addTo(body, part(G.box(W, H, D), look.wood), [0, H / 2, 0]);
  addTo(body, part(G.box(W + 0.06, 0.08, D + 0.06), look.trim), [0, 0.04, 0]);
  for (const x of [-0.34, 0.34]) addTo(body, part(G.box(0.09, H + 0.02, D + 0.04), look.trim), [x, H / 2, 0]);
  addTo(body, part(G.box(0.2, 0.2, 0.06), look.trim), [0, H - 0.1, D / 2 + 0.03]);
  // the lid, hinged along the back edge
  lid.position.set(0, H, -D / 2); body.add(lid);
  addTo(lid, part(new THREE.CylinderGeometry(D / 2, D / 2, W, 9, 1, false, 0, Math.PI), look.lid), [0, 0, D / 2], [0, 0, Math.PI / 2]);
  for (const x of [-0.34, 0.34]) addTo(lid, part(new THREE.CylinderGeometry(D / 2 + 0.03, D / 2 + 0.03, 0.09, 9, 1, false, 0, Math.PI), look.trim), [x, 0, D / 2], [0, 0, Math.PI / 2]);
  addTo(lid, part(G.box(0.16, 0.12, 0.06), look.trim), [0, 0.02, D + 0.02]);
  // treasure glow inside (seen when the lid is up)
  const inner = addTo(body, part(G.box(W - 0.16, 0.04, D - 0.16), look.glow, { glow: true, intensity: 2.6 }), [0, H - 0.04, 0]);
  inner.visible = false;
  let lock = null;
  if (locked) {
    lock = new THREE.Group(); lock.position.set(0, H - 0.16, D / 2 + 0.1); body.add(lock);
    addTo(lock, part(G.box(0.24, 0.22, 0.1), 0xc8a040), [0, 0, 0]);
    addTo(lock, part(new THREE.TorusGeometry(0.08, 0.025, 4, 10, Math.PI), 0xb0b0c0), [0, 0.11, 0]);
    addTo(lock, part(G.box(0.05, 0.08, 0.02), look.glow, { glow: true, intensity: 2.4 }), [0, -0.01, 0.06]);
  }
  let beamMesh = null;
  if (beam) {
    beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 16, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: look.glow, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beamMesh.position.y = 8; root.add(beamMesh);
  }
  return { root, body, lid, inner, lock, beam: beamMesh };
}
