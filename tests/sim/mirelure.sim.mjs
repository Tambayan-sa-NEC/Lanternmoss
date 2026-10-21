// TODO 27g: Mirelure in the borrowed development slot (Tidewhisper stays unreleased). The configured gate; deep phase
// (untargetable, lures that dim with her breath, false bursts, the real one surfaces her, geysers); the 50% sluice
// break, timed creeping reflood and beached moves; the dive and harder relight; a faint and a reload reset everything;
// the Tide Crown comes once and survives Continue without a second chest.
import assert from 'node:assert/strict';
import {installMirelureFixture} from './lib/mirelureFixture.mjs';
import {boot,imp} from './lib/boot.mjs';
const fixture=installMirelureFixture(),{game,H,step}=await boot('witch',{wake:false});
const {ctx}=await imp('core/context.js'),{dayClock}=await imp('gameplay/dayClock.js'),{DAY}=await imp('config/day.js');
const {damageEnemy}=await imp('combat/damage.js'),{encounterEvents}=await imp('combat/events.js'),{Quests}=await imp('gameplay/quests/Quests.js');
const {waterAt,groundHeight}=await imp('world/terrain.js'),{seaLevelAt}=await imp('world/physics.js'),{activeTides}=await imp('world/mechanics/tides.js');
const {arcDist,dirAlong,offsetDir,tangentToward}=await imp('utils/sphere.js'),{COMBAT}=await imp('config/combat.js'),{Chests}=await imp('gameplay/Chests.js');
const {currentInteraction}=await imp('gameplay/Houses.js');
const {sparkles}=await imp('fx/sparkles.js');
const P=H.player,D=COMBAT.enemies.mirelure,G=H.BossGate;
const phase=f=>{dayClock.skip((f*DAY.length-dayClock.t+DAY.length)%DAY.length||DAY.length,'test');step(.1);};
const hurts=[];encounterEvents.addEventListener('playerhurt',e=>hurts.push(e.detail.source));
const shore=()=>offsetDir(ctx.boss.home,0.3,19.5);                    // the lagoon's rim, inside the arena ring
const lairEdge=()=>offsetDir(ctx.boss.home,0.3,15.5);                 // inside the waking trigger (17 m)
const tides=()=>activeTides(),lagoonLevel=()=>seaLevelAt(game.world.coast.lagoon.dir);
try{
  H.Tutorial.skip();H.goToPlanet('lanternmoss');H.Pets.command('passive');P.invuln=1e5;
  for(const e of ctx.enemies)if(e.def.respawn)e.vanish();step(.5);
  const B=ctx.boss;assert.equal(B.type,'mirelure');assert.equal(arcDist(B.home,game.world.coast.lagoon.dir)<1,true,'she sleeps in the lagoon lair');

  // ---- the configured gate: level 8, the relit lighthouse and low tide --------------------------------------------------
  const done=()=>Object.fromEntries(G.requirements().map(r=>[r.kind,r.done]));
  P.level=7;phase(.4);assert.deepEqual(done(),{level:false,quest:false,lowTide:true});assert.equal(G.state,'sealed');
  P.level=8;Quests.st('darkLighthouse').status='done';phase(.9);assert.deepEqual(done(),{level:true,quest:true,lowTide:false});assert.equal(G.state,'sealed');
  assert.match(G.lineFor({name:'Test Keeper'}).t,/low tide/i,'villager gives the remaining tide hint without throwing');
  phase(.4);assert.ok(G.met);assert.equal(G.state,'ready');
  P.placeAt(lairEdge());for(let i=0;i<60*8&&G.state!=='awake';i++)step(1/60);assert.equal(G.state,'awake','walking into the lair wakes her');P.placeAt(shore());
  assert.equal(G.wall.kind,'surf','a ring of crashing surf');
  console.log('PASS  gate: level 8, the relit lighthouse and low tide; she wakes in the lagoon inside a ring of surf');

  // ---- deep: untargetable; lures; the real one dims with her breath --------------------------------------------------------
  for(let i=0;i<60*3&&B.lures.length===0;i++)step(1/60);
  assert.equal(B.mode,'deep');assert.ok(B.hidden);let hp=B.hp;damageEnemy(B,500,{});assert.equal(B.hp,hp,'nothing hits her under the water');
  assert.equal(B.lures.length,D.lures.count);assert.equal(B.lures.filter(l=>l.real).length,1,'one real lure');
  // Observe the actual bubble cue after an arbitrary amount of adventure time, rather than reproducing the lamp's clock.
  ctx.time=1000.31;
  let realDim=0,falseDim=0,beats=0,bubbled=false;
  const emit=sparkles.emit;
  sparkles.emit=function(pos,o){if(o.color===0xe8fbff&&o.count===2&&o.upBias===2)bubbled=true;return emit.call(this,pos,o);};
  try{for(let i=0;i<60*6;i++){bubbled=false;step(1/60);
    if(bubbled){beats++;for(const l of B.lures){if(l.lamp.scale.x<0.6){if(l.real)realDim++;else falseDim++;}}}}}
  finally{sparkles.emit=emit;}
  const fakes=B.lures.length-1;assert.ok(beats>0&&realDim/beats>0.9,`the real lure dims on every breath (${realDim}/${beats})`);
  assert.ok(falseDim/(beats*fakes)<0.5,`false lures keep their own beat (${falseDim}/${beats*fakes})`);
  console.log(`PASS  deep: untargetable; ${D.lures.count} lures, the real one dims on her breath (${realDim}/${beats} beats), false ones off-beat`);

  // ---- a false lure bursts; the real one surfaces her ------------------------------------------------------------------
  const fake=B.lures.find(l=>!l.real);P.placeAt(dirAlong(fake.up,tangentToward(fake.up,B.home),-1.5));P.invuln=0;let h0=hurts.length;
  damageEnemy(fake,10,{from:P.pos});step(.1);assert.ok(!fake.alive);assert.ok(B.hidden,'still under');assert.ok(hurts.slice(h0).some(s=>/Mirelure/.test(s)),'its burst stings a hero close by');
  P.invuln=1e5;P.placeAt(shore());const real=B.lures.find(l=>l.real);damageEnemy(real,10,{from:P.pos});step(.1);
  assert.equal(B.mode,'surfaced');assert.ok(!B.hidden&&B.root.visible,'she surfaces');assert.ok(B.lures.length===0,'the other lures go out');
  hp=B.hp;damageEnemy(B,100,{from:P.pos});assert.ok(B.hp<hp,'open while up');
  for(let i=0;i<60*(D.lures.surface+1)&&B.mode==='surfaced';i++)step(1/60);assert.equal(B.mode,'deep','she dives again');
  for(let i=0;i<60*3&&B.lures.length===0;i++)step(1/60);assert.equal(B.lures.length,D.lures.count,'and relights her lures');
  console.log('PASS  a false lure bursts (stinging a hero next to it); the real lure surfaces her, open, for a while; then she dives and relights');

  // ---- geysers: a warning circle under the hero, then a spout ----------------------------------------------------------
  P.placeAt(shore());P.invuln=0;B.state='chase';B.cool=0;B.moveCd={};h0=hurts.length;let marked=false;
  for(let i=0;i<60*6&&hurts.length===h0;i++){step(1/60);if(B.attack==='geyser'&&B.state==='windup'&&B.geyserMark.mesh.visible)marked=true;}
  assert.ok(marked&&hurts.slice(h0).some(s=>/Mirelure/.test(s)),'a marked geyser hits a hero who stays put');P.invuln=1e5;
  console.log('PASS  geysers show their circle under the hero before they erupt');

  // ---- 50%: to the sluice, smash, drain; beached and open; the water creeps back; she dives with more lures -------------
  const tide0=lagoonLevel();damageEnemy(B.lures.find(l=>l.real),10,{});step(.1);B.hp=D.hp*2.9*0.52;damageEnemy(B,D.hp*2.9*0.03,{from:P.pos});step(.05);
  assert.equal(B.state,'transition');for(let i=0;i<60*15&&!B.sluice.broken;i++)step(1/60);
  assert.ok(B.sluice.broken,'she smashes the sluice');assert.ok(tides().status.lagoonDrained,'the lagoon drains');
  assert.ok(Math.abs(lagoonLevel()-H.PLANETS[0].tides.drainLevel)<0.01&&Math.abs(seaLevelAt(game.world.coast.causeway)-tide0)<0.6,'only the lagoon');
  assert.equal(B.mode,'beached');assert.ok(!B.hidden);hp=B.hp;damageEnemy(B,100,{from:P.pos});assert.ok(B.hp<hp,'beached: open');
  P.placeAt(dirAlong(B.up,B.fwd,4));P.invuln=0;B.cool=0;const used=new Set();
  for(let i=0;i<60*14;i++){P.invuln=Math.min(P.invuln,.3);P.hp=P.stats.maxHp;step(1/60);if(B.state==='windup')used.add(B.attack);if(i%120===0)P.placeAt(dirAlong(B.up,B.fwd,i%240?9:3));}
  assert.ok(['thrash','roll','bite'].filter(m=>used.has(m)).length>=2,`beached moves: ${[...used]}`);P.invuln=1e5;assert.equal(B.mode,'beached','still beached');
  const drainedFor=D.drain.seconds-D.drain.reflood,levels=[];
  for(let i=0;i<60*D.drain.seconds&&B.mode==='beached';i++){step(1/60);if(i%60===0)levels.push(lagoonLevel());}
  assert.ok(levels.some(l=>l>H.PLANETS[0].tides.drainLevel+0.2&&l<tide0-0.2),'the water creeps back gradually');
  assert.equal(B.mode,'deep','deep enough again: she dives');assert.ok(B.reflooded);
  for(let i=0;i<60*3&&B.lures.length===0;i++)step(1/60);assert.equal(B.lures.length,D.lures.countLate,'and lights more lures');
  console.log(`PASS  at 50% she smashes the sluice: only the lagoon drains (${drainedFor} s), she is beached and open (${[...used]}), the water creeps back and she dives to ${D.lures.countLate} lures`);

  // ---- a faint resets the fight: lagoon full, sluice mended, lures out, full health ------------------------------------
  damageEnemy(B.lures.find(l=>l.real),10,{});step(.1);B.hp=D.hp*2.9*0.4;
  P.placeAt(dirAlong(B.up,B.fwd,3));P.invuln=0;P.hp=1;B.state='chase';B.cool=0;B.moveCd={};
  for(let i=0;i<60*10&&!P.dead;i++)step(1/60);if(!P.dead){P.hp=0;P.dead=true;P.deadT=0.1;}
  step(COMBAT.player.respawnTime+1);for(let i=0;i<60*30&&!(B.state==='idle'&&B.hp>=B.def.hp);i++)step(1/60);step(.5);
  assert.ok(B.hp>=B.def.hp&&B.bossPhase===0,'full health, first phase');assert.ok(!B.sluice.broken,'sluice mended');
  assert.ok(!tides().status.lagoonDrained&&B.lures.length===0,'lagoon full, lures out');
  console.log('PASS  after a faint she resets: full health, sluice mended, lagoon full, lures out');

  // A reflood must cancel both a pending and an active roll before she becomes invisible; a timed dive cancels a bite.
  P.placeAt(shore());P.invuln=1e5;
  for(const state of ['windup','active']){
    Object.assign(B,{mode:'beached',state,attack:'roll',bossPhase:1,hp:B.def.hp*.4,rolling:true,rollT:1});
    B.rollDir.copy(B.fwd);B.laneFrom.copy(B.up);tides().refloodLagoon();
    B.behavior.update(B,1/60);
    assert.equal(B.mode,'deep');assert.ok(B.hidden);assert.equal(B.state,'chase');assert.equal(B.attack,null);
    assert.equal(B.rolling,false);assert.ok(B.lane.dots.every(d=>!d.visible),'roll lane cleared');
    B.behavior.think(B,1/60,9);assert.notEqual(B.state,'active','no underwater roll');
  }
  Object.assign(B,{mode:'surfaced',state:'windup',attack:'bite',surfaceT:0,gape:1});B.behavior.update(B,1/60);
  assert.equal(B.mode,'deep');assert.equal(B.attack,null);assert.equal(B.gape,0);assert.ok(!B.biteMark.mesh.visible);
  B.spawn(B.home);P.placeAt(shore());
  console.log('PASS  reflood cancels pending/active rolls and their lane; a timed dive cancels a pending bite');

  // ---- a reload mid-drain: the save comes back with the fight reset and the lagoon full -------------------------------
  P.placeAt(shore());step(1);B.aggro();for(let i=0;i<60*3&&B.lures.length===0;i++)step(1/60);
  damageEnemy(B.lures.find(l=>l.real),10,{});step(.1);B.hp=D.hp*2.9*0.52;damageEnemy(B,D.hp*2.9*0.03,{from:P.pos});
  for(let i=0;i<60*15&&!B.sluice.broken;i++)step(1/60);assert.ok(tides().status.lagoonDrained);
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());phase(.4);step(1);
  const B2=ctx.boss;assert.ok(B2.alive&&B2.hp>=B2.def.hp&&!B2.sluice.broken&&!tides().status.lagoonDrained,'Continue: a fresh fight, sluice mended, lagoon full');
  console.log('PASS  reload mid-drain: Continue brings back a fresh fight with the sluice mended and the lagoon full');

  // ---- the win: one chest, one Tide Crown, nothing doubled by Continue ------------------------------------------------
  if(G.state!=='awake'){P.placeAt(lairEdge());for(let i=0;i<60*8&&G.state!=='awake';i++)step(1/60);}
  const crowns=()=>H.inventory.count('tideCrown')+ctx.worldItems.filter(w=>w.itemId==='tideCrown').reduce((n,w)=>n+w.quantity,0);
  B2.hp=1;damageEnemy(B2,9999,{});for(let i=0;i<60&&B2.alive;i++){B2.mode='surfaced';B2.hidden=false;damageEnemy(B2,9999,{});step(1/60);}
  assert.ok(!B2.alive,'she falls');step(1);assert.ok(Chests.bossChest,'her treasure chest falls');assert.ok(!tides().status.lagoonDrained);
  step(6);P.placeAt(Chests.bossChest.up);step(.1);const open=currentInteraction();assert.match(open?.label??'',/Treasure chest/);open.run();step(1);
  for(const w of [...ctx.worldItems])if(w.itemId==='tideCrown'){P.placeAt(w.up);step(1);}
  assert.equal(crowns(),1,'one Tide Crown');assert.equal(G.state,'beaten');
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());step(1);
  assert.equal(crowns(),1,'still one after Continue');assert.ok(!ctx.boss?.alive);assert.equal(G.state,'beaten');assert.ok(!Chests.bossChest||Chests.bossChest.opened,'no second treasure chest');
  console.log('PASS  the win drops one chest with one Tide Crown; Continue keeps her beaten without a second chest or crown');
  assert.equal(game.planets.canTravelTo('tidewhisper'),false);console.log('all passed');
}finally{H.Mechanics.exit();fixture.restore();}
