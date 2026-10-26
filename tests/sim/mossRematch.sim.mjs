// TODO 31b (Moss rematches): Gloomcap and the Hydra fight differently the second time. Both wear the shared thorn
// signature - marked ground that bursts into briars and holds the hero in them - and neither can reach it in the
// campaign fight. The mini boss can be challenged again where it fell, every hero gets the same window on the new
// move, and the rewards repeat without repeating the first win's.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { Rematch } = await imp('gameplay/Rematch.js');
const { rematchReady } = await imp('config/rematch.js');
const { damageEnemy } = await imp('combat/damage.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { Chests } = await imp('gameplay/Chests.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { hazardsOf } = await imp('combat/hazards.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const { dryGround } = await imp('world/terrain.js');
const { encounterEvents } = await imp('combat/events.js');
const hurts = [];
encounterEvents.addEventListener('playerhurt', e => hurts.push(e.detail.source));
const P = H.player;
const pass = m => console.log(`PASS  ${m}`);
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
const of = type => ctx.enemies.find(e => e.type === type);
/** Collects whatever treasure is lying about: a rematch is only offered once the last one's chest is open. */
const collect = () => {
  for (const chest of Chests.list) if (!chest.opened) { P.placeAt(chest.up); live(0.2); chest.open(); }
  live(0.4);
};
/** Parks an encounter between checks, so nothing it does colours the next one. */
const calm = e => { e.cool = 1e9; e.state = 'chase'; e.hideTele(); };
/** Makes the fight pick exactly this move next, through the framework's own picker. */
const only = (e, id) => {
  for (const p of e.def.phases) p.attacks = [id];
  e.moveCd = {}; e.cool = 0; e.lastAttack = null; e.state = 'chase';
};
/** Runs the named move and watches the whole of it: the hazards it marks (they detonate and are gone again
    within the window, so the peak is what matters) and whether the hero was caught and held. */
const cast = (e, id, { keepAlive = true } = {}) => {
  only(e, id);
  const out = { fired: false, marked: 0, rooted: 0, hurt: false };
  const hp = P.hp;
  // just long enough for the wind-up, the eruption and its settle: any longer and the fight's own fallback move
  // (Gloomcap answers with a spore volley) would land in the window and colour what this move did
  step(e.def.attacks[id].windup + 1.6, () => {
    if (keepAlive) heal(); else if (P.hp < hp) out.hurt = true;
    if (e.attack === id && (e.state === 'recover' || e.state === 'active')) out.fired = true;
    out.marked = Math.max(out.marked, hazardsOf(e).length);
    out.rooted = Math.max(out.rooted, P.petrifyT ?? 0);
  });
  return out;
};

try {
  H.Tutorial.skip(); P.invuln = 1e4; live(0.5);

  // ---- the campaign fight never sees the new moves -----------------------------------------------------------------
  const campaign = ctx.boss, kit = COMBAT.enemies.gloomcap.rematch;
  const newMoves = Object.keys(kit.attacks);
  assert.ok(newMoves.length > 0, 'the Moss King learned something');
  assert.ok(newMoves.every(id => !campaign.def.phases.some(p => p.attacks.includes(id))),
    'and none of it is in the fight you already had');

  pass(`Gloomcap's rematch adds ${newMoves.join(' and ')}, neither reachable in the campaign fight`);

  // ---- beat it once, then challenge it again ------------------------------------------------------------------------
  H.wakeBoss(); live(0.3); damageEnemy(campaign, campaign.def.hp * 3); live(1.2);
  assert.ok(game.planets.defeated.has('lanternmoss'));
  live(6); collect();                                                  // the trophy first: a rematch waits for it
  P.placeAt(H.BossGate.lair); live(0.4);
  currentInteraction().run(); live(0.8);
  const boss = Rematch.fighting;
  assert.ok(boss && boss !== campaign, 'a fresh challenger, not the lair boss');
  assert.equal(Rematch.active, 'lanternmoss');
  assert.deepEqual(boss.def.phases.map(p => p.title), kit.phases.map(p => p.title), 'it fights its rematch phases');
  for (const id of newMoves) assert.ok(boss.def.attacks[id], `${id} has its numbers in this fight`);
  pass('a rematch swaps in the whole kit, not just bigger numbers');

  // ---- the thorn signature: telegraphed, and it holds whoever stands still ---------------------------------------------
  // `thorns` is a crown around the King (walk out of the ring); `bloom` is sown where the hero is running (keep moving).
  P.placeAt(offsetDir(boss.up, 0, 4.5)); P.vel.set(0, 0, 0); P.invuln = 0; P.petrifyT = 0; live(0.3);
  const crown = cast(boss, 'thorns');
  assert.ok(crown.fired, 'the crown of thorns fires');
  assert.ok(crown.marked >= 2, `and marks a whole ring of ground first (${crown.marked} patches)`);
  calm(boss); live(1); heal(); P.petrifyT = 0;

  P.placeAt(offsetDir(boss.up, 1.4, 6)); P.vel.set(0, 0, 0); P.petrifyT = 0; live(0.3);
  const bloom = cast(boss, 'bloom');
  assert.ok(bloom.fired, 'the bloom is sown where the hero stands');
  assert.ok(bloom.marked > 0, 'marking the ground first');
  assert.ok(bloom.rooted > 0, `and a hero who stands still is held in it (${bloom.rooted.toFixed(2)}s)`);
  const marked = crown.marked, rooted = bloom.rooted;
  calm(boss); live(rooted + 0.8); heal();
  assert.ok(P.petrifyT <= 0, 'the briars let go by themselves');
  pass(`the thorn signature marks ${marked} patches, erupts, and holds the hero for ${rooted.toFixed(1)}s`);

  // ---- stepping off the marks is the answer, and it is the same answer for every hero ----------------------------------
  // The King is held still for this, so "outside the ring" means the same thing for each hero and the check is
  // about the move's reach and its warning, not about who can outrun it.
  const a = boss.def.attacks.thorns, clearOf = a.spread + a.radius + 4, walkSpeed = boss.def.speed;
  for (const e of ctx.enemies) if (e !== boss && e.alive) e.vanish();   // nothing else in the clearing to colour it
  boss.def = { ...boss.def, speed: 0 };
  for (const hero of ['witch', 'knight', 'ranger']) {
    applyCharacter(hero); heal(); P.petrifyT = 0; P.invuln = 0;
    P.placeAt(offsetDir(boss.up, 1.1, clearOf)); P.vel.set(0, 0, 0); live(0.3);
    const clear = cast(boss, 'thorns', { keepAlive: false });
    assert.ok(clear.fired, `${hero}: the move fires`);
    assert.ok(clear.marked >= 2, `${hero}: and marks the ground, in plain sight, before it erupts`);
    assert.ok(clear.rooted <= 0, `${hero}: standing clear of the marks is never held`);
    assert.equal(clear.hurt, false, `${hero}: and takes nothing from it (${hurts.slice(-3).join(', ')})`);
    calm(boss);
  }
  boss.def = { ...boss.def, speed: walkSpeed };
  applyCharacter('witch'); heal(); P.invuln = 1e4;
  pass('every hero can read the marks and step off them: the new move is a window, not a tax');

  // ---- winning it again pays again, without repeating the first win ------------------------------------------------------
  const keys = H.inventory.count('lanternKey'), crowns = H.inventory.count('mossCrown');
  damageEnemy(boss, boss.def.hp * 3); live(1.2);
  assert.equal(Rematch.won('gloomcap'), 1);
  assert.ok(H.inventory.count('lanternKey') > keys, 'the rematch hands over its own keepsake');
  assert.equal(H.inventory.count('mossCrown'), crowns, 'and never the trophy again');
  Rematch.cool = {}; collect();
  P.placeAt(H.BossGate.lair); live(0.4);
  currentInteraction().run(); live(0.8);
  const second = Rematch.fighting, keys2 = H.inventory.count('lanternKey');
  damageEnemy(second, second.def.hp * 3); live(1.2);
  assert.equal(Rematch.won('gloomcap'), 2, 'and it can be won again');
  assert.ok(H.inventory.count('lanternKey') > keys2, 'paying again each time');
  pass('a rematch pays its keepsake every time, and the trophy never a second time');

  // ---- the mini boss can be challenged where it fell -----------------------------------------------------------------
  assert.ok(rematchReady(COMBAT.enemies.hydra), 'the Hydra has a kit too (31b)');
  // the clearing was emptied for the per-hero check above, so the world is repopulated before meeting the Hydra
  H.goToPlanet('emberfall'); live(0.4); H.goToPlanet('lanternmoss'); live(0.6); P.invuln = 1e4; heal();
  const hydra = of('hydra');
  assert.ok(hydra, 'it is on this world');
  H.wakeBoss(); live(0.2);
  damageEnemy(hydra, hydra.def.hp * 4); live(1.2);
  assert.ok(!hydra.alive && game.planets.miniDefeated.has(hydra.portalId), 'beaten once, and remembered');
  Rematch.cool = {}; collect();
  P.placeAt(hydra.home); P.vel.set(0, 0, 0); live(0.4);
  const prompt = currentInteraction();
  assert.match(prompt?.label ?? '', /Challenge The Hydra again/, `its own prompt stands where it fell (${prompt?.label})`);
  prompt.run(); live(0.8);
  const challenger = Rematch.fighting;
  assert.ok(challenger?.alive && challenger.type === 'hydra', 'and one gets up where it fell');
  assert.equal(Rematch.active, 'lanternmoss');
  assert.equal(challenger.def.phases[0].heads, COMBAT.enemies.hydra.rematch.phases[0].heads, 'with every head it ever grew');
  assert.ok(challenger.def.attacks.briars, 'and the thorns it dragged out of the shore');
  // the Hydra keeps to its lake, and thorns do not grow out of water: stand it on dry ground for this
  let shore = null;
  for (let a = 0; a < 6.28 && !shore; a += 0.4) { const d = offsetDir(challenger.up, a, 4.5); if (dryGround(d, 2.5)) shore = d; }
  assert.ok(shore, 'there is dry ground by the lake to be caught on');
  P.placeAt(shore); P.vel.set(0, 0, 0); P.invuln = 0; P.petrifyT = 0; live(0.3);
  const thrown = cast(challenger, 'briars');
  assert.ok(thrown.fired, 'which it really throws');
  assert.ok(thrown.marked > 0 && thrown.rooted > 0, "and they catch the same way the King's do");
  P.petrifyT = 0; P.invuln = 1e4; heal();
  const miniKeys = H.inventory.count('lanternKey');
  damageEnemy(challenger, challenger.def.hp * 4); live(1.2);
  assert.equal(Rematch.won('hydra'), 1, 'its rematch is counted on its own ladder');
  assert.equal(Rematch.won('gloomcap'), 2, 'separately from the King\'s');
  assert.ok(H.inventory.count('lanternKey') > miniKeys, 'and pays its own keepsake');
  pass('the Hydra can be challenged again where it fell, with four heads and briars, on its own ladder');

  // ---- the gate marks the world for either of them -----------------------------------------------------------------------
  const here = H.Portals.destinations().find(d => d.id === 'lanternmoss');
  assert.equal(here.rematch, true, 'the lantern gate marks the world');
  pass('the lantern gate marks a world whose boss or mini boss will fight again');
  console.log('all passed');
} finally { /* the Moss kits are authored (31b): nothing to restore */ }
