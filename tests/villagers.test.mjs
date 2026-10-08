// Villager-side config: the day clock, the shop, and quests that can actually be finished. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMBAT } from '../src/config/combat.js';
import { DAY } from '../src/config/day.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';
import { QUESTS } from '../src/config/quests.js';
import { SHOP } from '../src/config/shop.js';
import { planetSources } from '../src/gameplay/resourceRules.js';

const ITEMS = Object.fromEntries(ITEM_DEFINITIONS.map(d => [d.id, d]));
// villager names, read from the defs (they build 3D models, so the module itself needs a browser)
const defsSource = readFileSync(new URL('../src/entities/npc/npcDefs.js', import.meta.url), 'utf8');
const VILLAGERS = [...defsSource.matchAll(/\{ name: '([^']+)'/g)].map(m => m[1]);
const PHASES = DAY.phases.map(p => p.id);

test('the day starts at 0 and its phases run in order, each with a light setting', () => {
  assert.equal(DAY.phases[0].from, 0);
  for (let i = 1; i < DAY.phases.length; i++) assert.ok(DAY.phases[i].from > DAY.phases[i - 1].from && DAY.phases[i].from < 1);
  for (const id of PHASES) assert.ok(DAY.light[id], `light for ${id}`);
  assert.ok(DAY.length >= 60 && DAY.startAt >= 0 && DAY.startAt < 1);
});

test('villager schedules only name real phases and places', () => {
  for (const m of defsSource.matchAll(/schedule: \{([^}]+)\}/g)) for (const [, phase] of m[1].matchAll(/(\w+):/g)) assert.ok(PHASES.includes(phase), `schedule phase ${phase}`);
  assert.ok(VILLAGERS.length >= 6, 'four travellers + a local on each later planet');
});

test('the shop: a known keeper, real phases, stock that can be bought, prices from item value', () => {
  assert.ok(VILLAGERS.includes(SHOP.keeper));
  for (const p of SHOP.openPhases) assert.ok(PHASES.includes(p));
  assert.ok(!SHOP.openPhases.includes('night') || SHOP.openPhases.length === PHASES.length);
  for (const s of SHOP.stock) assert.ok(ITEMS[s.item] && (s.price > 0 || ITEMS[s.item].value > 0), `${s.item} buyable`);
  assert.ok(SHOP.sellRate < SHOP.buyMarkup, 'no buy-low-sell-high loop');
});

test('every quest refers to real villagers, items, monsters and planets', () => {
  for (const [id, q] of Object.entries(QUESTS)) {
    assert.ok(VILLAGERS.includes(q.giver), `${id}: giver ${q.giver}`);
    assert.ok((q.planet ?? 0) < PLANETS.length, `${id}: planet`);
    for (const k of ['offer', 'accept', 'decline', 'done']) assert.ok(q.text[k], `${id}: text.${k}`);
    q.steps.forEach((s, i) => {
      assert.ok(s.text, `${id} step ${i}: tracker text`);
      if (s.item) assert.ok(ITEMS[s.item], `${id} step ${i}: item ${s.item}`);
      if (s.to) assert.ok(VILLAGERS.includes(s.to) && s.say, `${id} step ${i}: talks to ${s.to}`);
      if (s.kind === 'defeat') assert.ok(s.enemy === 'any' || COMBAT.enemies[s.enemy], `${id} step ${i}: enemy ${s.enemy}`);
      if (s.kind === 'reach') assert.ok(s.planet < PLANETS.length, `${id} step ${i}: planet`);
      assert.ok(['collect', 'deliver', 'talk', 'defeat', 'reach'].includes(s.kind), `${id} step ${i}: kind ${s.kind}`);
      for (const [it] of s.give ?? []) assert.ok(ITEMS[it]);
    });
    for (const [it] of q.reward.items ?? []) assert.ok(ITEMS[it], `${id}: reward ${it}`);
  }
});

test('quests are finishable: each planet grows enough of what its quests ask you to collect, and has the monsters', () => {
  const need = {};                          // item -> total asked for across all quests
  for (const q of Object.values(QUESTS)) for (const s of q.steps) if (s.kind === 'collect') need[s.item] = (need[s.item] ?? 0) + s.count;
  for (const [item, n] of Object.entries(need)) {
    const grows = PLANETS.reduce((sum, p) => sum + (p.forage.find(f => f.item === item)?.count ?? 0), 0);
    const sold = SHOP.stock.some(s => s.item === item), gathered = PLANETS.some((p, i) => planetSources(i).has(item));   // regrows: never runs out
    assert.ok(grows >= n || sold || gathered, `${item}: quests ask for ${n}, the planets grow ${grows}`);
  }
  for (const [id, q] of Object.entries(QUESTS)) for (const s of q.steps) if (s.kind === 'defeat' && s.enemy !== 'any') {
    const from = q.planet ?? 0;
    assert.ok(PLANETS.slice(from).some(p => p.roster.some(g => g.type === s.enemy)), `${id}: ${s.enemy} lives on a planet where the quest runs`);
  }
});
