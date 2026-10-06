/* The journal's data and rules, pure (no game state, unit-tested): its saved shape, cleaning what's loaded, the value
   of each counter and how far along each achievement is. The runtime that fills it in is ./Journal.js. */
import { ACHIEVEMENTS } from '../config/achievements.js';
import { BESTIARY_ENTRIES } from '../config/bestiary.js';
import { COMBAT } from '../config/combat.js';
import { PETS } from '../config/pets.js';

/** Every bestiary page, in order: the monsters, then the bosses. */
export const BESTIARY_ORDER = Object.keys(COMBAT.enemies).sort((a, b) => (COMBAT.enemies[a].ai === 'boss') - (COMBAT.enemies[b].ai === 'boss'));
export const isBoss = type => COMBAT.enemies[type]?.ai === 'boss';
/** A bestiary page's title: the monster's name, or the boss's (without its epithet). */
export const pageName = type => BESTIARY_ENTRIES[type]?.name ?? COMBAT.enemies[type]?.name?.split(',')[0] ?? type;

const COUNTERS = ['monsters', 'bosses', 'chests', 'quests', 'crafted'];
const FLAGS = new Set(ACHIEVEMENTS.filter(a => a.goal.flag).map(a => a.goal.flag));

/**   stats     lifetime counters (COUNTERS)
      flags     boss challenges done ({ flawless: true, ... })
      unlocked  { achievementId: time unlocked (ms) }
      seen      { monsterType: true } met at least once
      defeated  { monsterType: count }
      found     { itemId: true } every kind of item that has been in the bag
      legendary { itemId: true } every kind of gear found at Legendary rarity
      pets      { petId: true } every pet found */
export function emptyJournal() {
  return { stats: Object.fromEntries(COUNTERS.map(k => [k, 0])), flags: {}, unlocked: {}, seen: {}, defeated: {}, found: {}, legendary: {}, pets: {} };
}

const count = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const pick = (src, ok, val) => Object.fromEntries(Object.entries(obj(src)).filter(([k, v]) => ok(k) && val(v) !== null).map(([k, v]) => [k, val(v)]));

/** A complete, valid journal from anything (saved JSON, junk). knownItem(id) says whether an item id still exists. */
export function sanitizeJournal(raw, knownItem = () => true) {
  const src = obj(raw), j = emptyJournal(), has = (o, k) => Object.hasOwn(o, k);
  for (const k of COUNTERS) j.stats[k] = count(obj(src.stats)[k]);
  j.flags = pick(src.flags, k => FLAGS.has(k), v => (v === true ? true : null));
  const ids = new Set(ACHIEVEMENTS.map(a => a.id));
  j.unlocked = pick(src.unlocked, k => ids.has(k), v => (Number.isFinite(v) && v > 0 ? v : null));
  j.seen = pick(src.seen, k => has(COMBAT.enemies, k), v => (v === true ? true : null));
  j.defeated = pick(src.defeated, k => has(COMBAT.enemies, k), v => count(v) || null);
  for (const k of Object.keys(j.defeated)) j.seen[k] = true;                 // defeated means met
  j.found = pick(src.found, k => knownItem(k), v => (v === true ? true : null));
  j.legendary = pick(src.legendary, k => knownItem(k), v => (v === true ? true : null));
  for (const k of Object.keys(j.legendary)) j.found[k] = true;
  j.pets = pick(src.pets, k => has(PETS, k), v => (v === true ? true : null));
  return j;
}

/** The value of a counter, including the ones worked out from the pages (kinds, bossKinds, petsFound, items). */
export function statValue(j, stat) {
  switch (stat) {
    case 'kinds': return Object.keys(j.defeated).length;
    case 'bossKinds': return Object.keys(j.defeated).filter(isBoss).length;
    case 'petsFound': return Object.keys(j.pets).length;
    case 'items': return Object.keys(j.found).length;
    case 'legendary': return Object.keys(j.legendary).length;
    default: return j.stats[stat] ?? 0;
  }
}
/** What an achievement's `at` means as a number. */
export function goalTarget(goal) {
  if (goal.flag) return 1;
  return goal.at === 'allPets' ? Object.keys(PETS).length : goal.at === 'allKinds' ? BESTIARY_ORDER.length : goal.at;
}
/** { have, need, done } for one achievement. */
export function progress(a, j) {
  const need = goalTarget(a.goal), have = Math.min(need, a.goal.flag ? (j.flags[a.goal.flag] ? 1 : 0) : statValue(j, a.goal.stat));
  return { have, need, done: have >= need };
}
/** Achievements that are complete but not yet marked unlocked. */
export function newlyDone(j) { return ACHIEVEMENTS.filter(a => !j.unlocked[a.id] && progress(a, j).done); }
