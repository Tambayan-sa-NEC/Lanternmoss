import {test} from 'node:test';
import assert from 'node:assert/strict';
import {washCycle,lowTide,COASTAL_RECIPES} from '../src/config/coastalResources.js';
import {DAY} from '../src/config/day.js';
import {Inventory} from '../src/inventory/Inventory.js';
import {itemRegistry} from '../src/items/ItemRegistry.js';
import {craft} from '../src/items/crafting.js';
import {rollGear} from '../src/gameplay/loot.js';
import {cleanState} from '../src/core/save.js';

test('washup batches advance once at the high crest; multi-day skips expose only the newest cycle',()=>{
  assert.equal(washCycle(.89*DAY.length),0);assert.equal(washCycle(.9*DAY.length),1);
  assert.equal(washCycle(1.4*DAY.length),1);assert.equal(washCycle(8.4*DAY.length),8);
  assert.ok(lowTide(.4*DAY.length));assert.ok(!lowTide(.9*DAY.length));
});
test('Tide recipes own their acquisition; random Act I rewards cannot leak Tide gear',()=>{
  for(const hero of ['witch','knight','ranger'])for(let planet=0;planet<3;planet++)for(let i=0;i<500;i++)
    assert.notEqual(itemRegistry.get(rollGear(planet,hero,'boss',()=>i/500).item).props.set,'tide');
});
test('washup save claims are optional v1 fields, bounded and idempotently cleaned',()=>{
  const base={delta:true,at:4,nodes:[{id:'lanternmoss:node:2',regrowT:0,claimedCycle:12.7},{id:'lanternmoss:node:3',regrowT:0,claimedCycle:-100}],rest:{},tipsShown:[]};
  const clean=cleanState('gathering',base);assert.equal(clean.nodes[0].claimedCycle,12);assert.equal(clean.nodes[1].claimedCycle,-1);
  assert.deepEqual(cleanState('gathering',clean),clean);
  delete base.nodes[0].claimedCycle;assert.ok(!Object.hasOwn(cleanState('gathering',base).nodes[0],'claimedCycle'));
});
test('coastal food and every Tide piece consume real ingredients and enforce their station',()=>{
  for(const recipe of COASTAL_RECIPES){
    const inv=new Inventory(24,itemRegistry);for(const [id,n] of recipe.needs)inv.add(id,n);if(recipe.fuel)inv.add('wood',recipe.fuel);
    const before=inv.getSlots();assert.equal(craft(recipe,inv,0,()=>false,null).problem,'station');assert.deepEqual(inv.getSlots(),before);
    assert.ok(craft(recipe,inv,0,()=>false,recipe.station).ok);assert.equal(inv.count(recipe.result),1);
    for(const [id] of recipe.needs)assert.equal(inv.count(id),0);
    const item=itemRegistry.get(recipe.result);if(item.equip)assert.equal(item.props.set,'tide');else assert.ok(item.use.length);
  }
});
