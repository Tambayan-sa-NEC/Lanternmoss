import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STRUCTURE_ITEMS, STRUCTURE as S } from '../src/config/structures.js';
import { RECIPES } from '../src/config/crafting.js';
import { itemRegistry } from '../src/items/ItemRegistry.js';
import { cleanState } from '../src/core/save.js';
import { floorFrame, panelKey, pieceFootprint, pieceMatrix, resolveStructure, restoredStructureCandidate, roofSupported, structureRemovalProblem } from '../src/gameplay/structureRules.js';
import { boxSupport, pointInBox, pushBox } from '../src/physics/boxCollision.js';
const up=new THREE.Vector3(0,1,0),floor={record:{id:1,itemId:'timberFloor',dir:[0,1,0],turn:0,structure:{root:0,cell:[0,0]}},dir:up,baseHeight:72};
const make=(id,itemId,structure,turn=0)=>({record:{id,itemId,structure,turn},dir:up});
test('five structural pieces are craftable from first-world resources with no discovery/hero/coin gate',()=>{
  assert.equal(Object.keys(STRUCTURE_ITEMS).length,5);
  for(const [id,def] of Object.entries(STRUCTURE_ITEMS)){
    const r=RECIPES.find(r=>r.result===id);assert.ok(r&&!r.discovery&&!r.hero&&!r.coins);assert.equal(r.station,'workbench');
    assert.ok(r.needs.every(([id,n])=>itemRegistry.has(id)&&n>0));assert.ok(itemRegistry.has(id)&&def.structure);
  }
});
test('connected floors share exact seams and one frame rather than tilting independently on the sphere',()=>{
  const frame=floorFrame([floor],floor),raw=frame.origin.clone().addScaledVector(frame.right,4.1).normalize();
  const c=resolveStructure([floor],'timberFloor',raw,3);assert.deepEqual(c.structure,{root:1,cell:[1,0]});assert.equal(c.turn,0);assert.equal(c.problem,null);
  const record={id:2,itemId:'timberFloor',dir:c.dir.toArray(),turn:c.turn,structure:c.structure},m=pieceMatrix([floor],record,0),origin=new THREE.Vector3().setFromMatrixPosition(m);
  assert.ok(origin.distanceTo(frame.origin.clone().addScaledVector(frame.right,4))<1e-12);
  const a=new THREE.Vector3(2,0,0).applyMatrix4(pieceMatrix([],floor.record,72)),b=new THREE.Vector3(-2,0,0).applyMatrix4(m);assert.ok(a.distanceTo(b)<1e-12);
  assert.match(resolveStructure([floor],'timberFloor',up).problem,/occupied/);
});
test('panels rotate between four edges, shared edges deduplicate, and roofs need opposite supports',()=>{
  const list=[floor];
  for(let turn=0;turn<4;turn++){
    const c=resolveStructure(list,'timberWall',up,turn);assert.deepEqual(c.structure,{floor:1});const p=pieceMatrix(list,{itemId:'timberWall',dir:c.dir.toArray(),turn,structure:c.structure},0);
    assert.ok(Math.abs(new THREE.Vector3().setFromMatrixPosition(p).distanceTo(up.clone().multiplyScalar(72+S.floorTop))-2)<1e-10);
  }
  assert.equal(roofSupported(list,1),false);list.push(make(3,'timberWall',{floor:1},0),make(4,'timberDoorway',{floor:1},2));assert.equal(roofSupported(list,1),true);
  assert.equal(roofSupported(list,1,list[1]),false);
  const neighbour=make(2,'timberFloor',{root:1,cell:[1,0]});list.push(neighbour);
  assert.equal(panelKey(list,{structure:{floor:1},turn:1}),panelKey(list,{structure:{floor:2},turn:3}));
  const rotated={...floor,record:{...floor.record,turn:1}},c=resolveStructure([rotated],'timberWall',up,0),fp=pieceFootprint([rotated],{itemId:'timberWall',turn:0,dir:c.dir.toArray(),structure:c.structure});assert.ok(fp[4].dir.distanceTo(c.dir)<1e-12,'wall occupancy follows the rotated foundation');
});
test('dependency-aware pickup prevents supported pieces and disconnected foundations',()=>{
  const wall=make(2,'timberWall',{floor:1},0),opposite=make(3,'timberWindow',{floor:1},2),roof=make(4,'timberRoof',{floor:1});
  const list=[floor,wall,opposite,roof],outside=new THREE.Vector3(0,1,.1).normalize();
  assert.match(structureRemovalProblem(list,floor,outside),/supported/);assert.match(structureRemovalProblem(list,wall,outside),/roof/);assert.equal(structureRemovalProblem(list,roof,outside),null);
  assert.match(structureRemovalProblem([floor],floor,up),/Step off/);
  const bridge=make(5,'timberFloor',{root:1,cell:[1,0]}),outer=make(6,'timberFloor',{root:1,cell:[2,0]}),side=make(7,'timberFloor',{root:1,cell:[0,1]});assert.match(structureRemovalProblem([floor,bridge,outer,side],bridge,outside),/connected/);
});
test('oriented floor support is continuous to square edges, and wall boxes leave a real door opening',()=>{
  const box={origin:new THREE.Vector3(0,72,0),up,fwd:new THREE.Vector3(0,0,1),right:new THREE.Vector3(1,0,0),width:4,depth:4,base:-.65,top:.18,movement:true,support:true};
  for(const x of [-2,-1.99,0,1.99,2]) {const d=new THREE.Vector3(x,72.18,0).normalize();assert.ok(Math.abs(boxSupport(box,d)-new THREE.Vector3(x,72.18,0).length())<1e-9);}
  assert.equal(boxSupport(box,new THREE.Vector3(2.1,72.18,0).normalize()),null);
  const panel={...box,origin:new THREE.Vector3(-1.375,72.18,2),width:1.25,depth:.18,base:0,top:2.6,support:false};
  const door=new THREE.Vector3(0,72.18,2);assert.equal(pushBox(panel,door,.42),null);assert.equal(pointInBox(panel,door),false);
  const at=new THREE.Vector3(-1,72.18,2);assert.ok(pushBox(panel,at,.42));assert.ok(Math.abs(at.z-2)>.5);
});
test('save cleaning bounds structural cells/IDs and restoration rejects malformed or unsupported attachments',()=>{
  const valid={id:1,itemId:'timberFloor',dir:[0,1,0],turn:0,structure:{root:0,cell:[0,0]}};
  const cleaned=cleanState('building',[valid,{...valid,id:2,structure:{root:0,cell:[1,0]}},{...valid,id:3,structure:{root:1,cell:[999,0]}},{id:4,itemId:'timberRoof',dir:[0,1,0],structure:{floor:99}}]);
  assert.equal(cleaned.length,2);assert.deepEqual(cleanState('building',cleaned),cleaned);
  assert.match(restoredStructureCandidate([floor],cleaned[1]).problem,/Missing floor/);
  assert.deepEqual(cleanState('building',null),[]);
});
