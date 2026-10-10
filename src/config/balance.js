/* Campaign tuning contract. Reporting profiles are deliberately independent of loot luck and advanced runes.
   Times use the summon level, starting equipment, the default pet and damaging abilities on cooldown.
   HP top-ups isolate throughput from survival; the bot must evade the lethal Doom Blade. */
export const BALANCE = {
  seconds: { monster: [2, 6], miniBoss: [90, 180], boss: [180, 300] },
  levels: [2, 4, 6],
  // A first visit, with no respawns or optional mini bosses: quest kills and the three lair requirements.
  route: [
    { quests: ['humStones', 'pieDelivery', 'firstHarvest'], kills: { wisp: 3, thornSeal: 3 } },
    { quests: ['dragonForge'], kills: { ramhorn: 2 }, elites: { goblin: 3 } },
    { quests: ['frostHearts', 'songsAfar'], kills: { thornmole: 3 } },
  ],
  // Coin reserve including the boss chest: next core set, first metal tools, then final trinkets.
  budgets: [
    ['emberAxe', 'emberHelm', 'emberMail', 'emberBoots', 'ironAxe', 'ironPick'],
    ['frostBow', 'frostCirclet', 'frostMantle', 'snowstepBoots'],
    ['starStaff', 'frostCirclet', 'frostMantle', 'snowstepBoots', 'frostLocket', 'diamondCharm'],
  ],
};
