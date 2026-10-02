/* What "using" an item means, by category, so each category can grow its own behaviour without touching the
   inventory: consumables are used up, equipment / weapons will be equipped, quest items are inspected, materials
   are simply kept. A definition can override this with its own `action`. Pure (no scene / DOM). */

export const ITEM_ACTIONS = {
  use:     { label: 'Use', supported: true },        // apply the item's `use` effects, then consume one
  equip:   { label: 'Equip', supported: false },     // reserved: equipment slots are a future feature
  inspect: { label: 'Inspect', supported: true },    // only shows details; never consumes
};

const CATEGORY_ACTIONS = { consumable: 'use', equipment: 'equip', weapon: 'equip', quest: 'inspect', material: null, misc: null };

/** The action id for an item definition, or null when it can only be stored. */
export function actionFor(def) {
  if (!def) return null;
  if (def.action) return def.action;
  const a = CATEGORY_ACTIONS[def.category] ?? null;
  return a === 'use' && !def.use.length ? null : a;      // a consumable with no effects has nothing to do
}
