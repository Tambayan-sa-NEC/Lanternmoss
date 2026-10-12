/* Local oriented boxes for modular floors and panels. All coordinates are in one foundation frame. */
import * as THREE from 'three';
import { WORLD } from '../config/game.js';
const delta=new THREE.Vector3();
export function boxPoint(box,p) { delta.copy(p).sub(box.origin); return {x:delta.dot(box.right),y:delta.dot(box.up),z:delta.dot(box.fwd)}; }
export function pointInBox(box,p,pad=0) {
  const q=boxPoint(box,p); return Math.abs(q.x)<box.width/2+pad&&Math.abs(q.z)<box.depth/2+pad&&q.y>=box.base-pad&&q.y<=box.top+pad;
}
export function pushBox(box,p,radius) {
  if(!box.movement)return null;
  const q=boxPoint(box,p);
  if(q.y<box.base-0.05||q.y>=box.top-(box.support?WORLD.stepHeight:0))return null;
  const w=box.width/2,d=box.depth/2,cx=Math.max(-w,Math.min(w,q.x)),cz=Math.max(-d,Math.min(d,q.z));
  let dx=q.x-cx,dz=q.z-cz,dist=Math.hypot(dx,dz),push=radius-dist;
  if(dist>=radius)return null;
  if(dist<1e-8) {
    if(w-Math.abs(q.x)<d-Math.abs(q.z)){dx=q.x>=0?1:-1;dz=0;push=radius+w-Math.abs(q.x);}
    else {dx=0;dz=q.z>=0?1:-1;push=radius+d-Math.abs(q.z);}
    dist=1;
  }
  const normal=box.right.clone().multiplyScalar(dx/dist).addScaledVector(box.fwd,dz/dist);
  p.addScaledVector(normal,push+0.001);return normal;
}
export function boxSupport(box,dir) {
  if(!box.support||dir.dot(box.up)<0.5)return null;
  const h=(box.origin.dot(box.up)+box.top)/dir.dot(box.up),p=dir.clone().multiplyScalar(h),q=boxPoint(box,p);
  return Math.abs(q.x)<=box.width/2+0.002&&Math.abs(q.z)<=box.depth/2+0.002?h:null;
}
