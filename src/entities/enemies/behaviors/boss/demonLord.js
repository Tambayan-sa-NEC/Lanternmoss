/* PLANET 3 BOSS: Malgrath, the Winged Demon Lord (COMBAT.enemies.malgrath). The deadliest fight, in two phases.
   PHASE 1, GROUNDED (above 50% HP): walks you down with a greatsword.
     combo     close: two wide sweeps (a wedge marks each one) and an overhead finisher (a circle), turning between blows
     fissure   mid range: drives the blade into the ground; a marked lane of eruptions races toward you. Sidestep
     hellfire  at range: marks circles where you stand and around you; crimson bolts strike each one in turn
     doom      DOOM BLADE, the killing blow: raises the sword for 2 s while a huge circle pulses in front of him and the
               blade gathers light. Anyone still inside when it falls dies outright (armor and Guard don't help;
               only leaving the circle or the i-frames of a dodge do). Then the sword stays buried: punish him
   TRANSITION (at 50%): immune while he kneels, then a shock burst throws you back and he rises on his wings.
   PHASE 2, ASCENDED: hovers and circles at range (still low enough to reach), with an aerial moveset:
     dive      climbs high, marks where you stand, then plummets onto it; grounded and open for a moment after
     barrage   waves of homing soul orbs fired down from the air
     rain      hellstorm: a spread of marked circles around you, each struck in turn
     strafe    marks a lane through you, then sweeps along it low and fast, leaving a trail of blasts behind
   Hazards he leaves (bolts, trails) hold back his next move so attacks never stack into something unreadable. */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { playerInArea } from '../../../../combat/area.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { addHazard, Blast, clearHazards, scatterIn } from '../../../../combat/hazards.js';
