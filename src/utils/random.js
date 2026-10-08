/* Two random streams:
   - rand / rr / rpick: SEEDED, for world generation and initial spawns. World.generate() reseeds it with the planet's
     seed; every draw shifts the rest of the layout, so only code run while a planet is being built
     (src/world, src/combat/spawning.js) may use them, always in the same order.
   - rng / mr / mpick: the play stream, for runtime behaviour, loot and effects. In the browser it's Math.random; the
     headless sims (tests/sim) seed it with seedPlay() so a run plays out the same every time.
   Nothing else in src/ calls Math.random (tests/random.test.mjs checks). */

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let worldStream = mulberry32(0);
/** Restarts the seeded stream (same seed => same planet). */
export function seedWorld(seed) { worldStream = mulberry32(seed); }

export const rand = () => worldStream();
export const rr = (a, b) => a + (b - a) * rand();
export const rpick = arr => arr[Math.floor(rand() * arr.length)];

const unseeded = () => Math.random();
let playStream = unseeded;
/** Seeds the play stream (headless sims and tests); seedPlay(null) goes back to Math.random. */
export function seedPlay(seed) { playStream = seed == null ? unseeded : mulberry32(seed); }

/** A random number in [0, 1) from the play stream. */
export const rng = () => playStream();
export const mr = (a, b) => a + (b - a) * rng();
export const mpick = arr => arr[Math.floor(rng() * arr.length)];
