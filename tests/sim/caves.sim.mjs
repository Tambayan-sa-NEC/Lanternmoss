// TODO 29b (seeded cave layout and traversal): each original world works out its cave mouth (placed last, clear of the
// village, gate and nodes) but shows none while the cave is unreleased; entering builds the same seeded cave every
// time, dark but lit by its lanterns and the hero; real movement keys reach every room and walls stop the hero; stepping
// back onto the mouth (or E there) leaves; a save made inside continues at the mouth; fainting inside and travelling
// take the hero out at once. Nothing here releases a cave: the sim enters through Dungeons.enter directly.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { PLANETS } = await imp('config/planets.js');
const { CAVE, CAVES } = await imp('config/dungeons.js');
const { generateCave } = await imp('world/caveLayout.js');
const { arcDist } = await imp('utils/sphere.js');
const { hurtPlayer } = await imp('combat/damage.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { groundHeight } = await imp('world/terrain.js');
const { H, game, step } = await boot('witch', { wake: false });
const P = H.player, D = H.Dungeons, K = H.keys;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);
const clearKeys = () => { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) K[k] = false; };

// ---- the mouth on every original world: worked out, but hidden while the cave is unreleased ---------------------------
for (let i = 0; i < 3; i++) {
  if (i) H.goToPlanet(i); step(0.2);
  const m = D.mouth, cave = CAVES[PLANETS[i].id], E = CAVE.entrance;
  assert.ok(m && cave && !cave.released, `${PLANETS[i].id}: a mouth spot for an unreleased cave`);
  const d = arcDist(m.dir, game.world.spawnDir);
  assert.ok(d >= E.distance[0] - 0.5 && d <= E.distance[1] + 0.5, `${d} m from the square`);
  assert.ok(arcDist(m.dir, H.Portals.gate.dir) > 3 && !H.Gathering.nodes.some(n => arcDist(n.up, m.dir) < n.def.r + 0.5));
  assert.equal(m.parts, null, 'no mouth in the world'); P.placeAt(m.dir); step(0.1);
  assert.ok(!/cave|Hollow|Warren|Grotto/i.test(currentInteraction()?.label ?? ''), 'and nothing to enter');
}
H.goToPlanet(0); step(0.5);
pass('Lanternmoss, Emberfall and Frostveil each have a mouth spot (clear of the square, gate and nodes); unreleased, none shows');

// ---- in: the same seeded cave every time, dark and lit by its lanterns -------------------------------------------------
const layout = generateCave(CAVES.lanternmoss, PLANETS[0].seed);
assert.deepEqual(D.layoutFor(0), layout, 'the layout comes from the planet seed');
const lightsBefore = H.LocalLights.count;
assert.ok(D.enter()); step(1);
const s = D.inside;
const now = () => D.inside;      // leaving and entering again makes a fresh `inside`: the walkers read the live one
assert.ok(s && ctx.indoors === CAVES.lanternmoss.name, 'inside the cave');
assert.deepEqual(s.layout.rooms.map(r => r.id), layout.rooms.map(r => r.id), 'same room ids');
assert.equal(H.LocalLights.darkness, CAVE.darkness); assert.ok(H.LocalLights.count > lightsBefore + layout.rooms.length, 'lanterns light it');
assert.equal(s.room, layout.entrance);
P.mana = P.stats.maxMana; const mana = P.mana; H.tryCast('bolt'); step(0.1);
assert.ok(P.mana < mana, '29c: fighting is enabled in caves');
pass(`entering builds ${layout.rooms.length} rooms (${layout.rooms.map(r => r.kind[0]).join('')}), dark (darkness ${H.LocalLights.darkness}) and lit by its lanterns`);

