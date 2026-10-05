/* Items moving between the world and the hero's bag:
     spawnWorldItem   put a stack on the ground (forage, drops, gifts that didn't fit)
     updateWorldItems walk-over pickup: the bag decides what it accepts; only that much leaves the world
     grantItem        give the hero an item directly (gifts, rewards); whatever doesn't fit lands at their feet
     dropFromSlot     take a stack out of the bag and set it on the ground
   Every source of items (loot tables, chests, shops...) can build on these four. */
import { INVENTORY } from '../config/items.js';
import { ctx } from '../core/context.js';
import { WorldItem } from '../entities/WorldItem.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist, dirAlong } from '../utils/sphere.js';
import { spawnSpot } from '../world/placement.js';
import { groundHeight } from '../world/terrain.js';

export function spawnWorldItem(itemId, quantity, dir, options) {
  if (!itemRegistry.has(itemId) || quantity <= 0) return null;
  const w = new WorldItem(itemId, quantity, dir, options);
  ctx.worldItems.push(w); return w;
}

export function clearWorldItems() { for (const w of ctx.worldItems) w.dispose(); ctx.worldItems.length = 0; }

/** Scatters a planet's forage (PLANETS[i].forage) over free ground. */
export function spawnForage(forage) {
  for (const { item, count } of forage) for (let i = 0; i < count; i++) spawnWorldItem(item, 1, spawnSpot(null, 0, 0, 0.6));
}

/** Gives the hero `quantity` of itemId; anything the bag can't hold is set down in front of them.
    Returns how many went into the bag. */
export function grantItem(itemId, quantity = 1) {
  const r = ctx.player.inventory.add(itemId, quantity);
  if (r.remaining && !r.error) spawnWorldItem(itemId, r.remaining, dropSpot(), { pickupDelay: INVENTORY.dropPickupDelay });
  return r.added;
}

/** A villager hands the hero an item (Pim's buns and tarts). */
export function giftItem(npc, itemId) {
  grantItem(itemId, 1);
  emote(npc, 'heart'); emote(ctx.player, 'heart', '#ffb03d'); toast(`Received: ${itemRegistry.get(itemId).name}!`); audio.sparkle();
}

/** Drops the whole stack in slot i on the ground in front of the hero. Returns false if it can't be dropped. */
export function dropFromSlot(slot) {
  const stack = ctx.player.inventory.getSlot(slot);
  if (!stack || !itemRegistry.get(stack.itemId).droppable) return false;
  const taken = ctx.player.inventory.removeFromSlot(slot);
  spawnWorldItem(taken.itemId, taken.quantity, dropSpot(), { pickupDelay: INVENTORY.dropPickupDelay, props: taken.props });
  audio.plip();
  return true;
}

function dropSpot() { const P = ctx.player; return dirAlong(P.up, P.fwd, INVENTORY.dropDistance); }

/** Walk-over pickup. The world item only shrinks by what the bag actually accepted. */
export function updateWorldItems(dt) {
  const P = ctx.player, canCollect = ctx.started && !P.dead && !ctx.transitioning && P.r - groundHeight(P.up) < 1.6;
  for (let i = ctx.worldItems.length - 1; i >= 0; i--) {
    const w = ctx.worldItems[i]; w.update(dt);
    const near = arcDist(P.up, w.up) < INVENTORY.pickupRadius;
    if (!w.armed) { w.delay -= dt; if (w.delay <= 0 && (!near || !w.stepAway)) w.armed = true; continue; }    // dropped: wait, then step away first
    if (!near) { w.blocked = false; continue; }
    if (!canCollect || w.blocked) continue;
    const r = P.inventory.add(w.itemId, w.quantity, w.props);
    if (r.added) sparkles.emit(w.spinner.getWorldPosition(w.pos.clone()), { count: 14, color: w.sparkleColor, speed: 1.8, up: w.up, upBias: 0.8, life: 0.6, size: 0.3 });
    if (r.remaining) { w.quantity = r.remaining; w.blocked = true; continue; }               // bag full: the rest stays put
    w.dispose(); ctx.worldItems.splice(i, 1);
  }
}
