/* How an item looks in the UI: its icon, and the details panel / tooltip text. Reads definitions only. */
import { ITEM_CATEGORIES, ITEM_EFFECTS, RARITIES } from '../config/items.js';
import { BUFF_NAMES } from '../gameplay/buffs.js';
import { ITEM_ACTIONS, actionFor } from '../items/itemActions.js';

const hex = n => '#' + n.toString(16).padStart(6, '0');

/** A small icon: the definition's image, or its procedural shape (styles/main.css .item-icon). */
export function itemIconHtml(def) {
  if (def.icon.src) return `<img class="item-icon" src="${def.icon.src}" alt="">`;
  return `<span class="item-icon shape-${def.icon.shape}" style="--c:${hex(def.icon.color ?? 0xffffff)}"></span>`;
}

export function rarityColor(def) { return RARITIES[def.rarity].color; }

/** "Restores 35 HP", "Moon-Hop for 30s"... from the ITEM_EFFECTS templates. */
function describeEffect(e) {
  const vars = { ...e, buffName: BUFF_NAMES[e.kind] ?? e.kind };
  return ITEM_EFFECTS[e.effect].replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Details for a stack: name (rarity colour), category and rarity, description, effects, quantity, value. */
export function describeItem(def, stack) {
  const rarity = RARITIES[def.rarity], action = actionFor(def);
  const effects = def.use.map(e => `<li>${describeEffect(e)}</li>`).join('');
  const qty = def.stackable ? `${stack.quantity} / ${def.maxStack}` : '1 (doesn\'t stack)';
  return `<div class="inv-d-head">${itemIconHtml(def)}<div><div class="inv-d-name" style="color:${rarity.color}">${def.name}</div>` +
    `<div class="inv-d-sub">${ITEM_CATEGORIES[def.category]} · ${rarity.label}</div></div></div>` +
    `<p class="inv-d-desc">${def.description}</p>` +
    (effects ? `<ul class="inv-d-fx">${effects}</ul>` : '') +
    `<div class="inv-d-stats"><span>Quantity: ${qty}</span>${def.value ? `<span>Value: ${def.value}</span>` : ''}</div>` +
    (action ? '' : '<div class="inv-d-note">Kept for later (crafting and shops).</div>') +
    (action && !ITEM_ACTIONS[action].supported ? `<div class="inv-d-note">${ITEM_ACTIONS[action].label}: coming soon.</div>` : '');
}
