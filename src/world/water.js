/* Pond water: a flat stylized shader with ripple rings, glints and a foam edge (one disc per pond). */
import * as THREE from 'three';
import { FOG_COLOR, FOG_FAR, FOG_NEAR } from '../render/scene.js';
import { matrixAt } from '../utils/sphere.js';
import { ponds } from './terrain.js';
import { pondLevel, seaLevel } from './physics.js';

/** Returns the water meshes and their shared material (its uTime drives the animation). */
export function createWater({ deep, light }, add = () => {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(deep) }, uLight: { value: new THREE.Color(light) },
    uFoam: { value: new THREE.Color(0xf6fffb) }, uFogColor: { value: FOG_COLOR }, uFogNear: FOG_NEAR, uFogFar: FOG_FAR },
    vertexShader: `varying vec2 vUv; varying float vDepth; varying vec3 vWorld; void main(){ vUv = uv; vWorld = (modelMatrix * vec4(position,1.0)).xyz; vec4 mv = modelViewMatrix * vec4(position,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uFogNear, uFogFar; uniform vec3 uDeep, uLight, uFoam, uFogColor; varying vec2 vUv; varying float vDepth; varying vec3 vWorld;
    void main(){
      vec3 col; float alpha = 0.8;
      #ifdef SEA
      vec2 p = vWorld.xz;
      float wave = sin(p.x * 0.8 + uTime * 0.35) * sin(p.y * 0.65 - uTime * 0.3);
      col = mix(uDeep, uLight, 0.32 + wave * 0.12);
      float g = step(0.995, sin(p.x * 3.8 + uTime * 1.3) * sin(p.y * 3.5 - uTime * 1.1));
      col += g * 0.4;
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
  return { meshes, material: mat, get ocean() { return ocean; }, sync() {
    ponds.forEach((p, i) => {
      const level = pondLevel(p); p.center.copy(p.dir).multiplyScalar(level);
      meshes[i].position.copy(p.center);
    });
    const level = seaLevel();
    if (level !== null && !ocean) {
      const seaMaterial = mat.clone(); seaMaterial.uniforms = mat.uniforms; seaMaterial.defines = { SEA: 1 };
      ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), seaMaterial);
      ocean.renderOrder = 1; meshes.push(ocean); add(ocean);
    }
    if (ocean) { ocean.visible = level !== null; if (level !== null) ocean.scale.setScalar(level); }
  } };
}
