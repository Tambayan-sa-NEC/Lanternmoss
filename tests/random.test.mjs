// Random stream tests: the play stream (src/utils/random.js) can be seeded so the headless sims replay exactly, and no
// game code goes around it with Math.random. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mpick, mr, rng, seedPlay } from '../src/utils/random.js';

const draw = n => Array.from({ length: n }, () => rng());

test('a seeded play stream repeats exactly, and another seed differs', () => {
  seedPlay(42); const a = draw(20);
  seedPlay(42); const b = draw(20);
  seedPlay(43); const c = draw(20);
  seedPlay(null);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.every(x => x >= 0 && x < 1));
});

test('mr and mpick draw from the play stream', () => {
  seedPlay(7); const a = [mr(2, 5), mpick(['x', 'y', 'z']), mr(-1, 1)];
  seedPlay(7); const b = [mr(2, 5), mpick(['x', 'y', 'z']), mr(-1, 1)];
  seedPlay(null);
  assert.deepEqual(a, b);
  assert.ok(a[0] >= 2 && a[0] < 5);
});

test('unseeded, the play stream is the browser\'s own randomness', () => {
  seedPlay(null);
  const real = Math.random; let calls = 0;
  Math.random = () => { calls++; return 0.5; };
  try { assert.equal(rng(), 0.5); } finally { Math.random = real; }
  assert.equal(calls, 1);
});

test('no game code calls Math.random directly (use rng / mr / mpick from utils/random.js)', () => {
  const src = fileURLToPath(new URL('../src/', import.meta.url));
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  const offenders = walk(src)
    .filter(f => !f.endsWith(join('utils', 'random.js')))
    .flatMap(f => readFileSync(f, 'utf8').split('\n').map((l, i) => (/Math\.random\b/.test(l) ? `${relative(src, f)}:${i + 1}` : null)).filter(Boolean));
  assert.deepEqual(offenders, []);
});
