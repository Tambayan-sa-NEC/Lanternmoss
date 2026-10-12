import * as THREE from 'three';
import { BUILDING, PLACEABLES } from '../config/placeables.js';
import { PLANET_RADIUS } from '../config/game.js';
import { CROPS } from '../config/resources.js';
import { arcDist, dirAlong, tangentFrame } from '../utils/sphere.js';

/** A stable planet-wide grid, projected onto a cube face to avoid pole singularities. */
export function snapBuildingDir(dir, grid = BUILDING.grid) {
  const a = dir.toArray(), axis = a.map(Math.abs).indexOf(Math.max(...a.map(Math.abs))), scale = PLANET_RADIUS;
  const face = Math.abs(a[axis]);
  return new THREE.Vector3(...a.map((v, i) => i === axis ? Math.sign(v) : Math.round(v / face * scale / grid) * grid / scale)).normalize();
}
export function buildingForward(dir, turn = 0) { return tangentFrame(dir)[0].applyAxisAngle(dir, turn * Math.PI / 2); }
export function buildingFootprint(id, dir, turn = 0) {
  const def = PLACEABLES[id]; if (!def) return [];
  if (['wall', 'doorway', 'window'].includes(def.structure)) {
    const side = new THREE.Vector3().crossVectors(dir, buildingForward(dir, turn)).normalize();
    return Array.from({length:9}, (_,i)=>(i-4)*0.475).filter(x=>def.structure!=='doorway'||Math.abs(x)>0.7).map(x=>({dir:dirAlong(dir,side,x),r:0.14}));
  }
  if (!def.fence) return [{ dir, r: def.radius }];
  const side = new THREE.Vector3().crossVectors(dir, buildingForward(dir, turn)).normalize();
  return [-0.75, -0.375, 0, 0.375, 0.75].map(x => ({ dir: dirAlong(dir, side, x), r: 0.2 }));
}
export function footprintsOverlap(a, b, padding = 0) { return a.some(x => b.some(y => arcDist(x.dir, y.dir) < x.r + y.r + padding - 0.001)); }

/** Untrusted save data: bounded counts, known types, canonical IDs, finite directions and crop data. */
export function cleanBuildings(value, cleanStack) {
  const seen = new Set(), out = [];
  for (const s of (Array.isArray(value) ? value.slice(0, BUILDING.limit) : [])) {
    if (!s || !Object.hasOwn(PLACEABLES, s.itemId) || !Number.isInteger(s.id) || s.id < 1 || s.id > 1e9 || seen.has(s.id)) continue;
    if (!Array.isArray(s.dir) || s.dir.length !== 3 || !s.dir.every(n => Number.isFinite(n) && Math.abs(n) <= 1e6) || Math.hypot(...s.dir) < 1e-8) continue;
    seen.add(s.id);
    const def = PLACEABLES[s.itemId], result = { id: s.id, itemId: s.itemId, dir: Math.abs(Math.hypot(...s.dir) - 1) < 1e-12 ? [...s.dir] : new THREE.Vector3(...s.dir).normalize().toArray(), turn: Number.isInteger(s.turn) ? ((s.turn % 4) + 4) % 4 : 0 };
    if (s.structure && typeof s.structure === 'object') {
      const a=s.structure;
      if (Number.isInteger(a.floor) && a.floor>0 && a.floor<=1e9) result.structure={floor:a.floor};
      else if (def.structure==='floor' && Number.isInteger(a.root) && a.root>=0 && a.root<=1e9 && Array.isArray(a.cell) && a.cell.length===2 && a.cell.every(n=>Number.isInteger(n)&&Math.abs(n)<=2)) result.structure={root:a.root,cell:[...a.cell]};
    }
    if (def.structure && (!result.structure || (def.structure==='floor' ? !result.structure.cell || result.structure.root===0 && result.structure.cell.some(n=>n!==0) : !result.structure.floor))) continue;
    if (def.storage) result.slots = Array.from({ length: BUILDING.storageSlots }, (_, i) => cleanStack(s.slots?.[i]));
    if (def.farm) {
      const p = s.plot ?? {}, crop = Object.hasOwn(CROPS, p.crop) ? p.crop : null;
      result.plot = { tilled: p.tilled === true || !!crop, crop, growth: crop && Number.isFinite(p.growth) ? Math.max(0, Math.min(1, p.growth)) : 0, watered: p.watered === true };
    }
    out.push(result);
  }
  return out;
}
