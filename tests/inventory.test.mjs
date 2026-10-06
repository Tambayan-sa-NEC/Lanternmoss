// Inventory + item registry: stacking, capacity, overflow, moving / swapping, removal, events and edge cases.
// Run with `npm test`. Uses a small test catalogue so stack sizes are easy to reason about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Inventory, toCount } from '../src/inventory/Inventory.js';
import { createItemRegistry, itemRegistry } from '../src/items/ItemRegistry.js';
import { actionFor } from '../src/items/itemActions.js';
import { ITEM_DEFINITIONS, ITEM_EFFECTS, ITEM_ICON_SHAPES, RARITIES } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';

const quiet = { warn: () => {} };
const registry = createItemRegistry([
  { id: 'potion', name: 'Potion', category: 'consumable', maxStack: 10, use: [{ effect: 'heal', amount: 5 }] },
  { id: 'ore', name: 'Ore', category: 'material', maxStack: 3 },
  { id: 'sword', name: 'Sword', category: 'weapon' },
  { id: 'map', name: 'Map', category: 'quest' },
], quiet);
const bag = (size = 4) => new Inventory(size, registry);
const contents = inv => inv.getSlots().map(s => (s ? `${s.itemId}x${s.quantity}` : '-'));

test('adds items and reports what was stored', () => {
  const inv = bag();
  assert.deepEqual(inv.add('potion', 3), { added: 3, remaining: 0 });
  assert.equal(inv.count('potion'), 3);
  assert.ok(inv.has('potion', 3) && !inv.has('potion', 4));
  assert.equal(inv.find('potion'), 0);
  assert.deepEqual(inv.getSlot(0), { itemId: 'potion', quantity: 3, props: null });
});

test('stacks fill up to their maximum, then overflow into the next empty slot (the spec example)', () => {
  const inv = bag(2);
  inv.add('potion', 7);
  assert.deepEqual(inv.add('potion', 8), { added: 8, remaining: 0 });
  assert.deepEqual(contents(inv), ['potionx10', 'potionx5']);
});

test('existing partial stacks are topped up before empty slots are used', () => {
  const inv = bag(4);
  inv.add('ore', 3); inv.add('potion', 1); inv.removeFromSlot(0, 2);       // ore x1 | potion x1
  inv.add('ore', 4);                                                       // tops slot 0 to 3, rest (2) into slot 2
  assert.deepEqual(contents(inv), ['orex3', 'potionx1', 'orex2', '-']);
});

test('non-stackable items take one slot each', () => {
  const inv = bag(4);
  assert.deepEqual(inv.add('sword', 3), { added: 3, remaining: 0 });
  assert.deepEqual(contents(inv), ['swordx1', 'swordx1', 'swordx1', '-']);
});

test('capacity is respected and the overflow is reported, with a full event', () => {
  const inv = bag(2); let full = null;
  inv.addEventListener('full', e => { full = e.detail; });
  assert.deepEqual(inv.add('ore', 10), { added: 6, remaining: 4 });       // 2 slots x 3
  assert.deepEqual(full, { itemId: 'ore', remaining: 4 });
  assert.ok(inv.isFull());
  assert.deepEqual(inv.add('potion', 1), { added: 0, remaining: 1 });      // no room at all
  assert.equal(inv.spaceFor('ore'), 0);
});

test('a full bag still accepts more of an item that has room in its stacks', () => {
  const inv = bag(2);
  inv.add('potion', 4); inv.add('sword');
  assert.ok(inv.isFull());
  assert.deepEqual(inv.add('potion', 9), { added: 6, remaining: 3 });
});

test('removing takes exactly the requested amount, frees emptied slots, and is all-or-nothing', () => {
  const inv = bag(3);
  inv.add('ore', 7);                                                        // 3 | 3 | 1
  assert.equal(inv.remove('ore', 2), true);                                 // takes from the last stacks first
  assert.deepEqual(contents(inv), ['orex3', 'orex2', '-']);
  assert.equal(inv.remove('ore', 6), false);                                // more than exists: nothing changes
  assert.equal(inv.count('ore'), 5);
  assert.equal(inv.remove('ore', 5), true);
  assert.deepEqual(contents(inv), ['-', '-', '-']);
});

test('removing the final item of a stack empties the slot', () => {
  const inv = bag();
  inv.add('potion', 1);
  assert.deepEqual(inv.removeFromSlot(0, 1), { itemId: 'potion', quantity: 1, props: null });
  assert.equal(inv.getSlot(0), null);
  assert.equal(inv.removeFromSlot(0, 1), null);                             // nothing left to take
});

