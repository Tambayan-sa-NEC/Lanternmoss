import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameStats } from '../src/core/performance.js';
import { densityFor, QUALITY_DENSITY } from '../src/config/settings.js';
import { defaultSettings } from '../src/core/settings.js';

test('frame statistics measure real slow cadence, bounded window and peak whole-frame counts', () => {
  const stats = new FrameStats(2), counters = { calls: 70, triangles: 1200, points: 100, lines: 20 };
  stats.record(0, 10, counters); assert.equal(stats.snapshot(), null);
  stats.record(50, 12, counters); stats.record(100, 14, { ...counters, calls: 80 });
  assert.equal(stats.snapshot().fps, 20); assert.equal(stats.snapshot().frameMs, 50);
  assert.equal(stats.snapshot().calls, 80); assert.equal(stats.snapshot().renderMs, 13);
  stats.record(200, 16, counters); assert.equal(stats.frames.length, 2);
  assert.equal(stats.snapshot().p95FrameMs, 100);
  stats.record(2200, 10, counters); assert.equal(stats.snapshot(), null);
  stats.reset(); stats.record(5000, 10, counters); assert.equal(stats.snapshot(), null);
});

test('every density preset reduces features and sliders multiply safely', () => {
  const settings = defaultSettings();
  for (const feature of Object.keys(QUALITY_DENSITY.high)) {
    assert.equal(densityFor(feature, settings), 1);
    const medium = densityFor(feature, { ...settings, quality: 'medium' });
    const low = densityFor(feature, { ...settings, quality: 'low' });
    assert.ok(low > 0 && low < medium && medium < 1);
    assert.equal(densityFor(feature, { ...settings, [`${feature}Density`]: 50 }), 0.5);
    assert.equal(densityFor(feature, { ...settings, [`${feature}Density`]: -1 }), 0);
    assert.equal(densityFor(feature, { ...settings, [`${feature}Density`]: 500 }), 1);
    assert.equal(densityFor(feature, { ...settings, quality: 'corrupt', [`${feature}Density`]: NaN }), 1);
  }
});
