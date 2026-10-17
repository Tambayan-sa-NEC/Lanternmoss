import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANET_CATALOG } from '../src/config/planets.js';
import { contentProblems } from '../src/config/contentGate.js';
import tidewhisper from '../src/config/planets/tidewhisper.js';
import { installTidewhisperCandidate } from './sim/lib/tidewhisperCandidate.mjs';
import { PERFORMANCE_REFERENCE } from '../src/config/render.js';

test('candidate substitutes a test catalog entry without changing the authored release flag and restores its identity', () => {
  const original = PLANET_CATALOG.find(p => p.id === 'tidewhisper');
  const released = tidewhisper.released;
  const fixture = installTidewhisperCandidate();
  try {
    assert.equal(tidewhisper.released, released, 'the fixture must preserve the authored release flag');
    assert.notEqual(PLANET_CATALOG.find(p => p.id === 'tidewhisper'), original);
    assert.equal(PLANET_CATALOG.find(p => p.id === 'tidewhisper').id, tidewhisper.id);
  } finally { fixture.restore(); }
  assert.equal(PLANET_CATALOG.find(p => p.id === 'tidewhisper'), original);
  assert.equal(tidewhisper.released, released);
});
test('Tidewhisper candidate has complete runtime content but cannot pass without real performance evidence', async () => {
  await import('./sim/lib/setup.mjs');
  const { contentRegistry } = await import('./sim/lib/contentRegistry.mjs');
  const tide = PLANET_CATALOG.find(p => p.id === 'tidewhisper'), r = contentRegistry();
  const released = tide.released; delete r.releases.tidewhisper;
  const absent = contentProblems(tide, PLANET_CATALOG, r);
  assert.ok(absent.length > 0);
  assert.ok(absent.every(problem => /performance/.test(problem)), absent.join('\n'));
  // Synthetic data tests content completeness only. It is never written as a release report.
  r.releases.tidewhisper = { device: PERFORMANCE_REFERENCE.renderer, quality: 'high', viewport: [1920,1080],
    dirty:false,gpuTiming:false,browser:{headless:false},candidateCommit:'a'.repeat(40),
    rows: PERFORMANCE_REFERENCE.heroes.flatMap(hero => PERFORMANCE_REFERENCE.seeds.flatMap(seed => PERFORMANCE_REFERENCE.scenes.map(scene =>
      ({ hero,seed,scene,gpu:PERFORMANCE_REFERENCE.renderer,quality:'high',drawingBuffer:[1920,1080],samples:90,p95FrameMs:10,calls:450,triangles:190000 })))) };
  assert.deepEqual(contentProblems(tide, PLANET_CATALOG, r), []);
  assert.equal(tide.released, released, 'readiness tests must not change the authored release state');
});
