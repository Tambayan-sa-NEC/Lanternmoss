import { freeOfColliders } from '../physics/colliders.js';
import { rng } from '../utils/random.js';
import { randomDir, offsetDir } from '../utils/sphere.js';
import { dryGround, groundHeight, waterAt } from './terrain.js';
import { seaLevel } from './physics.js';
/** Ambient beach actors must fit above high water; sea shoals must remain in shallow water at low tide. */
export function coastalSpot(kind='beach',random=rng) {
  const high=seaLevel(true)??72.5;
  for(let i=0;i<1600;i++){
    const d=randomDir(random),h=groundHeight(d);
    if(kind==='water' ? h<69.5||h>70.6 : h<high+.15||h>high+2)continue;
    if(kind==='water'||dryGround(d,.6,{high:true})&&freeOfColliders(d,.6))return d;
  }return null;
}
export function nearbyWater(home) {
  for(let r=2;r<=12;r+=2)for(let a=0;a<6.28;a+=.4){const d=offsetDir(home,a,r);if(waterAt(d)?.depth>1.1)return d;}
  return home.clone();
}
