/* Core world, movement and camera tuning. */

export const PLANET_RADIUS = 40;
export const WORLD_SEED = 20260930;            // same seed => same planet layout every run

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
};

export const CAMERA = { dist: 8.5, pitch: 0.36, minDist: 3.5, maxDist: 15 };
