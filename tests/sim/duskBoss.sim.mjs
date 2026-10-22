// TODO 30g (Grandmother Gloomweaver): Duskhollow's mini boss in the borrowed development slot (the world stays
// unreleased). She hangs in her own web where nothing can touch her; her three anchor strands cannot be cut, only
// burnt, by a lit belt lantern or by fire; the last one parts and she falls, dazed, then fights on the ground; at
// each threshold but the last she climbs back up and spins a fresh set. She guards the moonstone vein, she wears
// the same beetle silhouette her grandchildren do, and a beaten grandmother stays beaten across Continue and travel.
import assert from 'node:assert/strict';
import { installDuskBossFixture } from './lib/duskBossFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskBossFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { COMBAT } = await imp('config/combat.js');
const { damageEnemy } = await imp('combat/damage.js');
const { encounterEvents } = await imp('combat/events.js');
const { setSetting } = await imp('core/settings.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { burning, charOf } = await imp('entities/enemies/behaviors/anchor.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const P = H.player, W = game.world;
const lamp = () => H.Mechanics.active.instance;
const granny = () => ctx.enemies.find(e => e.type === 'grandweaver');
const strands = () => ctx.enemies.filter(e => e.type === 'gloomAnchor' && e.alive);
const pass = m => console.log(`PASS  ${m}`);
const phase = f => { dayClock.skip((f * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.1); };
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
const refused = [];
encounterEvents.addEventListener('enemyrefused', e => refused.push(e.detail.enemy.type));
/** Stands the hero at a strand with a full lantern and holds there until it burns through. */
const burnWithLantern = a => {
  lamp().refill(1e6);
  P.placeAt(offsetDir(a.up, 0.5, a.def.reach * 0.6)); P.vel.set(0, 0, 0); live(0.2);
  assert.ok(burning(a), 'a lit lantern held this close really is burning it');
  live(a.def.burnTime + 0.5);
};

try {
  H.Tutorial.skip(); H.goToPlanet('lanternmoss'); H.Pets.command('passive'); phase(0.4); heal();

  // ---- she is up in her web, over the vein she guards ---------------------------------------------------------------
  const g = granny();
  assert.ok(g, 'Duskhollow has its mini boss');
  assert.ok(g.def.miniBoss && g.def.ai === 'boss');
  P.placeAt(offsetDir(g.home, 0, 7)); live(1.5);
  assert.ok(g.hung, 'she starts hanging in her web');
  assert.equal(strands().length, COMBAT.enemies.grandweaver.anchors.count, 'on three anchor strands');
  assert.ok(g.hover > COMBAT.enemies.grandweaver.anchors.hang * 0.8, `well out of reach (${g.hover.toFixed(1)} m up)`);
  const vein = H.Gathering.nodes.find(n => n.def.guardedBy);
  assert.ok(vein, 'the moonstone vein is placed');
  assert.equal(vein.def.guardedBy, 'grandweaver', 'and it is hers to guard');
  assert.ok(arcDist(vein.up, g.home) < 20, `right by her (${arcDist(vein.up, g.home).toFixed(1)} m)`);
  P.placeAt(vein.up); live(0.3);
  assert.match(currentInteraction()?.label ?? '', /guarded/, 'and the prompt says so while she lives');
  pass('Grandmother Gloomweaver hangs on three strands over the moonstone vein she guards');

  // ---- nothing you do touches her up there ---------------------------------------------------------------------------
  P.placeAt(offsetDir(g.home, 0, 5)); live(0.3);
  const full = g.hp; refused.length = 0;
  damageEnemy(g, 400); damageEnemy(g, 400, { fire: true });
  assert.equal(g.hp, full, 'every blow glances off a hanging spider');
  assert.ok(refused.includes('grandweaver'), 'and the hit is refused, not silently ignored');
  pass('while she is up in the web, hitting her is simply not the answer');

  // ---- the strands: a blade will not do, a lit lantern will, fire does it in one ---------------------------------------
  const first = strands()[0];
  refused.length = 0; damageEnemy(first, 999);
  assert.ok(first.alive && refused.includes('gloomAnchor'), 'a blade glances off a cable that thick');

  lamp().burn(1e6);                                                    // an empty lantern is no fire at all
  P.placeAt(offsetDir(first.up, 0.5, first.def.reach * 0.6)); live(1.0);
  assert.ok(!burning(first) && charOf(first) === 0, 'an empty lantern chars nothing');

  burnWithLantern(first);
  assert.ok(!first.alive, 'a lit lantern held against a strand burns through it');
  assert.equal(strands().length, 2);

  const second = strands()[0];
  damageEnemy(second, 1, { fire: true });
  assert.ok(!second.alive, 'and a hit of fire takes one in a single touch');
  assert.ok(g.hung, 'two down: she is still up there');
  pass('her strands cannot be cut, only burnt: every hero by lantern, the witch by fire');

  // ---- the last strand parts and she comes down -------------------------------------------------------------------------
  const last = strands()[0];
  damageEnemy(last, 1, { fire: true });
  live(0.2);
  assert.equal(strands().length, 0);
  assert.equal(g.hung, false, 'the last strand parts and she falls');
  assert.equal(g.state, 'transition');
  const S = COMBAT.enemies.grandweaver.anchors;
  live(S.drop + 0.2);
  assert.ok(g.hover < 1, `she is on the ground (${g.hover.toFixed(2)} m)`);
  const dazedHp = g.hp;
  damageEnemy(g, 100);
  assert.ok(g.hp < dazedHp, 'and lying there she takes everything');
  live(S.dazed + 0.5);
  assert.equal(g.state === 'transition', false, 'then she finds her feet and fights');
  pass('burning the last strand drops her, dazed and open, before she gets up');

  // ---- she climbs back up at each threshold but the last ------------------------------------------------------------------
  const toFraction = f => { damageEnemy(g, Math.max(1, g.hp - g.def.hp * f)); live(0.3); };
  toFraction(0.55);
  assert.equal(g.bossPhase, 1, 'the second web');
  assert.ok(g.hung && strands().length === S.count, 'she is back up on a fresh set of strands');
  for (const a of [...strands()]) damageEnemy(a, 1, { fire: true });
  live(S.drop + S.dazed + 0.6);
  assert.ok(!g.hung, 'burn them again and down she comes again');

  toFraction(0.25);
  assert.equal(g.bossPhase, 2, 'the last web');
  assert.ok(g.hung && strands().length === S.count, 'one more set');
  for (const a of [...strands()]) damageEnemy(a, 1, { fire: true });
  live(S.drop + S.dazed + 0.6);
  assert.ok(!g.hung);
  pass('she re-anchors at 60% and 30%: three rounds of burn-the-strands and fight-her-down');

  // ---- the beetle silhouette covers her too -------------------------------------------------------------------------------
  setSetting('roundBeetles', true); live(0.2);
  assert.ok(!g.spider.visible && g.beetle.visible, 'the accessibility setting takes the grandmother off the screen as well');
  assert.ok(ctx.enemies.filter(e => e.type === 'gloomweaver' && e.alive).every(e => e.beetle.visible),
    'the same switch, the same frame, for her grandchildren');
  setSetting('roundBeetles', false); live(0.2);
  assert.ok(g.spider.visible);
  pass('one setting draws the mini boss and her grandchildren as beetles together');

  // ---- beaten: the reward, the vein, and a defeat that sticks -----------------------------------------------------------
  const silkBefore = H.inventory.count('spiderSilk');
  damageEnemy(g, g.def.hp * 2);
  live(0.5);
  assert.ok(!g.alive, 'she goes down');
  assert.equal(strands().length, 0, 'and takes her strands with her');
  assert.equal(g.hung, false);
  const loot = ctx.worldItems.map(w => w.itemId);
  assert.ok(loot.includes('moonstone') || H.inventory.count('moonstone') > 0, `she leaves a moonstone (${loot.join(', ')})`);
  assert.ok(loot.includes('spiderSilk') || H.inventory.count('spiderSilk') > silkBefore, 'and her silk');
  P.placeAt(vein.up); live(0.3);
  const prompt = currentInteraction()?.label ?? '';
  assert.ok(/Mine/.test(prompt) && !/guarded/.test(prompt), `the vein is yours to mine now (${prompt})`);

  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); phase(0.4);
  assert.equal(granny()?.alive ?? false, false, 'Continue remembers she was beaten');
  assert.equal(strands().length, 0, 'and puts no strands back up');
  H.goToPlanet('emberfall'); step(0.3);
  assert.equal(granny(), undefined, 'no other world has her');
  H.goToPlanet('lanternmoss'); step(0.3);
  assert.equal(granny()?.alive ?? false, false, 'and travelling back does not bring her back');
  pass('a beaten grandmother leaves her silk and her moonstone, frees the vein, and stays beaten');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
