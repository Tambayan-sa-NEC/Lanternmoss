// TODO 28d: production warrior tree on real casts: Wide Cleave's arc (a foe beside the hero), Whirlwind's reach and
// cooldown, Guard's longer window against a real boss's hit, boss immunity windows still refusing every talent,
// costs, reset, two Continue cycles, Old Bramble's free reset and a new adventure; then a paired regular-fight
// throughput comparison (as in 28c). Isolated dry arena without scenery colliders; passive pets; invulnerable unless
// a check needs a hit. Run with SIM_SEED=1 and 7. No release flag is changed.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { CHARACTERS } = await imp('config/characters.js');
const { computeStats } = await imp('gameplay/equipment.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { addEnemy } = await imp('combat/spawning.js');
const { hurtPlayer } = await imp('combat/damage.js');
const { kit, resetCooldowns, spellState } = await imp('combat/casting.js');
const { updateAim } = await imp('combat/targeting.js');
const { colliders } = await imp('physics/colliders.js');
const { arcDist, dirAlong, offsetDir, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { waterAt, slopeAt } = await imp('world/terrain.js');
const { seedPlay } = await imp('utils/random.js');
const { resetBuffs } = await imp('gameplay/buffs.js');
const { Needs } = await imp('gameplay/Needs.js');
const { H, game, step } = await boot('knight');
const P = H.player, T = H.Talents, base = CHARACTERS.knight.abilities;
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
const cleave = () => { P.fwd.copy(forward); H.cam.fwd.copy(forward); updateAim(); H.tryCast('slash'); };

P.level = 16; P.stats = computeStats(P);
assert.ok(T.open); assert.equal(T.available, 8);
assert.equal(T.learn('wideCleave').ok, false, 'Keen Edge first'); assert.equal(T.learn('tempest').ok, false, 'Quick Spin first');

// ---- arcs: the soft lock holds a foe straight ahead; a second foe stands 70 degrees aside, inside Cleave's reach ----
// (an ogre's body is 0.85 m: Cleave reaches 2.7 + 0.85 m, Whirlwind 3.4 / 4.2 + 0.85 m)
const pair = () => { clean(); const front = foe(2, 0), aside = foe(2, 70); cleave(); const r = [1000 - front.hp, 1000 - aside.hp]; front.vanish(); aside.vanish(); return r; };
const [baseFront, baseSide] = pair();
learn(['keenEdge', 'wideCleave']); const [wideFront, wideSide] = pair();
clean(); e = foe(3.75, 0); cleave(); const outOfReach = 1000 - e.hp; e.vanish();
assert.equal(baseSide, 0, 'the base 110-degree swing misses the foe 70 degrees aside');
assert.ok(baseFront > 0 && wideSide > 0 && wideSide === wideFront, `Wide Cleave hits both, equally: ${wideFront} / ${wideSide}`);
assert.ok(Math.abs(wideFront - baseFront * 1.1) <= 1, `Keen Edge rank 1: ${baseFront} -> ${wideFront}`);
assert.equal(outOfReach, 0, 'the reach is unchanged');
clean(); P.mana = 50; cleave(); assert.equal(P.mana, 50 - base.slash.cost, 'same cost'); assert.equal(spellState.cd.slash, base.slash.cooldown, 'same cooldown');
console.log(`PASS  arcs: beside a locked foe, a foe 70 degrees aside takes 0 from Axe Cleave and ${wideSide} from Wide Cleave (as much as the one ahead); reach, cost and cooldown unchanged`);

// ---- Whirlwind reach and cooldown --------------------------------------------------------------------------------
T.reset(); clean(); e = foe(4.6, 120); P.mana = 100; H.tryCast('whirl'); const baseFar = 1000 - e.hp; e.vanish(); const baseCd = spellState.cd.whirl;
learn(['quickSpin', 'quickSpin', 'tempest', 'tempest']); clean(); e = foe(4.6, 120); P.mana = 100; H.tryCast('whirl'); const tempestFar = 1000 - e.hp; e.vanish();
assert.equal(baseCd, 7); assert.equal(spellState.cd.whirl, 5); assert.equal(baseFar, 0); assert.ok(tempestFar > 0);
console.log(`PASS  Whirlwind: a foe 4.6 m away takes 0 at the base reach and ${tempestFar} with Tempest x2; cooldown 7 -> 5 s`);

// ---- Guard's window against a real boss hit; boss immunity still refuses every talent ------------------------------
const boss = H.boss; H.wakeBoss(); step(12);
const guardedHit = ranks => {
  T.reset(); if (ranks) learn(Array(ranks).fill('steadyGuard')); clean(); P.invuln = 0;
  H.tryCast('guard'); step(3); P.invuln = 0; const hp = P.hp; hurtPlayer(40, boss.pos, 0, { source: boss }); return hp - P.hp;
};
const plainHit = guardedHit(0), steadyHit = guardedHit(2);
assert.ok(steadyHit < plainHit * 0.5, `three seconds after Guard: ${plainHit} without Steady Guard, ${steadyHit} with it`);
P.invuln = 1e9;
T.reset(); learn(['keenEdge', 'wideCleave', 'quickSpin', 'tempest']); clean();
boss.placeAt?.(dirAlong(field, forward, 2)); boss.up.copy(dirAlong(field, forward, 2)); boss.pos.copy(boss.up).multiplyScalar(boss.r);
boss.invulnerable = true; const bhp = boss.hp; cleave(); P.mana = 100; H.tryCast('whirl'); step(0.1);
assert.equal(boss.hp, bhp, 'a phase transition (invulnerable) refuses Wide Cleave and Tempest');
boss.invulnerable = false; resetCooldowns(kit()); cleave(); assert.ok(boss.hp < bhp, 'in its damage window Wide Cleave lands');
console.log(`PASS  boss windows: three seconds into Guard a ${boss.def.name.split(',')[0]} hit takes ${plainHit} HP, ${steadyHit} with Steady Guard x2; immunity still refuses the talents`);
boss.hp = 0; boss.die?.(); step(1);

// ---- saves, Continue twice, Old Bramble's reset, a new adventure ----------------------------------------------------
T.reset(); learn(['keenEdge', 'keenEdge', 'wideCleave', 'steadyGuard', 'steadyGuard', 'quickSpin', 'tempest']); const ranks = { ...T.ranks };
for (let i = 0; i < 2; i++) { assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); }
assert.deepEqual(T.ranks, ranks); assert.equal(T.available, 0); assert.equal(kit().slash.arc, 170); assert.equal(kit().guard.duration, 3.5);
const bramble = H.npcs.find(n => n.name === 'Old Bramble'), coins = P.coins;
H.Dialog.start(bramble); H.Dialog.finishTyping(); H.Dialog.choose(true); H.Dialog.close();
assert.deepEqual(T.ranks, {}); assert.equal(kit(), base); assert.equal(P.coins, coins); assert.equal(T.available, 8);
game.resetRun(); assert.deepEqual(T.ranks, {});
console.log('PASS  two Continue cycles keep the warrior ranks; Old Bramble resets them for free; a new adventure is empty');

// ---- paired throughput (as in 28c): the warrior spends four points (Keen Edge x2 + Wide Cleave) ----------------------
const results = [];
for (const hero of ['witch', 'knight', 'ranger']) {
  T.clear(); applyCharacter(hero); P.level = 8; P.stats = computeStats(P); H.Pets.command('passive');
  for (const type of ['goblin', 'ogre']) for (const build of ['base', 'talents']) {
    T.reset(); if (hero === 'knight' && build === 'talents') learn(['keenEdge', 'keenEdge', 'wideCleave']);
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
  if (r.hero !== 'knight') assert.ok(Math.abs(after.time - r.time) <= 2 / 60 + 0.001, 'unchanged controls agree within two simulation frames');
  else assert.ok(after.time <= r.time + 2 / 60 + 0.001, 'learned talents are never slower');
  console.log(`PACE  seed ${process.env.SIM_SEED ?? 1} ${r.hero}/${r.type}: base ${r.time}s -> talents ${after.time}s`);
}
console.log('all passed');
