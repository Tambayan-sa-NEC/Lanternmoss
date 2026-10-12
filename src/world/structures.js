import * as THREE from 'three';
import { STRUCTURE as S } from '../config/structures.js';
import { addTo, G, part } from '../render/meshes.js';
import { batchParts } from '../render/staticParts.js';

export function buildStructure(kind) {
  const root=new THREE.Group(), wood=0xb0703a, trim=0x8a5230, plaster=0xeacb9c, half=S.size/2;
  if(kind==='floor') {
    for(let i=0;i<8;i++)addTo(root,part(G.box(S.size,.18,.495),i%2?0xc89060:0xd7a77a),[0,.09,-half+(i+.5)*.5]);
    for(const x of [-1.75,1.75])for(const z of [-1.75,1.75])addTo(root,part(G.box(.24,.55,.24),trim),[x,-.275,z]);
  } else if(kind==='roof') {
    const slope=Math.atan(S.roofRise/half),length=Math.hypot(half,S.roofRise)+.12;
    for(const side of [-1,1])for(let row=0;row<4;row++){
      const x=side*(row+.5)*half/4,y=S.roofRise-Math.abs(x)*S.roofRise/half;
      addTo(root,part(G.box(length/4+.05,.14,S.size+.2),row%2?0x9b83c8:0x8971b3),[x,y,0],[0,0,-side*slope]);
    }
    addTo(root,part(G.box(.15,.18,S.size+.25),trim),[0,S.roofRise,0]);
    for(const z of [-half,half])for(const side of [-1,1])addTo(root,part(G.box(length,.12,.12),trim),[side*half/2,S.roofRise/2,z],[0,0,-side*slope]);
    const gable=new THREE.Shape();gable.moveTo(-half,0);gable.lineTo(half,0);gable.lineTo(0,S.roofRise);gable.closePath();
    for(const z of [-half,half])addTo(root,part(new THREE.ShapeGeometry(gable),plaster),[0,0,z],[0,z<0?Math.PI:0,0]);
  } else {
    const panel=(w,h,x,y,c=plaster)=>addTo(root,part(G.box(w,h,.18),c),[x,y,0]);
    if(kind==='doorway') { panel(1.25,S.wallHeight,-1.375,S.wallHeight/2);panel(1.25,S.wallHeight,1.375,S.wallHeight/2);panel(1.5,.35,0,S.wallHeight-.175); }
    else if(kind==='window') {
      panel(1.35,S.wallHeight,-1.325,S.wallHeight/2);panel(1.35,S.wallHeight,1.325,S.wallHeight/2);
      panel(1.3,.8,0,.4);panel(1.3,.5,0,S.wallHeight-.25);
      addTo(root,part(G.box(1.15,1.2,.05),0x8fd8ff,{glow:true,intensity:1.35}),[0,1.45,0]);
      panel(.08,1.3,0,1.45,trim);panel(1.3,.08,0,1.45,trim);
    } else panel(S.size,S.wallHeight,0,S.wallHeight/2);
    for(const x of [-half+.07,half-.07])panel(.14,S.wallHeight+.04,x,S.wallHeight/2,trim);
    panel(S.size,.12,0,S.wallHeight-.02,wood);
    if(kind!=='doorway')panel(S.size,.14,0,.09,wood);
  }
  batchParts(root);return {root};
}
