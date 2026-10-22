// TODO 28e: production ranger tree on real casts: Wide Fan's coverage (a foe off to the side of the locked one) with
// unchanged single-target damage, Quick Fan's cooldown, Bramble Snare's slow, Light Feet's cost, boss immunity, two
// Continue cycles, Old Bramble's free reset and a new adventure; then the paired throughput comparison (as in 28c/28d).
// Isolated dry arena without scenery colliders; passive pets; invulnerable. Run with SIM_SEED=1 and 7.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { CHARACTERS } = await imp('config/characters.js');
const { computeStats } = await imp('gameplay/equipment.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { addEnemy } = await imp('combat/spawning.js');
const { kit, resetCooldowns, spellState } = await imp('combat/casting.js');
const { updateAim } = await imp('combat/targeting.js');
const { colliders } = await imp('physics/colliders.js');
const { arcDist, dirAlong, offsetDir, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { waterAt, slopeAt } = await imp('world/terrain.js');
const { seedPlay } = await imp('utils/random.js');
const { resetBuffs } = await imp('gameplay/buffs.js');
const { Needs } = await imp('gameplay/Needs.js');
const { H, game, step } = await boot('ranger');
const P = H.player, T = H.Talents, base = CHARACTERS.ranger.abilities;
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9;
for (const e of ctx.enemies) if (e !== H.boss) e.vanish();
let field;
for (let i = 0; i < 500 && !field; i++) {
  const d = offsetDir(game.world.spawnDir, i * 2.39996, 33 + i % 15);
  if (!waterAt(d) && slopeAt(d) < 0.2) field = d;
}
assert.ok(field, 'a dry, flat isolated arena'); colliders.length = 0;
const forward = tangentFrame(field)[0], side = forward.clone().cross(field).normalize();
function clean() {
  for (const e of ctx.enemies) if (e.alive && e !== H.boss) e.vanish();
  P.placeAt(field); P.fwd.copy(forward); P.clearTimers(); P.invuln = 1e9; resetBuffs(); Needs.reset();
  ctx.companion.snapToHero(); P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; resetCooldowns(kit());
}
const learn = ids => { for (const id of ids) assert.ok(T.learn(id).ok, id); };
/** A static ogre `dist` m away at `deg` degrees off the hero's facing. */
let e;
const foe = (dist, deg) => addEnemy('ogre', dirAlong(field, forward.clone().applyAxisAngle(field, deg * Math.PI / 180), dist), { static: true, hp: 1000 });
const fan = () => { P.fwd.copy(forward); H.cam.fwd.copy(forward); updateAim(); P.mana = 100; resetCooldowns(kit()); H.tryCast('volley'); step(1); };

P.level = 16; P.stats = computeStats(P);
assert.ok(T.open); assert.equal(T.available, 8);
assert.equal(T.learn('wideFan').ok, false, 'Quick Fan first'); assert.equal(T.learn('brambleSnare').ok, false, 'Steady Aim first');

// ---- Wide Fan: a foe 32 degrees off the locked one (8 m out) is missed by the base fan's 20-degree outer arrow ----------
const crowd = () => { clean(); const front = foe(7, 0), aside = foe(8, 32); fan(); const r = [1000 - front.hp, 1000 - aside.hp]; front.vanish(); aside.vanish(); return r; };
const alone = () => { clean(); const front = foe(7, 0); fan(); const r = 1000 - front.hp; front.vanish(); return r; };
const [baseFront, baseSide] = crowd(), baseAlone = alone();
learn(['quickFan', 'wideFan']); const [wideFront, wideSide] = crowd(), wideAlone = alone();
assert.equal(baseSide, 0, 'the base fan misses the foe aside'); assert.ok(wideSide > 0, 'Wide Fan reaches it');
assert.equal(wideAlone, baseAlone, 'one foe takes the same: the arrows are as tightly spaced');
clean(); P.mana = 100; H.tryCast('volley'); assert.equal(P.mana, 100 - base.volley.cost, 'same cost'); assert.equal(spellState.cd.volley, 3.5, 'Quick Fan rank 1');
assert.equal(ctx.projectiles.length >= 7, true, 'seven arrows in flight'); step(1);
console.log(`PASS  Wide Fan: a foe 32 degrees aside takes 0 from Arrow Fan and ${wideSide} from Wide Fan; one foe alone takes ${baseAlone} either way; same cost`);

// ---- Bramble Snare, Quick Fan, Light Feet; boss immunity -------------------------------------------------------------
T.reset(); learn(['steadyAim', 'brambleSnare', 'brambleSnare', 'quickFan', 'lightFeet', 'lightFeet']); clean();
e = foe(7, 0); P.fwd.copy(forward); updateAim(); P.mana = 100; H.tryCast('snare'); step(1);
assert.equal(e.slowT > 3, true, `Thorn Arrow slow ${e.slowT.toFixed(2)} s left of 4`); e.vanish();
clean(); P.mana = 50; H.tryCast('leap'); assert.equal(P.mana, 50 - (base.leap.cost - 4), 'Light Feet x2'); step(1);
const boss = H.boss; H.wakeBoss(); step(12); clean();
const holdBoss = () => { boss.up.copy(dirAlong(field, forward, 5)); boss.pos.copy(boss.up).multiplyScalar(boss.r); boss.stunT = 5; };   // held still: out of its leash it would walk home
holdBoss();
boss.invulnerable = true; const bhp = boss.hp; learn(['wideFan']); fan(); assert.equal(boss.hp, bhp, 'a phase transition refuses Wide Fan');
boss.invulnerable = false; holdBoss(); fan(); assert.ok(boss.hp < bhp, 'in its damage window Wide Fan lands');
console.log('PASS  Bramble Snare slows 4 s, Light Feet x2 cuts Evasive Leap by 4, boss immunity still refuses the talents');
boss.hp = 0; boss.die?.(); step(1);

// ---- saves, Continue twice, Old Bramble's reset, a new adventure ----------------------------------------------------
T.reset(); learn(['quickFan', 'quickFan', 'wideFan', 'steadyAim', 'steadyAim', 'brambleSnare', 'brambleSnare']); const ranks = { ...T.ranks };
for (let i = 0; i < 2; i++) { assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); }
assert.deepEqual(T.ranks, ranks); assert.equal(T.available, 0); assert.equal(kit().volley.count, 7); assert.equal(kit().snare.slowTime, 4);
const bramble = H.npcs.find(n => n.name === 'Old Bramble'), coins = P.coins;
H.Dialog.start(bramble); H.Dialog.finishTyping(); H.Dialog.choose(true); H.Dialog.close();
assert.deepEqual(T.ranks, {}); assert.equal(kit(), base); assert.equal(P.coins, coins); assert.equal(T.available, 8);
game.resetRun(); assert.deepEqual(T.ranks, {});
console.log('PASS  two Continue cycles keep the ranger ranks; Old Bramble resets them for free; a new adventure is empty');

// ---- paired throughput (as in 28c/28d): the ranger spends four points (Steady Aim x2 + Quick Fan x2) ------------------
const results = [];
for (const hero of ['witch', 'knight', 'ranger']) {
  T.clear(); applyCharacter(hero); P.level = 8; P.stats = computeStats(P); H.Pets.command('passive');
  for (const type of ['goblin', 'ogre']) for (const build of ['base', 'talents']) {
    T.reset(); if (hero === 'ranger' && build === 'talents') learn(['steadyAim', 'steadyAim', 'quickFan', 'quickFan']);
    clean(); seedPlay(Number(process.env.SIM_SEED ?? 1));
    const enemy = addEnemy(type, dirAlong(field, forward, hero === 'knight' ? 2 : 6)); enemy.temporary = true; enemy.aggro();
    let elapsed = 0;
    while (enemy.alive && elapsed < 30) {
      P.level = 8; P.xp = 0; P.fwd.copy(tangentToward(P.up, enemy.up)); updateAim();
      H.keys.KeyW = arcDist(P.up, enemy.up) > (hero === 'knight' ? 2.5 : 7);
      H.cam.fwd.copy(P.fwd);
      const entries = Object.entries(kit()), distance = arcDist(P.up, enemy.up);
      const skill = entries.slice(1).find(([id, s]) => s.damage && !s.ult && !spellState.cd[id] && P.mana >= s.cost && distance < (s.range ?? s.radius ?? 0));
      H.tryCast(skill?.[0] ?? entries[0][0]); step(1 / 60); elapsed += 1 / 60;
    }
    H.keys.KeyW = false; assert.equal(enemy.alive, false, `${hero}/${type}/${build}: no capped duel`);
    results.push({ hero, type, build, time: +elapsed.toFixed(3) });
  }
}
for (const r of results.filter(r => r.build === 'base')) {
  const after = results.find(x => x.hero === r.hero && x.type === r.type && x.build === 'talents');
  if (r.hero !== 'ranger') assert.ok(Math.abs(after.time - r.time) <= 2 / 60 + 0.001, 'unchanged controls agree within two simulation frames');
  else assert.ok(after.time <= r.time + 2 / 60 + 0.001, 'learned talents are never slower');
  console.log(`PACE  seed ${process.env.SIM_SEED ?? 1} ${r.hero}/${r.type}: base ${r.time}s -> talents ${after.time}s`);
}
console.log('all passed');
