import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT } from '../src/config/combat.js';
import { CHEST_KINDS, LOOT } from '../src/config/chests.js';
import { PLANET_CATALOG } from '../src/config/planets.js';
import { REMATCH, rematchReady, rematchTier } from '../src/config/rematch.js';
import { portalDestinations } from '../src/gameplay/portalRules.js';
import { cleanState, SAVE_SYSTEMS } from '../src/core/save.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';

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
  // The kits land world by world (31b-31f). Only the ones written so far are exposed.
  const ready = Object.entries(COMBAT.enemies).filter(([, def]) => rematchReady(def)).map(([type]) => type).sort();
  assert.deepEqual(ready, ['basilisk', 'gloomcap', 'hydra', 'ironclaw', 'malgrath', 'mirelure', 'pyrrhax'],
    'the Moss (31b), Ember (31c), Frost (31d) and Tide (31e) encounters have kits so far');
});

// The kits as authored data. That each named move is implemented is checked where a scene exists, in the
// simulation (tests/sim/rematch.sim.mjs), because a behaviour module cannot load without a browser.
test('every rematch kit is a complete, playable fight', () => {
  for (const [type, def] of Object.entries(COMBAT.enemies).filter(([, d]) => rematchReady(d))) {
    const kit = def.rematch;
    assert.ok(Array.isArray(kit.phases) && kit.phases.length, `${type}: a rematch has its own phases`);
    assert.equal(kit.phases[0].below, 1, `${type}: the first phase starts at full health`);
    let last = 1;
    for (const p of kit.phases) { assert.ok(p.below <= last, `${type}: thresholds descend`); last = p.below; }
    const all = { ...def.attacks, ...(kit.attacks ?? {}) };
    const named = new Set(kit.phases.flatMap(p => p.attacks));
    for (const id of named) {
      assert.ok(all[id], `${type}: phase move ${id} has numbers`);
      assert.ok(all[id].windup > 0, `${type}: ${id} is telegraphed, not instant`);
      assert.ok(all[id].recover > 0 && all[id].cooldown > 0, `${type}: ${id} leaves a window`);
    }
    // the new moves are genuinely new, and genuinely used
    for (const id of Object.keys(kit.attacks ?? {})) {
      assert.ok(!def.attacks[id], `${type}: ${id} is a new attack, not a renamed old one`);
      assert.ok(named.has(id), `${type}: ${id} is actually reachable in a rematch phase`);
      assert.ok(!def.phases.some(p => p.attacks.includes(id)), `${type}: ${id} never appears in the campaign fight`);
    }
    assert.ok(kit.phases.some(p => Object.keys(kit.attacks ?? {}).some(id => p.attacks.includes(id))),
      `${type}: a rematch is a different fight, not the same one with bigger numbers`);
    for (const [item, qty] of kit.extra ?? []) {
      const def = ITEM_DEFINITIONS.find(d => d.id === item);
      assert.ok(def, `${type}: ${item} is a real item`);
      assert.ok(qty > 0);
      // a rematch is repeatable, so it may never hand out a trophy or any other one-off quest keepsake
      assert.notEqual(def.category, 'quest', `${type}: ${item} is a one-off keepsake and must not repeat`);
      assert.ok(!PLANET_CATALOG.some(p => p.boss?.trophy === item), `${type}: ${item} is a boss trophy`);
    }
  }
});

// TODO 31c. The dragonfire signature lays a line of burning ground and leaves exactly one segment of it unlit, so
// the wall is area denial rather than a cage. Whether the gap is really a way through is a matter of the numbers the
// kit authors: if the segments were packed closer than their own radius the neighbours would simply cover it.
// (That the move lays the line at all is checked in tests/sim/emberRematch.sim.mjs, where a scene exists.)
test('every dragonfire wall leaves a gap a hero can actually stand in', () => {
  const walls = Object.entries(COMBAT.enemies)
    .flatMap(([type, def]) => Object.entries(def.rematch?.attacks ?? {})
      .filter(([, a]) => a.segments != null).map(([id, a]) => [`${type}.${id}`, a]));
  assert.ok(walls.length >= 3, `the signature is worn more than once (${walls.map(([n]) => n).join(', ')})`);
  for (const [name, a] of walls) {
    assert.ok(a.segments >= 3, `${name}: a wall with a gap needs at least three segments`);
    assert.ok(a.spacing > a.radius, `${name}: the unlit segment is not covered by its neighbours (${a.spacing} > ${a.radius})`);
    assert.ok(a.spacing < a.radius * 2, `${name}: the lit segments still join up into a wall (${a.spacing} < ${a.radius * 2})`);
    assert.ok(a.duration > 0 && a.tick > 0, `${name}: it holds the ground for a while rather than striking once`);
    assert.ok(a.duration > a.windup, `${name}: it burns for longer than it took to read`);
  }
});

