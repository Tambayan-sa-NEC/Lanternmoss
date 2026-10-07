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
    if (r.needs.some(([i]) => ['ironOre', 'copperOre', 'emberShard', 'frostPetal', 'amethyst', 'fireOpal', 'frostDiamond'].includes(i)) && out.equip && !out.equip.vanity)
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