import { arcFX, groundPoint, hitStop, ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { Projectile } from '../../../Projectile.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { showBanner } from '../../../../ui/banner.js';
import { toast } from '../../../../ui/toast.js';
import { damp } from '../../../../utils/math.js';
import { arcDist, dirAlong, projectTangent, slerpDir, tangentTo, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { groundHeight } from '../../../../world/terrain.js';
import { bossDecal, defineBoss, finish, glowOf, inWedge, keepInArena, phaseOf, predictHero, roar, shortName } from './core.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3(), _aim = new V3();
const WARN = 0xff4d6d, DOOM = 0xff1a3a;
const rad = THREE.MathUtils.degToRad;
const A = (e, id) => e.def.attacks[id];

/** Arc length of a lane that keeps its far end inside the arena. */
function laneLength(e, from, dir, want) {
  let len = want;
  while (len > 4 && arcDist(dirAlong(from, dir, len), e.home) > e.def.leash - 4) len -= 1;
  return len;
}

/** Point the lane-aiming moves at the hero for the first part of the windup, then commit. */
function aimLane(e, dt, k, want) {
  if (k < 0.6) { turnToward(e.fwd, e.toP, e.up, damp(6, dt)); e.laneDir.copy(e.fwd); e.laneFrom.copy(e.up); e.laneLen = laneLength(e, e.laneFrom, e.laneDir, want); }
}

/** Where the hero stands relative to a lane: distance along it and to its side (approximate, good for short lanes). */
function laneOffset(from, dir, p) {
  const fromPos = _tv2.copy(from).multiplyScalar(groundHeight(from)), d = tangentTo(fromPos, from, p, _tv);
  const along = d * _tv.dot(dir), side = Math.sqrt(Math.max(0, d * d - along * along));
  return { along, side };
}

const moves = {
  // ======================= PHASE 1: GROUNDED =======================
  combo: {
    ready: (e, dist) => dist <= A(e, 'combo').range,
    weight: () => 3,
    begin(e) { e.side = 1; audio.growl(); },
    windup(e, dt, k) {
      turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      e.wedge.place(e.up, e.fwd, A(e, 'combo').radius).opacity = 0.18 + 0.45 * k;
    },
    fire(e) { sweep(e); e.comboStep = 1; return 'active'; },
    active(e, dt) {
      const a = A(e, 'combo'), at = [0, a.gap, a.gap * 2 + 0.3], done = at[2] + 0.35;
      if (e.comboStep < 3) {                                                    // warn for the next blow while turning toward you
        turnToward(e.fwd, e.toP, e.up, damp(3, dt));
        const k = Math.min(1, (e.actT - at[e.comboStep - 1]) / (at[e.comboStep] - at[e.comboStep - 1]));
        if (e.comboStep === 1) e.wedge.place(e.up, e.fwd, a.radius).opacity = 0.15 + 0.45 * k;
        else { e.wedge.hide(); e.disc.place(finisherAt(e), null, a.slamRadius).opacity = 0.15 + 0.45 * k; e.edge.place(finisherAt(e), null, a.slamRadius).opacity = 0.5 + 0.5 * k; }
        if (e.actT >= at[e.comboStep]) { if (e.comboStep === 1) sweep(e); else slam(e); e.comboStep++; }
        return e.comboStep < 3 ? 1.0 : 0;                                       // shuffles forward between swings
      }
      if (e.actT >= done) finish(e);
      return 0;
    },
  },

  fissure: {
    ready: (e, dist) => dist >= 4 && dist <= A(e, 'fissure').length,
    weight: (e, dist) => (dist > 7 ? 2.2 : 1),
    begin() { audio.growl(); },
    windup(e, dt, k) {
      const a = A(e, 'fissure'); aimLane(e, dt, k, a.length);
      e.lane.place(e.laneFrom, e.laneDir, a.width, e.laneLen).opacity = 0.2 + 0.5 * k;
    },
    fire(e) { e.front = 0; e.nextBurst = 1; e.hitPlayer = false; audio.slam(); shakeCamera(0.35); return 'active'; },
    active(e, dt) {
      const a = A(e, 'fissure'), P = ctx.player; e.front += a.speed * dt;
      e.lane.place(e.laneFrom, e.laneDir, a.width, e.laneLen).opacity = 0.5 * Math.max(0, 1 - e.front / e.laneLen);
      for (; e.nextBurst <= Math.min(e.front, e.laneLen); e.nextBurst += 1.4) {
        const d = dirAlong(e.laneFrom, e.laneDir, e.nextBurst), p = groundPoint(d, 0.2);
        sparkles.emit(p, { count: 10, color: glowOf(e), speed: 2.6, up: d, upBias: 1.6, life: 0.6, size: 0.5 });
        sparkles.emit(p, { count: 6, color: 0x3a2030, speed: 2, up: d, upBias: 1.2, life: 0.7, size: 0.6 });
        if (Math.random() < 0.5) ringFX(p, a.width * 0.6, glowOf(e), 0.3);
      }
      if (!e.hitPlayer && !P.dead && e.front <= e.laneLen + 1) {
        const o = laneOffset(e.laneFrom, e.laneDir, P.pos);
        if (o.along > 0 && Math.abs(o.along - e.front) < 1.3 && o.side < a.width / 2 + P.radius) { e.hitPlayer = true; hurtPlayer(a.damage, P.pos, a.knockback); }
      }
      if (e.front >= e.laneLen) finish(e);
      return 0;
    },
  },

  hellfire: {
    ready: (e, dist) => dist >= 5,
    weight: (e, dist) => (dist > 8 ? 2 : 0.8),
    begin() { audio.charge(); },
    windup(e, dt) {
      turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      if (Math.random() < dt * 30) sparkles.emit(e.armL.getWorldPosition(_tv), { count: 1, color: glowOf(e), speed: 1, up: e.up, upBias: 2, life: 0.6, size: 0.45 });
    },
    fire(e) {
      const a = A(e, 'hellfire'), aim = predictHero(0.5);
      bolts(e, a, i => (i ? scatterIn(aim, 4.5) : aim));
      audio.doomCharge();
    },
  },

  doom: {
    ready: (e, dist) => dist <= A(e, 'doom').maxRange,
    weight: e => (e.hp / e.def.hp < 0.9 ? 2 : 0.4),
    begin(e) {
      audio.doomCharge(); emote(e, '!', '#ff1a3a');
      if (!e.doomWarned) { e.doomWarned = true; toast(`${shortName(e)} raises the Doom Blade! Get out of the circle!`); }
    },
    windup(e, dt, k) {
      const a = A(e, 'doom');
      if (k < 0.45) { turnToward(e.fwd, e.toP, e.up, damp(3, dt)); e.doomAt.copy(dirAlong(e.up, e.fwd, a.reach)); }   // aims, then commits
      const pulse = Math.abs(Math.sin(ctx.time * (5 + 12 * k)));
      e.disc.place(e.doomAt, e.fwd, a.radius).opacity = 0.16 + 0.3 * k;
      e.edge.place(e.doomAt, e.fwd, a.radius).opacity = 0.5 + 0.5 * pulse;
      e.fill.place(e.doomAt, e.fwd, Math.max(0.1, a.radius * k)).opacity = 0.2 + 0.25 * k;      // fills up as the blow nears
      if (Math.random() < dt * 40) sparkles.emit(e.sword.getWorldPosition(_tv), { count: 2, color: DOOM, speed: 1.5, up: e.up, upBias: 1, life: 0.5, size: 0.55 });
      if (k > 0.5 && playerInArea(e.doomAt, a.radius)) shakeCamera(0.06 + 0.1 * k);           // the ground trembles under you
    },
    fire(e) {
      const a = A(e, 'doom'), c = groundPoint(e.doomAt, 0);
      ringFX(c, a.radius, DOOM, 0.7); ringFX(c, a.radius * 0.6, 0xffffff, 0.45); ringFX(c, a.radius * 1.4, 0x3a0a14, 0.9);
      sparkles.emit(groundPoint(e.doomAt, 0.5), { count: 80, color: DOOM, speed: 6, up: e.doomAt, upBias: 0.8, life: 1.1, size: 0.6 });
      sparkles.emit(groundPoint(e.doomAt, 0.5), { count: 40, color: 0xffe0e8, speed: 4, up: e.doomAt, upBias: 1.2, life: 0.8, size: 0.5 });
      shakeCamera(0.9); hitStop(0.12); audio.doomSlam();
      if (playerInArea(e.doomAt, a.radius)) hurtPlayer(a.damage, c, 16, { lethal: true });
    },
  },

  // ======================= PHASE 2: ASCENDED (flying) =======================
  dive: {
    weight: () => 2.5,
    begin(e) { e.diveTo.copy(keepInArena(e, ctx.player.up)); audio.wingBeat(); },
    windup(e, dt, k) {
      const a = A(e, 'dive');
      turnToward(e.fwd, e.toP, e.up, damp(5, dt));
      if (k < 0.65) e.diveTo.copy(keepInArena(e, predictHero(0.3)));
      e.hoverGoal = e.def.flight.high;
      e.disc.place(e.diveTo, null, a.radius).opacity = 0.12 + 0.3 * k;
      e.edge.place(e.diveTo, null, a.radius).opacity = 0.4 + 0.5 * k;
    },
    fire(e) {
      const a = A(e, 'dive'); e.diveFrom.copy(e.up); e.diveH = e.hover;
      addHazard(new Blast({ owner: e, team: 'enemy', center: e.diveTo, radius: a.radius, delay: a.time, damage: a.damage, color: glowOf(e), warnColor: WARN,
        knock: a.knockback, shake: 0.7, stop: 0.06, sound: 'slam' }));
      audio.whoosh(); return 'active';
    },
    active(e) {
      const a = A(e, 'dive'), k = Math.min(1, e.actT / a.time), q = k * k;
      slerpDir(e.diveFrom, e.diveTo, q, e.up); e.up.normalize();
      e.r = groundHeight(e.up); e.pos.copy(e.up).multiplyScalar(e.r); projectTangent(e.fwd, e.up).normalize();
      e.hover = e.diveH * (1 - q);
      if (k >= 1) {
        e.hover = 0; sparkles.emit(e.pos, { count: 40, color: 0x3a2030, speed: 4, up: e.up, upBias: 0.5, life: 0.8, size: 0.6 });
        finish(e, a.grounded);                                              // stuck on the ground for a moment: hit him now
      }
      return 0;
    },
  },

  barrage: {
    weight: (e, dist) => (dist > 6 ? 2 : 1),
    begin() { audio.charge(); },
    windup(e, dt) {
      turnToward(e.fwd, e.toP, e.up, damp(5, dt));
      if (Math.random() < dt * 30) sparkles.emit(e.armL.getWorldPosition(_tv), { count: 1, color: glowOf(e), speed: 1, life: 0.5, size: 0.45 });
    },
    fire(e) { e.wave = 0; e.waveT = 0; return 'active'; },
    active(e, dt) {
      const a = A(e, 'barrage');
      turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      if ((e.waveT -= dt) <= 0 && e.wave < a.waves) { fan(e, a, e.wave); e.wave++; e.waveT = a.gap; }
      if (e.wave >= a.waves && e.waveT <= 0) finish(e);
      return 0;
    },
  },

  rain: {
    weight: () => 2,
    begin() { audio.charge(); },
    windup(e, dt) {
      turnToward(e.fwd, e.toP, e.up, damp(4, dt)); e.hoverGoal = e.def.flight.hover + 1.2;
      if (Math.random() < dt * 40) sparkles.emit(e.center(), { count: 1, color: glowOf(e), speed: 2, up: e.up, upBias: 1.5, life: 0.6, size: 0.45 });
    },
    fire(e) {
      const a = A(e, 'rain'), aim = ctx.player.up.clone();
      bolts(e, a, i => (i ? scatterIn(aim, a.scatter) : predictHero(0.4)));
      audio.doomCharge();
    },
  },

  strafe: {
    ready: (e, dist) => dist >= 5,
    weight: () => 1.6,
    begin() { audio.wingBeat(); },
    windup(e, dt, k) {
      const a = A(e, 'strafe'); aimLane(e, dt, k, a.length);
      e.hoverGoal = 1.5;
      e.lane.place(e.laneFrom, e.laneDir, a.width, e.laneLen).opacity = 0.2 + 0.5 * k;
    },
    fire(e) { e.hitPlayer = false; e.dropped = 1; e.flyH = e.hover; audio.whoosh(); return 'active'; },
    active(e) {
      const a = A(e, 'strafe'), P = ctx.player, gap = e.laneLen / a.trail, went = Math.min(e.laneLen, e.actT * a.speed);
      const here = dirAlong(e.laneFrom, e.laneDir, went), ahead = dirAlong(e.laneFrom, e.laneDir, went + 1);
      e.up.copy(here); e.r = groundHeight(e.up); e.pos.copy(e.up).multiplyScalar(e.r); e.fwd.copy(tangentToward(e.up, ahead));
      e.hover = e.flyH;
      if (!e.hitPlayer && !P.dead && arcDist(P.up, e.up) < a.width / 2 + P.radius + 0.4 && P.r - groundHeight(P.up) < 3) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback); }
      for (; e.dropped * gap <= went; e.dropped++)                         // the trail of blasts behind him
        addHazard(new Blast({ owner: e, team: 'enemy', center: dirAlong(e.laneFrom, e.laneDir, e.dropped * gap), radius: a.width * 0.6, delay: a.trailDelay,
          damage: a.damage * 0.6, color: glowOf(e), warnColor: WARN, knock: a.knockback * 0.5, shake: 0.15 }));
      if (went >= e.laneLen) { e.minCool = a.trailDelay; finish(e); }
      return 0;
    },
  },
};

