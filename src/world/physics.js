/* Active-planet rules, like terrain's active height field. Derived from config and the mechanic's saved state;
   these values are reset at generation/disposal, never saved as a second competing state owner. */
import { PLANET_RADIUS as R } from '../config/game.js';

const number = (v, fallback, min, max) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
let gravity = 1, sea = null, maxSea = null, offset = 0, maxOffset = 0;

export function configurePhysics(config = {}) {
  gravity = number(config?.gravity, 1, 0.05, 4);
  sea = config?.seaLevel == null ? null : number(config.seaLevel, null, R - 24, R + 24);
  maxSea = config?.seaMaxLevel == null ? sea : number(config.seaMaxLevel, sea, R - 24, R + 24);
  if (sea !== null) maxSea = Math.max(sea, maxSea ?? sea);
  offset = number(config?.waterOffset, 0, -12, 12);
  maxOffset = Math.max(offset, number(config?.waterMaxOffset, offset, -12, 12));
}
/** Mechanics set live rules within the envelope declared before placement. Never move saved object ids with the tide. */
export function setPhysics(values) {
  const nextGravity = Object.hasOwn(values, 'gravity') ? number(values.gravity, gravity, 0.05, 4) : gravity;
  const nextSea = Object.hasOwn(values, 'seaLevel') ? values.seaLevel === null ? null : number(values.seaLevel, sea, R - 24, R + 24) : sea;
  const nextOffset = Object.hasOwn(values, 'waterOffset') ? number(values.waterOffset, offset, -12, 12) : offset;
  if (nextSea !== null && (maxSea === null || nextSea > maxSea) || nextOffset > maxOffset)
    throw new RangeError('Declare the maximum water level in planet.physics before generation');
  gravity = nextGravity; sea = nextSea; offset = nextOffset;
}
/** Actor-specific acceleration (and buffs) compose with this positive planet multiplier. */
export const gravityAt = (_dir, acceleration = 26) => acceleration * gravity;
export const seaLevel = (high = false) => high ? maxSea : sea;
export const pondLevel = (pond, high = false) => pond.water + (high ? maxOffset : offset);
export const movingWater = (high = false) => seaLevel(high) !== null || (high ? maxOffset : offset) !== 0;
export const physicsQueries = Object.freeze({ set: setPhysics, gravityAt, seaLevel, pondLevel });
