/* SET RULES (config/sets.js): which sets the hero is wearing, which bonuses that turns on, and the combined effects.
   Pure (no scene / DOM), unit-tested in tests/sets.test.mjs. The hero's effects live in P.stats.setFx
   (gameplay/equipment.js computeStats), so they follow equipping, unequipping and loading like every other stat. */
import { SETS } from '../config/sets.js';

const SET_OF = new Map(Object.entries(SETS).flatMap(([id, s]) => s.pieces.map(item => [item, id])));

/** The set an item belongs to (its id), or null. */
export const setOf = itemId => SET_OF.get(itemId) ?? null;

/** { setId: count } of distinct set pieces worn that `hero` can use: pieces = [{ def }]. */
export function setCounts(pieces, hero) {
  const worn = {};
  for (const { def } of pieces) {
    const id = def && setOf(def.id);
    if (!id || (def.equip?.hero && def.equip.hero !== hero)) continue;
    (worn[id] ??= new Set()).add(def.id);
  }
  return Object.fromEntries(Object.entries(worn).map(([id, s]) => [id, s.size]));
}

/** [{ id, name, color, count, total, bonuses: [{ at, text, active }] }] for every set with at least one piece worn. */
export function setSummary(pieces, hero) {
  return Object.entries(setCounts(pieces, hero)).map(([id, count]) => {
    const s = SETS[id];
    return { id, name: s.name, color: s.color, count, total: s.pieces.length, bonuses: s.bonuses.map(b => ({ at: b.at, text: b.text, active: count >= b.at })) };
  });
}

/** The combined effects of every active bonus: { healing, swimEnergy, knock, burn?, chill? } (see config/sets.js). */
export function setEffects(pieces, hero) {
  const fx = { healing: 0, swimEnergy: 0, knock: 0 };
  for (const [id, count] of Object.entries(setCounts(pieces, hero))) {
    const tier = {};
    for (const b of SETS[id].bonuses) if (count >= b.at) Object.assign(tier, b.effects);   // the highest tier reached wins
    for (const [k, v] of Object.entries(tier)) {
      if (typeof v === 'number') fx[k] = (fx[k] ?? 0) + v;
      else if (k === 'burn') fx.burn = !fx.burn || v.share > fx.burn.share ? { ...v } : fx.burn;
      else if (k === 'chill') fx.chill = !fx.chill || v.slow > fx.chill.slow ? { ...v } : fx.chill;
    }
  }
  fx.swimEnergy = Math.min(1, fx.swimEnergy);
  return fx;
}

/** A burning monster after a new hit: a burn at least as strong as the current one replaces it (timer refreshed); a
    weaker hit leaves the stronger burn to run out, so one big hit cannot be kept burning by small ones.
    burn = { dps, t } or null; hit = the damage dealt; b = the hero's { share, time }. */
export function nextBurn(burn, hit, b) {
  const dps = (hit * b.share) / b.time;
  return burn?.t > 0 && burn.dps > dps ? { dps: burn.dps, t: burn.t } : { dps, t: b.time };
}
