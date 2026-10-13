import * as THREE from 'three';
import { addCollider, addBoxCollider } from '../physics/colliders.js';
import { G, LM, part, addTo } from '../render/meshes.js';
import { dirAlong, offsetDir, tangentToward, frameQuat } from '../utils/sphere.js';
import { groundHeight, surfMFacing } from './terrain.js';
import { placed } from './placement.js';

export function buildCoastalVillage(B,spawn,stones,outer,coast,stoneCircle){
  const houses=[],sites=[offsetDir(spawn,.65,11),offsetDir(spawn,2.35,11.5),offsetDir(spawn,4.3,12),...outer];
  sites.forEach((dir,index)=>{
    const fwd=tangentToward(dir,spawn),A=B.at(surfMFacing(dir,fwd)),roof=[0x56aaba,0xe6bd74,0xd38e87,0x83b4a9,0x538da3,0x839fac][index];
    for(const x of [-1.4,1.4])for(const z of [-1.2,1.2])A(G.cyl(.12,.17,1.4,6),0x8d7258,LM(x,.6,z));
    A(G.box(3.3,.18,3),0xbda184,LM(0,1.2,0));A(G.box(2.8,1.9,2.2),0xffedd2,LM(0,2.2,0));
    for(const x of [-1.45,1.45])A(G.box(.15,1.95,.15),0x937753,LM(x,2.2,1.12));
    A(G.cone(2.4,1.25,4),roof,LM(0,3.75,0,0,Math.PI/4));A(G.box(.7,1.2,.1),0x698d91,LM(0,1.85,1.13));
    for(const x of [-.95,.95])A(G.box(.6,.6,.12),0xffd9a1,LM(x,2.35,1.15),{glow:true,intensity:1.4});
    for(let k=0;k<4;k++)A(G.box(1.1,.3,.4),0xbda184,LM(0,1.05-k*.3,1.5+k*.4));
    if(index===4){
      A(G.cyl(1.1,1.35,4,12),0xf4ead3,LM(0,4.7,0));A(G.cyl(1.12,1.2,.3,12),0x609fad,LM(0,5.2,0));
      A(G.cyl(1.4,1.4,.15,12),0x8e7460,LM(0,6.75,0));A(G.cone(1.45,1,12),0x538da3,LM(0,8,0));
      for(let k=0;k<8;k++){const a=k*Math.PI/4;A(G.cyl(.05,.05,1,5),0x8e7460,LM(Math.cos(a)*1.05,7.2,Math.sin(a)*1.05));}
    }
    addCollider(dir,1.9,{r:2.4,top:index===4?8.5:4.5});placed.push({dir,r:4});
    houses.push({dir,door:dirAlong(dir,fwd,3.4),fwd,r:1.9,kind:'stilt',coastal:true});
    const n=Math.floor(dir.angleTo(spawn)*72/1.2);
    for(let k=1;k<n;k++){const d=dir.clone().lerp(spawn,k/n).normalize();B.add(G.box(.9,.06,.55),0xc4aa8c,surfMFacing(d,tangentToward(d,spawn),1,.01));}
  });
  stoneCircle(B,stones);
  const start=offsetDir(spawn,-.55,35),center=offsetDir(spawn,-.55,41),end=offsetDir(spawn,-.55,46.5),up=center.clone();
  const facing=tangentToward(center,end),height=Math.max(coast.highWater+1,groundHeight(start)+.1),origin=center.clone().multiplyScalar(height);
  const M=new THREE.Matrix4().compose(origin,frameQuat(up,facing),new THREE.Vector3(1,1,1)),A=B.at(M);
  A(G.box(3.2,.18,14),0xc7a887,LM(0,-.09,0));
  for(let z=-6.5;z<7;z+=.7)A(G.box(3.25,.035,.06),0x8d7258,LM(0,.015,z));
  for(const x of [-1.35,1.35])for(const z of [-6,-2,2,6]){
    const d=origin.clone().addScaledVector(facing,z).addScaledVector(new THREE.Vector3().crossVectors(up,facing).normalize(),x).normalize(),length=height-groundHeight(d)+.6;
    A(G.cyl(.13,.18,length,6),0x8d7258,LM(x,-length/2+.3,z));
  }
  for(const x of [-1.5,1.5])A(G.box(.08,.08,10),0xe4d4b7,LM(x,.8,1));
  addBoxCollider(origin,up,facing,3.2,14,-.18,0,{movement:false,support:true,camera:false});placed.push({dir:center,r:8});
  const pier={start,center,end,height,dir:end};coast.pier=pier;
  const lighthouseLamp=new THREE.Group();addTo(lighthouseLamp,part(G.ico(.7,1),0xffe6a0,{glow:true,intensity:3}));
  lighthouseLamp.position.copy(houses[4].dir).multiplyScalar(groundHeight(houses[4].dir)+7.25);lighthouseLamp.visible=false;
  return {houses,houseA:houses[0],cottage:houses[1],pier,lighthouseLamp};
}
