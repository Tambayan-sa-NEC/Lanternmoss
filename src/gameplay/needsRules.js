/* Energy rules (config/survival.js NEEDS), pure so they're unit-tested (tests/survival.test.mjs). The runtime that
   drains it and applies the effects is ./Needs.js. */
import { NEEDS } from '../config/survival.js';

/** 'fed' | 'hungry' | 'starving' for an energy value. */
export function needLevel(energy, N = NEEDS) {
  const k = energy / N.max;
  return k < N.starving.below ? 'starving' : k < N.hungry.below ? 'hungry' : 'fed';
}

/** What the energy level does to the hero: { regen, sprint } multipliers (1 = no change). */
export function needEffects(energy, N = NEEDS) {
  const l = needLevel(energy, N);
  return l === 'fed' ? { regen: 1, sprint: 1 } : { regen: N[l].regen, sprint: N[l].sprint };
}

/** Energy lost per second: a little all the time, more while sprinting or swimming. */
export function drainRate({ sprinting = false, swimming = false } = {}, N = NEEDS) {
  return N.drain + (sprinting ? N.sprint : 0) + (swimming ? N.swim : 0);
}

/** The warning shares (NEEDS.warnings) crossed going from `before` to `after`. */
export function crossedWarnings(before, after, N = NEEDS) {
  return N.warnings.filter(w => before / N.max >= w && after / N.max < w);
}
