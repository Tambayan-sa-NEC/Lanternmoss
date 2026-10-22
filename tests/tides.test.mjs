import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import tidewhisper from '../src/config/planets/tidewhisper.js';
import { DAY } from '../src/config/day.js';
import { tideAt, tides } from '../src/world/mechanics/tides.js';
import { mechanicDefinition, cleanMechanicSnapshot } from '../src/world/mechanics/index.js';
import { archipelagoLayout } from '../src/world/archipelago.js';
import { setTerrain, addFlat, bakeTerrain, groundHeight, dryGround, ponds, waterAt } from '../src/world/terrain.js';
import { configurePhysics, setPhysics, seaLevelAt, waterRegions } from '../src/world/physics.js';
import { offsetDir } from '../src/utils/sphere.js';
const spawn = new THREE.Vector3(0,1,0), near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('one 1.5 m cycle per adventure day: afternoon low, night high, bounded and periodic',()=>{
  const c=tidewhisper.tides;near(tideAt(0.4*DAY.length,c).level,71);near(tideAt(0.9*DAY.length,c).level,72.5);
  assert.equal(tideAt(0.4*DAY.length,c).label,'Low tide');assert.equal(tideAt(0.9*DAY.length,c).label,'High tide');
  for(let s=0;s<DAY.length;s+=0.5){const t=tideAt(s,c);assert.ok(t.level>=71&&t.level<=72.5);near(t.level,tideAt(s+DAY.length*1000,c).level);}
  assert.equal(mechanicDefinition('tides'),tides);
});
test('archipelago is mostly sea, with protected land and a sandbar that opens only at low water',()=>{
  ponds.length=0;setTerrain(tidewhisper.terrain,tidewhisper.seed);const layout=archipelagoLayout(tidewhisper.terrain.archipelago,spawn);
  addFlat(spawn,27,10,4.5);addFlat(layout.farmDir,7,3,4.5);bakeTerrain();configurePhysics(tidewhisper.physics);
  assert.ok(dryGround(spawn,25,{high:true}));assert.ok(dryGround(layout.farmDir,5,{high:true}));assert.ok(dryGround(layout.causeway));
  const heights=Array.from({length:200},(_,i)=>groundHeight(offsetDir(spawn,i*2.399963,Math.acos(1-2*(i+.5)/200)*72)));
  assert.ok(heights.filter(h=>h<71).length>120,'majority of the globe must be submerged');
  setPhysics({seaLevel:72.5});assert.ok(waterAt(layout.causeway)?.depth>0.95);assert.equal(dryGround(layout.causeway),false);
  setTerrain(tidewhisper.terrain,tidewhisper.seed);addFlat(spawn,27,10,4.5);addFlat(layout.farmDir,7,3,4.5);bakeTerrain();
  assert.deepEqual(Array.from({length:200},(_,i)=>groundHeight(offsetDir(spawn,i*2.399963,Math.acos(1-2*(i+.5)/200)*72))),heights);
  configurePhysics();
});
test('local lagoon water overrides the ocean within its declared envelope and resets without leaking',()=>{
  const dir=new THREE.Vector3(0,1,0);
  configurePhysics({seaLevel:72.5,seaMaxLevel:72.5,waterRegions:[{id:'lagoon',dir:[0,1,0],radius:18,level:72.5,maxLevel:72.5}]});
  setPhysics({regions:{lagoon:68.8}});near(seaLevelAt(dir),68.8);near(seaLevelAt(offsetDir(dir,0,30)),72.5);near(seaLevelAt(dir,true),72.5);
  assert.throws(()=>setPhysics({regions:{lagoon:73}}),/envelope/);assert.throws(()=>setPhysics({regions:{missing:70}}),/envelope/);
  configurePhysics();assert.equal(seaLevelAt(dir),null);assert.deepEqual(waterRegions(),[]);
  for(const region of [{id:'x',dir:null,radius:2},{id:'x',dir:[0,0,0],radius:2},{id:'x',dir:[0,1,0],radius:100}])assert.throws(()=>configurePhysics({waterRegions:[region]}),/region/);
  configurePhysics();
});
test('lagoon controls clean saved timers, expire on time skips and never change the daily tide phase',()=>{
  let clock=120;const applied=[];const env={clock:()=>clock,planet:tidewhisper,world:{coast:archipelagoLayout(tidewhisper.terrain.archipelago,spawn),physics:{set:v=>applied.push(v)},syncPhysics(){}}};
  const m=tides.create(env);m.load({drainRemaining:Infinity});m.enter();assert.deepEqual(m.toJSON(),{drainRemaining:0});
  assert.ok(m.drainLagoon());assert.equal(applied.at(-1).regions.lagoon,68.8);assert.equal(m.drainLagoon(-1),false);
  clock+=15;m.advance(15);near(m.toJSON().drainRemaining,25);near(applied.at(-1).seaLevel,tideAt(clock,tidewhisper.tides).level);
  const saved=cleanMechanicSnapshot({id:'tides',state:{drainRemaining:25,injected:true},at:clock},'tides');assert.deepEqual(saved.state,{drainRemaining:25});
  const restored=tides.create(env);restored.load(saved.state);restored.advance(1000);assert.equal(restored.toJSON().drainRemaining,0);
  restored.drainLagoon(10);restored.refloodLagoon();assert.equal(restored.toJSON().drainRemaining,0);
});
