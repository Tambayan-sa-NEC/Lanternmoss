import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.window = { devicePixelRatio: 1 };
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
const { batchRigidParts } = await import('../src/render/staticParts.js');
const { part, G, addTo } = await import('../src/render/meshes.js');
const { outlineMat } = await import('../src/render/materials.js');
const { ActorRenderGroup } = await import('../src/render/actorCulling.js');

test('culled render branches skip matrix work and restore the current animated pose on return', () => {
  const root = new THREE.Group(), gate = new ActorRenderGroup(), joint = new THREE.Group(), tip = new THREE.Group();
  root.add(gate); gate.add(joint); joint.add(tip); tip.position.x = 2;
  root.updateMatrixWorld(true);
  let updates = 0; const original = tip.updateMatrixWorld;
  tip.updateMatrixWorld = function(force) { updates++; return original.call(this, force); };
  gate.visible = false; root.position.x = 10; joint.rotation.z = Math.PI / 2;
  root.updateMatrixWorld(true); assert.equal(updates, 0);
  gate.visible = true; root.updateMatrixWorld(true); assert.equal(updates, 1);
  const at = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
  assert.ok(at.distanceTo(new THREE.Vector3(10, 2, 0)) < 1e-9);
  // Explicit world queries still work independently of the renderer, including while culled.
  gate.visible = false; root.position.x = 20;
  assert.ok(tip.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(20, 2, 0)) < 1e-9);
});

const meshCount = root => { let n = 0; root.traverse(o => { if (o.isMesh) n++; }); return n; };
function model() {
  const root = new THREE.Group(), body = new THREE.Group(), joint = new THREE.Group(); root.add(body); body.add(joint);
  root.position.set(8, 3, -2); root.scale.set(2, 3, 1); joint.position.set(1, 2, 0);
  const decoration = new THREE.Group(); body.add(decoration); decoration.position.set(-1, 0, 2);
  addTo(decoration, part(G.box(1, 1, 1), 0xff8844), [0, 1, 0]);
  addTo(decoration, part(G.box(1, 1, 1), 0x44aaff), [1, 0, 0]);
  addTo(decoration, part(G.box(1, 1, 1), 0xaaffff, { glow: true }), [0, 0, 1]);
  addTo(joint, part(G.box(1, 1, 1), 0xffff44), [0, 1, 0]);
  addTo(joint, part(G.box(1, 1, 1), 0x114455), [1, 0, 0]);
  return { root, body, joint };
}
function vertices(root) {
  root.updateMatrixWorld(true); const out = [], p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  const rounded = n => Math.abs(n) < .00005 ? '0.0000' : n.toFixed(4);
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry, a = g.attributes.position, colors = g.attributes.color, m = mesh.material;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < (g.index?.count ?? a.count); i++) {
      const index = g.index ? g.index.getX(i) : i; p.fromBufferAttribute(a, index).applyMatrix4(mesh.matrixWorld);
      n.fromBufferAttribute(g.attributes.normal, index).applyNormalMatrix(normalMatrix);
      if (m === outlineMat) c.setRGB(0, 0, 0); else {
        c.copy(m.color); if (m.vertexColors) c.multiply(new THREE.Color().fromBufferAttribute(colors, index));
      }
      out.push([m === outlineMat ? 'outline' : m.isMeshToonMaterial ? 'toon' : 'glow',
        ...p.toArray().map(rounded), ...n.toArray().map(rounded), ...c.toArray().map(rounded)].join('/'));
    }
  }); return out.sort();
}

test('rigid batching preserves geometry, HDR colours and named joint motion while reducing submissions', () => {
  const control = model(), batched = model(), before = meshCount(batched.root);
  assert.deepEqual(vertices(batched.root), vertices(control.root));
  const joint = batched.joint; assert.equal(batchRigidParts(batched), batched); assert.equal(batched.joint, joint);
  assert.ok(meshCount(batched.root) < before); assert.equal(joint.parent, batched.body);
  assert.deepEqual(vertices(batched.root), vertices(control.root));
  for (const m of [batched, control]) { m.joint.rotation.z = Math.PI / 2; m.joint.scale.set(1, 2, 1); }
  assert.deepEqual(vertices(batched.root), vertices(control.root));
});

test('hidden effects, transparent geometry and mutable materials keep their independent controls', () => {
  const m = model(), hidden = addTo(m.body, part(G.box(1, 1, 1), 0xffffff)); hidden.visible = false;
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }), mutable = new THREE.Mesh(G.box(1, 1, 1), material);
  const transparent = new THREE.Mesh(G.box(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .3 }));
  m.body.add(mutable, transparent); m.materials = [material];
  batchRigidParts(m); assert.equal(hidden.parent, m.body); assert.equal(hidden.visible, false);
  assert.equal(transparent.parent, m.body); assert.equal(transparent.material.opacity, .3);
  material.color.set(0x00ff00); assert.equal(mutable.material, material); assert.equal(mutable.parent, m.body);
  hidden.visible = true; assert.equal(hidden.visible, true);
});
