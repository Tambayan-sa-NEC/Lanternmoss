import test from 'node:test';
import assert from 'node:assert/strict';
import { SETS } from '../src/config/sets.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { nextBurn, setCounts, setEffects, setOf, setSummary } from '../src/items/sets.js';
import { drainRate } from '../src/gameplay/needsRules.js';
import { NEEDS } from '../src/config/survival.js';

const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message ?? ''} ${a} vs ${b}`);
const wear = (...ids) => ids.map(id => ({ def: itemRegistry.get(id), props: null }));

test('every set piece is real any-hero gear, in one set only, and the tiers rise', () => {
  const seen = new Set();
  for (const [id, s] of Object.entries(SETS)) {
    assert.ok(s.pieces.length >= 3, `${id}: at least three pieces`);
    for (const p of s.pieces) {
      const def = itemRegistry.get(p);
      assert.ok(def?.equip && !def.equip.vanity && !def.equip.hero, `${id}: ${p} is wearable by every hero`);
      assert.ok(!seen.has(p), `${p} is in two sets`); seen.add(p); assert.equal(setOf(p), id);
    }
    const ats = s.bonuses.map(b => b.at);
    assert.deepEqual(ats, [2, 3], `${id}: two- and three-piece bonuses`);
  }
  assert.equal(setOf('glowStaff'), null);
});

test('only distinct pieces count, and a weapon or a stranger piece adds nothing', () => {
  assert.deepEqual(setCounts(wear('mossHood', 'mossCloak'), 'witch'), { moss: 2 });
  assert.deepEqual(setCounts(wear('mossHood', 'mossHood'), 'witch'), { moss: 1 }, 'the same piece twice counts once');
  assert.deepEqual(setCounts(wear('glowStaff', 'emberRing'), 'witch'), {});
  assert.deepEqual(setCounts([...wear('emberHelm'), { def: null }], 'knight'), { ember: 1 });
});

test('bonuses switch on at two and three pieces; the higher tier replaces the lower', () => {
  assert.equal(setEffects(wear('mossHood'), 'witch').healing, 0);
  assert.equal(setEffects(wear('mossHood', 'wanderBoots'), 'witch').healing, 0.15);
  assert.equal(setEffects(wear('mossHood', 'wanderBoots', 'mossCloak'), 'witch').healing, 0.3);
  assert.deepEqual(setEffects(wear('emberHelm', 'emberMail'), 'knight').burn, { share: 0.4, time: 3 });
  assert.deepEqual(setEffects(wear('emberHelm', 'emberMail', 'emberBoots'), 'knight').burn, { share: 0.7, time: 3 });
  assert.deepEqual(setEffects(wear('frostCirclet', 'frostMantle', 'snowstepBoots'), 'ranger').chill, { slow: 0.35, time: 2 });
  const tide = setEffects(wear('tideCirclet', 'tideMantle', 'tideBoots', 'tidePendant'), 'witch');
  assert.equal(tide.swimEnergy, 0.5); assert.equal(tide.knock, 2.5);
  assert.equal(setEffects(wear('tideCirclet', 'tideMantle'), 'witch').knock, 0);
});

test('two sets at once: both bonuses apply (a mixed loadout)', () => {
  const fx = setEffects(wear('mossHood', 'mossCloak', 'emberBoots', 'emberHelm'), 'knight');
  assert.equal(fx.healing, 0.15); assert.deepEqual(fx.burn, { share: 0.4, time: 3 }); assert.equal(fx.chill, undefined);
  const summary = setSummary(wear('mossHood', 'mossCloak', 'emberBoots'), 'knight');
  assert.deepEqual(summary.map(s => [s.id, s.count, s.bonuses.map(b => b.active)]), [['moss', 2, [true, false]], ['ember', 1, [false, false]]]);
});

test('a burn deals its share over its time, refreshes, and keeps the stronger one', () => {
  const b = nextBurn(null, 30, { share: 0.4, time: 3 });
  assert.equal(b.t, 3); near(b.dps * b.t, 12);
  const weaker = nextBurn({ dps: 4, t: 1 }, 6, { share: 0.4, time: 3 });
  assert.deepEqual(weaker, { dps: 4, t: 3 }, 'a weak hit refreshes the timer but keeps the stronger burn');
  near(nextBurn({ dps: 4, t: 0 }, 6, { share: 0.4, time: 3 }).dps, 0.8, 'an expired burn does not linger');
});

test('the Tide set halves only the swimming part of the energy drain', () => {
  const swim = drainRate({ swimming: true }), cut = drainRate({ swimming: true, swimCut: 0.5 });
  near(swim - cut, NEEDS.swim * 0.5);
  assert.equal(drainRate({ sprinting: true, swimCut: 0.5 }), drainRate({ sprinting: true }));
});
