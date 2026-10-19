// TODO 29c: real hero kits, aiming, projectiles, hazards, enemy AI and both pet bodies in an unreleased cave.
// Paired seeds and all three heroes; walls/landing/height, state restoration, saves, houses and aborts are guarded.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { computeStats } = await imp('gameplay/equipment.js');
const { kit, resetCooldowns, confirmAim } = await imp('combat/casting.js');
const { aim, cancelAim, nudgeAim } = await imp('combat/aiming.js');
const { updateAim, targeting, noteHit } = await imp('combat/targeting.js');
const { addHazard, Blast, Zone, hazardsOf } = await imp('combat/hazards.js');
const { enemiesInArea, playerInArea, landable } = await imp('combat/area.js');
const { pointOf, altitude, visible } = await imp('combat/space.js');
const { hurtPlayer } = await imp('combat/damage.js');
const { Houses } = await imp('gameplay/Houses.js');
const { seedPlay } = await imp('utils/random.js');
const { CAVES } = await imp('config/dungeons.js');
const { placeCaveHero, spawnCaveEnemy, clearCaveCombat } = await import('./lib/caveFixture.mjs');
const { H, game, step } = await boot('witch', { wake: false });
const { setSetting } = await imp('core/settings.js'); setSetting('hitStop', false);
const P = H.player, D = H.Dungeons, K = H.keys;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip();
const results = [];
for (const seed of [1, 7]) for (const hero of ['witch', 'knight', 'ranger']) {
  seedPlay(seed); applyCharacter(hero); H.Talents.clear(); P.level = 16; P.stats = computeStats(P);
  H.Pets.command('passive'); P.invuln = 1e9; step(0.2);
  const surface = ctx.enemies, boss = ctx.boss, surfaceHp = surface.map(e => e.hp), surfacePos = surface.map(e => e.pos.clone());
  assert.ok(D.enter()); step(1);
  assert.equal(game.world.weather.group.visible, false, 'surface weather particles stay outside');
  const s = D.inside, room = s.layout.rooms.find(r => r.id === s.layout.end);
  const clean = () => {
    clearCaveCombat(); placeCaveHero(room.x, room.z + 2); P.invuln = 1e9; H.Pets.command('passive');
    ctx.companion.snapToHero();
  };
  const foe = (distance = 2, options = {}) => spawnCaveEnemy('ogre', room.x, room.z + 2 - distance, { held: true, hp: 10000, ...options });
  const cast = id => { P.mana = P.stats.maxMana; resetCooldowns(kit()); P.fwd.set(0, 0, -1); updateAim(); H.tryCast(id); };
  clean(); const ids = { witch: ['bolt', 'fireball', 'nova'], knight: ['slash', 'dash', 'whirl'], ranger: ['shot', 'volley', 'snare'] }[hero];
  const damage = [];
  for (const id of ids) {
    clean(); const e = foe(), before = e.hp;
    cast(id); step(0.8); assert.ok(e.hp < before, `${hero}/${seed}: ${id} hits on the flat floor`);
    assert.ok(ctx.room.contains(P.pos, P.radius) && Math.abs(altitude(P)) < 0.01);
    damage.push(`${id}:${Math.round(before - e.hp)}`);
  }
  clean();
  if (hero === 'witch') {
    P.fwd.set(0, 0, -1); const from = P.pos.clone(); cast('blink'); step(0.1);
    assert.ok(from.distanceTo(P.pos) > 2 && ctx.room.contains(P.pos, P.radius), 'Blink moves but cannot leave the floor');
  } else if (hero === 'knight') {
    cast('guard'); P.invuln = 0; const hp = P.hp; hurtPlayer(30, null); assert.ok(hp - P.hp < 20, 'Guard reduces a real hit');
  } else {
    const from = P.pos.clone(); cast('leap'); step(0.15);
    assert.ok(P.pos.z > from.z && altitude(P) > 0.1 && P.invuln > 0, 'Evasive Leap moves, rises and grants i-frames');
    step(1); assert.ok(P.grounded && ctx.room.contains(P.pos, P.radius));
  }

  clean(); const e = foe(3), far = spawnCaveEnemy('ogre', room.x + 4.8, room.z + 4.8, { held: true, hp: 10000 });
  const ult = { witch: 'meteor', knight: 'leapSlam', ranger: 'rain' }[hero];
  cast(ult); assert.ok(aim.id === ult && aim.valid, `${ult} has a valid room target`);
  assert.ok(aim.target.distanceTo(pointOf(e)) < 0.01, 'aim locks onto the enemy position, not its common up vector');
  const nearHp = e.hp, farHp = far.hp; confirmAim(); step(hero === 'ranger' ? 1.3 : 1.5);
  assert.ok(e.hp < nearHp, `${ult} damages the intended enemy`); assert.equal(far.hp, farHp, 'an enemy outside the area is not hit');
  assert.ok(hazardsOf('player').every(h => h.point.y > -3001 && h.point.y < -2998), 'warnings/hazards lie on the cave floor');
  assert.ok(ctx.room.contains(P.pos, P.radius), 'Leap Slam lands on the floor');
  if (hero === 'knight') {
    const before = P.pos.clone(), away = P.pos.clone().sub(e.pos);
    const key = Math.abs(away.x) > Math.abs(away.z) ? (away.x < 0 ? 'KeyA' : 'KeyD') : (away.z < 0 ? 'KeyW' : 'KeyS');
    K[key] = true; step(0.3); K[key] = false;
    assert.ok(P.pos.distanceTo(before) > 0.2, 'can walk away from the enemy after the scripted landing');
  }

  // Both walking and flying pets retain their commands and actual attack behavior.
  clean(); const petFoe = foe(2.5), hp = petFoe.hp;
  H.Pets.command('attack'); noteHit(petFoe); updateAim(); ctx.companion.snapToHero();
  if ('atkCool' in ctx.companion) ctx.companion.atkCool = 0; else ctx.companion.cool = 0;
  step(3); assert.ok(petFoe.hp < hp, `${hero}'s ${H.Pets.id} attacks in a cave`);
  H.Pets.command('stay'); const stay = H.Pets.stayDir.clone();
  assert.ok(stay.y < -2990, 'stay stores a room floor point');
  assert.ok(ctx.companion.visible && ctx.room.contains(ctx.companion.pos));
  const savedStay = H.Pets.toJSON().stayDir;
  assert.ok(savedStay && Math.abs(Math.hypot(...savedStay) - 1) < 1e-6, 'a save inside records a valid surface stay point');

  // Restore the live surface encounter, not a regenerated approximation.
  clearCaveCombat(); placeCaveHero(room.x, room.z); D.leave(); step(1);
  assert.equal(ctx.enemies, surface); assert.equal(ctx.boss, boss); assert.equal(ctx.room, null);
  assert.equal(game.world.weather.group.visible, true, 'surface weather visibility returns on exit');
  // At most the post-fade surface frames ran; dormant enemies away from the mouth were frozen during the cave.
  assert.ok(surface.every((enemy, i) => enemy.hp === surfaceHp[i]));
  assert.ok(surface.some((enemy, i) => enemy.pos.distanceTo(surfacePos[i]) < 0.01));
  assert.equal(P.space, null); assert.ok(P.selfCollider.active && !P.motion && ctx.companion.visible);
  assert.ok(H.Pets.mode === 'stay' && H.Pets.stayDir && Math.abs(H.Pets.stayDir.length() - 1) < 1e-6, 'stay remains valid at the surface exit');
  assert.equal(ctx.projectiles.length, 0); assert.equal(hazardsOf('player').length, 0); assert.equal(targeting.aim, null);
  results.push(`${hero}/${seed}: ${damage.join(', ')}`);
}
pass(`all three kits, ultimates, movement and both pet bodies on seeds 1 and 7\n${results.join('\n')}`);

