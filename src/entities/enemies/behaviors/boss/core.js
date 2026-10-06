/* BOSS FRAMEWORK: the state machine every planet boss runs on. Each boss is a kit (gloomcap.js, dragon.js,
   demonLord.js) that brings its own movement, moveset, poses and phase changes, so the encounters play differently;
   defineBoss(kit) turns it into an enemy behaviour (behaviors/index.js).
     chase       kit.approach(e, dt, dist, phase) steers and returns the ground speed; when e.cool <= 0 a move is picked
     windup      the move telegraphs: move.windup(e, dt, k, dist) with k = 0..1 over attacks[id].windup seconds
     active      multi-step moves keep going (move.active(e, dt, dist) -> speed) until they call finish(e)
     recover     the punish window (attacks[id].recover seconds; kit.recovering may steer)
     transition  a phase change the kit plays out (kit.transition(e, dt, dist) -> speed; it sets state 'chase' when done)
   Out of combat the usual enemy states apply (idle / wander / return); leaving the arena cancels everything in flight.
   Picking (pickMove): the current phase's attacks, minus moves on their own cooldown (attacks[id].reuse seconds),
   moves whose ready(e, dist) says no and the previous move; then a weighted draw (weight(e, dist), default 1).
   After a move: e.cool = recover + cooldown * phase.cooldownMul (raised to e.minCool when a move leaves hazards behind).
   A move: { ready?, weight?, begin?(e, dist), windup?(e, dt, k, dist), fire(e, dist) -> 'active' | undefined,
             active?(e, dt, dist) -> speed, cancel?(e) }.
   kit:    { moves, fallback?(e, dist) -> id, init?, reset?, intro?, approach, recovering?, transition?, update?(e, dt, n),
             onPhase?(e, from, to) -> true if it took over the change, animate(e, dt), cancel?(e), onDie?(e), dispose?(e) }
   Every boss is immune to stagger and knockback and shrugs off part of a stun (Enemy.stun). */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { clearHazards } from '../../../../combat/hazards.js';
import { encounterEvents } from '../../../../combat/events.js';
import { clampRange } from '../../../../combat/area.js';
import { fxMaterial, ringFX } from '../../../../fx/combatFx.js';
import { GroundDecal } from '../../../../fx/groundDecals.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { scene } from '../../../../render/scene.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { clamp, damp } from '../../../../utils/math.js';
import { mpick } from '../../../../utils/random.js';
import { frameQuat, tangentFrame, tangentTo, turnToward } from '../../../../utils/sphere.js';
import { groundHeight } from '../../../../world/terrain.js';
import { ENGAGED } from '../../states.js';

const _tv = new THREE.Vector3();

export const glowOf = e => e.def.capColor ?? e.def.color;
export const phaseOf = e => e.def.phases[e.bossPhase];
export const shortName = e => e.def.name.split(',')[0];

/** A ground decal the boss owns: hidden with its other telegraphs (hideTele), freed with it. */
export function bossDecal(e, shape, color, o) {
  const d = new GroundDecal(shape, color, o); e.fxMeshes.push(d.mesh); (e.decals ??= []).push(d); return d;
}

/** Where the hero will be in `lead` seconds if they keep running (surface direction). */
export function predictHero(lead) { const P = ctx.player; return _tv.copy(P.pos).addScaledVector(P.vel, lead).normalize().clone(); }

/** dir pulled back inside the boss's arena, so no move carries it past its leash (which would end the fight). */
export function keepInArena(e, dir) { return clampRange(e.home, dir, Math.min(e.def.leash - 4, (e.arenaRadius ?? 99) - 2)); }   // (arenaRadius: the ring, BossGate)

export function roar(e, angrier = false, msg = null) {
  emote(e, '!', '#ff4d6d'); audio.roar(); shakeCamera(0.4);
  sparkles.emit(e.center(), { count: 30, color: glowOf(e), speed: 3, up: e.up, upBias: 0.6, life: 1, size: 0.45 });
  if (angrier) { toast(msg ?? `${e.def.name} grows furious!`); e.cool = Math.max(e.cool, 1); }
}

/** Ends the current move (and hides its warnings): recover for `secs` (default attacks[id].recover), then wait out the move's cooldown. */
export function finish(e, secs = null) {
  const a = e.def.attacks[e.attack], rec = secs ?? a.recover; e.hideTele();
  e.state = 'recover'; e.timer = rec; e.cool = Math.max(rec + a.cooldown * phaseOf(e).cooldownMul, e.minCool || 0); e.minCool = 0;
  if (a.reuse) e.moveCd[e.attack] = a.reuse;
}

/** Cos of the angle between the boss's heading and the hero (1 = dead ahead, -1 = right behind). */
export function facing(e) { return e.fwd.dot(e.toP); }

/** Is world point p inside a wedge from the boss: within `range`, at most arcDeg/2 off heading `dir`? */
export function inWedge(e, dir, p, range, arcDeg) {
  const d = tangentTo(e.pos, e.up, p, _tv);
  return d < range && (d < e.radius || _tv.dot(dir) >= Math.cos(THREE.MathUtils.degToRad(arcDeg / 2)));
}

