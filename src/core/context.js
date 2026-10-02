/* The live game state shared between systems. Game fills it in during startup;
   systems read and update it each frame instead of reaching for scattered module globals. */
export const ctx = {
  time: 0,            // seconds of simulated time
  started: false,     // false while the character-select screen is open
  planet: 0,          // index into PLANETS (config/planets.js)
  transitioning: false,  // true while fading between planets (input is locked)
  inventoryOpen: false,  // the bag is open: abilities and talking are paused, movement still works
  player: null,       // Player
  companion: null,    // Owl (witch) or Wolf (knight), created when a hero is picked
  npcs: [],
  critters: [],
  birds: [],
  enemies: [],
  boss: null,         // this planet's boss (also listed in enemies)
  projectiles: [],
  worldItems: [],     // WorldItem pickups lying on the planet
};
