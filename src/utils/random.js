/* Two random streams:
   - rand / rr / rpick: SEEDED, for world generation and initial spawns. Every draw shifts the rest of the layout,
     so only code run during startup (src/world, src/combat/spawning.js) may use them, always in the same order.
   - mr / mpick: Math.random, for runtime behaviour and effects. */
import { WORLD_SEED } from '../config/game.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(WORLD_SEED);
export const rr = (a, b) => a + (b - a) * rand();
export const rpick = arr => arr[Math.floor(rand() * arr.length)];

export const mr = (a, b) => a + (b - a) * Math.random();
export const mpick = arr => arr[Math.floor(Math.random() * arr.length)];