// Real melee and ranged AI attack, and hopping enemies move under the same fixed up.
applyCharacter('witch'); P.level = 16; P.stats = computeStats(P); H.Pets.command('passive'); D.enter(); step(1);
let s = D.inside, room = s.layout.rooms.find(r => r.id === s.layout.end);
for (const type of ['goblin', 'ogre', 'wisp', 'slime']) {
  clearCaveCombat(); placeCaveHero(room.x, room.z + 2); P.invuln = 0;
  const e = spawnCaveEnemy(type, room.x, room.z - 1); const from = e.pos.clone(), hp = P.hp;
  step(type === 'wisp' ? 5 : 3);
  assert.ok(e.pos.distanceTo(from) > 0.1 && e.up.equals(ctx.room.up) && ctx.room.contains(e.pos, e.radius));
  assert.ok(P.hp < hp, `${type} lands its real attack`);
}
pass('goblin melee, ogre slams, wisp homing shots and hopping slime attack in the room');

// Same up vector is not same location, and walls occlude lock-on and all area queries.
clearCaveCombat(); placeCaveHero(room.x, room.z);
const near = spawnCaveEnemy('ogre', room.x + 2, room.z, { held: true, hp: 1000 });
assert.ok(enemiesInArea(pointOf(P), 3).includes(near));
assert.ok(!enemiesInArea(s.built.toWorld(room.x - 5, room.z - 5), 1).includes(near));
assert.equal(playerInArea(s.built.toWorld(room.x - 5, room.z - 5), 1), false);
// Use a point immediately outside a solid room wall: its entire long shot must be stopped.
clearCaveCombat(); placeCaveHero(room.x - room.w / 2 + 0.5, room.z + 1.5); P.fwd.set(-1, 0, 0);
if (room.doors.w) placeCaveHero(room.x - room.w / 2 + 0.5, room.z + 2);
P.fwd.set(-1, 0, 0); P.mana = P.stats.maxMana; resetCooldowns(kit()); H.tryCast('fireball'); step(0.3);
assert.equal(ctx.projectiles.length, 0, 'a projectile is stopped by the wall');
assert.ok(!landable(s.built.toWorld(room.x - room.w / 2 - 0.4, room.z + 2), P.radius));
// Enemies at opposite sides of a corner may share range, but cannot be selected through a wall.
let pair;
for (const a of s.layout.rooms) for (const b of s.layout.rooms) {
  const p = s.built.toWorld(a.x + a.w / 2 - 0.8, a.z + a.d / 2 - 0.8), q = s.built.toWorld(b.x - b.w / 2 + 0.8, b.z - b.d / 2 + 0.8);
  if (ctx.room.distance(p, q) < 14 && ctx.room.distance(p, q) > 2 && !visible(p, q)) pair = [p, q];
}
assert.ok(pair, 'an occluded pair of valid floor points');
ctx.room.place(P, pair[0]); const q = pair[1], wallFoe = spawnCaveEnemy('ogre', q.x, q.z, { held: true, hp: 1000 });
P.fwd.copy(ctx.room.toward(P.pos, wallFoe.pos)); updateAim(); assert.equal(targeting.aim, null);
assert.ok(!enemiesInArea(pointOf(P), 30).includes(wallFoe), 'walls stop area damage');
pass('area distance uses floor positions; projectiles, targeting and areas respect walls');

