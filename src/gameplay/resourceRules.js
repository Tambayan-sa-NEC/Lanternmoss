/* Gathering, fishing and farming rules (config/resources.js), pure so they're unit-tested (tests/survival.test.mjs).
   The runtimes are ./Gathering.js, ./Fishing.js and ./Farm.js. */
import { CROPS, FISHING, NODE_KINDS, SCENERY } from '../config/resources.js';
import { PLANETS } from '../config/planets.js';
import { rng as playRng } from '../utils/random.js';

const qtyOf = (q, rng) => (Array.isArray(q) ? q[0] + Math.floor(rng() * (q[1] - q[0] + 1)) : q);

/** What one gather of `drops` (+ `extra` bonus chances) gives: [[item, n]] (zero counts left out). */
export function rollDrops(drops, extra = [], rng = playRng) {
  const out = new Map();
  for (const [item, q] of drops) { const n = qtyOf(q, rng); if (n > 0) out.set(item, (out.get(item) ?? 0) + n); }
  for (const [item, chance] of extra) if (rng() < chance) out.set(item, (out.get(item) ?? 0) + 1);
  return [...out];
}

/** Can a tool `tool` ({ kind, tier } or null) work something needing `need` ({ tool, tier })? 'ok' | 'none' | 'weak'. */
export function toolCheck(need, tool) {
  if (!need.tool) return 'ok';
  if (!tool || tool.kind !== need.tool) return 'none';
  return (tool.tier ?? 1) >= (need.tier ?? 1) ? 'ok' : 'weak';
}

/** The best tool of `kind` among [{ def, slot }] (highest tier first), or null. */
export function bestTool(kind, candidates) {
  return candidates.filter(c => c.def?.tool?.kind === kind).sort((a, b) => b.def.tool.tier - a.def.tool.tier)[0] ?? null;
}

/** A fish for this planet: weighted from FISHING.catches (a lake makes the golden koi likelier). */
export function rollCatch(planet, lake = false, rng = playRng) {
  const table = (FISHING.catches[planet] ?? FISHING.catches[0]).map(([item, w]) => [item, item === 'goldenKoi' && lake ? w * FISHING.lakeBonus : w]);
  let x = rng() * table.reduce((s, [, w]) => s + w, 0);
  for (const [item, w] of table) if ((x -= w) < 0) return item;
  return table[table.length - 1][0];
}

/** How the reeling meter feels for `item`: { zone (share of the bar), sweeps (per second) }. */
export function catchFeel(item) { return { zone: FISHING.meter.zone, sweeps: FISHING.meter.sweeps, ...(FISHING.feel[item] ?? {}) }; }

/** Where the needle is (0..1) after `t` seconds at `sweeps` sweeps per second: back and forth. */
export function needleAt(t, sweeps) { const x = (t * sweeps) % 2; return x < 1 ? x : 2 - x; }

/** Is the needle in the green zone (centred at `centre`, `zone` wide)? */
export function inZone(needle, centre, zone) { return Math.abs(needle - centre) <= zone / 2; }

/** A planted plot's growth stage: 0 sprout, 1 growing, 2 nearly there, 3 ripe (growth 0..1). */
export function cropStage(growth) { return growth >= 1 ? 3 : growth >= 0.6 ? 2 : growth >= 0.25 ? 1 : 0; }

/** Growth a watered crop gains in `dt` seconds (a full crop takes CROPS[id].days days of DAY.length seconds). */
export function growthFor(cropId, dt, dayLength) { return dt / (CROPS[cropId].days * dayLength); }

/** Every item a planet's nodes, scenery, waters and farm can give (quests use it to tell if an item can still be found). */
export function planetSources(planet) {
  const p = PLANETS[planet], out = new Set();
  for (const [kind] of [...(p?.resources?.nodes ?? []), ...(p?.resources?.rare ?? [])]) {
    const k = NODE_KINDS[kind]; if (!k) continue;
    for (const [item] of k.drops) out.add(item); for (const [item] of k.extra ?? []) out.add(item);
  }
  for (const s of Object.values(SCENERY)) for (const [item] of s.drops) out.add(item);
  for (const [item] of FISHING.catches[planet] ?? []) out.add(item);
  for (const c of Object.values(CROPS)) for (const [item] of c.harvest) out.add(item);
  return out;
}
