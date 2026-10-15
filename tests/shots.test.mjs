import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOT_FOLDERS, shotLink } from '../scripts/shots.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), shots = join(root, 'docs/screenshots');

test('every screenshot sits in the folder scripts/shots.mjs gives it, and every listed shot exists', () => {
  const names = Object.values(SHOT_FOLDERS).flat();
  assert.equal(new Set(names).size, names.length, 'a shot is listed in two folders');
  const loose = readdirSync(shots).filter(f => f.endsWith('.jpg'));
  assert.deepEqual(loose, [], 'screenshots left at the top of docs/screenshots/');
  const found = readdirSync(shots, { withFileTypes: true }).filter(d => d.isDirectory())
    .flatMap(d => readdirSync(join(shots, d.name)).filter(f => f.endsWith('.jpg')).map(f => `${d.name}/${f}`));
  assert.deepEqual(found.sort(), names.map(n => shotLink(n).slice('docs/screenshots/'.length)).sort());
  assert.throws(() => shotLink('not-a-shot'), /no folder/);
});

test('README and docs link only screenshots that exist', () => {
  const docs = ['README.md', ...readdirSync(join(root, 'docs')).filter(f => f.endsWith('.md')).map(f => `docs/${f}`)];
  for (const doc of docs) {
    for (const [, path] of readFileSync(join(root, doc), 'utf8').matchAll(/(?:src="|\]\()((?:docs\/)?screenshots\/[^")]+\.jpg)/g)) {
      assert.ok(existsSync(join(root, dirname(doc), path)), `${doc} links a missing ${path}`);
    }
  }
});
