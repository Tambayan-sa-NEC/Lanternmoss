import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BUILDING, PLACEABLES } from '../src/config/placeables.js';
import { RECIPES } from '../src/config/crafting.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { cleanState } from '../src/core/save.js';
import { Inventory } from '../src/inventory/Inventory.js';
import { transferStack, quickStack } from '../src/inventory/storage.js';
import { buildingFootprint, footprintsOverlap, snapBuildingDir } from '../src/gameplay/buildingRules.js';
import { dirAlong, tangentFrame } from '../src/utils/sphere.js';

test('every 25b placeable remains craftable, with all four stations alongside the new structures', () => {
  const garden=Object.entries(PLACEABLES).filter(([,d])=>!d.structure); assert.equal(garden.length,14);   // 13 of 25b and the pet basket (TODO 35)
  for (const [id, def] of Object.entries(PLACEABLES)) {
    assert.ok(itemRegistry.has(id)); const recipe = RECIPES.find(r => r.result === id);
    assert.ok(recipe && !recipe.discovery && !recipe.hero); assert.ok(def.radius > 0 && def.height > 0);
  }
  assert.deepEqual(Object.values(PLACEABLES).flatMap(p => p.crafting ? [p.crafting] : []).sort(), ['brew', 'forge', 'pot', 'workbench']);
  assert.ok(!garden.some(([id]) => /wall|roof|floor/i.test(id)));
});
test('grid snapping is normalized, deterministic, idempotent and usable at poles and cube-face edges', () => {
  for (const xyz of [[0,1,0], [1,0,0], [-1,-1,-1], [0.009,1,-0.029], [0.999,1,0.22]]) {
    const d = new THREE.Vector3(...xyz).normalize(), snapped = snapBuildingDir(d);
    assert.ok(Math.abs(snapped.length() - 1) < 1e-12); assert.ok(snapped.distanceTo(d) < 0.015);
    assert.ok(snapBuildingDir(snapped).distanceTo(snapped) < 1e-12);
  }
});
test('rotated fences reserve thin footprints; adjacent rails and path tiles can join without overlap', () => {
  const dir = new THREE.Vector3(0,1,0), [fwd, side] = tangentFrame(dir);
  const a = buildingFootprint('gardenFence', dir), rotated = buildingFootprint('gardenFence', dir, 1);
  assert.ok(a[0].dir.distanceTo(rotated[0].dir) > 0.01);
  assert.equal(footprintsOverlap(a, buildingFootprint('gardenFence', dirAlong(dir, side, 2))), false);
  assert.equal(footprintsOverlap(a, buildingFootprint('gardenFence', dirAlong(dir, fwd, 0.3))), true);
  assert.equal(footprintsOverlap(buildingFootprint('stonePath', dir), buildingFootprint('stonePath', dirAlong(dir, fwd, 1))), false);
});
test('storage transfers are bounded by capacity, keep gear data and never remove items on failure', () => {
  const bag = new Inventory(3), chest = new Inventory(1);
  bag.add('wood', 20); chest.add('wood', 38);
  assert.equal(transferStack(bag,chest,0),2); assert.equal(bag.count('wood'),18); assert.equal(chest.count('wood'),40);
  const before = bag.toJSON(); assert.equal(transferStack(bag,chest,0),0); assert.deepEqual(bag.toJSON(),before);
  chest.clear(); bag.clear(); bag.add('emberAxe',1,{ rarity:'rare', enchantment:'emberRune' });
  assert.equal(transferStack(bag,chest,0,1),1); assert.deepEqual(chest.getSlot(0).props,{rarity:'rare',enchantment:'emberRune'});
  assert.equal(transferStack(chest,chest,0),0);
});
test('quick stacking keeps the hotbar, matches properties and spans multiple nearby stores', () => {
  const bag = new Inventory(5), a = new Inventory(2), b = new Inventory(1);
  bag.insertAt(0,'wood',5); bag.insertAt(1,'wood',20); bag.insertAt(2,'stone',7); bag.insertAt(3,'emberAxe',1,{rarity:'rare'});
  a.add('wood',39); b.add('wood',39); a.add('emberAxe',1,{rarity:'common'});
  assert.equal(quickStack(bag,[a,b],1),2); assert.equal(bag.getSlot(0).quantity,5);
  assert.equal(bag.count('wood'),23); assert.equal(bag.count('stone'),7); assert.equal(bag.count('emberAxe'),1);
});
test('sorting merges only compatible bag stacks, preserves the hotbar and emits no collection rewards', () => {
  const bag = new Inventory(8); bag.insertAt(0,'wood',4); bag.insertAt(2,'wood',6); bag.insertAt(4,'wood',39);
  bag.insertAt(3,'emberAxe',1,{rarity:'rare'}); bag.insertAt(6,'emberAxe',1,{rarity:'common'});
  let added=0, removed=0; bag.addEventListener('itemadded',()=>added++); bag.addEventListener('itemremoved',()=>removed++);
  assert.ok(bag.sort(1)); assert.deepEqual(bag.getSlot(0),{itemId:'wood',quantity:4,props:null});
  assert.equal(bag.count('wood'),49); assert.equal(bag.count('emberAxe'),2);
  assert.deepEqual(bag.getSlots().slice(1).filter(s=>s?.itemId==='wood').map(s=>s.quantity),[40,5]);
  assert.equal(added+removed,0); const sorted=bag.toJSON(); bag.sort(1); assert.deepEqual(bag.toJSON(),sorted);
});
test('building save cleaning rejects unknown/duplicate IDs and malformed positions, cleans storage and farm state', () => {
  const chest={id:1,itemId:'storageChest',dir:[0,2,0],turn:-1,slots:[{itemId:'wood',quantity:999,props:{injected:true}}]};
  const plot={id:2,itemId:'farmPlot',dir:[1,0,0],plot:{crop:'carrot',growth:2,watered:true}};
  const cleaned=cleanState('building',[chest,chest,plot,{id:3,itemId:'wall',dir:[0,1,0]}, {id:4,itemId:'homeBed',dir:[0,0,0]}, {id:5,itemId:'homeBed',dir:[NaN,1,0]}]);
  assert.equal(cleaned.length,2); assert.deepEqual(cleaned[0].dir,[0,1,0]); assert.equal(cleaned[0].turn,3);
  assert.equal(cleaned[0].slots.length,BUILDING.storageSlots); assert.equal(cleaned[0].slots[0].quantity,40); assert.equal(cleaned[0].slots[0].props,null);
  assert.deepEqual(cleaned[1].plot,{tilled:true,crop:'carrot',growth:1,watered:true}); assert.deepEqual(cleanState('building',null),[]);
});
