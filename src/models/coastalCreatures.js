/* Ambient bodies, independent of enemy Shellbacks. All builders share the Critter animation contract. */
import * as THREE from 'three';
import { G, addTo, part } from '../render/meshes.js';
import { batchRigidParts } from '../render/staticParts.js';
const group = (parent,x,y,z) => { const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g; };
const eyes = (head,w,z) => { for(const s of [-1,1])addTo(head,part(G.ico(.035,0),0x241c38,{outline:false}),[s*w,.06,z]); };
export function buildCrab(o) {
  const root=new THREE.Group(),body=group(root,0,0,0),shell=group(root,0,.38,-.08),head=group(body,0,.23,.27),tail=group(body,0,0,0),legs=[];
  addTo(shell,part(G.ico(.35,1),o.shell),[0,0,0],[0,0,.2],[1,1,1.2]);
  addTo(shell,part(new THREE.TorusGeometry(.18,.055,4,10),0xf5dcc0),[0,.06,.31],[.1,0,.2]);
  addTo(body,part(G.ico(.23,0),o.fur),[0,.2,.12],[0,0,0],[1.2,.55,1]);
  eyes(head,.13,.09);
  for(const s of [-1,1]){
    for(let k=0;k<3;k++){const leg=group(body,s*.2,.15,.2-k*.16);addTo(leg,part(G.box(.35,.045,.055),o.fur),[s*.15,0,-.04],[0,s*.35,s*.2]);legs.push(leg);}
    const claw=group(body,s*.22,.2,.36);addTo(claw,part(G.ico(.12,0),o.fur),[s*.13,0,.09],[0,0,0],[1,.6,1.5]);
    addTo(claw,part(G.cone(.07,.16,4),0xffcba0),[s*.16,.02,.22],[Math.PI/2,0,s*.4]);
  }
  return batchRigidParts({root,body,shell,head,tail,legs});
}
export function buildTurtle(o) {
  const root=new THREE.Group(),body=group(root,0,.1,0),head=group(body,0,.17,.55),tail=group(body,0,.12,-.5),legs=[];
  addTo(body,part(G.ico(.48,1),o.shell),[0,.23,0],[0,0,0],[1.1,.6,1.4]);
  addTo(body,part(G.ico(.4,1),o.belly),[0,.08,0],[0,0,0],[1.15,.25,1.5]);
  for(const [x,z] of [[0,0],[-.2,.18],[.2,.18],[-.2,-.18],[.2,-.18]])addTo(body,part(G.ico(.13,0),o.scute??0x447d75),[x,.47-Math.abs(x)*.5,z],[0,0,0],[1,.2,1.3]);
  addTo(head,part(G.ico(.17,1),o.fur),[0,0,0],[0,0,0],[1,.8,1.2]);eyes(head,.1,.12);
  for(const [s,z] of [[-1,.3],[1,.3],[-1,-.3],[1,-.3]]){const leg=group(body,s*.35,.08,z);addTo(leg,part(G.ico(.2,0),o.fur),[s*.15,0,0],[0,s*.35,0],[1.8,.2,.65]);legs.push(leg);}
  addTo(tail,part(G.cone(.045,.2,4),o.fur),[0,0,-.08],[Math.PI/2,0,0]);
  if(o.pearl)addTo(body,part(G.ico(.12,1),0xe8ffff,{glow:true,intensity:2.5}),[0,.57,0]);
  return batchRigidParts({root,body,head,tail,legs});
}
export function buildSeal(o) {
  const root=new THREE.Group(),body=group(root,0,0,0),head=group(body,0,.45,.58),tail=group(body,0,.12,-.58),legs=[];
  addTo(body,part(G.ico(.45,1),o.fur),[0,.28,0],[0,0,0],[.9,.65,1.65]);
  addTo(body,part(G.ico(.34,1),o.belly),[0,.17,.1],[0,0,0],[.85,.4,1.65]);
  addTo(head,part(G.ico(.22,1),o.fur),[0,0,0]);addTo(head,part(G.ico(.12,0),o.belly),[0,-.04,.18],[0,0,0],[1.4,.65,.75]);eyes(head,.12,.16);
  addTo(head,part(G.ico(.04,0),0x241c38,{outline:false}),[0,0,.26]);
  for(const s of [-1,1])for(const z of [.26,-.48]){const leg=group(body,s*.3,.1,z);addTo(leg,part(G.ico(.2,0),o.fur),[s*.11,0,0],[0,s*.5,0],[1.6,.2,.75]);legs.push(leg);}
  for(const s of [-1,1])addTo(head,part(G.box(.18,.015,.015),0xf4f0da,{outline:false}),[s*.18,-.05,.21],[0,-s*.3,0]);
  return batchRigidParts({root,body,head,tail,legs});
}
export const COASTAL_BUILDERS={crab:buildCrab,turtle:buildTurtle,seal:buildSeal};
