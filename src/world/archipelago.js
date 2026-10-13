/* Fixed, seeded coast layout. Sites are reserved before baking or scattering; water never moves their ids. */
import * as THREE from 'three';
import { PLANET_RADIUS as R } from '../config/game.js';
import { offsetDir, slerpDir } from '../utils/sphere.js';
import { smoothstep } from '../utils/math.js';

export function archipelagoLayout(config, spawn) {
  const islands = config.islands.map(i => ({ ...i, dir: offsetDir(spawn, i.angle, i.distance) }));
  const bars = config.bars.map(b => ({ ...b, points: Array.from({ length: 17 }, (_, k) =>
    slerpDir(islands[b.from].dir, islands[b.to].dir, k / 16, new THREE.Vector3())) }));
  const lagoon = { ...config.lagoon, dir: islands[config.lagoon.island].dir };
  return { ...config, islands, bars, lagoon,
    stoneCenter: offsetDir(spawn, 2.75, 34),
    farmDir: offsetDir(spawn, 5.35, 20),
    causeway: offsetDir(spawn, 0, 80),
    outerHouses: [0.8, 2.1, 4.1].map(a => offsetDir(spawn, a, 30)),
  };
}
const distance = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * R;
export function archipelagoHeight(d, layout) {
  let h = layout.bed;
  for (const i of layout.islands) {
    const a = distance(d, i.dir);
    if (a < i.radius + 7) h = Math.max(h, layout.bed + (i.height - layout.bed) * (1 - smoothstep(i.radius * 0.55, i.radius + 7, a)));
  }
  for (const bar of layout.bars) {
    let dot = -1; for (const p of bar.points) dot = Math.max(dot, d.dot(p));
    const a = Math.acos(Math.max(-1, Math.min(1, dot))) * R;
    if (a < bar.width + 3) h = Math.max(h, layout.bed + (bar.height - layout.bed) * (1 - smoothstep(bar.width, bar.width + 3, a)));
  }
  const a = distance(d, layout.lagoon.dir);
  h += (layout.lagoon.bed - h) * (1 - smoothstep(layout.lagoon.radius - 4, layout.lagoon.radius, a));
  return h;
}
