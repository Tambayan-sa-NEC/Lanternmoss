// TODO 29e (puzzles, guardian and shortcut): the warded door really closes the way to the end room, for the hero and
// for room routes alike; lighting every lantern switch (Lanternmoss) or shouldering every stone onto its plate
// (Emberfall) unseals the key chest; the Warden's Key turns the door once and is spent; the end room's guardian is
// one of the cave's own monsters made tougher, drops its loot and opens the way home; and all of it survives leaving,
// Continue and the cave being rebuilt. Nothing here releases a cave.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { PLANETS } = await imp('config/planets.js');
const { CAVE, CAVES } = await imp('config/dungeons.js');
const { COMBAT } = await imp('config/combat.js');
const { caveEnding, generateCave, roomAt } = await imp('world/caveLayout.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { damageEnemy } = await imp('combat/damage.js');
const { H, game, step } = await boot('witch', { wake: false });
const P = H.player, D = H.Dungeons, Q = H.CavePuzzles, K = H.keys;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

const clearKeys = () => { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) K[k] = false; };
const now = () => D.inside;
const put = (x, z) => { now().x = x; now().z = z; D.placeHero(); P.vel.set(0, 0, 0); step(0.1); };
const prompt = () => currentInteraction()?.label ?? null;
const world = (x, z) => now().built.toWorld(x, z);

// ---- Lanternmoss: lantern switches, the sealed key chest and the ward ------------------------------------------------
assert.ok(D.enter()); step(1);
let L = now().layout, E = caveEnding(L, now().cave);
assert.equal(E.puzzle.kind, 'lanterns');
assert.equal(Q.switches.length, CAVE.puzzle.switches);
assert.ok(Q.switches.every(s => !s.lit), 'every switch starts dark');
assert.ok(!Q.solved && !Q.door.open && !Q.keyChest.opened && !Q.shortcut.open, 'and nothing is done');

// The ward closes the doorway for the hero, for swept movement and for room routes.
const d = Q.door;
assert.equal(ctx.room.blockers.length, 1, 'the ward is up');
assert.ok(!ctx.room.contains(world(d.x, d.z), P.radius), 'nobody may stand in a warded doorway');
const endRoom = L.rooms.find(r => r.id === L.end), puzzleRoom = L.rooms.find(r => r.id === E.puzzle.room);
assert.ok(!ctx.room.clear(world(puzzleRoom.x, puzzleRoom.z), world(endRoom.x, endRoom.z), P.radius), 'and no swept path crosses it');
const route = ctx.room.waypoint(world(puzzleRoom.x, puzzleRoom.z), world(endRoom.x, endRoom.z), P.radius);
assert.ok(ctx.room.distance(route, world(endRoom.x, endRoom.z)) > 1, 'a room route cannot reach the end room either');
// Real movement keys cannot push through it.
put(d.x, d.z + 2.2); clearKeys();
const towardEnd = Math.sign(endRoom.z - puzzleRoom.z) || 0, side = Math.sign(endRoom.x - puzzleRoom.x) || 0;
if (towardEnd) K[towardEnd < 0 ? 'KeyW' : 'KeyS'] = true; else K[side < 0 ? 'KeyA' : 'KeyD'] = true;
for (let i = 0; i < 240; i++) step(1 / 60);
clearKeys(); step(0.2);
assert.notEqual(now().room, L.end, `real keys cannot walk through the ward (room ${now().room})`);
pass('the warded door closes the way to the end room: no standing in it, no swept path, no room route, no walking through');

// E says it is sealed until the puzzle is done.
put(Q.keyChest.x, Q.keyChest.z + 1.3);
assert.ok(/sealed/i.test(prompt() ?? ''), `the key chest reads as sealed (got ${prompt()})`);
currentInteraction().run(); step(0.2);
assert.ok(!Q.keyChest.opened && !H.inventory.count('wardenKey'), 'and it refuses to open');
put(d.x, d.z + 1.4);
assert.ok(/locked/i.test(prompt() ?? ''), `the door reads as locked (got ${prompt()})`);
currentInteraction().run(); step(0.2);
assert.ok(!Q.door.open, 'and it refuses to turn without the key');

for (const sw of Q.switches) {
  put(sw.x, sw.z - 1.0);                                     // from the far side, so the key chest is never nearer
  assert.equal(prompt(), 'Light the lantern', `E offers ${sw.id}`);
  currentInteraction().run(); step(0.2);
  assert.ok(sw.lit && Q.lit.has(sw.id), `${sw.id} is lit`);
}
assert.ok(Q.solved, 'every lantern burning solves the puzzle');
pass(`lighting all ${Q.switches.length} lantern switches with real prompts solves the puzzle; before that the chest and door refuse`);

