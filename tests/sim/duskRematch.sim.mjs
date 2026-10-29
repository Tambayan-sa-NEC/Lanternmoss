// TODO 31f: both Dusk encounters on the unreleased 30i checkpoint. The fixture borrows a released slot only for
// this process; the authored world remains gated. Exercise the new moves, resets, rewards and the original road.
import assert from 'node:assert/strict';
import { installDuskUmbraFixture } from './lib/duskUmbraFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskUmbraFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { PLANET_CATALOG } = await imp('config/planets.js');
const { Rematch } = await imp('gameplay/Rematch.js');
const { OldRoad } = await imp('gameplay/OldRoad.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { damageEnemy } = await imp('combat/damage.js');
const { setSetting } = await imp('core/settings.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { isLit, lightLamp } = await imp('entities/enemies/behaviors/arenaLamp.js');
const { startMove } = await imp('entities/enemies/behaviors/boss/umbra.js');
const { offsetDir, arcDist } = await imp('utils/sphere.js');
const P = H.player;
const live = seconds => step(seconds, () => { P.hp = P.stats.maxHp; });
const pass = text => console.log(`PASS  ${text}`);
const kind = type => ctx.enemies.filter(e => e.type === type && e.alive);
const spot = type => Rematch.offers().find(s => s.type === type);
const only = (e, id) => {
  e.def.phases.forEach(p => { p.attacks = [id]; });
  e.moveCd = {}; e.cool = 0; e.lastAttack = null; e.state = 'chase'; e.aggro();
};
const collect = () => {
  for (const c of H.Chests.list) if (!c.opened) {
    P.placeAt(c.up); live(0.3);
    const t = currentInteraction(); if (/Treasure chest/.test(t?.label ?? '')) t.run();
  }
  live(0.3);
};

try {
  assert.equal(PLANET_CATALOG.find(p => p.id === 'duskhollow').released, false, 'Dusk remains unreleased');
  H.Tutorial.skip(); H.goToPlanet('lanternmoss'); H.Pets.command('passive'); P.invuln = 1e5; live(0.5);
  assert.ok(OldRoad.brazier && OldRoad.lamps.length, 'the real Dusk road is built');
  OldRoad.takeFlame(OldRoad.brazier);
  assert.ok(OldRoad.lightLamp(OldRoad.lamps[0]), 'a waylamp is lit through the road rule');
  Quests.st('oldRoad').status = 'done'; P.level = 11; live(0.2);
  const road = H.Mechanics.active.instance.road;
  const litRoad = [...road.lamps], quest = JSON.stringify(Quests.st('oldRoad'));
  assert.equal(litRoad.length, 1);

  const grandmother = kind('grandweaver')[0];
  assert.ok(grandmother?.portalId);
  game.planets.miniDefeated.add(grandmother.portalId); grandmother.vanish();
  const miniSpot = spot('grandweaver');
  assert.ok(miniSpot, 'a beaten Grandmother has a rematch offer');
  assert.ok(Rematch.begin(miniSpot));
  const g = Rematch.fighting;
  P.placeAt(offsetDir(g.home, 0, 6)); live(1.6);
  assert.ok(g.hung && kind('gloomAnchor').length === g.def.anchors.count, 'the rematch begins on fresh anchors');
  setSetting('roundBeetles', true); live(0.1);
  assert.ok(g.beetle.visible && !g.spider.visible, 'the rematch respects the beetle accessibility silhouette');
  setSetting('roundBeetles', false); live(0.1);
  assert.ok(g.spider.visible);
  assert.ok(!COMBAT.enemies.grandweaver.phases.some(p => p.attacks.includes('silkRing')),
    'the silk ring is absent from the original fight');
  const websBefore = g.webs?.length ?? 0;
  only(g, 'silkRing');
  let warned = 0;
  for (let i = 0; i < 240 && (g.webs?.length ?? 0) < websBefore + g.def.attacks.silkRing.count; i++) {
    step(1 / 60, () => { P.hp = P.stats.maxHp; });
    if (g.state === 'windup' && g.attack === 'silkRing' && g.silkMarks?.length) {
      warned++;
      assert.ok(g.silkMarks?.every(mark => mark.mesh.visible), 'each web stays visibly marked during the wind-up');
    }
  }
  const a = g.def.attacks.silkRing;
  assert.ok(warned > a.windup * 45, `the ring is marked before it falls (${warned} frames)`);
  assert.equal(g.silkSpots.length, a.count);
  assert.ok(g.silkSpots.every(at => Math.abs(arcDist(at, P.up) - a.spread) < 0.1), 'the webs ring the hero');
  assert.ok(g.webs.length >= websBefore + a.count, 'the marked patches become cuttable webs');
  const placedWebs = [...g.webs];
  Rematch.cancel(); live(0.2);
  assert.equal(kind('gloomAnchor').length, 0, 'cancel removes the fresh anchor strands');
  assert.ok(placedWebs.every(w => !w.alive), 'cancel removes every web Grandmother placed');
  assert.deepEqual(road.lamps, litRoad, 'the Old Road stays lit');
  assert.equal(JSON.stringify(Quests.st('oldRoad')), quest, 'Wick\'s quest is untouched');
  pass('Grandmother marks a safe silk ring; cancelling clears webs and anchors but preserves Wick\'s road');

  assert.ok(Rematch.begin(spot('grandweaver')));
  const g2 = Rematch.fighting, silkBefore = H.inventory.count('spiderSilk');
  g2.hung = false; g2.bossPhase = 2; g2.hp = 1;
  damageEnemy(g2, 100); live(0.5);
  assert.equal(Rematch.won('grandweaver'), 1, 'the mini boss has a ladder');
  assert.ok(H.inventory.count('spiderSilk') >= silkBefore + 3, 'the repeatable silk keepsake is paid');
  assert.ok(game.planets.miniDefeated.has(grandmother.portalId), 'the original mini boss stays beaten');
  collect(); Rematch.cool = {};

  assert.ok(H.BossGate.met, 'the original level and quest gate is satisfied');
  H.wakeBoss(); live(0.5);
  const first = ctx.boss;
  damageEnemy(first, first.def.hp * 3); live(1.2);
  assert.ok(game.planets.defeated.has('lanternmoss'), 'the original Umbra win is recorded');
  collect(); Rematch.cool = {};
  assert.ok(Rematch.begin(spot('umbra')), 'a beaten Umbra has a rematch offer');
  const u = Rematch.fighting;
  P.placeAt(offsetDir(u.home, 0, 7)); u.cool = 1e9; live(1.5);
  const bait = kind('arenaLantern')[0];
  P.placeAt(offsetDir(bait.up, 0.6, 1.4)); H.Mechanics.active.instance.refill(1e6); live(0.2);
  assert.match(currentInteraction()?.label ?? '', /Light the arena lantern/);
  currentInteraction().run(); live(0.1);
  assert.ok(isLit(bait));
  P.placeAt(offsetDir(u.home, 0, 5)); live(0.1);
  assert.ok(!COMBAT.enemies.umbra.phases.some(p => p.attacks.includes('eclipse')),
    'the new hero dive is absent from the campaign');
  P.invuln = 0;
  only(u, 'eclipse'); startMove(u, 'eclipse');
  assert.equal(isLit(bait), false, 'the new dive first snuffs one burning bait');
  let marked = 0;
  for (let i = 0; i < Math.round(u.def.attacks.eclipse.windup * 60); i++) {
    step(1 / 60, () => { P.hp = P.stats.maxHp; });
    if (u.state === 'windup') {
      marked++;
      assert.ok(u.mothAim.eclipse.lane.dots.some(dot => dot.visible), 'the hero dive has a visible ground lane');
    }
  }
  assert.ok(marked > u.def.attacks.eclipse.windup * 45, 'the lane persists through its long warning');
  live(0.2);
  assert.ok(u.fogT > 0 && P.blindK < 1, 'a landed dive presses the carried light in briefly');
  Rematch.cancel(); live(0.2);
  assert.equal(kind('arenaLantern').length, 0, 'cancel clears arena bait');
  assert.equal(P.blindK, 1, 'the carried light returns at once');
  assert.deepEqual(road.lamps, litRoad);
  assert.equal(JSON.stringify(Quests.st('oldRoad')), quest);
  pass('Umbra snuffs one bait and marks a longer moth dive; cancellation restores the light without changing the road');

  assert.ok(Rematch.begin(spot('umbra')));
  const u2 = Rematch.fighting, dustBefore = H.inventory.count('lumenDust');
  u2.cool = 1e9; P.invuln = 1e5; live(1.5);
  H.Mechanics.active.instance.refill(1e6);
  assert.ok(lightLamp(kind('arenaLantern')[0]));
  P.placeAt(offsetDir(u2.home, 0, 5)); P.vel.set(0, 0, 0);
  only(u2, 'eclipse'); startMove(u2, 'eclipse');
  for (let i = 0; i < 72; i++) step(1 / 60);
  const committed = u2.mothAim.eclipse.to.clone();
  P.placeAt(offsetDir(committed, 1, 7)); P.vel.set(0, 0, 0); P.invuln = 0;
  for (let i = 0; i < 30; i++) step(1 / 60);
  assert.equal(u2.fogT, 0, 'leaving the committed lane avoids the dive and its fog');
  P.invuln = 1e5;
  damageEnemy(u2, u2.def.hp * 3); live(0.5);
  assert.equal(Rematch.won('umbra'), 1);
  assert.ok(H.inventory.count('lumenDust') >= dustBefore + 3, 'the Dusk material keepsake is paid');
  assert.equal(game.planets.defeated.size, 1, 'a rematch adds no campaign win');
  assert.equal(JSON.stringify(Quests.st('oldRoad')), quest);
  assert.deepEqual(road.lamps, litRoad);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); live(0.5);
  assert.equal(Rematch.won('umbra'), 1); assert.equal(Rematch.won('grandweaver'), 1);
  assert.equal(JSON.stringify(Quests.st('oldRoad')), quest, 'the original quest survives Continue');
  assert.deepEqual(H.Mechanics.active.instance.road.lamps, litRoad, 'the waylamp survives Continue');
  pass('both repeatable rewards and ladders survive Continue, without repeating the crown or changing Wick\'s quest');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
