import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { settings, setSetting, resetSettings } = await imp('core/settings.js');
const { seedPlay, rng, rand } = await imp('utils/random.js');
const { sparkles } = await imp('fx/sparkles.js');
const { Batcher, setSceneryDensity } = await imp('render/Batcher.js');
const { cullActors } = await imp('render/actorCulling.js');
const { camera } = await imp('render/scene.js');
const THREE = await import('three');
const renderedGrass = () => game.world.grass.reduce((sum, g) => sum + g.children.reduce((n, m) => n + m.count, 0), 0);
for (const id of ['lanternmoss', 'emberfall', 'frostveil']) {
  resetSettings(); H.goToPlanet(id);
  const layout = JSON.stringify({ nodes: H.Gathering.toJSON(), spots: game.world.spots,
    colliders: H.colliders.map(c => [c.dir?.toArray(), c.r]), lair: game.world.lairDir.toArray() });
  const grass = renderedGrass(), bounds = game.world.grass.flatMap(g => g.children.map(m => m.boundingSphere.clone()));
  H.PauseMenu.open(); setSetting('quality', 'low');
  assert.ok(renderedGrass() < grass);
  assert.equal(JSON.stringify({ nodes: H.Gathering.toJSON(), spots: game.world.spots,
    colliders: H.colliders.map(c => [c.dir?.toArray(), c.r]), lair: game.world.lairDir.toArray() }), layout);
  assert.deepEqual(game.world.grass.flatMap(g => g.children.map(m => m.boundingSphere)), bounds);
  for (const key of ['scenery', 'grass', 'particle', 'weather']) setSetting(`${key}Density`, 0);
  assert.equal(renderedGrass(), 0); assert.equal(sparkles.points.geometry.drawRange.count, 0);
  for (const layer of Object.values(H.weather.layers)) assert.equal(layer.geometry.drawRange.count, 0);
  setSetting('quality', 'high'); resetSettings(); assert.equal(renderedGrass(), grass);
  H.PauseMenu.close();
  const n = H.Gathering.nodes[0]; H.player.placeAt(n.up); n.deplete();
  setSetting('resourceDensity', 0); n.update(0); assert.equal(n.ready, false);
  if (n.def.vanish) assert.equal(n.root.visible, false); else assert.equal(n.fruit.visible, false);
  n.update(n.regrowT + 0.01); assert.equal(n.ready, true); assert.equal(n.root.visible, true); assert.equal(n.fruit.visible, true);
}
console.log('PASS  quality changes preserve layout, resource state and full culling bounds on all planets');
for (const density of [0, 0.35, 1]) {
  sparkles.applyDensity(density); seedPlay(123); sparkles.emit(H.player.pos, { count: 40 });
  const next = rng(); seedPlay(123); for (let i = 0; i < 40 * 5; i++) rng(); assert.equal(next, rng());
}
console.log('PASS  particle density preserves gameplay random stream');
const b = new Batcher({ cellSize: 10 }); b.decorative = true;
const geo = new THREE.BoxGeometry(1, 1, 1), transform = new THREE.Matrix4();
b.add(geo, 0xffffff, transform); b.add(geo, 0xffffff, transform.makeTranslation(30, 0, 0));
const group = b.build(); assert.equal(group.children.length, 4);
setSceneryDensity(group, 0); assert.ok(group.children.every(m => !m.visible && m.geometry.drawRange.count === 0));
setSceneryDensity(group, 1); assert.ok(group.children.every(m => m.visible));
console.log('PASS  spatial batches cull independently and density restores complete primitives');
const actor = H.npcs[0], oldChildren = [...actor.root.children], snapshot = actor.toJSON();
actor.root.updateWorldMatrix(true, true);
const positions = oldChildren.map(child => child.getWorldPosition(new THREE.Vector3()));
camera.position.copy(actor.root.position).add(new THREE.Vector3(500, 0, 0));
H.player.pos.copy(camera.position); cullActors(camera);
assert.equal(actor.root.children.length, 1); assert.equal(actor.root.children[0].visible, false);
assert.deepEqual(actor.toJSON(), snapshot);
oldChildren.forEach((child, i) => assert.ok(child.getWorldPosition(new THREE.Vector3()).distanceTo(positions[i]) < 1e-8));
actor.root.visible = false; camera.position.copy(actor.root.position); cullActors(camera);
assert.equal(actor.root.visible, false); assert.equal(actor.root.children[0].visible, true);
actor.dress(0); cullActors(camera);
assert.equal(actor.root.children.length, 1);
console.log('PASS  actor culling preserves visibility ownership, animated transforms and replacement outfits');