// ---- the key, and the one turn it gets --------------------------------------------------------------------------------
put(Q.keyChest.x, Q.keyChest.z + 1.3);
assert.ok(/Open the/.test(prompt() ?? ''), `the chest now opens (got ${prompt()})`);
currentInteraction().run(); step(0.3);
assert.equal(H.inventory.count('wardenKey'), 1, "the Warden's Key is in the bag");
assert.ok(Q.keyChest.opened && Q.opened.has(Q.keyChest.id));
put(Q.keyChest.x, Q.keyChest.z + 1.3); assert.equal(prompt(), null, 'an opened key chest offers nothing more');
put(d.x, d.z + 1.4);
assert.ok(/Warden/.test(prompt() ?? ''), `the door offers the key (got ${prompt()})`);
currentInteraction().run(); step(0.3);
assert.ok(Q.door.open && Q.unlocked.has(d.id), 'the ward is down');
assert.equal(H.inventory.count('wardenKey'), 0, 'and the key was spent turning it');
assert.equal(ctx.room.blockers.length, 0);
assert.ok(ctx.room.contains(world(d.x, d.z), P.radius), 'the doorway is walkable again');
assert.ok(ctx.room.clear(world(puzzleRoom.x, puzzleRoom.z), world(endRoom.x, endRoom.z), P.radius), 'and the way through is open');
assert.equal(prompt(), null, 'an opened door offers nothing more');
pass("the sealed chest gives the Warden's Key, which turns the ward once and is spent doing it");

// ---- the guardian, its loot and the way home ---------------------------------------------------------------------------
assert.equal(Q.guardian, null, 'nothing is awake yet');
put(endRoom.x, endRoom.z + 2);
assert.ok(Q.guardian?.alive, 'stepping into the end room wakes its guardian');
const g = Q.guardian;
assert.equal(g.type, CAVES.lanternmoss.guardian);
assert.ok(g.elite, 'it is one of the cave\'s own monsters made tougher, not a bespoke boss');
assert.ok(g.def.hp > COMBAT.enemies[g.type].hp, `tougher than its ordinary kind (${g.def.hp} vs ${COMBAT.enemies[g.type].hp})`);
assert.equal(g.space, ctx.room, 'and it fights in the room frame');
assert.ok(!Q.shortcut.open, 'the way home is still shut');
const coins = P.coins, ore = H.inventory.count('gloomquartz');
damageEnemy(g, 1e9, { team: 'player' }); step(0.6);
assert.ok(!g.alive && Q.beaten.has(E.guardian.id), 'the guardian falls');
assert.ok(H.inventory.count('gloomquartz') > ore || P.coins > coins, 'and leaves its loot');
assert.equal(ctx.worldItems.length, 0, 'nothing dropped on the cave floor');
assert.ok(Q.shortcut.open, 'its fall opens the way home');
put(Q.shortcut.x, Q.shortcut.z + 1.2);
assert.equal(prompt(), 'Take the way back');
currentInteraction().run(); step(0.3);
assert.equal(now().room, L.entrance, 'the way back puts the hero at the cave mouth');
assert.ok(ctx.room.contains(P.pos, P.radius), 'standing on real floor');
pass('the end room wakes an elite of the cave\'s own kind; beating it pays its loot and opens the way back to the entrance');

// ---- none of it comes back ---------------------------------------------------------------------------------------------
const litIds = [...Q.lit], keyCount = H.inventory.count('wardenKey');
D.leave(); step(1); assert.ok(D.enter()); step(1);
L = now().layout;
assert.equal(Q.switches.filter(s => s.lit).length, litIds.length, 'the lanterns are still burning');
assert.ok(Q.door.open && ctx.room.blockers.length === 0, 'the ward stays down');
assert.ok(Q.keyChest.opened, 'the key chest stays open');
assert.ok(Q.shortcut.open, 'the way home stays open');
assert.equal(H.inventory.count('wardenKey'), keyCount, 'and no second key is handed out');
put(endRoom.x, endRoom.z + 2);
assert.equal(Q.guardian, null, 'a beaten guardian does not come back');
assert.ok(ctx.enemies.every(e => !e.caveGuardian), 'and nothing else takes its place');
assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); step(1);
assert.ok(D.inside, 'Continue resumed underground');
assert.equal(Q.switches.filter(s => s.lit).length, litIds.length);
assert.ok(Q.door.open && Q.keyChest.opened && Q.shortcut.open && Q.beaten.has(E.guardian.id), 'with the whole ending as it was');
assert.equal(ctx.room.blockers.length, 0, 'and no ward back up across a reload');
pass('a solved puzzle, a turned ward, a beaten guardian and an open way home all survive leaving, re-entering and Continue');

