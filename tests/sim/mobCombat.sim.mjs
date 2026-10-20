// TODO 45b (mob damage and provoked retaliation): a lesser monster's attack also lands on the lesser monsters caught
// in it, including a ghost's orb, and the one that is hit turns on its attacker and fights back. A mini boss's and a
// main boss's attacks never damage a lesser monster, in any form. Nobody is credited for a monster's kill: no XP, no
// coins, and one defeat. The hero always wins a monster's attention back.
import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { canHarmMob, damageEnemy, hitMob, hitMobs } = await imp('combat/damage.js');
const { encounterEvents } = await imp('combat/events.js');
const { ENGAGED } = await imp('entities/enemies/states.js');
const { offsetDir } = await imp('utils/sphere.js');
const { H, game, step } = await boot('witch', { wake: false });
setMaxListeners(32, encounterEvents);   // the game's own listeners plus this file's temporary one
const P = H.player, pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

const SPAWN = game.world.spawnDir;
const away = (arc, angle = 0) => offsetDir(SPAWN, angle, arc);
const clear = () => { for (const e of [...ctx.enemies]) e.dispose(); ctx.enemies.length = 0; };
/** The hero far out of the village and far from the brawl, so none of this is about them. */
const heroAway = () => { P.placeAt(away(120, 1.4)); P.vel.set(0, 0, 0); step(0.2); };
/** A monster placed exactly where the test wants it, with its home there too. */
function put(type, dir) {
  const e = H.spawnEnemy(type, 3);
  e.spawn(dir); e.home.copy(dir); e.knock.set(0, 0, 0);
  return e;
}
/** Two lesser monsters standing `apart` metres from each other, well away from the hero. */
function pair(aType, bType, apart = 1.6) {
  clear(); heroAway();
  const at = away(60);
  const a = put(aType, at), b = put(bType, offsetDir(at, 0.5, apart));
  step(0.2);
  return [a, b];
}

// ---- a monster's blow lands on another monster, and that one fights back ----------------------------------------
{
  const [goblin, victim] = pair('goblin', 'goblin');
  const full = victim.hp;
  goblin.provoke(victim);
  assert.equal(goblin.foe, victim, 'the attacker is set on its foe');
  let struck = false;
  for (let i = 0; i < 600 && !struck; i++) { step(1 / 60); struck = victim.hp < full; }
  assert.ok(struck, `a goblin's swipe damages the goblin it is fighting (${full} -> ${victim.hp})`);
  assert.equal(victim.foe, goblin, 'and the one that was hit turns on its attacker');
  assert.ok(ENGAGED.has(victim.state), 'and comes out fighting');
  const attackerFull = goblin.hp;
  let answered = false;
  for (let i = 0; i < 600 && !answered; i++) { step(1 / 60); answered = goblin.hp < attackerFull; }
  assert.ok(answered, `and hits back (${attackerFull} -> ${goblin.hp}): the fight continues on its own`);
  pass(`a lesser monster damages another and is answered: victim ${full}->${victim.hp}, attacker ${attackerFull}->${goblin.hp}`);
}

// ---- a ghost's orb burns a monster, across kinds -----------------------------------------------------------------
{
  const [wisp, goblin] = pair('wisp', 'goblin', 6);
  const full = goblin.hp;
  wisp.provoke(goblin);
  let hit = false;
  for (let i = 0; i < 900 && !hit; i++) { step(1 / 60); hit = goblin.hp < full; }
  assert.ok(hit, `a wisp's orb damages a goblin (${full} -> ${goblin.hp})`);
  assert.equal(goblin.foe, wisp, 'and the goblin turns on the wisp that shot it');
  pass(`a ghost's projectile damages another kind of monster and provokes it: goblin ${full}->${goblin.hp}`);
}

// ---- a brawl can end in a death, credited to nobody ---------------------------------------------------------------
{
  const [goblin, victim] = pair('goblin', 'goblin');
  const xp = P.xp, coins = P.coins, loot = ctx.worldItems.length, slain = H.Journal.data.slain?.[victim.type] ?? 0;
  let defeats = 0, killer;
  const count = ev => { if (ev.detail.enemy === victim) { defeats++; killer = ev.detail.killer; } };
  encounterEvents.addEventListener('enemydefeated', count);
  victim.hp = 1;
  goblin.provoke(victim);
  for (let i = 0; i < 600 && victim.alive; i++) step(1 / 60);
  encounterEvents.removeEventListener('enemydefeated', count);
  assert.equal(victim.alive, false, 'the monster it was fighting goes down');
  assert.equal(defeats, 1, 'defeated exactly once');
  assert.equal(killer, goblin, 'and the defeat names the monster that struck the last blow');
  assert.equal(victim.killedBy, goblin, 'which the monster itself remembers');
  assert.equal(P.xp, xp, 'the hero gets no XP for a fight they were not in');
  assert.equal(P.coins, coins, 'and no coins');
  assert.equal(ctx.worldItems.length, loot, 'and no loot drops for them');
  assert.equal(H.Journal.data.defeated[victim.type] ?? 0, slain, 'and it does not count as one of their bestiary defeats');
  step(0.5);
  assert.equal(goblin.foe, null, 'and the survivor has nothing left to fight');
  pass('a monster killed by another monster: one defeat, credited to nobody - no XP, no coins, no loot, no tally');
}

