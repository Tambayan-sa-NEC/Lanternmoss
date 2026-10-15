import test from 'node:test';
import assert from 'node:assert/strict';
import { TALENTS } from '../src/config/talents.js';
import { abilityText, CHARACTERS } from '../src/config/characters.js';
import { cleanTalents, learn, learnProblem, pointsEarned, pointsSpent, talentKit, validateTree } from '../src/progression/talentRules.js';
import { FIXTURE_TREE as tree } from './sim/lib/talentFixture.mjs';

const witch = CHARACTERS.witch.abilities;

test('a point at level 2 and every two levels after: 8 by the level cap', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 15, 16, 40].map(l => pointsEarned(l)), [0, 1, 1, 2, 2, 7, 8, 8]);
});

test('the real trees are valid; only the completed witch tree is released', () => {
  for (const [hero, t] of Object.entries(TALENTS.trees)) {
    assert.deepEqual(validateTree(t, CHARACTERS[hero].abilities), [], hero);
    assert.equal(t.released, hero === 'witch', `${hero}: released only by its own stage (28c-28e)`);
  }
  assert.deepEqual(validateTree(tree, witch), []);
  const bad = { talents: [{ id: 'x', name: 'X', text: 't', row: 1, max: 4, cost: 1, needs: ['y'], mods: [{ ability: 'nope', key: 'damage', add: 1 }] }] };
  assert.equal(validateTree(bad, witch).length, 3);
});

test('the witch tree offers ten points of choices within an eight-point budget, with a gated Fireball alternative', () => {
  const t = TALENTS.trees.witch;
  assert.equal(t.talents.reduce((n, x) => n + x.max * x.cost, 0), 10);
  assert.match(learnProblem(t, {}, 'seekingFlame', 16), /Bright Bolt/);
  let ranks = {};
  for (const id of ['brightBolt', 'brightBolt', 'quickFrost', 'quickFrost', 'seekingFlame', 'deepFreeze', 'deepFreeze']) {
    assert.equal(learnProblem(t, ranks, id, 16), null); ranks = learn(t, ranks, id, 16);
  }
  assert.equal(pointsSpent(t, ranks), 8);
  assert.match(learnProblem(t, ranks, 'lightStep', 16), /Not enough/);
  const kit = talentKit(witch, t, ranks);
  assert.equal(kit.bolt.damage, witch.bolt.damage * 1.2);
  assert.equal(kit.nova.cooldown, 6); assert.equal(kit.nova.slowTime, 4.5);
  assert.equal(kit.fireball.homing, 4); assert.equal(kit.fireball.name, 'Seeking Fireball');
  for (const key of ['cost', 'cooldown', 'damage', 'blastRadius', 'range']) assert.equal(kit.fireball[key], witch.fireball[key], key);
  assert.match(abilityText('fireball', kit.fireball), /Follows the foe/);
  assert.doesNotMatch(abilityText('fireball', witch.fireball), /Follows the foe/);
  assert.equal(talentKit(witch, t, { lightStep: 2 }).blink.cost, 11);
  assert.equal(talentKit(witch, t, {}), witch);
  assert.equal(witch.fireball.homing, 0); assert.equal(witch.bolt.damage, 9);
  assert.deepEqual(cleanTalents({ ranks: { seekingFlame: 1, ghost: 1 } }, t, 16), { ranks: {} });
  assert.deepEqual(cleanTalents({ ranks }, t, 16), { ranks });
});

test('learning needs points, the prerequisite and room for another rank', () => {
  assert.match(learnProblem(tree, {}, 'sharpBolt', 1), /Not enough talent points/);
  assert.equal(learnProblem(tree, {}, 'sharpBolt', 2), null);
  assert.match(learnProblem(tree, {}, 'cheapBolt', 8), /Learn Sharp Bolt first/);
  assert.match(learnProblem(tree, { quickNova: 1 }, 'quickNova', 8), /highest rank/);
  assert.match(learnProblem(tree, { sharpBolt: 1 }, 'wideFire', 4), /Not enough/, 'Wildfire costs 2: one point left at level 4');
  let ranks = {};
  for (const id of ['sharpBolt', 'sharpBolt', 'wideFire', 'cheapBolt']) ranks = learn(tree, ranks, id, 10);
  assert.deepEqual(ranks, { sharpBolt: 2, wideFire: 1, cheapBolt: 1 }); assert.equal(pointsSpent(tree, ranks), 5);
  assert.equal(learn(tree, ranks, 'nope', 10), ranks);
});

test('a loaded state drops unknown talents, extra ranks, missing prerequisites and points the level has not earned', () => {
  assert.deepEqual(cleanTalents(null, tree, 16), { ranks: {} });
  assert.deepEqual(cleanTalents({ ranks: { sharpBolt: 9, ghost: 1, quickNova: 'x' } }, tree, 16), { ranks: { sharpBolt: 2 } });
  assert.deepEqual(cleanTalents({ ranks: { cheapBolt: 2 } }, tree, 16), { ranks: {} }, 'no Sharp Bolt: Light Touch cannot stay');
  assert.deepEqual(cleanTalents({ ranks: { sharpBolt: 2, quickNova: 1, cheapBolt: 3 } }, tree, 4), { ranks: { sharpBolt: 2 } }, 'level 4 earns 2 points');
  const full = { ranks: { sharpBolt: 2, quickNova: 1, cheapBolt: 3, wideFire: 1 } };
  assert.deepEqual(cleanTalents(full, tree, 16), full, 'a valid state is kept as it is');
});

test('the kit changes per rank, the base table is never touched, and no ranks gives the base itself back', () => {
  const before = structuredClone(witch);
  const kit = talentKit(witch, tree, { sharpBolt: 2, quickNova: 1, cheapBolt: 3, wideFire: 1 });
  assert.equal(kit.bolt.damage, witch.bolt.damage * 1.3); assert.equal(kit.bolt.cost, witch.bolt.cost - 3);
  assert.equal(kit.nova.cooldown, witch.nova.cooldown - 1); assert.equal(kit.fireball.blastRadius, witch.fireball.blastRadius * 1.25);
  assert.deepEqual(kit.blink, witch.blink, 'untouched abilities keep their values');
  assert.deepEqual(witch, before, 'the base kit is untouched');
  assert.equal(talentKit(witch, tree, {}), witch, 'reset: the base table itself');
  const set = { talents: [{ id: 's', name: 'S', text: 't', row: 1, max: 1, cost: 1, needs: [], mods: [{ ability: 'bolt', key: 'homing', set: 9 }] }] };
  assert.equal(talentKit(witch, set, { s: 1 }).bolt.homing, 9);
});
