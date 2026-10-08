/* The live game state shared between systems. Game fills it in during startup;
   systems read and update it each frame instead of reaching for scattered module globals. */
export const ctx = {
  time: 0,            // seconds of simulated time
  started: false,     // false while the character-select screen is open
  planet: 0,          // index into PLANETS (config/planets.js)
  transitioning: false,  // true while fading between planets (input is locked)
  paused: false,      // the pause menu is open: the simulation is frozen (src/ui/PauseMenu.js)
  cutscene: false,    // a boss is waking (src/gameplay/BossGate.js): the hero can't act, the camera is on the lair
  indoors: null,      // name of the house the hero is inside (src/gameplay/Houses.js), or null
  inventoryOpen: false,  // the bag is open: abilities and talking are paused, movement still works
  showcase: false,    // a menu holds the camera on the hero or pet (CameraSystem.setShowcase): critters keep out of the shot
  player: null,       // Player
  companion: null,    // Owl (witch, ranger) or Wolf (knight), created when a hero is picked
  npcs: [],
  critters: [],
  birds: [],
  enemies: [],
  boss: null,         // this planet's boss (also listed in enemies)
  bossesDefeated: 0,  // planet bosses beaten this adventure (villagers react to it)
  projectiles: [],
  hitStop: 0,         // seconds of slow motion left after a heavy impact (fx/combatFx.js hitStop)
  worldItems: [],     // WorldItem pickups lying on the planet
};
