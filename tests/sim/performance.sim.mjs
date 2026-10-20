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
const { scene } = await imp('render/scene.js'); assert.equal(scene.matrixAutoUpdate, false);
for (const id of ['lanternmoss', 'emberfall', 'frostveil']) {
  resetSettings(); H.goToPlanet(id);
  for (const group of [game.world.scenery,...game.world.grass]) group.traverse(node => assert.equal(node.matrixAutoUpdate,false));
  for (const group of [game.world.scenery,...game.world.grass]) {
    group.updateMatrixWorld(true);
    const child = group.children[0]; if (!child) continue;
    let walks = 0; const original = child.updateMatrixWorld;
    child.updateMatrixWorld = function(force) { walks++; return original.call(this, force); };
    try {
      for (let i = 0; i < 20; i++) group.updateMatrixWorld();
      assert.equal(walks, 0, `${id}: immutable world branch still walks clean descendants`);
      group.updateMatrixWorld(true); assert.equal(walks, 1);
    } finally { child.updateMatrixWorld = original; }
  }
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
const { ctx } = await imp('core/context.js');
const nestedParent = new THREE.Group(), nestedRoot = new THREE.Group(); nestedRoot.add(new THREE.Group());
nestedParent.position.set(1000,0,0); nestedRoot.position.set(0,20,0); nestedParent.add(nestedRoot); scene.add(nestedParent);
ctx.npcs.push({root:nestedRoot}); camera.position.set(1000,20,0); H.player.pos.copy(camera.position); cullActors(camera);
assert.equal(nestedRoot.children[0].visible,true,'nested actor culling uses the parent world transform');
ctx.npcs.pop(); scene.remove(nestedParent);
const offscreen = new THREE.Group(), limb = new THREE.Group(), decoration = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
limb.add(decoration);offscreen.add(limb);offscreen.position.set(0,0,20);scene.add(offscreen);ctx.npcs.push({root:offscreen});
camera.position.set(0,0,0);camera.quaternion.identity();H.player.pos.set(0,0,20);cullActors(camera);
assert.equal(offscreen.children[0].visible,false,'a rig entirely behind the view skips render traversal even in the player safety range');
limb.position.z=-22;cullActors(camera);
assert.equal(offscreen.children[0].visible,true,'current animated translations expand the envelope before culling');
limb.position.z=0;camera.lookAt(0,0,20);cullActors(camera);
assert.equal(offscreen.children[0].visible,true,'turning the camera restores the actor');
ctx.npcs.pop();scene.remove(offscreen);
const { HERO_BUILDERS } = await imp('models/heroes.js');
const { buildShellback, buildJellybell, buildSurfSkipper } = await imp('models/tideMonsters.js');
const { buildChestModel } = await imp('models/chest.js');
const { buildQuad, buildBird, buildOwl } = await imp('models/creatures.js');
const { CHEST_KINDS } = await imp('config/chests.js');
const { disposeTree } = await imp('render/meshes.js');
const meshCount = root => { let count = 0; root.traverse(o => { if (o.isMesh) count++; }); return count; };
const attached = (root, node) => { for (let p = node; p; p = p.parent) if (p === root) return true; return false; };
for (const [build, options, limit] of [[buildQuad,{fur:0x888888,belly:0xffffff,ear:'point',tail:'cat'},16],
  [buildBird,{body:0x888888,belly:0xffffff},8],[buildOwl,undefined,9]]) {
  const parts = build(options); assert.ok(meshCount(parts.root) <= limit,`${build.name} retains too many rigid submissions`);
  assert.ok(attached(parts.root,parts.head)); assert.equal(parts.body.matrixAutoUpdate,true);
  for (const limb of parts.legs ?? [parts.wingL,parts.wingR]) assert.ok(attached(parts.body,limb));
  disposeTree(parts.root);
}
for (const [hero, build] of Object.entries(HERO_BUILDERS)) {
  const parts = build(); assert.ok(meshCount(parts.root) <= 40, `${hero} retains too many rigid submissions`);
  for (const key of ['head','body','armL','armR','legL','legR','cape',...(hero === 'witch' ? ['hat','staff','wandTip'] : hero === 'knight' ? ['axe','axeRoll','bubble'] : ['bow','bowHold'])])
    assert.ok(attached(parts.root, parts[key]), `${hero}.${key} disconnected`);
  if (hero === 'knight') assert.equal(parts.bubble.visible, false);
  if (hero === 'ranger') for (const tail of parts.tails) assert.ok(attached(parts.head, tail));
  disposeTree(parts.root);
}
for (const [build, limit] of [[buildShellback,24],[buildJellybell,14],[buildSurfSkipper,16]]) {
  const parts = build(); assert.ok(meshCount(parts.root) <= limit, `${build.name}: ${meshCount(parts.root)} meshes`);
  if (parts.clawL) for (const claw of [parts.clawL,parts.clawR]) {
    const pincer = claw.userData.pincer; assert.equal(pincer.parent, claw);
    pincer.rotation.x = -.5; parts.root.updateMatrixWorld(true); assert.equal(pincer.rotation.x, -.5);
  }
  disposeTree(parts.root);
}
const chest = buildChestModel({look:CHEST_KINDS.rare.look,locked:true,beam:true});
assert.ok(meshCount(chest.root) <= 10); assert.equal(chest.inner.visible,false);
assert.equal(chest.lid.parent,chest.body); assert.equal(chest.lock.parent,chest.body); assert.equal(chest.beam.parent,chest.root);
chest.lid.rotation.x = -1.95; chest.lock.visible = false; chest.inner.visible = true;
assert.equal(chest.beam.material.transparent,true); chest.beam.material.dispose(); disposeTree(chest.root);
console.log('PASS  hero/roster/chest batching reduces submissions while retaining every animated pivot and effect');
