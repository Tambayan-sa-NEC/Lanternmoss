// Environments (TODO 15): every planet's trees, weather, animals and mini bosses must exist; weather kinds are sane;
// rare creatures give real gear; mini bosses have their AI and a bestiary page. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BESTIARY_ENTRIES } from '../src/config/bestiary.js';
import { COMBAT } from '../src/config/combat.js';
import { CRITTER_DEFS, RARE_CRITTERS } from '../src/config/critters.js';
import { TREE_KINDS } from '../src/config/flora.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';
import { WEATHER, WEATHER_KINDS } from '../src/config/weather.js';

const src = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const item = id => ITEM_DEFINITIONS.find(d => d.id === id);

test('every planet grows its own trees, each kind drawn and collidable', () => {
  const props = src('world/props.js');
  for (const [id, k] of Object.entries(TREE_KINDS)) {
    assert.match(props, new RegExp(`\\n  ${id}\\(A\\)`), `${id}: a builder in world/props.js`);
    assert.ok(k.r > 0 && k.cam.r > 0 && k.cam.top > k.cam.base, `${id}: collider`);
  }
  for (const p of PLANETS) {
    assert.ok(Object.keys(p.flora.trees).length >= 3, `${p.name}: at least three kinds of tree`);
    for (const k of Object.keys(p.flora.trees)) assert.ok(TREE_KINDS[k], `${p.name}: tree kind ${k}`);
    assert.ok(p.flora.flowers?.length && p.flora.tallGrass?.length, `${p.name}: wildflower and tall grass colours`);
  }
});

test('weather: kinds are sane and every planet has a mix of its own', () => {
  for (const [id, w] of Object.entries(WEATHER_KINDS)) {
    assert.ok(w.label && w.icon, `${id}: label and icon`);
    assert.ok(w.wind >= 0 && w.wind <= 2 && w.fog > 0.2 && w.fog <= 1 && w.light > 0.3 && w.light <= 1 && w.overcast >= 0 && w.overcast <= 1, `${id}: ranges`);
  }
  assert.ok(WEATHER.duration[0] > WEATHER.blend && WEATHER.duration[1] > WEATHER.duration[0]);
  for (const p of PLANETS) {
    assert.ok(Object.keys(p.weather).every(k => WEATHER_KINDS[k]) && p.weather.clear > 0, `${p.name}: weather mix with clear days`);
    assert.ok(Object.keys(p.weather).length >= 3, `${p.name}: some variety`);
  }
});

test('animals: every planet\'s wildlife exists; rare creatures give real gear', () => {
  for (const p of PLANETS) {
    const w = p.wildlife;
    for (const [key, n, where] of w.critters) assert.ok(CRITTER_DEFS[key] && n > 0 && [undefined, 'ponds', 'far'].includes(where), `${p.name}: ${key}`);
    assert.ok(CRITTER_DEFS[w.rare]?.rare, `${p.name}: rare creature ${w.rare}`);
  }
  const rares = Object.values(CRITTER_DEFS).filter(c => c.rare);
  assert.equal(new Set(rares.map(r => r.rare.gift)).size, rares.length, 'each rare creature has its own gift');
  for (const r of rares) assert.ok(item(r.rare.gift)?.equip && r.rare.name && r.rare.color, `${r.rare.name}: a gear gift`);
  assert.ok(RARE_CRITTERS.reach < RARE_CRITTERS.spook && RARE_CRITTERS.spookSpeed > 1, 'you can walk up to one without spooking it');
  for (const [id, c] of Object.entries(CRITTER_DEFS)) assert.ok(c.kind && c.fur !== undefined, `${id}: kind and colour`);
});

test('mini bosses: real types with an AI kit, a model and a bestiary page, placed on planets', () => {
  const kits = src('entities/enemies/behaviors/index.js'), models = src('models/monsters.js');
  const types = new Set(PLANETS.flatMap(p => (p.miniBosses ?? []).map(m => m.type)));
  assert.ok(types.has('hydra') && types.has('basilisk'), 'the hydra and the basilisk both appear');
  for (const t of types) {
    const d = COMBAT.enemies[t];
    assert.ok(d?.miniBoss && d.ai === 'boss' && d.behavior && d.phases?.length && d.attacks, `${t}: a mini boss definition`);
    assert.match(kits, new RegExp(`\\b${d.behavior}\\b`), `${t}: its AI kit is registered`);
    assert.match(models, new RegExp(`${t}: build`), `${t}: a model`);
    assert.ok(BESTIARY_ENTRIES[t]?.attacks.length && BESTIARY_ENTRIES[t].lore, `${t}: a bestiary page with lore`);
    for (const ph of d.phases) for (const a of ph.attacks) assert.ok(d.attacks[a], `${t}: phase attack ${a}`);
  }
  for (const p of PLANETS) for (const m of p.miniBosses ?? []) assert.ok(['lake', 'far'].includes(m.near), `${p.name}: ${m.type} placement`);
});
