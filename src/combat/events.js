/* Encounter events, so planet progression can react to fights without enemies depending on it:
     'bossdefeated'  detail { boss }   raised once when a planet's boss dies */
export const encounterEvents = new EventTarget();
