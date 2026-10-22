/* THE OLD ROAD (TODO 30d, OLD_ROAD in config/oldRoad.js): Duskhollow's waylamps, its three moonwells and the
   village flame you carry out to them, for Wick's quest "Light the Old Road".
   One branch leaves the village for each of the first authored gaps of starlight (planets/duskhollow.js
   `canopy.gaps`), so every moonwell stands under open sky; waylamps line each branch at a fixed spacing. The models
   and their lights live here, as the firefly swarms do; what is alight is a rule, saved per planet by the lantern
   mechanic (world/mechanics/lantern.js), so Continue and portal travel restore a relit road with the Oil bar.
   A lit lamp head glows on its own, but only the brazier, the three moonwells and the nearest OLD_ROAD.lamp.sources
   waylamps hold a shared local light, so a road relit end to end costs the same as a road with three lamps lit.
   Nothing here can hurt the hero. Take fire at the brazier or at any lit waylamp, light the next lamp before the
   flame gutters out, and if it does, walk back to the last lit waylamp and take fire again.
   The world owns it: PlanetProgression.populate sets it up, travel and disposal clear it. */
import * as THREE from 'three';
import { OLD_ROAD } from '../config/oldRoad.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { sparkles } from '../fx/sparkles.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { LocalLights } from '../render/lighting.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist, frameQuat, offsetDir, tangentToward } from '../utils/sphere.js';
import { addCollider } from '../physics/colliders.js';
import { placed } from '../world/placement.js';
import { groundHeight } from '../world/terrain.js';
import { activeLantern } from '../world/mechanics/lantern.js';

const _v = new THREE.Vector3();

/** A waylamp: a violet post under a glass head that stays dark until it is relit. */
function buildWaylamp(height) {
  const group = new THREE.Group();
  addTo(group, part(G.cyl(0.08, 0.13, height, 5), 0x53436a), [0, height / 2, 0]);
  addTo(group, part(G.box(0.34, 0.06, 0.34), 0x53436a), [0, height + 0.03, 0]);
  addTo(group, part(G.cone(0.26, 0.22, 4), 0x53436a), [0, height + 0.42, 0], [0, Math.PI / 4, 0]);
  const glass = addTo(group, part(G.box(0.24, 0.3, 0.24), 0xffb85c, { glow: true, intensity: 3.2 }), [0, height + 0.22, 0]);
  return { group, glass };
}
/** A moonwell lantern: a ring of low stones around a pale standing lamp, tall enough to see from the next gap. */
function buildMoonwell(height) {
  const group = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    addTo(group, part(G.box(0.4, 0.34, 0.3), 0x6a608f), [Math.cos(a) * 1.25, 0.17, Math.sin(a) * 1.25], [0, -a, 0]);
  }
  addTo(group, part(G.cyl(0.14, 0.2, height, 6), 0x6a608f), [0, height / 2, 0]);
  const glass = addTo(group, part(G.oct(0.42), 0xcfe0ff, { glow: true, intensity: 3.4 }), [0, height + 0.3, 0]);
  addTo(group, part(G.cone(0.46, 0.4, 6), 0x6a608f), [0, height + 0.78, 0]);
  return { group, glass };
}
/** The village flame: a stone bowl of fire in the village gap, always alight. */
function buildBrazier() {
  const group = new THREE.Group();
  addTo(group, part(G.cyl(0.26, 0.4, 0.9, 6), 0x6a608f), [0, 0.45, 0]);
  addTo(group, part(G.cyl(0.62, 0.42, 0.42, 8), 0x53436a), [0, 1.08, 0]);
  const glass = addTo(group, part(G.ico(0.34, 1), 0xffc06a, { glow: true, intensity: 3.4 }), [0, 1.36, 0]);
  return { group, glass };
}

/** Stands a built group on the ground at `dir`, upright on the sphere. */
function stand(group, dir, spawn) {
  group.position.copy(dir).multiplyScalar(groundHeight(dir));
  group.quaternion.copy(frameQuat(dir, tangentToward(dir, spawn)));
  scene.add(group);
}

