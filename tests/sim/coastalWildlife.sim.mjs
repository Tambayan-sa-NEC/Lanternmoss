import assert from 'node:assert/strict';
import { installCoastalFixture } from './lib/coastalFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture=installCoastalFixture(),{game,H,step}=await boot('witch',{wake:false});
const {ctx}=await imp('core/context.js'),{dayClock}=await imp('gameplay/dayClock.js'),{DAY}=await imp('config/day.js');
const {offsetDir,arcDist}=await imp('utils/sphere.js'),{waterAt,dryGround}=await imp('world/terrain.js');
const {rareTarget,RareGifts}=await imp('entities/wildlife/wildlife.js');
const {coastalWind,kelpVC}=await imp('render/coastalWind.js');
const {setSetting,resetSettings}=await imp('core/settings.js');
const {COASTAL_BUILDERS}=await imp('models/coastalCreatures.js');
const {computeStats}=await imp('gameplay/equipment.js');
const {bagCommands}=await imp('gameplay/bagCommands.js');
const W=game.world,P=H.player;
const phase=f=>dayClock.skip((f*DAY.length-dayClock.t+DAY.length)%DAY.length||DAY.length,'test');
const layout=()=>JSON.stringify(W.spots);
const rare=()=>H.critters.find(c=>c.defKey==='pearlTurtle');
const greet=()=>{const c=rare();P.placeAt(offsetDir(c.up,0,1.5));P.vel.set(0,0,0);c.update(.1);const target=rareTarget();assert.ok(target);target.run();};
try {
  H.Tutorial.skip();P.invuln=10000;phase(.4);step(.1);
  assert.equal(new Set(Object.values(COASTAL_BUILDERS)).size,4);
  for(const kind of ['lanternPalm','kelp','coralFan'])assert.ok(W.spots.trees.some(t=>t.kind===kind),`${kind} must be generated`);
  for(const key of ['hermitCrab','seaTurtle','harborSeal','pearlTurtle'])assert.ok(H.critters.some(c=>c.defKey===key),`${key} must be populated`);
  assert.equal(H.critters.length,14);assert.deepEqual(new Set(H.birds.filter(b=>b.species).map(b=>b.species)),new Set(['gull','tern']));
  assert.equal(W.seaLife.length,4);assert.equal(W.seaLife.reduce((n,s)=>n+s.count,0),32);assert.ok(W.seaLife.every(s=>s.visibleFish>0));
  const triangles=W.scenery.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);
  assert.ok(triangles<100000&&W.scenery.children.length<128,JSON.stringify({triangles,batches:W.scenery.children.length}));
  assert.ok(W.scenery.children.some(m=>m.material===kelpVC));const original=layout();setSetting('quality','low');setSetting('sceneryDensity',0);assert.equal(layout(),original);resetSettings();
  console.log(`PASS  all coastal plants/bodies/birds/fish are generated within caps; scenery ${Math.round(triangles)} triangles / ${W.scenery.children.length} batches; quality preserves layout`);

  const crab=H.critters.find(c=>c.kind==='crab');P.placeAt(offsetDir(crab.up,0,2));crab.update(.4);assert.equal(crab.state,'hide');assert.ok(crab.body.scale.x<.2);
  P.placeAt(W.spawnDir);crab.update(.4);assert.ok(crab.body.scale.x>.8);
  const seal=H.critters.find(c=>c.kind==='seal');P.placeAt(offsetDir(seal.up,0,2));seal.update(.1);assert.equal(seal.state,'bark');P.placeAt(W.spawnDir);
  phase(.9);step(.3);assert.ok(W.seaLife.find(s=>s.night).root.visible);
  const turtle=H.critters.find(c=>c.defKey==='seaTurtle');assert.equal(turtle.state,'swim');step(20);assert.ok(turtle.swimming,'night turtle reaches shallow swimming water');
  const shoal=W.seaLife[0];shoal.dir.copy(W.coast.lagoon.dir);shoal.update(0);assert.equal(shoal.visibleFish,shoal.count);H.Mechanics.active.instance.drainLagoon();shoal.update(.1);assert.equal(shoal.visibleFish,0);H.Mechanics.active.instance.refloodLagoon();
  phase(.4);step(20);assert.equal(W.seaLife.find(s=>s.night).root.visible,false);assert.equal(turtle.swimming,false,'day turtle returns to its beach');
  const time=coastalWind.time.value,fishTime=W.seaLife[0].t;ctx.paused=true;step(1);assert.equal(coastalWind.time.value,time);assert.equal(W.seaLife[0].t,fishTime);ctx.paused=false;step(.1);assert.ok(coastalWind.time.value>time);
  console.log('PASS  crab hides/unhides, seal barks, turtle swims at night, lanternfish follows night/pause and drained lagoons hide shoals');

  H.inventory.add('woodAxe',1);const palm=W.spots.trees.find(t=>t.kind==='lanternPalm'),index=W.spots.trees.indexOf(palm);
  P.placeAt(offsetDir(palm.dir,0,palm.r+1));const wood=H.inventory.count('wood');H.Gathering.work({scenery:'tree',spot:palm,index});assert.ok(H.Gathering.job);
  for(let i=0;i<300&&H.Gathering.job;i++)step(1/60);assert.equal(H.Gathering.job,null);assert.ok(H.inventory.count('wood')>wood);
  for(const kind of ['kelp','coralFan']){const t=W.spots.trees.find(t=>t.kind===kind);H.Gathering.work({scenery:'tree',spot:t,index:W.spots.trees.indexOf(t)});assert.equal(H.Gathering.job,null);}
  greet();assert.equal(H.inventory.count('pearlOfDeep'),1);assert.ok(RareGifts.toJSON().includes('pearlOfDeep'));
  const previousWater=rare().waterHome;rare().away=.001;rare().update(.01);assert.equal(rare().waterHome,null);rare().update(.01);assert.notEqual(rare().waterHome,previousWater);
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());assert.equal(layout(),original);assert.equal(H.inventory.count('pearlOfDeep'),1);greet();assert.equal(H.inventory.count('pearlOfDeep'),1);
  const before=P.stats.manaRegen;assert.ok(bagCommands(H.inventory).equip(H.inventory.find('pearlOfDeep'),'charm').ok);assert.ok(computeStats().manaRegen>before);assert.equal(H.inventory.count('pearlOfDeep'),0);
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());assert.equal(P.equipment.charm.itemId,'pearlOfDeep');assert.ok(RareGifts.toJSON().includes('pearlOfDeep'));
  console.log('PASS  palms give wood; kelp/coral refuse wood gathering; Pearl Turtle prompt grants one charm across Continue and the equipped charm/ledger persist');
  const oldShoal=W.seaLife[0];let disposed=0;oldShoal.root.geometry.addEventListener('dispose',()=>disposed++);
  H.goToPlanet('emberfall');assert.equal(W.seaLife.length,0);assert.equal(disposed,1);assert.ok(!oldShoal.root.parent);
  assert.equal(game.planets.canTravelTo('tidewhisper'),true);W.dispose();console.log('PASS  travel disposes coastal fish once; Tidewhisper is available');console.log('all passed');
} finally {H.Mechanics.exit();fixture.restore();}
