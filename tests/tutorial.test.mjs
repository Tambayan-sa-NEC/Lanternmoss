import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanState, sanitizeSave } from '../src/core/save.js';
import { TUTORIAL_STEPS, HELP_TOPICS, GATHERING_TIPS } from '../src/config/tutorial.js';
import { KEYBINDS } from '../src/config/controls.js';
import { readFileSync } from 'node:fs';

test('tutorial copy has unique stable IDs and only supported dynamic placeholders', () => {
  for (const data of [TUTORIAL_STEPS, HELP_TOPICS]) assert.equal(new Set(data.map(s => s.id)).size, data.length);
  const tokens = new Set([...KEYBINDS.map(b => b.id), 'attackName', 'evasionName', 'evasionKey', 'ultimateName']);
  for (const topic of [...TUTORIAL_STEPS, ...HELP_TOPICS]) {
    for (const [, token] of topic.text.matchAll(/\{(\w+)\}/g)) assert.ok(tokens.has(token), token);
  }
  assert.deepEqual(HELP_TOPICS.map(t => t.id), ['energy', 'tools', 'stations', 'smelting', 'fishing', 'farming', 'pets']);
  assert.equal(TUTORIAL_STEPS.filter(s => s.acknowledge).length, 1);
});

test('tutorial saves discard unknown progress and clamp untrusted recap data', () => {
  const clean = cleanState('tutorial', { status: 'bad', done: ['move', 'move', '<script>'], seen: ['wood', 'tools', 'nope'],
    moved: Infinity, lifeStartedAt: -5, remaining: 100, recap: { source: 'x'.repeat(1000), amount: -5, duration: NaN } });
  assert.equal(clean.status, 'skipped'); assert.deepEqual(clean.done, ['move']); assert.deepEqual(clean.seen, ['wood', 'tools']);
  assert.equal(clean.moved, 0); assert.equal(clean.lifeStartedAt, 0); assert.equal(clean.remaining, 2.5);
  assert.equal(clean.recap.source.length, 120); assert.equal(clean.recap.amount, 0); assert.equal(clean.recap.duration, 0);
  assert.deepEqual(cleanState('tutorial', clean), clean);
});

test('version 1 remains compatible with optional tutorial state and active fainting snapshots', () => {
  const raw = JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8'));
  const old = sanitizeSave(raw);
  assert.equal(old.version, 1); assert.equal(old.systems.tutorial.status, 'skipped');
  assert.deepEqual(old.systems.player, raw.systems.player); assert.deepEqual(old.planets, raw.planets);
  raw.systems.tutorial = { status: 'active', done: ['move', 'camera'], seen: Object.keys(GATHERING_TIPS),
    lifeStartedAt: 4, moved: 3, remaining: 1.2, recap: { source: 'Gloomcap', amount: 100, duration: 123 } };
  assert.deepEqual(sanitizeSave(raw).systems.tutorial, raw.systems.tutorial);
});
