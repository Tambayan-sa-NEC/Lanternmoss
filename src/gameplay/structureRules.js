import * as THREE from 'three';
import { STRUCTURE as S } from '../config/structures.js';
import { PLACEABLES } from '../config/placeables.js';
import { arcDist, matrixAt } from '../utils/sphere.js';
import { buildingFootprint, buildingForward } from './buildingRules.js';

export const isFloor = e => PLACEABLES[e.record.itemId]?.structure === 'floor';
export const isPanel = e => ['wall', 'doorway', 'window'].includes(PLACEABLES[e.record.itemId]?.structure);
export function rootFloor(list, floor) { return floor?.record.structure?.root ? list.find(e => e.record.id === floor.record.structure.root && isFloor(e)) : floor; }
export function floorFrame(list, floor) {
  const root = rootFloor(list, floor); if (!root) return null;
  const up = root.dir.clone(), fwd = buildingForward(up, root.record.turn), right = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const origin = up.clone().multiplyScalar(root.baseHeight), cell = floor.record.structure?.cell ?? [0,0];
  const center = origin.clone().addScaledVector(right, cell[0] * S.size).addScaledVector(fwd, cell[1] * S.size);
  return { root, up, fwd, right, origin, center };
}
export function localOnFloor(list, floor, dir) {
  const frame = floorFrame(list, floor); if (!frame) return null;
  const point = dir.clone().multiplyScalar(frame.center.dot(frame.up) / dir.dot(frame.up)).sub(frame.center);
  return { ...frame, x: point.dot(frame.right), z: point.dot(frame.fwd) };
}
export function floorAt(list, dir, radius = 0) {
  return list.filter(isFloor).find(f => { const p = localOnFloor(list,f,dir); return p && Math.abs(p.x)+radius <= S.size/2+0.002 && Math.abs(p.z)+radius <= S.size/2+0.002; }) ?? null;
}
export function panelKey(list, record) {
  const floor = list.find(e => e.record.id === record.structure?.floor && isFloor(e)); if (!floor) return '';
  const cell = floor.record.structure?.cell ?? [0,0], root = rootFloor(list,floor).record.id;
  const sides = [[0,1],[1,0],[0,-1],[-1,0]], [x,z] = sides[record.turn];
  return `${root}:${cell[0]*2+x}:${cell[1]*2+z}`;
}
export function roofSupported(list, floorId, excluding = null) {
  const turns = list.filter(e => e !== excluding && isPanel(e) && e.record.structure.floor === floorId).map(e => e.record.turn);
  // A shared edge's panel belongs to either neighbouring floor, so use canonical edge keys.
  const floor = list.find(e => e.record.id === floorId && isFloor(e)); if (!floor) return false;
  for (let t=0;t<4;t++) {
    const key = panelKey(list,{structure:{floor:floorId},turn:t});
    if (list.some(e => e !== excluding && isPanel(e) && panelKey(list,e.record) === key) && !turns.includes(t)) turns.push(t);
  }
  return turns.includes(0)&&turns.includes(2) || turns.includes(1)&&turns.includes(3);
}
export function pieceFootprint(list, record) {
  const def=PLACEABLES[record.itemId],dir=new THREE.Vector3(...record.dir);
  if(!['wall','doorway','window'].includes(def.structure))return buildingFootprint(record.itemId,dir,record.turn);
  const floor=list.find(e=>e.record.id===record.structure?.floor&&isFloor(e));if(!floor)return buildingFootprint(record.itemId,dir,record.turn);
  const f=floorFrame(list,floor),normal=f.fwd.clone().applyAxisAngle(f.up,record.turn*Math.PI/2),side=new THREE.Vector3().crossVectors(f.up,normal).normalize(),center=f.center.clone().addScaledVector(normal,S.size/2);
  return Array.from({length:9},(_,i)=>(i-4)*.465).filter(x=>def.structure!=='doorway'||Math.abs(x)>.7).map(x=>({dir:center.clone().addScaledVector(side,x).normalize(),r:.14}));
}

