import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boot, imp } from './lib/boot.mjs';
import { planetLayout } from './lib/planetLayout.mjs';

const { game, H } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { PLANET_CATALOG, PLANETS } = await imp('config/planets.js');
const { createLocalDefs, createNpcDefs } = await imp('entities/npc/npcDefs.js');
const { houseDef } = await imp('gameplay/Houses.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { TRANSITION } = await imp('config/planets.js');
const baseline = JSON.parse(readFileSync(new URL('../fixtures/planet-layout-v1.json', import.meta.url), 'utf8'));

// The v1 fixture records the original three worlds; Tidewhisper has its own release checks.
for (let i = 0; i < 3; i++) {
  H.goToPlanet(i);
  assert.deepEqual(planetLayout(game, H, ctx), baseline.worlds[H.planetId], `${H.planetId}: original ids and positions`);
  const locals = H.npcs.filter(n => n.def.local);
  assert.deepEqual(locals.map(n => n.name), PLANETS[i].npcs.locals.map(n => n.name));
  for (const n of locals) assert.equal(houseDef(n.def.home).owner, n.name);
  const oldLines = createNpcDefs(game.world);
  // Both historical arrivals retain their slots, including when traveling to an unrelated world.
  for (const def of oldLines) {
    const ember = def.lines.findIndex(l => l.t === PLANETS[1].npcs.arrivals[def.name].t);
    const frost = def.lines.findIndex(l => l.t === PLANETS[2].npcs.arrivals[def.name].t);
    assert.deepEqual([ember, frost], baseline.arrivalSlots[def.name], 'absolute historical dialogue slots');
    assert.equal(def.lines[ember].when({ planetId: 'emberfall' }), true);
    assert.equal(def.lines[ember].when({ planetId: 'frostveil' }), false);
  }
}
console.log('PASS  all three seeded layouts match pre-extraction fixtures, with local homes and historical arrival slots');

// Reordering data does not change a local's home: it is configured explicitly rather than index % 3.
const reordered = createLocalDefs(game.world, 0, [PLANETS[1], PLANETS[2], PLANETS[0]]);
assert.equal(reordered[0].name, 'Cinder'); assert.equal(reordered[0].places.home.dir, game.world.houses[4].door);
const future = { ...PLANETS[1], id: 'futureWorld', npcs: { locals: [{ ...PLANETS[1].npcs.locals[0], name: 'A new keeper', home: 3 }] } };
const generated = createLocalDefs(game.world, 'futureWorld', [future]);
assert.equal(generated[0].name, 'A new keeper'); assert.equal(generated[0].places.home.dir, game.world.houses[3].door);
console.log('PASS  local builders follow data for reordered and newly named planets');

const before = { state: game.planets.state, planet: ctx.planetId, keys: H.inventory.count('wayfarerKey'), snapshots: H.saves.registry.planets };
H.inventory.add('wayfarerKey', 5); H.player.placeAt(H.Portals.gate.dir);
assert.ok(H.Portals.canUse(), 'refusals exercise an otherwise usable gate');
for (const p of PLANET_CATALOG.filter(p => !p.released)) {
  assert.equal(H.Portals.travel(p.id), false);
  assert.equal(game.planets.travelTo(p.id), false);
  assert.throws(() => game.planets.load(p.id), /unreleased/);
}
assert.equal(ctx.planetId, before.planet); assert.equal(game.planets.state, before.state);
assert.equal(H.inventory.count('wayfarerKey'), before.keys + 5);
assert.equal(H.saves.registry.planets, before.snapshots);
// Exercise the actual travel/load guards with a released, explicitly locked secret fixture.
const secret = { ...PLANETS[2], id: 'secretHarness', act: 2, secret: true, unlock: null };
PLANETS.push(secret); PLANET_CATALOG.push(secret);
try {
  assert.equal(H.Portals.destinations().find(p => p.id === secret.id).enabled, false);
  assert.equal(H.Portals.travel(secret.id), false); assert.equal(game.planets.travelTo(secret.id), false);
  assert.throws(() => game.planets.load(secret.id), /secret planet is locked/);
  assert.equal(ctx.planetId, before.planet); assert.equal(H.inventory.count('wayfarerKey'), before.keys + 5);
} finally { PLANETS.pop(); PLANET_CATALOG.pop(); }
assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); assert.equal(ctx.planetId, before.planet);
game.planets.defeated = new Set(PLANETS.map(p => p.id)); assert.equal(game.planets.complete, true);
game.planets.defeated.delete('emberfall'); assert.equal(game.planets.complete, false);
console.log('PASS  unfinished worlds refuse portal/direct travel without spending keys or changing state; Continue and campaign completion remain valid');

// A gate accepted at night must not fail if dawn falls during the fade. Only this trip gets permission.
const timedSecret = { ...secret, unlock: { bosses: ['frostveil'], night: true } };
const previousClock = dayClock.toJSON(), hooks = ['beforeLoad', 'afterLoad', 'onSave'];
const previousHooks = Object.fromEntries(hooks.map(key => [key, game.planets[key]]));
// The synthetic id was added after the real save validator initialized; isolate this development-only world.
PLANETS.push(timedSecret); PLANET_CATALOG.push(timedSecret);
for (const key of hooks) game.planets[key] = null;
try {
  dayClock.t = DAY.length - 0.01;
  assert.equal(game.planets.travelTo(timedSecret.id), true);
  dayClock.t = 0;
  assert.equal(game.planets.canTravelTo(timedSecret.id), false);
  game.planets.update(TRANSITION.fadeTime);
  assert.equal(ctx.planetId, timedSecret.id, 'departure authorization survives dawn');
  assert.equal(H.Portals.destinations().find(p => p.current).name, timedSecret.name, 'current secret stays recognizable');
  game.planets.update(TRANSITION.fadeTime);
  assert.throws(() => game.planets.load(timedSecret.id), /secret planet is locked/, 'authorization was consumed');
  game.planets.load('frostveil');
} finally {
  PLANETS.pop(); PLANET_CATALOG.pop(); dayClock.load(previousClock); Object.assign(game.planets, previousHooks);
  delete H.saves.registry.planets[timedSecret.id];
}
console.log('PASS  authorized secret travel survives a day change during fade and cannot authorize another load');
console.log('all passed');
