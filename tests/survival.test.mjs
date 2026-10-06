// Resources and survival (TODO 16): energy rules, gathering / fishing / farming data and rules, tools, the equipment
// slots and every planet's resources. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES } from '../src/config/crafting.js';
import { EQUIP_SLOTS, GEAR_KINDS, ITEM_DEFINITIONS, TOOL_KINDS } from '../src/config/items.js';
import { PLANETS } from '../src/config/planets.js';
import { CROPS, FARM, FISHING, NODE_KINDS, SCENERY } from '../src/config/resources.js';
import { NEEDS } from '../src/config/survival.js';
import { SHOP } from '../src/config/shop.js';
import { WEATHER_KINDS } from '../src/config/weather.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { crossedWarnings, drainRate, needEffects, needLevel } from '../src/gameplay/needsRules.js';
import { bestTool, catchFeel, cropStage, growthFor, inZone, needleAt, planetSources, rollCatch, rollDrops, toolCheck } from '../src/gameplay/resourceRules.js';

const get = id => itemRegistry.get(id);
const seeded = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

test('energy: drains a little, more sprinting or swimming; hungry and empty slow you, never more', () => {
  assert.equal(needLevel(NEEDS.max), 'fed'); assert.equal(needLevel(NEEDS.max * 0.2), 'hungry'); assert.equal(needLevel(0), 'starving');
  assert.deepEqual(needEffects(NEEDS.max), { regen: 1, sprint: 1 });
  const h = needEffects(NEEDS.max * 0.2), s = needEffects(0);
  assert.ok(h.regen < 1 && h.sprint < 1 && s.regen <= h.regen && s.sprint <= h.sprint && s.sprint > 0, 'worse when emptier, but you can still move');
  assert.ok(drainRate({ sprinting: true }) > drainRate() && drainRate({ swimming: true }) > drainRate());
  const minutes = NEEDS.max / drainRate() / 60;
  assert.ok(minutes > 10 && minutes < 30, `full to empty takes a while (${minutes.toFixed(0)} min)`);
  assert.deepEqual(crossedWarnings(NEEDS.max * 0.31, NEEDS.max * 0.29), [0.3]);
  assert.deepEqual(crossedWarnings(NEEDS.max * 0.5, NEEDS.max * 0.45), []);
  assert.ok(NEEDS.afterFaint > 0 && NEEDS.start <= NEEDS.max);
});

test('food: every meal fills energy; the planets each have their own; buffs are real', () => {
  const food = ITEM_DEFINITIONS.filter(d => d.category === 'consumable' && (d.use ?? []).some(e => e.effect === 'energy'));
  assert.ok(food.length >= 15, `plenty of food (${food.length})`);
  for (const id of ['firePepper', 'snowPlum', 'pepperSkewer', 'plumPorridge']) assert.ok(food.some(d => d.id === id), `${id}: a planet's own food`);
  const buffKinds = new Set(ITEM_DEFINITIONS.flatMap(d => (d.use ?? []).filter(e => e.effect === 'buff').map(e => e.kind)));
  for (const k of ['might', 'ward', 'swift', 'mend']) assert.ok(buffKinds.has(k), `something gives ${k}`);
  for (const id of ['healingPotion', 'starwater', 'stoneskinTonic', 'quickstepTonic']) assert.ok(get(id)?.use.length, `${id}: a potion`);
});