// Exit mid-ultimate/fight, save/Continue, fainting and travel clear the room and restore surface ownership.
clearCaveCombat(); placeCaveHero(room.x, room.z); const lightCount = H.LocalLights.count;
addHazard(new Zone({ owner: 'player', team: 'player', center: pointOf(P), radius: 2, duration: 10, tick: 1, damage: 10, color: 0xff0000 }));
P.fwd.set(0, 0, -1); H.tryCast('meteor'); assert.ok(aim.id); D.leave(); step(1);
assert.equal(aim.id, null); assert.equal(hazardsOf('player').length, 0); assert.equal(ctx.room, null); assert.ok(H.LocalLights.count < lightCount);
// 29d: Continue goes back into the cave, so the room frame is rebuilt rather than torn down.
D.enter(); step(1); assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); step(1);
assert.ok(ctx.room && D.inside, 'Continue resumed inside the cave');
assert.equal(aim.id, null); assert.equal(hazardsOf('player').length, 0); assert.equal(ctx.projectiles.length, 0);
assert.ok(ctx.enemies.every(e => e.space === ctx.room), 'no surface monster leaked into the rebuilt room');
D.leave(); step(1); assert.equal(ctx.room, null);
D.enter(); step(1); P.invuln = 0; hurtPlayer(99999, null, 0, { lethal: true, source: 'cave test' });
assert.equal(ctx.room, null); assert.ok(P.selfCollider.active); step(4); assert.ok(!P.dead && P.r < 200);
// The actual update callbacks may tear down the list they are iterating (a direct hurtPlayer call cannot prove this).
D.enter(); step(1); P.invuln = 0;
let impactAfterExit = false;
addHazard(new Blast({ owner: 'cave test', team: 'enemy', center: pointOf(P), radius: 2, delay: 0.05, damage: 99999, lethal: true, color: 0xff0000,
  onImpact: () => { impactAfterExit = true; } }));
step(0.2); assert.equal(ctx.room, null); assert.ok(P.dead); assert.equal(impactAfterExit, false);
assert.equal(hazardsOf('cave test').length, 0); step(4);
D.enter(); step(1); P.invuln = 0;
const shooter = spawnCaveEnemy('wisp', D.inside.x, D.inside.z - 1.5, { held: true, damage: 99999 });
shooter.toP.copy(ctx.room.toward(shooter.pos, P.pos)); shooter.fire(); step(0.5);
assert.equal(ctx.room, null); assert.ok(P.dead); assert.equal(ctx.projectiles.length, 0); step(4);
D.enter(); step(1); H.goToPlanet(1); step(0.5); assert.equal(ctx.room, null); assert.equal(D.inside, null);
assert.ok(ctx.enemies.every(e => !e.space)); assert.equal(P.space, null);
pass('exit, Continue, fainting and travel remove cave attacks and restore surface state');

// Houses keep their peaceful contract with no room combat context.
Houses.enter(0); step(1); assert.ok(Houses.inside && !ctx.room);
P.mana = P.stats.maxMana; const mana = P.mana; H.tryCast('bolt'); step(0.1);
assert.equal(ctx.projectiles.length, 0); assert.equal(P.mana, mana);
assert.ok(!ctx.companion.root.visible); assert.equal(H.Pets.useAbility(), false); Houses.leave(); step(1);
assert.ok(Object.values(CAVES).every(c => c.released === false));
pass('houses remain peaceful; every cave remains unreleased');
