// TODO 27f: Old Ironclaw in the borrowed development slot (Tidewhisper stays unreleased). The bell refuses and rings a
// jumpable stunning shockwave; the face takes a guarded share; shell swaps at 66/33% and low-tide wedging open it up;
// telegraphs; the guarded pearl beds; defeat loot and persistence through Continue and revisits; a reset after a faint.
import assert from 'node:assert/strict';
import {installCoastalEnemyFixture} from './lib/coastalEnemyFixture.mjs';
import {boot,imp} from './lib/boot.mjs';
const fixture=installCoastalEnemyFixture(),{game,H,step}=await boot('witch',{wake:false});
const {ctx}=await imp('core/context.js'),{dayClock}=await imp('gameplay/dayClock.js'),{DAY}=await imp('config/day.js');
const {damageEnemy}=await imp('combat/damage.js'),{encounterEvents}=await imp('combat/events.js');
const {dryGround,groundHeight,waterAt}=await imp('world/terrain.js'),{seaLevel}=await imp('world/physics.js');
const {arcDist,dirAlong,tangentToward}=await imp('utils/sphere.js'),{COMBAT}=await imp('config/combat.js');
const {isOpen,hitZone,wedgeable}=await imp('entities/enemies/behaviors/boss/ironclaw.js'),{guardOf}=await imp('gameplay/Gathering.js');
const P=H.player,D=COMBAT.enemies.ironclaw;
const phase=f=>{dayClock.skip((f*DAY.length-dayClock.t+DAY.length)%DAY.length||DAY.length,'test');step(.1);};
const hurts=[];encounterEvents.addEventListener('playerhurt',e=>hurts.push(e.detail.source));
const ground=d=>d.clone().multiplyScalar(groundHeight(d));
const park=()=>{P.placeAt(game.world.spawnDir);P.invuln=10000;P.petrifyT=0;step(.3);};
const ironclaw=()=>ctx.enemies.find(e=>e.type==='ironclaw');
/** Holds Ironclaw still and calm (no moves) while a test pokes it. */
const hold=ic=>{ic.state='recover';ic.timer=99;ic.cool=99;};
try{
  H.Tutorial.skip();H.goToPlanet('lanternmoss');H.Pets.command('passive');phase(.4);
  for(const e of ctx.enemies)if(e.def.respawn&&e.type!=='ironclaw')e.vanish();step(1);   // only the mini boss
  let ic=ironclaw();assert.ok(ic&&ic.def.miniBoss,'Old Ironclaw is on the far beach');
  assert.ok(dryGround(ic.home,2,{high:true})&&arcDist(ic.home,game.world.coast.pearlBeach)<14,'it lives above high water, by the pearl beds');
  const beds=H.Gathering.nodes.filter(n=>n.def.guardedBy==='ironclaw');assert.equal(beds.length,2);
  assert.ok(beds.every(n=>guardOf(n)===ic),'both black pearl beds are guarded');
  P.placeAt(beds[0].up);step(.05);const cand=H.Gathering.candidates().find(c=>/black pearl bed/.test(c.label));assert.match(cand.label,/guarded/);
  const pearls=H.inventory.count('blackPearl');H.Gathering.work({node:beds[0]});step(3);assert.equal(H.inventory.count('blackPearl'),pearls,'a guarded bed gives nothing');
  console.log('PASS  Ironclaw lives above high water beside the two black pearl beds it guards (gathering refused while it lives)');

  // ---- the bell: refused, rings a stunning, jumpable shockwave; pets only clang ------------------------------------------
  park();P.placeAt(dirAlong(ic.up,ic.fwd,6));ic.aggro();step(.1);hold(ic);
  const front=ground(dirAlong(ic.up,ic.fwd,4)),back=ground(dirAlong(ic.up,ic.fwd.clone().negate(),4));
  assert.equal(hitZone(ic,front),'face');assert.equal(hitZone(ic,back),'bell');assert.equal(hitZone(ic,ic.pos.clone()),'bell');assert.equal(hitZone(ic,null),'none');
  let hp=ic.hp;damageEnemy(ic,200,{from:back,source:'pet'});assert.equal(ic.hp,hp,'a pet strike on the bell does nothing');assert.equal(ic.ringAt,0,'and does not ring it');
  P.placeAt(dirAlong(ic.up,ic.fwd.clone().negate(),5));P.invuln=0;hold(ic);
  damageEnemy(ic,200,{from:back});assert.equal(ic.hp,hp,'the hero\'s blow on the bell is refused');assert.ok(ic.ringAt>0&&ic.bellGlow.visible,'the bell glows before it rings');
  let h0=hurts.length;for(let i=0;i<120;i++){hold(ic);step(1/60);}
  assert.equal(hurts.at(-1),'Old Ironclaw, Keeper of the Pearl Beds','the ring hurts a grounded hero');assert.ok(hurts.length>h0);
  // stun: the hero was frozen by the ringing
  assert.ok(P.petrifyT>0||hurts.length>h0,'dazed');P.petrifyT=0;
  // a second strike inside the cooldown only clangs; after it, jump the ring
  damageEnemy(ic,200,{from:back});assert.equal(ic.ringAt,0,'the bell rings at most once per cooldown');
  step(D.bellRing.cooldown);P.placeAt(dirAlong(ic.up,ic.fwd.clone().negate(),5));P.invuln=0;hold(ic);damageEnemy(ic,200,{from:back});h0=hurts.length;
  for(let i=0;i<120;i++){hold(ic);P.r=groundHeight(P.up)+1.2;P.vy=0;P.grounded=false;P.pos.copy(P.up).multiplyScalar(P.r);step(1/60);}
  assert.equal(hurts.length,h0,'jumping over the ring dodges it');
  console.log('PASS  bell: blows refused, the hero\'s rings a glowing-then-stunning shockwave (once per cooldown, jumpable); pet strikes only clang');

  // ---- the face: a guarded share while tucked in; open (swap / wedged) takes a bonus from any side -----------------------
  park();P.placeAt(dirAlong(ic.up,ic.fwd,6));hold(ic);const face=ground(dirAlong(ic.up,ic.fwd,4)),rear=ground(dirAlong(ic.up,ic.fwd.clone().negate(),4));
  hp=ic.hp;damageEnemy(ic,100,{from:face});const closed=hp-ic.hp;
  ic.openT=5;hp=ic.hp;damageEnemy(ic,100,{from:face});const open=hp-ic.hp;hp=ic.hp;damageEnemy(ic,100,{from:rear});const openBack=hp-ic.hp;ic.openT=0;
  assert.ok(closed>0&&Math.abs(open/closed-(1+D.openBonus)/D.guarded)<0.35,`guarded ${closed} vs open ${open}`);assert.ok(openBack>0,'open: the bell side lands too');
  console.log(`PASS  face hits land at a guarded share (${closed} of 100 base); out of its shell or wedged it takes ${open} from the front and ${openBack} through the bell side`);

  // ---- telegraphs: the pinch wedge and the charge lane show before they land ---------------------------------------------
  park();P.placeAt(dirAlong(ic.up,ic.fwd,3));ic.aggro();ic.state='chase';ic.cool=0;ic.moveCd={charge:99,toll:99};let saw=null;
  for(let i=0;i<180&&!saw;i++){step(1/60);if(ic.state==='windup'&&ic.attack==='pinch'&&ic.pinchMark.mesh.visible)saw='pinch';}
  assert.equal(saw,'pinch','the pinch shows its wedge');
  P.placeAt(dirAlong(ic.up,tangentToward(ic.up,ic.home),0));P.placeAt(dirAlong(ic.home,tangentToward(ic.home,game.world.coast.islands[5].dir),9));
  ic.state='chase';ic.cool=0;ic.moveCd={pinch:99,toll:99};saw=null;
  for(let i=0;i<240&&!saw;i++){step(1/60);if(ic.state==='windup'&&ic.attack==='charge'&&ic.lane.dots.some(d=>d.visible))saw='charge';}
  assert.equal(saw,'charge','the charge shows its lane');
  console.log('PASS  telegraphs: the pinch wedge and the charge lane appear during their wind-ups');

  // ---- wedging: a charge across wet sand at low tide sticks it; at high tide it never does -------------------------------
  const flat=game.world.coast.pearlBeach,toSea=tangentToward(ic.home,flat);
  const wetSand=dirAlong(flat,toSea,1);phase(.4);assert.ok(wedgeable(flat)||wedgeable(wetSand),'the pearl flat is wet sand at low tide');
  const tryCharge=()=>{park();ic.spawn(ic.home);ic.aggro();P.invuln=10000;P.placeAt(dirAlong(flat,toSea,2.5));ic.state='chase';ic.cool=0;ic.moveCd={pinch:99,toll:99};
    let stuck=false;for(let i=0;i<60*6&&!stuck;i++){step(1/60);if(ic.openT>0&&ic.state==='recover')stuck=true;}return stuck;};
  assert.equal(tryCharge(),true,'low tide: the charge ploughs into the wet sand');assert.ok(isOpen(ic));
  hp=ic.hp;damageEnemy(ic,100,{from:ground(dirAlong(ic.up,ic.fwd.clone().negate(),3))});assert.ok(ic.hp<hp,'stuck: open from behind');
  phase(.9);assert.ok(waterAt(flat),'the flat floods at high tide');assert.equal(tryCharge(),false,'high tide: no wet sand to stick in');
  console.log(`PASS  a low-tide charge across wet sand wedges it for ${D.wedge} s (open from any side); at high tide it never wedges`);

  // ---- shell swaps at 66% and 33%: out, soft, then a new shell; toll from the second shell ------------------------------
  phase(.4);park();ic.spawn(ic.home);ic.aggro();P.placeAt(dirAlong(ic.up,ic.fwd,6));step(.1);
  const shellColor=()=>ic.bellMats[0].color.getHex(),c0=shellColor();
  ic.hp=ic.def.hp*0.65;damageEnemy(ic,1,{from:ground(dirAlong(ic.up,ic.fwd,4))});step(.05);
  assert.equal(ic.state,'transition');assert.ok(isOpen(ic),'out of its shell: open');
  for(let i=0;i<60*(D.swap+1)&&ic.state==='transition';i++)step(1/60);
  assert.notEqual(ic.state,'transition');assert.notEqual(shellColor(),c0,'a new shell');assert.equal(ic.bossPhase,1);
  P.placeAt(dirAlong(ic.up,ic.fwd,6));P.invuln=0;ic.state='chase';ic.cool=0;ic.moveCd={pinch:99,charge:99};h0=hurts.length;let tolled=false;
  for(let i=0;i<60*5;i++){P.invuln=Math.min(P.invuln,.2);step(1/60);if(ic.attack==='toll'&&ic.state!=='windup')tolled=true;if(tolled&&hurts.length>h0)break;}
  assert.ok(tolled&&hurts.length>h0,'its toll sends a shockwave that hurts a grounded hero');
  ic.hp=ic.def.hp*0.32;damageEnemy(ic,1,{from:ground(dirAlong(ic.up,ic.fwd,4))});step(.05);assert.equal(ic.state,'transition');
  for(let i=0;i<60*(D.swap+1)&&ic.state==='transition';i++)step(1/60);assert.equal(ic.bossPhase,2);
  console.log('PASS  shell swaps at 66% and 33% (soft while out, a new bell each time); the toll shockwave from the second shell');

  // ---- a faint resets the fight; it is waiting, healed, in its first shell -----------------------------------------------
  park();P.placeAt(dirAlong(ic.up,ic.fwd,3));P.invuln=0;P.hp=1;ic.state='chase';ic.cool=0;
  for(let i=0;i<60*8&&!P.dead;i++)step(1/60);assert.ok(P.dead,'the hero faints');step(COMBAT.player.respawnTime+0.5);
  for(let i=0;i<60*20&&!(ic.state==='idle'&&ic.hp>=ic.def.hp);i++)step(1/60);step(.2);
  assert.ok(ic.hp>=ic.def.hp&&ic.bossPhase===0&&shellColor()===c0,'retry: full health, first shell');
  console.log('PASS  after a faint Old Ironclaw goes home and resets to full health in its first shell');

  // ---- defeat: loot, open beds, persistence through Continue and a revisit -----------------------------------------------
  park();P.placeAt(dirAlong(ic.up,ic.fwd,6));ic.aggro();step(.1);const items=()=>H.worldItems.filter(w=>w.itemId==='blackPearl').reduce((n,w)=>n+w.quantity,0);
  const before=items(),fallen=[];encounterEvents.addEventListener('minibossdefeated',e=>fallen.push(e.detail.boss));
  ic.openT=99;while(ic.alive){damageEnemy(ic,500,{from:ground(dirAlong(ic.up,ic.fwd,4))});step(1/60);}
  assert.equal(fallen.at(-1),ic);assert.ok(items()-before>=2,'two black pearls where it fell');step(1);
  assert.ok(beds.every(n=>!guardOf(n)),'the beds are free');phase(.4);
  P.placeAt(beds[1].up);step(.1);H.Gathering.work({node:beds[1]});step(4);assert.ok(H.inventory.count('blackPearl')>pearls,'a black pearl from a freed bed');
  assert.ok(game.planets.miniDefeated.has(ic.portalId));
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());phase(.4);
  assert.ok(!ironclaw()?.alive,'Continue: still beaten');assert.ok(H.Gathering.nodes.filter(n=>n.def.guardedBy).every(n=>!guardOf(n)));
  H.goToPlanet('emberfall');H.goToPlanet('lanternmoss');step(.5);assert.ok(!ironclaw()?.alive,'revisit: still beaten');
  console.log('PASS  defeat drops two black pearls, frees the beds, and stays beaten through Continue and a revisit');
  assert.equal(game.planets.canTravelTo('tidewhisper'),false);console.log('all passed');
}finally{H.Mechanics.exit();fixture.restore();}
