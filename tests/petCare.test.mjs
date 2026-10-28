import test from 'node:test';
import assert from 'node:assert/strict';
import { PETS, PET_BED, PET_FAVOURITES, PET_FINDS, PET_FOOD, PET_OUTFIT_FIT, petEdible } from '../src/config/pets.js';
import { CROPS } from '../src/config/resources.js';
import { RECIPES } from '../src/config/crafting.js';
import { FURNISHINGS } from '../src/config/home.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { cleanState } from '../src/core/save.js';

// Pet care (TODO 35) as authored data and pure rules: no scene. The runtime is tests/sim/petCare.sim.mjs.

test('every pet has real favourite foods, and between them they come from the farm, the ponds and the wilds', () => {
  const crops = new Set(Object.values(CROPS).flatMap(c => c.harvest.map(([id]) => id)));
  const sources = { farm: false, pond: false, wild: false };
  for (const id of Object.keys(PETS)) {
    const favs = PET_FAVOURITES[id];
    assert.ok(Array.isArray(favs) && favs.length >= 2, `${id} has at least two favourites`);
    for (const item of favs) {
      const def = itemRegistry.get(item);
      assert.ok(def, `${id}: ${item} is a real item`);
      assert.ok(petEdible(def), `${id}: ${item} is something a pet can eat`);
      if (crops.has(item)) sources.farm = true;
      else if (def.tags?.includes('fish') || ['silverSprat', 'clam'].includes(item)) sources.pond = true;
      else sources.wild = true;
    }
  }
  assert.deepEqual(sources, { farm: true, pond: true, wild: true });
  assert.equal(petEdible(itemRegistry.get('stone')), false, 'a stone is not food');
  assert.equal(petEdible(itemRegistry.get('honeyBun')), true, 'any food you could eat yourself is');
  for (const drink of ['healingPotion', 'restorativeElixir', 'frostDraught']) assert.equal(petEdible(itemRegistry.get(drink)), false, `${drink} is a potion, not food`);
});

test('feeding and finds are bounded, and every find is something real', () => {
  assert.ok(PET_FOOD.perDay >= 1 && PET_FOOD.favouriteXp > PET_FOOD.likedXp && PET_FOOD.likedXp > 0);
  assert.ok(PET_FOOD.happySeconds > 0 && PET_FOOD.happyDamage > 0 && PET_FOOD.happyDamage <= 0.5, 'Happy is a nudge, not a new pet');
  assert.ok(PET_FINDS.perDay >= 1 && PET_FINDS.chance > 0 && PET_FINDS.chance < 1 && PET_FINDS.interval >= 30);
  for (const [what, weight, [lo, hi]] of PET_FINDS.table) {
    assert.ok(what === 'coins' || itemRegistry.get(what), `${what} is a real item or coins`);
    assert.ok(weight > 0 && Number.isInteger(lo) && hi >= lo && lo >= 1);
  }
  const worst = Math.max(...PET_FINDS.table.map(([what, , [, hi]]) => (what === 'coins' ? hi : 0)));
  assert.ok(worst * PET_FINDS.perDay <= 30, 'a day of coin finds stays pocket money');
  assert.ok(PET_BED.heal > 0 && PET_BED.heal <= 1 && PET_BED.faintRate > 1);
});

test('pet outfits are craftable vanity, and every pet has a place to wear them', () => {
  const ids = ITEM_DEFINITIONS.filter(d => d.props?.petOutfit).map(d => d.id);
  assert.deepEqual(ids.sort(), ['petBow', 'petHat', 'petScarf'], 'a bow, a scarf and a party hat');
  for (const id of ids) {
    const def = itemRegistry.get(id);
    assert.ok(def && ['top', 'neck'].includes(def.props.petOutfit), `${id} says where it sits`);
    const recipe = RECIPES.find(r => r.result === id);
    assert.ok(recipe && recipe.group === 'Vanity' && !recipe.discovery, `${id} is crafted like the hero's vanity`);
    assert.ok(recipe.needs.every(([m]) => itemRegistry.get(m)), `${id}: real ingredients`);
  }
  for (const id of Object.keys(PETS)) {
    const fit = PET_OUTFIT_FIT[id];
    assert.ok(fit && fit.top.length === 3 && fit.neck.length === 3 && fit.s > 0, `${id} has a fit for every outfit`);
    assert.ok(fit.top[1] > fit.neck[1], `${id}: hats sit above scarves`);
  }
  assert.equal(FURNISHINGS.petBed.kind, 'petBed'); assert.ok(RECIPES.find(r => r.result === 'petBed'));
});

test('a pets save keeps care state sane', () => {
  const clean = cleanState('pets', { fed: { owl: 2, nobody: 3 }, fedDay: 4, happyT: -5, findsToday: 9, findT: 1e6,
    outfits: { owl: 'petBow', wolf: 'stone', nobody: 'petHat', fox: 7 } }, 'witch');
  assert.deepEqual(clean.fed, { owl: 2 });
  assert.equal(clean.fedDay, 4); assert.equal(clean.happyT, 0);
  assert.equal(clean.findsToday, PET_FINDS.perDay); assert.equal(clean.findT, PET_FINDS.interval);
  assert.deepEqual(clean.outfits, { owl: 'petBow' });
  const empty = cleanState('pets', null, 'witch');
  assert.deepEqual(empty.fed, {}); assert.deepEqual(empty.outfits, {}); assert.equal(empty.happyT, 0);
});
