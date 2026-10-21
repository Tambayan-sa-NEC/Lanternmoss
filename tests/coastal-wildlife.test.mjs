import test from 'node:test';
import assert from 'node:assert/strict';
import tidewhisper from '../src/config/planets/tidewhisper.js';
import { TREE_KINDS } from '../src/config/flora.js';
import { CRITTER_DEFS } from '../src/config/critters.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { cleanState } from '../src/core/save.js';
import { coastalActivity } from '../src/config/coastalWildlife.js';
test('coastal configuration covers distinct plants, bounded counts and known rare-gift equipment',()=>{
  assert.deepEqual(Object.keys(tidewhisper.flora.coastal.trees),['lanternPalm','kelp','coralFan']);
  assert.deepEqual(Object.keys(tidewhisper.flora.coastal.plants),['duneGrass','seaThrift','seaLavender']);
  assert.ok(Object.values(tidewhisper.flora.coastal.trees).reduce((a,b)=>a+b,0)<=40);
  assert.equal(TREE_KINDS.coralFan.wood,false);assert.equal(TREE_KINDS.kelp.wood,false);assert.notEqual(TREE_KINDS.lanternPalm.wood,false);
  const turtle=CRITTER_DEFS.pearlTurtle,item=ITEM_DEFINITIONS.find(i=>i.id===turtle.rare.gift);
  assert.equal(item.equip.slot,'charm');assert.ok(item.equip.stats.armor>0&&item.equip.stats.manaRegen>0);
  assert.deepEqual(cleanState('rareGifts',['pearlOfDeep','unknown','pearlOfDeep']),['pearlOfDeep']);
  assert.ok(tidewhisper.wildlife.shoals*tidewhisper.wildlife.fishPerShoal+tidewhisper.wildlife.lanternfish<=32);
});
test('ambient schedules distinguish shell hiding, flooded recovery, basking/swimming and seal loafing/barking',()=>{
  assert.equal(coastalActivity('crab','noon'),'scuttle');assert.equal(coastalActivity('crab','noon',{near:true}),'hide');
  assert.equal(coastalActivity('crab','noon',{near:true,flooded:true}),'return');
  assert.equal(coastalActivity('turtle','noon'),'bask');assert.equal(coastalActivity('turtle','night'),'swim');
  assert.equal(coastalActivity('seal','morning'),'nap');assert.equal(coastalActivity('seal','evening'),'loaf');
  assert.equal(coastalActivity('seal','morning',{near:true}),'bark');assert.equal(coastalActivity('seal','night',{flooded:true}),'return');
});
