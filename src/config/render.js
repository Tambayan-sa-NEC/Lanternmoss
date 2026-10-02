/* Renderer, fog and post-processing settings. */

export const RENDER = {
  maxPixelRatio: 1.5,
  fov: 55, near: 0.1, far: 1500,
  fog: { color: 0xffd6b4, near: 28, far: 115 },        // shared by scene fog, outlines and water
  bloom: { strength: 0.5, radius: 0.45, threshold: 1.0 }, // only HDR (>1) colours bloom
  outline: { width: 3.2, color: 0x2e1a33 },              // ink line width in CSS pixels
};
