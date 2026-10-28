// TODO 29f (original-world cave rollout): each of Lanternmoss, Emberfall and Frostveil now has a cave standing open
// in its world, and this walks the whole of each one the way a player would: find the mouth on the surface, enter by
// its real prompt, meet the rooms' own monsters, mine the world's own ore, solve the world's own puzzle, take the
// Warden's Key through the ward, beat the warden, take its purse and ride the way home. A save and Continue in the
// middle of each cave must change none of it.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { PLANETS } = await imp('config/planets.js');
const { CAVE, CAVES, CAVE_VEINS } = await imp('config/dungeons.js');
const { COMBAT } = await imp('config/combat.js');
const { caveEnding, caveMonsters, generateCave, roomAt } = await imp('world/caveLayout.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { damageEnemy } = await imp('combat/damage.js');
const { arcDist } = await imp('utils/sphere.js');
const { dryGround } = await imp('world/terrain.js');
const { H, game, step } = await boot('witch', { wake: false });
const P = H.player, D = H.Dungeons, R = H.CaveRewards, Q = H.CavePuzzles;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);
H.inventory.add('copperPick', 4); H.Hotbar.selected = 0;

const now = () => D.inside;
const put = (x, z) => { now().x = x; now().z = z; D.placeHero(); P.vel.set(0, 0, 0); step(0.15); };
const prompt = () => currentInteraction()?.label ?? null;
const byId = L => new Map(L.rooms.map(r => [r.id, r]));
/** Stand `d` metres from a piece along the line to its room's centre (negative: on its far side). */
const beside = (L, piece, d = 1.3) => {
  const r = byId(L).get(piece.room), dx = r.x - piece.x, dz = r.z - piece.z, len = Math.hypot(dx, dz) || 1;
  return [piece.x + (dx / len) * d, piece.z + (dz / len) * d];
};
const inRoom = room => ctx.enemies.filter(e => e.alive &&
  roomAt(now().layout, e.pos.x - now().built.root.position.x, e.pos.z - now().built.root.position.z) === room);
/** Fight everything this room holds, including anything a falling monster leaves behind (a split or a summon). */
const clearRoom = room => {
  let felled = 0;
  for (let round = 0; round < 8; round++) {
    const standing = inRoom(room); if (!standing.length) break;
    for (const e of standing) { damageEnemy(e, 1e9, { team: 'player' }); felled++; }
    step(0.6);
  }
  return felled;
};

