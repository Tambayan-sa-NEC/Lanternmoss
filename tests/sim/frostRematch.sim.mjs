// TODO 31d (Frost rematches): Malgrath fights differently the second time, and the Frost Hydra fights again as
// itself. Malgrath wears the shared Doom Blade signature twice more - `reckoning`, whose killing circle hunts the
// hero while it aims, and `eclipse`, the first killing blow his ascended phase has ever had - and neither is
// reachable in the campaign fight. The circle is marked for the whole wind-up, fixed once it commits, and a hero
// who simply runs gets out of it on foot, so it is a window rather than a tax; the buried blade leaves a real
// punish window afterwards. The Frost Hydra reuses the proven Hydra kit, but as the cold variant it actually is,
// on a ladder of its own: beating Lanternmoss's Hydra is not practice for Frostveil's.
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
const { doomCircleOf } = await imp('entities/enemies/behaviors/boss/signatures.js');
const { arcDist, offsetDir, tangentToward } = await imp('utils/sphere.js');
const P = H.player, keys = H.keys;
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
const calm = e => { e.cool = 1e9; e.state = 'chase'; e.hideTele(); keys.KeyW = false; };
/** Makes the fight pick exactly this move next, through the framework's own picker. */
const only = (e, id) => {
  for (const p of e.def.phases) p.attacks = [id];
  e.moveCd = {}; e.cool = 0; e.lastAttack = null; e.state = 'chase';
  e.aggro();                                                           // a hero who fainted has to be noticed again
};
/** Puts the hero back on their feet after the Doom Blade does what it is for. */
const revive = () => { live(4); P.invuln = 1e4; heal(); };

/** Runs the named Doom Blade and watches the whole of it: how long its circle was on the ground, whether the
    circle stayed put once the blow committed, and what became of a hero who either stood still or ran for it
    on foot (no sprint, no dodge: the floor of what every hero can do). */
const doom = (e, id, { run = false, from = 6, heading = 0 } = {}) => {
  P.placeAt(offsetDir(e.up, heading, from)); P.vel.set(0, 0, 0); P.invuln = 1e4; live(0.3); heal();
  only(e, id);
  const a = e.def.attacks[id], out = { fired: false, marked: 0, at: null, fixed: null, dead: false, clear: 0 };
  P.invuln = 0; heal();
  let raised = false;
  step(a.windup + 0.8, () => {
    const c = doomCircleOf(e, id);
    if (e.attack === id && e.state === 'windup' && c) {
      raised = true;
      out.marked++; out.at = c.at;
      if (out.marked === 1) out.radius = c.radius;
      if (e.timer <= a.windup * (1 - (a.commit ?? 0.45))) out.fixed ??= c.at.clone();   // committed: it moves no more
      if (run && !P.dead) {                                            // turn tail and keep running, every frame
        const away = tangentToward(P.up, c.at).negate();
        H.cam.fwd.copy(away); P.fwd.copy(away); keys.KeyW = true;
      }
    } else if (raised) out.fired = true;                               // the blade was up, and then it came down
    if (P.dead) out.dead = true;
  });
  keys.KeyW = false;
  if (out.at) out.clear = arcDist(P.up, out.at) - (out.radius ?? 0);    // how far outside the circle the hero ended
  return out;
};

