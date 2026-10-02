/* Pond water: a flat stylized shader with ripple rings, glints and a foam edge (one disc per pond). */
import * as THREE from 'three';
import { RENDER } from '../config/render.js';
import { FOG_COLOR } from '../render/scene.js';
import { matrixAt } from '../utils/sphere.js';
import { ponds } from './terrain.js';

/** Returns the water meshes and their shared material (its uTime drives the animation). */
export function createWater() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x3f9cc4) }, uLight: { value: new THREE.Color(0x9fe8e4) },
    uFoam: { value: new THREE.Color(0xf6fffb) }, uFogColor: { value: FOG_COLOR }, uFogNear: { value: RENDER.fog.near }, uFogFar: { value: RENDER.fog.far } },
    vertexShader: `varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uFogNear, uFogFar; uniform vec3 uDeep, uLight, uFoam, uFogColor; varying vec2 vUv; varying float vDepth;
    void main(){
      vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
      vec3 col = mix(uDeep, uLight, smoothstep(0.1, 0.95, r) * 0.65);
      float w = fract(r * 3.0 - uTime * 0.16 + sin(a * 5.0 + uTime * 0.6) * 0.04);
      float ring = smoothstep(0.0, 0.03, w) * (1.0 - smoothstep(0.07, 0.1, w));
      col = mix(col, uFoam, ring * 0.3);
      float g = step(0.975, sin(p.x * 38.0 + uTime * 1.3) * sin(p.y * 35.0 - uTime * 1.1));
      col += g * 0.7;
      col = mix(col, uFoam, smoothstep(0.87, 0.9, r));
      col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
      gl_FragColor = vec4(col, mix(0.8, 0.95, smoothstep(0.85, 0.9, r))); }`,
  });
  const meshes = ponds.map(p => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(p.r + 0.45, 28).rotateX(-Math.PI / 2), mat);
    w.applyMatrix4(matrixAt(p.center, p.dir, p.t1)); w.renderOrder = 1; return w;
  });
  return { meshes, material: mat };
}
