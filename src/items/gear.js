/* GEAR MATH: what a piece of equipment adds to the hero, and the hero's stats with everything they wear.
   Pure (no scene / DOM), unit-tested in tests/items.test.mjs. Runtime (equipping, the hero's slots): src/gameplay/equipment.js.
   A piece's stats are its definition's `equip.stats` (Common values) x RARITIES[rarity].statMult, where the rarity is
   the stack's own (props.rarity, rolled when it dropped or set by a recipe) or else the definition's. */
import { CHARACTERS } from '../config/characters.js';
import { RARITIES, STATS } from '../config/items.js';

/** The rarity of this particular stack. */
export function itemRarity(def, props = null) { return props?.rarity && RARITIES[props.rarity] ? props.rarity : def.rarity; }

const round = (k, v) => (STATS[k].pct ? Math.round(v * 100) / 100 : STATS[k].dec ? Math.round(v * 10) / 10 : Math.round(v));

/** { stat: value } this piece adds at its rarity. */
export function gearStats(def, props = null) {
  const out = {}; if (!def?.equip) return out;
  const m = RARITIES[itemRarity(def, props)].statMult;
  for (const [k, v] of Object.entries(def.equip.stats)) out[k] = round(k, v * m);
  return out;
}

/** Why `hero` can't wear def (a sentence), or null when they can. */
export function equipProblem(def, hero) {
  if (!def?.equip) return `${def?.name ?? 'That'} can't be worn.`;
  if (def.equip.hero && def.equip.hero !== hero) return `Only the ${CHARACTERS[def.equip.hero]?.title ?? def.equip.hero} can use the ${def.name}.`;
  return null;
}

/** Totals of every worn piece that `hero` can use: pieces = [{ def, props }]. */
export function gearTotals(pieces, hero) {
  const t = {};
  for (const { def, props } of pieces) {
    if (!def?.equip || (def.equip.hero && def.equip.hero !== hero)) continue;
    for (const [k, v] of Object.entries(gearStats(def, props))) t[k] = (t[k] ?? 0) + v;
  }
  for (const k in t) if (STATS[k].cap !== undefined) t[k] = Math.min(STATS[k].cap, t[k]);
  return t;
}

/** The hero's stats with gear on: base (already grown to their level) + totals. Adds damageBonus and moveSpeed (shares). */
export function applyGear(base, totals) {
  const s = { ...base, damageBonus: totals.damage ?? 0, moveSpeed: totals.moveSpeed ?? 0 };
  for (const k of ['maxHp', 'maxMana', 'hpRegen', 'manaRegen']) if (totals[k]) s[k] = (base[k] ?? 0) + totals[k];
  if (totals.armor) s.armor = Math.min(STATS.armor.cap + (base.armor ?? 0), (base.armor ?? 0) + totals.armor);
  return s;
}

/** "+12 max HP", "+8% damage"... res = the hero's resource name for {res}. */
export function formatStat(k, v, res = 'mana') {
  const st = STATS[k], label = st.label.replace('{res}', res);
  return `+${st.pct ? `${Math.round(v * 100)}%` : v} ${label}`;
}
