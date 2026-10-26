import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT } from '../src/config/combat.js';
import { CHEST_KINDS, LOOT } from '../src/config/chests.js';
import { PLANET_CATALOG } from '../src/config/planets.js';
import { REMATCH, rematchReady, rematchTier } from '../src/config/rematch.js';
import { portalDestinations } from '../src/gameplay/portalRules.js';
import { cleanState, SAVE_SYSTEMS } from '../src/core/save.js';

// The rematch rules (TODO 31a) as authored data and pure functions: no browser, no scene, no world.

test('the ladder rises, tops out, and every tier is a real reward', () => {
  assert.ok(REMATCH.tiers.length >= 2, 'there is a ladder, not a single harder fight');
  let last = null;
  for (const t of REMATCH.tiers) {
    assert.ok(t.hp > 1 && t.damage > 1 && t.speed >= 1, 'every tier is harder than the campaign fight');
    assert.ok(t.coins > 1 && t.xp > 1, 'and worth more than the kill was');
    assert.ok(CHEST_KINDS[t.loot] || LOOT[t.loot], `${t.loot} is a real chest table`);
    if (last) assert.ok(t.hp > last.hp && t.damage >= last.damage, 'and harder than the one before');
    last = t;
  }
  assert.deepEqual(rematchTier(0), REMATCH.tiers[0], 'the first rematch is tier one');
  assert.deepEqual(rematchTier(1), REMATCH.tiers[1]);
  assert.deepEqual(rematchTier(999), REMATCH.tiers.at(-1), 'and the last tier repeats for ever');
  assert.deepEqual(rematchTier(-3), REMATCH.tiers[0], 'nonsense counts fall back to the first');
  assert.deepEqual(rematchTier(undefined), REMATCH.tiers[0]);
  assert.ok(REMATCH.cooldown > 0 && REMATCH.reach > 0);
});

test('only an encounter with a finished kit is ever offered', () => {
  assert.equal(rematchReady(undefined), false);
  assert.equal(rematchReady({}), false);
  assert.equal(rematchReady({ rematch: true }), false, 'a bare flag is not a kit');
  assert.equal(rematchReady({ rematch: null }), false);
  assert.equal(rematchReady({ rematch: { kit: 'moss' } }), true);
  // 31a is the infrastructure only: no world ships a kit until its own stage writes one (31b-31f).
  const ready = Object.entries(COMBAT.enemies).filter(([, def]) => rematchReady(def)).map(([type]) => type);
  assert.deepEqual(ready, [], 'nothing is exposed yet, so no half-finished fight can be reached');
});

test('the lantern gate marks a waiting rematch without changing who can travel', () => {
  const defeated = ['lanternmoss'];
  const plain = portalDestinations('lanternmoss', defeated, null, 0);
  const marked = portalDestinations('lanternmoss', defeated, null, 0, { rematch: new Set(['lanternmoss']) });
  assert.deepEqual(marked.map(d => d.enabled), plain.map(d => d.enabled), 'the marking changes no destination\'s reachability');
  assert.deepEqual(marked.map(d => d.cost), plain.map(d => d.cost));
  assert.equal(plain.every(d => d.rematch === false), true, 'nothing is marked without the set');
  const home = marked.find(d => d.id === 'lanternmoss');
  assert.equal(home.rematch, true);
  assert.match(home.reason, /rematch waits at the lair/);
  assert.ok(marked.filter(d => d.rematch).every(d => defeated.includes(d.id)), 'only a world the set names is marked');
  // an undiscovered secret world is never given away by a rematch marker
  const secret = PLANET_CATALOG.find(p => p.secret);
  const sneaky = portalDestinations('lanternmoss', defeated, null, 0, { rematch: new Set([secret.id]) });
  assert.ok(!sneaky.some(d => d.id === secret.id && d.rematch), 'a locked secret gate is never marked');
});

test('a rematch save keeps the ladder and nothing else', () => {
  assert.equal(SAVE_SYSTEMS.rematch, 'adventure', 'the ladder belongs to the adventure, not to one planet');
  assert.deepEqual(cleanState('rematch', null), { wins: {} }, 'an older save simply has none won');
  assert.deepEqual(cleanState('rematch', { wins: { gloomcap: 3 } }), { wins: { gloomcap: 3 } });
  assert.deepEqual(cleanState('rematch', { wins: { notAMonster: 4 } }), { wins: {} }, 'an unknown encounter is dropped');
  assert.deepEqual(cleanState('rematch', { wins: { gloomcap: -5 } }), { wins: { gloomcap: 0 } });
  assert.deepEqual(cleanState('rematch', { wins: { gloomcap: 'many' } }), { wins: { gloomcap: 0 } });
  const injected = cleanState('rematch', { wins: { gloomcap: 2 }, active: 'lanternmoss', cool: { lanternmoss: 99 } });
  assert.deepEqual(injected, { wins: { gloomcap: 2 } }, 'a fight in progress can never be injected through a save');
});
