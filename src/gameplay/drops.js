/* Monster drops (config/chests.js MONSTER_DROPS): a defeated monster sometimes leaves a little something behind,
   which hops out where it fell. Bosses leave their treasure chest instead (./Chests.js); a boss's summoned helpers
   leave nothing, so they can't be farmed. */
import { MONSTER_DROPS } from '../config/chests.js';
import { ctx } from '../core/context.js';
import { encounterEvents } from '../combat/events.js';
import { spawnSpot } from '../world/placement.js';
import { rollLoot } from './loot.js';
import { spawnWorldItem } from './pickups.js';

/** Chance that enemy definition `def` drops something. */
export function dropChance(def) { return Math.min(MONSTER_DROPS.max, MONSTER_DROPS.chance + (def.xp ?? 0) * MONSTER_DROPS.perXp); }

export function dropLoot(e, rng = Math.random) {
  if (e.owner || e === ctx.boss || e.def.ai === 'boss' || e.def.object) return [];
  if (rng() >= dropChance(e.def)) return [];
  const { items } = rollLoot(MONSTER_DROPS.table, ctx.planet, rng, ctx.player.charId);
  return items.map(({ item, qty, props }) =>
    spawnWorldItem(item, qty, spawnSpot(e.up, 0.5, 1.3, 0.3), { from: e.up, popTime: 0.5, stepAway: false, props }));
}

encounterEvents.addEventListener('enemydefeated', ev => dropLoot(ev.detail.enemy));