function finisherAt(e) { return dirAlong(e.up, e.fwd, A(e, 'combo').reach); }

/** A wide sweep of the greatsword through the wedge in front (alternating sides). */
function sweep(e) {
  const a = A(e, 'combo'), P = ctx.player; e.swingT = 0.2; e.side = -e.side;
  arcFX(e.pos, e.up, e.fwd, a.radius, a.arc, glowOf(e)); audio.swipe(); audio.whoosh();
  if (!P.dead && inWedge(e, e.fwd, P.pos, a.radius + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, a.knockback);
}
/** The overhead finisher, into the circle in front of him. */
function slam(e) {
  const a = A(e, 'combo'), at = finisherAt(e), c = groundPoint(at, 0); e.slamT = 0.5;
  ringFX(c, a.slamRadius, glowOf(e), 0.5); sparkles.emit(groundPoint(at, 0.3), { count: 30, color: 0xe8d6c0, speed: 3.5, up: at, upBias: 0.6, life: 0.7, size: 0.5 });
  shakeCamera(0.4); audio.slam();
  if (playerInArea(at, a.slamRadius)) hurtPlayer(a.finisherDamage, c, a.knockback * 1.5);
}
/** count marked circles (first from where(0), the rest from where(i)), each struck by a falling bolt in turn. */
function bolts(e, a, where) {
  for (let i = 0; i < a.count; i++)
    addHazard(new Blast({ owner: e, team: 'enemy', center: keepInArena(e, where(i)), radius: a.radius, delay: a.delay + i * a.stagger, damage: a.damage,
      color: glowOf(e), warnColor: WARN, knock: a.knockback, fall: 'meteor', size: 0.42, shake: 0.2 }));
  e.minCool = a.delay + a.count * a.stagger;                                // the next move waits for the last strike
}
/** One wave of soul orbs fired down from the air, fanned around the hero. */
function fan(e, a, wave) {
  const spread = rad(a.spread), color = glowOf(e), off = wave % 2 ? 0.5 / (a.count - 1) : 0;
  for (let i = 0; i < a.count; i++) {
    const dir = e.toP.clone().applyAxisAngle(e.up, ((i + off) / (a.count - 1) - 0.5) * spread);
    ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir, startAlt: e.hover + 3.5, alt: 1.2, altRate: 2.4, speed: a.speed, range: 30, radius: 0.45, size: 0.34,
      color, homing: a.homing, homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
      onHit: (p, h) => { if (h === ctx.player) hurtPlayer(a.damage, p.pos, 3); sparkles.emit(p.pos, { count: 14, color, speed: 2.4, life: 0.5, size: 0.34 }); } }));
  }
  audio.wispShot();
}

