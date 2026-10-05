/* Combat feedback: expanding ground rings, sword crescents, floating damage numbers and hit-stop. */
import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { settings } from '../core/settings.js';
import { scene } from '../render/scene.js';
import { smoothstep } from '../utils/math.js';
import { mr } from '../utils/random.js';
import { frameQuat, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const ringGeo = new THREE.RingGeometry(0.82, 1, 36).rotateX(-Math.PI / 2);
export const discGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
const ringFxList = [], floatTexts = [];

/** Additive, depth-ignoring material for glowing effects. */
export function fxMaterial(color, k = 2) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
}
export function groundPoint(pos, lift = 0.12) { const up = pos.clone().normalize(); return up.multiplyScalar(groundHeight(up) + lift); }

/** Animates mesh m out to `radius` over `dur` seconds while fading it, then disposes its material. */
function playRing(m, dur, radius) { ringFxList.push({ m, t: 0, dur, radius }); }

export function ringFX(pos, radius, color, dur = 0.45) {
  const up = pos.clone().normalize(), m = new THREE.Mesh(ringGeo, fxMaterial(color));
  m.position.copy(groundPoint(pos)); frameQuat(up, tangentFrame(up)[0], m.quaternion); m.renderOrder = 3; scene.add(m);
  playRing(m, dur, radius);
}

const arcGeoCache = {};
/** Crescent trail of a melee swing, centred on `dir`, 1 unit above `pos`. */
export function arcFX(pos, up, dir, range, arcDeg, color) {
  if (!arcGeoCache[arcDeg]) { const a = THREE.MathUtils.degToRad(arcDeg); arcGeoCache[arcDeg] = new THREE.RingGeometry(0.55, 1, 24, 1, -Math.PI / 2 - a / 2, a).rotateX(-Math.PI / 2); }
  const m = new THREE.Mesh(arcGeoCache[arcDeg], fxMaterial(color, 1.6));
  m.position.copy(pos).addScaledVector(up, 1.0); frameQuat(up, dir, m.quaternion); m.renderOrder = 3; scene.add(m);
  playRing(m, 0.22, range);
}

/** A brief slow-motion beat on a heavy impact (Game.update scales the timestep while it lasts). */
export function hitStop(secs) { if (settings.hitStop) ctx.hitStop = Math.max(ctx.hitStop, secs); }

/** scale > 1 for big hits (ultimates, boss blows) so they read at a glance. */
export function floatText(pos, text, color = '#ffffff', scale = 1) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const g = cv.getContext('2d');
  g.font = '800 44px "Grandstander","Nunito","Trebuchet MS",sans-serif';   // the display face (docs/typography.md) g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 9; g.lineJoin = 'round'; g.strokeStyle = '#3a2340'; g.strokeText(text, 64, 34); g.fillStyle = color; g.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); s.renderOrder = 6; scene.add(s);
  floatTexts.push({ s, t: 0, base: pos.clone(), up: pos.clone().normalize(), side: mr(-0.4, 0.4), scale });
}

export function updateFx(dt) {
  for (let i = ringFxList.length - 1; i >= 0; i--) {
    const f = ringFxList[i]; f.t += dt; const k = Math.min(1, f.t / f.dur);
    f.m.scale.setScalar(f.radius * (0.25 + 0.75 * (1 - Math.pow(1 - k, 3)))); f.m.material.opacity = 1 - k;
    if (k >= 1) { scene.remove(f.m); f.m.material.dispose(); ringFxList.splice(i, 1); }
  }
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const f = floatTexts[i]; f.t += dt; const k = f.t / 0.9, pop = Math.min(1, f.t / 0.12);
    f.s.position.copy(f.base).addScaledVector(f.up, f.t * 1.3); f.s.position.x += f.side * f.t;
    f.s.scale.set(1.2 * pop * f.scale, 0.6 * pop * f.scale, 1); f.s.material.opacity = 1 - smoothstep(0.55, 1, k);
    if (k >= 1) { scene.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); floatTexts.splice(i, 1); }
  }
}
