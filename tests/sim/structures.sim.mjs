import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boot, imp } from './lib/boot.mjs';
const {game,H,step}=await boot('witch',{wake:false});
const {ctx}=await imp('core/context.js'),{STRUCTURE_ITEMS,STRUCTURE:S}=await imp('config/structures.js');
const {RECIPES}=await imp('config/crafting.js'),{bagCommands}=await imp('gameplay/bagCommands.js');
const {offsetDir,arcDist,dirAlong}=await imp('utils/sphere.js'),{snapBuildingDir}=await imp('gameplay/buildingRules.js');
const {floorFrame,resolveStructure}=await imp('gameplay/structureRules.js'),{groundHeight}=await imp('world/terrain.js');
const {supportHeight,cameraBlocked,resolveCollisions,colliders,camColliders}=await imp('physics/colliders.js');
const {camera}=await imp('render/scene.js'),{updateCamera,snapCamera,cam}=await imp('systems/CameraSystem.js');
const {parseSave}=await imp('core/save.js');
const B=H.Building,P=H.player,inv=H.inventory,cmd=bagCommands(inv);
function stand(dir,d=4){P.placeAt(offsetDir(dir,0,d));P.vel.set(0,0,0);P.vy=0;P.grounded=true;P.jumpBuf=0;P.invuln=10000;}
function findFoundation(){
  for(let r=18;r<120;r+=1.5)for(let a=0;a<6.28;a+=.08){const d=snapBuildingDir(offsetDir(game.world.spawnDir,a,r));if(!B.siteProblem('timberFloor',d,0,{actors:false})){
    const virtual={record:{id:999999,itemId:'timberFloor',dir:d.toArray(),turn:0,structure:{root:0,cell:[0,0]}},dir:d,baseHeight:B.baseHeight('timberFloor',d,0)};
    B.list.push(virtual);const f=floorFrame(B.list,virtual);let room=false;
    for(let turn=0;turn<4;turn++){const raw=f.center.clone().addScaledVector(f.fwd.clone().applyAxisAngle(f.up,turn*Math.PI/2),S.size).normalize(),c=resolveStructure(B.list,'timberFloor',raw,0);if(!B.siteProblem('timberFloor',c.dir,c.turn,{actors:false,candidate:c}))room=true;}
    B.list.pop();if(room){stand(d);if(!B.siteProblem('timberFloor',d))return d;}
  }}
  throw new Error(`No foundation on ${ctx.planetId}`);
}
function put(id,dir,turn=0){inv.add(id,1);const n=inv.count(id),r=B.place(id,dir,turn);assert.ok(r.ok,`${id}: ${r.message}`);assert.equal(inv.count(id),n-1);return B.list.at(-1);}
function build(){
  const d=findFoundation(),floor=put('timberFloor',d),f=floorFrame(B.list,floor);
  for(const [id,turn] of [['timberDoorway',0],['timberWall',2],['timberWindow',1],['timberWall',3]]) {const c=resolveStructure(B.list,id,d,turn);P.placeAt(dirAlong(c.dir,f.fwd.clone().applyAxisAngle(f.up,turn*Math.PI/2),1.5));P.vel.set(0,0,0);put(id,d,turn);}
  stand(d);put('timberRoof',d,0);return floor;
}
function onFloor(floor,x=0,z=0){const f=floorFrame(B.list,floor),p=f.center.clone().addScaledVector(f.right,x).addScaledVector(f.fwd,z).addScaledVector(f.up,S.floorTop);P.placeAt(p.clone().normalize());P.r=p.length();P.pos.copy(p);P.vel.set(0,0,0);P.vy=0;P.grounded=true;P.jumpBuf=0;return f;}
for(const id of Object.keys(STRUCTURE_ITEMS)){inv.clear();const r=RECIPES.find(r=>r.result===id);for(const [m,n]of r.needs)inv.add(m,n);P.placeAt(H.Stations.list.find(s=>s.id===r.station).dir);assert.ok(cmd.craft(r).ok);assert.equal(inv.count(id),1);}
inv.clear();
const d=findFoundation(); inv.add('timberWall',1);assert.equal(B.place('timberWall',d).ok,false);assert.equal(inv.count('timberWall'),1);inv.clear();
const floor=build(),f=floorFrame(B.list,floor),roof=B.list.find(e=>e.record.itemId==='timberRoof');
assert.equal(B.list.length,6);assert.equal(floor.colliders.length,1);assert.ok(floor.colliders[0].box.support);
console.log('PASS five real crafts, unsupported wall refusal and a floor with four rotated panels and a supported roof');

