/* Monster drops (config/chests.js MONSTER_DROPS): a defeated monster sometimes leaves a little something behind,
   which hops out where it fell. Bosses leave their treasure chest instead (./Chests.js); a boss's summoned helpers
   leave nothing, so they can't be farmed. Mini bosses always leave a rare loot roll (MINI_BOSS_LOOT).
   In a cave (TODO 29e) there is no ground to hop onto, and the floor is thrown away when the cave is: a monster that
   falls underground hands its drops straight to the bag, the same rule a cave chest follows. */
import { MINI_BOSS_LOOT, MONSTER_DROPS } from '../config/chests.js';
import { ctx } from '../core/context.js';
import { encounterEvents } from '../combat/events.js';
import { spawnSpot } from '../world/placement.js';
import { rollLoot } from './loot.js';
import { grantItem, spawnWorldItem } from './pickups.js';
import { gainCoins } from './wallet.js';
import { rng as playRng } from '../utils/random.js';

/** Chance that enemy definition `def` drops something. */
export function dropChance(def) { return Math.min(MONSTER_DROPS.max, MONSTER_DROPS.chance + (def.xp ?? 0) * MONSTER_DROPS.perXp); }

/** Indoors in a cave, loot cannot lie on the floor: it goes into the bag instead. Returns true when it did. */
function keepIndoors(items) {
  if (!ctx.room) return false;
  for (const { item, qty, props } of items) grantItem(item, qty, props);
  return true;
}

export function dropLoot(e, rng = playRng) {
  if (e.owner || e.killedBy || e === ctx.boss || e.def.ai === 'boss' || e.def.object) return [];   // killedBy: another monster won this one (TODO 45b)
  const items = rng() < dropChance(e.def) ? rollLoot(MONSTER_DROPS.table, ctx.planet, rng, ctx.player.charId).items : [];
  const extra = MONSTER_DROPS.extra?.[e.type];                                  // only monsters with an extra draw again
  if (extra && rng() < extra.chance) for (const [item, qty] of extra.items)
    items.push({ item, qty: Array.isArray(qty) ? qty[0] + Math.floor(rng() * (qty[1] - qty[0] + 1)) : qty });
  if (keepIndoors(items)) return [];
  return items.map(({ item, qty, props }) =>
    spawnWorldItem(item, qty, spawnSpot(e.up, 0.5, 1.3, 0.3), { from: e.up, popTime: 0.5, stepAway: false, props }));
}

encounterEvents.addEventListener('enemydefeated', ev => dropLoot(ev.detail.enemy));

/** A mini boss always leaves treasure: a rare loot roll (coins and items) scattered around where it fell. */
export function miniBossLoot(e, rng = playRng) {
  const { coins, items } = rollLoot(MINI_BOSS_LOOT.table, ctx.planet, rng, ctx.player.charId);
  for (const [item, qty] of MINI_BOSS_LOOT.extra?.[e.type] ?? []) items.push({ item, qty });   // its own keepsake (the Hydra's toad cap)
  if (coins) gainCoins(coins, e.center());
  if (keepIndoors(items)) return [];
  return items.map(({ item, qty, props }) => spawnWorldItem(item, qty, spawnSpot(e.up, 1, 3, 0.3), { from: e.up, popTime: 0.6, stepAway: false, props }));
}
encounterEvents.addEventListener('minibossdefeated', ev => miniBossLoot(ev.detail.boss));
