import test from 'node:test';
import assert from 'node:assert/strict';
import { PHOTO, cycleIndex, photoFileName } from '../src/config/photo.js';
import { DEFAULT_BINDS, sanitizeBinds } from '../src/core/keybinds.js';

test('photo file names carry the planet and local time, and are safe file names', () => {
  const at = new Date(2026, 9, 15, 13, 5, 9);
  assert.equal(photoFileName('tidewhisper', at), 'lanternmoss-tidewhisper-20261015-130509.png');
  assert.equal(photoFileName('../evil name?', at), 'lanternmoss-evilname-20261015-130509.png');
  assert.equal(photoFileName(undefined, at), 'lanternmoss-planet-20261015-130509.png');
  assert.equal(photoFileName('', at), 'lanternmoss-planet-20261015-130509.png');
});

test('photo options cycle both ways and start with none', () => {
  assert.equal(cycleIndex(0, 4), 1); assert.equal(cycleIndex(3, 4), 0); assert.equal(cycleIndex(0, 4, -1), 3);
  for (const list of [PHOTO.filters, PHOTO.frames, PHOTO.poses]) {
    assert.equal(list[0].id, 'none'); assert.equal(new Set(list.map(o => o.id)).size, list.length);
  }
  assert.ok(PHOTO.filters.length === 4 && PHOTO.frames.length === 3 && PHOTO.poses.length >= 3 && PHOTO.emotes.length === 3);
});

test('photo camera limits stay around the hero, above the ground and level enough to read', () => {
  const c = PHOTO.camera;
  assert.ok(c.minDist > 1 && c.minDist < c.maxDist && c.maxDist <= 15);
  assert.ok(c.minPitch > -0.5 && c.maxPitch < Math.PI / 2 && c.maxRoll > 0 && c.maxRoll < 1);
});

test('photo mode has its own default key that does not clash', () => {
  assert.deepEqual(DEFAULT_BINDS.photoMode, ['KeyK']);
  const users = Object.entries(sanitizeBinds(null)).filter(([, codes]) => codes.includes('KeyK')).map(([id]) => id);
  assert.deepEqual(users, ['photoMode']);
});
