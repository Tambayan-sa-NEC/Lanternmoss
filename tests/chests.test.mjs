// Chests: config/chests.js and PLANETS[i].chests must only name real chest kinds, loot tables and items, and the
// loot roller (src/gameplay/loot.js) must respect each table. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_CHEST, CHEST_KINDS, KEYS, LOOT, LOOT_TABLES } from '../src/config/chests.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';
import { resolveLootItem, rollLoot } from '../src/gameplay/loot.js';

const ITEMS = new Set(ITEM_DEFINITIONS.map(d => d.id));
const TOKENS = new Set(['@material', '@trophy']);
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('chest kinds name a loot table and a full look', () => {
  for (const [id, k] of Object.entries(CHEST_KINDS)) {
    assert.ok(LOOT_TABLES[k.loot], `${id}: unknown loot table ${k.loot}`);
    for (const c of ['wood', 'lid', 'trim', 'glow']) assert.ok(Number.isInteger(k.look[c]), `${id}: look.${c}`);
    assert.ok(k.name && k.scale > 0, `${id}: name and scale`);
  }
  assert.ok(CHEST_KINDS.boss, 'a boss chest kind is needed (it falls where a boss is beaten)');
  assert.ok(Object.values(CHEST_KINDS).some(k => k.locked), 'at least one kind is locked (keys open it)');
});

test('loot tables only hand out real items, with sane quantities and weights', () => {
  for (const [id, t] of Object.entries(LOOT_TABLES)) {
    assert.ok(Array.isArray(t.coins) && t.coins[0] <= t.coins[1], `${id}: coins [min, max]`);
    for (const e of [...(t.guaranteed ?? []), ...(t.pool ?? [])]) {
      assert.ok(ITEMS.has(e.item) || TOKENS.has(e.item), `${id}: unknown item ${e.item}`);
      const q = Array.isArray(e.qty) ? e.qty : [e.qty ?? 1, e.qty ?? 1];
      assert.ok(q[0] >= 1 && q[0] <= q[1], `${id}: ${e.item} qty`);
    }
    for (const e of t.pool ?? []) assert.ok(e.weight > 0, `${id}: ${e.item} needs a weight`);
    assert.ok((t.rolls ?? 0) <= (t.pool ?? []).length, `${id}: more rolls than pool entries`);
  }
  assert.ok(LOOT_TABLES.boss.guaranteed.some(e => e.item === '@trophy'), "the boss chest holds the planet's trophy");
});

test('every planet places known chest kinds and has a real material', () => {
  for (const p of PLANETS) {
    assert.ok(ITEMS.has(p.material), `${p.name}: material ${p.material}`);
    assert.ok(p.chests?.length, `${p.name}: no chests`);
    for (const c of p.chests) {
      assert.ok(CHEST_KINDS[c.kind] && c.kind !== 'boss', `${p.name}: chest kind ${c.kind} (boss chests aren't placed)`);
      assert.ok(Number.isInteger(c.count) && c.count > 0, `${p.name}: ${c.kind} count`);
    }
    assert.ok(ITEMS.has(resolveLootItem('@trophy', PLANETS.indexOf(p))), `${p.name}: trophy`);
  }
});

test('keys and timings are usable', () => {
  const key = ITEM_DEFINITIONS.find(d => d.id === KEYS.item);
  assert.ok(key && key.droppable !== false, 'the key item exists');
  assert.ok(KEYS.dropChance > 0 && KEYS.dropChance <= 1 && KEYS.pity >= 1);
  assert.ok(BOSS_CHEST.fallTime > 0 && BOSS_CHEST.travelDelay > 0 && LOOT.popTime > 0);
  assert.ok(LOOT.popDistance[0] > 0 && LOOT.popDistance[0] <= LOOT.popDistance[1]);
});

test('rollLoot: coins in range (scaled per planet), guaranteed items, distinct pool picks, tokens resolved', () => {
  const rng = seeded(7);
  for (let planet = 0; planet < PLANETS.length; planet++) {
    for (const [id, t] of Object.entries(LOOT_TABLES)) for (let n = 0; n < 200; n++) {
      const r = rollLoot(id, planet, rng), k = 1 + LOOT.coinsPerPlanet * planet;
      assert.ok(r.coins >= Math.round(t.coins[0] * k) && r.coins <= Math.round(t.coins[1] * k), `${id}: coins ${r.coins}`);
      for (const { item, qty } of r.items) assert.ok(ITEMS.has(item) && qty > 0, `${id}: ${item} x${qty}`);
      assert.equal(new Set(r.items.map(i => i.item)).size, r.items.length, 'stacks are merged');
      for (const g of t.guaranteed ?? []) assert.ok(r.items.some(i => i.item === resolveLootItem(g.item, planet)), `${id}: guaranteed ${g.item}`);
    }
  }
  assert.equal(rollLoot('boss', 0).items.find(i => i.item === 'mossCrown')?.qty, 1);
  assert.deepEqual(rollLoot('nope', 0), { coins: 0, items: [] });
});
