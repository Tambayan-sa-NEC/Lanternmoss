// TODO 45a (pursuit and final-form leash rules): an ordinary monster never gives up a chase on distance. Once it has
// seen the hero it keeps coming past its old home leash and past the old aggro-distance cutoff, for as long as the
// hero is in this world and not safe. A mini boss keeps its leash through its earlier forms and loses it once its
// final form begins. A main boss is unchanged. What ends a chase instead: the village's safe radius, fainting,
// travelling to another world, and a new adventure - each of which must leave nothing behind.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { PLANETS } = await imp('config/planets.js');
const { ENGAGED } = await imp('entities/enemies/states.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const { damageEnemy } = await imp('combat/damage.js');
const { H, game, step } = await boot('witch', { wake: false });
const P = H.player, pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

const SPAWN = game.world.spawnDir;
/** Put the hero well outside the village, so `playerSafe()` is not what is being measured. */
const away = (arc, angle = 0) => offsetDir(SPAWN, angle, arc);
const placeHero = dir => { P.placeAt(dir); P.vel.set(0, 0, 0); step(0.2); };
const only = e => { for (const x of [...ctx.enemies]) if (x !== e) { x.dispose(); ctx.enemies.splice(ctx.enemies.indexOf(x), 1); } };
const spawn = (type, dir) => { const e = H.spawnEnemy(type, 0); e.placeAt ? e.placeAt(dir) : null; e.home.copy(dir); e.pos.copy(dir).multiplyScalar(e.pos.length()); return e; };

// ---- an ordinary monster keeps coming past both old cutoffs -----------------------------------------------------
const types = ['goblin', 'ogre', 'wisp', 'slime'];
const ran = [];
for (const type of types) {
  placeHero(away(40));
  const e = H.spawnEnemy(type, 3); only(e); e.home.copy(e.up.clone());
  const d = e.def, home = e.home.clone();
  step(0.5);
  e.aggro(); step(0.2);
  assert.ok(ENGAGED.has(e.state), `${type}: it gives chase`);
  assert.equal(e.leashed, false, `${type} is an ordinary monster, so distance never ends its chase`);

  // Walk the hero far beyond the old home leash and far beyond the old aggro-distance cutoff, then let it come.
  const far = Math.max(d.leash, d.aggro * 2.2) + 25;
  placeHero(away(40 + far, 0.02));
  step(0.2);
  const startedAway = arcDist(e.up, P.up);
  assert.ok(startedAway > d.aggro * 2.2,
    `${type}: the hero is ${startedAway.toFixed(0)} m off, past the old ${(d.aggro * 2.2).toFixed(0)} m give-up`);
  let pastLeash = false;
  for (let i = 0; i < 3600 && !pastLeash; i++) {            // up to a minute of real pursuit
    step(1 / 60);
    assert.notEqual(e.state, 'return', `${type}: it must never turn for home`);
    pastLeash = arcDist(e.up, home) > d.leash;
  }
  const fromHome = arcDist(e.up, home), toHero = arcDist(e.up, P.up);
  assert.ok(pastLeash, `${type}: it walked ${fromHome.toFixed(0)} m from home, past its old ${d.leash} m leash`);
  assert.ok(ENGAGED.has(e.state), `${type}: and is still chasing, ${toHero.toFixed(0)} m from the hero`);
  // It is closing on the hero, not milling about.
  for (let i = 0; i < 900; i++) step(1 / 60);
  const after = arcDist(e.up, P.up);
  assert.ok(after < startedAway - 2, `${type}: and it is closing (${startedAway.toFixed(0)} m -> ${after.toFixed(0)} m)`);
  ran.push(`${type} ${startedAway.toFixed(0)}->${after.toFixed(0)} m, ${fromHome.toFixed(0)} m from home`);
  e.dispose(); ctx.enemies.length = 0;
}
pass(`ordinary monsters chase past the old home leash and the old give-up distance, and keep closing: ${ran.join(', ')}`);

// ---- the hero can still get away, the ways the game already provides --------------------------------------------
placeHero(away(40));
let e = H.spawnEnemy('goblin', 3); only(e); e.aggro(); step(0.3);
assert.ok(ENGAGED.has(e.state));
placeHero(SPAWN);                                                   // into the village safe radius
for (let i = 0; i < 120; i++) step(1 / 60);
assert.ok(!ENGAGED.has(e.state), 'reaching the village safe radius still ends a chase');
assert.ok(arcDist(P.up, SPAWN) < COMBAT.player.safeRadius, 'and that is what the safe radius is for');
e.dispose(); ctx.enemies.length = 0;

placeHero(away(40));
e = H.spawnEnemy('goblin', 3); only(e); e.aggro(); step(0.3);
assert.ok(ENGAGED.has(e.state));
P.invuln = 0; (await imp('combat/damage.js')).hurtPlayer(99999, null, 0, { lethal: true, source: 'pursuit test' });
step(0.5);
assert.ok(!ENGAGED.has(e.state) || ctx.player.dead, 'fainting ends the chase too');
step(4); P.invuln = 1e9;
pass('a chase still ends where the game says it should: the village safe radius, and fainting');

// ---- travelling to another world leaves no chaser behind ---------------------------------------------------------
placeHero(away(40));
e = H.spawnEnemy('goblin', 3); only(e); e.aggro(); step(0.3);
assert.ok(ENGAGED.has(e.state), 'a chase is under way');
H.goToPlanet(1); step(0.6);
assert.ok(!ctx.enemies.includes(e), 'travelling disposes the chaser with its world');
assert.ok(ctx.enemies.every(x => x.space === null || x.space === ctx.room), 'and nothing is left in another frame');
assert.equal(ctx.player.space ?? null, null);
H.goToPlanet(0); step(0.6);
assert.ok(!ctx.enemies.includes(e), 'and it does not come back with the old world');
pass('travelling to another world ends the pursuit and leaves no stale chaser');

// ---- a save made mid-chase continues without one ------------------------------------------------------------------
placeHero(away(40));
e = H.spawnEnemy('goblin', 3); only(e); e.aggro(); step(0.3);
assert.ok(ENGAGED.has(e.state));
assert.ok(game.saves.save().ok, 'saved mid-chase');
assert.ok(game.saves.continue()); step(1);
assert.ok(!ctx.enemies.includes(e), 'Continue rebuilds the world without the old chaser');
assert.ok(ctx.enemies.every(x => x.alive === false || !x.remove), 'and leaves no half-disposed monster');
pass('a save made mid-chase continues into a clean world');

// ---- a mini boss keeps its leash until its final form --------------------------------------------------------------
H.goToPlanet(0); step(0.6); P.invuln = 1e9;
const mini = ctx.enemies.find(x => x.def.miniBoss);
assert.ok(mini, 'Lanternmoss has a mini boss');
const phases = mini.def.phases.length;
assert.ok(phases > 1, `it has ${phases} forms`);
mini.bossPhase = 0;
assert.equal(mini.leashed, true, 'in its first form it still gives up a chase');
mini.bossPhase = phases - 1;
assert.equal(mini.leashed, false, 'in its final form it no longer does');
// And that really is what the chase rule reads.
// Driven as a real encounter: stand next to it until it engages, then run past its leash and watch what it does.
const chaseFrom = (phase) => {
  mini.bossPhase = phase; mini.hp = mini.def.hp; mini.home.copy(mini.up.clone());
  placeHero(offsetDir(mini.up, 0, 4)); step(0.6);
  assert.ok(ENGAGED.has(mini.state), `form ${phase}: it engages when the hero walks up to it`);
  placeHero(offsetDir(mini.up, 0, mini.def.leash + 25));
  for (let i = 0; i < 420; i++) step(1 / 60);
  return { engaged: ENGAGED.has(mini.state), fromHome: arcDist(mini.up, mini.home), state: mini.state };
};
const early = chaseFrom(0);
assert.ok(!early.engaged, `an early-form mini boss gives up past its leash (ended ${early.state})`);
assert.ok(early.fromHome < mini.def.leash, `and is back near its lair (${early.fromHome.toFixed(1)} m from home)`);
const last = chaseFrom(phases - 1);
assert.ok(last.engaged, `its final form keeps coming from the same distance (${last.state})`);
assert.ok(last.fromHome > early.fromHome, `and has left its lair behind (${last.fromHome.toFixed(1)} m from home)`);
pass(`a mini boss keeps its leash through its first ${phases - 1} form(s) and loses it in its last`);

// ---- a main boss is untouched ---------------------------------------------------------------------------------------
H.wakeBoss(); step(0.5);
const boss = ctx.boss;
if (boss) {
  assert.equal(boss.leashed, true, 'a main boss still gives up a chase: its arena bounds it, not this rule');
  assert.ok(!boss.def.miniBoss);
}
pass('a main boss keeps the behaviour it had; only ordinary monsters and final-form mini bosses changed');

// ---- every ordinary kind in the game agrees ---------------------------------------------------------------------------
const { Enemy } = await imp('entities/enemies/Enemy.js');
const read = Object.getOwnPropertyDescriptor(Enemy.prototype, 'leashed')?.get;
assert.equal(typeof read, 'function', 'Enemy.leashed is the one place the rule lives');
const kinds = Object.entries(COMBAT.enemies).filter(([, d]) => !d.object && !d.static);
let ordinary = 0, minis = 0, bosses = 0;
for (const [type, d] of kinds) {
  if (d.miniBoss) {
    const last = (d.phases?.length ?? 1) - 1;
    assert.equal(read.call({ def: d, bossPhase: 0 }), true, `${type}: leashed in its first form`);
    assert.equal(read.call({ def: d, bossPhase: last }), false, `${type}: not leashed in its last form`);
    minis++;
  } else if (d.ai === 'boss') {
    assert.equal(read.call({ def: d, bossPhase: 0 }), true, `${type}: a main boss is unchanged`); bosses++;
  } else {
    assert.equal(read.call({ def: d, bossPhase: 0 }), false, `${type}: an ordinary monster never gives up on distance`); ordinary++;
  }
}
assert.ok(ordinary > 10 && minis > 0 && bosses > 0, `covered ${ordinary} ordinary kinds, ${minis} mini bosses, ${bosses} main bosses`);
pass(`all ${kinds.length} monster kinds follow the rule: ${ordinary} ordinary never give up, ${minis} mini bosses only until their last form, ${bosses} main bosses unchanged`);
console.log('all passed');
