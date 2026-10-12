import { FURNISHINGS } from '../config/home.js';

export function cleanHomeState(value) {
  const claimed = value?.claimed === true;
  const list = Array.isArray(value?.furniture) ? value.furniture.slice(0, 64) : [];
  return { claimed, furniture: claimed ? [...new Set(list.filter(id => typeof id === 'string' && Object.hasOwn(FURNISHINGS, id)))] : [] };
}
export function furnitureOverlapsHero(id, x, z) {
  const f = FURNISHINGS[id]; return !!f?.r && Math.hypot(x - f.x, z - f.z) < f.r + 0.45;
}
