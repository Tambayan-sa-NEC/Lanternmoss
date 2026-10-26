// TODO 31a (rematch lifecycle and rewards): a beaten lair offers the fight again, harder, for its own loot - and
// the campaign never moves. No trophy, no key, no portal opening, no achievement and no first-win banner may
// repeat; the ladder is saved, a fight in progress is not, and travel, a faint or a reload put the lair back.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { REMATCH, rematchReady, rematchTier } = await imp('config/rematch.js');
const { Rematch } = await imp('gameplay/Rematch.js');
const { damageEnemy } = await imp('combat/damage.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { Chests } = await imp('gameplay/Chests.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const P = H.player;
const pass = m => console.log(`PASS  ${m}`);
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
/** Beats whatever boss is standing, through the real damage path. */
const beatBoss = () => { const b = ctx.boss; H.wakeBoss(); live(0.3); damageEnemy(b, b.def.hp * 3); live(1.2); return b; };
const atLair = () => { P.placeAt(H.BossGate.lair); P.vel.set(0, 0, 0); live(0.3); };

try {
  H.Tutorial.skip(); P.invuln = 1e4; live(0.5);

  // ---- nothing is offered until a kit exists, and never before the win ------------------------------------------
  assert.ok(rematchReady(COMBAT.enemies.gloomcap), 'the Moss King has his kit (31b)');
  assert.ok(rematchReady(COMBAT.enemies.pyrrhax), 'and the wyrm has his (31c)');
  assert.ok(!rematchReady(COMBAT.enemies.malgrath), 'but the worlds whose stages have not run do not (31d)');
  atLair();
  assert.equal(Rematch.offered, false, 'an unbeaten lair offers no rematch');
  assert.equal(Rematch.target(), null);

  // ---- the first win is the campaign's, and only the campaign's ---------------------------------------------------
  const coinsBefore = P.coins;
  beatBoss();
  assert.ok(game.planets.defeated.has('lanternmoss'), 'the campaign records the win');
  assert.equal(H.BossGate.state, 'beaten');
  const trophyChest = Chests.bossChest;
  assert.ok(trophyChest, 'and the trophy chest falls');
  const firstWins = game.planets.defeated.size;
  pass('the first win is the campaign win: the world is recorded and its trophy chest falls');

  // ---- your treasure first, then the fight again --------------------------------------------------------------------
  live(6); atLair();
  assert.equal(Rematch.offered, false, 'while the trophy chest is still lying there, nothing else is offered');
  const open = currentInteraction();
  assert.match(open?.label ?? '', /Treasure chest/, `the chest is what the lair offers first (${open?.label})`);
  open.run(); live(0.4);
  assert.ok(trophyChest.opened, 'the treasure is collected');
  live(0.3); atLair();
  assert.ok(Rematch.offered, 'and then a beaten lair with a finished kit offers a rematch');
  const prompt = currentInteraction();
  assert.match(prompt?.label ?? '', /Challenge .* again/, `and says so at the lair (${prompt?.label})`);
  assert.match(prompt.label, /rematch 1/);
  P.placeAt(offsetDir(H.BossGate.lair, 0, REMATCH.reach + 6)); live(0.2);
  assert.equal(Rematch.target(), null, 'but only when the hero is at the lair');
  atLair();

  // ---- it is harder, and it is the same fight ----------------------------------------------------------------------
  const base = COMBAT.enemies.gloomcap, campaignHp = ctx.boss.def.hp;
  prompt.run(); live(0.6);
  // the challenger is a fresh encounter, never the lair's own boss: that is what keeps the campaign's win unique
  const again = Rematch.fighting;
  const t = rematchTier(0);
  assert.equal(Rematch.active, 'lanternmoss', 'the rematch is running');
  assert.ok(again && again !== ctx.boss, 'it is a new challenger, not the beaten lair boss');
  assert.ok(again.alive && again.hp > campaignHp, `it is tougher than the campaign fight (${again.hp} vs ${campaignHp})`);
  assert.ok(Math.abs(again.def.hp - Math.round(campaignHp * t.hp)) <= 1, `exactly tier 1's ${t.hp}x health`);
  assert.equal(again.def.behavior ?? again.def.ai, base.behavior ?? base.ai, 'and it is the same kit, not a new monster');
  assert.equal(Rematch.offered, false, 'a rematch in progress is not offered again');
  pass(`a beaten lair offers the fight again at tier 1: ${t.hp}x health, ${t.damage}x damage`);

  // ---- winning it pays its own way, and moves nothing of the campaign's ---------------------------------------------
  const coins = P.coins, defeatedBefore = new Set(game.planets.defeated);
  const trophies = H.inventory.count('mossCrown');
  damageEnemy(again, again.def.hp * 3); live(1.2);
  assert.ok(!again.alive, 'the rematch is won');
  assert.equal(Rematch.won('gloomcap'), 1, 'and counted');
  assert.deepEqual([...game.planets.defeated], [...defeatedBefore], 'the campaign record does not move');
  assert.equal(game.planets.defeated.size, firstWins);
  assert.equal(H.inventory.count('mossCrown'), trophies, 'no second trophy');
  assert.ok(P.coins > coins, 'it pays coins of its own');
  const chest = Chests.list.find(c => c.id === 'lanternmoss:rematch:gloomcap:1');
  assert.ok(chest, 'and leaves its own chest');
  assert.notEqual(chest.kind, 'boss', 'which is not the first win\'s trophy chest');
  assert.equal(Chests.bossChest, trophyChest, 'the trophy chest it already dropped is untouched');
  pass('a rematch win pays its own coins and chest, and never repeats the first win\'s rewards');

  // ---- the ladder climbs, and tops out --------------------------------------------------------------------------
  Rematch.cool = {};
  for (const c of Chests.list) if (!c.opened) { P.placeAt(c.up); live(0.2); c.open(); }   // its chest first, again
  live(0.3); atLair();
  assert.match(currentInteraction()?.label ?? '', /rematch 2/, 'the next one is offered');
  assert.equal(Rematch.tier('gloomcap').hp, REMATCH.tiers[1].hp, 'at the second tier');
  Rematch.wins.gloomcap = 99;
  assert.deepEqual(Rematch.tier('gloomcap'), REMATCH.tiers.at(-1), 'and the ladder has a top rather than running away');
  Rematch.wins.gloomcap = 1;
  pass(`the ladder climbs through ${REMATCH.tiers.length} tiers and then holds`);

  // ---- a rematch never survives a journey, a faint or a reload ----------------------------------------------------
  Rematch.cool = {}; atLair();
  currentInteraction().run(); live(0.5);
  assert.equal(Rematch.active, 'lanternmoss');
  H.goToPlanet('emberfall'); live(0.5);
  assert.equal(Rematch.active, null, 'travelling calls it off');
  H.goToPlanet('lanternmoss'); live(0.5);
  assert.equal(H.BossGate.state, 'beaten', 'and the lair is simply beaten again');
  assert.ok(Rematch.offered, 'offering again on the next visit');
  assert.equal(Rematch.won('gloomcap'), 1, 'with the ladder where it was');

  Rematch.cool = {}; atLair(); currentInteraction().run(); live(0.5);
  assert.equal(Rematch.active, 'lanternmoss');
  const { hurtPlayer } = await imp('combat/damage.js');
  P.invuln = 0; hurtPlayer(9999, P.pos, 0, { source: 'a test', lethal: true }); live(0.3);
  assert.ok(P.dead, 'the hero faints');
  assert.equal(Rematch.active, null, 'a faint calls it off too');
  live(4); P.invuln = 1e4; heal();

  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); live(0.5);
  assert.equal(Rematch.won('gloomcap'), 1, 'Continue remembers how many are won');
  assert.equal(Rematch.active, null, 'and never restores a fight in progress');
  assert.equal(H.BossGate.state, 'beaten');
  pass('a rematch never survives travel, a faint or a reload: the ladder is saved, the fight is not');

  // ---- the lantern gate says where one is waiting -------------------------------------------------------------------
  const waiting = Rematch.waiting(game.planets.defeated);
  assert.ok(waiting.has('lanternmoss'), 'the gate knows this world has one');
  const here = H.Portals.destinations().find(d => d.id === 'lanternmoss');
  assert.equal(here.rematch, true, 'and marks it in the destination list');
  assert.match(here.reason, /rematch waits/);
  assert.ok(H.Portals.destinations().filter(d => d.rematch).every(d => game.planets.defeated.has(d.id)),
    'only beaten worlds are ever marked');
  pass('the lantern gate marks the worlds whose lairs will fight again');
  console.log('all passed');
} finally { /* nothing to restore: the Moss kits are authored (31b) */ }
