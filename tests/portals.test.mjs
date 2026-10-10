import test from 'node:test';
import assert from 'node:assert/strict';
import { portalDestinations } from '../src/gameplay/portalRules.js';
import { cleanState, sanitizeSave } from '../src/core/save.js';
import { readFileSync } from 'node:fs';
import { rollChestLoot, rollLoot } from '../src/gameplay/loot.js';

const options = (current, defeated = [], stranded = null, keys = 0) => Object.fromEntries(
  portalDestinations(current, defeated, stranded, keys).map(d => [d.id, d]));
test('only Lantern chests roll rare travel keys; common, boss and mini boss loot do not', () => {
  const hasKey = loot => loot.items.some(i => i.item === 'wayfarerKey');
  assert.ok(hasKey(rollChestLoot('rare', 0, () => 0, 'witch')));
  assert.ok(!hasKey(rollChestLoot('rare', 0, () => 0.9, 'witch')));
  assert.ok(!hasKey(rollChestLoot('common', 0, () => 0, 'witch')));
  assert.ok(!hasKey(rollChestLoot('boss', 0, () => 0, 'witch')));
  assert.ok(!hasKey(rollLoot('rare', 0, () => 0, 'witch')));
});
test('boss wins open return travel and onward worlds; distant locked worlds cannot be skipped', () => {
  let d = options('lanternmoss');
  assert.equal(d.lanternmoss.enabled, false); assert.equal(d.emberfall.enabled, false); assert.equal(d.frostveil.enabled, false);
  d = options('lanternmoss', [], null, 2);
  assert.equal(d.emberfall.enabled, true); assert.equal(d.emberfall.cost, 1); assert.equal(d.frostveil.enabled, false);
  d = options('emberfall', ['lanternmoss']);
  assert.equal(d.lanternmoss.enabled, true); assert.equal(d.lanternmoss.cost, 0); assert.equal(d.frostveil.enabled, false);
  d = options('frostveil', ['lanternmoss', 'emberfall']);
  assert.equal(d.lanternmoss.cost, 0); assert.equal(d.emberfall.cost, 0);
});
test('an early gate home stays dark until another key or its boss is defeated', () => {
  const away = { at: 'emberfall', from: 'lanternmoss' };
  let d = options('emberfall', [], away);
  assert.equal(d.lanternmoss.enabled, false); assert.equal(d.lanternmoss.cost, 1);
  d = options('emberfall', [], away, 1);
  assert.equal(d.lanternmoss.enabled, true); assert.equal(d.lanternmoss.cost, 1);
  d = options('emberfall', ['emberfall'], away);
  assert.equal(d.lanternmoss.enabled, true); assert.equal(d.lanternmoss.cost, 0); assert.equal(d.frostveil.cost, 0);
});
test('portal saves reject foreign destinations/rewards, and compact deltas have stable IDs and finite timers', () => {
  assert.deepEqual(cleanState('portals', { stranded: { at: 'foreign', from: 'lanternmoss' }, rewarded: ['foreign', 'emberfall', 'emberfall'] }),
    { stranded: null, rewarded: ['emberfall'], fight: null });
  const nodes = cleanState('gathering', { delta: true, at: -50, nodes: [
    { id: 'lanternmoss:node:0', regrowT: 99 }, { id: 'foreign:node:0', regrowT: 20 }, { id: '__proto__', regrowT: Infinity }], rest: { 'tree:0': 9, bad: 4 } });
  assert.equal(nodes.at, 0); assert.deepEqual(nodes.nodes, [{ id: 'lanternmoss:node:0', regrowT: 99 }]);
  assert.deepEqual(nodes.rest, { 'tree:0': 9 });
  assert.deepEqual(cleanState('progression', { miniDefeated: ['emberfall:mini:0', 'foreign:mini:0', 'emberfall:mini:99'] }).miniDefeated, ['emberfall:mini:0']);
});
test('old v1 adventures gain default portal state without changing their independent planet snapshots', () => {
  const raw = JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8'));
  const save = sanitizeSave(raw);
  assert.deepEqual(save.systems.portals, { stranded: null, rewarded: [], fight: null });
  assert.deepEqual(save.planets, raw.planets);
  assert.ok(options(save.planetId, save.systems.progression.defeated).lanternmoss.enabled);
});
