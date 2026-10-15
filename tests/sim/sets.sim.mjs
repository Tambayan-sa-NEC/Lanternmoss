// TODO 28a (gear sets): wearing two or three distinct pieces of a world's set turns on its bonus through the real bag
// equip path. Moss heals more (food, regeneration), Ember hits burn (ticks, refresh, a burning kill pays XP), Frost hits
// chill, the Tide set halves swimming's energy cost and its Breaker pushes; unequipping turns a bonus off, pet hits
// never proc, every hero gets the same bonus, and a load keeps the bonus without doubling a burn.
import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { damageEnemy } = await imp('combat/damage.js');
const { Equipment, computeStats, equipFromSlot, unequip } = await imp('gameplay/equipment.js');
const { useItemInSlot } = await imp('gameplay/itemUse.js');
const { itemRegistry } = await imp('items/ItemRegistry.js');
const { BURN_TICK } = await imp('config/sets.js');
const { H, step } = await boot('knight');
const P = H.player, inv = P.inventory;
const pass = m => console.log(`PASS  ${m}`);
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
H.Tutorial.skip(); H.Pets.command('passive'); P.invuln = 1e9; step(0.3);

/** Equips `id` through the bag, like a double-click on it. */
const wear = id => { inv.add(id, 1); const slot = inv.getSlots().findIndex(s => s?.itemId === id); const r = equipFromSlot(inv, slot); assert.ok(r.ok, r.message); };
const takeOff = where => assert.ok(unequip(inv, where).ok);
const fx = () => P.stats.setFx;
const target = (type = 'ogre') => { const e = H.spawnEnemy(type, 3); e.temporary = true; e.hp = e.def.hp = 5000; return e; };

// ---- Moss: healing, on at two pieces, off again when one comes off ---------------------------------------------------
const food = itemRegistry.all().find(d => d.use?.length === 1 && d.use[0].effect === 'heal');
const eat = () => { P.hp = 10; inv.add(food.id, 1); useItemInSlot(inv, inv.getSlots().findIndex(s => s?.itemId === food.id)); return P.hp - 10; };
const plain = eat();
wear('mossHood'); assert.equal(fx().healing, 0, 'one piece is not a set');
wear('mossCloak'); assert.equal(fx().healing, 0.15);
near(eat(), plain * 1.15, 0.01, 'two Moss pieces heal 15% more from food');
wear('wanderBoots'); near(eat(), plain * 1.3, 0.01, 'three Moss pieces heal 30% more');
const regen = () => { P.hp = 10; P.lastHurt = -1e9; const before = P.hp; step(1); return P.hp - before; };
const mossRegen = regen(); takeOff('head'); assert.equal(fx().healing, 0.15, 'two left: back to the two-piece bonus');
takeOff('armor'); assert.equal(fx().healing, 0, 'one left: no bonus');
const baseRegen = regen(); near(mossRegen, baseRegen * 1.3, baseRegen * 0.05, 'regeneration heals 30% more in the full set');
takeOff('feet');
pass(`Moss: food heals ${plain} -> ${(plain * 1.3).toFixed(0)} and regeneration ${baseRegen.toFixed(2)} -> ${mossRegen.toFixed(2)} HP/s in the full set; taking pieces off steps the bonus down to nothing`);

