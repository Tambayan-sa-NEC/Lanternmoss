// TODO 30d (Wick and the Old Road): the real world builds the brazier, its waylamps and its three moonwells under
// the authored gaps of starlight; Wick lives in his stalk and offers "Light the Old Road"; the village flame is
// taken and carried through the real E interaction; a flame that runs dry costs only the walk back to the last lit
// waylamp; the relit road, the quest and the lit lamps survive Continue and portal travel; and the moonwells plus
// level 11 are what seal and unseal Umbra's lair.
import assert from 'node:assert/strict';
import { installDuskVillageFixture } from './lib/duskVillageFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskVillageFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { OLD_ROAD } = await imp('config/oldRoad.js');
const { LANTERN } = await imp('config/lantern.js');
const { Houses, currentInteraction } = await imp('gameplay/Houses.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { Dialog } = await imp('ui/Dialog.js');
const { BossGate, describeSummon } = await imp('gameplay/BossGate.js');
const { canopyCover } = await imp('world/mechanics/lantern.js');
const { arcDist } = await imp('utils/sphere.js');
const W = game.world, P = H.player, Road = H.OldRoad;
const lamp = () => H.Mechanics.active.instance;
const wick = () => ctx.npcs.find(n => n.name === 'Wick');
const pass = m => console.log(`PASS  ${m}`);
const phase = f => { dayClock.skip((f * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.1); };
/** Walks up to a road object and runs whatever E offers there, checking the prompt first. */
const useAt = (dir, expect, settle = 0.1) => {
  P.placeAt(dir); step(0.1);
  const target = currentInteraction();
  assert.ok(target, `something to do at ${expect}`);
  assert.match(target.label, expect);
  target.run(); step(settle);
  return target.label;
};

try {
  H.Tutorial.skip(); H.goToPlanet('lanternmoss'); P.invuln = 10000; phase(0.4);

  // ------------------------------------------------------------------ the road is built where the fiction says
  assert.equal(H.Mechanics.id, 'lantern');
  assert.ok(Road.brazier, 'the village flame burns in the village');
  assert.equal(Road.wells.length, OLD_ROAD.branches.gaps.length, 'one moonwell per authored gap of starlight');
  assert.ok(Road.lamps.length >= 6 && Road.lamps.length <= OLD_ROAD.branches.maxLamps, `waylamps are bounded (${Road.lamps.length})`);
  const village = canopyCover(W.spawnDir, W.canopy), brazier = canopyCover(Road.brazier.dir, W.canopy);
  assert.ok(brazier <= LANTERN.canopy.villageCover + 1e-6 && village <= LANTERN.canopy.villageCover + 1e-6,
    'the brazier stands in the village gap: its safe light, not the deep hollow');
  for (const well of Road.wells) {
    assert.ok(canopyCover(well.dir, W.canopy) < LANTERN.canopy.cover, 'every moonwell stands under open sky');
    assert.ok(arcDist(well.dir, W.spawnDir) > OLD_ROAD.branches.from, 'and out along the road, not in the square');
  }
  assert.ok(Road.lamps.every(l => !l.glass.visible), 'every waylamp starts dark');
  pass('the Old Road is built: a brazier in the village light, bounded waylamps, and a moonwell under each gap');

  // ------------------------------------------------------------------ Wick, his stalk and his quest
  assert.ok(wick(), 'Wick is in the village');
  assert.ok(wick().lanternGlow, 'with the lamplighter\'s swinging lantern');
  assert.equal(Quests.offerable(wick()), 'oldRoad');
  Quests.offerFor(wick()).choice.onYes();
  assert.equal(Quests.st('oldRoad').status, 'active');
  Quests.stepLineFor(wick()); step(0.1);
  assert.equal(Quests.st('oldRoad').step, 1, 'asking Wick where the road starts is the first step');
  assert.match(Quests.trackerInfo().text, /moonwell/i);
  assert.equal(Quests.trackerInfo().progress, `0/${Road.wells.length}`);

  const stalk = Number(Object.keys(game.planets.planet.houses).find(i => game.planets.planet.houses[i]?.owner === 'Wick'));
  useAt(W.houses[stalk].door, /Enter/, 1);
  assert.equal(Houses.inside.index, stalk);
  assert.equal(Houses.inside.def.name, "Wick's stalk");
  assert.ok(Houses.inside.room.spots.some(s => s.kind === 'chest') && Houses.inside.room.spots.some(s => s.kind === 'bookshelf'));
  const flameIndoors = lamp().road.flame;
  step(2); assert.equal(lamp().road.flame, flameIndoors, 'nothing burns indoors');
  Dialog.close(); Houses.leave(); step(1); assert.ok(!ctx.indoors);
  pass('Wick offers and tracks "Light the Old Road" from a stalk the hero can walk into');

  // ------------------------------------------------------------------ carrying the flame out along the road
  useAt(Road.brazier.dir, /Take the village flame/);
  assert.ok(lamp().road.carrying, 'the hero carries the village flame');
  const first = Road.lamps[0];
  useAt(first.dir, /Light the waylamp/);
  assert.ok(first.glass.visible && lamp().lampLit(first.index), 'the first waylamp is alight');
  assert.equal(Math.round(lamp().road.flame), OLD_ROAD.flame.seconds, 'lighting it hands out fire again');
  const second = Road.lamps.find(l => l.branch === first.branch && l.index !== first.index);
  useAt(second.dir, /Light the waylamp/);
  assert.equal(lamp().road.lampsLit, 2);

  // the flame runs dry on the way: nothing is lost but the walk back to the last lit lamp
  const third = Road.lamps.find(l => !lamp().lampLit(l.index));
  P.placeAt(third.dir); step(0.1);
  const hp = P.hp;
  step(OLD_ROAD.flame.seconds + 1);
  assert.equal(lamp().road.carrying, false, 'the carried flame gutters out');
  assert.equal(P.hp, hp, 'and costs the hero no health');
  assert.equal(lamp().road.lampsLit, 2, 'the lamps already lit stay lit');
  assert.equal(Road.target(), null, 'with no fire the road offers nothing out here');
  useAt(second.dir, /Take fire from the waylamp/);
  assert.ok(lamp().road.carrying, 'a lit waylamp is where the run starts again');
  useAt(third.dir, /Light the waylamp/);
  assert.equal(lamp().road.lampsLit, 3);
  pass('the village flame lights waylamps, relays from each one, and running dry only means walking back to the last');

  // ------------------------------------------------------------------ Continue and travel keep the road lit
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(0.2);
  assert.equal(lamp().road.lampsLit, 3, 'Continue restores the relit road');
  assert.ok(H.OldRoad.lamps.filter(l => l.glass.visible).length === 3, 'and shows it');
  assert.equal(Quests.st('oldRoad').step, 1);
  H.goToPlanet('emberfall'); step(0.2);
  assert.equal(H.OldRoad.lamps.length, 0, 'no other world has an Old Road');
  assert.equal(H.OldRoad.target(), null);
  assert.match(Quests.trackerInfo().text, /Return to/);
  H.goToPlanet('lanternmoss'); step(0.2);
  assert.equal(lamp().road.lampsLit, 3, 'portal travel brings the road back as it was left');
  assert.equal(H.OldRoad.lamps.filter(l => l.glass.visible).length, 3);
  pass('what is alight on the road survives Continue and portal travel, and belongs to this world alone');

  // ------------------------------------------------------------------ the three moonwells, and Umbra's gate
  const conditions = () => Object.fromEntries(BossGate.requirements().map(r => [r.kind, r.done]));
  P.level = 10;
  assert.deepEqual(conditions(), { level: false, quest: false }, 'Umbra sleeps behind level 11 and the quest');
  const lines = describeSummon(BossGate.summon);
  assert.ok(lines.some(t => /level 11/.test(t)) && lines.some(t => /Wick/.test(t)), `the lair says what is needed: ${lines.join(' / ')}`);

  const road = H.OldRoad;
  for (const well of road.wells) {
    if (!lamp().road.carrying) useAt(road.firePoints().at(-1).dir, /Take (the village flame|fire)/);
    useAt(well.dir, /Light the moonwell/);
    assert.ok(well.glass.visible);
  }
  assert.equal(lamp().wellsLit, road.wells.length);
  step(0.5);
  assert.equal(Quests.st('oldRoad').step, 2, 'the three wells tick the quest step off by themselves');
  const coins = P.coins;
  Quests.stepLineFor(wick()); step(0.1);
  assert.equal(Quests.st('oldRoad').status, 'done');
  assert.equal(P.coins, coins + 140);
  assert.equal(H.inventory.count('lumenOil'), 2);

  assert.deepEqual(conditions(), { level: false, quest: true }, 'the quest alone is not enough');
  assert.equal(BossGate.state, 'sealed');
  P.level = 11; step(0.2);
  assert.deepEqual(conditions(), { level: true, quest: true });
  assert.ok(BossGate.met); assert.equal(BossGate.state, 'ready');
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(0.2);
  assert.equal(lamp().wellsLit, 3, 'the moonwells stay lit');
  assert.equal(Quests.st('oldRoad').status, 'done');

  // ------------------------------------------------------------------ a road relit end to end stays within budget
  const lit = H.OldRoad.lamps.length;
  while (lamp().road.lampsLit < lit) {
    if (!lamp().road.carrying) lamp().takeFlame();
    for (const l of H.OldRoad.lamps) lamp().lightLamp(l.index);
  }
  H.OldRoad.sync(); lamp().dropFlame(); step(0.5);
  assert.equal(lamp().road.lampsLit, lit, `every waylamp is alight (${lit})`);
  assert.ok(H.OldRoad.lamps.every(l => l.glass.visible), 'and every lamp head glows');
  assert.ok(H.LocalLights.count <= 16, `light sources stay bounded with the whole road lit (${H.LocalLights.count})`);
  assert.ok(H.OldRoad.lampPool.filter(s => s.light.source.intensity > 0).length <= OLD_ROAD.lamp.sources,
    'only the nearest lit waylamps pool light on the ground');
  assert.ok(H.LocalLights.litPointLights() <= 4, 'and never more than four real point lights');
  pass(`a road relit end to end costs ${OLD_ROAD.lamp.sources} pooled lamp lights, not ${lit}`);
  pass('three relit moonwells finish Wick\'s quest and, with level 11, open the lair the boss sleeps in');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