try {
  H.Tutorial.skip(); P.invuln = 1e4; live(0.5);
  H.goToPlanet('frostveil'); live(0.6); heal();

  // ---- the campaign fight never sees the new moves -----------------------------------------------------------------
  const campaign = ctx.boss, kit = COMBAT.enemies.malgrath.rematch;
  assert.equal(campaign.type, 'malgrath', 'the Demon Lord is the boss of this world');
  const newMoves = Object.keys(kit.attacks);
  assert.ok(newMoves.length > 0, 'the Demon Lord learned something');
  assert.ok(newMoves.every(id => !campaign.def.phases.some(p => p.attacks.includes(id))),
    'and none of it is in the fight you already had');
  assert.ok(campaign.def.phases[0].attacks.includes('doom'), 'while the campaign Doom Blade is where it always was');
  pass(`Malgrath's rematch adds ${newMoves.join(' and ')}, neither reachable in the campaign fight`);

  // ---- beat him once, then challenge him again -----------------------------------------------------------------------
  H.wakeBoss(); live(0.3); damageEnemy(campaign, campaign.def.hp * 3); live(1.2);
  assert.ok(game.planets.defeated.has('frostveil'));
  live(6); collect();                                                  // the trophy first: a rematch waits for it
  P.placeAt(H.BossGate.lair); live(0.4);
  currentInteraction().run(); live(0.8);
  const boss = Rematch.fighting;
  assert.ok(boss && boss !== campaign, 'a fresh challenger, not the lair lord');
  assert.equal(Rematch.active, 'frostveil');
  assert.deepEqual(boss.def.phases.map(p => p.title), kit.phases.map(p => p.title), 'he fights his rematch phases');
  assert.equal(boss.def.phases.at(-1).flying, true, 'and the second of them still takes him into the air');
  for (const id of newMoves) assert.ok(boss.def.attacks[id], `${id} has its numbers in this fight`);
  pass('a rematch swaps in the whole kit, not just bigger numbers');

  // ---- the Doom Blade signature: marked all the way, fixed once it commits, and survivable on foot -------------------
  // He is held still for these, so what the blow does is about the move and not about the chase. A hero who dies
  // to it ends the rematch, so the survivable checks come first and the killing one is saved for last.
  const walkSpeed = boss.def.speed;
  for (const e of ctx.enemies) if (e !== boss && e.alive) e.vanish();
  boss.def = { ...boss.def, speed: 0 };

  const ran = doom(boss, 'reckoning', { run: true });
  assert.ok(ran.fired, 'the reckoning falls');
  const frames = Math.round(boss.def.attacks.reckoning.windup * 60);
  assert.ok(ran.marked > frames * 0.8, `its circle is on the ground for the whole wind-up (${ran.marked} of ~${frames} frames)`);
  assert.ok(ran.fixed && arcDist(ran.fixed, ran.at) < 0.05, 'and stops moving once the blade commits');
  assert.equal(ran.dead, false, 'a hero who simply turns and runs gets out of it on foot');
  assert.ok(ran.clear > 0.5, `with room to spare (${ran.clear.toFixed(1)} m outside the circle)`);
  assert.equal(boss.state, 'recover', 'the blade stays buried afterwards');
  const buried = boss.cool;
  assert.ok(buried > 1.5, `leaving a real punish window before he can do anything else (${buried.toFixed(1)}s)`);
  calm(boss); P.invuln = 1e4; heal();
  pass(`the Doom Blade is marked for ${(ran.marked / 60).toFixed(1)}s, fixed once it commits, and leaves a ${buried.toFixed(1)}s window`);

  // ---- and it is the same window for every hero, melee or ranged ------------------------------------------------------
  // Each is dropped on the circle and must simply run: no sprint, no dodge, no reach of their own.
  const clears = {};
  for (const hero of ['knight', 'ranger', 'witch']) {
    applyCharacter(hero); heal();
    const out = doom(boss, 'reckoning', { run: true, heading: 1.1 });
    assert.ok(out.fired, `${hero}: the blow falls`);
    assert.equal(out.dead, false, `${hero}: running is enough to live`);
    assert.ok(out.clear > 0.3, `${hero}: and it is not a photo finish (${out.clear.toFixed(1)} m)`);
    clears[hero] = Number(out.clear.toFixed(1));
    calm(boss); P.invuln = 1e4; heal();
  }
  applyCharacter('witch'); heal(); P.invuln = 1e4;
  pass(`every hero outruns the circle without sprinting or dodging (clear by ${JSON.stringify(clears)})`);

  // ---- the ascended phase has a killing blow of its own now -------------------------------------------------------------
  assert.ok(kit.phases.at(-1).attacks.includes('eclipse'), 'eclipse belongs to the phase he spends in the air');
  // he still takes to the air on the rematch phases, which replace the campaign's
  damageEnemy(boss, boss.hp - boss.def.hp * 0.45); live(5);
  assert.equal(boss.flying, true, 'the rematch still carries him into the sky at half health');
  assert.equal(boss.def.phases.at(-1).title, 'Ascended, unbound', "on the kit's own ascended phase, not the campaign one");
  calm(boss); P.invuln = 1e4; heal();
  const fromSky = doom(boss, 'eclipse', { run: true, from: 7, heading: 2.4 });
  assert.ok(fromSky.fired, 'and the eclipse falls out of it');
  assert.equal(fromSky.dead, false, 'with the same answer: run');
  assert.ok(fromSky.radius > boss.def.attacks.reckoning.radius,
    `a wider circle than the grounded one (${fromSky.radius} vs ${boss.def.attacks.reckoning.radius}), read from further off`);
  calm(boss); P.invuln = 1e4; heal();
  boss.def = { ...boss.def, speed: walkSpeed };
  pass('the ascended phase keeps its transition and gains the first killing blow it has ever had');

  // ---- stand in it and it kills you, and losing is not losing the ladder -------------------------------------------------
  const killed = doom(boss, 'eclipse');                                // this time the hero does not move
  assert.ok(killed.fired && killed.dead, 'a hero who stands in the circle when it lands dies outright, armor and all');
  live(0.3);
  assert.equal(Rematch.active, null, 'and the faint calls the rematch off');
  assert.equal(Rematch.won('malgrath'), 0, 'with nothing counted for a fight that was not won');
  revive(); Rematch.cool = {}; collect();
  P.placeAt(H.BossGate.lair); live(0.4);
  assert.match(currentInteraction()?.label ?? '', /rematch 1/, 'the lair offers the same rematch again');
  currentInteraction().run(); live(0.8);
  const retry = Rematch.fighting;
  const gems = H.inventory.count('frostDiamond'), crowns = H.inventory.count('frostCrown');
  damageEnemy(retry, retry.def.hp * 3); live(1.5);
  assert.equal(Rematch.won('malgrath'), 1, 'winning the retry counts');
  assert.ok(H.inventory.count('frostDiamond') > gems, 'and pays the rematch keepsake');
  assert.equal(H.inventory.count('frostCrown'), crowns, 'and never the crown again');
  pass('the Doom Blade still kills, a rematch can be lost and taken again, and only a win moves the ladder');

  // ---- the Frost Hydra fights again as the Frost Hydra ------------------------------------------------------------------
  assert.ok(rematchReady(COMBAT.enemies.hydra), 'it reuses the Hydra kit written in 31b');
  H.goToPlanet('lanternmoss'); live(0.4); H.goToPlanet('frostveil'); live(0.6); P.invuln = 1e4; heal();
  const frost = of('hydra');
  assert.ok(frost, 'it is on this world');
  assert.equal(frost.def.name, 'The Frost Hydra, Ice-Fanged', 'as the cold variant this world fields');
  damageEnemy(frost, frost.def.hp * 4); live(1.5);
  assert.ok(!frost.alive && game.planets.miniDefeated.has(frost.portalId), 'beaten once, and remembered');
  Rematch.cool = {}; collect();
  P.placeAt(frost.home); P.vel.set(0, 0, 0); live(0.4);
  const prompt = currentInteraction();
  assert.match(prompt?.label ?? '', /Challenge The Frost Hydra again/, `its own prompt stands where it fell (${prompt?.label})`);
  prompt.run(); live(0.8);
  const cold = Rematch.fighting;
  assert.ok(cold?.alive && cold.type === 'hydra', 'and one gets up where it fell');
  assert.equal(cold.def.name, frost.def.name, 'the same encounter, not a plain Hydra wearing its lake');
  assert.equal(cold.def.color, frost.def.color, 'in its own colours');
  assert.ok(cold.def.hp > frost.def.hp, `and harder than it was (${cold.def.hp} vs ${frost.def.hp})`);
  assert.ok(cold.def.attacks.briars, 'with the proven kit on it');
  assert.equal(cold.def.phases[0].heads, COMBAT.enemies.hydra.rematch.phases[0].heads, 'and every head it ever grew');
  pass('the Frost Hydra fights again as itself, on the proven Hydra kit, not as a Hydra from another world');

  // ---- two worlds, one species, two ladders -------------------------------------------------------------------------------
  damageEnemy(cold, cold.def.hp * 4); live(1.5);
  assert.equal(Rematch.won('hydra'), 1, "Frostveil's Hydra is on its own ladder");
  assert.equal(Rematch.won('lanternmoss:hydra'), 0, "and Lanternmoss's has not moved");
  assert.equal(Rematch.won('malgrath'), 1, 'nor has the Demon Lord\'s');
  assert.deepEqual(Object.keys(Rematch.wins).sort(), ['frostveil:hydra', 'frostveil:malgrath'],
    `the ladder is kept per encounter (${JSON.stringify(Rematch.wins)})`);
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); live(0.5);
  assert.equal(Rematch.won('frostveil:hydra'), 1, 'and it survives a save and a Continue');
  assert.equal(Rematch.won('lanternmoss:hydra'), 0, 'still apart from the other world\'s');
  pass('the same species on two worlds keeps two ladders, across a save and back');

  // ---- the gate marks the world for either of them -----------------------------------------------------------------------
  const here = H.Portals.destinations().find(d => d.id === 'frostveil');
  assert.equal(here.rematch, true, 'the lantern gate marks the world');
  pass('the lantern gate marks a world whose boss or mini boss will fight again');
  console.log('all passed');
} finally { keys.KeyW = false; }
