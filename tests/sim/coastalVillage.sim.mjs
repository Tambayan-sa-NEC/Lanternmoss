import assert from 'node:assert/strict';
import {installCoastalVillageFixture} from './lib/coastalVillageFixture.mjs';
import {boot,imp} from './lib/boot.mjs';
const fixture=installCoastalVillageFixture(),{game,H,step}=await boot('witch',{wake:false});
const {ctx}=await imp('core/context.js'),{dayClock}=await imp('gameplay/dayClock.js'),{DAY}=await imp('config/day.js');
const {Houses,currentInteraction}=await imp('gameplay/Houses.js'),{Quests}=await imp('gameplay/quests/Quests.js'),{Dialog}=await imp('ui/Dialog.js');
const {BossGate,describeSummon}=await imp('gameplay/BossGate.js'),{supportHeight}=await imp('physics/colliders.js'),{dryGround,waterAt}=await imp('world/terrain.js');
const {Fishing}=await imp('gameplay/Fishing.js'),{offsetDir,arcDist}=await imp('utils/sphere.js');
const P=H.player,keeper=()=>ctx.npcs.find(n=>n.name==='Marlo');
const phase=f=>{dayClock.skip((f*DAY.length-dayClock.t+DAY.length)%DAY.length||DAY.length,'test');step(.1);};
const enter=i=>{P.placeAt(game.world.houses[i].door);step(.05);const t=currentInteraction();assert.match(t.label,/Enter/);t.run();step(1);assert.equal(Houses.inside.index,i);};
const leave=()=>{Dialog.close();Houses.leave();step(1);assert.ok(!ctx.indoors);};
try{
  H.Tutorial.skip();H.goToPlanet('lanternmoss');P.invuln=10000;phase(.4);assert.ok(keeper());assert.ok(keeper().lanternGlow);assert.ok(ctx.npcs.filter(n=>!n.def.local).every(n=>n.outfit));
  assert.ok(game.world.houses.slice(0,6).every(h=>h.kind==='stilt'));assert.ok(game.world.pier);assert.equal(H.Gathering.nodes.length,54);
  assert.equal(Quests.offerable(keeper()),'darkLighthouse');Quests.offerFor(keeper()).choice.onYes();
  const conditions=()=>Object.fromEntries(BossGate.requirements().map(r=>[r.kind,r.done]));P.level=7;assert.deepEqual(conditions(),{level:false,quest:false,lowTide:true});
  assert.ok(describeSummon(BossGate.summon).some(t=>/low tide/.test(t)));
  H.inventory.add('seaglass',6);Quests.check('darkLighthouse');assert.equal(Quests.st('darkLighthouse').step,1);Quests.stepLineFor(keeper());assert.equal(H.inventory.count('seaglass'),0);
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());assert.equal(Quests.st('darkLighthouse').step,2);assert.equal(game.world.lighthouseLamp.visible,false);
  H.goToPlanet('emberfall');assert.match(Quests.trackerInfo().text,/Return to Tidewhisper/);H.goToPlanet('lanternmoss');assert.ok(keeper());
  H.inventory.add('wood',6);Quests.check('darkLighthouse');Quests.stepLineFor(keeper());assert.equal(H.inventory.count('wood'),0);const coins=P.coins;
  Quests.stepLineFor(keeper());step(.1);assert.equal(Quests.st('darkLighthouse').status,'done');assert.ok(game.world.lighthouseLamp.visible);assert.equal(P.coins,coins+80);
  assert.equal(H.inventory.count('coastalChowder'),2);assert.equal(Quests.stepLineFor(keeper()),null);
  P.level=8;phase(.9);assert.deepEqual(conditions(),{level:true,quest:true,lowTide:false});assert.equal(BossGate.state,'sealed');phase(.4);assert.ok(BossGate.met);assert.equal(BossGate.state,'ready');
  console.log('PASS  Marlo quest consumes glass/fuel, survives partial Continue/revisit, relights once and predicates seal/unseal the borrowed lair');
  phase(.9);const pier=game.world.pier;assert.ok(waterAt(pier.end));assert.ok(supportHeight(pier.end)>waterAt(pier.end).level+.5);
  const {Walker}=await imp('physics/Walker.js'),{tangentToward}=await imp('utils/sphere.js');const walker=new Walker(pier.start,.4);walker.r=supportHeight(pier.start);
  for(let i=0;i<210;i++)walker.step(tangentToward(walker.up,pier.end).multiplyScalar(3),1/60);
  assert.ok(arcDist(walker.up,pier.end)<2&&!walker.swimming&&walker.waterDepth===0,'walk the supported deck at high water');
  P.placeAt(pier.end);step(.3);assert.ok(!P.swimming);H.inventory.add('fishingRod',1);assert.ok(Fishing.target());Fishing.target().run();assert.ok(Fishing.active);Fishing.end();
  assert.ok(H.Farm.plots.every(p=>dryGround(p.dir,1,{high:true})));phase(.15);
  for(const i of [1,4]){
    enter(i);const chest=Houses.inside.room.spots.find(s=>s.kind==='chest');Houses.use(chest);Dialog.close();assert.ok(Houses.opened.has(`lanternmoss:${i}`));
    if(i===4){const shelf=Houses.inside.room.spots.find(s=>s.kind==='bookshelf');Houses.use(shelf);Dialog.close();assert.equal(Houses.lore['lanternmoss:4'],0);}
    if(i===4){assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());assert.equal(Houses.inside.index,4);assert.equal(Houses.inside.def.name,"Marlo's Lighthouse");}
    leave();
  }
  const food=H.inventory.count('silverSprat');assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());step(.1);assert.ok(game.world.lighthouseLamp.visible);assert.equal(Quests.st('darkLighthouse').status,'done');
  assert.ok(Houses.opened.has('lanternmoss:4'));assert.equal(Houses.lore['lanternmoss:4'],0);enter(1);Houses.use(Houses.inside.room.spots.find(s=>s.kind==='chest'));Dialog.close();assert.equal(H.inventory.count('silverSprat'),food);leave();
  H.goToPlanet('emberfall');assert.equal(game.world.lighthouseLamp,null);assert.ok(!keeper());H.goToPlanet('lanternmoss');step(.1);assert.ok(game.world.lighthouseLamp.visible);assert.equal(P.coins,coins+80);
  assert.equal(game.planets.canTravelTo('tidewhisper'),false);console.log('PASS  supported pier fishing stays dry at high tide; two themed interiors preserve one-time gifts/lore, keeper and beacon restore across travel');console.log('all passed');
}finally{H.Mechanics.exit();fixture.restore();}
