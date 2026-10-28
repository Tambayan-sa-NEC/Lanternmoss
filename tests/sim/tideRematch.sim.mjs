// TODO 31e (Tide rematches): Mirelure and Old Ironclaw fight differently the second time. Mirelure wears the shared
// false lure signature twice - `decoys` round the hero while she is under the water and `glare` round herself once she
// is up - and neither is reachable in the campaign fight. Every decoy lamp is marked with the circle it bursts over for
// the whole wind-up, a hero can stand in the middle of a ring or walk out between two circles, a lamp can be popped from
// outside its circle, and a cancelled fight leaves no lamp lit. Old Ironclaw gains the carillon, a row of the same bell
// wave the toll rings. The rematch leaves the tide, the sluice and Marlo's lighthouse quest exactly as the campaign
// left them, and a rematch that is cancelled or lost puts the lagoon back.
// Tidewhisper stays unreleased: both encounters run in the borrowed development slot (tests/sim/lib/mirelureFixture.mjs).
import assert from 'node:assert/strict';
import { installMirelureFixture } from './lib/mirelureFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installMirelureFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { Rematch } = await imp('gameplay/Rematch.js');
const { rematchReady } = await imp('config/rematch.js');
const { damageEnemy, hurtPlayer } = await imp('combat/damage.js');
const { encounterEvents } = await imp('combat/events.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { Chests } = await imp('gameplay/Chests.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { activeTides } = await imp('world/mechanics/tides.js');
const { lampsOf, lureSpots } = await imp('entities/enemies/behaviors/boss/signatures.js');
const { arcDist, dirAlong, offsetDir } = await imp('utils/sphere.js');
const P = H.player, keys = H.keys, G = H.BossGate;
const pass = m => console.log(`PASS  ${m}`);
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
const phase = f => { dayClock.skip((f * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.1); };
const of = type => ctx.enemies.find(e => e.type === type && e.alive);
const tides = () => activeTides();
const hurts = [];
encounterEvents.addEventListener('playerhurt', e => hurts.push(e.detail.source));
/** Collects whatever treasure is lying about: a rematch is only offered once the last one's chest is open. */
const collect = () => {
  for (const chest of Chests.list) if (!chest.opened) {
    P.placeAt(chest.up); live(0.3);
    const act = currentInteraction(); if (/Treasure chest/.test(act?.label ?? '')) act.run(); else chest.open();
    live(0.6);
  }
  for (const w of [...ctx.worldItems]) { P.placeAt(w.up); live(0.6); }      // whatever it spilled
  live(0.4);
};
/** Parks an encounter between checks, so nothing it does colours the next one. */
const calm = e => { e.cool = 1e9; e.state = 'chase'; e.hideTele(); keys.KeyW = false; };
/** Makes the fight pick exactly this move next, through the framework's own picker. */
const only = (e, id) => {
  for (const p of e.def.phases) p.attacks = [id];
  e.moveCd = {}; e.cool = 0; e.lastAttack = null; e.state = 'chase';
  e.aggro();
};
const lamps = () => ctx.enemies.filter(e => e.type === 'falseLure' && e.alive);
const shore = b => offsetDir(b.home, 0.3, 19.5);                      // the lagoon's rim, inside the arena ring
const lairEdge = b => offsetDir(b.home, 0.3, 15.5);

/** Runs a signature move frame by frame from its first wind-up frame; `during(frame)` may act on each one. */
const cast = (e, id, during) => {
  only(e, id);
  const a = e.def.attacks[id], out = { marked: 0, started: false, lamps: [], hurt: 0 };
  const h0 = hurts.length;
  for (let i = 0; i < Math.round((a.windup + 1.2) * 60); i++) {
    step(1 / 60, heal);
    if (e.attack === id && e.state === 'windup') {
      if (!out.started) { out.started = true; out.lamps = lampsOf(e, id); }
      out.marked++; during?.(i, out);
    }
    if (out.started && e.state !== 'windup') break;
  }
  out.hurt = hurts.slice(h0).filter(s => /Mirelure|Ironclaw/.test(s)).length;
  return out;
};

try {
  H.Tutorial.skip(); P.invuln = 1e5; live(0.5);
  H.goToPlanet('lanternmoss'); H.Pets.command('passive'); live(0.6);
  for (const e of ctx.enemies) if (e.def.respawn && e.type !== 'ironclaw') e.vanish();
  live(0.5);

  // ---- both kits are written, and neither new move can be met in the campaign fight --------------------------------------
  assert.ok(rematchReady(COMBAT.enemies.mirelure) && rematchReady(COMBAT.enemies.ironclaw), 'both Tide encounters have a kit');
  const campaign = ctx.boss, ic0 = of('ironclaw');
  assert.equal(campaign.type, 'mirelure'); assert.ok(ic0, 'Old Ironclaw is on the far beach');
  for (const type of ['mirelure', 'ironclaw']) {
    const kit = COMBAT.enemies[type].rematch, live0 = type === 'mirelure' ? campaign : ic0;
    for (const id of Object.keys(kit.attacks)) {
      assert.ok(!live0.def.phases.some(p => p.attacks.includes(id)), `${type}: ${id} is not in the fight you already had`);
    }
  }
  pass('Mirelure learned decoys and glare, Old Ironclaw the carillon, and none of it is in the campaign fight');

  // ---- beat both once: the campaign's win, and nothing else ---------------------------------------------------------------
  P.level = 8; Quests.st('darkLighthouse').status = 'done'; phase(0.4);       // level, the relit lighthouse and low tide
  ic0.openT = 99; ic0.state = 'chase'; damageEnemy(ic0, ic0.def.hp * 3); live(1.5);
  assert.ok(!ic0.alive && game.planets.miniDefeated.has(ic0.portalId), 'Old Ironclaw beaten once, and remembered');
  P.placeAt(lairEdge(campaign)); for (let i = 0; i < 60 * 8 && G.state !== 'awake'; i++) step(1 / 60);
  assert.equal(G.state, 'awake', 'the lair wakes her');
  for (let i = 0; i < 60 * 3 && campaign.lures.length === 0; i++) step(1 / 60);
  for (let i = 0; i < 60 && campaign.alive; i++) { campaign.mode = 'surfaced'; campaign.hidden = false; damageEnemy(campaign, campaign.def.hp * 3); step(1 / 60); }
  assert.ok(!campaign.alive && game.planets.defeated.has('lanternmoss'), 'and Mirelure');
  live(6);
  const crowns = () => H.inventory.count('tideCrown') + ctx.worldItems.filter(w => w.itemId === 'tideCrown').reduce((n, w) => n + w.quantity, 0);
  collect();
  assert.equal(crowns(), 1, 'one Tide Crown from the campaign win');
  const marlo = JSON.stringify(Quests.st('darkLighthouse'));
  pass('both beaten once: the Tide Crown and the lighthouse quest are the campaign\'s');

  // ---- Old Ironclaw: the carillon is a row of bell waves, each of them a wave to jump ---------------------------------------
  Rematch.cool = {}; collect();
  P.placeAt(ic0.home); P.vel.set(0, 0, 0); live(0.4);
  const pb = currentInteraction();
  assert.match(pb?.label ?? '', /Challenge Old Ironclaw again/, `its own prompt stands where it fell (${pb?.label})`);
  pb.run(); live(0.8);
  const crab = Rematch.fighting;
  assert.ok(crab?.alive && crab.type === 'ironclaw' && crab !== ic0, 'a fresh crab gets up, not the one that fell');
  assert.deepEqual(crab.def.phases.map(p => p.title), COMBAT.enemies.ironclaw.rematch.phases.map(p => p.title), 'it fights its rematch phases');
  assert.ok(crab.def.phases[0].attacks.includes('toll'), 'and rings the bell from its first shell');
  assert.ok(!crab.def.phases[0].attacks.includes('carillon') && crab.def.phases[1].attacks.includes('carillon'), 'the carillon comes with the second');
  for (const e of ctx.enemies) if (e !== crab && e.alive && e.def.respawn !== undefined) e.vanish();
  crab.def = { ...crab.def, speed: 0 };
  const rings = crab.def.attacks.carillon.rings, gap = crab.def.attacks.carillon.gap;
  const ringWaves = (dodge) => {
    P.placeAt(offsetDir(crab.up, 0, 4.5)); P.vel.set(0, 0, 0); P.invuln = 0; heal(); live(0.2); heal();
    only(crab, 'carillon'); crab.openT = 0;
    const seen = new Set(); let launched = 0, maxAlive = 0;
    for (let i = 0; i < 60 * (crab.def.attacks.carillon.windup + rings * gap + 3); i++) {
      step(1 / 60, heal);
      for (const w of crab.waves) seen.add(w);
      launched = seen.size; maxAlive = Math.max(maxAlive, crab.waves.length);
      if (dodge) {                                                       // hop as each ring reaches the hero
        const near = crab.waves.some(w => Math.abs(arcDist(P.up, w.center) - w.r) < 2.2 && !w.hit);
        if (near && P.grounded) { P.vy = 11; P.grounded = false; }
      }
    }
    P.invuln = 1e5;
    return { launched, maxAlive, hurt: [...seen].filter(w => w.hit).length };   // rings that caught the hero (not the pinch it falls back to)
  };
  const stood = ringWaves(false);
  assert.equal(stood.launched, rings, `the carillon rings ${rings} waves in a row (${stood.launched})`);
  assert.ok(stood.maxAlive >= 2 && stood.maxAlive <= 3, `with more than one in the air at a time (${stood.maxAlive}), never more than it has slots for`);
  assert.equal(stood.hurt, rings, `and a hero who stands still is rung once by each of them (${stood.hurt})`);
  calm(crab); P.invuln = 1e5; heal();
  const hopped = ringWaves(true);
  assert.ok(hopped.hurt < stood.hurt, `a hero who jumps as each one arrives takes fewer of them (${hopped.hurt} of ${rings})`);
  calm(crab); P.invuln = 1e5; heal();
  assert.ok(crab.state !== 'dead', 'the row ends and leaves its punish window');
  pass(`the carillon rings ${rings} jumpable waves ${gap}s apart; standing still takes all ${stood.hurt}, jumping on the beat takes ${hopped.hurt}`);

  // ---- the crab still wedges in the wet sand and swaps shells, and a win pays its own keepsake -------------------------------
  const pearls = H.inventory.count('blackPearl');
  crab.def = { ...crab.def, speed: COMBAT.enemies.ironclaw.speed };
  crab.openT = 0; crab.hp = crab.def.hp * 0.6; let swapped = false;
  for (let i = 0; i < 60 * 8; i++) { step(1 / 60, heal); swapped ||= crab.state === 'transition'; }
  assert.ok(swapped && crab.bossPhase === 1, 'it still climbs out of its shell and into a second one at two thirds');
  damageEnemy(crab, crab.def.hp * 4); live(1.5);
  assert.equal(Rematch.won('ironclaw'), 1, 'winning counts on its own ladder');
  collect();
  assert.ok(H.inventory.count('blackPearl') > pearls, 'and pays the rematch keepsake');
  assert.equal(Quests.st('darkLighthouse').status, 'done', "Marlo's quest is exactly as it was");
  assert.equal(JSON.stringify(Quests.st('darkLighthouse')), marlo);
  pass('the crab still swaps shells, a win counts and pays a black pearl, and the lighthouse quest is untouched');

  // ---- Mirelure: challenge her where she fell -------------------------------------------------------------------------------
  Rematch.cool = {}; collect(); P.placeAt(G.lair); live(0.4);
  const prompt = currentInteraction();
  assert.match(prompt?.label ?? '', /Challenge Mirelure again/, `her prompt stands at her lair (${prompt?.label})`);
  prompt.run(); live(0.8);
  const B = Rematch.fighting;
  assert.ok(B?.alive && B.type === 'mirelure' && B !== campaign, 'a fresh Angler, not the lair lord');
  assert.equal(B.mode, 'deep', 'she starts under the water, lures lit');
  const dec = B.def.attacks.decoys, glare = B.def.attacks.glare;
  assert.deepEqual(B.def.phases.map(p => p.title), COMBAT.enemies.mirelure.rematch.phases.map(p => p.title), 'she fights her rematch phases');
  for (const id of ['decoys', 'glare']) assert.ok(B.def.attacks[id], `${id} has its numbers in this fight`);
  pass('a rematch swaps in the whole kit, not just bigger numbers');

  // ---- decoys: a ring of false lamps, each one marked for the whole wind-up -----------------------------------------------------
  P.placeAt(shore(B)); P.vel.set(0, 0, 0); live(0.2);
  const framesOf = id => Math.round(B.def.attacks[id].windup * 60);
  const still = cast(B, 'decoys', () => { P.invuln = 0; });
  assert.equal(still.lamps.length, dec.count, `${dec.count} lamps are lit`);
  assert.ok(still.lamps.every(l => Math.abs(arcDist(l.at, shore(B)) - dec.spread) < 0.3), 'in a ring round the hero');
  assert.ok(still.marked > framesOf('decoys') * 0.9, `each is marked for the whole wind-up (${still.marked} of ~${framesOf('decoys')} frames)`);
  assert.equal(still.hurt, 0, 'and a hero who stays in the middle of the ring is never touched');
  assert.equal(lamps().length, 0, 'every lamp has burst and gone out');
  pass(`decoys light ${dec.count} marked lamps ${dec.spread} m round the hero; the middle of the ring is safe`);

  // ---- there is always a way out between two circles ---------------------------------------------------------------------------
  const ring = still.lamps.map(l => l.at);
  let tightest = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], mid = a.clone().add(b).normalize();
    tightest = Math.min(tightest, arcDist(mid, a) - dec.radius, arcDist(mid, b) - dec.radius);
    assert.ok(ring.every(o => arcDist(mid, o) - dec.radius > P.radius), 'a hero fits between each pair of neighbouring circles');
  }
  pass(`every pair of lamps leaves a gap a hero can walk out through (${tightest.toFixed(1)} m clear of both circles)`);

  // ---- ...and a lamp that is stood on, or that goes off beside you, stings ------------------------------------------------------
  P.placeAt(shore(B)); P.vel.set(0, 0, 0); live(0.2);
  const onLamp = cast(B, 'decoys', (i, out) => {
    P.invuln = 0;
    if (i === framesOf('decoys') - 3) { P.placeAt(out.lamps[0].at); P.vel.set(0, 0, 0); }   // walks onto a lamp at the last moment
  });
  assert.ok(onLamp.hurt >= 1, 'a hero standing on a lamp when it bursts is stung');
  P.invuln = 1e5; live(1); P.placeAt(shore(B)); live(0.2);
  const popped = cast(B, 'decoys', (i, out) => {
    P.invuln = 0;
    if (i === 20) { damageEnemy(out.lamps[1].lamp, 10, { from: P.pos }); out.popped = out.lamps[1].lamp; }
  });
  assert.ok(popped.popped && !popped.popped.alive, 'a lamp can be popped by a blow');
  assert.equal(popped.hurt, 0, 'from outside its circle that costs the hero nothing');
  assert.equal(lamps().length, 0, 'while the rest still burst on their own');
  P.invuln = 1e5; live(1); P.placeAt(shore(B)); live(0.2);
  const close = cast(B, 'decoys', (i, out) => {
    P.invuln = 0;
    if (i === 20) { P.placeAt(out.lamps[2].at); damageEnemy(out.lamps[2].lamp, 10, { from: P.pos }); }
  });
  assert.ok(close.hurt >= 1, 'popping one while standing beside it stings at once');
  pass('standing on a lamp stings; popping one from outside its circle is free; popping one you stand beside is not');

  // ---- glare: the same lamps thrown round her once she is up ---------------------------------------------------------------------
  B.mode = 'surfaced'; B.hidden = false; B.surfaceT = 1e9; B.root.visible = true;
  P.placeAt(offsetDir(B.up, 0, 3)); P.vel.set(0, 0, 0); live(0.2);
  const g = cast(B, 'glare', () => { P.invuln = 0; });
  assert.equal(g.lamps.length, glare.count, `${glare.count} lamps are lit`);
  assert.ok(g.lamps.every(l => Math.abs(arcDist(l.at, B.up) - glare.spread) < 0.4), 'in a ring round her, not round the hero');
  assert.ok(g.marked > framesOf('glare') * 0.9, `each is marked for the whole wind-up (${g.marked} of ~${framesOf('glare')} frames)`);
  assert.equal(g.hurt, 0, 'and a hero close in under her chin is never touched by them');
  pass(`glare rings ${glare.count} lamps round Mirelure herself: a hero who stays close in is safe`);

  // ---- each is only worn when it makes sense: decoys under the water, glare above it -------------------------------------------
  const picked = (id, mode) => {
    B.mode = mode; B.hidden = mode === 'deep'; B.surfaceT = 1e9; only(B, id); let began = false;
    for (let i = 0; i < 90; i++) { step(1 / 60, heal); began ||= B.attack === id; }
    return began;
  };
  assert.equal(picked('decoys', 'surfaced'), false, 'she does not sow decoys once she is up');
  assert.equal(picked('glare', 'deep'), false, 'and does not glare from under the water');
  calm(B); P.invuln = 1e5;
  pass('decoys are a deep-water move and glare a surfaced one');

  // ---- a rematch called off leaves no lamp lit --------------------------------------------------------------------------------
  B.mode = 'deep'; B.hidden = true; P.placeAt(shore(B)); live(0.2);
  only(B, 'decoys'); for (let i = 0; i < 40; i++) step(1 / 60, heal);
  assert.ok(lamps().length > 0 && B.state === 'windup', 'the lamps are lit and the wind-up is under way');
  Rematch.cancel(); live(0.6);
  assert.equal(lamps().length, 0, 'calling the rematch off puts every lamp out with her');
  assert.equal(Rematch.active, null);
  pass('a cancelled rematch leaves no decoy lit');

  // ---- the tide and the sluice: a rematch that ends beached puts the lagoon back --------------------------------------------------
  const beach = () => {
    Rematch.cool = {}; collect(); P.placeAt(G.lair); live(0.4); currentInteraction().run(); live(0.8);
    const b = Rematch.fighting; P.placeAt(shore(b)); P.invuln = 1e5; heal();
    b.hp = b.def.hp * 0.45; b.aggro();
    for (let i = 0; i < 60 * 20 && !b.sluice?.broken; i++) step(1 / 60, heal);
    return b;
  };
  const wet = beach();
  assert.ok(wet.sluice.broken && tides().status.lagoonDrained, 'at half health she smashes the sluice and the lagoon drains');
  assert.equal(wet.mode, 'beached');
  const refilled = () => !tides().status.lagoonDrained;
  P.invuln = 0; hurtPlayer(99999, wet.pos, 0, { lethal: true, source: wet }); step(3);
  assert.equal(Rematch.active, null, 'a faint calls the rematch off');
  assert.ok(refilled() && !wet.alive, 'and the lagoon is full again without waiting for the tide');
  assert.equal(Rematch.won('mirelure'), 0, 'with nothing counted for a fight that was not won');
  pass('fainting while she is beached ends the rematch and refills the lagoon');

  P.invuln = 1e5; heal(); Rematch.cool = {}; collect();
  const wet2 = beach();
  assert.ok(tides().status.lagoonDrained && wet2.sluice.broken, 'beached again');
  Rematch.cancel(); live(0.5);
  assert.ok(refilled(), 'calling a beached rematch off refills the lagoon at once');
  assert.ok(!wet2.sluice.broken, 'and mends the sluice');
  assert.equal(lamps().length, 0);
  pass('a rematch called off while beached puts the lagoon and the sluice back');

  // ---- leaving mid-drain: the lair is simply beaten, with the lagoon full when the hero returns --------------------------------
  P.invuln = 1e5; heal(); Rematch.cool = {}; collect();
  const wet3 = beach();
  assert.ok(tides().status.lagoonDrained, 'beached a third time');
  H.goToPlanet('frostveil'); live(0.6); H.goToPlanet('lanternmoss'); live(1.0);
  assert.equal(Rematch.active, null, 'the rematch did not travel');
  assert.ok(game.planets.defeated.has('lanternmoss') && !ctx.boss?.alive, 'the lair is simply beaten again');
  assert.ok(refilled(), 'with the lagoon full');
  P.placeAt(G.lair); Rematch.cool = {}; collect(); live(0.4);
  assert.match(currentInteraction()?.label ?? '', /Challenge Mirelure again/, 'and offering the same rematch');
  pass('travelling away mid-drain leaves the lair beaten and the lagoon full');

  // ---- high tide: the rematch does not ask what the campaign asked ---------------------------------------------------------------
  phase(0.9);
  assert.equal(tides().status.label === 'Low tide', false, 'it is not low tide');
  assert.equal(G.state, 'beaten', 'the gate stays beaten');
  assert.ok(Rematch.offers().some(s => s.type === 'mirelure'), 'and she can still be challenged: the tide, the level and the quest were asked by the campaign');
  assert.equal(JSON.stringify(Quests.st('darkLighthouse')), marlo, "Marlo's quest is exactly as the campaign left it");
  pass('a rematch is separate from the lighthouse quest and the low-tide gate that opened the first fight');

  // ---- win it: her own keepsake, the ladder, and never the crown again -------------------------------------------------------------
  const pearl0 = H.inventory.count('pearl'), crowns0 = crowns();
  currentInteraction().run(); live(0.8);
  const last = Rematch.fighting;
  last.mode = 'surfaced'; last.hidden = false; last.surfaceT = 1e9; last.root.visible = true;
  damageEnemy(last, last.def.hp * 4); live(1.5);
  assert.equal(Rematch.won('mirelure'), 1, 'winning counts on her own ladder');
  collect();
  assert.ok(H.inventory.count('pearl') >= pearl0 + 3, 'and pays the rematch keepsake');
  assert.equal(crowns(), crowns0, 'but never the Tide Crown again');
  assert.equal(game.planets.defeated.size, 1, 'and the campaign records nothing new');
  assert.ok(refilled(), 'the lagoon is full');
  assert.equal(Rematch.won('ironclaw'), 1, 'the crab keeps a ladder of its own');
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); live(0.6);
  assert.equal(Rematch.won('mirelure'), 1, 'both ladders survive a save and a Continue');
  assert.equal(Rematch.won('ironclaw'), 1);
  assert.deepEqual(Object.keys(Rematch.wins).sort(), ['lanternmoss:ironclaw', 'lanternmoss:mirelure']);
  assert.equal(H.Portals.destinations().find(d => d.id === 'lanternmoss').rematch, true, 'the lantern gate marks the world');
  pass('a win pays the pearls and moves her own ladder, never the crown, and everything survives a Continue');

  console.log('all passed');
} finally { keys.KeyW = false; H.Mechanics.exit(); fixture.restore(); }
