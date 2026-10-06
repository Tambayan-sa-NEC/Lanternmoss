/* Using items from the bag. Each effect id in ITEM_EFFECTS (config/items.js) has a handler here; an item's `use`
   list says which effects it applies. An item is only consumed when at least one effect did something, so a
   potion isn't wasted at full health. New behaviours = a new effect handler, or a new action in items/itemActions.js. */
import { ITEM_EFFECTS } from '../config/items.js';
import { ctx } from '../core/context.js';
import { ITEM_ACTIONS, actionFor } from '../items/itemActions.js';
import { audio } from '../systems/AudioSystem.js';
import { BUFF_NAMES, buff, buffs } from './buffs.js';
import { equipFromSlot } from './equipment.js';
import { Needs } from './Needs.js';

/** Actions run by other systems (tools: ./Gathering.js, seeds: ./Farm.js), registered there to keep this file free of
    them: action id -> (inventory, slot, def) => { ok, message }. */
export const ACTION_HANDLERS = {};

/** effect id -> (effect entry) => did it change anything? */
const EFFECTS = {
  heal: e => { const P = ctx.player; if (P.hp >= P.stats.maxHp) return false; P.hp = Math.min(P.stats.maxHp, P.hp + e.amount); return true; },
  mana: e => { const P = ctx.player; if (P.mana >= P.stats.maxMana) return false; P.mana = Math.min(P.stats.maxMana, P.mana + e.amount); return true; },
  energy: e => Needs.eat(e.amount),
  buff: e => { buff(e.kind, Math.max(buffs[e.kind], e.seconds), `${BUFF_NAMES[e.kind]}! (${e.seconds}s)`); return true; },
};
for (const id of Object.keys(ITEM_EFFECTS)) if (!EFFECTS[id]) console.warn(`Item effect "${id}" has no handler in gameplay/itemUse.js`);

/** Performs the item's action for the stack in `slot`. Returns { ok, message } for the UI to show. */
export function useItemInSlot(inventory, slot) {
  const stack = inventory.getSlot(slot);
  if (!stack) return { ok: false, message: 'That slot is empty.' };
  const def = inventory.registry.get(stack.itemId), action = actionFor(def);
  if (!action) return { ok: false, message: `${def.name} can't be used. It's kept for later.` };
  if (!ITEM_ACTIONS[action]?.supported) return { ok: false, message: `${ITEM_ACTIONS[action]?.label ?? 'That'} isn't available yet.` };
  if (action === 'inspect') return { ok: true, message: def.description };
  if (action === 'equip') return equipFromSlot(inventory, slot);
  if (ACTION_HANDLERS[action]) return ACTION_HANDLERS[action](inventory, slot, def);
  if (action === 'tool' || action === 'plant') return { ok: false, message: `${def.name}: use it from the hotbar.` };
  if (ctx.player.dead) return { ok: false, message: "You can't do that while fainted." };
  const applied = def.use.map(e => EFFECTS[e.effect]?.(e) ?? false).some(Boolean);
  if (!applied) return { ok: false, message: 'It would have no effect right now.' };
  inventory.removeFromSlot(slot, 1);
  audio.sparkle();
  const message = `Used ${def.name}.`;
  inventory.notify('itemused', { itemId: def.id, slot, message });
  return { ok: true, message };
}
