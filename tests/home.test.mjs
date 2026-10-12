import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME, FURNISHINGS } from '../src/config/home.js';
import { HOUSES } from '../src/config/houses.js';
import { RECIPES } from '../src/config/crafting.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { cleanState, sanitizeSave } from '../src/core/save.js';
import { furnitureOverlapsHero } from '../src/gameplay/homeRules.js';
import { readFileSync } from 'node:fs';

test('a separate empty cottage preserves the six existing houses and their villagers', () => {
  assert.equal(HOME.houseIndex, 6); assert.equal(HOUSES[0].owner, 'Lio'); assert.equal(HOUSES[1].owner, 'Pim');
  assert.equal(HOUSES[2].owner, 'Old Bramble'); assert.equal(HOUSES[4].planets[1].owner, 'Cinder'); assert.equal(HOUSES[5].planets[2].owner, 'Tuva');
  const home = HOUSES[HOME.houseIndex]; assert.equal(home.layout, 'cottage'); assert.equal(home.playerHome, true);
  assert.equal(home.owner, undefined); assert.equal(home.resident, undefined); assert.deepEqual(home.props, ['homeSign']);
});
test('all five furnishings are craftable, with a bed available from first-world materials', () => {
  assert.equal(Object.keys(FURNISHINGS).length, 5);
  for (const [id, f] of Object.entries(FURNISHINGS)) {
    const item = itemRegistry.get(id), recipe = RECIPES.find(r => r.result === id);
    assert.equal(item.category, 'furniture'); assert.ok(recipe); assert.equal(recipe.discovery, undefined);
    assert.ok(recipe.needs.every(([material, count]) => itemRegistry.has(material) && Number.isInteger(count) && count > 0));
    assert.ok(['bed', 'table', 'rug', 'lamp', 'plant'].includes(f.kind));
  }
  assert.deepEqual(RECIPES.find(r => r.result === 'homeBed').needs, [['wood', 8], ['sweetleaf', 4]]);
});
test('home saves allow only known single furnishings and clear furniture in unclaimed cottages', () => {
  assert.deepEqual(cleanState('home', null), { claimed: false, furniture: [] });
  assert.deepEqual(cleanState('home', { claimed: true, furniture: ['homeBed', 'homeBed', 'foreign', '__proto__', 'homeRug'] }),
    { claimed: true, furniture: ['homeBed', 'homeRug'] });
  assert.deepEqual(cleanState('home', { claimed: false, furniture: ['homeBed'] }), { claimed: false, furniture: [] });
  assert.deepEqual(cleanState('home', { claimed: 'yes', furniture: 'homeBed' }), { claimed: false, furniture: [] });
});
test('solid furniture rejects a hero in its spot, while the rug remains walk-through', () => {
  assert.equal(furnitureOverlapsHero('homeBed', 3, -2.2), true);
  assert.equal(furnitureOverlapsHero('homeBed', -2.3, 2.2), false);
  assert.equal(furnitureOverlapsHero('homeRug', 0, 0.9), false);
});
test('defined house IDs retain chest, lore and oven progress; foreign and noncanonical IDs are rejected', () => {
  const result = cleanState('houses', { opened: ['lanternmoss:0', 'lanternmoss:6', 'lanternmoss:00', 'foreign:0', 'lanternmoss:99'],
    lore: { 'lanternmoss:2': 1, 'foreign:2': 8 }, ovenDay: { 'lanternmoss:1': 3, 'lanternmoss:99': 7 } });
  assert.deepEqual(result.opened, ['lanternmoss:0', 'lanternmoss:6']);
  assert.deepEqual(result.lore, { 'lanternmoss:2': 1 }); assert.deepEqual(result.ovenDay, { 'lanternmoss:1': 3 });
});
test('legacy version-1 saves remain readable without claiming or gifting a cottage', () => {
  const raw = JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8')), save = sanitizeSave(raw);
  assert.equal(save.version, 1); assert.deepEqual(save.planets, raw.planets); assert.deepEqual(save.systems.inventory, raw.systems.inventory);
});
