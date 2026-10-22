// TODO 30f (Gloomweavers and Snuffers): the spinners and the thieves in the borrowed development slot (the world
// stays unreleased). A weaver fences the ground with sticky webs; a web slows whoever stands in it, a blade cuts it
// and fire burns it away, and either way it leaves this world's only spider silk. A snuffer steals lantern oil,
// runs off with it, can only take what the tank holds, and gives it back with interest when it is caught. The
// accessibility toggle swaps every spider on the world for a beetle, the same switch its mini boss will use.
import assert from 'node:assert/strict';
import { installDuskMonsterFixture } from './lib/duskMonsterFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskMonsterFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { COMBAT } = await imp('config/combat.js');
const { LANTERN } = await imp('config/lantern.js');
const { damageEnemy } = await imp('combat/damage.js');
const { setSetting } = await imp('core/settings.js');
const { spin } = await imp('entities/enemies/behaviors/weaver.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const W = game.world, P = H.player;
const lamp = () => H.Mechanics.active.instance;
const of = t => ctx.enemies.filter(e => e.type === t);
const webs = () => of('gloomweb').filter(e => e.alive);
const pass = m => console.log(`PASS  ${m}`);
const phase = f => { dayClock.skip((f * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.1); };
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
/** Puts a monster out in the wilds, far from the village and the hero. */
const park = (e, angle = 2.2, metres = 120) => { const d = offsetDir(W.spawnDir, angle, metres); e.spawn(d); e.home.copy(d); step(0.1); };

try {
  H.Tutorial.skip(); H.goToPlanet('lanternmoss'); H.Pets.command('passive'); phase(0.4); heal();

  // ---- the roster, and what a weaver does with its time -------------------------------------------------------------
  const weavers = of('gloomweaver'), thieves = of('snuffer');
  assert.ok(weavers.length >= 4 && thieves.length >= 4, `both kinds spawn (${weavers.length} weavers, ${thieves.length} snuffers)`);
  assert.ok(ctx.enemies.every(e => e.type === 'gloomweb' || arcDist(e.home, W.spawnDir) >= COMBAT.player.safeRadius + 11),
    'nothing spawns in the village');

  const weaver = weavers[0]; park(weaver);
  P.placeAt(offsetDir(weaver.up, 0, 30)); live(0.3);
  const W_ = COMBAT.enemies.gloomweaver.web;
  weaver.webs = []; weaver.spinT = 0;
  live(W_.every * (W_.max + 2));                                       // long enough to spin well past its own cap
  const mine = weaver.webs.filter(w => w.alive);
  assert.ok(mine.length > 0, 'a weaver spins webs where it stands');
  assert.ok(mine.length <= W_.max, `and never more than its own ${W_.max} at once (${mine.length})`);
  weaver.webs = [];                                                    // one spun on the spot, to see where it goes down
  const placed = spin(weaver);
  assert.ok(placed && arcDist(placed.up, weaver.up) < W_.at + 1, `a web goes down just ahead of the weaver (${placed && arcDist(placed.up, weaver.up).toFixed(1)} m)`);
  assert.ok(mine.every(w => w.def.object && w.hidden === false), 'a web is a hittable object, not a monster');
  assert.equal(H.Journal?.data?.seen?.gloomweb, undefined, 'and never enters the bestiary');
  pass(`a gloomweaver fences the ground with up to ${W_.max} sticky webs at a time`);

  // ---- a web slows whoever stands in it -------------------------------------------------------------------------------
  const sticky = mine[0];
  P.placeAt(offsetDir(sticky.up, 0, 40)); live(0.3);
  assert.equal(P.mireK, 1, 'out of the web the hero is free');
  P.placeAt(sticky.up.clone()); live(0.2);
  assert.ok(P.mireK < 1 && Math.abs(P.mireK - sticky.def.mire) < 1e-6, `standing in it the hero wades (${P.mireK})`);
  // ...and is free again the moment it is gone
  damageEnemy(sticky, sticky.def.hp * 2);
  assert.ok(!sticky.alive, 'a blade cuts a web');
  live(0.2);
  assert.equal(P.mireK, 1, 'and the hero is free again at once');
  // the hero is standing where it fell, so it may already have been walked over into the bag
  const silk = ctx.worldItems.filter(w => w.itemId === 'spiderSilk').length + H.inventory.count('spiderSilk');
  assert.ok(silk > 0, 'a cut web leaves spider silk: this world had no other source');
  pass(`a web slows the hero to ${(sticky.def.mire * 100).toFixed(0)}% until it is cut, and leaves silk when it is`);

  // ---- fire burns a web away in one ------------------------------------------------------------------------------------
  weaver.webs = []; weaver.spinT = 0; P.placeAt(offsetDir(weaver.up, 1, 12)); live(0.3);
  const burnable = spin(weaver);
  assert.ok(burnable, 'the weaver spins another');
  assert.ok(burnable.hp > 1, 'with health a blade would have to work through');
  damageEnemy(burnable, 1, { fire: true });                            // the witch's fireball and meteor carry this
  assert.ok(!burnable.alive && burnable.burnt, 'but a single touch of fire burns it away');
  pass('fire burns a web away in one, where a blade has to cut it');

  // ---- a snuffer steals oil, runs, and gives it back with interest ------------------------------------------------------
  const S = COMBAT.enemies.snuffer.steal;
  const thief = thieves[0]; park(thief, 3.4, 130);
  lamp().refill(1e6);
  P.placeAt(offsetDir(thief.up, 0, 2)); P.invuln = 0; thief.aggro(); thief.cool = 0;
  const before = lamp().status.oil;
  live(4);
  assert.ok(lamp().status.oil < before, `it takes oil out of the tank (${before.toFixed(0)} -> ${lamp().status.oil.toFixed(0)})`);
  assert.ok(thief.stolen > 0, 'and runs off carrying it');
  assert.ok(Math.abs(thief.stolen - S.oil) < 1e-6, `one draught, not the whole tank (${thief.stolen})`);
  const gone = arcDist(thief.up, P.up);
  live(1.5);
  assert.ok(arcDist(thief.up, P.up) > gone, 'it puts distance between you while it flees');

  const robbed = lamp().status.oil, carrying = thief.stolen;
  damageEnemy(thief, thief.def.hp * 3);
  assert.ok(!thief.alive);
  const back = lamp().status.oil - robbed;
  assert.ok(back > carrying, `catching it gives the oil back with interest (+${back.toFixed(0)} for ${carrying.toFixed(0)} taken)`);
  assert.ok(Math.abs(back - carrying * S.interest) < 0.5);
  pass(`a snuffer steals ${S.oil} oil and gives back ${S.interest}x when it is caught`);

  // ---- robbed twice, and an empty lantern has nothing to take ------------------------------------------------------------
  const second = thieves[1]; park(second, 1.2, 125);
  lamp().refill(1e6);
  P.placeAt(offsetDir(second.up, 0, 2)); P.invuln = 0; second.aggro(); second.cool = 0;
  live(4);
  const first = second.stolen;
  assert.ok(first > 0, 'the next one robs you too');
  second.fleeT = 0; second.cool = 0; P.placeAt(offsetDir(second.up, 0, 2)); P.invuln = 0;
  live(4);
  assert.ok(second.stolen > first, 'and robs you again if you let it');

  lamp().burn(1e6);
  const empty = second.stolen;
  second.fleeT = 0; second.cool = 0; P.placeAt(offsetDir(second.up, 0, 2)); P.invuln = 0;
  live(4);
  assert.equal(lamp().status.oil, 0, 'the tank is empty');
  assert.equal(second.stolen, empty, 'an empty lantern has nothing for it: a snuffer can never leave you worse off than empty');
  pass('a snuffer can rob the same hero again and again, but never takes what is not there');

  // ---- the accessibility toggle swaps every spider on the world -----------------------------------------------------------
  const spiders = () => of('gloomweaver').filter(e => e.alive);
  setSetting('roundBeetles', false); live(0.2);
  assert.ok(spiders().every(e => e.spider.visible && !e.beetle.visible), 'by default they are spiders');
  setSetting('roundBeetles', true); live(0.2);
  assert.ok(spiders().every(e => !e.spider.visible && e.beetle.visible), 'with the setting on, every one of them is a beetle');
  assert.ok(spiders().every(e => e.legs.length === 8), 'the same body underneath, so nothing about the fight changes');
  setSetting('roundBeetles', false); live(0.2);
  assert.ok(spiders().every(e => e.spider.visible), 'and back again, the very next frame');
  pass('one setting draws every spider on the world as a beetle, and changes nothing else');

  // ---- save, travel and revisit ---------------------------------------------------------------------------------------
  const homes = () => ctx.enemies.filter(e => e.def.respawn).map(e => `${e.type}:${e.home.toArray().map(n => n.toFixed(4))}`).sort();
  P.placeAt(W.spawnDir); live(0.3);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); phase(0.4);
  const layout = homes();
  assert.ok(of('gloomweaver').length > 0 && of('snuffer').length > 0, 'Continue rebuilds both kinds');
  assert.ok(of('snuffer').every(e => e.stolen === 0), 'and no snuffer is still holding stolen oil');
  assert.equal(webs().length, 0, 'webs are spun afresh, never restored: a save cannot leave the hollows strung up');
  H.goToPlanet('emberfall'); step(0.3);
  assert.equal(of('gloomweaver').length + of('snuffer').length + webs().length, 0, 'no other world has them');
  assert.equal(P.mireK, 1, 'and nothing of theirs follows the hero off the planet');
  H.goToPlanet('lanternmoss'); step(0.3);
  assert.deepEqual(homes(), layout, 'portal travel brings them back the same way');
  pass('Continue and portal travel rebuild the weavers and thieves clean: no held oil, no standing webs');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