test('nodes: real drops, sane timings, tools that exist; every planet has wood, stone and herbs near the village', () => {
  for (const [id, k] of Object.entries(NODE_KINDS)) {
    assert.ok(k.name && k.verb && k.look && k.regrow > 30 && k.r > 0, `${id}: shape`);
    for (const [item, q] of k.drops) assert.ok(get(item) && (Array.isArray(q) ? q[1] >= q[0] && q[1] > 0 : q > 0), `${id}: drop ${item}`);
    for (const [item, c] of k.extra ?? []) assert.ok(get(item) && c > 0 && c < 1, `${id}: extra ${item}`);
    if (k.tool) assert.ok(TOOL_KINDS[k.tool] && k.hits >= 1, `${id}: tool ${k.tool}`);
    assert.ok(!k.rare || k.tool === 'pick' && k.tier >= 2, `${id}: a rare vein needs a good pick`);
  }
  for (const s of Object.values(SCENERY)) assert.ok(TOOL_KINDS[s.tool] && s.rest > 0 && s.drops.every(([i]) => get(i)));
  for (const p of PLANETS) {
    const r = p.resources; assert.ok(r, `${p.name}: resources`);
    for (const [kind, n] of [...r.nodes, ...(r.rare ?? [])]) assert.ok(NODE_KINDS[kind] && n > 0, `${p.name}: node ${kind}`);
    for (const k of ['branches', 'pebbles', 'sweetleaf']) assert.ok(r.nodes.some(([kind, , near]) => kind === k && near === 'village'), `${p.name}: ${k} near the village`);
    assert.ok(r.nodes.some(([k]) => NODE_KINDS[k].look === 'bush'), `${p.name}: berries`);
    assert.ok((r.rare ?? []).every(([k]) => NODE_KINDS[k].rare) && r.rare?.length, `${p.name}: a rare vein`);
    assert.ok(p.miniBosses?.length, `${p.name}: a mini boss guards the rare vein`);
  }
  // the later planets' veins need the better pickaxe
  assert.ok(PLANETS.slice(1).every(p => p.resources.nodes.some(([k]) => NODE_KINDS[k].tier >= 2)));
});

test('tools: one of each kind, craftable from what you find by hand, the pick in two tiers', () => {
  const tools = ITEM_DEFINITIONS.filter(d => d.category === 'tool');
  for (const kind of Object.keys(TOOL_KINDS)) assert.ok(tools.some(d => d.tool.kind === kind), `a ${kind}`);
  assert.deepEqual([...new Set(tools.filter(d => d.tool.kind === 'pick').map(d => d.tool.tier))].sort(), [1, 2]);
  for (const id of ['woodAxe', 'stonePick', 'hoe']) {
    const r = RECIPES.find(x => x.result === id); assert.ok(r, `${id}: a recipe`);
    assert.ok(r.needs.every(([i]) => ['wood', 'stone', 'sweetleaf'].includes(i)) && !r.coins, `${id}: made from hand-gathered things`);
  }
  for (const t of tools) assert.equal(get(t.id).stackable, false, `${t.id}: tools don't stack`);
  assert.ok(SHOP.stock.some(s => s.item === 'hoe') && SHOP.stock.some(s => get(s.item).category === 'seed'), 'Pim sells a hoe and seeds');
  assert.equal(toolCheck({ tool: 'pick', tier: 2 }, { kind: 'pick', tier: 1 }), 'weak');
  assert.equal(toolCheck({ tool: 'pick', tier: 2 }, { kind: 'pick', tier: 2 }), 'ok');
  assert.equal(toolCheck({ tool: 'axe', tier: 1 }, { kind: 'pick', tier: 2 }), 'none');
  assert.equal(toolCheck({}, null), 'ok', 'by hand needs nothing');
  const list = [{ def: get('stonePick'), slot: 0 }, { def: get('copperPick'), slot: 4 }, { def: get('honeyBun'), slot: 1 }];
  assert.equal(bestTool('pick', list).slot, 4); assert.equal(bestTool('rod', list), null);
});

