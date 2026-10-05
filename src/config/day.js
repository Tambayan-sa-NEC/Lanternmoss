/* DAY AND NIGHT: the village clock (runtime: src/gameplay/dayClock.js). Villagers follow their schedules by phase
   (src/entities/npc/npcDefs.js), the shop keeps opening hours (config/shop.js), and the light shifts gently.
   Time only passes while you play (not in menus or while paused). */

export const DAY = {
  length: 300,              // seconds of play per full day
  startAt: 0.12,            // a new adventure begins mid-morning (fraction of the day)
  phases: [                 // in order; `from` = fraction of the day where the phase begins
    { id: 'morning', label: 'Morning', from: 0 },
    { id: 'noon', label: 'Afternoon', from: 0.3 },
    { id: 'evening', label: 'Evening', from: 0.58 },
    { id: 'night', label: 'Night', from: 0.78 },
  ],
  // light at the middle of each phase, eased in between: sun colour + strength, ambient (sky) strength
  light: {
    morning: { sun: 0xffdcae, sunIntensity: 2.35, ambient: 1.15 },
    noon: { sun: 0xfff1d8, sunIntensity: 2.55, ambient: 1.22 },
    evening: { sun: 0xffad78, sunIntensity: 2.15, ambient: 1.05 },
    night: { sun: 0xa8b8ff, sunIntensity: 1.4, ambient: 0.82 },
  },
};