test('removeFromSlot defaults to the whole stack and refuses more than the stack holds', () => {
  const inv = bag();
  inv.add('potion', 6);
  assert.equal(inv.removeFromSlot(0, 7), null);
  assert.equal(inv.count('potion'), 6);
  assert.equal(inv.removeFromSlot(0).quantity, 6);
});

test('moving: into an empty slot, merging into a matching stack, and swapping different items', () => {
  const inv = bag(4);
  inv.add('potion', 8); inv.add('ore', 2);                                   // potion x8 | ore x2 | - | -
  assert.equal(inv.move(0, 3), true);                                        // to empty
  assert.deepEqual(contents(inv), ['-', 'orex2', '-', 'potionx8']);
  inv.add('potion', 5);                                                      // tops slot 3 to 10, 3 more into slot 0
  assert.deepEqual(contents(inv), ['potionx3', 'orex2', '-', 'potionx10']);
  assert.equal(inv.move(0, 3), false);                                       // target stack already full: no change
  inv.removeFromSlot(3, 4);                                                  // potion x6 in slot 3
  assert.equal(inv.move(0, 3), true);                                        // merge 3 into 6
  assert.deepEqual(contents(inv), ['-', 'orex2', '-', 'potionx9']);
  assert.equal(inv.move(1, 3), true);                                        // different items: swap
  assert.deepEqual(contents(inv), ['-', 'potionx9', '-', 'orex2']);
});

test('a merge that overflows leaves the rest in the source slot', () => {
  const inv = bag(3);
  inv.add('potion', 10); inv.add('potion', 7);                               // 10 | 7
  inv.removeFromSlot(0, 4);                                                  // 6 | 7
  assert.equal(inv.move(1, 0), true);
  assert.deepEqual(contents(inv), ['potionx10', 'potionx3', '-']);
});

test('swap exchanges two occupied slots, or an occupied and an empty one', () => {
  const inv = bag(3);
  inv.add('potion', 2); inv.add('ore', 1);
  assert.equal(inv.swap(0, 1), true);
  assert.deepEqual(contents(inv), ['orex1', 'potionx2', '-']);
  assert.equal(inv.swap(1, 2), true);
  assert.deepEqual(contents(inv), ['orex1', '-', 'potionx2']);
});

test('invalid moves, swaps and slot indices change nothing', () => {
  const inv = bag(3); let changes = 0;
  inv.add('potion', 2);
  inv.addEventListener('change', () => changes++);
  for (const [a, b] of [[0, 0], [0, 9], [-1, 0], [1, 2], [0.5, 1], ['0', 1]]) assert.equal(inv.move(a, b), false, `move(${a}, ${b})`);
  assert.equal(inv.swap(1, 2), false);                                      // both empty
  assert.equal(inv.getSlot(99), null);
  assert.equal(inv.removeFromSlot(99), null);
  assert.equal(inv.setQuantity(99, 1), false);
  assert.equal(changes, 0);
  assert.deepEqual(contents(inv), ['potionx2', '-', '-']);
});

test('zero, negative, fractional and invalid quantities and unknown ids are rejected safely', () => {
  const inv = bag();
  assert.deepEqual(inv.add('potion', 0), { added: 0, remaining: 0, error: null });
  assert.equal(inv.add('potion', -3).error, 'invalid-quantity');
  assert.equal(inv.add('potion', 'many').error, 'invalid-quantity');
  assert.deepEqual(inv.add('potion', 2.9), { added: 2, remaining: 0 });      // fractions round down
  assert.deepEqual(inv.add('nope', 2), { added: 0, remaining: 2, error: 'unknown-item' });
  assert.equal(inv.remove('potion', 0), false);
  assert.equal(inv.remove('potion', -1), false);
  assert.equal(inv.remove('nope', 1), false);
  assert.equal(inv.has('potion', 0), false);
  assert.equal(toCount(Infinity), 0);
  assert.deepEqual(contents(inv), ['potionx2', '-', '-', '-']);
});

test('setQuantity updates a stack within 0..maxStack; 0 empties the slot', () => {
  const inv = bag();
  inv.add('potion', 2);
  assert.equal(inv.setQuantity(0, 9), true);
  assert.equal(inv.setQuantity(0, 11), false);
  assert.equal(inv.setQuantity(0, -1), false);
  assert.equal(inv.setQuantity(0, 1.5), false);
  assert.equal(inv.setQuantity(1, 3), false);                               // empty slot
  assert.equal(inv.setQuantity(0, 0), true);
  assert.equal(inv.getSlot(0), null);
});

