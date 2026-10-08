/* Rolling a loot table (config/chests.js) into coins and item stacks: chests, monster drops. Pure: no scene, no state,
   so it can be tested on its own and reused by anything else that hands out random rewards. */
import { GEAR_RARITY, LOOT, LOOT_TABLES } from '../config/chests.js';
import { GEAR_KINDS, ITEM_DEFINITIONS, RARITIES } from '../config/items.js';
import { PLANETS } from '../config/planets.js';
import { rng as playRng } from '../utils/random.js';

/** '@material' / '@trophy' -> the planet's own item id (null if the planet has none). */
export function resolveLootItem(item, planet) {
  const p = PLANETS[planet];
  if (item === '@material') return p?.material ?? null;
  if (item === '@trophy') return p?.boss?.trophy ?? null;
  return item;
}

const GEAR = ITEM_DEFINITIONS.filter(d => d.equip && !GEAR_KINDS[d.equip.slot].vanity);   // vanity pieces are found, made or given, not rolled
const NAMES = Object.fromEntries(ITEM_DEFINITIONS.map(d => [d.id, d.name]));

/** "2x Moonberry", "Rare Ember Mail" (for toasts). */
export function lootName(item, qty = 1, props = null) {
  const r = props?.rarity && RARITIES[props.rarity] ? `${RARITIES[props.rarity].label} ` : '';
  return `${qty > 1 ? `${qty}x ` : ''}${r}${NAMES[item] ?? item}`;
}

/** Picks by weight from [[value, weight]]. */
function weighted(pairs, rng) {
  let x = rng() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) if ((x -= w) < 0) return v;
  return pairs[pairs.length - 1][0];
}

/** A piece of gear for `hero` on `planet`: this planet's tier is likelier, earlier tiers still turn up; rarity from
    GEAR_RARITY[source]. Returns { item, qty: 1, props: { rarity } } or null. */
export function rollGear(planet, hero, source = 'chest', rng = playRng) {
  const tier = planet + 1, fits = GEAR.filter(d => d.equip.tier <= tier && (!d.equip.hero || d.equip.hero === hero));
  if (!fits.length) return null;
  const def = weighted(fits.map(d => [d, d.equip.tier === tier ? 3 : 1]), rng);
  const rarity = weighted(Object.entries(GEAR_RARITY[source] ?? GEAR_RARITY.chest), rng);
  return { item: def.id, qty: 1, props: { rarity } };
}

const qtyOf = (q, rng) => (Array.isArray(q) ? q[0] + Math.floor(rng() * (q[1] - q[0] + 1)) : q ?? 1);

/** { coins, items: [{ item, qty, props? }] } for loot table `tableId` on planet index `planet`, for `hero`.
    rng() in [0, 1). Gear comes as its own stacks (each piece has its own rarity); everything else is merged. */
export function rollLoot(tableId, planet, rng = playRng, hero = null) {
  const t = LOOT_TABLES[tableId]; if (!t) return { coins: 0, items: [] };
  const coins = t.coins ? Math.round(qtyOf(t.coins, rng) * (1 + LOOT.coinsPerPlanet * planet)) : 0;
  const got = new Map(), gear = [];
  const add = (e) => {
    if (e.item === '@gear') { const g = rollGear(planet, hero, e.rarity, rng); if (g) gear.push(g); return; }
    const id = resolveLootItem(e.item, planet), n = qtyOf(e.qty, rng); if (id && n > 0) got.set(id, (got.get(id) ?? 0) + n);
  };
  for (const e of t.guaranteed ?? []) add(e);
  const pool = [...(t.pool ?? [])];
  for (let r = 0; r < (t.rolls ?? 0) && pool.length; r++) {
    let x = rng() * pool.reduce((s, e) => s + e.weight, 0), i = 0;
    while (i < pool.length - 1 && (x -= pool[i].weight) >= 0) i++;
    add(pool.splice(i, 1)[0]);
  }
  return { coins, items: [...[...got].map(([item, qty]) => ({ item, qty })), ...gear] };
}
