// Better items: gear stats and rarity (src/items/gear.js), crafting (src/items/crafting.js, config/crafting.js),
// quick slots config and per-item art coverage. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARACTERS } from '../src/config/characters.js';
import { RECIPES } from '../src/config/crafting.js';
import { EQUIP_SLOTS, ITEM_ART_KINDS, ITEM_DEFINITIONS, QUICK_SLOTS, RARITIES, STATS } from '../src/config/items.js';
import { Inventory } from '../src/inventory/Inventory.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { craft, craftProblem, recipesFor } from '../src/items/crafting.js';
import { applyGear, equipProblem, formatStat, gearStats, gearTotals, itemRarity } from '../src/items/gear.js';

const get = id => itemRegistry.get(id);
const GEAR = ITEM_DEFINITIONS.filter(d => d.equip);

test('every item has its own art kind, and every art kind has an SVG icon and a world model', () => {
  for (const d of ITEM_DEFINITIONS) assert.ok(ITEM_ART_KINDS.includes(d.icon.art), `${d.id}: icon.art "${d.icon.art}"`);
  const svg = readFileSync(new URL('../src/ui/itemArt.js', import.meta.url), 'utf8');
  const models = readFileSync(new URL('../src/models/items.js', import.meta.url), 'utf8');
  for (const k of ITEM_ART_KINDS) {
    assert.match(svg, new RegExp(`\\n  ${k}: \\(`), `ui/itemArt.js has no icon for ${k}`);
    assert.match(models, new RegExp(`\\n  ${k}: \\(`), `models/items.js has no world model for ${k}`);
  }
});

test('gear: a slot, real stats, a tier, and weapons for every hero at each tier', () => {
  for (const d of GEAR) {
    assert.ok(d.equip.slot in EQUIP_SLOTS && Object.keys(d.equip.stats).length, `${d.id}: slot and stats`);
    for (const k of Object.keys(d.equip.stats)) assert.ok(k in STATS, `${d.id}: stat ${k}`);
    assert.ok(!d.equip.hero || CHARACTERS[d.equip.hero], `${d.id}: hero ${d.equip.hero}`);
    assert.ok([1, 2, 3].includes(d.equip.tier ?? 1), `${d.id}: tier`);
    assert.equal(get(d.id).stackable, false, `${d.id}: gear doesn't stack`);
  }
  for (const hero of Object.keys(CHARACTERS)) {
    assert.ok(GEAR.filter(d => d.equip.slot === 'weapon' && d.equip.hero === hero).length >= 2, `${hero}: at least two weapons`);
    assert.ok(GEAR.some(d => d.equip.slot === 'weapon' && d.equip.hero === hero && d.equip.tier === 1), `${hero}: a first-planet weapon`);
  }
  for (const s of Object.keys(EQUIP_SLOTS)) assert.ok(GEAR.some(d => d.equip.slot === s && (d.equip.tier ?? 1) === 1), `a tier-1 ${s}`);
});

test('rarity multiplies gear stats; better rarities are always stronger', () => {
  const order = Object.keys(RARITIES);
  for (let i = 1; i < order.length; i++) assert.ok(RARITIES[order[i]].statMult > RARITIES[order[i - 1]].statMult);
  const axe = get('emberAxe');
  assert.equal(itemRarity(axe, null), 'common'); assert.equal(itemRarity(axe, { rarity: 'rare' }), 'rare'); assert.equal(itemRarity(axe, { rarity: 'bogus' }), 'common');
  assert.deepEqual(gearStats(axe), { damage: 0.15, armor: 0.03 });
  assert.deepEqual(gearStats(axe, { rarity: 'legendary' }), { damage: 0.35, armor: 0.07 });
  assert.equal(gearStats(get('mossCloak'), { rarity: 'rare' }).maxHp, 20);
  assert.equal(formatStat('damage', 0.35), '+35% damage');
  assert.equal(formatStat('maxMana', 13, 'stamina'), '+13 max stamina');
});

