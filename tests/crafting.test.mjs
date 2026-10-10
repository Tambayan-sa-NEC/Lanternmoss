import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, DISCOVERY_RECIPES } from '../src/config/crafting.js';
import { RUNES } from '../src/config/magic.js';
import { PLANETS } from '../src/config/planets.js';
import { COMBAT } from '../src/config/combat.js';
import { STATS } from '../src/config/items.js';
import { Inventory } from '../src/inventory/Inventory.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { craft, craftProblem, maxCraftable, requirements } from '../src/items/crafting.js';
import { enchantProblem } from '../src/items/enchanting.js';
import { gearStats, gearTotals } from '../src/items/gear.js';
import { cleanState, cleanStack } from '../src/core/save.js';

const recipe = id => RECIPES.find(r => r.id === id);
test('bulk crafting exchanges all five sets and charges coins once for the entire batch', () => {
  const inv = new Inventory(8); inv.add('emberShard', 25); let coins = 200, calls = 0;
  assert.equal(craft(recipe('emberRing'), inv, coins, n => { calls++; coins -= n; return true; }, 'forge', 5).ok, true);
  assert.equal(calls, 1); assert.equal(coins, 50); assert.equal(inv.count('emberShard'), 0); assert.equal(inv.count('emberRing'), 5);
  assert.ok(inv.getSlots().filter(s => s?.itemId === 'emberRing').every(s => s.props.rarity === 'uncommon'));
});
test('failed bulk crafts never partially remove materials, charge coins or create output', () => {
  const r = recipe('emberRing');
  for (const [size, shards, coins, problem] of [[8, 24, 200, 'materials'], [8, 25, 149, 'coins'], [2, 25, 200, 'space']]) {
    const inv = new Inventory(size); inv.add('emberShard', shards); const before = inv.toJSON();
    assert.equal(craft(r, inv, coins, () => { assert.fail('preflight must refuse before payment'); }, 'forge', 5).problem, problem);
    assert.deepEqual(inv.toJSON(), before);
  }
  const inv = new Inventory(8); inv.add('emberShard', 25); const before = inv.toJSON();
  assert.equal(craft(r, inv, 200, () => false, 'forge', 5).problem, 'coins'); assert.deepEqual(inv.toJSON(), before);
  for (const n of [0, -1, NaN, Infinity, 1.5, '5', 10001]) {
    assert.equal(craft(r, inv, 200, () => true, 'forge', n).problem, 'quantity'); assert.deepEqual(inv.toJSON(), before);
  }
});
test('preflight counts exact output stacks and slots freed by fuel, without any inventory events', () => {
  const inv = new Inventory(2); inv.add('copperOre', 4); inv.add('charcoal', 1); let events = 0;
  inv.addEventListener('change', () => events++);
  assert.equal(craftProblem(recipe('copperIngot'), inv, 0, 'forge'), null); assert.equal(events, 0);
  assert.equal(craft(recipe('copperIngot'), inv, 0, () => true, 'forge').ok, true);
  assert.equal(inv.count('copperIngot'), 1); assert.equal(inv.count('copperOre'), 2);
  const tight = new Inventory(1); tight.add('glowcap', 3);
  const huge = { ...recipe('glowTonic'), qty: 11 };
  assert.equal(craftProblem(huge, tight), 'space', 'one freed slot cannot fit eleven bottles with max stack ten');
});
test('Smelt all respects materials, pooled fuel, station and capacity even when smaller batches do not fit', () => {
  const inv = new Inventory(6); inv.add('copperOre', 14); inv.add('charcoal', 2);
  assert.equal(maxCraftable(recipe('copperIngot'), inv, 0, 'forge'), 7);
  assert.equal(maxCraftable(recipe('copperIngot'), inv, 0, 'pot'), 0);
  craft(recipe('copperIngot'), inv, 0, () => true, 'forge', 7);
  assert.equal(inv.count('copperIngot'), 7); assert.equal(inv.count('charcoal'), 0); assert.equal(inv.count('copperOre'), 0);
  const wood = new Inventory(1); wood.add('wood', 16);
  const sharedFuel = { ...recipe('charcoal'), fuel: 1 };
  assert.deepEqual(requirements(sharedFuel, wood, 0, 4).fuel, { have: 4, need: 4 });
  assert.equal(maxCraftable(sharedFuel, wood, 0, 'forge'), 4);
  craft(sharedFuel, wood, 0, () => true, 'forge', 4); assert.equal(wood.count('charcoal'), 8);
  const full = new Inventory(1); full.add('glowcap', 15);
  assert.equal(craftProblem(recipe('glowTonic'), full), 'space');
  assert.equal(maxCraftable(recipe('glowTonic'), full), 5, 'largest batch frees the ingredient slot');
});
test('each discovery source exists; essential recipes and every first tool remain available', () => {
  for (const r of DISCOVERY_RECIPES) {
    const d = r.discovery;
    if (d.kind === 'bestiary') assert.ok(COMBAT.enemies[d.enemy] && PLANETS.some(p => p.roster.some(e => e.type === d.enemy)));
    else assert.ok(PLANETS.some(p => p.id === d.planet));
    if (d.kind === 'scroll') assert.equal(itemRegistry.get(`${r.id}Scroll`).use[0].recipeId, r.id);
  }
  for (const id of ['woodAxe', 'stonePick', 'fishingRod', 'hoe', 'wateringCan', 'healingPotion', 'lanternKey', 'sunBread', 'koiFeast'])
    assert.equal(recipe(id).discovery, undefined, id);
});
test('enchantments add fixed bonuses, preserve rarity, never affect vanity, and respect existing caps', () => {
  const def = itemRegistry.get('emberAxe');
  for (const rarity of ['common', 'rare', 'legendary']) {
    const base = gearStats(def, { rarity });
    assert.deepEqual(gearStats(def, { rarity, enchantment: 'mossRune' }), { ...base, maxHp: 12, hpRegen: 0.5 });
  }
  assert.deepEqual(gearStats(itemRegistry.get('flowerCrown'), { enchantment: 'mossRune' }), {});
  assert.deepEqual(gearStats(def, { enchantment: 'unknown' }), gearStats(def));
  const totals = gearTotals(Array.from({ length: 30 }, () => ({ def, props: { enchantment: 'emberRune' } })), 'knight');
  assert.equal(totals.damage, STATS.damage.cap);
  for (const rune of Object.values(RUNES)) for (const key of Object.keys(rune.stats)) assert.ok(STATS[key]);
});
test('enchanting requires a rune, suitable hero gear and the forge, and refuses repeat application', () => {
  const inv = new Inventory(2), def = itemRegistry.get('emberAxe'); inv.add('emberRune', 1);
  assert.equal(enchantProblem(def, null, 'emberRune', inv, 'knight', 'forge'), null);
  assert.match(enchantProblem(def, null, 'emberRune', inv, 'witch', 'forge'), /Only/);
  assert.match(enchantProblem(def, null, 'emberRune', inv, 'knight', 'pot'), /forge/);
  assert.match(enchantProblem(def, { enchantment: 'emberRune' }, 'emberRune', inv, 'knight', 'forge'), /already/);
  assert.match(enchantProblem(itemRegistry.get('flowerCrown'), null, 'emberRune', inv, 'knight', 'forge'), /combat gear/);
  assert.match(enchantProblem(def, null, 'frostRune', inv, 'knight', 'forge'), /need one/);
});
test('save cleaning preserves known gear runes and discoveries, rejects injected props, locked favourites and malformed meals', () => {
  const props = { rarity: 'rare', enchantment: 'mossRune' };
  assert.deepEqual(cleanStack({ itemId: 'emberRing', quantity: 1, props: { ...props, damage: 999 } }).props, props);
  assert.equal(cleanStack({ itemId: 'wood', quantity: 1, props: { enchantment: 'mossRune' } }).props, null);
  assert.equal(cleanStack({ itemId: 'flowerCrown', quantity: 1, props: { enchantment: 'mossRune' } }).props, null);
  assert.equal(cleanStack({ itemId: 'emberRing', quantity: 1, props: { enchantment: ['mossRune', 'emberRune'] } }).props, null);
  assert.deepEqual(cleanState('crafting', { learned: ['perchChowder', 'perchChowder', 'fake', 'woodAxe'], favourites: ['perchChowder', 'mossRune', 'woodAxe', 'fake'] }),
    { learned: ['perchChowder'], favourites: ['perchChowder', 'woodAxe'] });
  assert.deepEqual(cleanState('buffs', { meal: { kind: 'ward', seconds: 99999 } }).meal, { kind: 'ward', seconds: 3600 });
  assert.equal(cleanState('buffs', { meal: { kind: 'howl', seconds: 90 } }).meal, null);
});
