/* MOSSLURK (ai 'mimic', TODO 30e): a cluster of glowcaps that is not a cluster of glowcaps.
   It sits among the real ones with its mouth shut, perfectly still. While it is disguised it is scenery: nothing can
   hit it, it has no health bar, and it does nothing at all. It even offers the gather prompt a real glowcap patch
   offers -- "Pick the glowcap patch" -- and that is the ambush: reach for it and it springs.
   Springing is never a free hit. It rears up with a warning circle on the ground for `windup` seconds before the
   first bite, so a hero who reaches for the wrong caps can still step out of it. Beaten, it respawns disguised like
   any other monster, so the patch you were ambushed at looks innocent again on your next visit.
   Nothing here is saved: the mimics are rebuilt with the planet's roster, always disguised, so a save can neither
   leave one sprung nor remember which patch bit you. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hitMobs, hurtPlayer } from '../../../combat/damage.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { damp } from '../../../utils/math.js';
import { toast } from '../../../ui/toast.js';
import { arcDist, turnToward } from '../../../utils/sphere.js';
import { groundHeight } from '../../../world/terrain.js';

const _p = new THREE.Vector3();

/** Disguised: scenery, untargetable, and harmless until something reaches for it. */
function disguise(e, on) {
  e.disguised = on; e.hidden = on; e.shadow.visible = !on; e.selfCollider.active = !on;
  e.caps.visible = true; e.mouth.visible = !on; e.eyes.forEach(eye => { eye.visible = !on; });
  if (!on) {
    sparkles.emit(e.center(), { count: 22, color: e.def.capColor ?? 0x9ff0ff, speed: 2.8, up: e.up, upBias: 0.8, life: 0.7, size: 0.34 });
    emote(e, '!', '#ff4d6d'); if (e.heard) audio.growl();
  }
}

/** The ambush itself: it rears up, and the warning circle gives the hero the moment the design promises. */
export function spring(e) {
  if (!e.alive || !e.disguised) return false;
  disguise(e, false);
  e.state = 'windup'; e.timer = e.def.windup; e.hitPlayer = false; e.cool = e.def.cooldown;
  e.aggro();
  return true;
}

export const mimic = {
  init(e) { e.disguised = true; e.rear = 0; },
  reset(e) { e.rear = 0; disguise(e, true); e.state = 'idle'; e.timer = 1e9; },
  /** Disguised it never moves, whatever the state machine would like to do -- and it is here, in the one hook that
      runs in every state, that walking right over it springs it. (think() is skipped while a monster idles.) */
  steer(e, dt, dist) {
    if (!e.disguised) return undefined;
    if (!ctx.player.dead && dist < e.def.triggerRange) { spring(e); return undefined; }
    e.state = 'idle'; e.timer = 1e9;                                   // nothing may rouse a patch of mushrooms
    return 0;
  },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'windup': {
        turnToward(e.fwd, e.toP, e.up, damp(d.windupTurn, dt));
        const k = 1 - e.timer / d.windup;
        e.tele.visible = true; e.tele.position.copy(e.up).multiplyScalar(groundHeight(e.up) + 0.05);
        e.tele.scale.setScalar(d.range * (0.5 + 0.5 * k)); e.tele.material.opacity = 0.2 + 0.5 * k;
        if (e.timer <= 0) bite(e, dist);
        return 0;
      }
      case 'recover':
        if (e.timer <= 0) e.state = 'chase';
        return 0;
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
        e.move.copy(e.toP);
        if (dist < d.range && e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; e.hitPlayer = false; if (e.heard) audio.charge(); return 0; }
        return dist > d.range * 0.7 ? d.speed : 0;
    }
    return 0;
  },
  update(e, dt) { e.rear += ((e.disguised ? 0 : 1) - e.rear) * damp(9, dt); },
  animate(e) {
    const t = ctx.time;
    e.body.position.y = e.rear * 0.42 + (e.disguised ? 0 : Math.sin(t * 4 + e.seed) * 0.05);
    e.body.scale.set(1 + e.hitPop * 0.14, (1 + e.rear * 0.25) * (1 + e.hitPop * 0.14), 1 + e.hitPop * 0.14);
    e.mouth.scale.y = e.state === 'windup' ? 1.5 : 1 + Math.sin(t * 5 + e.seed) * 0.15;
    e.caps.rotation.y = Math.sin(t * 0.8 + e.seed) * 0.08;
    e.legs.forEach((l, i) => { l.rotation.x = e.disguised ? 0 : Math.sin(e.phase * 2 + i * 2.1) * 0.5; l.visible = !e.disguised; });
  },
  onDie(e) {
    sparkles.emit(e.center(), { count: 26, color: e.def.capColor ?? 0x9ff0ff, speed: 2.6, up: e.up, upBias: 0.7, life: 0.8, size: 0.34 });
    audio.sparkle();
  },
};

function bite(e, dist) {
  const d = e.def, P = ctx.player;
  e.state = 'recover'; e.timer = d.recover; e.cool = d.cooldown; e.hideTele();
  sparkles.emit(_p.copy(e.pos).addScaledVector(e.fwd, 0.5).addScaledVector(e.up, 0.6),
    { count: 10, color: 0x6a4a7a, speed: 2.2, up: e.up, upBias: 0.4, life: 0.4, size: 0.28 });
  if (e.heard) audio.whoosh();
  if (!P.dead && dist < d.range + P.radius) hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
  hitMobs(e, e.pos, d.range, d.damage, { knock: d.knockback });        // TODO 45b
}

/** The "E Pick the glowcap patch" prompt a disguised mosslurk offers, exactly as a real patch would
    (gameplay/Houses.js currentInteraction). Reaching for it is what springs the ambush. */
export function mimicTarget() {
  if (!ctx.started || ctx.indoors || ctx.player.dead) return null;
  const P = ctx.player; let best = null;
  for (const e of ctx.enemies) {
    if (!e.alive || !e.disguised || e.def.ai !== 'mimic') continue;
    const dist = arcDist(P.up, e.up) - e.def.radius;
    if (dist > e.def.pickReach || (best && dist >= best.dist)) continue;
    best = { dist, label: 'Pick the glowcap patch', at: e.center().clone(),
      run: () => { if (spring(e)) toast('The glowcaps bite back!'); } };
  }
  return best;
}
