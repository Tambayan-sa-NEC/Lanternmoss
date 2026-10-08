// Keybinds: the default layout (config/controls.js) must have no clashes, keep skills on letter keys and leave the
// number row to the hotbar; remapping (src/core/keybinds.js) must swap instead of leaving anything unbound.
// Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../src/config/characters.js';
import { FIXED_CONTROLS, HOTBAR_KEYS, KEYBINDS, RESERVED_KEYS, keyLabel } from '../src/config/controls.js';
import { bindable, sanitizeBinds, withRebind } from '../src/core/keybinds.js';

const defaults = () => sanitizeBinds(null);

test('the default keys: unique ids, no key used twice, nothing on the hotbar keys or Esc', () => {
  assert.equal(new Set(KEYBINDS.map(b => b.id)).size, KEYBINDS.length);
  const all = KEYBINDS.flatMap(b => b.keys);
  assert.equal(new Set(all).size, all.length, 'a key is bound to two actions');
  for (const k of all) assert.ok(bindable(k), `${k} can't be bound`);
  for (const k of RESERVED_KEYS) assert.ok(!all.includes(k), `${k} is reserved`);
  assert.equal(HOTBAR_KEYS.length, 9);
  assert.deepEqual(defaults(), Object.fromEntries(KEYBINDS.map(b => [b.id, b.keys])), 'the defaults survive sanitizing unchanged');
});

test('skills are on letter keys only, the same five slots for every hero, the ultimate last', () => {
  for (let n = 1; n <= 5; n++) {
    const b = KEYBINDS.find(x => x.id === `skill${n}`); assert.ok(b, `skill${n}`);
    for (const k of b.keys) assert.match(k, /^Key[A-Z]$/, `skill${n} on ${k}`);
  }
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const list = Object.values(c.abilities);
    assert.deepEqual(list.map(s => s.slot), [1, 2, 3, 4, 5], `${id}: five skills in slot order`);
    assert.ok(list[4].ult && list[0].mouse, `${id}: basic attack first (on click too), ultimate fifth`);
    for (const s of list) assert.ok(!s.keys.some(k => /^Digit/.test(k)), `${id}: ${s.name} on a number key`);
  }
});

test('sanitizeBinds: drops junk and reserved keys, keeps the first owner of a shared key, never leaves an action empty', () => {
  const b = sanitizeBinds({ skill2: ['KeyY'], skill3: ['KeyY', 'Digit3'], jump: ['Escape'], bogus: ['KeyK'], interact: 'KeyE', bag: [] });
  assert.deepEqual(b.skill2, ['KeyY']);
  assert.deepEqual(b.skill3, ['KeyR'], 'KeyY is taken, Digit3 is the hotbar: back to its default');
  assert.deepEqual(b.jump, ['Space']); assert.deepEqual(b.interact, ['KeyE']); assert.deepEqual(b.bag, ['KeyI', 'Tab']);
  assert.ok(!('bogus' in b));
  for (const v of Object.values(sanitizeBinds('junk'))) assert.ok(v.length);
});

test('withRebind: a free key just moves; a taken key swaps; reserved keys are refused', () => {
  let r = withRebind(defaults(), 'skill2', 'KeyY');
  assert.deepEqual(r.binds.skill2, ['KeyY']); assert.equal(r.swapped, null);
  r = withRebind(defaults(), 'skill2', 'KeyE');                       // E belongs to interact
  assert.deepEqual(r.binds.skill2, ['KeyE']); assert.equal(r.swapped, 'interact'); assert.deepEqual(r.binds.interact, ['KeyQ']);
  r = withRebind(defaults(), 'moveForward', 'KeyI');                 // I is the bag's main key; the bag keeps Tab and gains W
  assert.deepEqual(r.binds.moveForward, ['KeyI', 'ArrowUp']); assert.deepEqual(r.binds.bag, ['KeyW', 'Tab']);
  r = withRebind(defaults(), 'skill1', 'Digit1'); assert.deepEqual(r.binds.skill1, ['KeyZ'], 'the hotbar keys stay the hotbar\'s');
  r = withRebind(defaults(), 'skill1', 'Escape'); assert.deepEqual(r.binds.skill1, ['KeyZ']);
  const all = Object.values(withRebind(defaults(), 'jump', 'KeyZ').binds).flat();
  assert.equal(new Set(all).size, all.length, 'still no key bound twice');
});

test('key labels read like key caps; the Controls page rows are complete', () => {
  assert.equal(keyLabel('KeyQ'), 'Q'); assert.equal(keyLabel('Digit7'), '7'); assert.equal(keyLabel('ShiftLeft'), 'Shift');
  assert.equal(keyLabel('ArrowUp'), '↑'); assert.equal(keyLabel('Space'), 'Space'); assert.equal(keyLabel(undefined), '—');
  for (const g of FIXED_CONTROLS) for (const [k, what] of g.rows) assert.ok(k.length && what, `${g.group}: complete row`);
});
