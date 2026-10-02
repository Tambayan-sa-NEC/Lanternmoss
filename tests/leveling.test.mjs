// Leveling tests: the pure XP math in src/progression/leveling.js against a hand-checkable curve, plus sanity
// checks on the shipped tuning. Run with `npm test` (Node 18+, no dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT } from '../src/config/combat.js';
import { LEVELING } from '../src/config/leveling.js';
import { addXp, damageMultiplier, statsForLevel, xpToNext } from '../src/progression/leveling.js';

// a flat curve for exact arithmetic: 100, 200, 300, 400 XP for levels 1..4, cap at 5
const FLAT = { maxLevel: 5, xpBase: 100, xpExponent: 1, perLevel: { maxHp: 10, manaRegen: 0.5 }, damagePerLevel: 0.25 };

test('xpToNext follows the configured formula and is 0 at the cap', () => {
  assert.deepEqual([1, 2, 3, 4].map(l => xpToNext(l, FLAT)), [100, 200, 300, 400]);
  assert.equal(xpToNext(5, FLAT), 0);
  assert.equal(xpToNext(6, FLAT), 0);
});

test('shipped curve is sane: positive, increasing, cap > 1', () => {
  assert.ok(LEVELING.maxLevel > 1);
  for (let l = 1; l < LEVELING.maxLevel; l++) {
    assert.equal(xpToNext(l), Math.round(LEVELING.xpBase * l ** LEVELING.xpExponent));
    assert.ok(xpToNext(l) > 0);
    if (l > 1) assert.ok(xpToNext(l) >= xpToNext(l - 1), `curve drops at level ${l}`);
  }
  assert.equal(xpToNext(LEVELING.maxLevel), 0);
});

test('every enemy type defines a non-negative xp reward', () => {
  for (const [type, def] of Object.entries(COMBAT.enemies)) assert.ok(Number.isFinite(def.xp) && def.xp >= 0, `${type} has no valid xp`);
});

test('gaining less than the threshold just accumulates', () => {
  assert.deepEqual(addXp(1, 0, 60, FLAT), { level: 1, xp: 60, gained: 60 });
  assert.deepEqual(addXp(1, 60, 39, FLAT), { level: 1, xp: 99, gained: 39 });
});

test('hitting the threshold exactly levels up with 0 left over', () => {
  assert.deepEqual(addXp(1, 40, 60, FLAT), { level: 2, xp: 0, gained: 60 });
});

test('surplus XP carries over into the next level', () => {
  assert.deepEqual(addXp(1, 90, 35, FLAT), { level: 2, xp: 25, gained: 35 });
});

test('one big kill can grant several levels at once', () => {
  // 1 -> 2 costs 100, 2 -> 3 costs 200, 3 -> 4 costs 300: 650 = 600 + 50 surplus
  assert.deepEqual(addXp(1, 0, 650, FLAT), { level: 4, xp: 50, gained: 650 });
});

test('the level cap stops levelling and drops surplus XP', () => {
  // from level 4 with 350/400, +500 reaches the cap after 50; the other 450 is discarded
  assert.deepEqual(addXp(4, 350, 500, FLAT), { level: 5, xp: 0, gained: 50 });
  // a huge gain from level 1 lands on the cap, never past it
  assert.deepEqual(addXp(1, 0, 1e9, FLAT), { level: 5, xp: 0, gained: 1000 });
});

test('XP gained at the cap is ignored', () => {
  assert.deepEqual(addXp(5, 0, 120, FLAT), { level: 5, xp: 0, gained: 0 });
});

test('zero, negative, fractional and non-numeric amounts are handled', () => {
  for (const bad of [0, -50, 0.9, NaN, undefined, null, Infinity, 'lots'])
    assert.deepEqual(addXp(2, 30, bad, FLAT), { level: 2, xp: 30, gained: 0 }, `amount ${String(bad)}`);
  assert.deepEqual(addXp(2, 30, 12.7, FLAT), { level: 2, xp: 42, gained: 12 });   // fractions round down
});

test('statsForLevel grows listed stats per level without touching the base table', () => {
  const base = Object.freeze({ maxHp: 100, maxMana: 100, manaRegen: 11, armor: 0.2 });
  assert.deepEqual(statsForLevel(base, 1, FLAT), base);
  assert.notEqual(statsForLevel(base, 1, FLAT), base);
  assert.deepEqual(statsForLevel(base, 4, FLAT), { maxHp: 130, maxMana: 100, manaRegen: 12.5, armor: 0.2 });
});

test('damageMultiplier is 1 at level 1 and grows linearly per level', () => {
  assert.equal(damageMultiplier(1, FLAT), 1);
  assert.equal(damageMultiplier(3, FLAT), 1.5);
  assert.equal(damageMultiplier(5, FLAT), 2);
});

test('shipped damage scaling never shrinks damage and grows with level', () => {
  assert.equal(damageMultiplier(1), 1);
  for (let l = 2; l <= LEVELING.maxLevel; l++) assert.ok(damageMultiplier(l) >= damageMultiplier(l - 1), `damage drops at level ${l}`);
});
