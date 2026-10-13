import {test} from 'node:test';
import assert from 'node:assert/strict';
import tide from '../src/config/planets/tidewhisper.js';
import {QUESTS} from '../src/config/quests.js';
import {TRAVELER_NAMES} from '../src/config/npcs.js';
import {itemRegistry} from '../src/items/ItemRegistry.js';
import {NODE_KINDS} from '../src/config/resources.js';
test('coastal village references two public interiors, a keeper, traveler reactions and real lens/fuel ingredients',()=>{
  const keeper=tide.npcs.locals[0];assert.equal(keeper.name,'Marlo');assert.equal(tide.houses[keeper.home].owner,keeper.name);
  assert.equal(Object.values(tide.houses).filter(Boolean).length,2);for(const name of TRAVELER_NAMES)assert.ok(tide.npcs.arrivals[name].t);
  const q=QUESTS.darkLighthouse;assert.equal(q.planet,'tidewhisper');assert.deepEqual(q.steps.filter(s=>s.kind==='deliver').map(s=>s.item),['seaglass','wood']);
  for(const s of q.steps)if(s.item)assert.ok(itemRegistry.get(s.item));
  for(const step of q.steps.filter(s=>s.kind==='collect')){
    const total=tide.resources.nodes.reduce((sum,[kind,n])=>sum+n*NODE_KINDS[kind].drops.filter(([id])=>id===step.item).reduce((s,[,q])=>s+(Array.isArray(q)?q[0]:q),0),0);
    assert.ok(total>=step.count,`${step.item} has enough actual coastal sources`);
  }
  assert.deepEqual(tide.boss.summon,{level:8,quest:'darkLighthouse',lowTide:true});assert.equal(tide.released,false);
});
