/* LOCAL LIGHT (TODO 29a, RENDER.localLight): light radii around the hero and lanterns, drawn in the toon shaders, and a
   small shared pool of real point lights. Built for dark places (caves, Duskhollow); on the open surface `darkness` is 0
   and nothing changes.
     Light radii: every MeshToonMaterial (via its prototype, so clones and cached materials too) reads up to `spots`
       light positions from shared uniforms and adds stepped (toon-banded) light inside each radius, scaled by darkness.
       In the dark nothing lit falls below `minAmbient` of its own colour, so shapes and ink outlines stay readable.
       One shader variant for every material: turning darkness up or down never recompiles anything.
     Real point lights: `realLights` of them, created once and shared. While any `real` source is within `realRange`
       of the hero, all of them are on (unused ones at zero intensity), so the light count never changes one by one
       (a change recompiles every lit shader). Indoors the pool is off; an interior keeps its own single light.
     Sources: LocalLights.add({ at, radius, color, intensity, real, outdoor }) -> handle with remove(). `at` is a live
       Vector3 (or a function returning one); the nearest sources to the hero get the spots. Owners remove their handles
       when their things go (Building.clear, planet changes); `count` is checked by the sims. */
import * as THREE from 'three';
import { RENDER } from '../config/render.js';
import { FOG_COLOR, SKY_DIM, scene } from './scene.js';

const L = RENDER.localLight;
const uniforms = {
  uLocalPos: { value: Array.from({ length: L.spots }, () => new THREE.Vector4()) },   // xyz, w = radius
  uLocalCol: { value: Array.from({ length: L.spots }, () => new THREE.Color(0, 0, 0)) },
  uLocalCount: { value: 0 }, uLocalStrength: { value: 0 }, uLocalMin: { value: L.minAmbient },
  uLocalBands: { value: new THREE.Vector2(...L.bands) },
};

/** Adds the light radii to a toon shader (onBeforeCompile). Materials with their own patch call it too. */
export function patchLocalLight(shader) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = 'varying vec3 vLocalWorld;\n' + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    vec4 localW = vec4(transformed, 1.0);
    #ifdef USE_BATCHING
      localW = batchingMatrix * localW;
    #endif
    #ifdef USE_INSTANCING
      localW = instanceMatrix * localW;
    #endif
    vLocalWorld = (modelMatrix * localW).xyz;`);
  shader.fragmentShader = `varying vec3 vLocalWorld;
    uniform vec4 uLocalPos[${L.spots}]; uniform vec3 uLocalCol[${L.spots}];
    uniform int uLocalCount; uniform float uLocalStrength, uLocalMin; uniform vec2 uLocalBands;\n` +
    shader.fragmentShader.replace('#include <opaque_fragment>', `if (uLocalStrength > 0.0) {
      vec3 localAcc = vec3(0.0);
      for (int i = 0; i < ${L.spots}; i++) {
        if (i >= uLocalCount) break;
        float d = distance(vLocalWorld, uLocalPos[i].xyz) / uLocalPos[i].w;
        localAcc += uLocalCol[i] * (d < uLocalBands.x ? 1.0 : d < 1.0 ? uLocalBands.y : 0.0);
      }
      outgoingLight += diffuseColor.rgb * localAcc * uLocalStrength;
      outgoingLight = max(outgoingLight, diffuseColor.rgb * uLocalMin * uLocalStrength);
    }
    #include <opaque_fragment>`);
}
THREE.MeshToonMaterial.prototype.onBeforeCompile = patchLocalLight;
THREE.MeshToonMaterial.prototype.customProgramCacheKey = () => 'local-light';

const _v = new THREE.Vector3();
const where = s => (typeof s.at === 'function' ? s.at(_v) : s.at);

export const LocalLights = {
  sources: new Set(), pool: [], poolOn: false, fogBase: new THREE.Color(), fogShown: new THREE.Color(), darkness: 0, hero: null, heroLight: null, world: null,
  get count() { return this.sources.size; },
  get uniforms() { return uniforms; },

  /** A light source; returns a handle whose remove() takes it away again. */
  add({ at, radius = 5, color = 0xffd36b, intensity = 1, real = false, outdoor = true }) {
    const s = { at, radius, color: new THREE.Color(color), intensity, real, outdoor };
    this.sources.add(s); return { source: s, remove: () => this.sources.delete(s) };
  },
  /** How dark the place is (0 = the surface as it always was, 1 = a cave): dims the sun and sky to dimFloor and turns
      the light radii on. The hero carries a light while it is dark. */
  setDarkness(d) {
    this.darkness = THREE.MathUtils.clamp(d, 0, 1); uniforms.uLocalStrength.value = this.darkness;
    if (this.darkness > 0 && !this.heroLight && this.hero) this.heroLight = this.add({ at: v => v.copy(this.hero.pos).addScaledVector(this.hero.up, 1.2), radius: L.heroRadius, color: 0xfff0d0, intensity: L.heroLight, outdoor: false });
    if (this.darkness === 0 && this.heroLight) { this.heroLight.remove(); this.heroLight = null; }
  },

  /** Per frame, after the world sets its daylight: dims it by the darkness, picks the spots and the real lights. */
  update(hero, { indoors = false, world = null } = {}) {
    this.hero = hero; if (!hero) return;
    if (world && this.darkness > 0) {
      const k = 1 - this.darkness * (1 - L.dimFloor);
      world.sun.intensity *= k; world.hemi.intensity *= k;          // set afresh each frame by setDaylight
    }
    this.dimSky();
    const near = [...this.sources].filter(s => !(indoors && s.outdoor))
      .map(s => ({ s, d: where(s).distanceTo(hero.pos) })).sort((a, b) => a.d - b.d);
    const spots = near.slice(0, L.spots);
    spots.forEach(({ s }, i) => {
      const p = where(s); uniforms.uLocalPos.value[i].set(p.x, p.y, p.z, s.radius);
      uniforms.uLocalCol.value[i].copy(s.color).multiplyScalar(s.intensity);
    });
    uniforms.uLocalCount.value = spots.length;
    const real = indoors ? [] : near.filter(x => x.s.real && x.d < L.realRange).slice(0, L.realLights);
    this.setPool(real.length > 0);
    this.pool.forEach((light, i) => {
      const r = real[i]?.s;
      light.intensity = r ? L.realPower * r.intensity : 0;
      if (r) { light.position.copy(where(r)); light.color.copy(r.color); light.distance = r.radius + 2; }
    });
  },
  /** The sky and fog drawn darker in the dark. The fog colour is rewritten by the weather only when it changes, so the
      undimmed colour is remembered and re-read whenever something else has changed it. */
  dimSky() {
    const k = 1 - this.darkness * (1 - L.skyFloor); SKY_DIM.value = k;
    if (!FOG_COLOR.equals(this.fogShown)) this.fogBase.copy(FOG_COLOR);
    this.fogShown.copy(this.fogBase).multiplyScalar(k); FOG_COLOR.copy(this.fogShown); scene.fog.color.copy(this.fogShown);
  },
  setPool(on) {
    if (on && !this.pool.length) for (let i = 0; i < L.realLights; i++) { const l = new THREE.PointLight(0xffd36b, 0, 7, 2); this.pool.push(l); scene.add(l); }
    if (on !== this.poolOn) { this.poolOn = on; for (const l of this.pool) l.visible = on; }
  },
  /** Point lights the scene would light right now (the pool's lit ones plus any other visible point light). */
  litPointLights() { let n = 0; scene.traverseVisible(o => { if (o.isPointLight) n++; }); return n; },
};