/** One road light: alight or dark, through the shared local lights the dusk already uses. */
function roadLight(at, config, on) {
  const handle = LocalLights.add({ at: () => at, radius: config.radius, color: config.color, intensity: on ? config.intensity : 0 });
  return { handle, set on(v) { handle.source.intensity = v ? config.intensity : 0; }, remove: () => handle.remove() };
}

export const OldRoad = {
  lamps: [], wells: [], lampPool: [], brazier: null, flameLight: null, carried: false, sparkT: 0, poolT: 0,

  /** Builds the road on a world whose mechanic carries a lantern; every other world gets nothing. */
  setup(world, planet) {
    this.clear();
    if (planet?.mechanic !== 'lantern' || !world.canopy) return 0;
    const B = OLD_ROAD.branches, spawn = world.spawnDir;
    B.gaps.forEach((gapIndex, branch) => {
      const authored = planet.canopy?.gaps?.[gapIndex], gap = world.canopy.gaps[gapIndex];
      if (!authored || !gap) return;
      for (let at = B.from; at < authored.distance - B.spacing * 0.5 && this.lamps.length < B.maxLamps; at += B.spacing) {
        const dir = offsetDir(spawn, authored.angle, at), model = buildWaylamp(OLD_ROAD.lamp.height);
        stand(model.group, dir, spawn);
        const pos = dir.clone().multiplyScalar(groundHeight(dir) + OLD_ROAD.lamp.height + 0.2);
        this.lamps.push({ index: this.lamps.length, branch, dir, pos, ...model });
        addCollider(dir, 0.3); placed.push({ dir, r: 1.2 });
      }
      const dir = gap.dir.clone(), model = buildMoonwell(OLD_ROAD.well.height);
      stand(model.group, dir, spawn);
      const pos = dir.clone().multiplyScalar(groundHeight(dir) + OLD_ROAD.well.height + 0.4);
      this.wells.push({ index: branch, dir, pos, ...model, light: roadLight(pos, OLD_ROAD.well.light, false) });
      addCollider(dir, 0.45); placed.push({ dir, r: 2.4 });
    });
    const dir = offsetDir(spawn, OLD_ROAD.brazier.angle, OLD_ROAD.brazier.distance), model = buildBrazier();
    stand(model.group, dir, spawn);
    const pos = dir.clone().multiplyScalar(groundHeight(dir) + 1.4);
    this.brazier = { dir, pos, ...model, light: roadLight(pos, OLD_ROAD.brazier.light, true) };
    addCollider(dir, 0.5); placed.push({ dir, r: 1.6 });
    const L = OLD_ROAD.lamp.light;                                    // the shared pool the lit waylamps take turns in
    for (let i = 0; i < OLD_ROAD.lamp.sources; i++) {
      const at = new THREE.Vector3();
      this.lampPool.push({ at, light: LocalLights.add({ at: () => at, radius: L.radius, color: L.color, intensity: 0 }) });
    }
    this.sync();
    return this.lamps.length;
  },

  clear() {
    for (const o of [...this.lamps, ...this.wells, this.brazier]) {
      if (!o) continue;
      o.light?.remove(); o.group.removeFromParent(); disposeTree(o.group);
    }
    for (const slot of this.lampPool) slot.light.remove();
    this.lamps = []; this.wells = []; this.lampPool = []; this.brazier = null; this.carried = false; this.sparkT = 0; this.poolT = 0;
    this.flameLight?.remove(); this.flameLight = null;
  },

  /** Shows what the mechanic says is alight: after setup, after a load, and whenever something is lit. */
  sync() {
    const road = activeLantern()?.road; if (!road) return;
    for (const l of this.lamps) l.glass.visible = road.lamps.includes(l.index);
    for (const w of this.wells) { const on = road.wells.includes(w.index); w.light.on = on; w.glass.visible = on; }
    this.poolT = 0; this.syncPool(road);
  },

  /** Hands the pooled lights to the lit waylamps nearest the hero; the rest keep their glow and cost nothing. */
  syncPool(road) {
    if (!this.lampPool.length) return;
    const from = ctx.player?.up ?? this.brazier?.dir;
    const near = this.lamps.filter(l => road.lamps.includes(l.index));
    if (from) near.sort((a, b) => arcDist(a.dir, from) - arcDist(b.dir, from));
    this.lampPool.forEach((slot, i) => {
      const l = near[i];
      slot.light.source.intensity = l ? OLD_ROAD.lamp.light.intensity : 0;
      if (l) slot.at.copy(l.pos);
    });
  },

  /** The carried flame is a light of its own while it lasts, and a quiet trickle of sparks. */
  update(dt) {
    const road = activeLantern()?.road, carrying = !!road?.carrying;
    if (carrying && !this.flameLight) {
      const F = OLD_ROAD.flame.light;
      this.flameLight = LocalLights.add({ at: v => v.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1.1),
        radius: F.radius, color: F.color, intensity: F.intensity, outdoor: false });
    }
    if (!carrying && this.flameLight) { this.flameLight.remove(); this.flameLight = null; }
    if ((this.poolT -= dt) <= 0 && road) { this.poolT = 0.3; this.syncPool(road); }   // the pooled lamp lights follow the hero
    if (this.carried && !carrying && road) toast('The village flame gutters out. Take fire again at the last lit waylamp.');
    this.carried = carrying;
    if (!carrying || ctx.indoors || (this.sparkT -= dt) > 0) return;
    this.sparkT = 0.22;
    sparkles.emit(_v.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1.2),
      { count: 1, color: OLD_ROAD.flame.light.color, speed: 0.4, up: ctx.player.up, upBias: 0.9, life: 0.9, size: 0.22 });
  },

  /** Where fire can be taken: the village brazier, and every waylamp already alight. */
  firePoints() {
    const road = activeLantern()?.road; if (!road) return [];
    return [...(this.brazier ? [this.brazier] : []), ...this.lamps.filter(l => road.lamps.includes(l.index))];
  },

  /** The road's "E ..." prompt: take fire, light the next waylamp, or light a moonwell. */
  target() {
    const mechanic = activeLantern(); if (!mechanic || ctx.indoors || !ctx.started || ctx.player.dead) return null;
    const road = mechanic.road, P = ctx.player, R = OLD_ROAD.flame.reach;
    let best = null;
    const offer = (dir, label, run) => {
      const dist = arcDist(P.up, dir); if (dist > R || (best && dist >= best.dist)) return;
      best = { dist, label, at: dir.clone().multiplyScalar(groundHeight(dir) + 2.2), run };
    };
    if (road.carrying) {
      for (const l of this.lamps) if (!road.lamps.includes(l.index)) offer(l.dir, 'Light the waylamp', () => this.lightLamp(l));
      for (const w of this.wells) if (!road.wells.includes(w.index)) offer(w.dir, 'Light the moonwell', () => this.lightWell(w));
    } else {
      for (const point of this.firePoints())
        offer(point.dir, point === this.brazier ? 'Take the village flame' : 'Take fire from the waylamp', () => this.takeFlame(point));
    }
    return best;
  },

  takeFlame(point) {
    const mechanic = activeLantern(); if (!mechanic) return false;
    mechanic.takeFlame(); this.update(0); audio.sparkle();
    sparkles.emit(point.pos, { count: 18, color: OLD_ROAD.flame.light.color, speed: 1.6, up: point.dir, upBias: 0.6, life: 1, size: 0.3 });
    toast('You carry the village flame. Light the next waylamp before it burns out.');
    return true;
  },
  lightLamp(l) {
    const mechanic = activeLantern(); if (!mechanic?.lightLamp(l.index)) return false;
    this.sync(); audio.sparkle();
    sparkles.emit(l.pos, { count: 22, color: OLD_ROAD.lamp.light.color, speed: 1.8, up: l.dir, upBias: 0.5, life: 1.1, size: 0.3 });
    toast(`Waylamp ${mechanic.road.lampsLit} of ${this.lamps.length} is lit.`);
    emit('waylamplit', { index: l.index });
    return true;
  },
  lightWell(w) {
    const mechanic = activeLantern(); if (!mechanic?.lightWell(w.index)) return false;
    this.sync(); audio.melody();
    sparkles.emit(w.pos, { count: 34, color: OLD_ROAD.well.light.color, speed: 2.4, up: w.dir, upBias: 0.7, life: 1.4, size: 0.34 });
    toast(`Moonwell ${mechanic.road.wellsLit} of ${this.wells.length} burns again.`);
    emit('moonwelllit', { index: w.index });
    return true;
  },
};
