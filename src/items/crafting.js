/* Crafting rules (recipes: config/crafting.js). Pure apart from the inventory it's handed, so it's unit-tested with a
   real Inventory: tests/items.test.mjs. The UI (ui/InventoryUI.js) lists recipesFor(hero) and calls craft(). */
import { RECIPES } from '../config/crafting.js';

/** The recipes `hero` can make use of (weapons for other heroes are left out). */
export function recipesFor(hero, registry, recipes = RECIPES) {
  return recipes.filter(r => { const d = registry.get(r.result); return d && (!d.equip?.hero || d.equip.hero === hero); });
}

/** [{ item, need, have }] for every ingredient, plus coins: { need, have } (have >= need when affordable). */
export function requirements(recipe, inventory, coins = 0) {
  return { items: recipe.needs.map(([item, need]) => ({ item, need, have: inventory.count(item) })), coins: { need: recipe.coins ?? 0, have: coins } };
}

/** Why it can't be made right now ('materials' | 'coins' | 'space' | 'station'), or null when it can.
    at = the station the hero stands at (config/stations.js id, or null for none); leave it out to skip that check. */
export function craftProblem(recipe, inventory, coins = 0, at = undefined) {
  const req = requirements(recipe, inventory, coins);
  if (req.items.some(r => r.have < r.need)) return 'materials';
  if (req.coins.have < req.coins.need) return 'coins';
  const props = recipe.rarity ? { rarity: recipe.rarity } : null, qty = recipe.qty ?? 1;
  // the ingredients leave first, so a slot they empty counts as room
  const freed = recipe.needs.some(([item, n]) => inventory.count(item) === n);
  if (inventory.spaceFor(recipe.result, props) < qty && !freed) return 'space';
  if (at !== undefined && recipe.station && recipe.station !== at) return 'station';
  return null;
}

/** Can it be made at `at` (a station id or null): by hand anywhere, or at its own station. */
export function madeAt(recipe, at) { return !recipe.station || recipe.station === at; }

/** Makes it: takes the ingredients (and coins, through pay(n) -> bool), adds the result. Returns { ok, problem }.
    at: as for craftProblem. */
export function craft(recipe, inventory, coins, pay, at = undefined) {
  const problem = craftProblem(recipe, inventory, coins, at); if (problem) return { ok: false, problem };
  if (recipe.coins && !pay(recipe.coins)) return { ok: false, problem: 'coins' };
  for (const [item, n] of recipe.needs) inventory.remove(item, n);
  inventory.add(recipe.result, recipe.qty ?? 1, recipe.rarity ? { rarity: recipe.rarity } : null);
  return { ok: true, problem: null };
}
