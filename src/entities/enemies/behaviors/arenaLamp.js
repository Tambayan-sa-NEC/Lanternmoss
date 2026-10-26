/* ARENA LANTERN (ai 'arenaLamp', TODO 30h): the bait in Umbra's lair. An object, not a monster
   (COMBAT.enemies.arenaLantern, object: true, static: true): no bestiary page, no drops, no kill counted, and
   nothing can knock it down.
   Press `E` beside one with a lit belt lantern and it catches, at the cost of a little oil. While it burns it is
   the brightest thing in the arena, and Umbra dives at the brightest light there is -- so a lit lantern is what
   stands between her and you. Her wingbeat snuffs them all; a snuffed one can be lit again after `relight` seconds.
   One she has **drunk** (her 50% feed) never lights again, so the arena really does get darker as the fight goes on.
   The fight owns them: behaviors/boss/umbra.js puts them up, snuffs them, drains them and takes them away. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { emit } from '../../../core/events.js';
import { sparkles } from '../../../fx/sparkles.js';
import { LocalLights } from '../../../render/lighting.js';
import { audio } from '../../../systems/AudioSystem.js';
import { toast } from '../../../ui/toast.js';
import { arcDist } from '../../../utils/sphere.js';
import { groundHeight } from '../../../world/terrain.js';
import { activeLantern } from '../../../world/mechanics/lantern.js';

const _p = new THREE.Vector3();

/** Lit right now (and so a target for her dive). */
export const isLit = e => !!e.lit && !e.drained;
/** Drunk dry by Umbra: dark for the rest of the fight. */
export const isDrained = e => !!e.drained;

function setLit(e, on) {
  e.lit = on && !e.drained;
  e.flame.visible = e.lit;
  if (e.light) e.light.source.intensity = e.lit ? e.def.light.intensity : 0;
}

/** Lights one: the flame comes off the hero's own lantern, and costs it a little oil. */
export function lightLamp(e) {
  const lamp = activeLantern();
  if (!e.alive || e.drained || e.lit || e.relightT > 0 || !lamp?.status.lit) return false;
  lamp.burn(e.boss?.def.lanterns.oil ?? 0);
  setLit(e, true);
  sparkles.emit(_p.copy(e.up).multiplyScalar(e.r + e.def.height), { count: 20, color: e.def.capColor, speed: 2, up: e.up, upBias: 0.8, life: 0.8, size: 0.34 });
  audio.sparkle(); emit('arenalamplit', { });
  return true;
}
/** Her wingbeat puts it out; it can be lit again after a moment. */
export function snuff(e) {
  if (!e.lit) return false;
  setLit(e, false); e.relightT = e.boss?.def.lanterns.relight ?? 0;
  sparkles.emit(_p.copy(e.up).multiplyScalar(e.r + e.def.height), { count: 14, color: 0x6a608f, speed: 1.6, up: e.up, upBias: 0.5, life: 0.7, size: 0.3 });
  return true;
}
/** She drinks it dry: this one is out for good. */
export function drain(e) {
  e.drained = true; setLit(e, false);
  sparkles.emit(_p.copy(e.up).multiplyScalar(e.r + e.def.height), { count: 26, color: 0x2f2746, speed: 2.4, up: e.up, upBias: 0.6, life: 1, size: 0.36 });
  return true;
}

export const arenaLamp = {
  init(e) {
    e.lit = false; e.drained = false; e.relightT = 0; e.boss = null;
    const at = e.up.clone().multiplyScalar(groundHeight(e.up) + e.def.height);
    e.light = LocalLights.add({ at: () => at, radius: e.def.light.radius, color: e.def.capColor, intensity: 0 });
  },
  reset(e) { e.lit = false; e.drained = false; e.relightT = 0; e.selfCollider.active = false; setLit(e, false); },
  /** Nothing takes an arena lantern down: it is furniture, not a foe. */
  refuses() { return true; },
  animate(e, dt) {
    e.relightT = Math.max(0, (e.relightT ?? 0) - dt);
    const t = ctx.time;
    e.flame.scale.setScalar(e.lit ? 0.9 + 0.12 * Math.sin(t * 7 + e.seed) : 0.001);
    e.glass.material.opacity = e.lit ? 0.9 : 0.35;
    e.post.rotation.z = 0;
    if (e.lit && (e.sparkT = (e.sparkT ?? 0) - dt) <= 0) {
      e.sparkT = 0.4;
      sparkles.emit(_p.copy(e.up).multiplyScalar(e.r + e.def.height + 0.3),
        { count: 1, color: e.def.capColor, speed: 0.5, up: e.up, upBias: 1.2, life: 0.8, size: 0.26 });
    }
  },
  dispose(e) { e.light?.remove(); e.light = null; },
};

/** The "E Light the arena lantern" prompt (gameplay/Houses.js currentInteraction): only with a lit belt lantern. */
export function arenaLampTarget() {
  if (!ctx.started || ctx.indoors || ctx.player.dead) return null;
  const lamp = activeLantern(); if (!lamp) return null;
  const P = ctx.player; let best = null;
  for (const e of ctx.enemies) {
    if (!e.alive || e.def.ai !== 'arenaLamp' || e.lit || e.drained) continue;
    const dist = arcDist(P.up, e.up) - e.def.radius;
    if (dist > e.def.reach || (best && dist >= best.dist)) continue;
    const ready = e.relightT <= 0 && lamp.status.lit;
    best = { dist, label: ready ? 'Light the arena lantern'
      : lamp.status.lit ? 'The arena lantern is still smouldering' : 'Your lantern is out: nothing to light it with',
      at: e.up.clone().multiplyScalar(groundHeight(e.up) + e.def.height + 0.6),
      run: () => { if (!lightLamp(e)) toast(ready ? '' : lamp.status.lit ? 'Give it a moment to cool.' : 'Fill your lantern first.'); } };
  }
  return best;
}
