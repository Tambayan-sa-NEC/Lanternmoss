/* ITEM REGISTRY: the validated, read-only catalogue of item definitions (config/items.js), looked up by id.
   Pure (no scene / DOM), unit-tested. Invalid or duplicate definitions are reported and skipped, never half-loaded. */
import { GEAR_KINDS, INVENTORY, ITEM_CATEGORIES, ITEM_DEFINITIONS, ITEM_EFFECTS, RARITIES, STATS, TOOL_KINDS } from '../config/items.js';

const NOT_STACKABLE = new Set(['equipment', 'weapon', 'quest', 'tool']);
const NOT_DROPPABLE = new Set(['quest']);

/** Builds a registry from definitions. warn(message) is told about every rejected definition. */
export function createItemRegistry(definitions, { defaultStackSize = INVENTORY.defaultStackSize, warn = m => console.warn(m) } = {}) {
  const byId = new Map();
  for (const raw of definitions) {
    const problem = validate(raw);
    if (problem) { warn(`Item definition ${raw && raw.id ? `"${raw.id}"` : '(no id)'} skipped: ${problem}`); continue; }
    if (byId.has(raw.id)) { warn(`Item definition "${raw.id}" skipped: duplicate id (the first one is kept)`); continue; }
    byId.set(raw.id, normalize(raw, defaultStackSize));
  }
  return {
    /** The definition for id, or null when there is no such item. */
    get: id => byId.get(id) || null,
    has: id => byId.has(id),
    ids: () => [...byId.keys()],
    all: () => [...byId.values()],
    get size() { return byId.size; },
  };
}

function validate(d) {
  if (!d || typeof d !== 'object') return 'not an object';
  if (typeof d.id !== 'string' || !d.id) return 'missing id';
  if (typeof d.name !== 'string' || !d.name) return 'missing name';
  if (!(d.category in ITEM_CATEGORIES)) return `unknown category "${d.category}"`;
  if (d.rarity !== undefined && !(d.rarity in RARITIES)) return `unknown rarity "${d.rarity}"`;
  if (d.maxStack !== undefined && !(Number.isInteger(d.maxStack) && d.maxStack >= 1)) return 'maxStack must be a whole number >= 1';
  if (d.stackable === false && d.maxStack > 1) return 'a non-stackable item cannot have maxStack > 1';
  for (const e of d.use || []) if (!e || !(e.effect in ITEM_EFFECTS)) return `unknown use effect "${e && e.effect}"`;
  if (d.equip !== undefined) {
    if (!d.equip || !(d.equip.slot in GEAR_KINDS)) return `unknown gear kind "${d.equip && d.equip.slot}"`;
    for (const [k, v] of Object.entries(d.equip.stats || {})) if (!(k in STATS) || typeof v !== 'number') return `bad gear stat "${k}"`;
  }
  if (d.tool !== undefined && (!d.tool || !(d.tool.kind in TOOL_KINDS))) return `unknown tool kind "${d.tool && d.tool.kind}"`;
  return null;
}

function normalize(d, defaultStackSize) {
  const stackable = d.stackable ?? !NOT_STACKABLE.has(d.category);
  return Object.freeze({
    id: d.id, name: d.name, description: d.description || '', category: d.category,
    icon: Object.freeze({ ...(d.icon || { shape: 'orb', color: 0xffffff }) }),
    stackable, maxStack: stackable ? (d.maxStack ?? defaultStackSize) : 1,
    rarity: d.rarity || 'common', value: d.value ?? 0,
    use: Object.freeze((d.use || []).map(e => Object.freeze({ ...e }))),
    action: d.action ?? null,
    droppable: d.droppable ?? !NOT_DROPPABLE.has(d.category),
    tags: Object.freeze([...(d.tags || [])]),
    props: Object.freeze({ ...(d.props || {}) }),
    equip: d.equip ? Object.freeze({ slot: d.equip.slot, hero: d.equip.hero ?? null, tier: d.equip.tier ?? 1, vanity: !!GEAR_KINDS[d.equip.slot].vanity,
      stats: Object.freeze({ ...(d.equip.stats || {}) }) }) : null,
    tool: d.tool ? Object.freeze({ kind: d.tool.kind, tier: d.tool.tier ?? 1 }) : null,
  });
}

/** The game's catalogue. */
export const itemRegistry = createItemRegistry(ITEM_DEFINITIONS);
