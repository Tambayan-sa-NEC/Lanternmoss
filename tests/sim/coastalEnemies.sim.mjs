// TODO 27e: Tidewhisper's regular roster in the borrowed development slot (the world stays unreleased).
// Front-shell refusal, tide drift and stings, surf ambush/retreat, stranding and recovery as the water changes.
import assert from 'node:assert/strict';
import {installCoastalEnemyFixture} from './lib/coastalEnemyFixture.mjs';
import {boot,imp} from './lib/boot.mjs';
const fixture=installCoastalEnemyFixture(),{game,H,step}=await boot('witch',{wake:false});
const {ctx}=await imp('core/context.js'),{dayClock}=await imp('gameplay/dayClock.js'),{DAY}=await imp('config/day.js');
const {damageEnemy}=await imp('combat/damage.js'),{encounterEvents}=await imp('combat/events.js'),{dropLoot}=await imp('gameplay/drops.js');
const {dryGround,groundHeight,waterAt}=await imp('world/terrain.js'),{seaLevel}=await imp('world/physics.js');
const {arcDist,dirAlong,offsetDir,tangentToward}=await imp('utils/sphere.js'),{COMBAT}=await imp('config/combat.js');
const {plateBlocks}=await imp('entities/enemies/behaviors/armoured.js');
const P=H.player,depth=d=>waterAt(d)?.depth??0;
const phase=f=>{dayClock.skip((f*DAY.length-dayClock.t+DAY.length)%DAY.length||DAY.length,'test');step(.1);};
const hurts=[],refused=[];
encounterEvents.addEventListener('playerhurt',e=>hurts.push(e.detail.source));encounterEvents.addEventListener('enemyrefused',e=>refused.push(e.detail.enemy));
const ground=d=>d.clone().multiplyScalar(groundHeight(d));
/** First point on rings around `from` (out to maxR) where test(d) holds. */
const ringFind=(from,test,maxR=40)=>{for(let r=1;r<=maxR;r+=.5)for(let a=0;a<6.28;a+=.2){const d=offsetDir(from,a,r);if(test(d))return d;}return null;};
const park=()=>{P.placeAt(game.world.spawnDir);P.invuln=10000;step(.05);};
try{
  H.Tutorial.skip();H.goToPlanet('lanternmoss');H.Pets.command('passive');phase(.4);   // the pet's staggers would cancel wind-ups
  const of=t=>ctx.enemies.filter(e=>e.type===t),homes=()=>ctx.enemies.filter(e=>e.def.respawn).map(e=>`${e.type}:${e.home.toArray().map(n=>n.toFixed(4))}`);
  const H_=seaLevel(true),low=H.PLANETS[0].tides.low;
  assert.deepEqual(['shellback','jellybell','surfSkipper','wisp'].map(t=>of(t).length),[15,12,9,5]);
  assert.ok(of('shellback').every(e=>dryGround(e.home,.8,{high:true})&&groundHeight(e.home)<H_+2.5),'Shellbacks hold the dry high-tide line');
  assert.ok(of('jellybell').every(e=>groundHeight(e.home)<low-.45),'Jellybells float even at low water');
  assert.ok(of('surfSkipper').every(e=>groundHeight(e.home)<low-.9),'Surf skippers lurk where low water is still deep');
  assert.ok(ctx.enemies.every(e=>!e.def.respawn||arcDist(e.home,game.world.spawnDir)>=COMBAT.player.safeRadius+11),'nothing spawns in the village');
  assert.ok(of('wisp').every(e=>e.def.color===0x5fe8c0&&e.def.look.robe===0x1d5a56)&&COMBAT.enemies.wisp.color===0xb27cff,'returning wisps are sea-green; the original wisp is unchanged');
  const before=homes();assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());phase(.4);assert.deepEqual(homes(),before,'Continue rebuilds the same roster in the same places');
  console.log(`PASS  roster: ${before.length} respawning monsters on beaches, shallows and surf (deterministic through Continue); sea-green wisps`);

  // keep one of each to study; the rest leave quietly
  const crab=of('shellback')[0],jelly=of('jellybell')[0];
  let skip=of('surfSkipper')[0],skip2=of('surfSkipper')[1];
  for(const e of ctx.enemies)if(![crab,jelly,skip,skip2,ctx.boss].includes(e))e.vanish();step(1);

  // ---- Shellback: the front plate refuses hits; flank it -------------------------------------------------------------
  park();P.placeAt(dirAlong(crab.up,crab.fwd,3));
  const front=P.pos.clone(),behind=ground(dirAlong(crab.up,crab.fwd.clone().negate(),3));
  let hp=crab.hp;damageEnemy(crab,40,{from:front});assert.equal(crab.hp,hp,'front hit refused');assert.equal(refused.at(-1),crab);
  damageEnemy(crab,40,{from:behind});assert.ok(crab.hp<hp,'hit from behind lands');hp=crab.hp;
  damageEnemy(crab,40,{from:crab.pos.clone()});assert.ok(crab.hp<hp,'a blow landing on top of it lands');hp=crab.hp;
  damageEnemy(crab,40,{});assert.ok(crab.hp<hp,'directionless damage (burning ground) lands');hp=crab.hp;
  crab.stunnedT=1;assert.equal(plateBlocks(crab,front),false,'a dazed Shellback forgets its plate');crab.stunnedT=0;
  // a real Arcane Bolt from the front, then from behind
  P.placeAt(dirAlong(crab.up,crab.fwd,4));P.fwd.copy(tangentToward(P.up,crab.up));crab.state='idle';crab.timer=99;
  const r0=refused.length;H.tryCast('bolt');step(.5);assert.ok(refused.length>r0&&crab.hp===hp,'a bolt into the plate glances off');
  P.placeAt(dirAlong(crab.up,crab.fwd.clone().negate(),4));P.fwd.copy(tangentToward(P.up,crab.up));step(.4);H.tryCast('bolt');step(.4);assert.ok(crab.hp<hp,'a bolt into its back lands');
  // its turn speed is capped: dodge behind and it needs time to come round
  P.placeAt(dirAlong(crab.up,crab.fwd,3));crab.aggro();step(.3);const f0=crab.fwd.clone();
  P.placeAt(dirAlong(crab.up,crab.fwd.clone().negate(),2.5));step(.5);
  const turned=Math.acos(Math.min(1,f0.dot(crab.fwd)));assert.ok(turned<=COMBAT.enemies.shellback.turnRate*.5+.1,`turned ${turned.toFixed(2)} rad in 0.5 s`);
  assert.ok(plateBlocks(crab,P.pos)===false,'still open from behind half a second later');
  // the pinch hurts a hero standing in front of it
  P.placeAt(dirAlong(crab.up,crab.fwd,1.6));P.invuln=0;crab.cool=0;const h0=hurts.length;
  for(let i=0;i<180&&hurts.length===h0;i++){P.invuln=Math.min(P.invuln,0);step(1/60);}
  assert.equal(hurts.at(-1),'Shellback','its pinch lands on a hero in front');
  console.log(`PASS  Shellback refuses front hits (direct, bolt), takes back/top/ground hits, turns at most ${COMBAT.enemies.shellback.turnRate} rad/s, pinches in front`);
  park();crab.vanish();step(1);

  // ---- Jellybell: drifts with the tide, stings, strands and recovers -------------------------------------------------
  const still=()=>{jelly.state='idle';jelly.timer=1e9;};
  phase(.6);still();step(.2);let g0=groundHeight(jelly.up);step(8,()=>still());const up=groundHeight(jelly.up)-g0;
  phase(.15);still();step(.2);g0=groundHeight(jelly.up);step(8,()=>still());const down=groundHeight(jelly.up)-g0;
  assert.ok(up>.3&&down<-.3,`rising tide carries it up the slope (${up.toFixed(2)} m), falling tide back out (${down.toFixed(2)} m)`);
  assert.ok(!jelly.stranded&&depth(jelly.up)>=COMBAT.enemies.jellybell.floatDepth-.01,'stays afloat while drifting');
  // a sting: in the ring it hurts, stepping out during the swell it doesn't
  phase(.4);const shore=ringFind(jelly.up,d=>dryGround(d)),toShore=tangentToward(jelly.up,shore);
  P.placeAt(dirAlong(jelly.up,toShore,1.8));P.invuln=0;jelly.aggro();jelly.cool=0;let h1=hurts.length;
  for(let i=0;i<240&&hurts.length===h1;i++)step(1/60);assert.equal(hurts.at(-1),'Jellybell','a hero in the ring is stung');
  P.invuln=0;P.placeAt(dirAlong(jelly.up,toShore,1.8));for(let i=0;i<400&&jelly.state!=='windup';i++){P.invuln=0;step(1/60);}
  assert.equal(jelly.state,'windup');h1=hurts.length;P.placeAt(dirAlong(jelly.up,toShore,8));for(let i=0;i<90;i++)step(1/60);
  assert.equal(hurts.length,h1,'stepping out of the swelling ring dodges the sting');park();
  // stranding: float it over the flats at high water, let the tide fall away
  const flats=ringFind(jelly.home,d=>groundHeight(d)>71.45&&groundHeight(d)<71.9,60);assert.ok(flats,'a tidal flat near its home');
  const strand=()=>{phase(.9);jelly.spawn(flats);still();step(.3);assert.ok(!jelly.stranded,'afloat over the flooded flat');phase(.4);still();step(.2);assert.ok(jelly.stranded,'the falling tide strands it');};
  strand();assert.notEqual(jelly.state,'windup');hp=jelly.hp;damageEnemy(jelly,10);assert.ok(jelly.hp<hp,'a stranded Jellybell can be hit');
  phase(.9);step(.2);assert.ok(!jelly.stranded,'the returning tide floats it again');
  strand();let t=0;while(jelly.stranded&&t<40){step(.5);t+=.5;}
  assert.ok(!jelly.stranded&&depth(jelly.up)>=COMBAT.enemies.jellybell.floatDepth,`it flops back to the sea by itself (${t} s)`);
  const pops=[];encounterEvents.addEventListener('enemydefeated',e=>pops.push(e.detail.enemy));damageEnemy(jelly,1e6);assert.equal(pops.at(-1),jelly);
  console.log(`PASS  Jellybell drifts with the tide (+${up.toFixed(1)} m rising, ${down.toFixed(1)} m falling), stings in its ring, strands and recovers (tide or ${t} s crawl), pops`);
  step(1);

  // ---- Surf skipper: hidden in the deep, ambush leap, exposed, back to the sea ----------------------------------------
  // Which of the surf skippers is deep enough to hide at low water depends on the seed, so take one that is.
  park();phase(.4);step(.5);
  const sunk=of('surfSkipper').filter(e=>e.alive&&e.hidden);
  if(sunk.length){skip=sunk[0];skip2=sunk[1]??of('surfSkipper').find(e=>e!==skip)??skip2;}
  assert.ok(skip.hidden,'submerged in deep water');hp=skip.hp;damageEnemy(skip,30);assert.equal(skip.hp,hp,'nothing hits it under the surf');
  const beach=ringFind(skip.home,d=>dryGround(d,.6)),inland=dirAlong(beach,tangentToward(skip.home,beach),1.5);
  P.placeAt(inland);P.invuln=0;const seen=new Set();let h2=hurts.length,exposedHit=false;
  for(let i=0;i<60*8;i++){P.invuln=Math.min(P.invuln,.3);step(1/60);seen.add(skip.state);
    if(skip.state==='recover'&&!exposedHit){const before=skip.hp;damageEnemy(skip,25);exposedHit=skip.hp<before;}
    if(exposedHit&&skip.hidden)break;}
  assert.ok(['windup','charge','recover','flee'].every(s=>seen.has(s)),`ambush cycle: ${[...seen]}`);
  assert.ok(hurts.slice(h2).includes('Surf skipper'),'the leap hits a hero standing near the water');
  assert.ok(exposedHit,'exposed on the beach after leaping');assert.ok(skip.hidden&&depth(skip.up)>=COMBAT.enemies.surfSkipper.hideDepth,'back under deep water');
  // a hero far inland: it follows along the shore but never leaves the water by choice
  const far=dirAlong(beach,tangentToward(skip.up,beach),11);P.placeAt(far);P.invuln=10000;let dry=0,leaps=0;
  for(let i=0;i<60*5;i++){step(1/60);if(!['charge','recover','flee'].includes(skip.state)&&!skip.stranded&&depth(skip.up)<COMBAT.enemies.surfSkipper.fenceDepth)dry++;if(skip.state==='charge')leaps++;}
  assert.equal(dry,0,'never steps ashore while lurking');assert.equal(leaps,0,'no leap at a hero beyond its reach');park();
  // a stagger as it surfaces leaves it floundering as long as a landed leap
  P.placeAt(inland);step(.1);skip.aggro();skip.cool=0;for(let i=0;i<60*6&&skip.state!=='windup';i++)step(1/60);assert.equal(skip.state,'windup');
  skip.interrupt(.3);step(1/60);assert.ok(skip.state==='recover'&&!skip.hidden&&skip.timer>COMBAT.enemies.surfSkipper.exposed-.05,'staggered while surfacing: exposed');park();
  // stranding: lurking over the flats at high water, then the tide drops away
  const flat2=ringFind(skip2.home,d=>groundHeight(d)>71.2&&groundHeight(d)<71.55,60);assert.ok(flat2,'a tidal flat near the second skipper');
  phase(.9);skip2.spawn(flat2);step(.5);assert.ok(skip2.hidden,'lurks over the flooded flat');
  phase(.4);step(.2);assert.ok(skip2.stranded&&!skip2.hidden,'the falling tide strands it in plain sight');
  hp=skip2.hp;damageEnemy(skip2,20);assert.ok(skip2.hp<hp,'a stranded skipper can be hit');
  t=0;while((skip2.stranded||!skip2.hidden)&&t<30){step(.5);t+=.5;}
  assert.ok(!skip2.stranded&&skip2.hidden,`it hurries back under deep water (${t} s)`);
  console.log(`PASS  Surf skipper lurks untargetable, ambush-leaps, stands exposed (or staggered as it surfaces), retreats to deep water, keeps off land, strands and recovers (${t} s)`);

  // ---- loot: each sea monster's own extra on top of the usual drop ----------------------------------------------------
  const always=()=>0,dropped=t=>dropLoot({type:t,def:COMBAT.enemies[t],up:P.up},always).map(w=>w.itemId);
  const sea=dropped('shellback'),goblin=dropped('goblin');
  assert.equal(sea.length,goblin.length+1,'the Shellback adds its own extra to the usual drop');assert.equal(sea.at(-1),'shell');assert.ok(!goblin.includes('shell'));
  assert.equal(dropped('jellybell').at(-1),'seaglass');assert.equal(dropped('surfSkipper').at(-1),'silverSprat');
  console.log('PASS  sea monsters add their own extra drop (shell / seaglass / sprat) without changing older monsters\' rolls');
  assert.equal(game.planets.canTravelTo('tidewhisper'),false);console.log('all passed');
}finally{H.Mechanics.exit();fixture.restore();}
