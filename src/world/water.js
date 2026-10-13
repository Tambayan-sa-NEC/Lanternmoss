/* Pond water: a flat stylized shader with ripple rings, glints and a foam edge (one disc per pond). */
import * as THREE from 'three';
import { PLANET_RADIUS as R } from '../config/game.js';
import { FOG_COLOR, FOG_FAR, FOG_NEAR } from '../render/scene.js';
import { matrixAt } from '../utils/sphere.js';
import { groundHeight, ponds } from './terrain.js';
import { pondLevel, seaLevel, waterRegions } from './physics.js';

/** Returns the water meshes and their shared material (its uTime drives the animation). */
export function createWater({ deep, light }, add = () => {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSquall: {value:0}, uDeep: { value: new THREE.Color(deep) }, uLight: { value: new THREE.Color(light) },
    uFoam: { value: new THREE.Color(0xf6fffb) }, uFogColor: { value: FOG_COLOR }, uFogNear: FOG_NEAR, uFogFar: FOG_FAR },
    vertexShader: `varying vec2 vUv; varying float vDepth; varying vec3 vWorld;
    #ifdef SEA
    attribute float aGround; varying float vGround;
    #endif
    void main(){ vUv = uv; vWorld = (modelMatrix * vec4(position,1.0)).xyz;
    #ifdef SEA
    vGround = aGround;
    #endif
    vec4 mv = modelViewMatrix * vec4(position,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uSquall, uFogNear, uFogFar; uniform vec3 uDeep, uLight, uFoam, uFogColor; varying vec2 vUv; varying float vDepth; varying vec3 vWorld;
    #ifdef SEA
    uniform float uLevel; varying float vGround;
    #endif
    #ifdef OCEAN
    uniform vec4 uRegions[4]; uniform int uRegionCount;
    #endif
    void main(){
      vec3 col; float alpha = 0.8;
      #ifdef SEA
      #ifdef OCEAN
      for(int i=0;i<4;i++){ if(i < uRegionCount && dot(normalize(vWorld),uRegions[i].xyz) > uRegions[i].w) discard; }
      #endif
      vec2 p = vWorld.xz;
      float wave = sin(p.x * 0.8 + uTime * 0.35) * sin(p.y * 0.65 - uTime * 0.3);
      col = mix(uDeep, uLight, 0.32 + wave * 0.12);
      col = mix(col, uLight, (1.0-smoothstep(0.1,3.0,uLevel-vGround))*0.75);
      float g = step(0.995, sin(p.x * 3.8 + uTime * 1.3) * sin(p.y * 3.5 - uTime * 1.1));
      col += g * 0.4;
      float crest = smoothstep(0.65,0.95,sin(p.x*1.3+uTime*1.4)*sin(p.y*.9-uTime*1.1));
      col = mix(col,uFoam,crest*uSquall*.75);
      #else
      vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
      col = mix(uDeep, uLight, smoothstep(0.1, 0.95, r) * 0.65);
      float w = fract(r * 3.0 - uTime * 0.16 + sin(a * 5.0 + uTime * 0.6) * 0.04);
      float ring = smoothstep(0.0, 0.03, w) * (1.0 - smoothstep(0.07, 0.1, w));
      col = mix(col, uFoam, ring * 0.3);
      float g = step(0.975, sin(p.x * 38.0 + uTime * 1.3) * sin(p.y * 35.0 - uTime * 1.1));
      col += g * 0.7;
      col = mix(col, uFoam, smoothstep(0.87, 0.9, r));
      alpha = mix(0.8, 0.95, smoothstep(0.85, 0.9, r));
      #endif
      col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
      gl_FragColor = vec4(col, alpha); }`,
  });
  const meshes = ponds.map(p => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(p.r + 0.45, 28).rotateX(-Math.PI / 2), mat);
    w.applyMatrix4(matrixAt(p.center, p.dir, p.t1)); w.renderOrder = 1; return w;
  });
  let ocean = null;
  const regions = [];
  const seaMesh = (geometry, direction = null, ocean = false) => {
    const pos = geometry.attributes.position, v = new THREE.Vector3(), heights = new Float32Array(pos.count);
    const q = direction ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), direction) : new THREE.Quaternion();
    for (let i=0;i<pos.count;i++) { v.fromBufferAttribute(pos,i).applyQuaternion(q).normalize(); heights[i]=groundHeight(v); }
    geometry.setAttribute('aGround', new THREE.BufferAttribute(heights,1));
    const material = mat.clone(); material.uniforms = { ...mat.uniforms, uLevel: { value: 0 } }; material.defines = { SEA: 1 };
    if(ocean) { material.defines.OCEAN=1; const areas=waterRegions(); material.uniforms.uRegionCount={value:areas.length};
      material.uniforms.uRegions={value:Array.from({length:4},(_,i)=>areas[i]?new THREE.Vector4(...areas[i].dir,areas[i].edge):new THREE.Vector4())}; }
    const mesh = new THREE.Mesh(geometry,material); mesh.quaternion.copy(q); mesh.renderOrder=1; meshes.push(mesh); add(mesh); return mesh;
  };
  return { meshes, regions, material: mat, get ocean() { return ocean; }, sync() {
    ponds.forEach((p, i) => {
      const level = pondLevel(p); p.center.copy(p.dir).multiplyScalar(level);
      meshes[i].position.copy(p.center);
    });
    const level = seaLevel();
    if (level !== null && !ocean) {
      ocean = seaMesh(new THREE.SphereGeometry(1,128,64),null,true);
    }
    if (ocean) { ocean.visible = level !== null; if (level !== null) { ocean.scale.setScalar(level); ocean.material.uniforms.uLevel.value=level; } }
    waterRegions().forEach((region,i) => {
      if(!regions[i]) regions[i]=seaMesh(new THREE.SphereGeometry(1,64,16,0,Math.PI*2,0,region.radius/R),new THREE.Vector3(...region.dir));
      regions[i].scale.setScalar(region.level); regions[i].material.uniforms.uLevel.value=region.level;
    });
  } };
}
