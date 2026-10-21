import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import duskhollow from '../src/config/planets/duskhollow.js';
import { CRITTER_DEFS } from '../src/config/critters.js';
import { TREE_KINDS } from '../src/config/flora.js';
import { ITEM_DEFINITIONS, ITEM_EFFECTS } from '../src/config/items.js';
import { FIREFLIES, LANTERN } from '../src/config/lantern.js';
import { canopyCover, canopyLayout, lantern, underCanopy } from '../src/world/mechanics/lantern.js';
import { offsetDir } from '../src/utils/sphere.js';

const spawn = new THREE.Vector3(0, 1, 0);
const layout = canopyLayout(duskhollow.canopy, spawn);
const item = id => ITEM_DEFINITIONS.find(i => i.id === id);
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('the canopy closes everywhere except its gaps and the village', () => {
  assert.ok(underCanopy(offsetDir(spawn, 1.75, 160), layout), 'the deep hollow is roofed');
  assert.equal(underCanopy(spawn, layout), false, 'nothing grows over the village gap');
  for (const gap of layout.gaps) assert.equal(underCanopy(gap.dir, layout), false, 'nor over a gap of starlight');
  // Where a giant cap may grow, the dusk is at full strength: the canopy and the light agree.
  for (let a = 0; a < 6.28; a += 0.35) for (const m of [30, 70, 120, 170]) {
    const d = offsetDir(spawn, a, m);
    if (underCanopy(d, layout)) near(canopyCover(d, layout), layout.cover, 1e-9);
  }
});

test('Duskhollow plants and animals are complete and bounded', () => {
  for (const kind of Object.keys(duskhollow.flora.trees)) assert.ok(TREE_KINDS[kind], `unknown tree ${kind}`);
  assert.equal(TREE_KINDS.lumenCap.wood, false); assert.equal(TREE_KINDS.glowcap.wood, false);
  const C = duskhollow.flora.canopy;
  for (const [field, cap] of [['caps', 40], ['glowcaps', 90], ['ferns', 40], ['moonflowers', 40]])
    assert.ok(Number.isInteger(C[field]) && C[field] > 0 && C[field] <= cap, `${field} must be a bounded count`);
  for (const [key, , where] of duskhollow.wildlife.critters) {
    const def = CRITTER_DEFS[key];
    assert.ok(def, `unknown critter ${key}`); assert.equal(def.build && typeof def.build, 'string');
    assert.ok(def.speed > 0 && def.radius > 0, `${key} needs a speed and a size`);
    if (where) assert.equal(where, 'caps');
    if (def.hang) assert.ok(def.hang > 0 && def.hang < 4 && def.wingbeat > 0, `${key} hangs in the air and beats its wings`);
  }
  assert.ok(FIREFLIES.count > 0 && FIREFLIES.count <= 16 && FIREFLIES.away > 0, 'swarms are counted and come back on a timer');
  assert.equal(duskhollow.wildlife.fireflies, FIREFLIES.count);
  assert.equal(duskhollow.wildlife.rare, 'moonmoth');
  assert.ok((duskhollow.wildlife.fish ?? []).length >= 1, 'the glowing pools hold pale blind fish');
});

test('a firefly jar pours oil and the Moonmoth Wing is the lantern charm', () => {
  const jar = item(FIREFLIES.jar);
  assert.ok(jar && jar.category === 'consumable', 'the jar is a usable item');
  const oil = jar.use.find(u => u.effect === 'oil');
  assert.ok(oil && oil.amount > 0 && oil.amount <= LANTERN.oil.max, 'it pours a bounded amount of oil');
  assert.ok(ITEM_EFFECTS.oil, 'the oil effect has a label for the tooltip');
  const wing = item(LANTERN.charm.item);
  assert.ok(wing && wing.equip?.slot === 'charm', 'the charm is worn in a trinket slot');
  assert.equal(CRITTER_DEFS.moonmoth.rare.gift, LANTERN.charm.item, 'the Moonmoth gives exactly that charm');
  assert.ok(LANTERN.charm.radius > 1 && LANTERN.charm.radius <= 2, 'it widens the light without flooding the world');
});

test('the charm widens a lit lantern, and never changes the safe ember', () => {
  const player = { up: offsetDir(spawn, 1.75, 160), equipment: { charm: null, charm2: null } };
  const env = { clock: () => 0, planet: duskhollow, world: { spawnDir: spawn, canopy: layout }, player, indoors: false };
  const m = lantern.create(env); m.load(null); m.enter();
  const plain = m.status.radius;
  assert.equal(m.status.charm, false);
  player.equipment.charm2 = { itemId: LANTERN.charm.item, props: null };
  near(m.status.radius / plain, LANTERN.charm.radius, 1e-9);
  assert.equal(m.status.charm, true);
  m.burn(LANTERN.oil.max);                                           // empty: the ember stays exactly as safe as before
  const ember = m.status.radius;
  player.equipment.charm2 = null;
  near(m.status.radius, ember, 1e-9);
  assert.ok(ember <= LANTERN.light.emberRadius + 1e-9 && ember > 0);
  m.exit();
});