function pickMove(e, kit, dist) {
  let opts = phaseOf(e).attacks.filter(id => !(e.moveCd[id] > 0) && (kit.moves[id].ready?.(e, dist) ?? true));
  if (opts.length > 1) opts = opts.filter(id => id !== e.lastAttack);       // never the same move twice in a row
  if (!opts.length) return kit.fallback?.(e, dist) ?? null;
  const w = opts.map(id => Math.max(0, kit.moves[id].weight?.(e, dist) ?? 1)), total = w.reduce((s, x) => s + x, 0);
  if (total <= 0) return mpick(opts);
  let r = Math.random() * total;
  for (let i = 0; i < opts.length; i++) if ((r -= w[i]) <= 0) return opts[i];
  return opts[opts.length - 1];
}

function start(e, kit, id, dist) {
  e.attack = e.lastAttack = id; e.state = 'windup';
  e.windupTime = e.timer = e.def.attacks[id].windup * (phaseOf(e).windupMul ?? 1);
  kit.moves[id].begin?.(e, dist);
}

/** The active phase is the last whose `below` threshold is at or above the current health fraction; it never goes back mid-fight. */
function updatePhase(e, kit) {
  const frac = e.hp / e.def.hp; let p = 0;
  e.def.phases.forEach((ph, i) => { if (frac <= ph.below) p = i; });
  if (p > e.bossPhase) { const from = e.bossPhase; e.bossPhase = p; if (!kit.onPhase?.(e, from, p)) roar(e, true); }
}

/** Stops whatever is in flight: the move's own telegraphs, the kit's extras and every hazard the boss left. */
function cancelAll(e, kit) {
  if (e.attack) kit.moves[e.attack]?.cancel?.(e);
  kit.cancel?.(e); clearHazards(e); e.hideTele(); e.invulnerable = false; e.minCool = 0;
}

export function defineBoss(kit) {
  const behavior = {
    init(e) {
      const color = glowOf(e);
      e.moveCd = {};
      // PLACEHOLDER beacon: a tall shaft of light over the lair, visible from across the planet
      e.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 60, 10, 1, true), fxMaterial(color, 0.9));
      e.beacon.material.opacity = 0.55; e.beacon.renderOrder = 2;
      e.beacon.position.copy(e.home).multiplyScalar(groundHeight(e.home) + 30); frameQuat(e.home, tangentFrame(e.home)[0], e.beacon.quaternion);
      scene.add(e.beacon);
      kit.init?.(e);
    },
    reset(e) {
      cancelAll(e, kit);
      Object.assign(e, { bossPhase: 0, attack: null, lastAttack: null, introduced: false, fighting: false, invulnerable: false, minCool: 0 });
      e.moveCd = {}; e.beacon.visible = true;
      kit.reset?.(e);
    },
    think(e, dt, dist) {
      e.fighting = true;
      if (!e.introduced) { e.introduced = true; roar(e); e.cool = Math.max(e.cool, 1.2); kit.intro?.(e); }
      if (e.state !== 'transition') updatePhase(e, kit);
      const ph = phaseOf(e);
      switch (e.state) {
        case 'chase': {
          const speed = kit.approach(e, dt, dist, ph);
          if (e.cool <= 0) { const id = pickMove(e, kit, dist); if (id) { start(e, kit, id, dist); return 0; } }
          return speed;
        }
        case 'windup': {
          const m = kit.moves[e.attack];
          m.windup?.(e, dt, clamp(1 - e.timer / e.windupTime, 0, 1), dist);
          if (e.timer <= 0) { e.hideTele(); if (m.fire(e, dist) === 'active') { e.state = 'active'; e.actT = 0; } else if (e.state === 'windup') finish(e); }
          return 0;
        }
        case 'active': e.actT += dt; return kit.moves[e.attack].active(e, dt, dist);
        case 'recover': {
          const speed = kit.recovering ? kit.recovering(e, dt, dist) : (turnToward(e.fwd, e.toP, e.up, damp(2, dt)), 0);
          if (e.timer <= 0) e.state = 'chase';
          return speed;
        }
        case 'transition': return kit.transition(e, dt, dist);
      }
      return 0;
    },
    update(e, dt, n) {
      for (const id in e.moveCd) e.moveCd[id] -= dt;
      if (e.state === 'idle' && e.hp >= e.def.hp && e.introduced) behavior.reset(e);   // fully recovered at home: the fight starts over
      if (!ENGAGED.has(e.state) && e.fighting) { e.fighting = false; cancelAll(e, kit); }   // walked away from the fight
      kit.update?.(e, dt, n);
    },
    animate(e, dt) { kit.animate(e, dt); },
    onDie(e) {
      cancelAll(e, kit); e.beacon.visible = false;
      const color = glowOf(e);
      [color, 0xfff0a0, 0xffd6f5, 0xbff4ff].forEach((c, i) => sparkles.emit(e.center(), { count: 40, color: c, speed: 3 + i, up: e.up, upBias: 0.8, life: 1.4, size: 0.5 }));
      ringFX(e.pos, 6, color, 0.8); shakeCamera(0.6); audio.roar();
      kit.onDie?.(e);
      encounterEvents.dispatchEvent(new CustomEvent('bossdefeated', { detail: { boss: e } }));
    },
    dispose(e) {
      clearHazards(e); kit.dispose?.(e); for (const d of e.decals ?? []) { d.geo.dispose(); d.template.dispose(); }   // materials go with fxMeshes
      scene.remove(e.beacon); e.beacon.geometry.dispose(); e.beacon.material.dispose(); },
  };
  return behavior;
}
