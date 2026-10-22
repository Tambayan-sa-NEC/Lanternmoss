import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// No browser stubs: the rules and the registry that holds them must load without a window, a scene or settings.
const duskhollow = (await import('../src/config/planets/duskhollow.js')).default;
const { LANTERN } = await import('../src/config/lantern.js');
const { DAY } = await import('../src/config/day.js');
const { canopyCover, canopyLayout, duskAt, lantern, activeLantern } = await import('../src/world/mechanics/lantern.js');
const { mechanicDefinition, cleanMechanicSnapshot } = await import('../src/world/mechanics/index.js');
const { setTerrain, bakeTerrain, groundHeight } = await import('../src/world/terrain.js');
const { offsetDir } = await import('../src/utils/sphere.js');

const spawn = new THREE.Vector3(0, 1, 0);
const layout = canopyLayout(duskhollow.canopy, spawn);
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

/** A stand-in world and hero: the mechanic only reads where the hero stands and whether they are indoors. */
function env({ clock = 0, indoors = false, at = spawn } = {}) {
  const e = { clock: () => e.now, now: clock, indoors, planet: duskhollow, world: { spawnDir: spawn },
    player: { up: at.clone(), fwd: new THREE.Vector3(1, 0, 0), grounded: true, swimming: false, body: new THREE.Group() } };
  return e;
}

test('the day clock still turns under the canopy, as brighter and dimmer dusk', () => {
  const D = LANTERN.dusk;
  near(duskAt(0.5 * DAY.length).level, D.day); near(duskAt(0).level, D.night);
  assert.equal(duskAt(0).label, 'Deep dusk'); assert.equal(duskAt(0.5 * DAY.length).label, 'Pale dusk');
  for (let s = 0; s < DAY.length; s += 0.5) {
    const d = duskAt(s);
    assert.ok(d.level >= D.day - 1e-9 && d.level <= D.night + 1e-9, `dusk out of range at ${s}`);
    near(d.level, duskAt(s + DAY.length * 1000).level, 1e-9);                       // periodic, never a cave and never daylight
  }
  assert.ok(D.day > 0 && D.night < 1, 'dusk is never full daylight and never pitch dark');
  assert.equal(mechanicDefinition('lantern'), lantern); assert.equal(duskhollow.released, false);
});

test('the canopy is closed except over the authored gaps and the village', () => {
  near(canopyCover(spawn, layout), LANTERN.canopy.villageCover);
  for (const gap of layout.gaps) near(canopyCover(gap.dir, layout), LANTERN.canopy.gapCover);
  const closed = offsetDir(spawn, 1.75, 160);
  near(canopyCover(closed, layout), LANTERN.canopy.cover);
  let last = 0;                                                                     // cover grows back smoothly out of the village gap
  for (let m = 0; m <= 60; m += 2) {
    const cover = canopyCover(offsetDir(spawn, 0, m), layout);
    assert.ok(cover >= last - 1e-9 && cover <= LANTERN.canopy.cover, `cover ${cover} at ${m} m`);
    last = cover;
  }
  assert.ok(canopyCover(spawn, layout) * duskAt(0).level < duskAt(0).level * 0.3, 'the village stays safe light at midnight');
});

test('deep valleys: the terrain is tall enough to hollow out and identical for the same seed', () => {
  const sample = () => { setTerrain(duskhollow.terrain, duskhollow.seed); bakeTerrain();
    return Array.from({ length: 240 }, (_, i) => groundHeight(offsetDir(spawn, i * 2.399963, Math.acos(1 - 2 * (i + 0.5) / 240) * 72))); };
  const heights = sample();
  const lo = Math.min(...heights), hi = Math.max(...heights);
  assert.ok(hi - lo > 12, `valleys must be deep (got ${(hi - lo).toFixed(1)} m)`);
  assert.deepEqual(sample(), heights, 'the same seed must rebuild the same valleys');
  setTerrain(null, 0);
});

test('the saved fields are bounded, cleaned and defaulted', () => {
  const dark = { lamps: [], wells: [], flame: 0 };
  assert.deepEqual(lantern.clean(undefined), { oil: LANTERN.oil.start, ...dark });
  assert.deepEqual(lantern.clean({ oil: -5 }), { oil: 0, ...dark });
  assert.deepEqual(lantern.clean({ oil: 1e9 }), { oil: LANTERN.oil.max, ...dark });
  assert.deepEqual(lantern.clean({ oil: 'full', junk: true }), { oil: LANTERN.oil.start, ...dark });
  assert.deepEqual(lantern.clean({ oil: NaN }), { oil: LANTERN.oil.start, ...dark });
  const saved = cleanMechanicSnapshot({ id: 'lantern', state: { oil: 12, injected: true }, at: 40 }, 'lantern');
  assert.deepEqual(saved.state, { oil: 12, ...dark }); assert.equal(saved.at, 40);
  assert.equal(cleanMechanicSnapshot({ id: 'lantern', state: {}, at: 0 }, 'tides'), null);
});

test('the lantern burns only while you play this world outdoors, and empty is safe', () => {
  const e = env({ clock: 0 }), m = lantern.create(e);
  m.load({ oil: 10 }); m.enter();
  assert.equal(activeLantern(), m);
  m.update(1); near(m.status.oil, 10 - LANTERN.oil.burn);
  const afterPlay = m.status.oil;
  e.now += DAY.length * 3; m.advance(DAY.length * 3, { reason: 'sleep' });          // a night's sleep never empties the tank
  near(m.status.oil, afterPlay);
  e.indoors = true; m.update(5); near(m.status.oil, afterPlay); e.indoors = false;
  assert.equal(m.refill(1e6), LANTERN.oil.max - afterPlay); near(m.status.oil, LANTERN.oil.max);
  assert.equal(m.refill(-3), 0); assert.equal(m.refill(NaN), 0);
  assert.equal(m.burn(1e6), LANTERN.oil.max); near(m.status.oil, 0);
  const out = m.status;
  assert.equal(out.lit, false); assert.ok(out.radius >= LANTERN.light.emberRadius * 0.9 && out.radius < LANTERN.light.radius, 'empty shrinks to an ember');
  m.update(10); near(m.status.oil, 0, 1e-9);                                        // it never goes below empty and never hurts
  assert.ok(m.status.darkness > 0 && m.status.darkness < 1);
  m.exit(); assert.equal(activeLantern(), null);
});

test('darkness follows the canopy and a house is safe light', () => {
  const closed = offsetDir(spawn, 1.75, 160);
  const e = env({ clock: 0, at: closed }), m = lantern.create(e);
  m.load(null); m.enter(); m.update(1 / 60);
  const deep = m.status.darkness;
  near(deep, canopyCover(closed, layout) * duskAt(e.now).level);
  e.player.up.copy(spawn); m.update(1 / 60);
  assert.ok(m.status.darkness < deep * 0.5, 'the village gap is far brighter than the deep hollow');
  assert.equal(m.status.label, 'Village light');
  e.indoors = true; m.update(1 / 60);
  assert.equal(m.status.darkness, 0);
  m.exit();
});

