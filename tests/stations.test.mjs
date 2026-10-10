// Crafting stations (TODO 17): every station is real and makes something; first tools and basics are made by hand;
// the station rule in the crafting runtime. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES } from '../src/config/crafting.js';
import { STATION_CORNER, STATIONS } from '../src/config/stations.js';
import { Inventory } from '../src/inventory/Inventory.js';
import { craft, craftProblem, madeAt } from '../src/items/crafting.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';

const get = id => itemRegistry.get(id);

test('four stations, each with a look and recipes of its own', () => {
  assert.deepEqual(Object.keys(STATIONS).sort(), ['brew', 'forge', 'pot', 'workbench']);
  const models = readFileSync(new URL('../src/models/stations.js', import.meta.url), 'utf8');
  for (const [id, s] of Object.entries(STATIONS)) {
    assert.ok(s.name && s.short && s.does && Number.isInteger(s.color), `${id}: shape`);
    assert.ok(models.includes(`function ${id}(`), `${id}: a model`);
    assert.ok(RECIPES.filter(r => r.station === id).length >= 4, `${id}: makes several things`);
  }
  for (const r of RECIPES) assert.ok(!r.station || STATIONS[r.station], `${r.id}: station ${r.station}`);
  assert.ok(STATION_CORNER.reach > 1 && STATION_CORNER.spacing > 2 && STATION_CORNER.distance[0] > 8);
});

test('the right things need the right station; first tools need none', () => {
  for (const id of ['woodAxe', 'stonePick', 'hoe', 'fishingRod']) assert.ok(!RECIPES.find(r => r.result === id).station, `${id}: by hand`);
  for (const r of RECIPES) {
    const out = get(r.result);
    if (r.group === 'Food') assert.ok(r.station === 'pot' || r.id === 'moonberryTart', `${r.id}: cooked at the pot`);
    if (r.group === 'Potions') assert.ok(r.station === 'brew' || r.id === 'glowTonic', `${r.id}: brewed at the stand`);
    if (r.needs.some(([i]) => ['ironOre', 'copperOre', 'ironIngot', 'copperIngot', 'emberShard', 'frostPetal', 'amethyst', 'fireOpal', 'frostDiamond'].includes(i)) && out.equip && !out.equip.vanity)
      assert.equal(r.station, 'forge', `${r.id}: metal and gem gear at the forge`);
  }
  assert.ok(RECIPES.some(r => !r.station && get(r.result).category === 'consumable'), 'something to eat or drink can be made anywhere');
});

test('crafting refuses away from the station, works at it; by-hand recipes work anywhere', () => {
  const stew = RECIPES.find(r => r.id === 'veggieStew'), axe = RECIPES.find(r => r.id === 'woodAxe');
  const inv = new Inventory(8); inv.add('moonCarrot', 4); inv.add('sweetleaf', 2); inv.add('wood', 3); inv.add('stone', 2);
  assert.equal(craftProblem(stew, inv, 0, null), 'station');
  assert.equal(craftProblem(stew, inv, 0, 'forge'), 'station');
  assert.equal(craftProblem(stew, inv, 0, 'pot'), null);
  assert.equal(craftProblem(stew, inv, 0), null, 'no station given: the rule is skipped (pure callers)');
  assert.deepEqual(craft(stew, inv, 0, () => true, null), { ok: false, problem: 'station' });
  assert.equal(inv.count('moonCarrot'), 4, 'nothing taken when refused');
  assert.equal(craft(stew, inv, 0, () => true, 'pot').ok, true);
  assert.equal(inv.count('veggieStew'), 1);
  assert.equal(craft(axe, inv, 0, () => true, null).ok, true, 'a by-hand recipe anywhere');
  assert.ok(madeAt(axe, 'brew') && madeAt(stew, 'pot') && !madeAt(stew, null));
  const bare = new Inventory(4); assert.equal(craftProblem(stew, bare, 0, null), 'materials', 'missing materials are reported first');
});

test('smelting: ore and fuel at the forge make ingots, and the metal gear is made from ingots', async () => {
  const { FUEL } = await import('../src/config/crafting.js');
  const { fuelIn, fuelToBurn, requirements } = await import('../src/items/crafting.js');
  for (const id of ['copperIngot', 'ironIngot']) {
    const r = RECIPES.find(x => x.result === id); assert.ok(r && r.station === 'forge' && r.fuel > 0, `${id}: smelted at the forge with fuel`);
    assert.ok(RECIPES.some(x => x.needs.some(([i]) => i === id) && get(x.result).tool), `${id}: makes a tool`);
    assert.ok(RECIPES.some(x => x.needs.some(([i]) => i === id) && get(x.result).equip && !get(x.result).equip.vanity), `${id}: makes gear`);
  }
  for (const [item, v] of Object.entries(FUEL)) assert.ok(get(item) && v > 0, `fuel ${item}`);
  assert.ok(!RECIPES.some(r => r.needs.some(([i]) => i === 'copperOre' || i === 'ironOre') && get(r.result).equip), 'no gear from raw ore any more');
  // fuel counting and burning
  const inv = new Inventory(8); inv.add('wood', 2); inv.add('charcoal', 1);
  assert.equal(fuelIn(inv), 2 + FUEL.charcoal);
  assert.deepEqual(fuelToBurn(inv, 2), [['wood', 2]], 'plain wood burns first');
  assert.deepEqual(fuelToBurn(inv, 4), [['wood', 2], ['charcoal', 1]]);
  assert.deepEqual(fuelToBurn(inv, 2 + FUEL.charcoal), [['wood', 2], ['charcoal', 1]]);
  assert.equal(fuelToBurn(inv, 3 + FUEL.charcoal), null);
  const iron = RECIPES.find(x => x.id === 'ironIngot'); inv.add('ironOre', 4);
  assert.equal(craftProblem(iron, new Inventory(4), 0, 'forge'), 'materials');
  const noFuel = new Inventory(4); noFuel.add('ironOre', 2);
  assert.equal(craftProblem(iron, noFuel, 0, 'forge'), 'fuel');
  assert.equal(craft(iron, inv, 0, () => true, 'forge').ok, true);
  assert.deepEqual([inv.count('ironIngot'), inv.count('ironOre'), inv.count('wood'), inv.count('charcoal')], [1, 2, 0, 1], 'two ore and two wood went in');
  // wood that's also an ingredient isn't counted as fuel too
  const charcoal = RECIPES.find(x => x.id === 'charcoal'), w = new Inventory(4); w.add('wood', 3);
  assert.equal(requirements(charcoal, w).fuel.need, 0);
  const pick = RECIPES.find(x => x.id === 'copperPick'), only = new Inventory(4); only.add('copperIngot', 3); only.add('wood', 2);
  assert.equal(craftProblem(pick, only, 99, 'forge'), null);
});
