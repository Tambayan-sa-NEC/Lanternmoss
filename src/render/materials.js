/* ANIME MATERIALS: stepped toon ramp + screen-space inverted-hull outlines. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RENDER } from '../config/render.js';
import { FOG_COLOR, PIXEL_RATIO } from './scene.js';

export const gradientMap = (() => {
  const d = new Uint8Array([92, 92, 92, 255, 172, 172, 172, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.needsUpdate = true; return t;
})();   // 3 hard light bands

const toonCache = new Map(), glowCache = new Map();
export function toonMat(hex) { if (!toonCache.has(hex)) toonCache.set(hex, new THREE.MeshToonMaterial({ color: hex, gradientMap })); return toonCache.get(hex); }
export function glowMat(hex, k = 2.2) {
  const key = hex + '_' + k;
  if (!glowCache.has(key)) glowCache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) })); return glowCache.get(key);
}
export const toonVC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
export const glowVC = new THREE.MeshBasicMaterial({ vertexColors: true });
export const poolMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

/* Inverted hull: back faces pushed out along smooth normals by a constant number of PIXELS in clip space,
   so every object gets a crisp ink line regardless of size; it thins slightly with distance and fades into fog. */
export const outlineMat = new THREE.ShaderMaterial({
  uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: RENDER.outline.width * PIXEL_RATIO }, uColor: { value: new THREE.Color(RENDER.outline.color) },
    uFogColor: { value: FOG_COLOR }, uFogNear: { value: RENDER.fog.near }, uFogFar: { value: RENDER.fog.far } },
  vertexShader: `uniform vec2 uRes; uniform float uWidth; varying float vDepth;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec4 clip = projectionMatrix * mv;
      vec3 n = normalize(normalMatrix * normal);
      vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy;
      float l = length(dir); dir = l > 1e-5 ? dir / l : vec2(0.0);
      float w = uWidth * clamp(24.0 / clip.w, 0.45, 1.0);
      clip.xy += dir * w * 2.0 / uRes * clip.w;
      vDepth = -mv.z; gl_Position = clip; }`,
  fragmentShader: `uniform vec3 uColor, uFogColor; uniform float uFogNear, uFogFar; varying float vDepth;
    void main(){ gl_FragColor = vec4(mix(uColor, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0); }`,
  side: THREE.BackSide,
});

/** Faceted copy (non-indexed, per-face normals) for the flat low-poly look. */
export function facet(geo) { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.deleteAttribute('normal'); g.computeVertexNormals(); return g; }
/** Welded copy with smooth normals, used for the outline hull so it has no cracks. */
export function outlineGeo(geo) {
  let g = geo.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-3); g.computeVertexNormals(); return g;
}

/** Additive point-sprite material (fireflies, sparkles). uScale tracks the viewport; RenderSystem updates every one created here. */
export const pointMaterials = [];
export function makePointsMaterial(vertexShader, fragmentShader) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 } }, vertexShader, fragmentShader });
  pointMaterials.push(m); return m;
}
