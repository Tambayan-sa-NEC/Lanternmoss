import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANET_CATALOG } from '../src/config/planets.js';
import { contentProblems } from '../src/config/contentGate.js';
test('Tidewhisper candidate has complete runtime content but cannot pass without real performance evidence', async () => {
  await import('./sim/lib/setup.mjs');
  const { contentRegistry } = await import('./sim/lib/contentRegistry.mjs');
  const tide = PLANET_CATALOG.find(p => p.id === 'tidewhisper'), r = contentRegistry();
  const absent = contentProblems(tide, PLANET_CATALOG, r);
  assert.equal(absent.length, 4);
  assert.ok(absent.every(problem => /performance/.test(problem)), absent.join('\n'));
  // Synthetic data tests content completeness only. It is never written as a release report.
  r.releases.tidewhisper = { device: 'Intel Iris Xe', quality: 'low', viewport: [1280,720],
    rows: ['village','night','weather'].map(scene => ({ scene, samples: 90, p95FrameMs: 10, calls: 450, triangles: 190000 })) };
  assert.deepEqual(contentProblems(tide, PLANET_CATALOG, r), []);
  assert.equal(tide.released, false, 'readiness tests must not enable the destination');
});