test('drops and catches roll as configured', () => {
  const rng = seeded(7), totals = {};
  for (let i = 0; i < 500; i++) for (const [item, n] of rollDrops(NODE_KINDS.sweetleaf.drops, NODE_KINDS.sweetleaf.extra, rng)) totals[item] = (totals[item] ?? 0) + n;
  assert.ok(totals.sweetleaf >= 500 && totals.sweetleaf <= 1000 && totals.carrotSeeds > 50 && totals.pumpkinSeeds < totals.carrotSeeds);
  assert.deepEqual(rollDrops([['stone', [0, 0]]], [], rng), [], 'zero counts are left out');
  let koiPond = 0, koiLake = 0;
  for (let i = 0; i < 4000; i++) { if (rollCatch(0, false, rng) === 'goldenKoi') koiPond++; if (rollCatch(0, true, rng) === 'goldenKoi') koiLake++; }
  assert.ok(koiPond > 0 && koiLake > koiPond * 2, `a lake makes the koi likelier (${koiPond} -> ${koiLake})`);
  PLANETS.forEach((p, i) => { for (const [item] of FISHING.catches[i]) assert.ok(get(item)?.tags.includes('fish'), `${p.name}: fish ${item}`); });
  const easy = catchFeel('pondPerch'), hard = catchFeel('goldenKoi');
  assert.ok(hard.zone < easy.zone && hard.sweeps > easy.sweeps, 'the koi is harder to reel in');
  assert.equal(needleAt(0, 1), 0); assert.ok(Math.abs(needleAt(0.5, 1) - 0.5) < 1e-9); assert.equal(needleAt(1, 1), 1); assert.ok(Math.abs(needleAt(1.25, 1) - 0.75) < 1e-9);
  assert.ok(inZone(0.5, 0.5, 0.2) && inZone(0.59, 0.5, 0.2) && !inZone(0.62, 0.5, 0.2));
});

test('farming: crops grow from seeds into food over days of watering; rain is real weather', () => {
  for (const [id, c] of Object.entries(CROPS)) {
    const seed = get(c.seed); assert.ok(seed?.category === 'seed' && seed.props.crop === id, `${id}: its seeds`);
    assert.ok(c.days > 0.2 && c.days < 3 && c.harvest.every(([i]) => get(i)) && c.look.fruit !== undefined, `${id}: shape`);
    assert.ok(c.harvest[0][1][0] >= 1, `${id}: always gives something`);
    assert.ok(Math.abs(growthFor(id, c.days * 300, 300) - 1) < 1e-9, `${id}: full growth after ${c.days} days`);
  }
  assert.deepEqual([0, 0.3, 0.7, 1].map(cropStage), [0, 1, 2, 3]);
  for (const w of FARM.rainWaters) assert.ok(WEATHER_KINDS[w], `rain kind ${w}`);
  assert.ok(FARM.grid[0] * FARM.grid[1] >= 4 && FARM.distance[0] > 10);
  for (const id of ['moonCarrot', 'sunWheat', 'pumpkin']) assert.ok(RECIPES.some(r => r.needs.some(([i]) => i === id)), `${id}: cooked into something`);
});

test('equipment: head, body, feet, weapon, two trinkets and two vanity slots; every kind has a home and something to wear', () => {
  assert.equal(Object.keys(EQUIP_SLOTS).length, 8);
  assert.equal(Object.values(EQUIP_SLOTS).filter(s => s.fits === 'charm').length, 2, 'two trinket slots');
  for (const k of Object.keys(GEAR_KINDS)) {
    assert.ok(Object.values(EQUIP_SLOTS).some(s => s.fits === k), `${k}: a worn slot`);
    assert.ok(ITEM_DEFINITIONS.filter(d => d.equip?.slot === k).length >= (GEAR_KINDS[k].vanity ? 2 : 3), `${k}: pieces to wear`);
  }
  const ui = readFileSync(new URL('../src/ui/InventoryUI.js', import.meta.url), 'utf8');
  for (const k of Object.keys(EQUIP_SLOTS)) assert.match(ui, new RegExp(`'${k}'`), `the equipment side lays out ${k}`);
});

test('every planet can supply what it asks for: its gathered items are real and some are its own', () => {
  const sets = PLANETS.map((p, i) => planetSources(i));
  for (const s of sets) for (const id of s) assert.ok(get(id), `source item ${id}`);
  for (const s of sets) for (const id of ['wood', 'stone', 'sweetleaf']) assert.ok(s.has(id));
  assert.ok(sets[1].has('firePepper') && !sets[0].has('firePepper'), 'fire peppers are Emberfall\'s');
  assert.ok(sets[2].has('snowPlum') && sets[2].has('frostDiamond') && !sets[0].has('frostDiamond'), 'snow plums and frost diamonds are Frostveil\'s');
});
