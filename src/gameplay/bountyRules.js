/* Bounty board rules (config/bounties.js): the day's tasks for a planet, generated from its config, plus the saved
   shape and progress checks. Pure and deterministic (the same planet and day always post the same set), unit-tested. */
import { BOUNTIES } from '../config/bounties.js';
import { BESTIARY_ENTRIES } from '../config/bestiary.js';
import { COMBAT } from '../config/combat.js';
import { ITEM_DEFINITIONS } from '../config/items.js';
import { FISHING, NODE_KINDS } from '../config/resources.js';
import { mulberry32 } from '../utils/random.js';

const items = new Map(ITEM_DEFINITIONS.map(d => [d.id, d]));
export const itemLabel = id => items.get(id)?.name ?? id;
export const monsterLabel = type => BESTIARY_ENTRIES[type]?.name ?? COMBAT.enemies[type]?.name?.split(',')[0] ?? type;

/** What each kind of task can ask for on this planet (empty = that kind is skipped there). */
export function bountyPools(planet, index) {
  const defeat = [...new Set((planet.roster ?? []).map(g => g.type))].filter(t => {
    const e = COMBAT.enemies[t]; return e && !e.object && e.ai !== 'boss' && !e.miniBoss;
  });
  const bring = new Set(planet.material ? [planet.material] : []);
  for (const [kind] of planet.resources?.nodes ?? []) { const k = NODE_KINDS[kind]; if (k && !k.rare && k.drops?.[0]) bring.add(k.drops[0][0]); }
  const fish = (planet.resources?.catches ?? FISHING.catches[index] ?? []).filter(([id]) => id !== 'goldenKoi').map(([id]) => id);
  return { defeat, bring: [...bring].filter(id => items.has(id)), fish: fish.filter(id => items.has(id)), harvest: planet.farm === false ? [] : ['crop'] };
}

const pickWeighted = (entries, r) => { let x = r * entries.reduce((n, [, w]) => n + w, 0); for (const [v, w] of entries) if ((x -= w) < 0) return v; return entries.at(-1)[0]; };
const between = ([lo, hi], r) => lo + Math.floor(r * (hi - lo + 1));

/** The day's tasks: up to BOUNTIES.perDay of different kinds, each { id, kind, target, count, title, reward }. */
export function generateBounties(planet, index, day) {
  const rnd = mulberry32(((planet.seed ?? 1) * 7919 + day * 104729 + index * 31) | 0), pools = bountyPools(planet, index);
  const kinds = Object.entries(BOUNTIES.kinds).filter(([kind]) => pools[kind].length), out = [];
  while (out.length < BOUNTIES.perDay && kinds.length) {
    const kind = pickWeighted(kinds.map(([k, c]) => [k, c.weight]), rnd()), cfg = BOUNTIES.kinds[kind];
    kinds.splice(kinds.findIndex(([k]) => k === kind), 1);
    const pool = pools[kind], target = pool[Math.floor(rnd() * pool.length)], count = between(cfg.count, rnd());
    const k = cfg.count[1] > cfg.count[0] ? (count - cfg.count[0]) / (cfg.count[1] - cfg.count[0]) : 0;
    const coins = Math.round((cfg.coins[0] + (cfg.coins[1] - cfg.coins[0]) * k) * (1 + BOUNTIES.coinsPerPlanet * index));
    const reward = { coins, items: planet.material ? [[planet.material, between(BOUNTIES.material, rnd())]] : [], gear: rnd() < BOUNTIES.rareChance };
    const title = { defeat: `Defeat ${count} × ${monsterLabel(target)}`, bring: `Bring ${count} × ${itemLabel(target)}`,
      fish: `Catch ${count} × ${itemLabel(target)}`, harvest: `Harvest ${count} crops from the farm` }[kind];
    out.push({ id: `${planet.id}:${day}:${out.length}`, kind, target, count, title, reward });
  }
  return out;
}

/** The saved state for the board on one planet: which day's set, how far each task has got, which were claimed. */
export function emptyBountyState(day = 1) { return { day, counts: Array(BOUNTIES.perDay).fill(0), claimed: Array(BOUNTIES.perDay).fill(false) }; }
export function cleanBountyState(raw) {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}, n = BOUNTIES.perDay;
  const day = Number.isInteger(s.day) && s.day >= 1 && s.day <= 1e6 ? s.day : 1;
  const counts = Array.from({ length: n }, (_, i) => { const v = Math.floor(Number(s.counts?.[i])); return Number.isFinite(v) && v > 0 ? Math.min(v, 999) : 0; });
  return { day, counts, claimed: Array.from({ length: n }, (_, i) => s.claimed?.[i] === true) };
}

/** How far a task is: { have, need, done }. Bring tasks look in the bag (have(itemId)); the rest use the counter. */
export function bountyProgress(bounty, count, have = () => 0) {
  const got = bounty.kind === 'bring' ? have(bounty.target) : count;
  return { have: Math.min(got, bounty.count), need: bounty.count, done: got >= bounty.count };
}

/** Does this event advance the task? kind: 'defeat' { type }, 'fish' { itemId }, 'harvest'. */
export function bountyMatches(bounty, event) {
  if (bounty.kind !== event.kind) return false;
  if (bounty.kind === 'defeat') return event.type === bounty.target;
  if (bounty.kind === 'fish') return event.itemId === bounty.target;
  return bounty.kind === 'harvest';
}
