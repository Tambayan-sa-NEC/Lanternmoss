import * as THREE from 'three';
import { PLACEABLES } from '../config/placeables.js';
import { buildFurniture } from './interiors.js';
import { STATION_BUILDERS } from '../models/stations.js';
import { buildPlot } from '../models/resources.js';
import { addTo, G, part } from '../render/meshes.js';
import { batchParts } from '../render/staticParts.js';

export function buildPlaceable(id) {
  const def = PLACEABLES[id];
  if (def.crafting) { const parts = STATION_BUILDERS[def.crafting](); batchParts(parts.root, new Set(parts.glow)); return parts; }
  if (def.farm) return buildPlot();
  if (def.furniture || def.storage) {
    const root = buildFurniture(def.storage ? 'chest' : def.furniture); batchParts(root);
    return { root };
  }
  const root = new THREE.Group();
  if (def.fence) {
    for (const x of [-0.75, 0.75]) addTo(root, part(G.cyl(0.09, 0.1, 0.85, 5), def.color), [x, 0.425, 0]);
    for (const y of [0.3, 0.65]) addTo(root, part(G.box(1.8, 0.1, 0.12), 0xd8aa6e), [0, y, 0]);
  } else addTo(root, part(G.cyl(0.46, 0.48, 0.08, 6), def.color), [0, 0.045, 0]);
  batchParts(root); return { root };
}
