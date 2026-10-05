// Character-select data: every hero has a complete profile for the selection screen. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../src/config/characters.js';

test('every hero has a selection profile: role, difficulty 1-3, ratings 1-5, companion text, voice', () => {
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const p = c.profile;
    assert.ok(p && p.role && p.companionText, `${id}: role + companion text`);
    assert.ok([1, 2, 3].includes(p.difficulty), `${id}: difficulty`);
    for (const k of ['damage', 'toughness', 'range', 'mobility']) assert.ok(Number.isInteger(p.ratings[k]) && p.ratings[k] >= 1 && p.ratings[k] <= 5, `${id}: rating ${k}`);
    assert.ok(p.voice.pitch > 100 && p.voice.slide > 0, `${id}: voice`);
  }
});

test('heroes are distinct at a glance: no two share a role or the same set of ratings', () => {
  const list = Object.values(CHARACTERS).map(c => c.profile);
  assert.equal(new Set(list.map(p => p.role)).size, list.length);
  assert.equal(new Set(list.map(p => JSON.stringify(p.ratings))).size, list.length);
});

test('the ratings agree with the real stats: the toughest hero has the most health', () => {
  const heroes = Object.values(CHARACTERS), toughest = heroes.reduce((a, b) => (b.profile.ratings.toughness > a.profile.ratings.toughness ? b : a));
  assert.equal(toughest.stats.maxHp, Math.max(...heroes.map(c => c.stats.maxHp)));
});
