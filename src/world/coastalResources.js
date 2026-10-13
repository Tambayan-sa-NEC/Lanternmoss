import { NODE_KINDS } from '../config/resources.js';
import { ResourceNode } from '../entities/ResourceNode.js';
import { freeOfColliders } from '../physics/colliders.js';
import { mulberry32 } from '../utils/random.js';
import { arcDist, offsetDir } from '../utils/sphere.js';
import { groundHeight, slopeAt, dryGround } from './terrain.js';

// Separate seeded stream and stable requested ids: failed placements never renumber saved claims.
export function coastalResources(world, planet, avoid) {
  const nodes=[],random=mulberry32((planet.seed^0x5eed51)>>>0);
  let serial=0;
  for(const [kind,count,near] of [...planet.resources.nodes,...planet.resources.rare??[]]) {
    const def=NODE_KINDS[kind];
    for(let n=0;n<count;n++) {
      const id=`${planet.id}:node:${serial++}`;
      for(let attempt=0;attempt<500;attempt++) {
        const island=world.coast.islands[def.rare?5:Math.floor(random()*world.coast.islands.length)];
        const dir=def.rare?offsetDir(world.coast.pearlBeach,random()*6.28,random()*2.8)
          :near==='village'?offsetDir(world.spawnDir,random()*6.28,12+random()*19)
          :offsetDir(island.dir,random()*6.28,island.radius*(.65+random()*.5));
        const h=groundHeight(dir),low=planet.tides.low,high=planet.tides.high;
        if(def.lowTide ? h<low+.12||h>low+(def.rare?1.05:.5) : !dryGround(dir,def.r,{high:true}))continue;
        if(def.washup&&(h<high+.15||h>high+1))continue;
        if(slopeAt(dir)>.65||!freeOfColliders(dir,def.r+.3)||avoid.some(([d,r])=>arcDist(dir,d)<r+def.r))continue;
        if(nodes.some(node=>arcDist(node.up,dir)<node.def.r+def.r+1.2))continue;
        const node=new ResourceNode(kind,dir,serial);node.id=id;nodes.push(node);break;
      }
    }
  }
  return nodes;
}
