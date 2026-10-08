// Better items end to end: equipping (stats, damage, armour, speed), wrong hero, unequip, rarity, crafting through the
// bag commands, quick slots on keys 6-8, monster drops, level-ups keep gear, a new adventure clears it.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { damageEnemy, hurtPlayer } = await imp('combat/damage.js');
const { equipFromSlot, unequip, computeStats } = await imp('gameplay/equipment.js');
const { bagCommands } = await imp('gameplay/bagCommands.js');
const { Hotbar } = await imp('gameplay/hotbar.js');
const { dropLoot, dropChance } = await imp('gameplay/drops.js');
const { RECIPES } = await imp('config/crafting.js');
const { InventoryUI } = await imp('ui/InventoryUI.js');
const { gainXp } = await imp('progression/experience.js');
const { H, step, game } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const P = H.player, inv = P.inventory, cmd = bagCommands(inv);
step(0.5);
const slotOf = id => inv.find(id);
// ---- equipping
const base = { ...P.stats };
inv.add('emberAxe', 1, { rarity: 'rare' }); inv.add('emberMail', 1); inv.add('glowStaff', 1);
let r = cmd.use(slotOf('emberAxe'));
check(r.ok && P.equipment.weapon?.itemId === 'emberAxe' && slotOf('emberAxe') < 0, `equip a weapon: "${r.message}"`);
check(Math.abs(P.stats.damageBonus - 0.26) < 1e-9 && P.stats.armor > base.armor, `a Rare Ember Greataxe: +26% damage, more armour (${P.stats.damageBonus}, ${P.stats.armor.toFixed(2)})`);
r = cmd.use(slotOf('glowStaff'));
check(!r.ok && /Only the Girl Witch/.test(r.message) && slotOf('glowStaff') >= 0, `the witch's staff is refused: "${r.message}"`);
cmd.use(slotOf('emberMail'));
check(P.stats.maxHp === base.maxHp + 20 && P.hp <= P.stats.maxHp, `armour adds max HP (${base.maxHp} -> ${P.stats.maxHp})`);
// damage really goes up
const e = ctx.enemies.find(x => x.alive && x !== ctx.boss); e.hp = 1000; damageEnemy(e, 10); const withGear = 1000 - e.hp;
P.equipment.weapon && unequip(inv, 'weapon'); e.hp = 1000; damageEnemy(e, 10); const without = 1000 - e.hp;
check(withGear > without, `hits land harder with the axe (${withGear} vs ${without})`);
check(slotOf('emberAxe') >= 0 && inv.getSlot(slotOf('emberAxe')).props?.rarity === 'rare', 'unequipping puts it back in the bag, still Rare');
// armour reduces damage taken
P.invuln = 0; P.hp = P.stats.maxHp; let hp0 = P.hp; hurtPlayer(20); const armoured = hp0 - P.hp;
unequip(inv, 'armor'); P.invuln = 0; P.hp = P.stats.maxHp; hp0 = P.hp; hurtPlayer(20); const plain = hp0 - P.hp;
check(armoured < plain, `armour softens blows (${armoured} vs ${plain})`);
// swapping: equip twice in the same slot
inv.add('mossAxe', 1); cmd.use(slotOf('emberAxe')); r = cmd.use(slotOf('mossAxe'));
check(P.equipment.weapon.itemId === 'mossAxe' && slotOf('emberAxe') >= 0, `swapping weapons sends the old one back: "${r.message}"`);
// move speed (ranger trinket works for everyone)
inv.add('frostLocket', 1, { rarity: 'legendary' }); cmd.use(slotOf('frostLocket'));
check(P.stats.moveSpeed > 0.1, `the Frost Locket speeds you up (+${Math.round(P.stats.moveSpeed * 100)}%)`);
// level-up keeps gear bonuses
const hpBefore = P.stats.maxHp; gainXp(200);
check(P.level > 1 && P.stats.maxHp > hpBefore && P.stats.moveSpeed > 0.1, `levelling up keeps the gear (max HP ${hpBefore} -> ${P.stats.maxHp})`);
check(JSON.stringify(computeStats(P)) === JSON.stringify(P.stats), 'stats are exactly base + level + gear');
// ---- crafting
P.coins = 100; inv.add('emberShard', 5);
const ring = RECIPES.find(x => x.id === 'emberRing'), home = P.up.clone(); P.placeAt(H.Stations.list.find(s => s.id === 'forge').dir); r = cmd.craft(ring);
check(r.ok && inv.count('emberRing') === 1 && [0, 10].includes(P.coins - (100 - ring.coins)) && inv.count('emberShard') === 0, `craft (+ the Handmade reward the first time): "${r.message}"`);
r = cmd.craft(ring); check(!r.ok && /materials/.test(r.message), `not enough: "${r.message}"`);
P.placeAt(home);
// ---- the hotbar (number keys) and letter-key skills
inv.clear(); Hotbar.reset(); step(0.1);
inv.add('honeyBun', 3); inv.add('glowcap', 5); inv.add('mossAxe', 1, { rarity: 'uncommon' });
const at = id => inv.find(id), dig = i => `Digit${i + 1}`;
check(at('honeyBun') < 9 && at('mossAxe') < 9 && at('glowcap') >= 9, `food and gear land on the hotbar, materials in the bag (${at('honeyBun')}, ${at('mossAxe')}, ${at('glowcap')})`);
press(dig(at('mossAxe'))); check(Hotbar.selected === at('mossAxe') && Hotbar.heldDef()?.id === 'mossAxe', 'a number key holds that hotbar slot');
press(dig(at('honeyBun'))); P.hp = 10; press(dig(at('honeyBun'))); step(0.05);
check(P.hp > 10 && inv.count('honeyBun') === 2, `pressing the held slot's number again eats the bun (HP ${Math.round(P.hp)})`);
const hpNow = P.hp; Hotbar.use(); check(P.hp === hpNow, 'a short cooldown between uses');
step(1); P.hp = P.stats.maxHp; Hotbar.use(); step(0.05); check(inv.count('honeyBun') === 2, 'not wasted at full health');
step(1); const axeSlot = at('mossAxe'); press(dig(axeSlot)); press(dig(axeSlot)); step(0.05);
check(P.equipment.weapon?.itemId === 'mossAxe' && P.equipment.weapon.props?.rarity === 'uncommon' && inv.getSlot(axeSlot)?.itemId === 'mossAxe',
  'using a held weapon equips it, and the old one takes its hotbar slot');