test('wearing gear: totals, caps, the right hero only, and applied on top of the base stats', () => {
  const pieces = [{ def: get('emberAxe'), props: { rarity: 'rare' } }, { def: get('emberMail'), props: null }, { def: get('emberRing'), props: { rarity: 'legendary' } }];
  const t = gearTotals(pieces, 'knight');
  assert.equal(t.damage, Math.min(STATS.damage.cap, 0.26 + 0.14));
  assert.equal(t.maxHp, 20);
  assert.equal(gearTotals(pieces, 'witch').damage, 0.14, "the knight's axe does nothing for the witch");
  assert.ok(gearTotals([{ def: get('frostLocket'), props: { rarity: 'legendary' } }, { def: get('thornBow'), props: { rarity: 'legendary' } }], 'ranger').moveSpeed <= STATS.moveSpeed.cap);
  const s = applyGear({ maxHp: 140, maxMana: 100, hpRegen: 5, manaRegen: 16, armor: 0.2 }, t);
  assert.equal(s.maxHp, 160); assert.equal(s.damageBonus, t.damage); assert.ok(Math.abs(s.armor - (0.2 + t.armor)) < 1e-9); assert.equal(s.moveSpeed, 0);
  assert.deepEqual(applyGear({ maxHp: 90 }, {}), { maxHp: 90, damageBonus: 0, moveSpeed: 0 });
  assert.equal(equipProblem(get('emberAxe'), 'knight'), null);
  assert.equal(equipProblem(get('emberAxe'), 'witch'), `Only the ${CHARACTERS.knight.title} can use the Ember Greataxe.`);
  assert.match(equipProblem(get('honeyBun'), 'witch'), /can't be worn/);
});

test('recipes only use real items, and every material crafts something', () => {
  const ids = new Set(ITEM_DEFINITIONS.map(d => d.id));
  assert.equal(new Set(RECIPES.map(r => r.id)).size, RECIPES.length, 'recipe ids are unique');
  for (const r of RECIPES) {
    assert.ok(ids.has(r.result), `${r.id}: result ${r.result}`);
    for (const [item, n] of r.needs) assert.ok(ids.has(item) && Number.isInteger(n) && n > 0, `${r.id}: needs ${item} x${n}`);
    assert.ok(!r.rarity || RARITIES[r.rarity], `${r.id}: rarity`);
    assert.ok(!r.rarity || get(r.result).equip, `${r.id}: only gear gets a rarity`);
  }
  for (const d of ITEM_DEFINITIONS.filter(d => d.category === 'material')) assert.ok(RECIPES.some(r => r.needs.some(([i]) => i === d.id)), `${d.id} is used by a recipe`);
  for (const d of GEAR) assert.ok(RECIPES.some(r => r.result === d.id), `${d.id} can be crafted`);
  const witch = recipesFor('witch', itemRegistry).map(r => r.result);
  assert.ok(witch.includes('glowStaff') && !witch.includes('mossAxe') && witch.includes('mossCloak'), 'weapons only for their hero');
});

test('crafting takes the ingredients and coins, gives the result at its rarity, and refuses when short', () => {
  const inv = new Inventory(6), r = RECIPES.find(x => x.id === 'emberRing');
  let coins = 100; const pay = n => { if (coins < n) return false; coins -= n; return true; };
  assert.equal(craftProblem(r, inv, coins), 'materials');
  inv.add('emberShard', 7);
  assert.equal(craftProblem(r, inv, 10), 'coins');
  assert.deepEqual(craft(r, inv, coins, pay), { ok: true, problem: null });
  assert.equal(inv.count('emberShard'), 2); assert.equal(coins, 100 - r.coins);
  const ring = inv.getSlots().find(s => s?.itemId === 'emberRing');
  assert.equal(ring.props.rarity, r.rarity);
  // a full bag: still fine if the ingredients free a slot
  const full = new Inventory(2); full.add('glowcap', 3); full.add('moonberry', 1);
  assert.equal(craftProblem(RECIPES.find(x => x.id === 'glowTonic'), full, 0), null, 'the glowcaps leave, the tonic takes their slot');
  assert.equal(craft(RECIPES.find(x => x.id === 'glowTonic'), full, 0, pay).ok, true);
  assert.equal(full.count('glowTonic'), 1);
  const tight = new Inventory(2); tight.add('glowcap', 5); tight.add('moonberry', 1);
  assert.equal(craftProblem(RECIPES.find(x => x.id === 'glowTonic'), tight, 0), 'space');
});

test('quick slots sit clear of the ability keys', () => {
  const abilityKeys = new Set(Object.values(CHARACTERS).flatMap(c => Object.values(c.abilities).flatMap(a => a.keys)));
  assert.equal(QUICK_SLOTS.keys.length, QUICK_SLOTS.labels.length);
  for (const k of QUICK_SLOTS.keys) assert.ok(!abilityKeys.has(k), `${k} is an ability key`);
});
