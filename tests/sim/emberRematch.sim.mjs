// TODO 31c (Ember rematches): Pyrrhax and the Basilisk fight differently the second time. Both wear the shared
// dragonfire signature - a marked line of ground that then burns for seconds - and neither can reach it in the
// campaign fight. The signature is checked on its own terms as well as through the two kits: every wall it lays
// leaves exactly one segment unlit, that gap is a place a hero can really stand, and the fire keeps the rest of
// the line for its whole duration rather than striking once.
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
const { firewallOf } = await imp('entities/enemies/behaviors/boss/signatures.js');
const { offsetDir } = await imp('utils/sphere.js');
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
/** Runs the named wall and watches the whole of it: the line it chose while winding up, the burning ground it
    left, and whether the hero standing where `where(path)` says was hurt by it. */
const lay = (e, id, where = null) => {
  only(e, id);
  const a = e.def.attacks[id], out = { fired: false, path: null, burning: 0, hurt: false, moved: false };
  // the wind-up, the whole burn, and a moment after it goes out
  step(a.windup + a.duration + 0.6, () => {
    if (e.firePath && !out.path) {                                     // the line is chosen in the move's begin()
      out.path = e.firePath.map(s => ({ at: s.at.clone(), lit: s.lit }));
      if (where) { P.placeAt(where(out.path)); P.vel.set(0, 0, 0); P.invuln = 0; out.moved = true; }
    }
    if (e.attack === id && (e.state === 'recover' || e.state === 'active')) out.fired = true;
    out.burning = Math.max(out.burning, hazardsOf(e).length);
    if (P.hp < P.stats.maxHp) out.hurt = true;
    if (!where) heal();
  });
  return out;
};

