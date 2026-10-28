import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// The Old Road's rules (TODO 30d) are part of Duskhollow's lantern mechanic, so they load without a browser,
// a scene or settings, exactly as the dusk and the Oil bar do.
const duskhollow = (await import('../src/config/planets/duskhollow.js')).default;
const { OLD_ROAD } = await import('../src/config/oldRoad.js');
const { DUSK_NPCS, DUSK_HOUSES } = await import('../src/config/duskVillage.js');
const { QUESTS } = await import('../src/config/quests.js');
const { HOUSES, resolveHouse } = await import('../src/config/houses.js');
const { lantern, WELL_COUNT } = await import('../src/world/mechanics/lantern.js');

const spawn = new THREE.Vector3(0, 1, 0);
const WELLS = OLD_ROAD.branches.gaps.length;

/** A stand-in world and hero: the road's rules only read whether the hero is indoors. */
function road({ indoors = false } = {}) {
  const e = { clock: () => e.now, now: 0, indoors, planet: duskhollow, world: { spawnDir: spawn },
    player: { up: spawn.clone(), fwd: new THREE.Vector3(1, 0, 0), grounded: true, swimming: false } };
  const m = lantern.create(e); m.load(null); m.enter();
  return { e, m };
}

test('what is alight on the road is saved, bounded and cleaned like the oil beside it', () => {
  const clean = lantern.clean({ oil: 50, lamps: [2, 2, 0, -1, 1.5, OLD_ROAD.branches.maxLamps, 'x'], wells: [WELLS, 1, 1], flame: 1e9 });
  assert.deepEqual(clean.lamps, [0, 2], 'whole lamp indices inside the authored road, each one once, in order');
  assert.deepEqual(clean.wells, [1], 'a moonwell the road does not have cannot be saved as lit');
  assert.equal(clean.flame, OLD_ROAD.flame.seconds, 'a carried flame is never longer than a fresh one');
  assert.deepEqual(lantern.clean({ oil: 1, lamps: 'all', wells: null, flame: NaN }), { oil: 1, lamps: [], wells: [], flame: 0 });
  assert.equal(WELL_COUNT, WELLS);
});

test('the village flame lights a waylamp, and each lit lamp hands out fire again', () => {
  const { m } = road();
  assert.equal(m.road.carrying, false);
  assert.equal(m.lightLamp(0), false, 'no flame, no light');
  assert.equal(m.lightWell(0), false);

  m.takeFlame();
  assert.equal(m.road.flame, OLD_ROAD.flame.seconds);
  m.update(20); assert.equal(Math.round(m.road.flame), OLD_ROAD.flame.seconds - 20);

  assert.equal(m.lightLamp(0), true);
  assert.equal(m.road.flame, OLD_ROAD.flame.seconds, 'lighting a lamp is a relay: the carried flame is full again');
  assert.equal(m.lightLamp(0), false, 'a lamp already lit is not lit twice');
  assert.deepEqual(m.road.lamps, [0]);
  assert.equal(m.lightLamp(OLD_ROAD.branches.maxLamps), false, 'no lamp beyond the authored road');
  assert.equal(m.lightLamp(1.5), false);
});

test('a flame that runs dry only goes out: nothing is lost but the walk back to the last lit lamp', () => {
  const { m } = road();
  m.takeFlame(); m.lightLamp(0); m.lightLamp(1);
  const oil = m.status.oil;
  m.update(OLD_ROAD.flame.seconds + 5);
  assert.equal(m.road.flame, 0, 'the flame gutters out');
  assert.equal(m.road.carrying, false);
  assert.deepEqual(m.road.lamps, [0, 1], 'the lamps already lit stay lit');
  assert.ok(m.status.oil < oil, 'only the belt lantern kept burning');
  assert.equal(m.lightLamp(2), false, 'without fire the next lamp stays dark');
  m.takeFlame();                                                  // taken again at the last lit waylamp
  assert.equal(m.lightLamp(2), true);
});

test('the flame burns by the lantern\'s own rule: never indoors, never over skipped or away time', () => {
  const { e, m } = road();
  m.takeFlame(); m.update(10);
  const left = m.road.flame;
  m.advance(10_000, { reason: 'sleep' });
  assert.equal(m.road.flame, left, 'sleeping through a night cannot burn the flame away');
  e.indoors = 'house';
  m.update(30);
  assert.equal(m.road.flame, left, 'indoors nothing burns');
  e.indoors = false;
  m.update(5); assert.ok(m.road.flame < left);
});

test('the three moonwells need fire, count once, and survive the saved round trip', () => {
  const { m } = road();
  m.takeFlame();
  for (let i = 0; i < WELLS; i++) assert.equal(m.lightWell(i), true);
  assert.equal(m.lightWell(0), false, 'a moonwell already burning is not counted twice');
  assert.equal(m.lightWell(WELLS), false, 'there is no fourth moonwell');
  assert.equal(m.wellsLit, WELLS);

  const saved = m.toJSON();
  const { m: other } = road();
  other.load(saved);
  assert.equal(other.wellsLit, WELLS, 'Continue and portal travel find the road exactly as it was left');
  assert.deepEqual(other.road.wells, [...Array(WELLS).keys()]);
  assert.ok(other.road.carrying, 'a flame still in hand is carried across a save');
});

test("Wick, his stalk and the road's quest gate Umbra at level 11", () => {
  assert.equal(duskhollow.npcs, DUSK_NPCS);
  const wick = DUSK_NPCS.locals.find(n => n.name === 'Wick');
  assert.ok(wick, 'Duskhollow has its lamplighter');
  assert.ok(Object.values(wick.schedule).every(place => place === 'home' || wick.places[place]), 'his day only names real places');
  assert.ok(wick.lines.some(l => /Umbra/.test(l.t)), 'he tips the hero off about Umbra');

  const quest = QUESTS.oldRoad;
  assert.equal(quest.giver, 'Wick'); assert.equal(quest.planet, 'duskhollow');
  const light = quest.steps.find(s => s.kind === 'light');
  assert.equal(light.count, WELLS, 'the quest asks for every moonwell the road has');
  assert.equal(quest.steps.at(-1).to, 'Wick', 'and sends the hero back to him');

  // the gate itself: level 11 and this quest. The sealed lair's wording is checked in the simulation, which has a
  // browser to draw it with (tests/sim/oldRoad.sim.mjs).
  assert.deepEqual(duskhollow.boss.summon, { level: 11, quest: 'oldRoad' });
  assert.ok(QUESTS[duskhollow.boss.summon.quest], 'the gate names a quest that exists');
});

test('the stalk houses are real houses with a stalk inside, and no other world gets one', () => {
  assert.equal(duskhollow.houses, DUSK_HOUSES);
  const inside = Object.entries(DUSK_HOUSES).filter(([, def]) => def);
  assert.ok(inside.length >= 2, 'at least Wick\'s stalk and a traveller\'s');
  for (const [index, def] of inside) {
    assert.ok(HOUSES[index], `house ${index} exists to be furnished`);
    assert.equal(def.dusk, true, `house ${index} is built into a stalk`);
    // resolveHouse() only answers for a released world, so merge the override the way it would once Duskhollow is
    const merged = { ...HOUSES[index], ...def };
    assert.ok(merged.props.length && merged.name, 'the planet override merges into a complete house');
    assert.ok(merged.note || merged.resident, 'somebody is home, or has left word');
  }
  assert.equal(resolveHouse(Number(inside[0][0]), 'lanternmoss').dusk, undefined, 'the stalk interior is Duskhollow\'s alone');
});
