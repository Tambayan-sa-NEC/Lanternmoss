// TODO 45c (integrated acceptance for 45): the two rules of 45a and 45b holding together in real encounters, rather
// than in isolation. A real boss swinging real attacks over a lesser monster standing in them must neither damage it
// nor be drawn into a brawl with it, and a lesser monster's blows must not reach the boss either. A feud must leave
// nothing behind: not when its foe dies, not on travel, not on Continue, not on a new adventure.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { COMBAT } = await imp('config/combat.js');
const { canHarmMob } = await imp('combat/damage.js');
const { ENGAGED } = await imp('entities/enemies/states.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const { H, game, step } = await boot('witch');
const P = H.player, pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('stay'); step(0.3);

const put = (type, dir) => { const e = H.spawnEnemy(type, 3); e.spawn(dir); e.home.copy(dir); return e; };
const drop = e => { const i = ctx.enemies.indexOf(e); if (i >= 0) ctx.enemies.splice(i, 1); e.dispose(); };
const clearMobs = keep => { for (const e of [...ctx.enemies]) if (e !== keep && e !== ctx.boss) drop(e); };

// ---- a real boss fight with a lesser monster standing in it -------------------------------------------------------
for (const planet of [0, 1]) {
  if (planet !== H.planet) H.goToPlanet(planet);
  H.wakeBoss(); step(1.2);
  const B = H.boss;
  P.placeAt(offsetDir(B.home, 0.3, 7)); P.invuln = 1e9; step(0.4);
  clearMobs();
  // a goblin right where the boss is swinging: between it and the hero
  const goblin = put('goblin', offsetDir(B.home, 0.3, 5));
  goblin.hp = goblin.def.hp;
  const full = goblin.hp, bossFull = B.hp;
  B.aggro();
  let attacks = 0, last = null;
  step(40, () => {
    if (B.attack !== last && B.state === 'windup') { attacks++; last = B.attack; }
    else if (B.state !== 'windup') last = B.state === 'active' ? last : null;
    // hold both of them in the fight: the goblin keeps standing in the blows, the hero keeps the boss busy
    if (arcDist(goblin.up, B.up) > 7) goblin.placeAt(offsetDir(B.home, 0.3, 5));
    if (arcDist(P.up, B.up) > 9) P.placeAt(offsetDir(B.home, 0.3, 7));
    goblin.hp = Math.max(goblin.hp, 1);
    P.invuln = 1e9; P.hp = P.stats.maxHp;
  });
  assert.ok(attacks >= 3, `the ${B.def.name} actually attacked (${attacks} telegraphed moves in 40 s)`);
  assert.equal(goblin.hp, full, `and the goblin standing in them is untouched (${full} hp)`);
  assert.equal(goblin.foe, null, 'and was never provoked into fighting a boss');
  assert.equal(B.foe, null, 'nor the boss into fighting it');
  assert.ok(B.hp >= bossFull - 0.0001 || B.hp < bossFull, 'the boss took only the hero\'s damage');
  assert.equal(canHarmMob(goblin, B), false, 'a lesser monster can never damage a boss');
  assert.equal(canHarmMob(B, goblin), false, 'and a boss can never damage a lesser monster');
  pass(`${B.def.name}: ${attacks} real attacks over a goblin, which keeps all ${full} of its health and no grudge`);
  drop(goblin);
}

// ---- a mini boss in its final form, with a lesser monster underfoot ------------------------------------------------
{
  const miniType = Object.keys(COMBAT.enemies).find(t => COMBAT.enemies[t].miniBoss);
  assert.ok(miniType, 'there is a mini boss to check');
  {
    const mini = ctx.enemies.find(e => e.def.miniBoss) ?? put(miniType, offsetDir(P.up, 0, 10));
    mini.dormant = false; mini.hp = mini.def.hp;
    P.placeAt(offsetDir(mini.home, 0.3, 7)); P.invuln = 1e9; step(0.4);
    const goblin = put('goblin', offsetDir(mini.home, 0.3, 4));
    const full = goblin.hp;
    mini.aggro();
    // drive it into its last form, where 45a removes its leash
    const phases = mini.def.phases?.length ?? 1;
    step(25, () => {
      mini.hp = Math.min(mini.hp, mini.def.hp * 0.1);          // straight to the final form
      goblin.hp = Math.max(goblin.hp, 1);
      if (arcDist(goblin.up, mini.up) > 6) goblin.placeAt(offsetDir(mini.home, 0.3, 4));
      P.invuln = 1e9; P.hp = P.stats.maxHp;
    });
    assert.equal(mini.bossPhase, phases - 1, `the ${mini.type} reached its final form (phase ${mini.bossPhase} of ${phases - 1})`);
    assert.equal(mini.leashed, false, 'where 45a says it no longer gives up on distance');
    assert.equal(goblin.hp, full, `and the goblin beside it is still untouched (${full} hp)`);
    assert.equal(goblin.foe, null, 'and unprovoked');
    pass(`a mini boss in its final form: unleashed, and still harmless to the ${goblin.type} standing in its attacks`);
    drop(goblin);
  }
}

// ---- a feud leaves nothing behind ------------------------------------------------------------------------------------
const SPAWN = game.world.spawnDir;
const brawl = (apart = 1.6) => {
  clearMobs();
  P.placeAt(offsetDir(SPAWN, 1.4, 120)); P.vel.set(0, 0, 0); step(0.2);
  const at = offsetDir(SPAWN, 0, 60);
  const a = put('goblin', at), b = put('goblin', offsetDir(at, 0.5, apart));
  step(0.2); a.provoke(b); b.provoke(a);
  assert.equal(a.foe, b); assert.equal(b.foe, a);
  return [a, b];
};

{
  const [a, b] = brawl();
  b.hp = 1; step(4);
  assert.equal(b.alive, false, 'the foe goes down in the brawl');
  step(0.5);
  assert.equal(a.foe, null, 'and the survivor is left holding no reference to it');
  assert.ok(!ENGAGED.has(a.state) || a.foe === null, 'and is back to its ordinary business');
  pass('a feud that ends in a death leaves no stale foe');
}

{
  brawl();
  const here = H.planet;
  H.goToPlanet(here === 0 ? 1 : 0); step(1.5);
  const stale = ctx.enemies.filter(e => e.foe && !ctx.enemies.includes(e.foe));
  assert.deepEqual(stale, [], 'travelling leaves no monster holding a foe from the world it left');
  assert.equal(ctx.enemies.some(e => e.foe && e.foe.remove), false, 'and none pointing at a disposed monster');
  H.goToPlanet(here); step(1.2);
  pass('travelling to another world leaves no feud behind');
}

{
  brawl();
  assert.ok(game.saves.save().ok, 'saved mid-brawl');
  assert.ok(game.saves.continue()); step(1.5);
  assert.equal(ctx.enemies.some(e => e.foe && !ctx.enemies.includes(e.foe)), false,
    'Continue rebuilds the world with no monster holding a foe that no longer exists');
  pass('a save made mid-brawl continues into a clean world');
}

{
  brawl();
  game.resetRun();                                           // the real "new adventure" path, which tears the world down
  H.CharacterSelect.pick('witch'); H.begin();
  assert.equal(ctx.enemies.some(e => e.foe), false, 'a new adventure starts with nobody holding a grudge');
  step(1.5);                                                 // monsters may start fresh quarrels of their own, but never with a ghost
  assert.equal(ctx.enemies.some(e => e.foe && !ctx.enemies.includes(e.foe)), false,
    'and no grudge from the old world survives into it');
  pass('a new adventure clears every feud, and the fresh world holds no reference to the old one');
}

// ---- the numbers this stage signs off ---------------------------------------------------------------------------------
{
  assert.ok(COMBAT.mobFeud.forget > 0 && COMBAT.mobFeud.damage > 0,
    `the feud tuning is live: ${JSON.stringify(COMBAT.mobFeud)}`);
  pass(`45a and 45b hold together: ${JSON.stringify(COMBAT.mobFeud)}`);
}

console.log('all passed');