// TODO 31e. The false lure signature rings lamps round the hero (or the boss) and every lamp bursts over its own marked
// circle. Whether there is always a way out is a matter of the numbers the kit authors: the neighbours must leave a
// hero-wide gap between their circles, and the middle of a ring round the hero must be clear of every lamp.
// (That the move lights the lamps at all is checked in tests/sim/tideRematch.sim.mjs, where a scene exists.)
test('every false lure ring leaves a way out and a safe middle', () => {
  const HERO = 0.5;                                                    // the widest hero's radius, rounded up
  const rings = Object.entries(COMBAT.enemies)
    .flatMap(([type, def]) => Object.entries(def.rematch?.attacks ?? {})
      .filter(([, a]) => a.count != null && a.spread != null && a.radius != null && a.segments == null && a.damage != null && a.root == null)
      .map(([id, a]) => [`${type}.${id}`, a]));
  assert.ok(rings.length >= 2, `the signature is worn more than once (${rings.map(([n]) => n).join(', ')})`);
  for (const [name, a] of rings) {
    assert.ok(a.count >= 3, `${name}: a ring needs at least three lamps`);
    const chord = 2 * a.spread * Math.sin(Math.PI / a.count);          // centre to centre of two neighbours
    assert.ok(chord - 2 * a.radius > 2 * HERO + 0.5, `${name}: a hero fits between two circles (${(chord - 2 * a.radius).toFixed(2)} m of gap)`);
    assert.ok(a.spread - a.radius > 2, `${name}: the middle of the ring is clear of every burst (${(a.spread - a.radius).toFixed(2)} m)`);
    assert.ok(a.windup >= 1.2, `${name}: it is on the ground long enough to read`);
    assert.ok(a.damage > 0 && a.knockback >= 0, `${name}: it is a sting, not nothing`);
  }
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
  // the key is the encounter, `<planet>:<type>` (31d): two worlds may field the same species on separate ladders
  assert.deepEqual(cleanState('rematch', { wins: { 'lanternmoss:gloomcap': 3 } }), { wins: { 'lanternmoss:gloomcap': 3 } });
  assert.deepEqual(cleanState('rematch', { wins: { 'lanternmoss:hydra': 2, 'frostveil:hydra': 1 } }),
    { wins: { 'lanternmoss:hydra': 2, 'frostveil:hydra': 1 } }, 'the same species on two worlds keeps two ladders');
  assert.deepEqual(cleanState('rematch', { wins: { 'lanternmoss:notAMonster': 4 } }), { wins: {} }, 'an unknown encounter is dropped');
  assert.deepEqual(cleanState('rematch', { wins: { 'nowhere:gloomcap': 4 } }), { wins: {} }, 'and so is an unknown world');
  assert.deepEqual(cleanState('rematch', { wins: { gloomcap: 4 } }), { wins: {} }, 'a bare type names no encounter');
  assert.deepEqual(cleanState('rematch', { wins: { 'lanternmoss:gloomcap': -5 } }), { wins: { 'lanternmoss:gloomcap': 0 } });
  assert.deepEqual(cleanState('rematch', { wins: { 'lanternmoss:gloomcap': 'many' } }), { wins: { 'lanternmoss:gloomcap': 0 } });
  const injected = cleanState('rematch', { wins: { 'lanternmoss:gloomcap': 2 }, active: 'lanternmoss', cool: { lanternmoss: 99 } });
  assert.deepEqual(injected, { wins: { 'lanternmoss:gloomcap': 2 } }, 'a fight in progress can never be injected through a save');
});