/** Resolve raw ground aim into a floor cell, a floor edge, a roof, or a decoration on a floor. */
export function resolveStructure(list, id, dir, turn = 0) {
  const def = PLACEABLES[id], kind = def?.structure;
  if (!dir) return { dir, turn, problem:'Point at the ground.' };
  if (kind === 'floor') {
    const near = list.filter(isFloor).map(f => ({f,d:arcDist(f.dir,dir)})).sort((a,b)=>a.d-b.d)[0];
    if (near && near.d < S.size + S.snapReach/2) {
      const root = rootFloor(list,near.f), p = localOnFloor(list,root,dir), cell = [Math.round(p.x/S.size),Math.round(p.z/S.size)];
      const structure = {root:root.record.id,cell};
      const center = p.origin.clone().addScaledVector(p.right,cell[0]*S.size).addScaledVector(p.fwd,cell[1]*S.size);
      const floors = list.filter(isFloor).filter(f => rootFloor(list,f) === root);
      let problem = null;
      if (cell.some(n=>Math.abs(n)>S.span)) problem='This foundation is at its 5 by 5 tile limit. Start a separate foundation farther away.';
      else if (floors.some(f => f.record.structure.cell[0]===cell[0] && f.record.structure.cell[1]===cell[1])) problem='That floor cell is already occupied.';
      else if (!floors.some(f => Math.abs(f.record.structure.cell[0]-cell[0])+Math.abs(f.record.structure.cell[1]-cell[1])===1)) problem='Join this floor to an existing floor edge.';
      return {dir:center.normalize(),turn:root.record.turn,structure,problem};
    }
    return {dir,turn,structure:{root:0,cell:[0,0]}};
  }
  if (kind) {
    const floor = list.filter(isFloor).map(f=>({f,d:arcDist(f.dir,dir)})).sort((a,b)=>a.d-b.d)[0]?.f;
    if (!floor || arcDist(floor.dir,dir)>S.snapReach) return {dir,turn,problem:'Place a Timber Floor first, then point at it.'};
    const frame = floorFrame(list,floor), structure = {floor:floor.record.id}, center = frame.center.clone();
    if (kind !== 'roof') center.addScaledVector(frame.fwd.clone().applyAxisAngle(frame.up,turn*Math.PI/2),S.size/2);
    return {dir:center.normalize(),turn,structure,problem:kind==='roof'&&!roofSupported(list,floor.record.id)?'A roof needs walls on two opposite floor edges.':null};
  }
  if (!def?.farm) {
    const floor = floorAt(list,dir,def.radius); if (floor) return {dir,turn,structure:{floor:floor.record.id}};
  }
  return {dir,turn};
}
export function pieceMatrix(list, record, baseHeight) {
  const kind = PLACEABLES[record.itemId].structure, data = record.structure;
  if (kind === 'floor') { const floor = {record,dir:new THREE.Vector3(...record.dir),baseHeight}; const f=floorFrame(list,floor); return matrixAt(f.center,f.up,f.fwd); }
  const floor = data?.floor && list.find(e=>e.record.id===data.floor&&isFloor(e)); if (!floor) return null;
  const f=floorFrame(list,floor), dir=new THREE.Vector3(...record.dir), center=dir.multiplyScalar(f.center.dot(f.up)/dir.dot(f.up));
  const height = kind==='roof' ? S.floorTop+S.wallHeight : S.floorTop;
  center.addScaledVector(f.up,height);
  return matrixAt(center,f.up,f.fwd.clone().applyAxisAngle(f.up,record.turn*Math.PI/2));
}
/** Canonical attachments on restore use saved floor IDs, rather than choosing either side of a shared edge. */
export function restoredStructureCandidate(list, record) {
  const dir=new THREE.Vector3(...record.dir),kind=PLACEABLES[record.itemId].structure,data=record.structure;
  const result={dir,turn:record.turn,structure:data};
  if(!data) return kind?{...result,problem:'Missing structure support.'}:result;
  if(kind==='floor') {
    if(data.root===0)return result;
    const root=list.find(e=>e.record.id===data.root&&isFloor(e)&&!e.record.structure.root);if(!root)return {...result,problem:'Missing foundation.'};
    const p=localOnFloor(list,root,root.dir),expected=p.origin.clone().addScaledVector(p.right,data.cell[0]*S.size).addScaledVector(p.fwd,data.cell[1]*S.size).normalize();
    const neighbours=list.filter(isFloor).filter(f=>rootFloor(list,f)===root);
    if(record.turn!==root.record.turn||expected.distanceTo(dir)>1e-5||!neighbours.some(f=>Math.abs(f.record.structure.cell[0]-data.cell[0])+Math.abs(f.record.structure.cell[1]-data.cell[1])===1))return {...result,problem:'Invalid connected floor.'};
    return result;
  }
  const floor=list.find(e=>e.record.id===data.floor&&isFloor(e));if(!floor)return {...result,problem:'Missing floor.'};
  if(!kind) {
    const p=localOnFloor(list,floor,dir),r=PLACEABLES[record.itemId].radius;
    if(PLACEABLES[record.itemId].farm||Math.abs(p.x)+r>S.size/2+.002||Math.abs(p.z)+r>S.size/2+.002)return {...result,problem:'Decoration does not fit its floor.'};
    return result;
  }
  const f=floorFrame(list,floor),expected=f.center.clone();if(kind!=='roof')expected.addScaledVector(f.fwd.clone().applyAxisAngle(f.up,record.turn*Math.PI/2),S.size/2);
  if(expected.normalize().distanceTo(dir)>1e-5)return {...result,problem:'Invalid floor attachment.'};
  if(kind==='roof'&&!roofSupported(list,floor.record.id))return {...result,problem:'Missing roof support.'};
  return result;
}
export function pieceConflict(list, a, b) {
  const ak=PLACEABLES[a.itemId].structure, bk=PLACEABLES[b.itemId].structure;
  if (ak==='floor'&&bk==='floor') {
    const ar=a.structure?.root||a.id, br=b.structure?.root||b.id;
    if(ar===br) return a.structure.cell[0]===b.structure.cell[0]&&a.structure.cell[1]===b.structure.cell[1];
  }
  if (['wall','doorway','window'].includes(ak)&&['wall','doorway','window'].includes(bk)) return panelKey(list,a)===panelKey(list,b);
  const af=ak==='floor'?a.id:a.structure?.floor, bf=bk==='floor'?b.id:b.structure?.floor;
  if (af&&af===bf) {
    if(ak==='roof'||bk==='roof') return ak==='roof'&&bk==='roof';
    if(ak==='floor'||bk==='floor') return false;
  }
  if (ak==='floor'&&b.structure?.floor) {
    const parent=list.find(e=>e.record.id===b.structure.floor); if(parent&&rootFloor(list,parent)?.record.id===(a.structure?.root||a.id)) return false;
  }
  if (bk==='floor'&&a.structure?.floor) {
    const parent=list.find(e=>e.record.id===a.structure.floor); if(parent&&rootFloor(list,parent)?.record.id===(b.structure?.root||b.id)) return false;
  }
  if (ak==='roof'&&b.structure?.floor || bk==='roof'&&a.structure?.floor) return false;
  return null; // normal footprint check
}
export function structureRemovalProblem(list, e, playerDir) {
  if (isFloor(e)) {
    if (floorAt([ ...list ],playerDir)?.record.id===e.record.id) return 'Step off this floor before picking it up.';
    if(list.some(x=>x!==e&&(x.record.structure?.floor===e.record.id||x.record.structure?.root===e.record.id))) return 'Pick up the supported pieces and connected floors first.';
    const root=rootFloor(list,e), remaining=list.filter(f=>f!==e&&isFloor(f)&&rootFloor(list,f)===root);
    if(remaining.length) {
      const seen=new Set([remaining[0]]); let changed=true;
      while(changed) {changed=false;for(const f of remaining)if(!seen.has(f)&&[...seen].some(n=>Math.abs(f.record.structure.cell[0]-n.record.structure.cell[0])+Math.abs(f.record.structure.cell[1]-n.record.structure.cell[1])===1)){seen.add(f);changed=true;}}
      if(seen.size!==remaining.length)return 'Keep the remaining floors connected, or dismantle the outer tiles first.';
    }
  }
  if(isPanel(e)&&list.some(x=>PLACEABLES[x.record.itemId].structure==='roof'&&!roofSupported(list,x.record.structure.floor,e)))return 'Pick up the roof before removing its supporting wall.';
  return null;
}
