/* The village clock (config/day.js): which phase of the day it is, which day, and the light for this moment. */
import * as THREE from 'three';
import { DAY } from '../config/day.js';

const PH = DAY.phases;
/** Middle of each phase as a fraction of the day (light keyframes). */
const MIDS = PH.map((p, i) => ((p.from + (PH[i + 1]?.from ?? 1)) / 2));
const _c = new THREE.Color(), _d = new THREE.Color();
const light = { sun: new THREE.Color(), sunIntensity: 0, ambient: 0 };

export const dayClock = {
  t: DAY.startAt * DAY.length, day: 1,
  reset() { this.t = DAY.startAt * DAY.length; this.day = 1; },
  update(dt) { this.t += dt; while (this.t >= DAY.length) { this.t -= DAY.length; this.day++; } },
  /** 0..1 through the current day. */
  get frac() { return this.t / DAY.length; },
  get phaseIndex() { let i = 0; PH.forEach((p, k) => { if (this.frac >= p.from) i = k; }); return i; },
  get phase() { return PH[this.phaseIndex].id; },
  get label() { return PH[this.phaseIndex].label; },
  /** Sun colour / strength and ambient strength, eased between the phase keyframes. */
  light() {
    const f = this.frac, n = PH.length;
    let i = MIDS.findIndex((m, k) => f >= m && f < (MIDS[k + 1] ?? MIDS[0] + 1)); if (i < 0) i = n - 1;   // before the first middle: last -> first
    const a = MIDS[i], b = i + 1 < n ? MIDS[i + 1] : MIDS[0] + 1, x = ((f < a ? f + 1 : f) - a) / (b - a);
    const k = x * x * (3 - 2 * x), A = DAY.light[PH[i].id], B = DAY.light[PH[(i + 1) % n].id];
    light.sun.copy(_c.set(A.sun)).lerp(_d.set(B.sun), k);
    light.sunIntensity = A.sunIntensity + (B.sunIntensity - A.sunIntensity) * k;
    light.ambient = A.ambient + (B.ambient - A.ambient) * k;
    return light;
  },
};
