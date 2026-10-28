/* Campaign tuning contract. Reporting profiles are deliberately independent of loot luck and advanced runes.
   Times use the summon level, starting equipment, the default pet and damaging abilities on cooldown.
   HP top-ups isolate throughput from survival; the bot must evade the lethal Doom Blade. */
export const BALANCE = {
  seconds: { monster: [2, 6], miniBoss: [90, 180], boss: [180, 300] },
  levels: [2, 4, 6, 8, 11],                       // summon levels by planet index; Duskhollow's Old Road opens at 11
  // A first visit, with no respawns or optional mini bosses: quest kills and the three lair requirements.
  route: [
    { quests: ['humStones', 'pieDelivery', 'firstHarvest'], kills: { wisp: 3, thornSeal: 3 } },
    { quests: ['dragonForge'], kills: { ramhorn: 2 }, elites: { goblin: 3 } },
    { quests: ['frostHearts', 'songsAfar'], kills: { thornmole: 3 } },
    // Tidewhisper (27h): Act I already ends at level 8; the lighthouse and a beach crossing keep the gate honest.
    { quests: ['darkLighthouse'], kills: { shellback: 3 } },
    // Duskhollow (30i): Wick's road and one crossing of each regular monster's territory reach Umbra's gate.
    { quests: ['oldRoad'], kills: { shadeling: 3, mosslurk: 3, gloomweaver: 3, snuffer: 3 } },
  ],
  // Coin reserve including the boss chest: next core set, first metal tools, then final trinkets.
  budgets: [
    ['emberAxe', 'emberHelm', 'emberMail', 'emberBoots', 'ironAxe', 'ironPick'],
    ['frostBow', 'frostCirclet', 'frostMantle', 'snowstepBoots'],
    ['starStaff', 'frostCirclet', 'frostMantle', 'snowstepBoots', 'frostLocket', 'diamondCharm'],
    ['tideCirclet', 'tideMantle', 'tideBoots', 'tidePendant'],   // Tidewhisper funds its own set
    ['duskHood', 'duskMantle', 'duskBoots', 'duskLantern'],      // Duskhollow (30c): its veins, crops and chests pay for the Dusk set
  ],
};
