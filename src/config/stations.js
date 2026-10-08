/* ---------------------------------------------------------------------
   CRAFTING STATIONS (runtime: src/gameplay/Stations.js, models: src/models/stations.js). Every village has a crafting
   corner with all four, a short walk from the square. A recipe with `station` (config/crafting.js) can only be made
   standing at that station; the rest can be made anywhere, by hand (so your first tools never need one).
     name, short   what the prompt and the Craft tab call it
     does          one line for the Craft tab's station chip
     color         the chip colour, and the sparkles while it works
   STATION_CORNER where the corner goes: its distance from the square, the gap between stations, and how near you stand
   --------------------------------------------------------------------- */

export const STATIONS = {
  workbench: { name: 'Workbench', short: 'Workbench', does: 'wooden weapons, light armour and trinkets', color: 0xc08a50 },
  forge: { name: 'Forge and Anvil', short: 'Forge', does: 'metal tools, weapons, armour and gem settings', color: 0xff7a3a },
  pot: { name: 'Cooking Pot', short: 'Cooking Pot', does: 'hot meals', color: 0xf0a040 },
  brew: { name: 'Brewing Stand', short: 'Brewing Stand', does: 'potions and tonics', color: 0x9f7aff },
};

export const STATION_CORNER = {
  distance: [12, 22],         // metres from the village centre
  spacing: 2.6,               // between neighbouring stations
  reach: 1.9,                 // stand this close to use one
};
