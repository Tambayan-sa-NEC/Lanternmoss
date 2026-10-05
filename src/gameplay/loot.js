/* Rolling a chest's loot table (config/chests.js) into coins and item stacks. Pure: no scene, no state, so it can be
   tested on its own and reused by anything else that hands out random rewards. */
import { LOOT, LOOT_TABLES } from '../config/chests.js';
import { PLANETS } from '../config/planets.js';

/** '@material' / '@trophy' -> the planet's own item id (null if the planet has none). */
export function resolveLootItem(item, planet) {
  const p = PLANETS[planet];
  if (item === '@material') return p?.material ?? null;
  if (item === '@trophy') return p?.boss?.trophy ?? null;
  return item;
}

const qtyOf = (q, rng) => (Array.isArray(q) ? q[0] + Math.floor(rng() * (q[1] - q[0] + 1)) : q ?? 1);

/** { coins, items: [{ item, qty }] } for loot table `tableId` on planet index `planet`. rng() in [0, 1). */
export function rollLoot(tableId, planet, rng = Math.random) {
  const t = LOOT_TABLES[tableId]; if (!t) return { coins: 0, items: [] };
  const coins = t.coins ? Math.round(qtyOf(t.coins, rng) * (1 + LOOT.coinsPerPlanet * planet)) : 0;
  const got = new Map();
  const add = (e) => { const id = resolveLootItem(e.item, planet), n = qtyOf(e.qty, rng); if (id && n > 0) got.set(id, (got.get(id) ?? 0) + n); };
  for (const e of t.guaranteed ?? []) add(e);
  const pool = [...(t.pool ?? [])];
  for (let r = 0; r < (t.rolls ?? 0) && pool.length; r++) {
    let x = rng() * pool.reduce((s, e) => s + e.weight, 0), i = 0;
    while (i < pool.length - 1 && (x -= pool[i].weight) >= 0) i++;
    add(pool.splice(i, 1)[0]);
  }
  return { coins, items: [...got].map(([item, qty]) => ({ item, qty })) };
}
