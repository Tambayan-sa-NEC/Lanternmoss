/* Crafting rules (recipes: config/crafting.js). Pure apart from the inventory it's handed, so it's unit-tested with a
   real Inventory: tests/items.test.mjs. The UI (ui/InventoryUI.js) lists recipesFor(hero) and calls craft(). */
import { FUEL, RECIPES } from '../config/crafting.js';
import { Inventory } from '../inventory/Inventory.js';

const validBatch = n => Number.isSafeInteger(n) && n > 0 && n <= 10000;

/** Fuel points the bag holds (FUEL: wood, charcoal, ember shards). */
export function fuelIn(inventory, fuel = FUEL) { return Object.entries(fuel).reduce((t, [item, v]) => t + inventory.count(item) * v, 0); }

/** What burning `need` fuel points takes from the bag: [[item, n]], in FUEL order; the last
    piece may burn a little longer than needed. Null when there isn't enough. */
export function fuelToBurn(inventory, need, fuel = FUEL) {
  const out = []; let left = need;
  for (const [item, v] of Object.entries(fuel)) {
    if (left <= 0) break;
    const n = Math.min(inventory.count(item), Math.ceil(left / v)); if (n > 0) { out.push([item, n]); left -= n * v; }
  }
  return left > 0 ? null : out;
}

/** The recipes `hero` can make use of (weapons for other heroes are left out). */
export function recipesFor(hero, registry, recipes = RECIPES) {
  return recipes.filter(r => { const d = registry.get(r.result); return d && (!d.equip?.hero || d.equip.hero === hero); });
}

/** [{ item, need, have }] for every ingredient, plus coins and fuel: { need, have } (have >= need when there's enough).
    Fuel the recipe also uses as an ingredient isn't counted twice. */
export function requirements(recipe, inventory, coins = 0, batches = 1) {
  const spare = { count: id => Math.max(0, inventory.count(id) - (recipe.needs.find(([i]) => i === id)?.[1] ?? 0) * batches) };
  return { items: recipe.needs.map(([item, need]) => ({ item, need: need * batches, have: inventory.count(item) })), coins: { need: (recipe.coins ?? 0) * batches, have: coins },
    fuel: { need: (recipe.fuel ?? 0) * batches, have: recipe.fuel ? fuelIn(spare) : 0 } };
}

/** Why it can't be made right now ('materials' | 'fuel' | 'coins' | 'space' | 'station'), or null when it can.
    at = the station the hero stands at (config/stations.js id, or null for none); leave it out to skip that check. */
export function craftProblem(recipe, inventory, coins = 0, at = undefined, batches = 1) {
  if (!validBatch(batches)) return 'quantity';
  const req = requirements(recipe, inventory, coins, batches);
  if (req.items.some(r => r.have < r.need)) return 'materials';
  if (req.fuel.have < req.fuel.need) return 'fuel';
  if (req.coins.have < req.coins.need) return 'coins';
  // Simulate the complete exchange, including fuel freeing slots and multiple output stacks.
  const trial = new Inventory(inventory.size, inventory.registry); trial.load(inventory.getSlots());
  for (const [item, n] of recipe.needs) trial.remove(item, n * batches);
  for (const [item, n] of recipe.fuel ? fuelToBurn(trial, recipe.fuel * batches) ?? [] : []) trial.remove(item, n);
  if (trial.spaceFor(recipe.result, recipe.rarity ? { rarity: recipe.rarity } : null) < (recipe.qty ?? 1) * batches) return 'space';
  if (at !== undefined && recipe.station && recipe.station !== at) return 'station';
  return null;
}

/** Can it be made at `at` (a station id or null): by hand anywhere, or at its own station. */
export function madeAt(recipe, at) { return !recipe.station || recipe.station === at; }

/** Makes it: takes the ingredients (and coins, through pay(n) -> bool), adds the result. Returns { ok, problem }.
    at: as for craftProblem. */
export function craft(recipe, inventory, coins, pay, at = undefined, batches = 1) {
  const problem = craftProblem(recipe, inventory, coins, at, batches); if (problem) return { ok: false, problem };
  if (recipe.coins && !pay(recipe.coins * batches)) return { ok: false, problem: 'coins' };
  for (const [item, n] of recipe.needs) inventory.remove(item, n * batches);
  for (const [item, n] of recipe.fuel ? fuelToBurn(inventory, recipe.fuel * batches) ?? [] : []) inventory.remove(item, n);
  inventory.add(recipe.result, (recipe.qty ?? 1) * batches, recipe.rarity ? { rarity: recipe.rarity } : null);
  return { ok: true, problem: null };
}

/** Largest complete batch that fits. Scan down: larger batches can free slots that smaller ones cannot. */
export function maxCraftable(recipe, inventory, coins = 0, at = undefined) {
  if (!madeAt(recipe, at) && at !== undefined) return 0;
  let limit = Math.min(10000, ...recipe.needs.map(([id, n]) => Math.floor(inventory.count(id) / n)));
  if (recipe.coins) limit = Math.min(limit, Math.floor(coins / recipe.coins));
  if (recipe.fuel) limit = Math.min(limit, Math.floor(fuelIn(inventory) / recipe.fuel));
  for (let n = limit; n > 0; n--) if (!craftProblem(recipe, inventory, coins, at, n)) return n;
  return 0;
}