const report = [];
for (const [index, key] of ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper'].entries()) {
  const cave = CAVES[key], planet = PLANETS[index];
  if (index) H.goToPlanet(index); step(0.6);
  P.invuln = 1e9;

  // ---- the mouth stands in the world, and E goes in ------------------------------------------------------------
  assert.ok(D.mouth?.parts, `${key}: the cave mouth stands in the world`);
  if (key === 'tidewhisper') assert.ok(dryGround(D.mouth.dir, CAVE.entrance.clearance, { high: true }),
    'the Tideglass mouth and its clearance stay dry at high tide');
  P.placeAt(D.mouth.dir); step(0.2);
  assert.equal(prompt(), `Enter ${cave.name}`, `${key}: E offers the way in`);
  currentInteraction().run(); step(1.2);
  assert.ok(D.inside, `${key}: the hero is inside ${cave.name}`);
  assert.equal(ctx.indoors, cave.name);
  const L = now().layout, E = caveEnding(L, cave), map = byId(L);
  assert.deepEqual(L, generateCave(cave, planet.seed), 'built from its own planet seed');

  // ---- the rooms hold this world's own monsters --------------------------------------------------------------
  const roster = caveMonsters(L, cave), veinCount = R.veins.length, chestCount = R.chests.length;
  assert.ok(roster.length, `${key}: its rooms hold monsters`);
  assert.ok(veinCount > 0 && chestCount > 0, `${key}: it holds ${veinCount} veins and ${chestCount} chests`);
  const first = roster[0].room, here = roster.filter(m => m.room === first);
  put(map.get(first).x, map.get(first).z);
  const standing = ctx.enemies.filter(e => e.alive && e.caveRoom === first);
  assert.equal(standing.length, here.length, `${key}: ${here.length} monsters came in with the room`);
  for (const e of standing) assert.ok(cave.roster.some(g => g.type === e.type), `${e.type} belongs to ${cave.id}'s roster`);
  assert.ok(!R.isCleared(first), 'and the room is not clear while they stand');
  assert.ok(clearRoom(first) >= here.length, 'they can be fought');
  assert.equal(inRoom(first).length, 0, `${key}: nothing is left standing in the room`);
  assert.ok(R.isCleared(first), `${key}: the room counts as cleared`);

  // ---- this world's own ore ------------------------------------------------------------------------------------
  const ore = CAVE_VEINS[cave.ore].drops[0][0];
  const vein = R.veins.find(v => !v.mined && v.room !== E.puzzle.room) ?? R.veins[0];
  put(...beside(L, vein, 1.4));
  assert.ok(new RegExp(`Mine the ${CAVE_VEINS[cave.ore].name.toLowerCase()}`).test(prompt() ?? ''),
    `${key}: E offers its own vein (got ${prompt()})`);
  const ores = ['gloomquartz', 'cinderquartz', 'rimequartz', 'tidequartz'];
  const oreBefore = Object.fromEntries(ores.map(id => [id, H.inventory.count(id)]));
  currentInteraction().run();
  for (let i = 0; i < 600 && R.job; i++) step(1 / 60);
  assert.ok(H.inventory.count(ore) > oreBefore[ore], `${key}: mining gives ${ore}`);
  // The hero may still be carrying an earlier world's gem; what this cave hands out must only ever be its own.
  for (const other of ores) if (other !== ore)
    assert.equal(H.inventory.count(other), oreBefore[other], `${key}: mining here yields no ${other}`);

  // ---- a save in the middle of the cave changes nothing ---------------------------------------------------------
  const midRoom = now().room, midOre = H.inventory.count(ore);
  assert.ok(game.saves.save().ok, `${key}: saved underground`);
  assert.ok(game.saves.continue(), 'and continued');
  step(1);
  assert.ok(D.inside && now().room === midRoom, `${key}: Continue resumed in the same room`);
  assert.equal(H.inventory.count(ore), midOre, 'with the same haul');
  assert.ok(R.isCleared(first), 'the cleared room stayed cleared');
  assert.ok(R.mined.has(vein.id), 'and the worked-out vein stayed worked out');

  // ---- this world's own puzzle, and the ward -------------------------------------------------------------------
  assert.equal(Q.ending.puzzle.kind, cave.puzzle, `${key}: it sets the ${cave.puzzle} puzzle`);
  assert.ok(!Q.door.open && ctx.room.blockers.length === 1, 'the ward is up');
  if (cave.puzzle === 'lanterns') {
    for (const sw of Q.switches) {
      put(...beside(L, { ...sw, room: Q.ending.puzzle.room }, -1.0));
      assert.equal(prompt(), 'Light the lantern', `${key}: E offers ${sw.id}`);
      currentInteraction().run(); step(0.2);
    }
  } else {
    for (const st of Q.stones) {
      const plate = Q.plates.find(p => Math.abs(p.x - st.x) < 1e-6);
      put(st.root.position.x, st.root.position.z + 1.05);
      H.keys.KeyW = true;
      for (let i = 0; i < 900 && !plate.pressed; i++) step(1 / 60);
      H.keys.KeyW = false; step(0.2);
      assert.ok(plate.pressed, `${key}: a real push put ${st.id} on its plate`);
    }
  }
  assert.ok(Q.solved, `${key}: the puzzle is solved`);
  put(...beside(L, Q.keyChest, 1.4));
  assert.ok(/Open the/.test(prompt() ?? ''), `${key}: the key chest gives (got ${prompt()})`);
  currentInteraction().run(); step(0.3);
  assert.equal(H.inventory.count('wardenKey'), 1, `${key}: the Warden's Key is in the bag`);
  put(...beside(L, Q.door, 1.5));
  currentInteraction().run(); step(0.3);
  assert.ok(Q.door.open && ctx.room.blockers.length === 0, `${key}: the ward is down`);
  assert.equal(H.inventory.count('wardenKey'), 0, 'and the key was spent');

  // ---- the warden, its purse and the way home -------------------------------------------------------------------
  const end = map.get(L.end);
  put(end.x, end.z + 2);
  assert.ok(Q.guardian?.alive, `${key}: the warden wakes`);
  assert.equal(Q.guardian.type, cave.guardian, `${key}: it is a ${cave.guardian}`);
  assert.ok(Q.guardian.def.hp > COMBAT.enemies[cave.guardian].hp, 'made tougher than its ordinary kind');
  const keepsake = cave.guardianExtra[0][0], hadKeepsake = H.inventory.count(keepsake), coins = P.coins;
  const sigil = planet.boss?.summon?.sigils?.item ?? null, hadSigil = sigil ? H.inventory.count(sigil) : 0;
  damageEnemy(Q.guardian, 1e9, { team: 'player' }); step(0.8);
  // A warden is made elite by the same helper the planet's elites are, but it is not one of them: it must not hand
  // out a boss-summon sigil, or a cave would be a way around the lair's own conditions.
  if (sigil) assert.equal(H.inventory.count(sigil), hadSigil, `${key}: the warden carries no ${sigil}`);
  assert.ok(H.inventory.count(keepsake) >= hadKeepsake + cave.guardianExtra[0][1], `${key}: its purse holds ${keepsake}`);
  assert.ok(P.coins > coins, 'and coins');
  assert.equal(ctx.worldItems.length, 0, `nothing left on the cave floor (${ctx.worldItems.map(w => `${w.itemId}x${w.quantity}`).join(', ')})`);
  assert.ok(Q.shortcut.open, `${key}: the way home opens`);
  put(...beside(L, Q.shortcut, 1.2));
  assert.equal(prompt(), 'Take the way back');
  currentInteraction().run(); step(0.4);
  assert.equal(now().room, L.entrance, `${key}: the way home ends at the mouth`);

  // ---- and out ---------------------------------------------------------------------------------------------------
  put(L.mouth.x, L.mouth.z - 1);
  assert.equal(prompt(), 'Leave the cave');
  currentInteraction().run(); step(1.2);
  assert.equal(D.inside, null, `${key}: back on the surface`);
  assert.ok(arcDist(P.up, D.mouth.dir) < 1.5, 'standing at its mouth');
  assert.equal(H.LocalLights.darkness, 0, 'in daylight again');
  report.push(`${key}: ${L.rooms.length} rooms, ${roster.length} monsters, ${veinCount} ${ore} veins, ${chestCount} chests, ${cave.puzzle} puzzle, ${cave.guardian} warden`);
  pass(`${key}: mouth to warden to the way home, with a save and Continue in the middle`);
}

// ---- each world kept its own cave ----------------------------------------------------------------------------------
// `planets` holds each world's state as it was left; the one being stood on has to be captured first.
game.saves.registry.capturePlanet(ctx.planetId);
for (const key of ['lanternmoss', 'emberfall', 'frostveil', 'tidewhisper']) {
  const snap = game.saves.registry.planets[key];
  assert.ok(snap, `${key} has a captured record`);
  assert.equal(snap.caves.cave, CAVES[key].id, `${key}'s rewards record is its own cave`);
  assert.equal(snap.cavePuzzles.cave, CAVES[key].id, "and so is its ending's");
  assert.ok(snap.cavePuzzles.beaten.length, `${key}: its warden stays beaten`);
  assert.ok(snap.caves.mined.every(id => id.startsWith(`${CAVES[key].id}:`)), 'with no other cave in its rows');
}
pass('all four worlds kept their own cave, their own ore and their own warden');
console.log(report.join('\n'));
console.log('all passed');
