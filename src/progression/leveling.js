/* XP math: pure functions (no scene / DOM), unit-tested in tests/leveling.test.mjs.
   Every function takes the LEVELING table as an optional last argument so tests can use a custom curve. */
import { LEVELING } from '../config/leveling.js';

/** XP needed to go from `level` to the next one; 0 at the level cap. */
export function xpToNext(level, cfg = LEVELING) {
  return level >= cfg.maxLevel ? 0 : Math.max(1, Math.round(cfg.xpBase * Math.pow(level, cfg.xpExponent)));
}

/** Adds XP and resolves any number of level-ups, carrying the surplus over. Zero, negative and non-numeric amounts
    do nothing, and nothing is banked at the cap. Returns the new { level, xp } plus how much was actually gained. */
export function addXp(level, xp, amount, cfg = LEVELING) {
  amount = Math.floor(amount);
  if (!Number.isFinite(amount) || amount <= 0 || level >= cfg.maxLevel) return { level, xp, gained: 0 };
  let gained = amount; xp += amount;
  while (level < cfg.maxLevel && xp >= xpToNext(level, cfg)) { xp -= xpToNext(level, cfg); level++; }
  if (level >= cfg.maxLevel) { gained -= xp; xp = 0; }     // surplus past the cap is dropped
  return { level, xp, gained };
}

/** A character's base stats (CHARACTERS[id].stats) grown to `level`. Returns a copy; the shared table is never modified. */
export function statsForLevel(base, level, cfg = LEVELING) {
  const s = { ...base };
  for (const [k, v] of Object.entries(cfg.perLevel)) if (typeof base[k] === 'number') s[k] = base[k] + v * (level - 1);
  return s;
}

/** Multiplier on the hero's ability damage at `level` (1 at level 1). */
export function damageMultiplier(level, cfg = LEVELING) { return 1 + cfg.damagePerLevel * (level - 1); }