test('stacks with different runtime properties never merge', () => {
  const inv = bag(4);
  inv.add('potion', 2, { blessed: true }); inv.add('potion', 2); inv.add('potion', 2, { blessed: true });
  assert.deepEqual(contents(inv), ['potionx4', 'potionx2', '-', '-']);
  assert.deepEqual(inv.getSlot(0).props, { blessed: true });
  const copy = inv.getSlot(0); copy.props.blessed = false; copy.quantity = 99;   // reads are copies: state is untouched
  assert.deepEqual(inv.getSlot(0), { itemId: 'potion', quantity: 4, props: { blessed: true } });
});

test('events: change / itemadded / itemremoved fire with the right details', () => {
  const inv = bag(); const log = [];
  for (const t of ['change', 'itemadded', 'itemremoved']) inv.addEventListener(t, e => log.push([t, e.detail]));
  inv.add('ore', 4); inv.remove('ore', 1); inv.clear();
  assert.deepEqual(log.map(([t]) => t), ['itemadded', 'change', 'itemremoved', 'change', 'change']);
  assert.deepEqual(log[0][1], { itemId: 'ore', quantity: 4, props: null });
  assert.deepEqual(log[1][1], { slots: [0, 1] });
});

test('save data round-trips, dropping unknown items and clamping oversized stacks', () => {
  const inv = bag(4);
  inv.add('potion', 13); inv.add('sword', 1);
  const copy = bag(4); copy.load(JSON.parse(JSON.stringify(inv)));
  assert.deepEqual(contents(copy), contents(inv));
  copy.load([{ itemId: 'ghost', quantity: 1 }, { itemId: 'ore', quantity: 99 }, null, { itemId: 'potion', quantity: -2 }]);
  assert.deepEqual(contents(copy), ['-', 'orex3', '-', '-']);
});

test('registry: defaults, and invalid or duplicate definitions are skipped with a warning', () => {
  const warnings = [];
  const r = createItemRegistry([
    { id: 'a', name: 'A', category: 'material' },
    { id: 'a', name: 'A again', category: 'material' },
    { id: 'b', name: 'B', category: 'nonsense' },
    { id: 'c', name: 'C', category: 'consumable', use: [{ effect: 'teleport' }] },
    { id: 'd', name: 'D', category: 'quest', maxStack: 5, stackable: false },
    { name: 'no id', category: 'misc' },
    { id: 'e', name: 'E', category: 'equipment' },
  ], { defaultStackSize: 20, warn: m => warnings.push(m) });
  assert.deepEqual(r.ids(), ['a', 'e']);
  assert.equal(warnings.length, 5);
  assert.equal(r.get('a').name, 'A');                                       // first definition wins
  assert.equal(r.get('a').maxStack, 20);
  assert.equal(r.get('e').stackable, false);
  assert.equal(r.get('e').maxStack, 1);
  assert.equal(r.get('missing'), null);
  assert.throws(() => { r.get('a').name = 'changed'; });                    // definitions are read-only
});

test('item actions are chosen by category (or a definition override), never by name', () => {
  assert.equal(actionFor(registry.get('potion')), 'use');
  assert.equal(actionFor(registry.get('ore')), null);
  assert.equal(actionFor(registry.get('sword')), 'equip');
  assert.equal(actionFor(registry.get('map')), 'inspect');
  assert.equal(actionFor(null), null);
});

test('the shipped catalogue is valid, and every planet forage / boss trophy refers to a real item', () => {
  const warnings = []; const r = createItemRegistry(ITEM_DEFINITIONS, { warn: m => warnings.push(m) });
  assert.deepEqual(warnings, []);
  assert.equal(r.size, ITEM_DEFINITIONS.length);
  for (const d of itemRegistry.all()) {
    assert.ok(d.icon.src || ITEM_ICON_SHAPES.includes(d.icon.shape), `${d.id}: unknown icon shape`);
    assert.ok(d.rarity in RARITIES);
    for (const e of d.use) assert.ok(e.effect in ITEM_EFFECTS);
    if (d.category === 'consumable') assert.equal(actionFor(d), 'use', `${d.id}: a consumable should be usable`);
  }
  for (const p of PLANETS) {
    for (const f of p.forage) assert.ok(itemRegistry.has(f.item) && f.count > 0, `${p.name}: forage ${f.item}`);
    assert.ok(itemRegistry.has(p.boss.trophy), `${p.name}: boss trophy ${p.boss.trophy}`);
  }
});
