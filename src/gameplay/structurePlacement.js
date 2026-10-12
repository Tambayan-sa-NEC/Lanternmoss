import * as THREE from 'three';
import { STRUCTURE as S } from '../config/structures.js';
import { PLACEABLES } from '../config/placeables.js';
import { groundHeight } from '../world/terrain.js';
import { addBoxCollider } from '../physics/colliders.js';
import { floorFrame, isFloor, pieceMatrix, rootFloor } from './structureRules.js';

/** Validate the shared plane against actual ground at corners/edges, including spherical curvature. */
export function foundationProblem(building, candidate) {
  if(PLACEABLES[candidate.itemId].structure!=='floor')return null;
  if(!candidate.structure.root)return null;
  const root=building.list.find(e=>e.record.id===candidate.structure.root&&isFloor(e));
  if(!root)return 'That foundation no longer exists.';
  const record={id:0,itemId:candidate.itemId,dir:candidate.dir.toArray(),turn:candidate.turn,structure:candidate.structure};
  const matrix=pieceMatrix(building.list,record,root.baseHeight);
  for(const x of [-2,0,2])for(const z of [-2,0,2]){
    const p=new THREE.Vector3(x,0,z).applyMatrix4(matrix),d=p.clone().normalize(),gap=p.length()-groundHeight(d);
    if(gap<-.025||gap>S.maxFoundationGap)return 'This floor cannot meet the foundation plane on this terrain. Start a separate foundation.';
  }
  return null;
}
export function structureBoxes(e) {
  const kind=PLACEABLES[e.record.itemId].structure;if(!kind)return [];
  const matrix=e.parts.root.matrix,origin=new THREE.Vector3().setFromMatrixPosition(matrix),up=new THREE.Vector3(0,1,0).transformDirection(matrix),fwd=new THREE.Vector3(0,0,1).transformDirection(matrix),right=new THREE.Vector3().crossVectors(up,fwd).normalize();
  const box=(x,width,depth,base,top,options)=>addBoxCollider(origin.clone().addScaledVector(right,x),up,fwd,width,depth,base,top,options);
  if(kind==='floor')return [box(0,S.size,S.size,-S.maxFoundationGap,S.floorTop,{support:true})];
  if(kind==='roof')return [box(0,S.size+.2,S.size+.2,0,S.roofRise+.15,{movement:false,ceiling:true})];
  if(kind==='doorway')return [box(-1.375,1.25,.18,0,S.wallHeight),box(1.375,1.25,.18,0,S.wallHeight),box(0,1.5,.18,S.wallHeight-.35,S.wallHeight)];
  return [box(0,S.size,.18,0,S.wallHeight)];
}
/** Restore the outside view on exit. Cutaways never disable walking collision or floor support. */
export function updateStructureView(building, playerDir, cameraForward) {
  const insideRoots=new Set();
  for(const floor of building.list.filter(isFloor)){
    const frame=floorFrame(building.list,floor),p=playerDir.clone().multiplyScalar(frame.center.dot(frame.up)/playerDir.dot(frame.up)).sub(frame.center);
    if(Math.abs(p.dot(frame.right))<S.size/2+.1&&Math.abs(p.dot(frame.fwd))<S.size/2+.1)insideRoots.add(frame.root.record.id);
  }
  for(const e of building.list){
    const kind=PLACEABLES[e.record.itemId].structure;if(!kind||kind==='floor')continue;
    const floor=building.list.find(f=>isFloor(f)&&f.record.id===e.record.structure.floor),root=floor&&rootFloor(building.list,floor);
    let hidden=false;
    if(root&&insideRoots.has(root.record.id)) {
      const normal=new THREE.Vector3(0,0,1).transformDirection(e.parts.root.matrix);
      hidden=kind==='roof'||normal.dot(cameraForward)<-.15;
    }
    e.parts.root.visible=!hidden;e.colliders.forEach(c=>{c.cameraActive=!hidden;});
  }
}
