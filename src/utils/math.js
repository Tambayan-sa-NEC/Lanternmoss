/* Scalar helpers (no Three.js dependency). */

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** Frame-rate independent lerp factor. */
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
