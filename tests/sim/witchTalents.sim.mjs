// TODO 28c: production witch tree, real casts/projectiles, reset/Continue, remapped keys, and a paired regular-fight
// throughput comparison. The isolated dry arena removes scenery colliders; passive pets and invulnerability keep
// the comparison about ability throughput, not human survival. Run with SIM_SEED=1 and 7. No release flag is changed.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { CHARACTERS } = await imp('config/characters.js');
const { computeStats } = await imp('gameplay/equipment.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { addEnemy } = await imp('combat/spawning.js');
const { kit, resetCooldowns, spellState } = await imp('combat/casting.js');
const { targeting, updateAim } = await imp('combat/targeting.js');
const { colliders } = await imp('physics/colliders.js');
const { arcDist, dirAlong, offsetDir, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { groundHeight, waterAt, slopeAt } = await imp('world/terrain.js');
const { seedPlay } = await imp('utils/random.js');
const { rebind, resetBinds } = await imp('core/keybinds.js');
const { resetBuffs } = await imp('gameplay/buffs.js');
const { Needs } = await imp('gameplay/Needs.js');
const { H, game, step } = await boot('witch');
const P = H.player, T = H.Talents, base = CHARACTERS.witch.abilities;
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9;
for (const e of ctx.enemies) e.vanish();
let field;
for (let i = 0; i < 500 && !field; i++) {
  const d = offsetDir(game.world.spawnDir, i * 2.39996, 33 + i % 15);
  if (!waterAt(d) && slopeAt(d) < 0.2) field = d;
}
assert.ok(field, 'a dry, flat isolated arena'); colliders.length = 0;
const forward = tangentFrame(field)[0], side = forward.clone().cross(field).normalize();
function clean() {
  for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
  for (const e of ctx.enemies) if (e.alive) e.vanish();
  P.placeAt(field); P.fwd.copy(forward); P.clearTimers(); P.invuln = 1e9; resetBuffs(); Needs.reset();
  ctx.companion.snapToHero();
  P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; resetCooldowns(kit()); targeting.aim = null;
}
const learn = ids => { for (const id of ids) assert.ok(T.learn(id).ok, id); };
P.level = 16; P.stats = computeStats(P);
assert.ok(T.open); assert.equal(T.available, 8);
assert.equal(T.learn('seekingFlame').ok, false, 'prerequisite is real');
learn(['brightBolt', 'brightBolt', 'quickFrost', 'quickFrost', 'deepFreeze', 'deepFreeze', 'seekingFlame']);
assert.equal(T.available, 0); assert.equal(T.learn('lightStep').ok, false, 'budget is enforced');
const ranks = { ...T.ranks };
clean();
let e = addEnemy('ogre', dirAlong(field, forward, 2), { static: true, hp: 1000 });
H.tryCast('nova'); assert.equal(spellState.cd.nova, 6); assert.equal(e.slowT, 4.5); assert.ok(e.hp < 1000);
T.reset(); learn(['lightStep', 'lightStep']); clean(); P.mana = 50;
H.tryCast('blink'); assert.equal(P.mana, 39); assert.ok(arcDist(P.up, field) > 5);
T.reset(); clean(); P.mana = 50; H.tryCast('blink'); assert.equal(P.mana, 35);
console.log('PASS  production learning/budget, Frost Nova duration/cooldown and Blink cost affect real casts; reset restores them');

function fireTrial(seeking, loss = null) {
  T.reset(); if (seeking) learn(['brightBolt', 'seekingFlame']); clean();
  const enemy = addEnemy('ogre', dirAlong(field, forward, 8), { static: true, hp: 1000 });
  targeting.aim = enemy; H.tryCast('fireball'); const shot = ctx.projectiles.pop();
  assert.ok(shot); assert.equal(shot.homing, seeking ? 4 : 0);
  // The target sidesteps after launch; only the talent can turn toward the new position.
  enemy.up.copy(dirAlong(enemy.up, side, 2.4)); enemy.r = groundHeight(enemy.up); enemy.pos.copy(enemy.up).multiplyScalar(enemy.r);
  if (loss === 'hidden') enemy.hidden = true;
  if (loss === 'dead') enemy.alive = false;
  if (loss || !seeking) assert.equal(shot.homeTo?.() ?? null, null);
  let alive = true;
  for (let i = 0; i < 240 && alive; i++) alive = shot.update(1 / 120);
  assert.equal(alive, false, 'range remains bounded');
  const damage = 1000 - enemy.hp; enemy.vanish(); return damage;
}
const straight = fireTrial(false), seeking = fireTrial(true);
assert.equal(straight, 0, 'straight Fireball misses the sidestep'); assert.ok(seeking > 0, 'Seeking Fireball hits and explodes');
assert.equal(fireTrial(true, 'hidden'), 0); assert.equal(fireTrial(true, 'dead'), 0);
T.reset(); clean(); H.tryCast('fireball'); assert.equal(ctx.projectiles.at(-1).homeTo, null, 'no target: straight flight');
T.reset(); learn(['brightBolt', 'seekingFlame']); clean(); H.tryCast('fireball');
assert.equal(ctx.projectiles.at(-1).homeTo, null, 'Seeking Fireball without a lock also flies straight');
console.log(`PASS  a sidestep: base Fireball ${straight} damage, seeking ${seeking.toFixed(1)}; dead/hidden/no targets and range expiry are safe`);

// Paired throughput samples: real enemy AI and real attacks, pinned level 8 and matching seeded randomness.
// Witch spends four earned points (Bright Bolt x2 + Seeking Flame); other heroes are unchanged controls.
const results = [];
for (const hero of ['witch', 'knight', 'ranger']) {
  T.clear(); applyCharacter(hero); P.level = 8; P.stats = computeStats(P); H.Pets.command('passive');
  for (const type of ['goblin', 'ogre']) for (const build of ['base', 'talents']) {
    T.reset(); if (hero === 'witch' && build === 'talents') learn(['brightBolt', 'brightBolt', 'seekingFlame']);
    clean(); seedPlay(Number(process.env.SIM_SEED ?? 1));
    const enemy = addEnemy(type, dirAlong(field, forward, hero === 'knight' ? 2 : 6)); enemy.temporary = true; enemy.aggro();
    let elapsed = 0;
    while (enemy.alive && elapsed < 30) {
      P.level = 8; P.xp = 0; P.fwd.copy(tangentToward(P.up, enemy.up)); updateAim();
      if (arcDist(P.up, enemy.up) > (hero === 'knight' ? 2.5 : 7)) H.keys.KeyW = true; else H.keys.KeyW = false;
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
  if (r.hero !== 'witch') assert.ok(Math.abs(after.time - r.time) <= 2 / 60 + 0.001, 'unchanged controls agree within two simulation frames');
  console.log(`PACE  seed ${process.env.SIM_SEED ?? 1} ${r.hero}/${r.type}: base ${r.time}s -> talents ${after.time}s`);
}
assert.ok(results.some(r => r.hero === 'witch' && r.build === 'talents' && r.time < results.find(b => b.hero === r.hero && b.type === r.type && b.build === 'base').time));

// Real saves, two Continue cycles and the wizard's free reset, without installing a fixture tree.
T.clear(); applyCharacter('witch'); P.level = 16; P.stats = computeStats(P); T.load({ ranks }); clean();
rebind('skill2', 'KeyZ'); assert.equal(kit().fireball.label, 'Z'); resetBinds();
for (let i = 0; i < 2; i++) { assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); }
assert.deepEqual(T.ranks, ranks); assert.equal(T.available, 0); assert.equal(kit().fireball.homing, 4);
const bramble = H.npcs.find(n => n.name === 'Old Bramble'), coins = P.coins;
H.Dialog.start(bramble); H.Dialog.finishTyping(); H.Dialog.choose(true); H.Dialog.close();
assert.deepEqual(T.ranks, {}); assert.equal(kit(), base); assert.equal(P.coins, coins); assert.equal(T.available, 8);
game.resetRun(); assert.deepEqual(T.ranks, {});
console.log('PASS  remapped keys, two production Continue cycles, free Old Bramble reset and a new adventure');
console.log('all passed');