// ---- Ember: hits burn for 70% more over 3 s; refreshed, not stacked; pet hits don't burn; a burning kill pays XP ----
for (const id of ['emberHelm', 'emberMail', 'emberBoots']) wear(id);
const e = target(), hp0 = e.hp;
damageEnemy(e, 40); const hit = hp0 - e.hp;
assert.ok(e.burn && e.burn.t === 3, 'the hit set it burning');
step(3.2);
const burned = hp0 - hit - e.hp;
near(burned, hit * 0.7, 3, 'the burn dealt 70% of the hit over 3 s');
assert.equal(e.burn, null, 'the burn ran out');
damageEnemy(e, 40); step(1); damageEnemy(e, 40); assert.equal(e.burn.t, 3, 'a new hit refreshes the burn'); step(3.2);
const pe = target(); damageEnemy(pe, 40, { source: 'pet' }); assert.equal(pe.burn, null, 'pet hits never burn');
const k = target('goblin'); k.hp = k.def.hp = 30; const xp0 = P.xp + P.level * 1e6;
damageEnemy(k, 20); assert.ok(k.alive && k.burn);
for (let i = 0; i < 300 && k.alive; i++) step(BURN_TICK / 5);
assert.ok(!k.alive, 'the burn finished it'); assert.ok(P.xp + P.level * 1e6 > xp0, 'a burning kill pays XP');
pass(`Ember: a ${hit}-damage hit burned for ${burned} more over 3 s in ${BURN_TICK}s ticks; hits refresh the burn; pet hits don't burn; a burn kill pays XP`);

// ---- a load keeps the bonus and never doubles a burn ------------------------------------------------------------------
const saved = Equipment.toJSON(); Equipment.load(structuredClone(saved)); Equipment.load(structuredClone(saved));
assert.deepEqual(fx().burn, { share: 0.7, time: 3 });
const le = target(); const l0 = le.hp; damageEnemy(le, 40); const lhit = l0 - le.hp; step(3.2);
near(l0 - lhit - le.hp, lhit * 0.7, 3, 'one burn after loading twice');
for (const where of ['head', 'armor', 'feet']) takeOff(where);
assert.equal(fx().burn, undefined);
pass('loading the gear twice keeps one Ember bonus: one hit still burns once');

// ---- Frost: hits chill (slowResist applies; a stronger slow is kept) ----------------------------------------------------
for (const id of ['frostCirclet', 'frostMantle', 'snowstepBoots']) wear(id);
const f = target('goblin'); damageEnemy(f, 10);
assert.equal(f.slowT, 2); near(f.slowAmt, 0.35 * (1 - (f.def.slowResist || 0)), 1e-9, 'chill');
f.slowAmt = 0.8; f.slowT = 1; damageEnemy(f, 10); assert.equal(f.slowAmt, 0.8, 'a stronger slow already on it is kept');
const o = target(); damageEnemy(o, 10); near(o.slowAmt, 0.35 * (1 - o.def.slowResist), 1e-9, 'ogres resist half');
for (const where of ['head', 'armor', 'feet']) takeOff(where);
pass('Frost: hits chill 35% for 2 s (an ogre resists half); a stronger slow is never weakened');

// ---- Tide: swimming costs half the energy; Breaker pushes ----------------------------------------------------------
const swimDrain = () => { P.energy = 50; P.swimming = true; P.sprinting = false; H.Needs.update(1); P.swimming = false; return 50 - P.energy; };
const plainSwim = swimDrain();
for (const id of ['tideCirclet', 'tideMantle']) wear(id);
const tideSwim = swimDrain(); assert.ok(tideSwim < plainSwim, `${tideSwim} < ${plainSwim}`);
const g = target('goblin'); g.knock.set(0, 0, 0); damageEnemy(g, 1); const noPush = g.knock.length();
wear('tideBoots'); const g2 = target('goblin'); g2.knock.set(0, 0, 0); damageEnemy(g2, 1);
assert.ok(noPush === 0 && g2.knock.length() > 2, `Breaker: ${g2.knock.length()}`);
pass(`Tide: swimming drains ${plainSwim.toFixed(3)} -> ${tideSwim.toFixed(3)} energy/s with two pieces; the third adds a ${g2.knock.length().toFixed(1)} push`);

// ---- every hero: the same pieces give the same bonus ----------------------------------------------------------------
for (const charId of ['witch', 'knight', 'ranger']) assert.deepEqual(computeStats({ ...P, charId }).setFx, P.stats.setFx, charId);
pass('the witch, knight and ranger get the same set bonuses from the same pieces');
