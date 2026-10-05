/* Encounter events, so planet progression and quests can react to fights without enemies depending on them:
     'bossdefeated'   detail { boss }    raised once when a planet's boss dies
     'enemydefeated'  detail { enemy }   any monster dying (quest defeat steps count these) */
export const encounterEvents = new EventTarget();
