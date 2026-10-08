// Player settings: the schema is consistent, and anything loaded from storage is coerced into a valid settings object
// (src/core/settings.js sanitizeSettings). Also checks the Controls page's key table. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_CONTROLS } from '../src/config/controls.js';
import { QUALITY_PIXEL_RATIO, SETTINGS_SCHEMA } from '../src/config/settings.js';
import { defaultSettings, sanitizeSettings, SETTING_DEFS } from '../src/core/settings.js';

const ITEMS = SETTINGS_SCHEMA.flatMap(g => g.items);

test('setting keys are unique and every default is valid for its own definition', () => {
  assert.equal(new Set(ITEMS.map(i => i.key)).size, ITEMS.length);
  for (const d of ITEMS) {
    assert.ok(d.label, `${d.key}: label`);
    if (d.type === 'range') {
      assert.ok(d.min < d.max && d.step > 0, `${d.key}: range`);
      assert.ok(d.default >= d.min && d.default <= d.max, `${d.key}: default inside the range`);
      assert.ok(Math.abs(Math.round((d.default - d.min) / d.step) * d.step + d.min - d.default) < 1e-9, `${d.key}: default on a step`);
    } else if (d.type === 'toggle') assert.equal(typeof d.default, 'boolean', `${d.key}: boolean default`);
    else if (d.type === 'choice') assert.ok(d.options.some(([v]) => v === d.default), `${d.key}: default is an option`);
    else assert.fail(`${d.key}: unknown type ${d.type}`);
  }
  for (const [v] of SETTING_DEFS.quality.options) assert.ok(QUALITY_PIXEL_RATIO[v] > 0, `quality ${v} has a pixel ratio`);
});

test('sanitizeSettings fills defaults from nothing or junk', () => {
  const def = defaultSettings();
  assert.deepEqual(sanitizeSettings(null), def);
  assert.deepEqual(sanitizeSettings('nope'), def);
  assert.deepEqual(sanitizeSettings({}), def);
  assert.equal(Object.keys(def).length, ITEMS.length);
});

test('sanitizeSettings clamps and snaps ranges, rejects bad toggles and choices, drops unknown keys', () => {
  const s = sanitizeSettings({ masterVolume: 250, musicVolume: -5, sfxVolume: 42, invertY: 'yes', quality: 'ultra',
    bloom: false, cameraDistance: '7.3', compass: 1, hacker: true });
  assert.equal(s.masterVolume, 100);
  assert.equal(s.musicVolume, 0);
  assert.equal(s.sfxVolume, 40);                       // step 5
  assert.equal(s.invertY, false);                      // not a boolean -> default
  assert.equal(s.quality, SETTING_DEFS.quality.default);
  assert.equal(s.bloom, false);                        // a valid value is kept
  assert.equal(s.cameraDistance, 7.5);                 // numeric strings are accepted, snapped to 0.5
  assert.equal(s.compass, SETTING_DEFS.compass.default);
  assert.ok(!('hacker' in s));
});

test('the Controls page lists keys and a description for every row', () => {
  for (const g of FIXED_CONTROLS) for (const [keys, what] of g.rows) assert.ok(keys.length && what, `${g.group}: complete row`);
});
