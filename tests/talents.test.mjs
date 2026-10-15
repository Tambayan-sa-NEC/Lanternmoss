import test from 'node:test';
import assert from 'node:assert/strict';
import { TALENTS } from '../src/config/talents.js';
import { CHARACTERS } from '../src/config/characters.js';
import { cleanTalents, learn, learnProblem, pointsEarned, pointsSpent, talentKit, validateTree } from '../src/progression/talentRules.js';
import { FIXTURE_TREE as tree } from './sim/lib/talentFixture.mjs';

const witch = CHARACTERS.witch.abilities;

test('a point at level 2 and every two levels after: 8 by the level cap', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 15, 16, 40].map(l => pointsEarned(l)), [0, 1, 1, 2, 2, 7, 8, 8]);
});

test('the real trees are valid and unreleased; the fixture tree is valid against the witch kit', () => {
  for (const [hero, t] of Object.entries(TALENTS.trees)) {
    assert.deepEqual(validateTree(t, CHARACTERS[hero].abilities), [], hero);
    assert.equal(t.released, false, `${hero}: released only by its own stage (28c-28e)`);
  }
  assert.deepEqual(validateTree(tree, witch), []);
  const bad = { talents: [{ id: 'x', name: 'X', text: 't', row: 1, max: 4, cost: 1, needs: ['y'], mods: [{ ability: 'nope', key: 'damage', add: 1 }] }] };
  assert.equal(validateTree(bad, witch).length, 3);
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
