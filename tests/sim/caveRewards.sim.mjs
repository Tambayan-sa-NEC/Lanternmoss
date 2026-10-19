// TODO 29d (cave rewards and persistence): a cave's chests and veins are built where caveFixtures puts them and
// handed out once; mining a cave vein gives gloomquartz, which no surface node drops; rooms register as visited and
// as cleared when their monsters fall; and every bit of that survives leaving, fainting, Continue and the cave being
// rebuilt, without paying out twice. Each planet's cave keeps its own progress across portal travel.
// Nothing here releases a cave: the sim enters through Dungeons.enter and uses the test-only combat fixture.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { PLANETS } = await imp('config/planets.js');
const { CAVES, CAVE_VEINS } = await imp('config/dungeons.js');
const { NODE_KINDS } = await imp('config/resources.js');
const { caveFixtures, generateCave } = await imp('world/caveLayout.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { damageEnemy, hurtPlayer } = await imp('combat/damage.js');
const { arcDist } = await imp('utils/sphere.js');
const { spawnCaveEnemy, clearCaveCombat } = await import('./lib/caveFixture.mjs');
const { H, game, step } = await boot('witch', { wake: false });
const P = H.player, D = H.Dungeons, R = H.CaveRewards, K = H.keys;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

const clearKeys = () => { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) K[k] = false; };
const now = () => D.inside;
const byId = layout => new Map(layout.rooms.map(r => [r.id, r]));
const walkTo = (x, z, budget = 900) => {
  for (let i = 0; i < budget; i++) {
    const dx = x - now().x, dz = z - now().z; if (Math.hypot(dx, dz) < 0.3) { clearKeys(); return true; }
    clearKeys(); if (dx > 0.12) K.KeyD = true; if (dx < -0.12) K.KeyA = true; if (dz < -0.12) K.KeyW = true; if (dz > 0.12) K.KeyS = true;
    step(1 / 60);
  }
  clearKeys(); return false;
};
/** Walk room to room through the doorways, then up to (x, z) in the target room. */
const goTo = (layout, room, x, z) => {
  const map = byId(layout), prev = new Map([[now().room, null]]), q = [now().room];
  while (q.length) { const id = q.shift(); if (id === room) break; for (const n of Object.values(map.get(id).doors)) if (n && !prev.has(n)) { prev.set(n, id); q.push(n); } }
  const path = []; for (let id = room; id; id = prev.get(id)) path.unshift(id);
  for (let i = 1; i < path.length; i++) {
    const a = map.get(path[i - 1]), b = map.get(path[i]);
    assert.ok(walkTo(a.x, a.z) && walkTo((a.x + b.x) / 2, (a.z + b.z) / 2) && walkTo(b.x, b.z), `reached ${b.id}`);
  }
  assert.ok(walkTo(x, z), `reached ${x.toFixed(1)}, ${z.toFixed(1)} in ${room}`);
};
const promptFor = () => currentInteraction()?.label ?? null;

const layout = generateCave(CAVES.lanternmoss, PLANETS[0].seed), F = caveFixtures(layout, CAVES.lanternmoss);
H.inventory.add('stonePick', 1); H.Hotbar.selected = 0;

// ---- the cave is furnished exactly where the layout says ----------------------------------------------------------
assert.ok(D.enter()); step(1);
assert.equal(R.chests.length, F.chests.length); assert.equal(R.veins.length, F.veins.length);
assert.ok(F.veins.length > 0 && F.chests.length > 0, 'there is something to find');
for (const v of R.veins) assert.ok(!v.mined && v.root.visible, `${v.id} is untouched`);
for (const c of R.chests) assert.ok(!c.opened, `${c.id} is shut`);
assert.ok(R.visited.has(layout.entrance), 'standing in the entrance counts as visiting it');
pass(`the cave is furnished from its layout: ${R.chests.length} chests, ${R.veins.length} gloomquartz veins, entrance empty and safe`);