// ---- every room, with real movement keys --------------------------------------------------------------------------------
const byId = new Map(layout.rooms.map(r => [r.id, r])), visited = new Set([s.room]);
const walkTo = (x, z, budget = 600) => {
  for (let i = 0; i < budget; i++) {
    const dx = x - now().x, dz = z - now().z; if (Math.hypot(dx, dz) < 0.35) { clearKeys(); return true; }
    clearKeys(); if (dx > 0.15) K.KeyD = true; if (dx < -0.15) K.KeyA = true; if (dz < -0.15) K.KeyW = true; if (dz > 0.15) K.KeyS = true;
    step(1 / 60); visited.add(now().room);
  }
  clearKeys(); return false;
};
const route = (from, to) => {                                          // rooms from -> to through doors (BFS)
  const prev = new Map([[from, null]]), q = [from];
  while (q.length) { const id = q.shift(); if (id === to) break; for (const n of Object.values(byId.get(id).doors)) if (n && !prev.has(n)) { prev.set(n, id); q.push(n); } }
  const path = []; for (let id = to; id; id = prev.get(id)) path.unshift(id); return path;
};
const go = target => {                                                 // centre to centre, through each doorway's middle
  const path = route(now().room, target);
  for (let i = 1; i < path.length; i++) {
    const a = byId.get(path[i - 1]), b = byId.get(path[i]);
    assert.ok(walkTo(a.x, a.z) && walkTo((a.x + b.x) / 2, (a.z + b.z) / 2) && walkTo(b.x, b.z), `reached ${b.id}`);
  }
};
// 29e wards the doorway into the end room. This sim's subject is traversal, so open it the way the puzzle would.
assert.ok((await import('./lib/caveFixture.mjs')).openCaveWard(), 'the ward is open for the traversal walk');
for (const r of layout.rooms) go(r.id);
assert.equal(visited.size, layout.rooms.length, 'every room visited');
// a wall: from the entrance's centre, push west where there is no door (or north, if west has one)
go(layout.entrance); const e = byId.get(layout.entrance), wallKey = e.doors.w ? 'KeyW' : 'KeyA';
clearKeys(); K[wallKey] = true; step(3); clearKeys();
if (wallKey === 'KeyA') assert.ok(s.x >= e.x - e.w / 2 + 0.3, `the west wall holds (${s.x.toFixed(2)})`);
else assert.ok(s.z >= e.z - e.d / 2 + 0.3, `the north wall holds (${s.z.toFixed(2)})`);
pass(`real keys walked through all ${visited.size} rooms (end ${layout.end}); a wall stops the hero`);

// ---- out: step back onto the mouth -------------------------------------------------------------------------------------
const m = layout.mouth; walkTo(m.x, m.z - 3); s.armed = true; clearKeys(); K.KeyS = true;
for (let i = 0; i < 240 && D.inside; i++) step(1 / 60); clearKeys(); step(1);
assert.equal(D.inside, null, 'left by stepping onto the mouth'); assert.equal(ctx.indoors, null); assert.equal(P.motion, null);
assert.ok(P.selfCollider.active); assert.equal(H.LocalLights.darkness, 0); assert.equal(H.LocalLights.count, lightsBefore, 'the lanterns went with the cave');
assert.ok(arcDist(P.up, D.mouth.dir) < 1.5 && Math.abs(P.r - groundHeight(P.up)) < 1, 'standing at the mouth on the surface');
pass('stepping back onto the mouth leaves: on the surface at the mouth, daylight back, no lanterns left over');

// ---- E at the mouth also leaves; a save inside continues inside, at the saved room pose (29d) ------------------------
D.enter(); step(1); assert.ok(D.inside);
assert.equal(currentInteraction()?.label, 'Leave the cave', 'E at the mouth');
const deep = byId.get(layout.end); go(deep.id);                        // through the doors, not through the walls
const poseX = now().x, poseZ = now().z;
assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); step(1);
assert.ok(D.inside, 'Continue went back into the cave');
assert.equal(ctx.indoors, CAVES.lanternmoss.name); assert.equal(H.LocalLights.darkness, CAVE.darkness);
assert.ok(Math.hypot(D.inside.x - poseX, D.inside.z - poseZ) < 0.6,
  `Continue restored the room pose (${D.inside.x.toFixed(2)}, ${D.inside.z.toFixed(2)} vs ${poseX.toFixed(2)}, ${poseZ.toFixed(2)})`);
assert.equal(D.inside.room, deep.id, 'in the room it was saved in');
go(layout.entrance); walkTo(layout.mouth.x, layout.mouth.z - 1);        // back out to the mouth itself
assert.equal(currentInteraction()?.label, 'Leave the cave'); currentInteraction().run(); step(1);
assert.equal(D.inside, null, 'E at the mouth left the cave');
pass('E at the mouth leaves too; a save made inside continues underground at the saved room pose');

// ---- fainting inside and travelling take the hero out at once ---------------------------------------------------------
if (!D.inside) { D.enter(); step(1); }
assert.ok(D.inside); P.invuln = 0; hurtPlayer(9999, null, 0, { lethal: true, source: 'test' });
assert.equal(D.inside, null, 'out the moment the hero faints'); step(4);
assert.ok(!P.dead && arcDist(P.up, game.world.spawnDir) < 3, 'back home in the village'); assert.equal(P.motion, null); P.invuln = 1e9;
D.enter(); step(1); assert.ok(D.inside); H.goToPlanet(1); step(0.5);
assert.equal(D.inside, null); assert.equal(ctx.indoors, null); assert.equal(H.LocalLights.darkness, 0);
assert.ok(D.mouth && D.mouth.planet === 1, "the new world's mouth spot");
pass('fainting inside respawns the hero in the village; travelling while inside leaves the cave cleanly');
