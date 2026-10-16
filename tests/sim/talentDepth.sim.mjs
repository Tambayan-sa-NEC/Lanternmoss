// TODO 28e depth acceptance: sets (28a) and all three talent trees (28c-28e) together on real casts. A talent variant
// carries the worn set's effect to every foe it reaches (Wide Cleave + Ember burns both foes, Wide Fan + Frost chills
// the foe aside, Seeking Fireball + Ember burns its target); Old Bramble's reset takes talents only, unequipping takes
// set bonuses only; Continue keeps both. Isolated dry arena without scenery colliders; passive pets; invulnerable.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { computeStats, equipFromSlot, unequip } = await imp('gameplay/equipment.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { addEnemy } = await imp('combat/spawning.js');
const { kit, resetCooldowns } = await imp('combat/casting.js');
const { targeting, updateAim } = await imp('combat/targeting.js');
const { colliders } = await imp('physics/colliders.js');
const { dirAlong, offsetDir, tangentFrame } = await imp('utils/sphere.js');
const { waterAt, slopeAt } = await imp('world/terrain.js');
const { resetBuffs } = await imp('gameplay/buffs.js');
const { Needs } = await imp('gameplay/Needs.js');
const { H, game, step } = await boot('knight');
const P = H.player, T = H.Talents, inv = P.inventory;
const pass = m => console.log(`PASS  ${m}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9;
for (const e of ctx.enemies) if (e !== H.boss) e.vanish();
let field;
for (let i = 0; i < 500 && !field; i++) { const d = offsetDir(game.world.spawnDir, i * 2.39996, 33 + i % 15); if (!waterAt(d) && slopeAt(d) < 0.2) field = d; }
assert.ok(field); colliders.length = 0;
const forward = tangentFrame(field)[0];
const clean = () => {
  for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
  for (const e of ctx.enemies) if (e.alive && e !== H.boss) e.vanish();
  P.placeAt(field); P.fwd.copy(forward); P.clearTimers(); P.invuln = 1e9; resetBuffs(); Needs.reset(); ctx.companion.snapToHero();
  P.mana = P.stats.maxMana; resetCooldowns(kit()); targeting.aim = null;
};
// ordinary ogres held by a long stun (static objects, like lair seals, skip the update where burns tick)
const foe = (dist, deg) => { const e = addEnemy('ogre', dirAlong(field, forward.clone().applyAxisAngle(field, deg * Math.PI / 180), dist)); e.hp = e.def.hp = 1000; e.stunT = 60; return e; };
const wear = ids => { for (const id of ids) { inv.add(id, 1); assert.ok(equipFromSlot(inv, inv.getSlots().findIndex(s => s?.itemId === id)).ok, id); } };
const strip = () => { for (const k of ['head', 'armor', 'feet']) if (P.equipment[k]) unequip(inv, k); };
const hero = id => { strip(); T.clear(); applyCharacter(id); P.level = 16; P.stats = computeStats(P); H.Pets.command('passive'); };
const learn = ids => { for (const id of ids) assert.ok(T.learn(id).ok, id); };
const cast = id => { P.fwd.copy(forward); H.cam.fwd.copy(forward); updateAim(); H.tryCast(id); };

// ---- Warrior: Wide Cleave + Ember set: one swing sets both foes burning ----------------------------------------------
hero('knight'); wear(['emberHelm', 'emberMail', 'emberBoots']); learn(['keenEdge', 'wideCleave']); clean();
let a = foe(2, 0), b = foe(2, 70); cast('slash');
assert.ok(a.burn && b.burn, 'both foes burn'); const hit = 1000 - b.hp; step(3.2);
assert.ok(Math.abs((1000 - b.hp - hit) - hit * 0.7) <= 3, `the foe aside burned ${1000 - b.hp - hit} for a ${hit} hit`);
a.vanish(); b.vanish();
pass(`Warrior: one Wide Cleave with the Ember set burns both foes; the one aside burned ${1000 - b.hp - hit} more after a ${hit} hit`);

// ---- Ranger: Wide Fan + Frost set: the foe off to the side is chilled -------------------------------------------------
hero('ranger'); wear(['frostCirclet', 'frostMantle', 'snowstepBoots']); learn(['quickFan', 'wideFan']); clean();
a = foe(7, 0); b = foe(8, 32); cast('volley'); step(1);
assert.ok(b.hp < 1000 && b.slowT > 0, 'the foe aside is hit and chilled'); assert.ok(Math.abs(b.slowAmt - 0.35 * (1 - b.def.slowResist)) < 1e-9);
a.vanish(); b.vanish();
pass('Ranger: Wide Fan with the Frost set hits and chills the foe 32 degrees aside (35%, an ogre resists half)');

// ---- Witch: Seeking Fireball + Ember set: the followed foe burns after the blast ------------------------------------
hero('witch'); wear(['emberHelm', 'emberMail', 'emberBoots']); learn(['brightBolt', 'seekingFlame']); clean();
a = foe(8, 0); targeting.aim = a; H.tryCast('fireball'); const shot = ctx.projectiles.at(-1); assert.equal(shot.homing, 4);
for (let i = 0; i < 240 && ctx.projectiles.includes(shot); i++) step(1 / 60);
assert.ok(a.hp < 1000 && a.burn, 'the blast landed and the foe burns'); a.vanish();
pass('Witch: Seeking Fireball with the Ember set leaves its target burning');

// ---- the village reset takes talents only; unequipping takes set bonuses only; Continue keeps both ------------------
const fx = structuredClone(P.stats.setFx), ranks = { ...T.ranks };
for (let i = 0; i < 2; i++) { assert.ok(game.saves.save().ok); assert.ok(game.saves.continue()); }
assert.deepEqual(T.ranks, ranks); assert.deepEqual(P.stats.setFx, fx); assert.equal(kit().fireball.homing, 4);
const bramble = H.npcs.find(n => n.name === 'Old Bramble');
H.Dialog.start(bramble); H.Dialog.finishTyping(); H.Dialog.choose(true); H.Dialog.close();
assert.deepEqual(T.ranks, {}); assert.deepEqual(P.stats.setFx, fx, 'the Ember set still burns after the reset');
learn(['brightBolt', 'seekingFlame']); strip();
assert.equal(P.stats.setFx.burn, undefined); assert.equal(kit().fireball.homing, 4, 'talents stay when the set comes off');
pass('two Continue cycles keep talents and set bonuses; Old Bramble resets only talents; taking the set off keeps the talents');
console.log('all passed');
