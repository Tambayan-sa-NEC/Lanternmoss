/* ---------------------------------------------------------------------
   REMATCHES (TODO 31a): a boss you have already beaten can be challenged again, harder, for its own loot.
   Runtime: src/gameplay/Rematch.js. The campaign is untouched by any of it: a rematch win never adds to the
   defeated worlds, never opens a portal, never drops a trophy, a Wayfarer's Key or an achievement, and never
   replays the first-win banner. Those belong to the one win that mattered.

   WHICH ENCOUNTERS ARE OFFERED. Only an encounter whose rematch kit is finished: `COMBAT.enemies[type].rematch`
   must be an object. The infrastructure lands first (31a) and each world's kit follows (31b-31f), so until a kit
   is written its lair simply stays quiet after the win, exactly as it does today. A kit's entry may carry
   `attacks` and `phases` of its own; 31a reads only its presence.

     tiers      what the fight is worth each time, by how many rematches of that encounter are already won. The
                last entry repeats for ever, so the ladder has a top rather than running away:
                  hp / damage / speed  multipliers on the boss's own numbers
                  loot                 the chest table rolled when it falls (config/chests.js LOOT)
                  coins / xp           multipliers on the ordinary kill reward
     cooldown   seconds after a rematch ends before that lair offers another, so a win is a moment, not a loop
     reach      metres from the lair the "challenge again" prompt appears at
   --------------------------------------------------------------------- */

export const REMATCH = {
  tiers: [
    { hp: 1.35, damage: 1.2, speed: 1.05, loot: 'rare', coins: 1.5, xp: 1.2 },
    { hp: 1.7, damage: 1.35, speed: 1.1, loot: 'rare', coins: 1.8, xp: 1.35 },
    { hp: 2.1, damage: 1.5, speed: 1.15, loot: 'boss', coins: 2.2, xp: 1.5 },
  ],
  cooldown: 20,
  reach: 6,
};

/** The tier a fight is worth with `wins` of that encounter already behind the hero (the last one repeats). */
export function rematchTier(wins = 0) {
  const n = Number.isInteger(wins) && wins > 0 ? wins : 0;
  return REMATCH.tiers[Math.min(n, REMATCH.tiers.length - 1)];
}

/** Is this encounter's rematch kit finished? Nothing else may offer a rematch. */
export function rematchReady(def) { return !!def && typeof def.rematch === 'object' && def.rematch !== null; }
