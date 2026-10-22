// TODO 30e (Shadelings and Mosslurks): Duskhollow's first monsters in the borrowed development slot (the world stays
// unreleased). A shadeling is only a shadow where the ground is dark - untouchable, and unable to touch you - and
// stands up solid in the lantern's light or beside a relit waylamp; a burst of light or fire drives it off. A
// mosslurk is scenery until someone reaches for the glowcaps it is wearing, and its warning circle makes the ambush
// fair. Both rebuild disguised and unsprung across Continue and travel.
import assert from 'node:assert/strict';
import { installDuskMonsterFixture } from './lib/duskMonsterFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskMonsterFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { COMBAT } = await imp('config/combat.js');
const { OLD_ROAD } = await imp('config/oldRoad.js');
const { damageEnemy } = await imp('combat/damage.js');
const { encounterEvents } = await imp('combat/events.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { BESTIARY_ENTRIES } = await imp('config/bestiary.js');
const { MONSTER_DROPS } = await imp('config/chests.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const { groundHeight } = await imp('world/terrain.js');
const W = game.world, P = H.player, Road = H.OldRoad;
const lamp = () => H.Mechanics.active.instance;
const of = t => ctx.enemies.filter(e => e.type === t);
const pass = m => console.log(`PASS  ${m}`);
const phase = f => { dayClock.skip((f * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.1); };
// The hero stays vulnerable throughout: a blow that lands has to register, or "a shadow can never hurt you" would
// pass for the wrong reason. Health is topped up each frame instead, so nothing here ends in a faint.
const hurts = [];
encounterEvents.addEventListener('playerhurt', e => hurts.push(e.detail.source));
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
/** Stands the hero `metres` from a monster and lets a few frames settle. */
const standNear = (e, metres) => { P.placeAt(offsetDir(e.up, 1.1, metres)); P.vel.set(0, 0, 0); step(0.25); };
/** Puts a monster out where nothing is lit, far from the hero and the village. */
const park = e => { const d = offsetDir(W.spawnDir, 2.2, 120); e.spawn(d); e.home.copy(d); step(0.1); };

try {
  H.Tutorial.skip(); H.goToPlanet('lanternmoss'); H.Pets.command('passive'); phase(0.4); heal();

  // ---- the roster is placed where the fiction says ----------------------------------------------------------------
  const shades = of('shadeling'), lurks = of('mosslurk');
  assert.ok(shades.length >= 9 && lurks.length >= 5, `both kinds spawn (${shades.length} shadelings, ${lurks.length} mosslurks)`);
  assert.ok(ctx.enemies.every(e => arcDist(e.home, W.spawnDir) >= COMBAT.player.safeRadius + 11), 'nothing spawns in the village');
  const caps = W.spots.trees.filter(t => t.kind === 'glowcap');
  assert.ok(lurks.every(e => caps.some(c => arcDist(e.home, c.dir) < 4)), 'every mosslurk hides beside real glowcaps');
  assert.ok(shades.every(e => e.hidden && !e.bound), 'out in the dusk every shadeling is only a shadow');
  assert.ok(lurks.every(e => e.disguised && e.hidden), 'and every mosslurk is just a patch of caps');
  pass(`${shades.length} shadelings haunt the hollows and ${lurks.length} mosslurks sit among the real glowcaps`);
  // the layout as the world generated it, before the checks below move individual monsters around to stage them
  const homes = () => ctx.enemies.filter(e => e.def.respawn).map(e => `${e.type}:${e.home.toArray().map(n => n.toFixed(4))}`).sort();
  const layout = homes();

  // ---- a shadow cannot be hit, and cannot hit you ------------------------------------------------------------------
  const shade = shades[0]; park(shade);
  P.placeAt(offsetDir(shade.up, 0, 60)); step(0.2);
  assert.equal(Road.litAt(shade.up), 0, 'nothing lights the deep hollow out there');
  assert.ok(shade.hidden && !shade.bound);
  const full = shade.hp; damageEnemy(shade, 50); damageEnemy(shade, 50, { fire: true });
  assert.equal(shade.hp, full, 'a shadow takes no damage at all');

  // it may follow, but a wind-up only begins where it is solid: it closes while the hero's light is still far off
  standNear(shade, 24); shade.aggro();
  const gap = arcDist(shade.up, P.up);
  let windupInTheDark = false;
  step(1.6, () => { heal(); if (!shade.bound && shade.state === 'windup') windupInTheDark = true; });
  assert.ok(arcDist(shade.up, P.up) < gap, 'a shadow follows you');
  assert.ok(shade.hidden && !shade.bound, 'and is still only a shadow out there');
  assert.ok(!windupInTheDark, 'a shadow never even begins a blow');
  const before = hurts.length;
  shade.state = 'windup'; shade.timer = 0.01; shade.bound = false;     // force the blow a shadow must never land
  P.invuln = 0; live(0.3);
  assert.equal(hurts.length, before, 'and a shadow that swings lands nothing: no unavoidable damage from what you cannot fight');
  pass('a shadeling out in the dark is untouchable and harmless: it can follow you, but it cannot strike');

  // ---- the hero's own lantern makes it solid ------------------------------------------------------------------------
  lamp().refill(1e6);
  standNear(shade, 2.5); step(0.5);
  assert.ok(Road.litAt(shade.up) >= COMBAT.enemies.shadeling.bindAt, 'the belt lantern lights the ground it stands on');
  assert.ok(shade.bound && !shade.hidden, 'so it stands up solid');
  damageEnemy(shade, 20);
  assert.ok(shade.hp < full, 'and now it can be fought');
  const engaged = hurts.length;
  shade.cool = 0; P.invuln = 0; live(3);
  assert.ok(hurts.length > engaged, 'a solid shadeling fights back');
  pass('inside the lantern a shadeling is solid, hittable and dangerous: the light is the whole fight');

  // ---- a relit waylamp is a place you can fight, away from your own light ---------------------------------------------
  const first = Road.lamps[0];
  lamp().takeFlame(); Road.lightLamp(first);
  const atLamp = of('shadeling')[1]; atLamp.spawn(offsetDir(first.dir, 0.7, 2)); atLamp.home.copy(atLamp.up);
  P.placeAt(offsetDir(W.spawnDir, 3.0, 140)); step(0.5);                // the hero is far away: only the lamp lights it
  assert.ok(Road.litAt(atLamp.up) >= COMBAT.enemies.shadeling.bindAt && atLamp.bound && !atLamp.hidden,
    'a shadeling standing by a relit waylamp is solid even with the hero nowhere near');
  pass('the Old Road you relit (30d) is also the road you can fight shadelings on');

  // ---- a burst of light, and fire, drive it off -------------------------------------------------------------------
  const second = Road.lamps.find(l => !lamp().lampLit(l.index) && l.branch === first.branch);
  const nearLamp = of('shadeling')[2]; nearLamp.spawn(offsetDir(second.dir, 1.2, 3)); nearLamp.home.copy(nearLamp.up);
  P.placeAt(offsetDir(W.spawnDir, 3.0, 140)); step(0.4);               // far from the village, so nothing is "safe" and calls the chase off
  assert.notEqual(nearLamp.state, 'flee');
  lamp().takeFlame(); Road.lightLamp(second); step(0.2);                // the road's own path, so the light really comes on
  assert.equal(nearLamp.state, 'flee', 'a waylamp catching beside it is a burst of light');
  assert.equal(nearLamp.fledFrom, 'light');

  const burned = of('shadeling')[3]; park(burned); standNear(burned, 2.5); lamp().refill(1e6); step(0.3);
  assert.ok(burned.bound, 'solid in the lantern, so the fire can land');
  damageEnemy(burned, 5, { fire: true });                               // the witch's fireball and meteor carry this
  assert.equal(burned.state, 'flee', 'fire sends it running');
  assert.equal(burned.fledFrom, 'fire');
  assert.ok(COMBAT.spells.fireball.fire && COMBAT.spells.meteor.fire, 'and those are the spells that carry fire');
  pass('a waylamp catching, or a hit of fire, drives a shadeling off: every hero carries the first counter');

  // ---- an empty lantern is still safe --------------------------------------------------------------------------------
  const dry = of('shadeling')[4]; park(dry);
  lamp().burn(1e6); standNear(dry, 6); dry.aggro(); live(1.5);
  let seen = hurts.length, hurtFromTheDark = false, solidInTheDark = false;
  P.invuln = 0;
  step(3, () => {
    if (hurts.length > seen) { seen = hurts.length; if (dry.hidden) hurtFromTheDark = true; }   // a blow from something unhittable
    if (dry.bound && Road.litAt(dry.up) < COMBAT.enemies.shadeling.bindAt) solidInTheDark = true;
    heal();
  });
  assert.equal(lamp().status.lit, false, 'the tank is empty');
  assert.ok(!solidInTheDark, 'nothing stands up solid where the ground is dark');
  assert.ok(!hurtFromTheDark, 'and every blow that landed came from a shade the hero could hit back');
  lamp().refill(1e6);
  pass('with an empty lantern a shadeling cannot be fought - and cannot fight back either');

  // ---- the mosslurk ambush ---------------------------------------------------------------------------------------
  const lurk = lurks[0];
  P.placeAt(offsetDir(lurk.up, 0.4, 2.0)); P.vel.set(0, 0, 0); step(0.2);
  assert.ok(lurk.disguised && lurk.hidden, 'still only a patch of caps');
  const prompt = currentInteraction();
  assert.match(prompt.label, /Pick the glowcap patch/, `it offers exactly what a real patch offers (${prompt?.label})`);
  damageEnemy(lurk, 60);
  assert.equal(lurk.hp, lurk.def.hp, 'and nothing can hit scenery');
  prompt.run(); step(0.05);
  assert.ok(!lurk.disguised && !lurk.hidden, 'reaching for it springs the ambush');
  assert.equal(lurk.state, 'windup');
  assert.ok(lurk.tele.visible, 'and it shows its warning circle before the first bite');
  const bitten = hurts.length; P.invuln = 0;
  live(lurk.def.windup + 0.2);
  assert.ok(hurts.length > bitten, 'then it bites');
  damageEnemy(lurk, 40);
  assert.ok(lurk.hp < lurk.def.hp, 'a sprung mosslurk can be fought');

  const walked = lurks[1];
  P.placeAt(walked.up); P.vel.set(0, 0, 0); live(0.4);
  assert.ok(!walked.disguised, 'walking right over one springs it too');
  assert.equal(walked.state, 'windup', 'with the same warning first');
  pass('a mosslurk is scenery that offers the gather prompt, and its warning circle keeps the ambush fair');

  // ---- save, travel and revisit ------------------------------------------------------------------------------------
  P.placeAt(W.spawnDir); step(0.3);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); phase(0.4);
  assert.deepEqual(homes(), layout, 'Continue rebuilds the same roster in the same places');
  assert.ok(of('mosslurk').every(e => e.disguised && e.hidden), 'every mosslurk is disguised again: a save cannot leave one sprung');
  assert.ok(of('shadeling').every(e => !e.bound || Road.litAt(e.up) >= COMBAT.enemies.shadeling.bindAt), 'and no shadeling is solid in the dark');
  H.goToPlanet('emberfall'); step(0.3);
  assert.equal(of('shadeling').length + of('mosslurk').length, 0, 'no other world has them');
  H.goToPlanet('lanternmoss'); step(0.3);
  assert.deepEqual(homes(), layout, 'portal travel brings them back the same way');
  assert.ok(of('mosslurk').every(e => e.disguised), 'disguised, every one');
  pass('Continue and portal travel rebuild both kinds unsprung, in the same places, on this world alone');

  // ---- the journal knows them ---------------------------------------------------------------------------------------
  for (const type of ['shadeling', 'mosslurk']) {
    const page = BESTIARY_ENTRIES[type];
    assert.ok(page?.blurb && page.counters.length >= 2, `${type} has a bestiary page with counters`);
    assert.ok(MONSTER_DROPS.extra[type]?.items.length, `${type} leaves something of this world behind`);
  }
  assert.match(BESTIARY_ENTRIES.shadeling.counters.join(' '), /light/i, 'and the shadeling page names the light as the counter');
  assert.ok(OLD_ROAD.lamp.light.radius > 0);
  pass('both monsters have a bestiary page, their counters and their drops');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
