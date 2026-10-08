/* Sky dome (painterly gradient, anime sun and cloud streaks), puffy cloud batch and drifting fireflies. */
import * as THREE from 'three';
import { PLANET_RADIUS as R } from '../config/game.js';
import { Batcher } from '../render/Batcher.js';
import { makePointsMaterial } from '../render/materials.js';
import { G, LM } from '../render/meshes.js';
import { rand, rpick, rr } from '../utils/random.js';
import { matrixAt, randomDir, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from './terrain.js';

const V3 = THREE.Vector3;
export const CLOUD_AXIS = new V3(0.3, 1, 0.2).normalize();

/** colors: horizon / mid / zenith gradient stops. */
export function createSky({ horizon, mid, zenith }) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uUp: { value: new V3(0, 1, 0) }, uSun: { value: new V3(1, 0.2, 0) }, uTime: { value: 0 },
      cHorizon: { value: new THREE.Color(horizon) }, cMid: { value: new THREE.Color(mid) }, cZenith: { value: new THREE.Color(zenith) },
      cSun: { value: new THREE.Color(0xffc987) }, cCloud: { value: new THREE.Color(0xfff1ec) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position,1.0)).xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uUp, uSun, cHorizon, cMid, cZenith, cSun, cCloud; uniform float uTime; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir); float h = dot(d, uUp);
      float wob = sin(d.x * 9.0 + uTime * 0.05) * sin(d.z * 7.0 + d.y * 5.0) * 0.03;
      float t = clamp(h + wob, 0.0, 1.0);
      float tq = floor(t * 7.0) / 7.0; t = mix(t, tq, 0.35);           // painterly soft banding
      vec3 col = mix(cHorizon, cMid, smoothstep(0.02, 0.28, t));
      col = mix(col, cZenith, smoothstep(0.28, 0.8, t));
      // stylized cloud streaks with hard anime edges
      float n = sin(d.x * 6.0 + uTime * 0.02) * sin(d.z * 5.0 - uTime * 0.015) + 0.5 * sin(d.y * 11.0 + d.x * 7.0 + d.z * 3.0);
      float band = smoothstep(0.03, 0.12, h) * (1.0 - smoothstep(0.3, 0.5, h));
      float cl = smoothstep(0.62, 0.66, n * 0.5 + 0.5) * band;
      col = mix(col, cCloud, cl * 0.8);
      float s = max(dot(d, uSun), 0.0);
      col += cSun * pow(s, 6.0) * 0.55;
      col = mix(col, vec3(1.7, 1.55, 1.25), smoothstep(0.9965, 0.9975, s));  // sun disc (blooms)
      col += vec3(0.25, 0.18, 0.1) * smoothstep(0.984, 0.985, s) * (1.0 - smoothstep(0.986, 0.987, s)); // anime halo ring
      if (h < 0.0) col = mix(cHorizon, cHorizon * 0.95, clamp(-h * 4.0, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0); }`,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false;
  return sky;
}

export function createClouds() {
  const cb = new Batcher();
  for (let i = 0; i < 40; i++) { const d = randomDir(), rad = R + rr(26, 38), [t1] = tangentFrame(d);
    const M = matrixAt(d.clone().multiplyScalar(rad), d, t1), col = rpick([0xfff6f0, 0xffe4ee, 0xfff0dc]);
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) { const s = rr(1.3, 2.4) * (k === 0 ? 1.3 : 1);
      cb.add(G.ico(1, 1), col, M.clone().multiply(LM((k - n / 2) * 1.6 + rr(-0.4, 0.4), rr(-0.2, 0.4), rr(-0.8, 0.8), 0, 0, 0, s, s * 0.62, s)), { jitter: 0.05 }); } }
  return cb.build();
}

export function createFireflies() {
  const N = 480, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N), c = new THREE.Color();
  for (let i = 0; i < N; i++) { const d = randomDir(), h = groundHeight(d) + rr(0.4, 4.2); pos.set([d.x * h, d.y * h, d.z * h], i * 3);
    c.set(rpick([0xfff2a0, 0xffd27a, 0xc8ffb0, 0xffc0e0, 0xbff4ff])); col.set([c.r, c.g, c.b], i * 3); seed[i] = rand(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = makePointsMaterial(
    `uniform float uTime, uScale; attribute vec3 aColor; attribute float aSeed; varying vec3 vC; varying float vA;
     void main(){ vec3 up = normalize(position);
       vec3 p = position + up * sin(uTime * 0.8 + aSeed * 6.28) * 0.4
              + vec3(sin(uTime * 0.5 + aSeed * 20.0), cos(uTime * 0.4 + aSeed * 13.0), sin(uTime * 0.45 + aSeed * 7.0)) * 0.5;
       vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
       float tw = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0);
       vA = tw; vC = aColor; gl_PointSize = 0.2 * (0.6 + tw * 0.7) * uScale / max(0.5, -mv.z); }`,
    `varying vec3 vC; varying float vA;
     void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a; if (a * vA < 0.01) discard;
       gl_FragColor = vec4(vC * (1.2 + 2.5 * smoothstep(0.18, 0.0, d)), a * vA); }`);
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}
