/* Toasts for inventory events (wired like progression/levelFeedback.js): items gained, a full bag, items used. */
import { INVENTORY } from '../config/items.js';
import { ctx } from '../core/context.js';
import { toast } from './toast.js';

export function installItemNotices(inventory) {
  const name = id => inventory.registry.get(id).name;
  let fullAt = -Infinity;
  inventory.addEventListener('itemadded', e => toast(`+${e.detail.quantity} ${name(e.detail.itemId)}`));
  inventory.addEventListener('full', () => {
    if (ctx.time - fullAt < INVENTORY.fullNoticeCooldown) return;
    fullAt = ctx.time; toast('Your bag is full! Press I to make room.');
  });
  inventory.addEventListener('itemused', e => toast(e.detail.message));
}