const freeHot = inv.getSlots().findIndex((x, i) => i < 9 && !x); inv.move(at('glowcap'), freeHot);
check(at('glowcap') === freeHot, 'items move between the bag and the hotbar');
step(1); press(dig(freeHot)); press(dig(freeHot)); check(inv.count('glowcap') === 5, 'a held material does nothing (a hint says where it goes)');
const { spellState } = await imp('combat/casting.js');
const { rebind, resetBinds } = await imp('core/keybinds.js');
const fresh = () => { for (const k in spellState.cd) spellState.cd[k] = 0; spellState.gcd = 0; P.mana = P.stats.maxMana; step(0.05); };
fresh(); press('Digit2'); check(spellState.cd.dash === 0, 'number keys no longer cast skills');
fresh(); press('KeyQ'); check(spellState.cd.dash > 0, 'skills are on letter keys (Q: Shoulder Charge)');
step(1.5); fresh(); rebind('skill2', 'KeyY'); press('KeyQ'); check(spellState.cd.dash === 0, 'after remapping skill 2 to Y, Q does nothing');
fresh(); press('KeyY'); check(spellState.cd.dash > 0, '...and Y casts it');
resetBinds(); step(1.5);
// ---- drops
let dropped = 0, n = 0;
for (const x of ctx.enemies.filter(x => x.alive && x !== ctx.boss && !x.def.object && !x.def.miniBoss).slice(0, 40)) { n++; dropped += dropLoot(x, () => 0).length; }
check(dropped >= n, `every monster can drop something (forced roll: ${dropped} drops from ${n})`);
check(ctx.enemies.filter(x => x.def.object).every(x => !dropLoot(x, () => 0).length), 'lair seals drop nothing');
check(dropChance({ xp: 10 }) < dropChance({ xp: 40 }), 'tougher monsters drop more often');
check(dropLoot(ctx.boss, () => 0).length === 0, 'bosses drop their chest instead');
// a real kill rolls drops
const before = ctx.worldItems.length; let kills = 0;
for (const x of ctx.enemies.filter(x => x.alive && x !== ctx.boss).slice(0, 25)) { x.hp = 1; damageEnemy(x, 50); kills++; }
check(ctx.worldItems.length > before, `${kills} kills left ${ctx.worldItems.length - before} drops on the ground`);
// ---- bag UI renders with gear and the craft tab
InventoryUI.open(); InventoryUI.setTab('craft'); InventoryUI.setTab('bag'); InventoryUI.close();
check(true, 'the bag window renders its tabs');
// ---- a new adventure
game.resetRun(); step(0.2);
check(!P.equipment.weapon && !P.equipment.charm && !P.stats.damageBonus && Hotbar.selected === 0, 'a new adventure: no gear, the first hotbar slot held');
console.log(fails ? `${fails} FAILED` : 'all passed');
