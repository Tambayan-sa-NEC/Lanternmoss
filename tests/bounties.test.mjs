import test from 'node:test';
import assert from 'node:assert/strict';
import { BOUNTIES } from '../src/config/bounties.js';
import { PLANETS, PLANET_CATALOG } from '../src/config/planets.js';
import { COMBAT } from '../src/config/combat.js';
import { bountyMatches, bountyPools, bountyProgress, cleanBountyState, emptyBountyState, generateBounties } from '../src/gameplay/bountyRules.js';
import { planetSources } from '../src/gameplay/resourceRules.js';
import { emptyJournal, sanitizeJournal } from '../src/gameplay/journalRules.js';

test('every released world posts three different kinds of task, all doable on that world', () => {
  for (const [i, p] of PLANETS.entries()) {
    const sources = planetSources(i), roster = new Set(p.roster.map(g => g.type));
    for (let day = 1; day <= 60; day++) {
      const set = generateBounties(p, i, day);
      assert.equal(set.length, BOUNTIES.perDay, `${p.id} day ${day}`);
      assert.equal(new Set(set.map(b => b.kind)).size, set.length, 'one of each kind');
      for (const b of set) {
        const cfg = BOUNTIES.kinds[b.kind];
        assert.ok(b.count >= cfg.count[0] && b.count <= cfg.count[1] && b.reward.coins > 0, JSON.stringify(b));
        if (b.kind === 'defeat') assert.ok(roster.has(b.target) && !COMBAT.enemies[b.target].object);
        if (b.kind === 'bring' || b.kind === 'fish') assert.ok(sources.has(b.target) || b.target === p.material, `${p.id}: ${b.target} can be found there`);
        if (b.kind === 'fish') assert.notEqual(b.target, 'goldenKoi', 'never the rare koi');
        assert.ok(b.reward.items.every(([id, n]) => id === p.material && n >= 1));
      }
    }
  }
});

test('the same planet and day always post the same set; a new day posts a new one', () => {
  const p = PLANETS[0];
  assert.deepEqual(generateBounties(p, 0, 7), generateBounties(p, 0, 7));
  const days = new Set(Array.from({ length: 20 }, (_, d) => JSON.stringify(generateBounties(p, 0, d + 1).map(b => [b.kind, b.target, b.count]))));
  assert.ok(days.size > 10, 'sets vary from day to day');
  assert.ok(generateBounties(p, 0, 3).every(b => b.id.startsWith('lanternmoss:3:')));
});

test('worlds without a farm skip harvests, and unfinished worlds still generate safely', () => {
  const noFarm = { ...PLANETS[0], farm: false };
  assert.deepEqual(bountyPools(noFarm, 0).harvest, []);
  for (let day = 1; day <= 20; day++) assert.ok(generateBounties(noFarm, 0, day).every(b => b.kind !== 'harvest'));
  for (const [i, p] of PLANET_CATALOG.entries()) assert.ok(generateBounties(p, i, 1).length <= BOUNTIES.perDay);
});

test('coins grow by planet and stay modest: about what selling chest finds pays', () => {
  const daily = i => Array.from({ length: 200 }, (_, d) => generateBounties(PLANETS[i], i, d + 1).reduce((n, b) => n + b.reward.coins, 0)).reduce((a, b) => a + b) / 200;
  const per = PLANETS.map((_, i) => daily(i));
  assert.ok(per.every((v, i) => i === 0 || v > per[i - 1]), per.join());
  assert.ok(per[0] >= 15 && per[0] <= 35 && per.at(-1) <= 50, per.join());
});

test('progress, matching and the saved shape', () => {
  const kill = { kind: 'defeat', target: 'goblin', count: 3 }, bring = { kind: 'bring', target: 'wood', count: 5 };
  assert.deepEqual(bountyProgress(kill, 2), { have: 2, need: 3, done: false });
  assert.deepEqual(bountyProgress(kill, 4), { have: 3, need: 3, done: true });
  assert.deepEqual(bountyProgress(bring, 0, id => (id === 'wood' ? 6 : 0)), { have: 5, need: 5, done: true });
  assert.ok(bountyMatches(kill, { kind: 'defeat', type: 'goblin' }) && !bountyMatches(kill, { kind: 'defeat', type: 'slime' }));
  assert.ok(bountyMatches({ kind: 'fish', target: 'pondPerch' }, { kind: 'fish', itemId: 'pondPerch' }));
  assert.ok(bountyMatches({ kind: 'harvest' }, { kind: 'harvest' }) && !bountyMatches(bring, { kind: 'defeat', type: 'wood' }));
  assert.deepEqual(cleanBountyState(null), emptyBountyState(1));
  assert.deepEqual(cleanBountyState({ day: 4, counts: [2, -1, 'x', 9], claimed: [true, 'yes'] }), { day: 4, counts: [2, 0, 0], claimed: [true, false, false] });
  assert.deepEqual(cleanBountyState({ day: 2.5, counts: [1e9] }).counts[0], 999);
  assert.equal(cleanBountyState({ day: 2.5 }).day, 1);
});

test('journal counters survive a reload, including fish, harvests, gathering and bounties', () => {
  const j = emptyJournal(); Object.assign(j.stats, { fish: 4, harvests: 2, gathered: 30, bounties: 3, monsters: 9 });
  const back = sanitizeJournal(JSON.parse(JSON.stringify(j)));
  for (const k of ['fish', 'harvests', 'gathered', 'bounties', 'monsters']) assert.equal(back.stats[k], j.stats[k], k);
});
