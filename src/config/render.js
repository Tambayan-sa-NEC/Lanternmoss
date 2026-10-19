/* Renderer, fog and post-processing settings. */

export const RENDER = {
  maxPixelRatio: 1.5,
  actorDistance: { low: 38, medium: 50, high: 65 },
  fov: 55, near: 0.1, far: 1500,
  fog: { near: 42, far: 175 },                          // shared by scene fog, outlines and water (colour: each planet's palette)
  bloom: { strength: 0.5, radius: 0.45, threshold: 1.0 }, // only HDR (>1) colours bloom
  outline: { width: 3.2, color: 0x2e1a33 },              // ink line width in CSS pixels
  // Local light (TODO 29a, src/render/lighting.js): light radii drawn in the toon shaders, plus a small pool of real point lights.
  //   spots       how many light radii the shaders take at once (the nearest to the hero win)
  //   realLights  real three.js point lights, shared by every source (building lamps, later cave lanterns); an interior
  //               keeps its own single light and the pool is off indoors, so at most this many are ever lit
  //   realRange   only sources this close to the hero (m) get one of the real lights
  //   heroRadius  the light around the hero while it is dark (m); heroLight its strength
  //   realPower   a real point light's intensity per unit of its source's intensity
  //   bands       a radius is lit fully inside bands[0] of it and at bands[1] strength out to its edge (toon steps)
  //   minAmbient  in the dark, nothing lit drops below this share of its own colour, so the ink outlines and shapes stay readable
  //   dimFloor    how much of the sun and sky light is left at full darkness
  //   skyFloor    how bright the sky and the fog are drawn at full darkness (a share of normal)
  localLight: { spots: 8, realLights: 4, realRange: 12, heroRadius: 5, heroLight: 0.45, realPower: 1.6, bands: [0.5, 0.35], minAmbient: 0.2, dimFloor: 0.12, skyFloor: 0.3 },
};

/** Whole composer peak counts in the fixed village/night/weather browser fixture. */
export const PERFORMANCE_BUDGET = {
  targetFps: 60, targetFrameMs: 1000 / 60,
  ceilings: {
    lanternmoss: { calls: 1050, triangles: 310000 },
    emberfall: { calls: 900, triangles: 280000 },
    frostveil: { calls: 850, triangles: 280000 },
    tidewhisper: { calls: 550, triangles: 230000 }, // Retained through the owner-approved Acer reference change; 27h must fit them.
  },
  // A cave room is a far smaller scene than a planet's surface (measured 196-240 calls and 4.9k-6.2k triangles at
  // high across the three caves, TODO 29f). This is a regression guard with room to spare, not a target: it catches
  // a cave suddenly costing several times what it does, long before it could approach a surface budget.
  cave: { calls: 600, triangles: 60000 },
};

/** Desktop acceptance reference, chosen by the owner on 2026-10-17.
    machine names the available laptop; renderer is the actual WebGL GPU, not an adapter merely installed in the host.
    viewport is in CSS pixels at DPR 1; quality is the existing default High preset.
    heroes/seeds/scenes define the complete fourth-world campaign measurement matrix. Other hardware is additional
    compatibility evidence; this reference makes no integrated-graphics or mobile frame-rate claim. */
export const PERFORMANCE_REFERENCE = {
  machine: 'Acer Nitro ANV15-51', renderer: 'NVIDIA GeForce RTX 4050 Laptop GPU',
  viewport: [1920, 1080], quality: 'high',
  heroes: ['witch', 'knight', 'ranger'], seeds: [1, 7], scenes: ['village', 'night', 'weather'],
};
export function referenceRenderer(renderer) {
  return typeof renderer === 'string' && renderer.toLowerCase().includes(PERFORMANCE_REFERENCE.renderer.toLowerCase());
}
export function referenceProfile(report) {
  return referenceRenderer(report?.device) && report.quality === PERFORMANCE_REFERENCE.quality
    && report.viewport?.[0] === PERFORMANCE_REFERENCE.viewport[0] && report.viewport?.[1] === PERFORMANCE_REFERENCE.viewport[1];
}