onFloor(floor);step(.2);assert.ok(Math.abs(P.r-supportHeight(P.up))<.01,'hero stands on the floor');
// Continuous square floor support, actual doorway traversal and wall collision.
for(const x of [-1.9,0,1.9])for(const z of [-1.9,0,1.9]){onFloor(floor,x,z);step(.1);assert.ok(P.r>=supportHeight(P.up)-.01);}
onFloor(floor,0,1.5);for(let i=0;i<30;i++)P.step(f.fwd.clone().multiplyScalar(2),.02);assert.ok(P.pos.clone().sub(f.center).dot(f.fwd)>2.5,'walk through the doorway');
onFloor(floor,0,-1.5);for(let i=0;i<30;i++)P.step(f.fwd.clone().multiplyScalar(-2),.02);assert.ok(P.pos.clone().sub(f.center).dot(f.fwd)>-1.7,'wall stops movement');
const wall=B.list.find(e=>e.record.itemId==='timberWall');
stand(d,7);B.updateStructureView(f.fwd);const wallPoint=wall.colliders[0].box.origin.clone().addScaledVector(f.up,1);assert.ok(cameraBlocked(wallPoint));
onFloor(floor);B.updateStructureView(f.fwd);assert.equal(roof.parts.root.visible,false);assert.ok(roof.colliders.every(c=>c.cameraActive===false));assert.equal(floor.colliders[0].active,true);
snapCamera(P.up,f.fwd);for(let i=0;i<15;i++)updateCamera(.1);assert.ok(camera.position.toArray().every(Number.isFinite));
stand(d,7);B.updateStructureView(f.fwd);assert.equal(roof.parts.root.visible,true);assert.ok(cameraBlocked(roof.colliders[0].box.origin.clone().addScaledVector(f.up,.5)));
onFloor(floor);P.vy=10;P.grounded=false;let highest=0;step(.8,()=>{highest=Math.max(highest,P.pos.clone().sub(f.center).dot(f.up));});assert.ok(highest<=S.floorTop+S.wallHeight-P.height+.04,'roof ceiling stops jumps even when cut away');
// Extend one legal edge and traverse its exact shared seam.
let joined=null;
for(let turn=0;turn<4&&!joined;turn++) {
  const raw=f.center.clone().addScaledVector(f.fwd.clone().applyAxisAngle(f.up,turn*Math.PI/2),S.size).normalize();
  const c=resolveStructure(B.list,'timberFloor',raw,0);
  if(!c.problem&&!B.siteProblem('timberFloor',c.dir,c.turn,{actors:false,candidate:c})) {stand(raw);joined=put('timberFloor',raw);}
}
assert.ok(joined,'there is a valid connected floor');
const jf=floorFrame(B.list,joined);assert.ok(jf.up.distanceTo(f.up)<1e-12);assert.ok(jf.fwd.distanceTo(f.fwd)<1e-12);
const midpoint=f.center.clone().add(jf.center).multiplyScalar(.5).addScaledVector(f.up,S.floorTop),dir=midpoint.clone().normalize();assert.ok(Math.abs(supportHeight(dir)-midpoint.length())<.01,'seam has no support gap');
stand(joined.dir,2.5);assert.ok(B.remove(joined).ok,'outer floor can be returned safely');
console.log('PASS square floor support, door traversal, blocking walls/camera, inside cutaway and restored exterior view');

