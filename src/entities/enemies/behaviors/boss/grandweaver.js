/* MINI BOSS: Grandmother Gloomweaver (COMBAT.enemies.grandweaver), a huge spider hanging in a canopy of her own web
   over the moonstone vein she guards. Her signature is that you cannot reach her at all until you bring her down:
     hung     she rides `anchors.count` strands, `anchors.hang` metres up. Every blow glances off her (refuses), so
              hitting her is simply not the answer. From up there she drops sticky webs on the ground you are
              standing on (the same webs her grandchildren spin, 30f) and spits slowing silk.
     burning  each strand is an object that only fire takes (behaviors/anchor.js): hold a lit belt lantern against
              one, or hit it with fire. Every hero can do the first, so nobody is locked out of the fight.
     down     the last strand parts and she falls, lying `anchors.dazed` seconds open to everything before she gets
              up and fights on the ground: bite, sweep, and the same spit.
     again    at each phase threshold she climbs back up and spins a fresh set of strands, so the fight is three
              rounds of burn-the-anchors, fight-her-down: the set she starts on, and one at each threshold.
   Moves: weave (a web dropped where you stand), spit (a fan of slowing silk), bite (a wedge in front), sweep (a ring
   of legs, from the second web on). Fallback: bite up close, else spit.
   She wears the same spider/beetle pair as the regular weavers, so the `roundBeetles` accessibility setting takes
   her off the screen too (models/duskMonsters.js showSpiderLook). */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { addEnemy } from '../../../../combat/spawning.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { Projectile } from '../../../Projectile.js';
