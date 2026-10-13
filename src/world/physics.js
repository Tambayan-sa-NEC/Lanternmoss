/* Active-planet rules, like terrain's active height field. Derived from config and the mechanic's saved state;
   these values are reset at generation/disposal, never saved as a second competing state owner. */
import { PLANET_RADIUS as R } from '../config/game.js';

const number = (v, fallback, min, max) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
let gravity = 1, sea = null, maxSea = null, offset = 0, maxOffset = 0;
let regions = [];

export function configurePhysics(config = {}) {
  gravity = number(config?.gravity, 1, 0.05, 4);
  sea = config?.seaLevel == null ? null : number(config.seaLevel, null, R - 24, R + 24);
  maxSea = config?.seaMaxLevel == null ? sea : number(config.seaMaxLevel, sea, R - 24, R + 24);
  if (sea !== null) maxSea = Math.max(sea, maxSea ?? sea);
  offset = number(config?.waterOffset, 0, -12, 12);
  maxOffset = Math.max(offset, number(config?.waterMaxOffset, offset, -12, 12));
  regions = (config?.waterRegions ?? []).slice(0, 4).map(region => {
    if (!region.id || !Array.isArray(region.dir) || region.dir.length !== 3 || !region.dir.every(Number.isFinite) || !Math.hypot(...region.dir) || !Number.isFinite(region.radius) || region.radius <= 0 || region.radius > 40)
      throw new RangeError('Invalid local water region');
    const length = Math.hypot(...region.dir);
    const level = number(region.level, sea, R - 24, R + 24), maxLevel = number(region.maxLevel, level, R - 24, R + 24);
    if (level === null || maxLevel < level) throw new RangeError('Invalid local water envelope');
    return { id: region.id, dir: region.dir.map(n => n / length), radius: region.radius, edge: Math.cos(region.radius / R), level, maxLevel };
  });
  if (regions.length !== (config?.waterRegions ?? []).length || new Set(regions.map(r => r.id)).size !== regions.length) throw new RangeError('Use at most four distinct local water regions');
}
/** Mechanics set live rules within the envelope declared before placement. Never move saved object ids with the tide. */
export function setPhysics(values) {
  const nextGravity = Object.hasOwn(values, 'gravity') ? number(values.gravity, gravity, 0.05, 4) : gravity;
  const nextSea = Object.hasOwn(values, 'seaLevel') ? values.seaLevel === null ? null : number(values.seaLevel, sea, R - 24, R + 24) : sea;
  const nextOffset = Object.hasOwn(values, 'waterOffset') ? number(values.waterOffset, offset, -12, 12) : offset;
  if (nextSea !== null && (maxSea === null || nextSea > maxSea) || nextOffset > maxOffset)
    throw new RangeError('Declare the maximum water level in planet.physics before generation');
  const changed = Object.entries(values.regions ?? {}).map(([id, level]) => {
    const region = regions.find(r => r.id === id);
    if (!region || !Number.isFinite(level) || level < R - 24 || level > region.maxLevel) throw new RangeError('Declare the local water envelope before changing its level');
    return [region, level];
  });
  gravity = nextGravity; sea = nextSea; offset = nextOffset;
  changed.forEach(([region, level]) => { region.level = level; });
}
/** Actor-specific acceleration (and buffs) compose with this positive planet multiplier. */
export const gravityAt = (_dir, acceleration = 26) => acceleration * gravity;
export const seaLevel = (high = false) => high ? maxSea : sea;
export const waterRegions = () => regions.map(r => ({ ...r }));
export function seaLevelAt(d, high = false) {
  const region = regions.find(r => d.x * r.dir[0] + d.y * r.dir[1] + d.z * r.dir[2] > r.edge);
  return region ? high ? region.maxLevel : region.level : seaLevel(high);
}
export const pondLevel = (pond, high = false) => pond.water + (high ? maxOffset : offset);
export const movingWater = (high = false) => regions.length > 0 || seaLevel(high) !== null || (high ? maxOffset : offset) !== 0;
export const physicsQueries = Object.freeze({ set: setPhysics, gravityAt, seaLevel, pondLevel });
