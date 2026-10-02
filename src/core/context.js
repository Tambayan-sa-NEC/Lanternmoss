/* The live game state shared between systems. Game fills it in during startup;
   systems read and update it each frame instead of reaching for scattered module globals. */
export const ctx = {
  time: 0,            // seconds of simulated time
  started: false,     // false while the character-select screen is open
  player: null,       // Player
  companion: null,    // Owl (witch) or Wolf (knight), created when a hero is picked
  npcs: [],
  critters: [],
  birds: [],
  enemies: [],
  projectiles: [],
};
