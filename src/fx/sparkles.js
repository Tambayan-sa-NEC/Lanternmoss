/* PARTICLES: one pooled point cloud for every sparkle, dust puff and splash. */
import * as THREE from 'three';
import { makePointsMaterial } from '../render/materials.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { mr, rng } from '../utils/random.js';

class Sparkles {
  constructor(max = 700) {
    this.max = max; this.head = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max).fill(1); this.base = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage); this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage); this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aColor', this.aCol); g.setAttribute('aSize', this.aSize); g.setAttribute('aAlpha', this.aAlpha);
    this.mat = makePointsMaterial(
      `uniform float uScale; attribute vec3 aColor; attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA;
       void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
         gl_PointSize = aSize * uScale / max(0.3, -mv.z); }`,
      `varying vec3 vC; varying float vA;
       void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
         float core = smoothstep(0.5, 0.0, d); core *= core;
         float star = max(smoothstep(0.07, 0.0, abs(p.x)) * smoothstep(0.5, 0.0, abs(p.y)), smoothstep(0.07, 0.0, abs(p.y)) * smoothstep(0.5, 0.0, abs(p.x)));
         float a = max(core, star) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC * 2.2, a); }`);
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
  }
  emit(p, o = {}) {
    const { count = 10, color = 0xfff0a0, speed = 2, up = null, upBias = 0.6, life = 1, size = 0.3, spread = 1 } = o; const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.head; this.head = (this.head + 1) % this.max;
      const rx = rng() * 2 - 1, ry = rng() * 2 - 1, rz = rng() * 2 - 1;
      this.pos[i * 3] = p.x + rx * 0.15 * spread; this.pos[i * 3 + 1] = p.y + ry * 0.15 * spread; this.pos[i * 3 + 2] = p.z + rz * 0.15 * spread;
      let vx = rx * speed * spread, vy = ry * speed * spread, vz = rz * speed * spread;
      if (up) { vx += up.x * speed * upBias; vy += up.y * speed * upBias; vz += up.z * speed * upBias; }
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      const l = life * mr(0.7, 1.2); this.life[i] = l; this.maxLife[i] = l; this.base[i] = size * mr(0.6, 1.3);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    }
  }
  update(dt) {
    const drag = Math.exp(-1.8 * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt; const k = Math.max(0, this.life[i] / this.maxLife[i]);
      for (let a = 0; a < 3; a++) { this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt; this.vel[i * 3 + a] *= drag; }
      this.alpha[i] = Math.min(1, k * 2.5); this.size[i] = this.base[i] * (0.4 + 0.6 * k);
    }
    this.aPos.needsUpdate = this.aAlpha.needsUpdate = this.aSize.needsUpdate = this.aCol.needsUpdate = true;
  }
}

/** The shared particle pool. Created by createSparkles() after the world is built (draw order of equal-depth
    transparent objects follows creation order), then used by everything through this live binding. */
export let sparkles = null;
export function createSparkles() { sparkles = new Sparkles(); return sparkles; }

/** A celebratory sparkle burst with the matching chime. */
export function burstAt(pos, up, color, n = 40) { sparkles.emit(pos, { count: n, color, speed: 3, up, upBias: 0.5, life: 1.2, size: 0.34 }); audio.sparkle(); }
