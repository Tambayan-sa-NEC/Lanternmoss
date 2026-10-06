/* Core world, movement and camera tuning. */

export const PLANET_RADIUS = 72;               // every planet's size (each planet's seed, colours and shape: config/planets.js)

/** World generation and movement over the terrain (src/world/terrain.js, src/physics/Walker.js). */
export const WORLD = {
  meshDetail: 52,            // planet icosphere subdivisions (~1.5 m triangles at this radius)
  heightmapRes: 192,         // the baked height field: samples per cube face edge
  scatter: 3.2,              // scenery counts x this (trees, rocks, flowers, grass): the planet is ~3x the old area
  rosterScale: 1.5,          // monster counts x this (config/planets.js rosters)
  lairArc: [100, 130],       // the boss lair's distance from the village (metres around the planet)
  flats: { village: [26, 14], stones: [10, 8], lair: [28, 12] },   // flattened areas: [radius, fade]
  maxSlope: 1.25,            // steepest ground a walker can walk up (rise per metre, ~51°); steeper = a cliff: jump or go round
  stepHeight: 0.4,           // ledges this low are stepped onto without jumping
  water: { wade: 0.72, swim: 0.55, swimDepth: 1.0, deep: 0.95 },   // speed in shallow / deep water; how low a swimmer floats; depth that counts as deep
};

export const PLAYER = {
  walkSpeed: 5.0, sprintSpeed: 8.4,
  accelGround: 14, accelAir: 4.5,
  jumpVel: 8.6, gravityRise: 15.5, gravityFall: 27,   // low rise gravity while holding Space = floaty; heavy fall = weighty
  radius: 0.42, talkRange: 3.3,
};

/** Multipliers applied while a buff is active. */
export const BUFFS = {
  featherSpeed: 1.3,                           // Feather-Step: run speed
  moonJump: 1.3, moonGravity: 0.72,            // Moon-Hop: jump velocity, rise gravity
  mightDamage: 0.2,                            // Mighty (pies, skewers, fire peppers): +damage share
  wardReduction: 0.25,                         // Stoneskin (tonic, koi feast): -damage taken share
  swiftSpeed: 1.15,                            // Quickstep (tonic, porridge): move speed
  mendRegen: 3,                                // Mending (veggie stew): extra HP per second (even mid-fight)
};

export const CAMERA = { dist: 8.5, pitch: 0.36, minDist: 3.5, maxDist: 15 };