import { arcFX, ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { clamp, damp } from '../../../../utils/math.js';
import { arcDist, offsetDir, projectTangent, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { dryGround, groundHeight } from '../../../../world/terrain.js';
import { freeOfColliders } from '../../../../physics/colliders.js';
import { showSpiderLook } from '../../../../models/duskMonsters.js';
import { showDisc } from '../telegraphs.js';
import { bossDecal, defineBoss, inWedge, roar } from './core.js';

const SILK = 0xe8d0ff, WARN = 0xff4d6d;
const A = (e, id) => e.def.attacks[id];
const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _aim = new THREE.Vector3();
let anchorHint = false;

/** The rematch's warning marks: made once and owned by the boss like its other telegraphs. */
function silkMarks(e, count) {
  const marks = e.silkMarks ??= [];
  while (marks.length < count) marks.push(bossDecal(e, 'ring', SILK, { k: 1.5, lift: 0.14 }));
  return marks;
}
function clearWebs(e) { for (const w of e.webs ?? []) if (w.alive) w.vanish(); e.webs = []; }

/** The strands still holding her up (a burnt one drops off the list by itself). */
export const strandsOf = e => (e.strands = (e.strands ?? []).filter(a => a.alive));
/** Up in her web, where nothing can touch her. */
export const isHung = e => !!e.hung;

/** Spins a fresh set of strands around her and rides them back up. */
export function anchorUp(e, announce = true) {
  const S = e.def.anchors;
  for (const a of strandsOf(e)) a.die();
  e.strands = [];
  for (let i = 0; i < S.count; i++) {
    const turn = (i + 0.5) / S.count * Math.PI * 2;
    let at = null;
    for (const r of [S.at, S.at * 0.8, S.at * 1.2, S.at * 0.6]) {
      const d = offsetDir(e.home, turn, r);
      if (dryGround(d, 1) && freeOfColliders(d, 0.8)) { at = d; break; }
    }
    e.strands.push(addEnemy(S.type, at ?? offsetDir(e.home, turn, S.at)));
  }
  e.hung = true; e.hangK = 0;
  if (announce) {
    toast(`${e.def.name.split(',')[0]} climbs back into her web.`);
    if (!anchorHint) { anchorHint = true; toast('Her strands only burn: hold a lit lantern to one, or hit it with fire.'); }
  }
  return e.strands;
}

/** The last strand parts: she falls, and lies open for a moment. */
function drop(e) {
  const S = e.def.anchors;
  e.hung = false; e.state = 'transition'; e.dropT = S.drop + S.dazed; e.hideTele();
  e.invulnerable = false;
  emote(e, '!', '#ffe6a0'); audio.roar();
  toast(`${e.def.name.split(',')[0]} crashes down!`);
}

export const grandweaver = defineBoss({
  init(e) {
    e.strands = []; e.hung = false; e.hangK = 0; e.dropT = 0;
  },
  reset(e) {
    for (const a of e.strands ?? []) if (a.alive) a.die();
    clearWebs(e);
    e.strands = []; e.hangK = 0; e.dropT = 0; e.hung = false;
  },
  /** She is already up there when the fight starts. */
  intro(e) { anchorUp(e, false); e.cool = Math.max(e.cool, 1.5); },

  /** Hung, she sways over her own ground; down, she closes on the hero. */
  approach(e, dt, dist, phase) {
    turnToward(e.fwd, e.toP, e.up, damp(e.def.turnRate, dt));
    if (e.hung) return 0;                                              // a hanging spider does not walk
    e.move.copy(e.toP);
    return dist > A(e, 'bite').range * 0.7 ? e.def.speed * phase.speedMul : 0;
  },
  fallback(e, dist) { return e.hung ? 'spit' : dist < A(e, 'bite').range ? 'bite' : 'spit'; },

  moves: {
    /** Three marked webs around the hero: the centre and the lanes between them remain open. */
    silkRing: {
      ready: e => e.hung && e.rematch,
      begin(e) {
        const a = A(e, 'silkRing'), centre = ctx.player.up;
        e.silkSpots = Array.from({ length: a.count }, (_, i) => offsetDir(centre, (i + 0.5) / a.count * Math.PI * 2, a.spread));
      },
      windup(e, dt, k) {
        const a = A(e, 'silkRing');
        silkMarks(e, a.count).forEach((mark, i) => {
          mark.place(e.silkSpots[i], null, a.radius).opacity = 0.3 + 0.7 * k;
        });
      },
      fire(e) {
        e.hideTele();
        for (const at of e.silkSpots ?? []) if (dryGround(at, 1)) (e.webs ??= []).push(addEnemy('gloomweb', at));
        if (e.heard) audio.sparkle();
      },
    },
    /** A web dropped on the ground the hero is standing on: the same sticky web her grandchildren spin (30f). */
    weave: {
      ready: e => e.hung && !!ctx.player,
      begin(e) { e.weaveAt = ctx.player.up.clone(); },
      windup(e, dt, k) { showDisc(e, e.weaveAt ?? e.up, 1.8, k); },
      fire(e) {
        const at = e.weaveAt;
        if (at && dryGround(at, 1)) (e.webs ??= []).push(addEnemy('gloomweb', at));
        sparkles.emit(_p.copy(at ?? e.up).multiplyScalar(groundHeight(at ?? e.up) + 0.4),
          { count: 18, color: SILK, speed: 2, up: at ?? e.up, upBias: 0.6, life: 0.7, size: 0.32 });
        if (e.heard) audio.sparkle();
      },
    },
    /** A fan of slowing silk, from up in the web or down on the ground. */
    spit: {
      windup(e, dt, k) { e.body.rotation.x = -0.2 * k; },
      fire(e) {
        const a = A(e, 'spit');
        for (let i = 0; i < a.count; i++) {
          const spread = THREE.MathUtils.degToRad(a.spread), turn = a.count > 1 ? -spread / 2 + spread * i / (a.count - 1) : 0;
          _d.copy(e.fwd).applyAxisAngle(e.up, turn);
          ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir: _d.clone(), alt: e.hung ? 2.4 : 1.4,
            speed: a.speed, range: 18, radius: 0.4, size: 0.3, color: SILK,
            homing: a.homing, homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
            onHit: (p, hit) => {
              sparkles.emit(p.pos, { count: 12, color: SILK, speed: 1.8, life: 0.5, size: 0.3 });
              // a hit of silk slows the hero the way a web on the ground does, for a moment
              if (hit === ctx.player) { hurtPlayer(a.damage, p.pos, 0, { source: e }); ctx.player.silkT = a.slowTime; ctx.player.silkK = 1 - a.slow; }
            } }));
        }
        if (e.heard) audio.whoosh();
      },
    },
    /** A wedge of fangs in front of her: only on the ground. */
    bite: {
      ready: e => !e.hung,
      windup(e, dt, k) { e.body.position.y = 0.2 * k; },
      fire(e) {
        const a = A(e, 'bite');
        e.body.position.y = 0;
        arcFX(e.pos, e.up, e.fwd, a.range, a.arc, SILK);
        if (!ctx.player.dead && inWedge(e, e.fwd, ctx.player.pos, a.range + ctx.player.radius, a.arc))
          hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
        shakeCamera(0.25); if (e.heard) audio.growl();
      },
    },
    /** A ring of legs sweeping the ground around her: only on the ground, from her second web on. */
    sweep: {
      ready: e => !e.hung,
      windup(e, dt, k) { showDisc(e, e.up, A(e, 'sweep').radius, k); },
      fire(e) {
        const a = A(e, 'sweep');
        ringFX(e.pos, a.radius, SILK, 0.6); shakeCamera(0.4);
        if (!ctx.player.dead && inWedge(e, e.fwd, ctx.player.pos, a.radius + ctx.player.radius, a.arc))
          hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
        if (e.heard) audio.nova();
      },
    },
  },

  /** Hung, nothing lands on her: the strands are the fight. */
  refuses(e) { return !!e.hung; },

  /** Falling, then lying dazed; then she is up and fighting. */
  transition(e, dt) {
    const S = e.def.anchors;
    e.dropT -= dt;
    const falling = e.dropT > S.dazed;
    e.hangK = falling ? clamp((e.dropT - S.dazed) / S.drop, 0, 1) : 0;
    if (!falling && !e.landed) {
      e.landed = true; shakeCamera(0.6); audio.roar();
      ringFX(e.pos, 4, SILK, 0.7);
      sparkles.emit(e.center(), { count: 30, color: SILK, speed: 3, up: e.up, upBias: 0.5, life: 0.9, size: 0.4 });
    }
    if (e.dropT <= 0) { e.landed = false; e.state = 'chase'; e.cool = 0.4; roar(e, true, `${e.def.name.split(',')[0]} finds her feet.`); }
    return 0;
  },

  /** Every threshold sends her back up to spin a new set of strands, so the fight is three rounds of
      burn-the-strands and fight-her-down: the one she starts on, and one at each of her two thresholds. */
  onPhase(e, from, to) {
    anchorUp(e);
    e.state = 'chase'; e.cool = 1.2; e.hideTele();
    roar(e, true, `${e.def.name.split(',')[0]}: ${e.def.phases[to].title}`);
    return true;
  },

  update(e, dt) {
    const S = e.def.anchors;
    if (e.hung) {
      e.hangK = clamp(e.hangK + dt * 2.5, 0, 1);                       // the climb back up
      if (strandsOf(e).length === 0) drop(e);
    }
    e.hover = S.hang * (e.hung ? e.hangK : e.state === 'transition' ? e.hangK : 0);
  },

  animate(e, dt) {
    showSpiderLook(e);
    const t = ctx.time;
    e.body.scale.setScalar(1 + e.hitPop * 0.1);
    e.body.rotation.z = e.hung ? Math.sin(t * 0.9 + e.seed) * 0.07 : 0;   // swaying on her strands
    e.legs.forEach((l, i) => {
      l.rotation.x = e.hung ? -0.5 + Math.sin(t * 1.4 + i) * 0.1
        : Math.sin(e.phase * 2 + i * 1.05) * (0.2 + Math.min(0.5, Math.abs(e.speed) / 4));
    });
    e.fangs.forEach((f, i) => { f.rotation.x = e.state === 'windup' && e.attack === 'bite' ? -0.8 : Math.sin(t * 2 + i) * 0.08; });
    e.eyes.forEach((eye, i) => { eye.scale.setScalar(0.9 + 0.1 * Math.abs(Math.sin(t * 1.3 + i))); });
    if (e.hung && (e.silkT = (e.silkT ?? 0) - dt) <= 0) {              // a thread of silk drifting down from the canopy
      e.silkT = 0.5;
      sparkles.emit(_p.copy(e.center()), { count: 1, color: SILK, speed: 0.4, up: e.up, upBias: -1.4, life: 1.1, size: 0.26 });
    }
  },

  onDie(e) {
    clearWebs(e);
    for (const a of strandsOf(e)) a.die();
    e.strands = []; e.hung = false; e.hover = 0;
  },
  dispose(e) { clearWebs(e); for (const a of e.strands ?? []) if (a.alive) a.die(); e.strands = []; },
});
