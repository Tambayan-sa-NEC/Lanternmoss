/* ---------------------------------------------------------------------
   DUSKHOLLOW'S OLD ROAD, ITS WAYLAMPS AND THE VILLAGE FLAME (TODO 30d).
   Runtime: src/gameplay/OldRoad.js (the lamps, the wells and the carried flame you light them with); the lit state
   itself is saved per planet by the lantern mechanic (src/world/mechanics/lantern.js), beside the Oil bar, so
   Continue and portal travel restore a relit road exactly as they restore the tank.
   Wick asks for this road in the `oldRoad` quest (config/quests.js); its three moonwells are Umbra's gate together
   with level 11 (planets/duskhollow.js `boss.summon`).
   Nothing here can hurt the hero: a flame that runs dry only goes out, and the walk back to the last lit waylamp
   is the whole cost.
     branches   how the road leaves the village. One branch per moonwell, each aimed at one of the planet's
                authored gaps of starlight (planets/duskhollow.js `canopy.gaps`), so every well stands under open sky:
                gaps     which authored gap each branch ends in, in order
                from     metres from the village centre where a branch's first waylamp stands
                spacing  metres between waylamps along a branch
                maxLamps hard cap on the waylamps of the whole road (bounds the saved state and the lit lights)
     flame      the village flame you carry out to the lamps:
                seconds  how long a freshly taken flame lasts while you play outdoors. It never burns indoors, in a
                         cave, in a menu, while paused, or over skipped and away time, exactly like the belt lantern
                reach    metres within which E takes a flame, lights a waylamp or lights a moonwell
                light    the carried flame's own glow (radius/colour/intensity through render/lighting.js)
     lamp       a relit waylamp: it stays lit for the rest of the adventure and marks a safe path
                light    its glow once lit            height  metres the lamp head sits above the ground
                sources  how many lit waylamps pool light on the ground at once. A lit lamp head always glows; this
                         bounds the shared local lights a whole relit road may hold (render/lighting.js budgets),
                         so the nearest lamps are lit for real and the far ones cost nothing
     well       a moonwell lantern, the quest's three goals; brighter and taller than a waylamp
     brazier    the village flame itself, burning in the village gap beside the square
   --------------------------------------------------------------------- */

export const OLD_ROAD = {
  branches: { gaps: [0, 1, 2], from: 20, spacing: 11, maxLamps: 24 },
  flame: { seconds: 95, reach: 2.6, light: { radius: 5.2, color: 0xffc06a, intensity: 0.8 } },
  lamp: { height: 2.0, sources: 2, light: { radius: 7.5, color: 0xffb85c, intensity: 0.75 } },
  well: { height: 3.1, light: { radius: 11, color: 0xcfe0ff, intensity: 1.1 } },
  brazier: { angle: 5.3, distance: 6.5, light: { radius: 8, color: 0xffb85c, intensity: 0.9 } },
};
