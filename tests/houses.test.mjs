// House data: every house resolves on every planet to a layout, furniture the room builder knows, owners who exist
// and gifts that are real items. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOUSES, INTERACTIONS } from '../src/config/houses.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';

const ITEMS = new Set(ITEM_DEFINITIONS.map(d => d.id));
const src = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const VILLAGERS = [...src('../src/entities/npc/npcDefs.js').matchAll(/\{ name: '([^']+)'/g)].map(m => m[1]);
/** Furniture kinds the room builder can place, per layout (read from its ANCHORS table). */
const interiors = src('../src/world/interiors.js'), anchors = layout => {
  const block = interiors.split(`${layout}: {`)[1].split('\n  },')[0];
  return new Set([...block.matchAll(/(\w+): \[/g)].map(m => m[1]));
};
const resolved = (i, planet) => ({ ...HOUSES[i], ...(HOUSES[i].planets?.[planet] ?? {}) });

test('every house on every planet has a name, a known layout and furniture that layout can place', () => {
  for (const i of Object.keys(HOUSES)) for (let p = 0; p < PLANETS.length; p++) {
    const h = resolved(i, p), known = anchors(h.layout);
    assert.ok(h.name && ['mushroom', 'cottage'].includes(h.layout), `house ${i} planet ${p}`);
    for (const kind of h.props) assert.ok(known.has(kind), `house ${i} planet ${p}: ${h.layout} can't place '${kind}'`);
    assert.ok(h.props.includes('bed') || h.resident, `house ${i} planet ${p}: somewhere to rest`);
  }
});

test('owners are real villagers; someone lives in each house, or a note says where they are', () => {
  for (const i of Object.keys(HOUSES)) for (let p = 0; p < PLANETS.length; p++) {
    const h = resolved(i, p);
    if (h.owner) assert.ok(VILLAGERS.includes(h.owner), `house ${i}: owner ${h.owner}`);
    if (h.resident) assert.ok(h.resident.name && h.resident.lines.length && h.resident.portrait, `house ${i}: resident`);
    assert.ok(h.owner || h.resident || h.note, `house ${i} planet ${p}: owner, resident or note`);
    if (h.owner) assert.ok(h.note, `house ${i} planet ${p}: a note for when ${h.owner} is out`);
  }
});

test('chest gifts are real items; interactive furniture has a prompt', () => {
  for (const h of Object.values(HOUSES)) for (const g of [h.gift, ...Object.values(h.planets ?? {}).map(x => x.gift)]) for (const [id] of g?.items ?? []) assert.ok(ITEMS.has(id), id);
  for (const [kind, it] of Object.entries(INTERACTIONS)) assert.ok(it.label, kind);
});
