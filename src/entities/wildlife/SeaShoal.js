/* Bounded ambient fish, instanced in one draw per shoal. They follow live sea/lagoon levels, not pond planes. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dayClock } from '../../gameplay/dayClock.js';
import { scene } from '../../render/scene.js';
import { gradientMap } from '../../render/materials.js';
import { rng, mr } from '../../utils/random.js';
import { offsetDir, frameQuat, tangentFrame } from '../../utils/sphere.js';
import { waterAt } from '../../world/terrain.js';
const dummy=new THREE.Object3D(),hidden=new THREE.Matrix4().makeScale(0,0,0);
export class SeaShoal {
  constructor(dir,count=8,night=false) {
    this.dir=dir.clone();this.night=night;this.count=Math.max(1,Math.min(24,count));this.t=rng()*10;
    const body=new THREE.IcosahedronGeometry(.16,1).scale(.55,.65,1.4);
    const tail=new THREE.ConeGeometry(.11,.16,4).rotateX(Math.PI/2).scale(.3,1,1).translate(0,0,-.23);
    const tailGeo=tail.toNonIndexed(),geometry=mergeGeometries([body,tailGeo]);body.dispose();tailGeo.dispose();tail.dispose();
    this.material=new THREE.MeshToonMaterial({color:night?0x85d9d2:0xc4e9df,gradientMap,emissive:night?0x64c7c0:0x000000,emissiveIntensity:night?1.8:0});
    this.root=new THREE.InstancedMesh(geometry,this.material,this.count);this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.root);
    this.fish=Array.from({length:this.count},()=>({angle:rng()*6.28,radius:mr(1,3.2),speed:mr(.15,.3),size:mr(.8,1.15)}));
    this.visibleFish=0;this.update(0);
  }
  update(dt) {
    this.t+=dt;this.root.visible=!this.night||dayClock.phase==='night';this.visibleFish=0;
    for(let i=0;i<this.count;i++){
      const f=this.fish[i],angle=f.angle+this.t*f.speed,dir=offsetDir(this.dir,angle,f.radius),water=waterAt(dir);
      if(!water||water.depth<.5){hidden.setPosition(dir.clone().multiplyScalar(71));this.root.setMatrixAt(i,hidden);continue;}
      const [a,b]=tangentFrame(this.dir),heading=a.multiplyScalar(-Math.sin(angle)).addScaledVector(b,Math.cos(angle));
      dummy.position.copy(dir).multiplyScalar(water.level-.25-Math.sin(this.t*1.2+i)*.08);frameQuat(dir,heading,dummy.quaternion);
      dummy.scale.setScalar(f.size);dummy.updateMatrix();this.root.setMatrixAt(i,dummy.matrix);this.visibleFish++;
    }
    this.root.instanceMatrix.needsUpdate=true;this.root.computeBoundingSphere();
  }
  dispose(){scene.remove(this.root);this.root.geometry.dispose();this.material.dispose();this.root.dispose();}
}
