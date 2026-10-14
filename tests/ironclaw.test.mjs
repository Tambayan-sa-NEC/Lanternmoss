import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import tide from '../src/config/planets/tidewhisper.js';
import { COMBAT } from '../src/config/combat.js';
import { MINI_BOSS_LOOT } from '../src/config/chests.js';
import { NODE_KINDS } from '../src/config/resources.js';
import { BESTIARY_ENTRIES } from '../src/config/bestiary.js';

test('Old Ironclaw: Tidewhisper\'s own mini boss guards the pearl beds and drops black pearls',()=>{
  const d=COMBAT.enemies.ironclaw;
  assert.deepEqual(tide.miniBosses,[{type:'ironclaw',near:'pearlBeach'}]);assert.equal(d.miniBoss,true);assert.equal(d.behavior,'ironclaw');
  assert.deepEqual(d.phases.map(p=>p.below),[1,0.66,0.33],'shell swaps at 66% and 33%');
  assert.ok(d.guarded>0&&d.guarded<1&&d.openBonus>0,'guarded face, bonus while open');
  assert.equal(NODE_KINDS.blackPearlBed.guardedBy,'ironclaw');assert.deepEqual(MINI_BOSS_LOOT.extra.ironclaw,[['blackPearl',2]]);
  const page=BESTIARY_ENTRIES.ironclaw;assert.ok(page.lore&&page.blurb&&page.attacks.length>=3&&page.counters.length>=3&&page.drops);
  for(const a of Object.values(d.attacks))assert.ok(a.windup>0&&a.recover>0&&a.cooldown>0,'every move is telegraphed and leaves a window');
  assert.ok(d.bellRing.delay>0&&d.bellRing.cooldown>0,'the bell glows before it rings and rests between rings');
});

test('the bell covers the back, sides and top; only the front cone is its face',async()=>{
  await import('./sim/lib/setup.mjs');
  const { hitZone, isOpen }=await import('../src/entities/enemies/behaviors/boss/ironclaw.js');
  const up=new THREE.Vector3(0,1,0),e={up,pos:up.clone().multiplyScalar(72),fwd:new THREE.Vector3(0,0,1),radius:1.5,state:'chase',openT:0,def:COMBAT.enemies.ironclaw};
  const at=(x,z)=>new THREE.Vector3(x,72,z);
  assert.equal(hitZone(e,at(0,4)),'face');assert.equal(hitZone(e,at(3,1.5)),'face','60 degrees off');
  assert.equal(hitZone(e,at(4,0)),'bell','beside it');assert.equal(hitZone(e,at(0,-4)),'bell','behind it');
  assert.equal(hitZone(e,at(0,0.5)),'bell','on top');assert.equal(hitZone(e,null),'none');
  assert.equal(isOpen(e),false);e.openT=1;assert.equal(isOpen(e),true,'wedged');e.openT=0;e.state='transition';assert.equal(isOpen(e),true,'swapping shells');
});
