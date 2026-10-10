/* Renderer, fog and post-processing settings. */

export const RENDER = {
  maxPixelRatio: 1.5,
  actorDistance: { low: 38, medium: 50, high: 65 },
  fov: 55, near: 0.1, far: 1500,
  fog: { near: 42, far: 175 },                          // shared by scene fog, outlines and water (colour: each planet's palette)
  bloom: { strength: 0.5, radius: 0.45, threshold: 1.0 }, // only HDR (>1) colours bloom
  outline: { width: 3.2, color: 0x2e1a33 },              // ink line width in CSS pixels
};

/** Whole composer peak counts in the fixed village/night/weather browser fixture. */
export const PERFORMANCE_BUDGET = {
  targetFps: 60, targetFrameMs: 1000 / 60,
  ceilings: {
    lanternmoss: { calls: 1050, triangles: 310000 },
    emberfall: { calls: 900, triangles: 280000 },
    frostveil: { calls: 850, triangles: 280000 },
  },
};