// ---- Emberfall: the stones and their plates -----------------------------------------------------------------------------
D.leave(); step(1); H.goToPlanet(1); step(0.5);
assert.ok(D.enter()); step(1);
L = now().layout; E = caveEnding(L, now().cave);
assert.equal(E.puzzle.kind, 'stones');
assert.equal(Q.stones.length, CAVE.puzzle.stones); assert.equal(Q.plates.length, CAVE.puzzle.stones);
assert.ok(Q.plates.every(pl => !pl.pressed) && !Q.solved, 'no plate starts pressed');
// A stone is solid: walking straight at it stops the hero outside it rather than passing through.
const st0 = Q.stones[0], stoneAtStart = { x: st0.root.position.x, z: st0.root.position.z };
assert.ok(ctx.room.bodies.has(st0.body), 'a stone is a body in the room');
put(stoneAtStart.x, stoneAtStart.z + 1.6);
const far = world(stoneAtStart.x, stoneAtStart.z - 3);
ctx.room.move(P.pos, far.clone().sub(P.pos), P.radius, P);
assert.ok(ctx.room.distance(P.pos, st0.body.pos) >= P.radius + st0.body.radius - 0.02,
  `the hero is stopped outside the stone (${ctx.room.distance(P.pos, st0.body.pos).toFixed(2)} m apart)`);
assert.ok(Math.hypot(st0.root.position.x - stoneAtStart.x, st0.root.position.z - stoneAtStart.z) < 1e-6,
  'and a swept move alone does not shove it: only real pushing moves a stone');
for (const st of Q.stones) {
  const pl = Q.plates.find(p => Math.abs(p.x - st.x) < 1e-6);
  put(st.root.position.x, st.root.position.z + 1.05); clearKeys(); K.KeyW = true;
  for (let i = 0; i < 900 && !pl.pressed; i++) step(1 / 60);
  clearKeys(); step(0.2);
  assert.ok(pl.pressed, `${st.id} was shouldered onto ${pl.id} with real movement keys`);
  assert.ok(Math.hypot(st.root.position.x - pl.x, st.root.position.z - pl.z) <= CAVE.puzzle.plateRadius);
  assert.equal(roomAt(L, st.root.position.x, st.root.position.z), E.puzzle.room, 'the stone never left the room');
}
assert.ok(Q.solved, 'every plate bearing a stone solves the puzzle');
const stoneAt = Q.stones.map(st => ({ x: st.root.position.x, z: st.root.position.z }));
put(Q.keyChest.x, Q.keyChest.z + 1.3);
assert.ok(/Open the/.test(prompt() ?? ''), 'and the key chest gives');
currentInteraction().run(); step(0.3);
assert.equal(H.inventory.count('wardenKey'), 1);
pass(`real movement keys push ${Q.stones.length} stones onto their plates, which unseals Emberfall's key chest`);

// ---- the stones stay where they were left --------------------------------------------------------------------------------
D.leave(); step(1); assert.ok(D.enter()); step(1);
Q.stones.forEach((st, i) => {
  assert.ok(Math.hypot(st.root.position.x - stoneAt[i].x, st.root.position.z - stoneAt[i].z) < 0.05,
    `${st.id} is where it was left`);
  assert.ok(ctx.room.distance(st.body.pos, world(st.root.position.x, st.root.position.z)) < 0.05, 'and its body came with it');
});
assert.ok(Q.plates.every(pl => pl.pressed) && Q.solved, 'so the puzzle is still solved');
assert.ok(Q.keyChest.opened, 'and its chest stays open');
// Each cave's ending is its own: Emberfall's progress is not Lanternmoss's.
const ember = game.saves.registry.snapshot('emberfall').planets.emberfall.cavePuzzles;
assert.equal(ember.cave, CAVES.emberfall.id);
assert.ok(ember.stones.every(s => s.id.startsWith(`${CAVES.emberfall.id}:`)), "Emberfall's snapshot holds no other cave");
assert.ok(!ember.beaten.length, 'and no guardian beaten here yet');
D.leave(); step(1); H.goToPlanet(0); step(0.5); assert.ok(D.enter()); step(1);
const moss = game.saves.registry.snapshot('lanternmoss').planets.lanternmoss.cavePuzzles;
assert.ok(moss.beaten.includes(`${now().layout.end}:guardian`), "Lanternmoss's guardian is still beaten");
assert.ok(moss.lit.every(id => id.startsWith(`${CAVES.lanternmoss.id}:`)), 'and its switches are its own');
assert.ok(!moss.stones.length, "a lantern cave records no stones");
D.leave(); step(1);
pass('pushed stones keep their places across a rebuild, and each planet keeps its own ending');

for (const cave of Object.values(CAVES)) assert.equal(cave.released, false, `${cave.id} stays unreleased`);
pass('every cave remains unreleased: none of this is reachable in normal play yet');
console.log('all passed');