// ---- the hero always wins a monster's attention back ---------------------------------------------------------------
{
  const [goblin, victim] = pair('goblin', 'goblin');
  goblin.provoke(victim);
  assert.equal(goblin.foe, victim);
  damageEnemy(goblin, 1);                                    // the hero's own hit
  assert.equal(goblin.foe, null, 'a hit from the hero ends the brawl');
  pass('the hero reclaims a monster that was busy fighting another');
}

// ---- a feud is forgotten, and the monster goes back to the hero -----------------------------------------------------
{
  const [goblin, victim] = pair('goblin', 'goblin', 40);     // far enough apart that the feud times out rather than ending in blood
  goblin.provoke(victim);
  assert.equal(goblin.foe, victim);
  step(COMBAT.mobFeud.forget + 1);
  assert.equal(goblin.foe, null, `a feud is forgotten after ${COMBAT.mobFeud.forget} s`);
  pass(`a provoked monster goes back to hunting the hero after ${COMBAT.mobFeud.forget} s`);
}

// ---- nothing hits itself, and nothing reaches another space ----------------------------------------------------------
{
  const [goblin, other] = pair('goblin', 'goblin');
  const full = goblin.hp;
  assert.equal(canHarmMob(goblin, goblin), false, 'a monster cannot hit itself');
  assert.equal(hitMob(goblin, goblin, 50), false);
  assert.equal(goblin.hp, full, 'and takes no damage from its own blow');
  other.space = { fake: 'another space' };
  assert.equal(canHarmMob(goblin, other), false, 'and cannot reach a monster in another space');
  other.space = null;
  other.hidden = true;
  assert.equal(canHarmMob(goblin, other), false, 'nor a burrowed one');
  other.hidden = false;
  pass('a monster never hits itself, a burrowed monster, or one in another space');
}

// ---- every kind, by class: who may damage whom ------------------------------------------------------------------------
{
  clear(); heroAway();
  const lesser = [], minis = [], mains = [];
  for (const type of Object.keys(COMBAT.enemies)) {
    const d = COMBAT.enemies[type];
    if (d.static) continue;
    (d.miniBoss ? minis : d.ai === 'boss' ? mains : lesser).push(type);
  }
  assert.ok(lesser.length > 10 && minis.length > 0 && mains.length > 0,
    `covering ${lesser.length} lesser, ${minis.length} mini bosses, ${mains.length} main bosses`);
  const at = away(60);
  const target = put(lesser[0], at); step(0.2);
  const full = target.hp;
  for (const type of [...minis, ...mains]) {
    const boss = put(type, offsetDir(at, 0.5, 1.2)); step(0.1);
    assert.equal(boss.lesser, false, `${type} is not a lesser monster`);
    assert.equal(canHarmMob(boss, target), false, `${type}'s attack never damages a lesser monster`);
    assert.equal(canHarmMob(target, boss), false, `and a lesser monster's attack never damages ${type}`);
    assert.deepEqual(hitMobs(boss, boss.pos, 99, 999), [], `${type}'s blow catches no monster, however wide`);
    assert.equal(hitMob(boss, target, 999), false);
    target.provoke(boss);
    assert.equal(target.foe, null, `and a lesser monster is never provoked into fighting ${type}`);
    boss.dispose(); ctx.enemies.splice(ctx.enemies.indexOf(boss), 1);
  }
  assert.equal(target.hp, full, `the lesser monster is untouched after ${minis.length + mains.length} boss blows (${full} hp)`);
  for (const type of lesser) {
    const other = put(type, offsetDir(at, 0.5, 1.2)); step(0.1);
    assert.equal(other.lesser, true, `${type} is a lesser monster`);
    assert.equal(canHarmMob(other, target), true, `${type} can damage another lesser monster`);
    other.dispose(); ctx.enemies.splice(ctx.enemies.indexOf(other), 1);
  }
  pass(`every kind by class: ${lesser.length} lesser monsters fight each other, ${minis.length} mini bosses and ${mains.length} main bosses neither damage nor are damaged by them`);
}

// ---- a boss's summons are lesser monsters, and brawl like any other ---------------------------------------------------
{
  const [a, b] = pair('goblin', 'goblin');
  b.temporary = true; b.owner = a;                            // as spawnMinion marks a boss's helper
  assert.equal(b.lesser, true, 'a boss summon is still a lesser monster');
  assert.equal(canHarmMob(a, b), true, 'so it can be caught in another monster blow');
  const full = b.hp;
  assert.equal(hitMob(a, b, 7), true);
  assert.ok(b.hp < full, 'and takes the damage');
  assert.equal(b.foe, a, 'and fights back');
  pass('a boss summoned helper brawls like any other lesser monster');
}

clear();
console.log('all passed');