// ---- mining a cave vein: gloomquartz, and it stays mined -----------------------------------------------------------
const vein = F.veins[0], ore = CAVE_VEINS[vein.kind].drops[0][0];
assert.ok(!Object.values(NODE_KINDS).some(n => (n.drops ?? []).some(([i]) => i === ore)), `${ore} is on no surface node`);
goTo(layout, vein.room, vein.x, vein.z + 1.4);
const prompt = promptFor();
assert.ok(/Mine the gloomquartz vein/.test(prompt ?? ''), `E offers the vein (got ${prompt})`);
const oreBefore = H.inventory.count(ore);
currentInteraction().run();
for (let i = 0; i < 600 && R.job; i++) step(1 / 60);
assert.equal(R.job, null, 'the mining job finished');
assert.ok(H.inventory.count(ore) > oreBefore, `${ore} went into the bag (${H.inventory.count(ore)})`);
const mined = R.veins.find(v => v.id === vein.id);
assert.ok(mined.mined && !mined.root.visible && !mined.light, 'the vein is worked out and its glow gone');
assert.ok(R.mined.has(vein.id));
assert.ok(!/gloomquartz/.test(promptFor() ?? ''), 'and E no longer offers it');
const afterMining = H.inventory.count(ore);
pass(`mining a cave vein gives ${ore}, which no surface node drops; the worked-out vein stops offering itself`);

// ---- a chest pays out once -----------------------------------------------------------------------------------------
const chest = F.chests[0];
goTo(layout, chest.room, chest.x, chest.z + 1.5);
assert.ok(/Open the /.test(promptFor() ?? ''), `E offers the chest (got ${promptFor()})`);
const coinsBefore = P.coins, bagBefore = H.inventory.count('moonberry');
currentInteraction().run(); step(0.5);
assert.ok(R.opened.has(chest.id), 'the chest is emptied');
assert.ok(P.coins > coinsBefore || H.inventory.count('moonberry') > bagBefore, 'and it gave something');
assert.equal(promptFor(), null, 'an opened chest offers nothing');
const coinsAfter = P.coins;
// Underground the loot goes straight into the bag: nothing is left lying on a floor that is about to be disposed.
assert.equal(ctx.worldItems.length, 0, 'no loot left on the cave floor');
pass('a cave chest pays its loot straight into the bag and then offers nothing more');

// ---- room progress: visited, and cleared when its monsters fall -----------------------------------------------------
const roomId = chest.room;
assert.ok(R.visited.has(roomId), 'the room the hero walked into is registered');
assert.ok(!R.isCleared(roomId), 'nothing has been fought here yet');
const foe = spawnCaveEnemy('goblin', now().x + 1.2, now().z, { held: true });
step(0.2); assert.ok(foe.alive && !R.isCleared(roomId), 'while it still stands, the room is not cleared');
damageEnemy(foe, 99999, { team: 'player' }); step(0.6);
assert.ok(!foe.alive, 'the goblin fell');
assert.ok(R.isCleared(roomId), `${roomId} counts as cleared once its monster has fallen`);
clearCaveCombat();
pass('a room registers as visited, and as cleared when its monsters fall');

// ---- leaving and coming back: nothing is handed out twice -----------------------------------------------------------
D.leave(); step(1); assert.equal(D.inside, null);
assert.ok(D.enter()); step(1);
assert.ok(R.veins.find(v => v.id === vein.id).mined, 'the vein is still worked out');
assert.ok(!R.veins.find(v => v.id === vein.id).root.visible);
assert.ok(R.chests.find(c => c.id === chest.id).opened, 'the chest is still open');
assert.equal(H.inventory.count(ore), afterMining, 'the ore was not paid again');
assert.equal(P.coins, coinsAfter, 'nor the coins');
assert.ok(R.isCleared(roomId), 'the cleared room is still cleared');
pass('leaving and entering again rebuilds the cave with its chests open, its veins worked out and nothing paid twice');

// ---- Continue underground keeps all of it ----------------------------------------------------------------------------
goTo(layout, roomId, byId(layout).get(roomId).x, byId(layout).get(roomId).z);
const poseX = now().x, poseZ = now().z;
assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); step(1);
assert.ok(D.inside, 'Continue resumed underground');
assert.ok(Math.hypot(now().x - poseX, now().z - poseZ) < 0.6, 'at the saved room pose');
assert.ok(R.mined.has(vein.id) && R.opened.has(chest.id) && R.isCleared(roomId), 'with its progress');
assert.ok(R.veins.find(v => v.id === vein.id).mined && R.chests.find(c => c.id === chest.id).opened, 'and the fixtures match it');
assert.equal(H.inventory.count(ore), afterMining); assert.equal(P.coins, coinsAfter);
pass('Continue resumes underground at the saved pose, with every chest, vein and room exactly as it was');