// One nonessential panel may be picked up, but the remaining opposite pair supports the roof.
const optional=B.list.find(e=>e.record.itemId==='timberWall'&&e.record.turn===3);stand(optional.dir,1.2);assert.ok(B.remove(optional).ok);
// Decorations inherit floor height and persist as dependencies. Occupied walls cannot be consumed.
onFloor(floor,-.4,-.4);const bedDir=P.up.clone();stand(d);put('homeBed',bedDir);onFloor(floor,1.1,1.1);const chestDir=P.up.clone();stand(d);put('storageChest',chestDir);
const chest=B.list.find(e=>e.store);onFloor(floor);inv.add('wood',9);assert.equal(B.transfer(chest,'deposit',inv.find('wood')),9);
const before=B.toJSON();assert.ok(H.saves.save().ok);assert.ok(H.saves.continue());assert.deepEqual(B.toJSON(),before);
assert.equal(B.list.find(e=>e.store).store.count('wood'),9);
const restoredFloor=B.list.find(e=>e.record.id===floor.record.id),restoredWall=B.list.find(e=>e.record.id===wall.record.id);
stand(restoredWall.dir,1.2);assert.match(B.remove(restoredWall).message,/roof/);
stand(restoredFloor.dir,2.5);assert.equal(B.remove(restoredFloor).ok,false);
const wallQty=inv.count('timberWall');inv.add('timberWall',1);stand(restoredWall.dir,1.2);assert.equal(B.place('timberWall',restoredFloor.dir,restoredWall.record.turn).ok,false);assert.equal(inv.count('timberWall'),wallQty+1);
console.log('PASS floor-mounted bed/storage, chest contents through Continue, duplicate refusal and safe structural dependency pickup');

// An unordered imported snapshot is restored topologically, without duplicating contents/colliders.
const saved=H.saves.registry.snapshot(ctx.planetId);saved.planets[ctx.planetId].building.reverse();const count=colliders.length,cameraCount=camColliders.length;
assert.ok(H.saves.importData(saved));assert.deepEqual(B.toJSON().map(e=>e.id).sort((a,b)=>a-b),before.map(e=>e.id).sort((a,b)=>a-b));assert.equal(colliders.length,count);assert.equal(camColliders.length,cameraCount);
H.planets.defeated.add('lanternmoss');P.placeAt(H.Portals.gate.dir);assert.ok(H.Portals.travel('emberfall'));step(2);assert.equal(B.list.length,0);build();const ember=B.toJSON();
H.planets.defeated.add('emberfall');P.placeAt(H.Portals.gate.dir);assert.ok(H.Portals.travel('frostveil'));step(2);assert.equal(B.list.length,0);build();const frost=B.toJSON();
P.placeAt(H.Portals.gate.dir);assert.ok(H.Portals.travel('lanternmoss'));step(2);assert.equal(B.list.find(e=>e.store).store.count('wood'),9);assert.equal(B.list.length,before.length);
P.placeAt(H.Portals.gate.dir);assert.ok(H.Portals.travel('emberfall'));step(2);assert.deepEqual(B.toJSON(),ember);
P.placeAt(H.Portals.gate.dir);assert.ok(H.Portals.travel('frostveil'));step(2);assert.deepEqual(B.toJSON(),frost);
console.log('PASS unordered restore, stable collider counts and independent shelters on all three planets');
const legacy=parseSave(readFileSync(new URL('../fixtures/save-v1.json',import.meta.url),'utf8'));assert.ok(H.saves.importData(legacy.data));assert.equal(B.list.length,0);game.resetRun();assert.equal(B.list.length,0);
console.log('PASS legacy saves and fresh adventures clear every structure and support collider');console.log('all passed');
