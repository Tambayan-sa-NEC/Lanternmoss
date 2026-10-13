/* Fixed caps and seeded placement: cosmetic quality changes never resample this scenery. */
import { G, LM } from '../render/meshes.js';
import { addCollider, freeOfColliders } from '../physics/colliders.js';
import { rr } from '../utils/random.js';
import { randomDir, arcDist } from '../utils/sphere.js';
import { dryGround, groundHeight, surfM, slopeAt } from './terrain.js';
import { placed } from './placement.js';
import { propTree, propRock, TREE_KINDS } from './props.js';
import { seaLevel } from './physics.js';
export function scatterCoastalFlora(B,flora,spots) {
  const grown={},high=seaLevel(true)??72.5;
  const spot=(r,wet=false)=>{
    for(let i=0;i<600;i++){
      const d=randomDir(),h=groundHeight(d);
      if(wet ? h<70||h>70.8 : h<high+.2||h>high+4)continue;
      if(!wet&&!dryGround(d,r,{high:true})||slopeAt(d)>.8||!freeOfColliders(d,r)||placed.some(p=>arcDist(d,p.dir)<r+p.r))continue;
      placed.push({dir:d,r});return d;
    }return null;
  };
  for(const [kind,count] of Object.entries(flora.coastal.trees))for(let i=0;i<Math.min(64,count);i++){
    const def=TREE_KINDS[kind],d=spot(kind==='lanternPalm'?2:1,kind==='kelp'||kind==='coralFan');if(!d)continue;
    const s=rr(.85,1.15);propTree(B,surfM(d,rr(0,6.28),s),kind);grown[kind]=(grown[kind]??0)+1;
    spots.trees.push({dir:d,kind,s,r:def.r*s});
    if(kind!=='kelp')addCollider(d,def.r*s,{r:def.cam.r*s,base:def.cam.base*s,top:def.cam.top*s});
  }
  for(let i=0;i<10;i++){
    const d=spot(1.5);if(!d)continue;const s=rr(.9,1.3);propRock(B,surfM(d,rr(0,6.28),s),'rock');
    spots.rocks.push({dir:d,kind:'rock',s,r:1.05*s});addCollider(d,1.05*s,{r:1.1*s,top:s});
  }
  B.decorative=true;
  for(const [kind,count] of Object.entries(flora.coastal.plants))for(let i=0;i<Math.min(96,count);i++){
    const d=spot(.4);if(!d)continue;const A=B.at(surfM(d,rr(0,6.28),rr(.8,1.15)));
    if(kind==='duneGrass')for(let k=0;k<5;k++)A(G.cone(.035,.7,3),0xa3c88d,LM((k-2)*.09,.3,0,0,0,(k-2)*.13),{outline:false});
    else for(let k=0;k<3;k++){
      const x=(k-1)*.14,y=kind==='seaLavender'?.6:.32;
      A(G.cyl(.018,.025,y,4),0x70ad91,LM(x,y/2,0),{outline:false});
      A(kind==='seaLavender'?G.cone(.075,.3,5):G.ico(.1,0),kind==='seaLavender'?0xbda3e8:0xf4a2c0,LM(x,y,0),{outline:false});
    }
  }
  B.decorative=false;return grown;
}
