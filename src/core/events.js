/* Game-wide happenings other systems may react to without importing each other (pets unlocking, for one):
     'questcomplete'  detail { id }               (src/gameplay/quests/Quests.js)
     'chestopened'    detail { kind, planet }     (src/gameplay/Chests.js)
   Combat has its own bus (src/combat/events.js), levelling too (src/progression/experience.js). */
export const gameEvents = new EventTarget();
export const emit = (type, detail) => gameEvents.dispatchEvent(new CustomEvent(type, { detail }));
