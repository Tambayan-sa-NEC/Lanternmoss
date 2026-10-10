/* How an item looks in the UI: its icon, and the details panel / tooltip text. Reads definitions only (plus the
   stack's own rarity for gear). */
import { CHARACTERS } from '../config/characters.js';
import { GEAR_KINDS, ITEM_CATEGORIES, ITEM_EFFECTS, RARITIES, TOOL_KINDS } from '../config/items.js';
import { CROPS } from '../config/resources.js';
import { FUEL, RECIPES } from '../config/crafting.js';
import { RUNES } from '../config/magic.js';
import { BUFF_NAMES } from '../gameplay/buffs.js';
import { formatStat, gearStats, itemRarity } from '../items/gear.js';
import { ITEM_ACTIONS, actionFor } from '../items/itemActions.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { itemArtSvg } from './itemArt.js';

const hex = n => '#' + n.toString(16).padStart(6, '0');
const titleCase = w => w.charAt(0) + w.slice(1).toLowerCase();

/** A small icon: the definition's image, its own drawing (ui/itemArt.js), or else its plain shape (styles/main.css). */
export function itemIconHtml(def) {
  if (def.icon.src) return `<img class="item-icon" src="${def.icon.src}" alt="">`;
  const art = itemArtSvg(def); if (art) return `<span class="item-icon art">${art}</span>`;
  return `<span class="item-icon shape-${def.icon.shape}" style="--c:${hex(def.icon.color ?? 0xffffff)}"></span>`;
}

/** The colour of this stack's rarity (gear rolls its own). */
export function rarityColor(def, props = null) { return RARITIES[itemRarity(def, props)].color; }

/** "Restores 35 HP", "Moon-Hop for 30s"... from the ITEM_EFFECTS templates. */
function describeEffect(e) {
  const vars = { ...e, buffName: BUFF_NAMES[e.kind] ?? e.kind,
    recipeName: itemRegistry.get(RECIPES.find(r => r.id === e.recipeId)?.result)?.name ?? 'a recipe' };
  return ITEM_EFFECTS[e.effect].replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Details for a stack: name (rarity colour), category and rarity, description, effects or gear stats, quantity, value.
    o.hero = who's looking (gear for someone else says so), o.worn = it's being worn right now. */
export function describeItem(def, stack, o = {}) {
  const rarity = RARITIES[itemRarity(def, stack?.props)], action = actionFor(def);
  const res = o.hero ? titleCase(CHARACTERS[o.hero].resource) : 'mana';
  const crop = def.props.crop && CROPS[def.props.crop];
  const lines = def.equip ? Object.entries(gearStats(def, stack?.props)).map(([k, v]) => `<li>${formatStat(k, v, res.toLowerCase())}</li>`)
    : def.tool ? [`<li>${titleCase(TOOL_KINDS[def.tool.kind].use)}</li>`]
    : crop ? [`<li>Grows into ${crop.name} after ${crop.days < 1 ? 'less than a day' : `${Math.ceil(crop.days)} days`} of watering</li>`]
    : def.use.map(e => `<li>${describeEffect(e)}</li>`);
  const kind = def.equip ? `${GEAR_KINDS[def.equip.slot].label}${def.equip.hero ? ` · ${CHARACTERS[def.equip.hero].title} only` : ''}`
    : def.tool ? `Tool · ${TOOL_KINDS[def.tool.kind].label}` : ITEM_CATEGORIES[def.category];
  const qty = def.stackable ? `${stack.quantity} / ${def.maxStack}` : '1 (doesn\'t stack)';
  const wrongHero = def.equip?.hero && o.hero && def.equip.hero !== o.hero;
  return `<div class="inv-d-head">${itemIconHtml(def)}<div><div class="inv-d-name" style="color:${rarity.color}">${def.name}</div>` +
    `<div class="inv-d-sub">${kind} · ${rarity.label}</div></div></div>` +
    `<p class="inv-d-desc">${def.description}</p>` +
    (lines.length ? `<ul class="inv-d-fx">${lines.join('')}</ul>` : '') +
    (def.equip?.vanity ? '<div class="inv-d-note worn">Vanity: changes how you look, not your stats.</div>' : '') +
    (def.tags.includes('meal') ? '<div class="inv-d-note worn">Meal buff: replaces your previous meal buff. Potion and pet buffs are kept.</div>' : '') +
    (def.equip && !def.equip.vanity ? `<div class="inv-d-note worn">Rune slot: ${RUNES[stack?.props?.enchantment]?.name ?? 'empty'}. Enchant at the forge from the Enchant tab.</div>` : '') +
    (def.tool && !o.worn ? '<div class="inv-d-note worn">Keep it on the hotbar: press E (or right click) by what it works on.</div>' : '') +
    (crop && !o.worn ? '<div class="inv-d-note worn">Press E at a tilled plot in the village farm to plant.</div>' : '') +
    (FUEL[def.id] && !o.worn ? `<div class="inv-d-note worn">Fuel for smelting at the forge: burns for ${FUEL[def.id]}.</div>` : '') +
    (o.worn ? '<div class="inv-d-note worn">Worn. Click it to take it off.</div>' : '') +
    (wrongHero ? `<div class="inv-d-note">Only the ${CHARACTERS[def.equip.hero].title} can use this.</div>` : '') +
    (o.worn ? '' : `<div class="inv-d-stats"><span>Quantity: ${qty}</span>${def.value ? `<span>Value: ${def.value}</span>` : ''}</div>`) +
    (action || o.worn ? '' : `<div class="inv-d-note">${def.category === 'material' ? 'Used for crafting (the Craft tab).' : 'Kept for later.'}</div>`) +
    (action && !ITEM_ACTIONS[action].supported ? `<div class="inv-d-note">${ITEM_ACTIONS[action].label}: coming soon.</div>` : '');
}
