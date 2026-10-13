import test from 'node:test';
import assert from 'node:assert/strict';
test('every released world passes the content gate against actual runtime registrations',async()=>{
  await import('./sim/lib/setup.mjs');
  const { Game }=await import('../src/core/Game.js'), game=new Game();game.init();
  try {
    const { contentRegistry }=await import('./sim/lib/contentRegistry.mjs');
    const { PLANET_CATALOG }=await import('../src/config/planets.js');
    const { assertReleasedContent }=await import('../src/config/contentGate.js');
    assert.doesNotThrow(()=>assertReleasedContent(PLANET_CATALOG,contentRegistry()));
  } finally { game.world.dispose(); }
});