try {
  H.Tutorial.skip(); P.invuln = 1e4; live(0.5);
  H.goToPlanet('emberfall'); live(0.6); heal();

  // ---- the campaign fight never sees the new moves -----------------------------------------------------------------
  const campaign = ctx.boss, kit = COMBAT.enemies.pyrrhax.rematch;
  assert.equal(campaign.type, 'pyrrhax', 'the wyrm is the boss of this world');
  const newMoves = Object.keys(kit.attacks);
  assert.ok(newMoves.length > 0, 'the wyrm learned something');
  assert.ok(newMoves.every(id => !campaign.def.phases.some(p => p.attacks.includes(id))),
    'and none of it is in the fight you already had');
  pass(`Pyrrhax's rematch adds ${newMoves.join(' and ')}, neither reachable in the campaign fight`);

  // ---- beat it once, then challenge it again ------------------------------------------------------------------------
  H.wakeBoss(); live(0.3); damageEnemy(campaign, campaign.def.hp * 3); live(1.2);
  assert.ok(game.planets.defeated.has('emberfall'));
  live(6); collect();                                                  // the trophy first: a rematch waits for it
  P.placeAt(H.BossGate.lair); live(0.4);
  currentInteraction().run(); live(0.8);
  const boss = Rematch.fighting;
  assert.ok(boss && boss !== campaign, 'a fresh challenger, not the lair wyrm');
  assert.equal(Rematch.active, 'emberfall');
  assert.deepEqual(boss.def.phases.map(p => p.title), kit.phases.map(p => p.title), 'it fights its rematch phases');
  for (const id of newMoves) assert.ok(boss.def.attacks[id], `${id} has its numbers in this fight`);
  pass('a rematch swaps in the whole kit, not just bigger numbers');

  // ---- the dragonfire signature: a line that burns, with one segment left out ----------------------------------------
  // The wyrm is held still for these, so what the wall does is about the move and not about the chase.
  const walkSpeed = boss.def.speed;
  for (const e of ctx.enemies) if (e !== boss && e.alive) e.vanish();
  boss.def = { ...boss.def, speed: 0 };
  P.placeAt(offsetDir(boss.up, 0, 7)); P.vel.set(0, 0, 0); live(0.3); heal();

  const wall = lay(boss, 'firewall');
  assert.ok(wall.fired, 'the firewall fires');
  assert.ok(wall.path, 'and it chooses its whole line while winding up, in plain sight');
  const lit = wall.path.filter(s => s.lit).length, dark = wall.path.filter(s => !s.lit);
  assert.equal(dark.length, 1, `exactly one segment is left unlit (${lit} lit of ${wall.path.length})`);
  assert.ok(wall.burning >= 2, `and the lit ones really burn the ground (${wall.burning} patches)`);
  calm(boss); live(0.6); heal();
  pass(`the firewall lays ${wall.path.length} segments, burns ${wall.burning} of them, and leaves one way through`);

  // the gap is not decoration: a hero who stands in it takes nothing for the wall's whole duration
  const gapRun = lay(boss, 'firewall', path => path.find(s => !s.lit).at);
  assert.ok(gapRun.moved && gapRun.fired, 'the wall fires with the hero standing in its gap');
  assert.equal(gapRun.hurt, false, 'and the gap is a real way through: standing in it takes nothing');
  P.invuln = 1e4; calm(boss); live(0.6); heal();

  // and standing in a lit segment is exactly what it costs
  const burnRun = lay(boss, 'firewall', path => path.find(s => s.lit).at);
  assert.ok(burnRun.fired, 'the same wall fires again');
  assert.equal(burnRun.hurt, true, 'and standing in the fire is what it costs');
  P.invuln = 1e4; calm(boss); live(0.6); heal();
  pass('the wall is area denial, not a cage: the gap is safe for its whole burn, the fire is not');

  // the short wall under the hero's feet is the same signature with its own numbers
  P.placeAt(offsetDir(boss.up, 1.2, 6)); P.vel.set(0, 0, 0); live(0.3); heal();
  const short = lay(boss, 'scorch');
  assert.ok(short.fired && short.path, 'the scorch fires too');
  assert.equal(short.path.filter(s => !s.lit).length, 1, 'with its own single gap');
  assert.ok(short.path.length < wall.path.length, `and it is the shorter line (${short.path.length} vs ${wall.path.length})`);
  calm(boss); live(0.6); heal();
  pass('the signature is worn twice by one encounter, tuned differently each time');

  // ---- the gap is in the same place for every hero -------------------------------------------------------------------
  // No hero is asked to outrun the wall: each is put in the marked gap and must simply be left alone there.
  for (const hero of ['witch', 'knight', 'ranger']) {
    applyCharacter(hero); heal(); P.invuln = 0;
    P.placeAt(offsetDir(boss.up, 2.2, 7)); P.vel.set(0, 0, 0); live(0.3); heal();
    const run = lay(boss, 'firewall', path => path.find(s => !s.lit).at);
    assert.ok(run.fired, `${hero}: the wall fires`);
    assert.equal(run.hurt, false, `${hero}: the gap is a way through for this hero too`);
    P.invuln = 1e4; calm(boss); live(0.6); heal();
  }
  applyCharacter('witch'); heal(); P.invuln = 1e4;
  boss.def = { ...boss.def, speed: walkSpeed };
  pass('every hero can read the lane and stand in its gap: the wall is a window, not a tax');

  // ---- winning it again pays again, without repeating the first win ----------------------------------------------------
  const opals = H.inventory.count('fireOpal'), crowns = H.inventory.count('emberCrown');
  damageEnemy(boss, boss.def.hp * 3); live(1.2);
  assert.equal(Rematch.won('pyrrhax'), 1);
  assert.ok(H.inventory.count('fireOpal') > opals, 'the rematch hands over its own keepsake');
  assert.equal(H.inventory.count('emberCrown'), crowns, 'and never the horn crown again');
  pass('a rematch pays its keepsake, and the trophy never a second time');

  // ---- the mini boss wears the same signature once, in its own colours ---------------------------------------------------
  assert.ok(rematchReady(COMBAT.enemies.basilisk), 'the Basilisk has a kit too (31c)');
  // the arena was emptied for the checks above, so the world is repopulated before meeting the Stone-Gazer
  H.goToPlanet('lanternmoss'); live(0.4); H.goToPlanet('emberfall'); live(0.6); P.invuln = 1e4; heal();
  const gazer = of('basilisk');
  assert.ok(gazer, 'it is on this world');
  damageEnemy(gazer, gazer.def.hp * 4); live(1.2);
  assert.ok(!gazer.alive && game.planets.miniDefeated.has(gazer.portalId), 'beaten once, and remembered');
  Rematch.cool = {}; collect();
  P.placeAt(gazer.home); P.vel.set(0, 0, 0); live(0.4);
  const prompt = currentInteraction();
  assert.match(prompt?.label ?? '', /Challenge The Basilisk again/, `its own prompt stands where it fell (${prompt?.label})`);
  prompt.run(); live(0.8);
  const challenger = Rematch.fighting;
  assert.ok(challenger?.alive && challenger.type === 'basilisk', 'and one gets up where it fell');
  assert.equal(Rematch.active, 'emberfall');
  assert.ok(challenger.def.attacks.cinders, 'with the burning venom it never spat the first time');
  for (const e of ctx.enemies) if (e !== challenger && e.alive) e.vanish();
  challenger.def = { ...challenger.def, speed: 0 };
  P.placeAt(offsetDir(challenger.up, 0, 6)); P.vel.set(0, 0, 0); live(0.3); heal();
  const venom = lay(challenger, 'cinders');
  assert.ok(venom.fired && venom.path, 'which it really spits');
  assert.equal(venom.path.filter(s => !s.lit).length, 1, 'with the signature\'s one way through');
  assert.ok(venom.burning >= 2, `and the same burning ground (${venom.burning} patches)`);
  P.invuln = 1e4; calm(challenger); live(0.6); heal();
  const quartz = H.inventory.count('cinderquartz');
  damageEnemy(challenger, challenger.def.hp * 4); live(1.2);
  assert.equal(Rematch.won('basilisk'), 1, 'its rematch is counted on its own ladder');
  assert.equal(Rematch.won('pyrrhax'), 1, 'separately from the wyrm\'s');
  assert.ok(H.inventory.count('cinderquartz') > quartz, 'and pays its own keepsake');
  pass('the Basilisk can be challenged again where it fell, spitting cinders, on its own ladder');

  // ---- one signature, two encounters, and still the same rule ---------------------------------------------------------
  // Read straight from the signature, for both wearers at once: whatever line it is asked for, one segment is out.
  let checked = 0;
  for (const [e, ids] of [[boss, ['firewall', 'scorch']], [challenger, ['cinders']]]) {
    for (const id of ids) for (let i = 0; i < 20; i++) {
      const path = firewallOf(e, id);
      assert.equal(path.length, e.def.attacks[id].segments, `${id}: the line is the length the kit asked for`);
      assert.equal(path.filter(s => !s.lit).length, 1, `${id}: and never more or fewer than one gap`);
      assert.ok(path[0].lit && path.at(-1).lit, `${id}: the gap is inside the wall, not an end of it`);
      checked++;
    }
  }
  pass(`the shared signature keeps its rule across ${checked} lines drawn for both encounters`);

  // ---- the gate marks the world for either of them -----------------------------------------------------------------------
  const here = H.Portals.destinations().find(d => d.id === 'emberfall');
  assert.equal(here.rematch, true, 'the lantern gate marks the world');
  pass('the lantern gate marks a world whose boss or mini boss will fight again');
  console.log('all passed');
} finally { /* the Ember kits are authored (31c): nothing to restore */ }
