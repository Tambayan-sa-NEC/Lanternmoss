/* Villager friendship rules (config/friendship.js): hearts from points, what a present is worth to whom, the reward
   ladder and the saved shape. Pure and deterministic (no game state), unit-tested in tests/friendship.test.mjs.
   The runtime that talks to villagers and hands the rewards over is ./Friendship.js. */
import { DEFAULT_TASTES, FRIENDSHIP, TASTES } from '../config/friendship.js';
import { TRAVELER_NAMES } from '../config/npcs.js';
import { PLANET_CATALOG } from '../config/planets.js';

/** Every villager who can be befriended: the four who travel with you, then each world's locals (released or not). */
export const VILLAGER_NAMES = [...TRAVELER_NAMES, ...PLANET_CATALOG.flatMap(p => (p.npcs?.locals ?? []).map(n => n.name))];
const known = new Set(VILLAGER_NAMES);
export const isVillager = name => known.has(name);

const MAX_POINTS = FRIENDSHIP.thresholds[FRIENDSHIP.hearts];

/** What this villager likes. A name with nothing authored takes their world's material and forage (a local who
    arrives with a new world works before anyone writes their tastes down). */
export function tastesFor(name, planet = null) {
  const t = TASTES[name];
  if (t) return t;
  const favourite = planet?.material ? [planet.material] : [];
  const liked = [...new Set((planet?.forage ?? []).map(f => f.item))].filter(id => !favourite.includes(id)).slice(0, 3);
  return { ...DEFAULT_TASTES, favourite, liked };
}

/** 'favourite' | 'liked' | 'disliked' | 'neutral': how this villager takes that present. */
export function giftKind(name, itemId, planet = null) {
  const t = tastesFor(name, planet);
  return t.favourite.includes(itemId) ? 'favourite' : t.liked.includes(itemId) ? 'liked'
    : t.disliked.includes(itemId) ? 'disliked' : 'neutral';
}
/** What that present is worth in friendship points (a disliked one costs). */
export const giftPoints = kind => FRIENDSHIP.gift.points[kind] ?? 0;

/** Hearts for a points total: 0 up to FRIENDSHIP.hearts. */
export function heartsFor(points) {
  const p = clampPoints(points);
  let n = 0; while (n < FRIENDSHIP.hearts && p >= FRIENDSHIP.thresholds[n + 1]) n++;
  return n;
}
/** Points needed for the next heart, and how far along this one is: { hearts, points, next, have, need }. */
export function heartProgress(points) {
  const p = clampPoints(points), hearts = heartsFor(p);
  if (hearts >= FRIENDSHIP.hearts) return { hearts, points: p, next: null, have: 1, need: 1 };
  const from = FRIENDSHIP.thresholds[hearts], to = FRIENDSHIP.thresholds[hearts + 1];
  return { hearts, points: p, next: hearts + 1, have: p - from, need: to - from };
}
/** Points never run below zero (a disliked present cools a friendship, it does not undo it) or past the last heart. */
export const clampPoints = p => (Number.isFinite(p) ? Math.min(MAX_POINTS, Math.max(0, Math.round(p))) : 0);

/** The rewards earned by crossing from `before` hearts to `after`, in heart order. */
export function rewardsBetween(name, before, after, planet = null) {
  return (tastesFor(name, planet).rewards ?? []).filter(r => r.hearts > before && r.hearts <= after).sort((a, b) => a.hearts - b.hearts);
}
/** The whole ladder, each marked earned or not (the Friends page). */
export function rewardLadder(name, hearts, planet = null) {
  return (tastesFor(name, planet).rewards ?? []).slice().sort((a, b) => a.hearts - b.hearts).map(r => ({ ...r, earned: hearts >= r.hearts }));
}
/** Does this villager's ladder unlock that personal quest, and at how many hearts? (null = not theirs.) */
export function questHearts(name, questId, planet = null) {
  return (tastesFor(name, planet).rewards ?? []).find(r => r.kind === 'quest' && r.quest === questId)?.hearts ?? null;
}
/** The keeper's thank-you: the fraction off every shop price at that many hearts. */
export const shopDiscount = hearts => Math.min(FRIENDSHIP.shop.max, Math.max(0, hearts) * FRIENDSHIP.shop.perHeart);

/** state: points per villager, the rewards already handed over, and the day's talking / gifts / door presents. */
export function emptyFriendship(day = 1) { return { points: {}, claimed: {}, day, talked: [], gifts: {}, doorDay: 0 }; }

const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };

/** A complete, valid friendship state from anything (saved JSON, junk): unknown villagers and impossible
    totals are dropped, so a crafted save cannot hand out rewards that were never earned. */
export function cleanFriendshipState(raw) {
  const s = obj(raw), out = emptyFriendship(int(s.day, 1, 1e6));
  for (const [name, v] of Object.entries(obj(s.points))) if (isVillager(name)) { const p = clampPoints(v); if (p) out.points[name] = p; }
  for (const [name, v] of Object.entries(obj(s.claimed))) {
    if (!isVillager(name)) continue;
    const c = Math.min(int(v, 0, FRIENDSHIP.hearts), heartsFor(out.points[name] ?? 0));
    if (c) out.claimed[name] = c;
  }
  out.talked = [...new Set((Array.isArray(s.talked) ? s.talked : []).filter(isVillager))];
  for (const [name, v] of Object.entries(obj(s.gifts))) if (isVillager(name)) { const n = int(v, 0, FRIENDSHIP.gift.perDay); if (n) out.gifts[name] = n; }
  out.doorDay = int(s.doorDay, 0, 1e6);
  return out;
}
