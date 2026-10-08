// The journal: achievements must point at real counters, flags and glyphs; every monster and boss needs a bestiary
// page; saved journals are cleaned on load; progress and unlocking follow the counters. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACHIEVEMENTS, BOSS_CHALLENGES, JOURNAL_KEY, JOURNAL_STATS } from '../src/config/achievements.js';
import { BESTIARY_ENTRIES } from '../src/config/bestiary.js';
import { COMBAT } from '../src/config/combat.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PETS } from '../src/config/pets.js';
import { PLANETS } from '../src/config/planets.js';
import { BESTIARY_ORDER, emptyJournal, goalTarget, isBoss, newlyDone, pageName, progress, sanitizeJournal, statValue } from '../src/gameplay/journalRules.js';

const icons = readFileSync(new URL('../src/ui/icons.js', import.meta.url), 'utf8');

test('achievements are complete and reachable', () => {
  const ids = new Set();
  for (const a of ACHIEVEMENTS) {
    assert.ok(!ids.has(a.id), `duplicate achievement ${a.id}`); ids.add(a.id);
    assert.ok(['Firsts', 'Counts', 'Challenges'].includes(a.group) && a.name && a.text, `${a.id}: group, name, text`);
    assert.match(icons, new RegExp(`\\n  ${a.icon}: \`|GLYPHS\\.${a.icon} =`), `${a.id}: ui/icons.js has no glyph ${a.icon}`);
    if (a.goal.flag) assert.ok(['flawless', 'petless', 'underdog'].includes(a.goal.flag), `${a.id}: a flag the journal sets`);
    else assert.ok(a.goal.stat in JOURNAL_STATS && goalTarget(a.goal) >= 1, `${a.id}: counter ${a.goal.stat} and a target`);
    if (a.goal.stat === 'items') assert.ok(goalTarget(a.goal) <= ITEM_DEFINITIONS.length, `${a.id}: there are enough items to find`);
    assert.ok(!a.reward || a.reward.coins > 0, `${a.id}: reward`);
  }
  assert.equal(goalTarget({ stat: 'petsFound', at: 'allPets' }), Object.keys(PETS).length);
  assert.equal(BOSS_CHALLENGES.lowLevel.length, PLANETS.length, 'a low level for each planet\'s boss');
  assert.ok(JOURNAL_KEY.startsWith('lanternmoss.'));
});

test('every monster and boss has a bestiary page', () => {
  assert.deepEqual([...BESTIARY_ORDER].sort(), Object.keys(COMBAT.enemies).filter(t => !COMBAT.enemies[t].object).sort(), 'every monster (lair objects aside)');
  assert.ok(BESTIARY_ORDER.findIndex(isBoss) === BESTIARY_ORDER.filter(t => !isBoss(t)).length, 'bosses come last');
  for (const t of BESTIARY_ORDER) {
    const e = BESTIARY_ENTRIES[t];
    assert.ok(e && e.blurb && e.attacks?.length && e.counters?.length, `${t}: blurb, attacks and counters`);
    assert.ok(COMBAT.enemies[t].ai === 'boss' ? COMBAT.enemies[t].name : e.name, `${t}: a page name`);
    assert.ok(pageName(t) && !pageName(t).includes(','), `${t}: a short page title (${pageName(t)})`);
    const lives = PLANETS.some(p => p.boss.type === t || p.roster.some(r => r.type === t) || (p.miniBosses ?? []).some(m => m.type === t));
    assert.ok(lives || e.from, `${t}: lives on a planet, or says where it comes from`);
  }
});

test('saved journals are cleaned on load', () => {
  const j = sanitizeJournal({
    stats: { monsters: 12.7, chests: -3, bogus: 9 }, flags: { flawless: true, cheat: true, petless: 'yes' },
    unlocked: { firstBlood: 1700000000000, nope: 5, firstBoss: -1 }, seen: { goblin: true, dragon: true },
    defeated: { ogre: 3, goblin: 0, nobody: 2 }, found: { honeyBun: true, ghost: true }, legendary: { emberRing: true }, pets: { fox: true, cat: true },
  }, id => ITEM_DEFINITIONS.some(d => d.id === id));
  assert.equal(j.stats.monsters, 12); assert.equal(j.stats.chests, 0); assert.ok(!('bogus' in j.stats));
  assert.deepEqual(j.flags, { flawless: true });
  assert.deepEqual(Object.keys(j.unlocked), ['firstBlood']);
  assert.deepEqual(j.seen, { goblin: true, ogre: true }, 'defeated means met; unknown monsters dropped');
  assert.deepEqual(j.defeated, { ogre: 3 });
  assert.deepEqual(j.found, { honeyBun: true, emberRing: true }, 'unknown items dropped; legendary finds are found');
  assert.deepEqual(j.pets, { fox: true });
  for (const junk of [null, 'x', 42, [1, 2], { stats: 'no' }]) assert.deepEqual(sanitizeJournal(junk), emptyJournal());
});

test('progress and unlocking follow the counters', () => {
  const j = emptyJournal(), first = ACHIEVEMENTS.find(a => a.id === 'firstBlood'), many = ACHIEVEMENTS.find(a => a.id === 'monsters25');
  assert.deepEqual(newlyDone(j), []);
  j.stats.monsters = 10;
  assert.deepEqual(progress(many, j), { have: 10, need: 25, done: false });
  assert.ok(newlyDone(j).includes(first) && !newlyDone(j).includes(many));
  j.unlocked.firstBlood = 1; assert.ok(!newlyDone(j).includes(first), 'never unlocks twice');
  j.defeated = { goblin: 2, gloomcap: 1, pyrrhax: 1 };
  assert.equal(statValue(j, 'kinds'), 3); assert.equal(statValue(j, 'bossKinds'), 2);
  j.flags.flawless = true; assert.ok(progress(ACHIEVEMENTS.find(a => a.id === 'flawless'), j).done);
  j.stats.monsters = 1e6; assert.equal(progress(many, j).have, 25, 'progress is capped at the target');
});
