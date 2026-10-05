/* The hero's coins (ctx.player.coins, ✦): earned from monsters, challenges and quests, spent at the shop.
   Kept across planets and fainting; a new adventure starts with none. */
import * as THREE from 'three';
import { COINS, SHOP } from '../config/shop.js';
import { ctx } from '../core/context.js';
import { floatText } from '../fx/combatFx.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { audio } from '../systems/AudioSystem.js';

const _tv = new THREE.Vector3();

/** Adds n coins, with a gold "+n ✦" over `at` (a world point; default over the hero's head). */
export function gainCoins(n, at = null) {
  const P = ctx.player; n = Math.max(0, Math.round(n)); if (!n) return;
  P.coins += n; audio.coin();
  floatText(at ? _tv.copy(at) : _tv.copy(P.pos).addScaledVector(P.up, 2.6), `+${n} ✦`, '#ffd36b');
}
/** Pays n coins if the hero has them; returns whether it did. */
export function spendCoins(n) { const P = ctx.player; if (P.coins < n) return false; P.coins -= n; return true; }

/** Coins for defeating a monster (summoned helpers of a boss are worth nothing, so they can't be farmed). */
export function coinsForKill(e) { return e.owner ? 0 : Math.max(1, Math.round(e.def.xp * COINS.perXp)); }

/** Shop prices from an item's value: what it costs to buy (stock entry may override) and what selling one gives (0 = can't sell). */
export function buyPrice(stockEntry) { return stockEntry.price ?? Math.max(1, Math.round(itemRegistry.get(stockEntry.item).value * SHOP.buyMarkup)); }
export function sellPrice(itemId) {
  const def = itemRegistry.get(itemId);
  return !def || def.category === 'quest' || !def.value ? 0 : Math.max(1, Math.floor(def.value * SHOP.sellRate));
}
