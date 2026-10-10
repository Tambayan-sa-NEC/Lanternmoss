/* WEATHER (config/weather.js): spells of weather drawn from the planet's own mix (PLANETS[i].weather), blending from
   one into the next. Each frame it sets the wind the grass sways in (scatter.js WIND), the fog distance and colour,
   the sky's tint, how bright the light is (World.setDaylight multiplies by `light`), and how much rain, snow, ash or
   petals fall in a box that travels with the hero; storms flash with lightning. The rain and wind loops play
   through audio.ambience. Nothing here changes the rules of play. */
import * as THREE from 'three';
import { RENDER } from '../config/render.js';
import { WEATHER, WEATHER_KINDS } from '../config/weather.js';
import { makePointsMaterial } from '../render/materials.js';
import { setFogColor, setFogRange } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { frameQuat, tangentFrame } from '../utils/sphere.js';
import { WIND } from './scatter.js';
import { rng } from '../utils/random.js';

const NUM = ['wind', 'fog', 'light', 'overcast', 'rain', 'snow', 'embers', 'petals'];
const mix = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + rng() * (b - a);

/** The shared part of every particle shader: a seeded point in the box, falling (or rising) and drifting with the wind. */
const FALL = `uniform float uTime, uIntensity, uFall, uHalf, uHeight; uniform vec2 uDrift; attribute vec3 aPos; attribute float aSeed;
  vec3 fallPos() {
    vec3 p = aPos; float t = uTime * (0.75 + 0.5 * aSeed);
    p.y = mod(p.y - t * uFall, uHeight);
    p.xz = mod(p.xz + uDrift * t + uHalf, 2.0 * uHalf) - uHalf;
    return p;
  }`;

function particles(count, extra = 0) {
  const { half, height } = WEATHER.volume, pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([rnd(-half, half), rnd(0, height), rnd(-half, half)], i * 3); seed[i] = rng(); }
  const g = new THREE.BufferGeometry();
  if (!extra) { g.setAttribute('aPos', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g; }
  // rain: two vertices per drop (a streak): the same seed point, aEnd 0 / 1
  const p2 = new Float32Array(count * 6), s2 = new Float32Array(count * 2), end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { p2.set(pos.subarray(i * 3, i * 3 + 3), i * 6); p2.set(pos.subarray(i * 3, i * 3 + 3), i * 6 + 3); s2[i * 2] = s2[i * 2 + 1] = seed[i]; end[i * 2 + 1] = 1; }
  g.setAttribute('aPos', new THREE.BufferAttribute(p2, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s2, 1)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  g.setAttribute('position', new THREE.BufferAttribute(p2, 3));
  return g;
}
function uniforms(fall) {
  return { uTime: { value: 0 }, uIntensity: { value: 0 }, uFall: { value: fall }, uHalf: { value: WEATHER.volume.half }, uHeight: { value: WEATHER.volume.height }, uDrift: { value: new THREE.Vector2() } };
}
/** Soft round points (snow, ash, petals), sized in world units. */
function pointsLayer(count, fall, size, color, flicker = 0) {
  const m = makePointsMaterial(`${FALL} uniform float uScale; varying float vA;
    void main(){ vec3 p = fallPos(); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      float on = step(aSeed, uIntensity); float edge = smoothstep(0.0, 2.0, p.y) * smoothstep(uHeight, uHeight - 3.0, p.y);
      vA = on * edge * (1.0 - ${flicker.toFixed(2)} * (0.5 + 0.5 * sin(uTime * 9.0 + aSeed * 50.0)));
      gl_PointSize = on * ${size.toFixed(3)} * (0.7 + 0.6 * aSeed) * uScale / max(0.5, -mv.z); }`,
  `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA; if (a < 0.02) discard;
     gl_FragColor = vec4(vec3(${new THREE.Color(color).toArray().map(v => v.toFixed(3)).join(',')}) * 1.3, a); }`);
  Object.assign(m.uniforms, uniforms(fall));
  const pts = new THREE.Points(particles(count), m); pts.frustumCulled = false; return pts;
}
/** Rain: thin streaks along the fall. */
function rainLayer(count) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: uniforms(19),
    vertexShader: `${FALL} attribute float aEnd; varying float vA;
      void main(){ vec3 p = fallPos(); vec3 dir = normalize(vec3(uDrift.x, -uFall, uDrift.y));
        p -= dir * aEnd * (0.55 + 0.4 * aSeed);
        float on = step(aSeed, uIntensity); vA = on * smoothstep(0.0, 2.0, p.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); if (on < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`,
    fragmentShader: `varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(0.82, 0.88, 1.0, 0.42 * vA); }` });
  const l = new THREE.LineSegments(particles(count, 1), m); l.frustumCulled = false; return l;
}

