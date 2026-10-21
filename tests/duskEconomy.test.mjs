// No browser stubs: Duskhollow's economy, weather rules and set bonuses are pure data and pure rules (TODO 30c).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import duskhollow from '../src/config/planets/duskhollow.js';
import { CROPS, NODE_KINDS, SHADE_CROP_REFUSAL } from '../src/config/resources.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { RECIPES } from '../src/config/crafting.js';
import { SETS } from '../src/config/sets.js';
import { WEATHER_KINDS } from '../src/config/weather.js';
import { MUSIC_THEMES } from '../src/config/music.js';
import { LANTERN } from '../src/config/lantern.js';
import { BALANCE } from '../src/config/balance.js';
import { DAY } from '../src/config/day.js';
import { setEffects } from '../src/items/sets.js';
import { canopyLayout, lantern } from '../src/world/mechanics/lantern.js';

const item = id => ITEM_DEFINITIONS.find(d => d.id === id);
const recipe = id => RECIPES.find(r => r.result === id);
const spawn = new THREE.Vector3(0, 1, 0);
const layout = canopyLayout(duskhollow.canopy, spawn);
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

/** A mechanic instance over a stand-in world, so the rules can be read without a scene. */
function instance({ clock = 0, weather = {}, pieces = [] } = {}) {
  const env = { now: clock, clock: () => env.now, planet: duskhollow, indoors: false,
    world: { spawnDir: spawn, canopy: layout, weather: { now: weather } },
    player: { up: spawn.clone(), equipment: {}, stats: { setFx: setEffects(pieces.map(id => ({ def: item(id) })), 'witch') } } };
  const m = lantern.create(env); m.load(null); m.enter();
  return { m, env };
}

test('every Duskhollow node, forage and material is a real item, and the moonstone vein is guarded', () => {
  for (const [kind] of duskhollow.resources.nodes) assert.ok(NODE_KINDS[kind], `unknown node ${kind}`);
  for (const [kind] of duskhollow.resources.rare) {
    const def = NODE_KINDS[kind];
    assert.ok(def?.rare && def.guardedBy, `${kind} must be a guarded rare vein`);
  }
  const drops = duskhollow.resources.nodes.concat(duskhollow.resources.rare)
    .flatMap(([kind]) => NODE_KINDS[kind].drops.map(([id]) => id));
  for (const id of drops.concat(duskhollow.forage.map(f => f.item), [duskhollow.material])) assert.ok(item(id), `unknown item ${id}`);
  assert.ok(NODE_KINDS.lumenVein.tool === 'pick' && NODE_KINDS.lumenVein.tier === 2, 'lumen ore needs an iron pickaxe');
  assert.equal(item(duskhollow.material).category, 'material');
  assert.ok(MUSIC_THEMES[duskhollow.music], 'its music box theme exists');
});

test('the lumen chain: ore smelts to ingots, glowcaps press into oil, and the Dusk set is craftable', () => {
  const ingot = recipe('lumenIngot');
  assert.equal(ingot.station, 'forge'); assert.ok(ingot.fuel > 0);
  assert.deepEqual(ingot.needs, [['lumenOre', 2]]);
  const oil = recipe('lumenOil');
  assert.equal(oil.station, 'brew');
  assert.ok(oil.needs.every(([id]) => item(id)));
  for (const piece of SETS.dusk.pieces) {
    const def = item(piece), made = recipe(piece);
    assert.ok(def?.equip?.tier === 3 && def.props.craftedOnly && def.props.set === 'dusk', `${piece} is crafted Dusk gear`);
    assert.ok(made && made.station === 'forge' && made.needs.every(([id]) => item(id)), `${piece} has a forge recipe`);
  }
  assert.deepEqual(BALANCE.budgets.at(-1), SETS.dusk.pieces, 'the coin budget reserves one Dusk set');
  // Everything that pours oil stays within the tank.
  for (const id of ['glowcap', 'fireflyJar', 'lumenOil']) {
    const pour = item(id).use.find(u => u.effect === 'oil');
    assert.ok(pour && pour.amount > 0 && pour.amount <= LANTERN.oil.max, `${id} pours a bounded amount`);
  }
  assert.ok(item('glowcap').action === 'use', 'a glowcap can be tipped straight into the lantern');
});

test('the Dusk set reaches the lantern: slower oil, longer reach', () => {
  const plain = instance(), two = instance({ pieces: ['duskHood', 'duskMantle'] }), three = instance({ pieces: ['duskHood', 'duskMantle', 'duskBoots'] });
  near(plain.m.status.radius, three.m.status.radius / 1.15, 1e-6);
  for (const kit of [plain, two, three]) kit.m.update(10);
  const spent = kit => LANTERN.oil.start - kit.m.status.oil;
  near(spent(plain), LANTERN.oil.burn * 10, 1e-6);
  near(spent(two), LANTERN.oil.burn * 10 * 0.6, 1e-6);
  near(spent(three), LANTERN.oil.burn * 10 * 0.4, 1e-6);
  assert.ok(spent(three) < spent(two) && spent(two) < spent(plain), 'more pieces, longer light');
  for (const kit of [plain, two, three]) kit.m.exit();
});

test('deep dark is a number from the weather and a rule in the mechanic', () => {
  assert.ok(WEATHER_KINDS.sporeDrift.spores > 0, 'spore drift drifts spores');
  const dark = WEATHER_KINDS.deepDark;
  assert.equal(dark.deepDark, 1);
  assert.ok(!('rain' in dark) && !('snow' in dark), 'it falls as nothing and waters nothing');
  for (const kind of Object.keys(duskhollow.weather)) {
    assert.ok(WEATHER_KINDS[kind], `unknown weather ${kind}`);
    assert.ok(!(WEATHER_KINDS[kind].rain > 0), 'no rain under the canopy');
  }
  const clear = instance(), deep = instance({ weather: { deepDark: 1 } });
  assert.ok(deep.m.status.darkness > clear.m.status.darkness, 'the dusk thickens');
  near(deep.m.status.darkness, clear.m.status.darkness + (1 - clear.m.status.darkness) * LANTERN.dusk.deepDark, 1e-9);
  near(deep.m.status.radius, clear.m.status.radius * (1 - LANTERN.light.deepDarkShrink), 1e-6);
  assert.ok(deep.m.status.darkness < 1, 'and never goes pitch dark');
  clear.m.exit(); deep.m.exit();
});

test('the dripping caps water the farm, and shade crops only take in the shade', () => {
  const morning = instance({ clock: (LANTERN.drip.from + 0.01) * DAY.length });
  const afternoon = instance({ clock: 0.5 * DAY.length });
  assert.equal(morning.m.status.watersFarm, true, 'the caps drip early in the day');
  assert.equal(afternoon.m.status.watersFarm, false, 'and are dry by the afternoon');
  assert.equal(morning.m.status.shaded, true);
  morning.m.exit(); afternoon.m.exit();
  const crop = CROPS[item('shadeSpores').props.crop];
  assert.ok(crop?.shade === true, 'shade spores grow the shade crop');
  assert.ok(crop.harvest.every(([id]) => item(id)), 'its harvest is real');
  assert.ok(SHADE_CROP_REFUSAL.length > 0, 'the farm has something to say when there is no shade');
  assert.ok(!Object.values(CROPS).filter(c => c !== crop).some(c => c.shade), 'the other crops are not shade crops');
});
