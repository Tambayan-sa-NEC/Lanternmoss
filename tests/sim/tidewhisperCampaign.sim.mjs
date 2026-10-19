// Candidate integration with actual fourth-world ids/scaling, portals and save schemas; never imported by production.
import assert from 'node:assert/strict';
import { installTidewhisperCandidate } from './lib/tidewhisperCandidate.mjs';
const fixture = installTidewhisperCandidate();
const { boot, imp } = await import('./lib/boot.mjs');
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { damageEnemy } = await imp('combat/damage.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { PLANETS } = await imp('config/planets.js');
const { ACHIEVEMENTS } = await imp('config/achievements.js');
const { activeTides } = await imp('world/mechanics/tides.js');
const { dryGround } = await imp('world/terrain.js');
const { offsetDir } = await imp('utils/sphere.js');
const P = H.player;
const travel = id => {
  P.placeAt(H.Portals.gate.dir); P.invuln = 1e9;
  assert.ok(H.Portals.travel(id), `portal to ${id}`); step(2);
  assert.equal(ctx.planetId, id); assert.ok(!ctx.transitioning);
};
try {
  H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; P.level = 8;
  assert.deepEqual(PLANETS.map(p => p.id), ['lanternmoss','emberfall','frostveil','tidewhisper']);
  H.inventory.add('wayfarerKey', 3); P.placeAt(H.Portals.gate.dir);
  assert.equal(H.Portals.travel('tidewhisper'), false, 'keys cannot skip unreached worlds');
  for (const id of ['lanternmoss','emberfall','frostveil']) {
    if (ctx.planetId !== id) travel(id);
    H.wakeBoss(); ctx.boss.hidden = false; ctx.boss.invulnerable = false;
    damageEnemy(ctx.boss, ctx.boss.hp * 100); step(5);
    H.Chests.open(H.Chests.bossChest); step(.1);
  }
  assert.equal(game.planets.complete, false, 'Act I wins do not complete the four-world candidate');
  travel('tidewhisper'); assert.equal(ctx.planet, 3); assert.equal(ctx.boss.type, 'mirelure');
  assert.ok(ctx.npcs.some(n => n.name === 'Marlo'));
  assert.equal(H.Chests.list.filter(c => c.kind !== 'boss').length, 11);
  assert.ok(H.Gathering.nodes.every(n => n.id.startsWith('tidewhisper:node:')));
  assert.ok(H.Farm.plots.length > 0 && H.Farm.plots.every(plot => dryGround(plot.dir, .5, { high: true })));
  assert.ok(ACHIEVEMENTS.some(a => a.id === 'tideBoss'));
  const node = H.Gathering.nodes[0], nodeId = node.id; node.deplete();
  Quests.start('darkLighthouse'); const quest = structuredClone(Quests.st('darkLighthouse'));
  dayClock.skip((.4 * DAY.length - dayClock.t + DAY.length) % DAY.length, 'test'); step(.1);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(.1);
  assert.equal(ctx.planetId, 'tidewhisper'); assert.deepEqual(Quests.st('darkLighthouse'), quest);
  assert.ok(!H.Gathering.nodes.find(n => n.id === nodeId).ready);
  travel('lanternmoss'); assert.equal(activeTides(), null); travel('tidewhisper');
  assert.deepEqual(Quests.st('darkLighthouse'), quest);
  console.log('PASS actual fourth-world portal, level/quest/node Continue and return trip; farm above high water; Act I progression retained');
  Quests.st('darkLighthouse').status = 'done';
  dayClock.skip((.4 * DAY.length - dayClock.t + DAY.length) % DAY.length, 'test'); step(.1);
  P.placeAt(offsetDir(ctx.boss.home, .3, 15.5));
  for (let i = 0; i < 60 * 8 && H.BossGate.state !== 'awake'; i++) step(1/60);
  assert.equal(H.BossGate.state, 'awake');
  ctx.boss.mode = 'surfaced'; ctx.boss.surfaceT = 99; ctx.boss.hidden = false;
  damageEnemy(ctx.boss, ctx.boss.hp * 100); step(5);
  assert.ok(game.planets.complete); H.Chests.open(H.Chests.bossChest); step(.1);
  assert.equal(H.inventory.count('tideCrown') + ctx.worldItems.filter(w => w.itemId === 'tideCrown').reduce((n,w) => n+w.quantity,0), 1);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); step(.1);
  assert.equal(ctx.planetId, 'tidewhisper'); assert.equal(ctx.boss.alive, false);
  assert.ok(game.planets.defeated.has('tidewhisper')); assert.equal(H.BossGate.state, 'beaten');
  assert.equal(game.planets.canTravelTo('duskhollow'), false);
  console.log('PASS level/quest/tide gate, fourth-world completion, single Tide Crown and beaten-state Continue; later worlds stay inaccessible');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
