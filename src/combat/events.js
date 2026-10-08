/* Encounter events, so planet progression and quests can react to fights without enemies depending on them:
     'bossdefeated'   detail { boss }    raised once when a planet's boss dies
     'minibossdefeated' detail { boss }  a mini boss (hydra, basilisk) dies
     'enemydefeated'  detail { enemy }   any monster dying (quest defeat steps count these)
     'enemyhit'       detail { enemy, amount, source }   a monster took damage (source 'pet' = your pet's)
     'playerhurt'     detail { amount }  a hit landed on the hero (the journal's boss challenges listen) */
export const encounterEvents = new EventTarget();
