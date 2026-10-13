import assert from 'node:assert/strict';
import { installTideFixture } from './lib/tideFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture=installTideFixture();
const {game,H,step}=await boot('witch',{wake:false});
const {dayClock}=await imp('gameplay/dayClock.js'),{DAY}=await imp('config/day.js');
const {ctx}=await imp('core/context.js'),{PLAYER}=await imp('config/game.js');
const {dryGround,waterAt,groundHeight}=await imp('world/terrain.js');
const {seaLevel,seaLevelAt,waterRegions}=await imp('world/physics.js');
const {arcDist,offsetDir,tangentToward}=await imp('utils/sphere.js');
const {dom}=await imp('ui/dom.js');
const W=game.world,P=H.player,instance=()=>H.Mechanics.active.instance;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const atPhase=f=>{const target=f*DAY.length;dayClock.skip((target-dayClock.t+DAY.length)%DAY.length || DAY.length,'test');};
const nodes=()=>H.Gathering.nodes.map(n=>[n.id,...n.up.toArray()]);
try {
  H.Tutorial.skip();P.invuln=10000;
  assert.ok(W.coast);assert.equal(H.Farm.plots.length,6,'protected site must produce a full farm');
  assert.ok(H.Farm.plots.every(p=>dryGround(p.dir,1,{high:true})));assert.ok(H.Gathering.nodes.length>=18);
  assert.ok(H.Gathering.nodes.every(n=>dryGround(n.up,n.def.r,{high:true})));
  const lowNodes=nodes();atPhase(.4);near(seaLevel(),71);assert.ok(instance().status.causewayOpen);
  const cross=()=>{
    const end=offsetDir(W.spawnDir,0,86);P.placeAt(offsetDir(W.spawnDir,0,74));P.vy=0;P.grounded=true;P.sprinting=false;P.energy=80;
    let swimming=0,frames=0;const start=P.energy;
    while(arcDist(P.up,end)>.12 && frames++<1200){P.step(tangentToward(P.up,end).multiplyScalar(PLAYER.walkSpeed),1/60);if(P.swimming)swimming++;H.Needs.update(1/60);}
    assert.ok(frames<1200,'causeway must be traversable in both phases');return {swimming,drain:start-P.energy,seconds:frames/60};
  };
  const low=cross();assert.equal(low.swimming,0);atPhase(.9);near(seaLevel(),72.5);assert.equal(instance().status.causewayOpen,false);
  const high=cross();assert.ok(high.swimming>30);assert.ok(high.drain/high.seconds>low.drain/low.seconds+0.01,JSON.stringify({low,high}));
  assert.ok(W.water.ocean);near(W.water.ocean.scale.x,72.5);near(W.water.regions[0].scale.x,72.5);
  assert.deepEqual(nodes(),lowNodes,'tide must not move node ids or positions');
  step(.3);assert.ok(dom.hud.innerHTML.includes('High tide')&&dom.hud.innerHTML.includes('Causeway flooded'));
  console.log('PASS  protected village/farm, high-water-safe nodes, real low/high causeway walking/swimming and faster swimming energy drain; clock chip renders');

  P.placeAt(W.coast.lagoon.dir);P.vy=0;step(.1);assert.ok(P.swimming);
  const ocean=seaLevel();assert.ok(instance().drainLagoon());near(seaLevelAt(W.coast.lagoon.dir),68.8);near(W.water.regions[0].scale.x,68.8);near(seaLevel(),ocean);
  step(.5);assert.equal(P.swimming,false);assert.ok(P.grounded);near(P.r,groundHeight(P.up));
  const remaining=instance().toJSON().drainRemaining;ctx.paused=true;step(1);near(instance().toJSON().drainRemaining,remaining);ctx.paused=false;
  assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());near(instance().toJSON().drainRemaining,remaining);near(W.water.regions[0].scale.x,68.8);
  assert.deepEqual(nodes(),lowNodes);assert.ok(H.Farm.plots.every(p=>dryGround(p.dir,1,{high:true})));
  dayClock.skip(remaining+1,'sleep');assert.equal(instance().toJSON().drainRemaining,0);near(W.water.regions[0].scale.x,seaLevel());
  console.log('PASS  lagoon drainage changes rendering and physics without draining the ocean; pause, Continue and sleep restore/expire the bounded timer once');

  P.placeAt(W.spawnDir);instance().drainLagoon(40);const expectedNodes=nodes();H.inventory.add('wayfarerKey',2);
  const travel=id=>{P.placeAt(H.Portals.gate.dir);assert.ok(H.Portals.travel(id));step(2);assert.equal(ctx.planetId,id);};
  travel('emberfall');assert.equal(H.Mechanics.id,null);assert.equal(seaLevel(),null);assert.deepEqual(waterRegions(),[]);
  dayClock.skip(DAY.length*3,'sleep');travel('lanternmoss');assert.equal(instance().toJSON().drainRemaining,0);assert.deepEqual(nodes(),expectedNodes);
  atPhase(.4);assert.ok(instance().status.causewayOpen);atPhase(.9);assert.equal(instance().status.causewayOpen,false);
  assert.equal(game.planets.canTravelTo('tidewhisper'),false,'actual unfinished world stays outside campaign travel');
  const {parseSave}=await imp('core/save.js'),{readFileSync}=await import('node:fs');
  const old=parseSave(readFileSync(new URL('../fixtures/save-v1.json',import.meta.url),'utf8'));assert.ok(H.saves.restore(old.data));assert.equal(H.Mechanics.id,null);assert.equal(seaLevel(),null);
  W.dispose();assert.deepEqual(waterRegions(),[]);
  console.log('PASS  real keyed travel isolates water rules, away-time refloods and placement stays seeded; original v1 remains valid and unfinished Tidewhisper is inaccessible');
  console.log('all passed');
} finally { H.Mechanics.exit();fixture.restore(); }