export class Weather {
  /** mixes = the planet's { kind: weight }; palette = its colours (fog, sky). Adds its layers through `add`. */
  constructor(mixes, palette, add) {
    this.mixes = mixes ?? { clear: 1 }; this.baseFog = new THREE.Color(palette.fog);
    this.from = 'clear'; this.to = 'clear'; this.k = 1; this.timer = WEATHER.arrival; this.flash = 0; this.boltT = rnd(6, 14); this.now = {};
    this.group = new THREE.Group();
    const C = WEATHER.counts;
    this.layers = { rain: rainLayer(C.rain), snow: pointsLayer(C.snow, 1.6, 0.16, 0xffffff), embers: pointsLayer(C.embers, -1.2, 0.2, 0xff9a4a, 0.6),
      petals: pointsLayer(C.petals, 0.9, 0.14, 0xffb8d8) };
    for (const l of Object.values(this.layers)) this.group.add(l);
    add(this.group);
    this.materials = Object.values(this.layers).map(l => l.material);
    this.fogCol = new THREE.Color(); this.update(0, 0, null, null);
  }
  get kind() { return this.k < 0.5 ? this.from : this.to; }
  applyDensity(density) {
    for (const [id, layer] of Object.entries(this.layers)) {
      layer.geometry.setDrawRange(0, Math.floor(WEATHER.counts[id] * density) * (id === 'rain' ? 2 : 1));
      layer.visible = layer.geometry.drawRange.count > 0 && layer.material.uniforms.uIntensity.value > 0.005;
    }
  }
  get label() { const w = WEATHER_KINDS[this.kind]; return `${w.icon} ${w.label}`; }
  /** Starts a new spell (debug, or the next roll): kind = a WEATHER_KINDS key, or random from the planet's mix. */
  set(kind = null, instant = false) {
    const next = kind ?? this.roll();
    this.from = this.kind; this.to = next; this.k = instant ? 1 : 0; this.timer = rnd(...WEATHER.duration);
  }
  roll() {
    const e = Object.entries(this.mixes).filter(([k]) => k !== this.to || Object.keys(this.mixes).length === 1);
    let r = rng() * e.reduce((t, [, w]) => t + w, 0);
    for (const [k, w] of e) if ((r -= w) <= 0) return k;
    return e[0][0];
  }
  /** Per frame: blends toward the next spell, applies wind, fog, sky and particles. player = where the box goes. */
  update(dt, time, player, sky) {
    if ((this.timer -= dt) <= 0) this.set();
    this.k = Math.min(1, this.k + dt / WEATHER.blend);
    const a = WEATHER_KINDS[this.from], b = WEATHER_KINDS[this.to], k = this.k, n = this.now;
    for (const key of NUM) n[key] = mix(a[key] ?? 0, b[key] ?? 0, k);
    const ta = new THREE.Color(a.tint ?? this.baseFog), tb = new THREE.Color(b.tint ?? this.baseFog);
    this.tint = ta.lerp(tb, k);
    // wind, fog and the sky
    WIND.uWind.value = n.wind;
    setFogRange(RENDER.fog.near * n.fog, RENDER.fog.far * n.fog);
    setFogColor(this.fogCol.copy(this.baseFog).lerp(this.tint, n.overcast * 0.8));
    if (sky) {
      const su = sky.material.uniforms; sky.base ??= { h: su.cHorizon.value.clone(), m: su.cMid.value.clone(), z: su.cZenith.value.clone() };
      const t = n.overcast * 0.75, dim = 0.65 + 0.35 * n.light;
      su.cHorizon.value.copy(sky.base.h).lerp(this.tint, t).multiplyScalar(dim); su.cMid.value.copy(sky.base.m).lerp(this.tint, t).multiplyScalar(dim);
      su.cZenith.value.copy(sky.base.z).lerp(this.tint, t * 0.9).multiplyScalar(dim);
    }
    // lightning
    this.flash = Math.max(0, this.flash - dt * 3);
    if ((a.lightning && k < 0.5) || (b.lightning && k > 0.5)) {
      if ((this.boltT -= dt) <= 0) { this.boltT = rnd(5, 13); this.flash = 1; setTimeout(() => audio.thunder(), rnd(300, 1400)); }
    }
    // particles: a box around the hero, upright to the local ground
    for (const [id, l] of Object.entries(this.layers)) {
      const u = l.material.uniforms; u.uTime.value = time; u.uIntensity.value = Math.min(1, (n[id] ?? 0) / 2.2 * 1.6);
      u.uDrift.value.set(n.wind * 3.2, n.wind * 1.1); l.visible = u.uIntensity.value > 0.005 && l.geometry.drawRange.count > 0;
    }
    if (player) { this.group.position.copy(player.pos); frameQuat(player.up, tangentFrame(player.up)[0], this.group.quaternion); }
    audio.ambience?.(((a.sound?.rain ?? 0) * (1 - k) + (b.sound?.rain ?? 0) * k), ((a.sound?.wind ?? 0) * (1 - k) + (b.sound?.wind ?? 0) * k));
  }
  dispose() { audio.ambience?.(0, 0); }
}
