import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './lib/setup.mjs';
import { imp } from './lib/boot.mjs';
import { installMechanicFixture } from './lib/mechanicFixture.mjs';

const fixture = installMechanicFixture(), { PLANETS } = await imp('config/planets.js');
const previous = PLANETS.map(p => p.mechanic);
for (const p of PLANETS) p.mechanic = fixture.id;
const { Game } = await imp('core/Game.js'), { ctx } = await imp('core/context.js');
const { CharacterSelect } = await imp('ui/CharacterSelect.js'), { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js'), { gameEvents } = await imp('core/events.js');
const { Houses, houseDef } = await imp('gameplay/Houses.js'), { parseSave, SAVE_KEY } = await imp('core/save.js');
const game = new Game(); game.init(); const H = game.debugHandle();
const step = seconds => { for (let i = 0; i < Math.round(seconds * 60); i++) game.update(1 / 60); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const state = () => H.Mechanics.toJSON().state;
const instance = () => H.Mechanics.active.instance;
const originalPopulate = game.planets.populate;
game.planets.populate = function () {
  fixture.records.push(['populate', ctx.planetId, state().marker, state().away]);
  return originalPopulate.call(this);
};
const travel = id => { H.player.placeAt(H.Portals.gate.dir); assert.ok(H.Portals.travel(id)); step(2); assert.equal(ctx.planetId, id); };

try {
  const titleClock = dayClock.toJSON(); step(0.2);
  assert.deepEqual(dayClock.toJSON(), titleClock); assert.equal(instance().updates, 0);
  CharacterSelect.pick('witch'); game.beginGame(); H.Tutorial.skip(); H.player.invuln = 10000;
  step(0.5); near(state().elapsed, 0.5);
  const paused = H.Mechanics.toJSON(); ctx.paused = true; step(0.5);
  assert.deepEqual(H.Mechanics.toJSON(), paused); ctx.paused = false;
  assert.equal(instance().env.player, H.player); assert.equal(instance().env.started, true);
  const beforeWeather = state(); H.setWeather('rain'); assert.deepEqual(state(), beforeWeather);
  assert.equal(instance().env.world.weather, H.weather);
  const updates = instance().updates; dayClock.skip(20, 'nap'); step(0.1);
  near(state().elapsed, 20.6); near(state().skipped, 20); assert.equal(instance().updates - updates, 6);
  console.log('PASS  world-ready entry, live environment, frozen title/pause, separate weather and one bounded skip without replaying frames');

  instance().setMarker(111); assert.ok(H.saves.save().ok);
  const expected = H.Mechanics.toJSON(); assert.ok(H.saves.continue());
  assert.deepEqual(H.Mechanics.toJSON(), expected); assert.equal(fixture.live.size, 1);
  const restored = fixture.records.filter(r => r[0] === 'populate').at(-1);
  assert.equal(restored[2], 111, 'Continue state exists before actor/resource population');
  H.inventory.add('wayfarerKey', 4);
  const first = instance(); travel('emberfall'); assert.equal(state().marker, 0);
  instance().setMarker(222); step(0.25); gameEvents.dispatchEvent(new Event('mechanicfixturepoke'));
  assert.equal(state().marker, 223); assert.equal(first.toJSON().marker, 111, 'departed instance has no live listener');
  travel('lanternmoss'); assert.equal(state().marker, 111); assert.ok(state().away > 0);
  assert.ok(H.saves.registry.planets.lanternmoss.mechanics.state.away > 0, 'post-population restoration did not erase catch-up');
  assert.equal(H.saves.registry.planets.emberfall.mechanics.state.marker, 223);
  assert.equal(fixture.live.size, 1);
  assert.equal(fixture.records.filter(r => r[0] === 'load').length, fixture.instances.length, 'each new instance loads once');
  const lastEnter = fixture.records.filter(r => r[0] === 'enter').at(-1), lastPopulate = fixture.records.filter(r => r[0] === 'populate').at(-1);
  assert.deepEqual(lastPopulate.slice(1), lastEnter.slice(1));
  console.log('PASS  Continue loads before population; real keyed travel isolates state, restores away time once and disposes previous listeners');

  Houses.goInside(1, houseDef(1));
  const toNoon = (DAY.length * 0.4 - dayClock.t + DAY.length) % DAY.length;
  dayClock.skip(toNoon, 'testSetup');
  const beforeNap = state().skipped; Houses.rest(); step(1); near(state().skipped - beforeNap, 20);
  const toNight = (DAY.length * 0.9 - dayClock.t + DAY.length) % DAY.length;
  dayClock.skip(toNight, 'testSetup'); const beforeSleep = state().skipped;
  Houses.rest(); step(1); assert.ok(state().skipped > beforeSleep); assert.equal(dayClock.phase, 'morning');
  assert.equal(fixture.records.filter(r => r[0] === 'advance' && r[2] === 'sleep').length, 1);
  assert.equal(fixture.live.size, 1); assert.ok(H.Mechanics.active.instance.env.indoors);
  console.log('PASS  actual indoor nap/night sleep notify the active mechanic once while preserving its lifecycle');

  const legacy = parseSave(readFileSync(new URL('../fixtures/save-v1.json', import.meta.url), 'utf8'));
  assert.ok(legacy.ok); assert.ok(H.saves.restore(legacy.data));
  assert.equal(ctx.planetId, 'emberfall'); assert.deepEqual(state(), { elapsed: 0, skipped: 0, away: 0, marker: 0 });
  assert.equal(fixture.live.size, 1);
  assert.ok(H.saves.save().ok); const data = JSON.parse(localStorage.getItem(SAVE_KEY));
  assert.equal(data.planets.emberfall.mechanics.id, fixture.id);
  assert.deepEqual(data.planets.emberfall.mechanics.state, state());
  PLANETS[2].mechanic = 'unregisteredModule'; H.inventory.add('wayfarerKey', 2); H.player.placeAt(H.Portals.gate.dir);
  assert.equal(H.Portals.destinations().find(p => p.id === 'frostveil').enabled, false);
  assert.equal(H.Portals.travel('frostveil'), false); assert.throws(() => game.planets.load('frostveil'), /Unknown planet mechanic/);
  assert.equal(ctx.planetId, 'emberfall'); assert.equal(fixture.live.size, 1);
  PLANETS[2].mechanic = fixture.id;
  const last = instance(), exit = last.exit;
  last.exit = () => { assert.ok(game.world.objects.length > 0, 'mechanic exits before world assets are disposed'); exit(); };
  game.world.dispose(); assert.equal(fixture.live.size, 0); assert.equal(H.Mechanics.id, null);
  const marker = last.toJSON().marker; gameEvents.dispatchEvent(new Event('mechanicfixturepoke')); dayClock.skip(3, 'sleep');
  assert.equal(last.toJSON().marker, marker);
  console.log('PASS  optional v1 defaults, validated per-planet saves, missing-module travel refusals and exit before world disposal');
  console.log('all passed');
} finally {
  H.Mechanics.exit(); PLANETS.forEach((p, i) => { p.mechanic = previous[i]; }); fixture.unregister();
}
