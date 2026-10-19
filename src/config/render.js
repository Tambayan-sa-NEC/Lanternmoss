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
  },
  // A cave room is a far smaller scene than a planet's surface (measured 196-240 calls and 4.9k-6.2k triangles at
  // high across the three caves, TODO 29f). This is a regression guard with room to spare, not a target: it catches
  // a cave suddenly costing several times what it does, long before it could approach a surface budget.
  cave: { calls: 600, triangles: 60000 },
};
