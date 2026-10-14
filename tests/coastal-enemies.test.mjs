import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import tide from '../src/config/planets/tidewhisper.js';
import { COMBAT } from '../src/config/combat.js';
import { MONSTER_DROPS } from '../src/config/chests.js';
import { BESTIARY_ENTRIES } from '../src/config/bestiary.js';
import { PLANET_CATALOG } from '../src/config/planets.js';
import { rosterPopulation } from '../src/config/planetRules.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';

test('Tidewhisper roster: three exclusive sea monsters with their own modules, one returning sea-green wisp, a full population',()=>{
  const types=tide.roster.map(g=>g.type),elsewhere=new Set(PLANET_CATALOG.filter(p=>p.id!=='tidewhisper').flatMap(p=>(p.roster??[]).map(g=>g.type)));
  assert.deepEqual(types.filter(t=>!elsewhere.has(t)),['shellback','jellybell','surfSkipper']);assert.deepEqual(types.filter(t=>elsewhere.has(t)),['wisp']);
  assert.deepEqual(['shellback','jellybell','surfSkipper'].map(t=>COMBAT.enemies[t].ai),['armoured','drifter','amphibian']);
  const frostveil=PLANET_CATALOG.find(p=>p.id==='frostveil');assert.ok(rosterPopulation(tide)>=rosterPopulation(frostveil),'at least the previous world\'s population');
  assert.deepEqual(tide.roster.map(g=>g.near??null),['beach','shallows','surf',null]);
  assert.equal(tide.roster[3].overrides.color,0x5fe8c0);assert.equal(COMBAT.enemies.wisp.color,0xb27cff,'the original wisp keeps its colour');
  for(const t of ['shellback','jellybell','surfSkipper']){
    const page=BESTIARY_ENTRIES[t];assert.ok(page.name&&page.blurb&&page.attacks.length&&page.counters.length&&page.drops,`${t} page`);
    const extra=MONSTER_DROPS.extra[t];assert.ok(extra.chance>0&&extra.chance<1&&extra.items.every(([id])=>itemRegistry.get(id)),`${t} drop`);
  }
  assert.equal(tide.released,false,'the world stays unreleased until 27h');
});

test('the Shellback plate refuses only directed hits from its front cone, and not while dazed',async()=>{
  await import('./sim/lib/setup.mjs');
  const { plateBlocks }=await import('../src/entities/enemies/behaviors/armoured.js');
  const up=new THREE.Vector3(0,1,0),e={up,pos:up.clone().multiplyScalar(72),fwd:new THREE.Vector3(0,0,1),radius:0.75,stunnedT:0,def:COMBAT.enemies.shellback};
  const at=(x,z)=>new THREE.Vector3(x,72,z);
  assert.equal(plateBlocks(e,at(0,3)),true,'straight ahead');assert.equal(plateBlocks(e,at(2.5,1.4)),true,'60 degrees off');
  assert.equal(plateBlocks(e,at(3,0)),false,'beside it');assert.equal(plateBlocks(e,at(0,-3)),false,'behind it');
  assert.equal(plateBlocks(e,at(0,0.2)),false,'right on top of it');assert.equal(plateBlocks(e,undefined),false,'no direction');
  e.stunnedT=1;assert.equal(plateBlocks(e,at(0,3)),false,'dazed');
});