function foldWings(e) { e.flying = false; e.hover = 0; e.hoverGoal = null; }

export const demonLord = defineBoss({
  moves,
  init(e) {
    const a = e.def.attacks;
    e.wedge = bossDecal(e, 'sector', WARN, { arc: rad(a.combo.arc) });
    e.disc = bossDecal(e, 'disc', WARN, { k: 0.9 }); e.edge = bossDecal(e, 'ring', DOOM, { k: 1.9, lift: 0.14 });
    e.fill = bossDecal(e, 'disc', DOOM, { k: 1.1, lift: 0.16 });
    e.lane = bossDecal(e, 'lane', WARN, { k: 1.2 });
    e.laneDir = new V3(); e.laneFrom = new V3(); e.doomAt = new V3(); e.diveTo = new V3(); e.diveFrom = new V3();
    e.side = 1; e.swingT = 0; e.slamT = 0; e.orbit = 1; e.yaw = 0;
    foldWings(e);
  },
  reset(e) { foldWings(e); e.doomWarned = false; },
  cancel(e) { if (e.state !== 'transition' && !e.flying) e.hover = 0; },
  onPhase(e, from, to) {
    if (!phaseOf(e).flying) return false;
    if (e.attack) moves[e.attack]?.cancel?.(e);
    clearHazards(e); e.hideTele();
    Object.assign(e, { state: 'transition', transT: 0, burst: false, invulnerable: true, speed: 0, attack: null });
    roar(e); showBanner(`${shortName(e)} ascends!`, 'The Demon Lord takes to the sky. Watch the ground!');
    return true;
  },
  transition(e, dt) {
    const T = e.def.transition; e.transT += dt;
    if (e.transT < T.burstAt) {                                             // kneels, gathering darkness
      if (Math.random() < dt * 60) sparkles.emit(dirAlong(e.up, _tv.copy(e.fwd).applyAxisAngle(e.up, Math.random() * 6.28), 6).multiplyScalar(groundHeight(e.up) + 0.5),
        { count: 1, color: glowOf(e), speed: 3, up: e.up, upBias: 0.8, life: 0.6, size: 0.5 });
      shakeCamera(0.08);
    } else if (!e.burst) {                                                  // the burst throws the hero clear
      e.burst = true; e.flying = true;
      ringFX(e.pos, T.radius, glowOf(e), 0.8); ringFX(e.pos, T.radius * 0.6, 0xffffff, 0.5);
      sparkles.emit(e.center(), { count: 90, color: glowOf(e), speed: 7, up: e.up, upBias: 0.6, life: 1.2, size: 0.6 });
      shakeCamera(0.8); hitStop(0.1); audio.phaseShift();
      if (playerInArea(e.up, T.radius)) hurtPlayer(T.damage, e.pos, T.push);
    } else e.hover += (e.def.flight.hover - e.hover) * damp(2.5, dt);       // rises on its wings
    if (e.transT >= T.time) { e.invulnerable = false; e.state = 'chase'; e.cool = 0.8; }
    return 0;
  },
  approach(e, dt, dist, ph) {
    const d = e.def;
    if (!e.flying) {                                                        // phase 1: stalks you on foot
      turnToward(e.fwd, e.toP, e.up, damp(d.turnRate * ph.speedMul, dt)); e.move.copy(e.toP);
      return dist > A(e, 'combo').range * 0.7 ? d.speed * ph.speedMul : 0;
    }
    const f = d.flight; let speed = f.speed * ph.speedMul;                  // phase 2: circles you from the air
    turnToward(e.fwd, e.toP, e.up, damp(4, dt));
    if (dist > f.orbit + 2) e.move.copy(e.toP);
    else if (dist < f.orbit - 2) e.move.copy(e.toP).negate();
    else { e.move.crossVectors(e.up, e.toP).multiplyScalar(e.orbit); speed *= 0.6; }
    if (Math.random() < dt * 0.3) e.orbit = -e.orbit;
    if (arcDist(e.up, e.home) > d.leash - 6) e.move.copy(tangentToward(e.up, e.home));   // never drifts out of the arena
    return speed;
  },
  update(e, dt) {
    e.swingT = Math.max(0, e.swingT - dt); e.slamT = Math.max(0, e.slamT - dt);
    if (e.state === 'chase' || e.state === 'recover') e.hoverGoal = null;
    if (e.state === 'active' || e.state === 'transition') return;
    const grounded = !e.flying || (e.state === 'recover' && e.attack === 'dive');
    const goal = grounded ? 0 : e.hoverGoal ?? e.def.flight.hover + Math.sin(ctx.time * 1.3 + e.seed) * 0.25;
    e.hover += (goal - e.hover) * damp(grounded ? 8 : 3, dt);
  },
  animate(e, dt) {
    const s = Math.abs(e.speed), t = ctx.time, st = e.state, at = e.attack, kk = damp(10, dt);
    const k = st === 'windup' ? 1 - e.timer / e.windupTime : 0, walk = e.flying ? 0 : Math.sin(e.phase) * Math.min(1, s / 2) * 0.6;
    // arm pitch (aL / aR), sword pitch relative to the arm (sw), body yaw / lean, wing fold (1 = folded) and flap
    let aL = -walk * 0.5, aR = -0.6 + walk * 0.2, sw = -1.7, yaw = 0, lean = st === 'chase' && !e.flying ? 0.1 : 0, fold = e.flying ? 0 : 1, flap = 0;
    let legs = null;
    if (e.flying) { legs = 0.35 + Math.sin(t * 2) * 0.1; flap = Math.sin(t * 5) * 0.45; lean = 0.15; }
    if (at === 'combo' && st === 'windup') { aR = -1.4; sw = 1.85; yaw = 0.9 * k; lean = -0.1; }
    if (at === 'combo' && st === 'active') {
      aR = -1.4; sw = 1.85; const p = e.swingT > 0 ? 1 - e.swingT / 0.2 : 1; yaw = e.side * -(0.9 - 1.8 * p);
      if (e.comboStep === 2) { aL = aR = -2.9; sw = 0.5; yaw = 0; lean = -0.25; }
      if (e.slamT > 0 || e.comboStep > 2) { aL = aR = -0.9; sw = 1.26; yaw = 0; lean = 0.45; }
    }
    if (at === 'doom' && st === 'windup') { aL = aR = -3.0; sw = 0.6; lean = -0.3; }
    if (at === 'doom' && st === 'recover') { aL = aR = -0.9; sw = 1.4; lean = 0.5; }          // sword buried in the ground
    if (at === 'fissure' && st === 'windup') { aL = aR = -2.6; sw = 0.6; lean = -0.2; }
    if (at === 'fissure' && st === 'active') { aL = aR = -0.9; sw = 1.3; lean = 0.45; }
    if ((at === 'hellfire' || at === 'barrage') && st !== 'recover' && st !== 'chase') aL = at === 'hellfire' ? -2.7 : -1.6;
    if (at === 'rain' && st === 'windup') { aL = -2.7; aR = -2.4; sw = 0.4; }
    if (at === 'dive' && st === 'windup') { lean = -0.35; flap = Math.sin(t * 9) * 0.7; }
    if (at === 'dive' && st === 'active') { lean = 0.9; fold = 0.55; aR = -1.5; sw = 1.5; flap = 0; }
    if (at === 'dive' && st === 'recover') { lean = 0.35; fold = 0.3; aR = -0.9; sw = 1.3; }
    if (at === 'strafe' && st === 'active') { lean = 0.8; fold = 0.5; aR = -1.2; sw = 1.6; flap = 0; }
    if (st === 'transition') {
      if (e.transT < e.def.transition.burstAt) { lean = 0.55; aL = aR = 0.2; sw = 1.3; fold = 1 - e.transT / e.def.transition.burstAt * 0.6; flap = Math.sin(t * 20) * 0.05; }
      else { lean = -0.25; aL = aR = -1.3; fold = 0; flap = Math.sin(t * 7) * 0.6; legs = 0.3; }
    }
    lerpX(e.armL, aL, kk); lerpX(e.armR, aR, kk); lerpX(e.body, lean, damp(8, dt)); lerpX(e.sword, sw, damp(14, dt));
    if (legs !== null) { lerpX(e.legL, legs, kk); lerpX(e.legR, legs * 0.8, kk); } else { e.legL.rotation.x = walk; e.legR.rotation.x = -walk; }
    e.yaw += (yaw - e.yaw) * damp(st === 'active' ? 24 : 10, dt); e.body.rotation.y = e.yaw;
    e.body.rotation.z = e.stunT > 0 ? Math.sin(t * 6) * 0.12 : 0;
    for (const [w, sx] of [[e.wingL, -1], [e.wingR, 1]]) {
      w.rotation.y += (sx * (0.25 + 1.2 * fold) - w.rotation.y) * damp(7, dt);
      w.rotation.z += (sx * ((1 - fold) * (0.3 + flap) - fold * 0.1) - w.rotation.z) * damp(12, dt);
    }
    if (e.cape) e.cape.rotation.x = Math.min(s, 8) * 0.03 + (e.flying ? 0.35 : 0) + Math.sin(t * 2.2 + e.seed) * 0.03;
    const charge = at === 'doom' && st === 'windup' ? k * 3 : 0;
    e.core.scale.setScalar(1 + charge + (e.flying ? Math.sin(t * 8) * 0.25 : 0));
    e.body.scale.setScalar(1 + e.hitPop * 0.05);
  },
});

function lerpX(obj, target, k) { obj.rotation.x += (target - obj.rotation.x) * k; }