// ---- fainting inside keeps the progress, and puts the hero outside -----------------------------------------------------
P.invuln = 0; hurtPlayer(99999, null, 0, { lethal: true, source: 'cave rewards test' });
assert.equal(D.inside, null, 'fainting takes the hero out at once'); step(4);
assert.ok(!P.dead && arcDist(P.up, game.world.spawnDir) < 3, 'and home to the village'); P.invuln = 1e9;
assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); step(1);
assert.equal(D.inside, null, 'a save made after fainting starts on the surface, not underground');
assert.ok(D.enter()); step(1);
assert.ok(R.mined.has(vein.id) && R.opened.has(chest.id), 'the cave kept what was already taken from it');
pass('fainting inside leaves the cave and keeps its progress; the save that follows starts safely on the surface');

// ---- each planet's cave is its own ------------------------------------------------------------------------------------
const lanternmossMined = [...R.mined], lanternmossOpened = [...R.opened];
D.leave(); step(1);
H.goToPlanet(1); step(0.5);
const emberLayout = generateCave(CAVES.emberfall, PLANETS[1].seed), emberF = caveFixtures(emberLayout, CAVES.emberfall);
assert.ok(D.enter()); step(1);
assert.equal(ctx.indoors, CAVES.emberfall.name);
for (const v of R.veins) assert.ok(!v.mined, `${v.id} is untouched on Emberfall`);
for (const c of R.chests) assert.ok(!c.opened, `${c.id} is shut on Emberfall`);
assert.ok(emberF.veins.every(v => !R.mined.has(v.id)), 'no Lanternmoss progress leaked across the portal');
const emberVein = emberF.veins[0];
goTo(emberLayout, emberVein.room, emberVein.x, emberVein.z + 1.4);
assert.ok(/Mine the gloomquartz vein/.test(promptFor() ?? ''), 'Emberfall has its own untouched vein');
currentInteraction().run(); for (let i = 0; i < 600 && R.job; i++) step(1 / 60);
assert.ok(R.mined.has(emberVein.id), "and mining it records Emberfall's own progress");
// Isolation is enforced where it is saved: each planet's snapshot holds only its own cave's rows.
const emberSnap = game.saves.registry.snapshot('emberfall').planets.emberfall.caves;
assert.equal(emberSnap.cave, CAVES.emberfall.id);
assert.ok(emberSnap.mined.includes(emberVein.id));
assert.ok(emberSnap.mined.every(id => id.startsWith(`${CAVES.emberfall.id}:`)), "Emberfall's snapshot holds no other cave");
assert.ok(!emberSnap.mined.some(id => lanternmossMined.includes(id)));
D.leave(); step(1);
H.goToPlanet(0); step(0.5); assert.ok(D.enter()); step(1);
for (const id of lanternmossMined) assert.ok(R.mined.has(id), `${id} came back with Lanternmoss`);
for (const id of lanternmossOpened) assert.ok(R.opened.has(id), `${id} came back with Lanternmoss`);
const mossSnap = game.saves.registry.snapshot('lanternmoss').planets.lanternmoss.caves;
assert.equal(mossSnap.cave, CAVES.lanternmoss.id);
assert.ok(mossSnap.mined.every(id => id.startsWith(`${CAVES.lanternmoss.id}:`)), "Lanternmoss's snapshot holds no other cave");
assert.ok(!mossSnap.mined.includes(emberVein.id), "Emberfall's vein is not in Lanternmoss's save");
assert.ok(mossSnap.mined.includes(vein.id) && mossSnap.opened.includes(chest.id));
assert.ok(R.veins.find(v => v.id === vein.id).mined && R.chests.find(c => c.id === chest.id).opened, 'the fixtures were rebuilt from it');
D.leave(); step(1);
pass('each planet keeps its own cave: progress travels with its planet and never crosses a portal');

// ---- the caves are still unreleased ------------------------------------------------------------------------------------
for (const cave of Object.values(CAVES)) assert.equal(cave.released, false, `${cave.id} stays unreleased`);
assert.equal(D.mouth?.parts ?? null, null, 'and no mouth stands in the world');
pass('every cave remains unreleased: none of this is reachable in normal play yet');
console.log('all passed');
