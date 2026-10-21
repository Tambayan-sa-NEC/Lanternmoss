/* FIREFLY SWARMS (TODO 30b, FIREFLIES in config/lantern.js): Duskhollow's drifting lights. Each swarm is a soft
   local light and a slow trickle of particles rather than bodies, so a whole world of them costs no draw calls and
   follows the particle-density setting through fx/sparkles.js.
   Walk up to one and press E to catch it in a jar (the "E Catch the fireflies" prompt joins the others in
   gameplay/Houses.js currentInteraction). A caught swarm is gone for FIREFLIES.away seconds, then another settles
   somewhere else, so the oil they are worth is bounded by time rather than by a daily counter.
   The world owns them: spawnWildlife plants them and despawnWildlife clears them. */
import * as THREE from 'three';
import { FIREFLIES } from '../config/lantern.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { sparkles } from '../fx/sparkles.js';
import { grantItem } from './pickups.js';
import { LocalLights } from '../render/lighting.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { mr, rng } from '../utils/random.js';
import { arcDist, offsetDir } from '../utils/sphere.js';
import { spawnDrySpot } from '../world/placement.js';
import { groundHeight } from '../world/terrain.js';

const _v = new THREE.Vector3();

class Swarm {
  constructor(dir) {
    this.home = dir.clone(); this.up = dir.clone(); this.away = 0; this.t = rng() * 6.28; this.sparkT = 0;
    this.pos = new THREE.Vector3(); this.settle(dir);
    this.light = LocalLights.add({ at: () => this.pos, radius: FIREFLIES.light.radius, color: FIREFLIES.light.color, intensity: FIREFLIES.light.intensity });
  }
  settle(dir) { this.home.copy(dir); this.up.copy(dir); this.refresh(); }
  refresh() { this.pos.copy(this.up).multiplyScalar(groundHeight(this.up) + 1.3); }
  update(dt) {
    if (this.away > 0) {
      if ((this.away -= dt) > 0) return;
      const dir = spawnDrySpot(null); if (!dir) { this.away = 2; return; }
      this.settle(dir); this.light.source.intensity = FIREFLIES.light.intensity; return;
    }
    this.t += dt * FIREFLIES.drift;
    this.up.copy(offsetDir(this.home, this.t * 1.7, FIREFLIES.radius * (0.4 + 0.6 * Math.abs(Math.sin(this.t))))).normalize();
    this.refresh();
    if ((this.sparkT -= dt) <= 0) {
      this.sparkT = FIREFLIES.sparkle;
      sparkles.emit(_v.copy(this.pos).addScaledVector(this.up, mr(-0.3, 0.5)), { count: 2, color: FIREFLIES.light.color, speed: 0.35, life: 1.4, size: 0.26, spread: 2.4 });
    }
  }
  /** Caught: the swarm goes dark and comes back somewhere else later. */
  take() {
    this.away = FIREFLIES.away; this.light.source.intensity = 0;
    sparkles.emit(this.pos, { count: 26, color: FIREFLIES.light.color, speed: 2.2, up: this.up, upBias: 0.8, life: 1, size: 0.3 });
  }
  dispose() { this.light.remove(); }
}

export const Fireflies = {
  swarms: [],
  /** Plants `count` swarms out in the world; called once per generated planet. */
  spawn(count) {
    this.clear();
    for (let i = 0; i < Math.min(16, count ?? 0); i++) { const dir = spawnDrySpot(null); if (dir) this.swarms.push(new Swarm(dir)); }
    return this.swarms.length;
  },
  clear() { for (const s of this.swarms) s.dispose(); this.swarms.length = 0; },
  /** Swarms alight right now (the checks read it; a caught one does not count). */
  get lit() { return this.swarms.filter(s => s.away <= 0).length; },
  update(dt) { for (const s of this.swarms) s.update(dt); },
  /** Saved per planet: only how long each caught swarm still has to wait, so Continue cannot relight them. */
  toJSON() { return { away: this.swarms.map(s => Math.max(0, s.away)) }; },
  load(data) {
    const away = data?.away ?? [];
    this.swarms.forEach((swarm, i) => {
      swarm.away = Number.isFinite(away[i]) ? Math.max(0, away[i]) : 0;
      swarm.light.source.intensity = swarm.away > 0 ? 0 : FIREFLIES.light.intensity;
    });
  },

  /** The "E Catch the fireflies" prompt: the nearest swarm within reach. */
  target() {
    const P = ctx.player; let best = null;
    for (const s of this.swarms) {
      if (s.away > 0) continue;
      const d = arcDist(P.up, s.up); if (d > FIREFLIES.reach || (best && d >= best.dist)) continue;
      best = { dist: d, label: 'Catch the fireflies', at: s.pos.clone(), run: () => this.catchSwarm(s) };
    }
    return best;
  },
  /** Catching gives one jar; with a full bag it lands at the hero's feet, as any other gift does. */
  catchSwarm(swarm) {
    if (swarm.away > 0) return false;
    if (!grantItem(FIREFLIES.jar, 1)) toast('Your bag is full: the jar is at your feet.');
    swarm.take(); audio.sparkle(); emit('firefliescaught', { item: FIREFLIES.jar });
    return true;
  },
};
