import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { dayClock } from '../../gameplay/dayClock.js';
import { audio } from '../../systems/AudioSystem.js';
import { emote } from '../../fx/emotes.js';
import { sparkles } from '../../fx/sparkles.js';
import { updateShadow } from '../../fx/shadows.js';
import { damp } from '../../utils/math.js';
import { rng } from '../../utils/random.js';
import { arcDist, tangentTo, tangentToward, turnToward } from '../../utils/sphere.js';
import { groundHeight, waterAt, dryGround } from '../../world/terrain.js';
import { nearbyWater } from '../../world/coastPlacement.js';
import { coastalActivity } from '../../config/coastalWildlife.js';
const velocity=new THREE.Vector3(),toward=new THREE.Vector3();
export function updateCoastalCritter(c,dt) {
  if(c.kind==='turtle'&&!c.waterHome)c.waterHome=nearbyWater(c.home);
  const dist=tangentTo(c.pos,c.up,ctx.player.pos,c.toP);c.cool-=dt;c.phase+=dt*4;
  let state=coastalActivity(c.kind,dayClock.phase,{near:dist<3.5,flooded:!!waterAt(c.up)});
  if(c.rare){
    if(['sit','flee'].includes(c.state)){c.timer-=dt;if(c.timer<=0)c.state='bask';}
    c.shy(dist);if(['sit','flee'].includes(c.state))state=c.state;
  }
  if(state==='bark'&&c.state!=='bark'&&c.cool<=0){audio.bark();emote(c,'♪','#83cdd2');c.cool=8;}
  c.state=state;
  const homeDist=arcDist(c.up,c.home),target=state==='swim'?c.waterHome:c.home;
  let speed=0;
  if(state==='swim'&&arcDist(c.up,target)>1||state==='return'||state==='bask'&&homeDist>1||state==='loaf'&&homeDist>3){toward.copy(tangentToward(c.up,target));speed=c.baseSpeed;}
  else if(state==='scuttle'){toward.copy(c.fwd);if(homeDist>3)toward.copy(tangentToward(c.up,c.home));else c.fwd.applyAxisAngle(c.up,Math.sin(c.phase*.3)*dt);speed=c.baseSpeed;}
  else if(state==='flee'){toward.copy(c.toP).negate();speed=3;}
  if(speed>0){turnToward(c.fwd,toward,c.up,damp(4,dt));velocity.copy(c.fwd).multiplyScalar(speed);
    if(c.kind==='crab'&&!dryGround(c.up)&&state!=='return')velocity.copy(tangentToward(c.up,c.home)).multiplyScalar(speed);
  }else velocity.set(0,0,0);
  c.speed=speed;c.step(velocity,dt,24);
  c.shellHide=(c.shellHide??0)+(+(state==='hide')-(c.shellHide??0))*damp(10,dt);
  if(c.kind==='crab')c.body.scale.setScalar(1-c.shellHide*.92);
  c.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(c.phase+i%2*Math.PI)*Math.min(.6,speed*.5);leg.rotation.z=c.kind==='crab'?Math.sin(c.phase+i)*speed*.15:0;});
  c.head.rotation.x=state==='nap'?.25:Math.sin(c.phase*.5)*.05;
  c.body.rotation.x=state==='bark'?-.12:0;
  if(c.rare&&rng()<dt*3)sparkles.emit(c.pos.clone().addScaledVector(c.up,.5),{count:1,color:c.rare.color,speed:.5,up:c.up,upBias:1,life:.8,size:.12});
  c.place(c.root);updateShadow(c.shadow,c.up,c.fwd,c.r-groundHeight(c.up));
}
