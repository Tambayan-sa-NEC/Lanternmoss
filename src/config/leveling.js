/* ---------------------------------------------------------------------
   LEVELING: XP curve, level cap and stat growth (runtime: src/progression).
   XP per kill is the `xp` field on each COMBAT.enemies entry (a full map clear is ~256 XP).
   XP to go from level L to L+1 = round(xpBase * L ^ xpExponent)
     -> 30, 74, 125, 182, 243, 308, 376, 448, 522  (2308 total to reach level 10)
   --------------------------------------------------------------------- */
export const LEVELING = {
  maxLevel: 10,
  xpBase: 30, xpExponent: 1.3,
  perLevel: { maxHp: 6, maxMana: 4, manaRegen: 0.5, hpRegen: 0.3 },   // added to the character's base stats for every level above 1
  damagePerLevel: 0.05,                // hero ability damage +5% per level above 1 (x1.45 at level 10); pets grow too (config/pets.js)
  healOnLevelUp: true,                 // refill HP and mana/stamina on level-up
  creditSources: ['player', 'pet'],    // damageEnemy sources whose killing blow grants XP (no source = the hero's own abilities)
};
