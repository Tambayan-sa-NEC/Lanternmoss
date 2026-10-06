// Boss summoning: every planet boss has conditions that can be met (real seals, sigil items, quests on that planet),
// an arena wall, an arena inside its leash, and villager hints for each condition. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA, ARENA_WALLS, ELITE, SUMMON, SUMMON_HINTS } from '../src/config/bossSummon.js';
import { COMBAT } from '../src/config/combat.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';
import { QUESTS } from '../src/config/quests.js';
import { LEVELING } from '../src/config/leveling.js';

const KINDS = new Set(['level', 'seals', 'sigils', 'quest', 'night']);

test('every boss has conditions that can be met on its planet', () => {
  PLANETS.forEach((p, i) => {
    const s = p.boss.summon, name = p.boss.type;
    assert.ok(s && Object.keys(s).length, `${name}: summon conditions`);
    for (const k of Object.keys(s)) assert.ok(KINDS.has(k), `${name}: unknown condition ${k}`);
    if (s.level) assert.ok(s.level >= 1 && s.level <= LEVELING.maxLevel, `${name}: a reachable level`);
    if (s.seals) {
      const def = COMBAT.enemies[s.seals.type];
      assert.ok(def && def.object && def.static && s.seals.count >= 1, `${name}: seals are static lair objects`);
    }
    if (s.sigils) {
      const item = ITEM_DEFINITIONS.find(d => d.id === s.sigils.item);
      assert.ok(item && item.category === 'quest', `${name}: the sigil is a quest item`);
      assert.ok(s.sigils.elites >= s.sigils.count, `${name}: enough elites to carry the sigils`);
      const monsters = p.roster.reduce((n, r) => n + (r.groups ? r.groups * r.size : r.count), 0);
      assert.ok(monsters >= s.sigils.elites * 2, `${name}: enough monsters to pick elites from`);
    }
    if (s.quest) {
      const q = QUESTS[s.quest];
      assert.ok(q && (q.planet ?? 0) <= i, `${name}: quest ${s.quest} is offered by then`);
    }
    assert.ok(ARENA_WALLS[p.boss.arena?.wall], `${name}: an arena wall`);
    assert.ok(ARENA.radius < COMBAT.enemies[name].leash, `${name}: the arena ring sits inside its leash`);
  });
});

test('summoning, elites and hints make sense', () => {
  assert.ok(SUMMON.trigger < ARENA.radius && SUMMON.sealRing < ARENA.radius, 'the trigger and the seals are inside the arena');
  assert.ok(SUMMON.rise[0] < SUMMON.rise[1] && SUMMON.rise[1] <= SUMMON.sequence && SUMMON.card[1] <= SUMMON.sequence, 'sequence timings');
  assert.ok(ELITE.hp > 1 && ELITE.damage >= 1 && ELITE.scale > 1, 'elites are tougher');
  for (const k of [...KINDS, 'ready']) assert.ok(SUMMON_HINTS[k]?.includes('{boss}') || k === 'level', `a villager hint for ${k}`);
  for (const [id, w] of Object.entries(ARENA_WALLS)) assert.ok(['thorn', 'flame'].includes(w.kind) && w.height > 0, `${id}: wall look`);
});
