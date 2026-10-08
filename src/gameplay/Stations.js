/* CRAFTING STATIONS (config/stations.js): the village's crafting corner, a row of four stations (workbench, forge and
   anvil, cooking pot, brewing stand) a short walk from the square. E at one opens the bag's Craft tab showing what it
   makes. A recipe with a `station` (config/crafting.js) can only be crafted standing at that station (here()); the
   rest work anywhere. The stations glow, steam and spark while you're near, and burst when something is made there. */
import * as THREE from 'three';
import { PLANETS } from '../config/planets.js';
import { STATION_CORNER, STATIONS } from '../config/stations.js';
import { ctx } from '../core/context.js';
import { sparkles } from '../fx/sparkles.js';
import { STATION_BUILDERS } from '../models/stations.js';
import { addCollider, freeOfColliders, removeCollider } from '../physics/colliders.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { arcDist, dirAlong, matrixAt, offsetDir, tangentToward } from '../utils/sphere.js';
import { isFree } from '../world/placement.js';
import { groundHeight, slopeAt } from '../world/terrain.js';
import { rng } from '../utils/random.js';

const V3 = THREE.Vector3, _p = new V3();
const PUFF = { workbench: null, forge: { color: 0xffa040, speed: 1.6, upBias: 1.4 }, pot: { color: 0xffffff, speed: 0.6, upBias: 1.6 },
  brew: { color: 0xc8a8ff, speed: 0.5, upBias: 1.5 } };

export const Stations = {
  list: [],             // { id, def, dir, fwd, parts, collider, puffT }
  last: null,           // the station the hero stood at last frame
  center: null,

  /** Builds this planet's crafting corner, clear of `avoid` ([[dir, radius]]: the farm). Returns [centre, radius]. */
  setup(world, planet, avoid = []) {
    this.clear();
    const ids = Object.keys(STATIONS), C = STATION_CORNER, half = (ids.length - 1) / 2 * C.spacing, rad = half + 1.6;
    let c = null;
    // the first level, open spot round the square (deterministic); hilly villages (Emberfall's mesas) get a second,
    // wider and less fussy look
    for (const [far, steep] of [[C.distance[1], 0.3], [C.distance[1] + 14, 0.55]]) {
      for (let ring = C.distance[0]; ring <= far && !c; ring += 1.5) for (let a = 0; a < 6.28 && !c; a += 0.19) {
        const at = offsetDir(world.spawnDir, a + (PLANETS[planet].seed % 5) * 1.3 + 2.1, ring);
        if (!isFree(at, rad) || !freeOfColliders(at, rad + 0.4) || slopeAt(at) > steep) continue;
        if (avoid.some(([d, r]) => arcDist(at, d) < r + rad + 1)) continue;
        const fwd = tangentToward(at, world.spawnDir), side = new V3().crossVectors(fwd, at).normalize();
        if ([-1, 1].some(s => slopeAt(dirAlong(at, side, s * half)) > steep + 0.05)) continue;
        c = at;
      }
      if (c) break;
    }
    if (!c) return null;
    this.center = c;
    const fwd = tangentToward(c, world.spawnDir), side = new V3().crossVectors(fwd, c).normalize();
    ids.forEach((id, i) => {
      const dir = dirAlong(c, side, (i - (ids.length - 1) / 2) * C.spacing), f = tangentToward(dir, world.spawnDir);
      const parts = STATION_BUILDERS[id](); parts.root.matrixAutoUpdate = false;
      parts.root.matrix.copy(matrixAt(dir.clone().multiplyScalar(groundHeight(dir) - 0.04), dir, f)); scene.add(parts.root);
      this.list.push({ id, def: STATIONS[id], dir, fwd: f, parts, collider: addCollider(dir, 0.6, { r: 0.8, base: 0, top: 1.4 }), puffT: rng() });
    });
    return [c, rad + 1];
  },
  clear() {
    for (const s of this.list) { scene.remove(s.parts.root); disposeTree(s.parts.root); removeCollider(s.collider); }
    this.list = []; this.center = null;
  },

  /** The station the hero stands at (config/stations.js id), or null. */
  here() {
    const P = ctx.player; let best = null, bd = STATION_CORNER.reach;
    for (const s of this.list) { const d = arcDist(P.up, s.dir); if (d < bd) { bd = d; best = s; } }
    return best?.id ?? null;
  },
  /** The E prompt by a station. */
  target() {
    const P = ctx.player; let best = null, bd = STATION_CORNER.reach;
    for (const s of this.list) { const d = arcDist(P.up, s.dir); if (d < bd) { bd = d; best = s; } }
    if (!best) return null;
    return { dist: bd, label: `Use the ${best.def.name}`, at: this.top(best, 1.9), run: () => this.open(best.id) };
  },
  /** Opens the Craft tab showing what this station makes. */
  open(id) { InventoryUI.open('craft', { filter: id }); audio.blip(); },
  top(s, h = 1) { return s.dir.clone().multiplyScalar(groundHeight(s.dir) + h); },
  /** Something was just made at station `id`: a burst of its colour. */
  celebrate(id) {
    const s = this.list.find(x => x.id === id); if (!s) return;
    sparkles.emit(this.top(s, 1.2), { count: 26, color: s.def.color, speed: 2.4, up: s.dir, upBias: 1, life: 0.8, size: 0.32 });
    if (id === 'forge') { audio.clang(); audio.tone(1500, 0.2, 'triangle', 0.03, 0.08); }
    else if (id === 'pot' || id === 'brew') audio.tone(520, 0.3, 'sine', 0.04, 0, 1.6);
    else { audio.noise(0.1, 0.06, 1200); audio.noise(0.1, 0.06, 1200, 0.15); }
  },

  update(dt) {
    if (!this.list.length) return;
    const h = this.here();                                             // walked up to (or away from) one with the Craft tab open
    if (h !== this.last) { this.last = h; if (InventoryUI.isOpen && InventoryUI.tab === 'craft') InventoryUI.render(); }
    const P = ctx.player, near = arcDist(P.up, this.center) < 26, t = ctx.time;
    for (const s of this.list) {
      s.parts.glow.forEach((g, i) => g.scale.setScalar(1 + Math.sin(t * (7 + i * 2.3) + i) * 0.08));
      const puff = PUFF[s.id]; if (!near || !puff || (s.puffT -= dt) > 0) continue;
      s.puffT = 0.35 + rng() * 0.4;
      _p.set(0, 0, 0).copy(s.parts.smoke).applyMatrix4(s.parts.root.matrix);
      sparkles.emit(_p, { count: 2, color: puff.color, speed: puff.speed, up: s.dir, upBias: puff.upBias, life: 1, size: 0.26 });
    }
  },
};
