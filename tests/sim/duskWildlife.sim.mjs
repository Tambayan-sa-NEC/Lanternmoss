// TODO 30b (flora and wildlife): the canopy grows only where the dusk is at full strength, the small caps, ferns and
// moonflowers fill the rest, glow snails, lantern bats and crickets live their own schedules, firefly swarms light the
// dark and are caught with a real interaction for a jar of oil, the pools hold pale blind fish, and the Moonmoth gives
// its charm once per adventure and widens the lantern. Scenery and particle budgets stay bounded.
import assert from 'node:assert/strict';
import { installDuskhollowFixture } from './lib/duskhollowFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskhollowFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { FIREFLIES, LANTERN } = await imp('config/lantern.js');
const { RARE_CRITTERS } = await imp('config/critters.js');
const { underCanopy } = await imp('world/mechanics/lantern.js');
const { ponds } = await imp('world/terrain.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { useItemInSlot } = await imp('gameplay/itemUse.js');
const { equipFromSlot } = await imp('gameplay/equipment.js');
const { sparkles } = await imp('fx/sparkles.js');
const { setSetting } = await imp('core/settings.js');
const { arcDist } = await imp('utils/sphere.js');
const W = game.world, P = H.player, F = H.Fireflies;
const lamp = () => H.Mechanics.active.instance;
const pass = m => console.log(`PASS  ${m}`);
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const kinds = key => ctx.critters.filter(c => c.defKey === key);

try {
  H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

  // ---- the canopy and the plants under it -----------------------------------------------------------------------
  const caps = W.spots.trees.filter(t => t.kind === 'lumenCap'), small = W.spots.trees.filter(t => t.kind === 'glowcap');
  assert.ok(caps.length > 0 && caps.length <= W.planet.flora.canopy.caps, `giant caps bounded (${caps.length})`);
  assert.ok(small.length > 0 && small.length <= W.planet.flora.canopy.glowcaps, `glowcaps bounded (${small.length})`);
  assert.ok(caps.every(t => underCanopy(t.dir, W.canopy)), 'no giant cap grows over a gap of starlight or the village');
  assert.ok(small.some(t => !underCanopy(t.dir, W.canopy)), 'small caps still grow in the gaps');
  const before = W.spots.trees.map(t => [t.kind, ...t.dir.toArray()]);
  setSetting('quality', 'low'); step(0.2); setSetting('quality', 'high'); step(0.2);
  assert.deepEqual(W.spots.trees.map(t => [t.kind, ...t.dir.toArray()]), before, 'a quality change never resamples the scenery');
  pass(`the canopy is ${caps.length} giant caps, never over a gap, with ${small.length} glowcaps under and around it`);

  // ---- the animals -----------------------------------------------------------------------------------------------
  const snails = kinds('glowSnail'), bats = kinds('lanternBat'), crickets = kinds('duskCricket'), moths = kinds('moonmoth');
  assert.ok(snails.length && bats.length && crickets.length && moths.length === 1, 'every listed animal is here, with one Moonmoth');
  assert.ok(bats.every(b => b.hover > 0 && caps.concat(small).some(t => arcDist(t.dir, b.home) < 1.5)), 'the bats hang in the air under the caps');
  assert.ok(moths[0].hover > 0 && moths[0].wingbeat > 0, 'the Moonmoth flies');
  const snail = snails[0];
  P.placeAt(snail.up); step(0.6);
  assert.equal(snail.state, 'sit', 'a snail pulls into its shell when you come close');
  const bat = bats[0]; P.placeAt(bat.up); step(0.6);
  assert.equal(bat.state, 'flee', 'a lantern bat flutters off');
  step(4); assert.ok(bat.hover > 0, 'and stays in the air');
  const paleFish = ponds.flatMap(p => p.fish);
  assert.ok(paleFish.length > 0, 'the glowing pools hold their pale blind fish');
  pass(`${snails.length} glow snails, ${bats.length} lantern bats, ${crickets.length} crickets, ${paleFish.length} pale fish and one Moonmoth, each reacting in its own way`);

  // ---- firefly swarms: a real interaction, a jar of oil, and a bounded return ------------------------------------
  assert.equal(F.swarms.length, FIREFLIES.count); assert.equal(F.lit, FIREFLIES.count);
  const swarm = F.swarms[0];
  P.placeAt(swarm.up); step(0.3);
  const prompt = currentInteraction();
  assert.equal(prompt?.label, 'Catch the fireflies', `the E prompt offers the swarm (${prompt?.label})`);
  const jars = () => H.inventory.count(FIREFLIES.jar);
  prompt.run(); step(0.2);
  assert.equal(jars(), 1, 'catching gives one jar');
  assert.equal(F.lit, FIREFLIES.count - 1); assert.equal(swarm.light.source.intensity, 0, 'the caught swarm goes dark');
  assert.equal(F.target(), null, 'and cannot be caught again while it is away');
  lamp().burn(LANTERN.oil.max);
  const slot = H.inventory.find(FIREFLIES.jar);
  const used = useItemInSlot(H.inventory, slot);
  assert.ok(used.ok, used.message); near(lamp().status.oil, LANTERN.oil.refillStep, 1e-6);
  assert.equal(jars(), 0, 'the jar is spent');
  F.update(FIREFLIES.away + 1);
  assert.equal(F.lit, FIREFLIES.count, 'another swarm settles somewhere else once its time is up');
  pass(`real E catches a swarm for a jar that pours ${LANTERN.oil.refillStep} oil, and the swarm returns after ${FIREFLIES.away}s`);

  // ---- Continue cannot relight a caught swarm --------------------------------------------------------------------
  const again = F.swarms[1]; P.placeAt(again.up); step(0.3);
  assert.ok(F.target()); F.catchSwarm(again); step(0.2);
  const away = again.away, litAfter = F.lit;
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(0.3);
  assert.equal(H.Fireflies.lit, litAfter, 'Continue restores the caught swarm as caught');
  assert.ok(Math.abs(H.Fireflies.swarms.reduce((n, s) => n + s.away, 0) - away) < 2, 'with its waiting time intact');
  pass('a caught swarm stays caught through save and Continue, so reloading cannot farm jars');

  // ---- the Moonmoth: one charm per adventure, and a wider lantern -------------------------------------------------
  const moth = kinds('moonmoth')[0];
  P.placeAt(moth.up); P.vel.set(0, 0, 0); step(0.5);
  const befriend = currentInteraction();
  assert.match(befriend?.label ?? '', /Befriend the Moonmoth/, `the Moonmoth can be befriended (${befriend?.label})`);
  befriend.run(); step(0.3);
  assert.equal(H.inventory.count(LANTERN.charm.item), 1, 'it leaves its charm');
  assert.ok(moth.away > 0, 'and goes on its way');
  lamp().refill(LANTERN.oil.max);
  const plain = lamp().status.radius;
  assert.ok(equipFromSlot(H.inventory, H.inventory.find(LANTERN.charm.item)).ok, 'the charm is worn');
  step(0.2);
  near(lamp().status.radius / plain, LANTERN.charm.radius, LANTERN.light.flicker * 2);   // the flame gutters between the two readings
  near(H.LocalLights.heroLight.source.radius, lamp().status.radius, 1e-6);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(0.3);
  const moth2 = kinds('moonmoth')[0];
  assert.equal(H.inventory.count(LANTERN.charm.item) + Object.values(P.equipment).filter(e => e?.itemId === LANTERN.charm.item).length, 1,
    'Continue keeps exactly one charm');
  moth2.away = 0; moth2.reappear(); P.placeAt(moth2.up); P.vel.set(0, 0, 0); step(0.5);
  const second = currentInteraction();
  if (second?.label?.includes('Moonmoth')) { second.run(); step(0.2); }
  assert.equal(H.inventory.count(LANTERN.charm.item), 0, 'a second visit gives ordinary loot, never a second charm');
  pass(`the Moonmoth gives its charm once per adventure, and wearing it widens the lantern ${LANTERN.charm.radius}x`);

  // ---- budgets ----------------------------------------------------------------------------------------------------
  setSetting('quality', 'low'); step(0.5);
  assert.ok(sparkles.limit <= sparkles.max * 0.4, 'the lowest preset keeps the particle pool small');
  assert.ok(H.LocalLights.count <= 16, `light sources stay bounded (${H.LocalLights.count})`);
  assert.ok(H.LocalLights.litPointLights() <= 4, 'and never more than four real point lights');
  setSetting('quality', 'high'); step(0.3);
  const sources = H.LocalLights.count;
  H.goToPlanet(1); step(1);
  assert.equal(H.Fireflies.swarms.length, 0, 'leaving the world takes its swarms and their lights away');
  assert.ok(H.LocalLights.count < sources);
  pass('scenery, particles and lights stay within their budgets, and travel leaves nothing behind');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
