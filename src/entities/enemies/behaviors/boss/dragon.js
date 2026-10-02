/* PLANET 2 BOSS: Pyrrhax, the Red Wyrm (COMBAT.enemies.pyrrhax). Fire, sweeping melee and mobility; it reads
   the hero's position rather than cycling a fixed order:
     bite       close and in front: rears its head (wedge on the ground), then snaps
     tail       hero close beside or behind it (where the slow-turning dragon can't bite): coils, then spins its tail
                through the marked circle. It sweeps low: jump over it, or step out
     breath     mid range: raises its head, the throat glows, the cone it will scorch is laid out (with the side it
                sweeps toward); then a slow flaming sweep that burns in ticks. Get behind it, or outrun the sweep
     fireballs  at range: lobs a string of fireballs at where the hero is heading; each lands on a marked circle and
                leaves a short-lived burning patch (more shots once enraged)
     leap       far away: spreads its wings, marks where it will come down, then flies over and slams down there
   Below 50% HP it enters Inferno: faster, shorter pauses, five fireballs per volley and a wider breath sweep.
   Every attack gives a clear pose + ground mark; moves never overlap (one at a time, hazards gate the next move). */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { playerInArea } from '../../../../combat/area.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { addHazard, Blast, hazardsOf, scatterIn, Zone } from '../../../../combat/hazards.js';
import { arcFX, groundPoint, ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { damp } from '../../../../utils/math.js';
import { mpick } from '../../../../utils/random.js';
import { dirAlong, projectTangent, slerpDir, turnToward } from '../../../../utils/sphere.js';
import { groundHeight } from '../../../../world/terrain.js';
import { bossDecal, defineBoss, facing, finish, inWedge, keepInArena, phaseOf, predictHero, roar, shortName } from './core.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _mouth = new V3();
const WARN = 0xff4d6d, FIRE = [0xff5a1a, 0xff9a3a, 0xffd36b];
const rad = THREE.MathUtils.degToRad;

const A = (e, id) => e.def.attacks[id];
const enraged = e => !!phaseOf(e).enraged;
const sweepOf = e => rad(enraged(e) ? A(e, 'breath').sweepEnraged : A(e, 'breath').sweep);
function mouth(e) { return e.core.getWorldPosition(_mouth); }

const moves = {
  bite: {
    ready: (e, dist) => dist <= A(e, 'bite').range + 0.4 && facing(e) > 0.45,
    weight: () => 3,
    begin() { audio.growl(); },
    windup(e, dt, k) {
      const a = A(e, 'bite');
      if (k < 0.6) turnToward(e.fwd, e.toP, e.up, damp(5, dt));
      e.biteMark.place(e.up, e.fwd, a.range).opacity = 0.2 + 0.5 * k;
    },
    fire(e) {
      const a = A(e, 'bite'), P = ctx.player; e.snapT = 0.25;
      arcFX(e.pos, e.up, e.fwd, a.range, a.arc, 0xffd0a0); audio.bite();
      if (!P.dead && inWedge(e, e.fwd, P.pos, a.range + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, a.knockback);
    },
  },

  tail: {
    ready: (e, dist) => dist <= A(e, 'tail').radius - 0.4,
    weight: e => (facing(e) < 0.3 ? 5 : 0.6),                 // its answer to being flanked
    begin(e) { audio.growl(); emote(e, '!', '#ffb03d'); },
    windup(e, dt, k) {
      const a = A(e, 'tail');
      e.zoneMark.place(e.up, e.fwd, a.radius).opacity = 0.12 + 0.3 * k;
      e.zoneEdge.place(e.up, e.fwd, a.radius).opacity = 0.4 + 0.5 * k;
    },
    fire(e) { e.hitPlayer = false; audio.whoosh(); audio.tailSweep(); return 'active'; },
    active(e, dt) {
      const a = A(e, 'tail');
      if (!e.hitPlayer && playerInArea(e.up, a.radius, true)) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback); shakeCamera(0.3); }
      if (Math.random() < dt * 40) sparkles.emit(groundPoint(dirAlong(e.up, _tv.copy(e.fwd).applyAxisAngle(e.up, Math.random() * 6.28), a.radius * 0.8), 0.2),
        { count: 2, color: 0xe8d6c0, speed: 2, up: e.up, upBias: 0.5, life: 0.5, size: 0.4 });
      if (e.actT >= a.spinTime) { ringFX(e.pos, a.radius, 0xffd0a0, 0.4); finish(e); }
      return 0;
    },
  },

  breath: {
    ready: (e, dist) => dist >= A(e, 'breath').minRange && dist <= A(e, 'breath').maxRange,
    weight: e => (facing(e) > 0.3 ? 2.5 : 1.2),
    begin(e) { e.sweepSign = Math.random() < 0.5 ? -1 : 1; audio.charge(); },
    windup(e, dt, k) {
      const a = A(e, 'breath'), sweep = sweepOf(e);
      if (k < 0.7) turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      e.breathDir.copy(e.fwd).applyAxisAngle(e.up, -e.sweepSign * sweep / 2);              // starts on one side...
      (enraged(e) ? e.sweepMarkE : e.sweepMark).place(e.up, e.fwd, a.length).opacity = 0.08 + 0.14 * k;   // ...and will cover all of this
      e.coneMark.place(e.up, e.breathDir, a.length).opacity = 0.2 + 0.45 * k;
      if (Math.random() < dt * 20) sparkles.emit(mouth(e), { count: 1, color: mpick(FIRE), speed: 0.6, up: e.up, upBias: 1, life: 0.4, size: 0.35 });
    },
    fire(e) { e.breathAxis.copy(e.fwd); e.tickT = 0; audio.fireBreath(A(e, 'breath').time); return 'active'; },
    active(e, dt) {
      const a = A(e, 'breath'), P = ctx.player, k = Math.min(1, e.actT / a.time), sweep = sweepOf(e);
      projectTangent(e.breathAxis, e.up).normalize();
      e.breathDir.copy(e.breathAxis).applyAxisAngle(e.up, e.sweepSign * sweep * (k - 0.5));
      e.fwd.copy(e.breathDir);
      e.coneMark.place(e.up, e.breathDir, a.length).opacity = 0.3 + Math.random() * 0.15;
      for (let i = 0; i < 4; i++) {                                                           // the flames
        const t = 1.5 + Math.random() * (a.length - 1.5), side = (Math.random() - 0.5) * rad(a.arc) * Math.min(1, t / 4);
        const d = dirAlong(e.up, _tv.copy(e.breathDir).applyAxisAngle(e.up, side), t);
        sparkles.emit(groundPoint(d, 0.5 + Math.random()), { count: 1, color: mpick(FIRE), speed: 1.4, up: d, upBias: 1.2, life: 0.45, size: 0.6 + t * 0.04 });
      }
      sparkles.emit(mouth(e), { count: 2, color: 0xffd36b, speed: 6, up: e.breathDir, upBias: 1.4, life: 0.35, size: 0.5 });
      if ((e.tickT -= dt) <= 0) {
        e.tickT = a.tick;
        if (!P.dead && inWedge(e, e.breathDir, P.pos, a.length + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, 2);
      }
      if (k >= 1) finish(e);
      return 0;
    },
  },

  fireballs: {
    ready: (e, dist) => dist >= A(e, 'fireballs').minRange,
    weight: (e, dist) => (dist > 10 ? 2.5 : 1),
    begin() { audio.charge(); },
    windup(e, dt) {
      turnToward(e.fwd, e.toP, e.up, damp(5, dt));
      if (Math.random() < dt * 25) sparkles.emit(mouth(e), { count: 1, color: mpick(FIRE), speed: 0.8, up: e.up, upBias: 1, life: 0.4, size: 0.4 });
    },
    fire(e) { e.shots = 0; e.shotT = 0; return 'active'; },
    active(e, dt) {
      const a = A(e, 'fireballs'), count = enraged(e) ? a.countEnraged : a.count;
      turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      if ((e.shotT -= dt) <= 0 && e.shots < count) { lob(e, a, e.shots); e.shots++; e.shotT = a.gap; }
      if (e.shots >= count && e.shotT <= 0) { e.minCool = a.flight; finish(e); }
      return 0;
    },
  },

  leap: {
    ready: (e, dist) => dist >= A(e, 'leap').minRange && dist <= A(e, 'leap').maxRange,
    weight: (e, dist) => (dist > 13 ? 3 : 1),
    begin(e) { e.leapTo.copy(keepInArena(e, ctx.player.up)); audio.wingBeat(); emote(e, '!', '#ff4d6d'); },
    windup(e, dt, k) {
      const a = A(e, 'leap');
      turnToward(e.fwd, e.toP, e.up, damp(4, dt));
      if (k < 0.5) e.leapTo.copy(keepInArena(e, predictHero(0.4)));                           // tracks, then commits
      e.zoneMark.place(e.leapTo, null, a.radius).opacity = 0.12 + 0.3 * k;
      e.zoneEdge.place(e.leapTo, null, a.radius).opacity = 0.4 + 0.5 * k;
    },
    fire(e) {
      const a = A(e, 'leap'); e.leapFrom.copy(e.up);
      addHazard(new Blast({ owner: e, team: 'enemy', center: e.leapTo, radius: a.radius, delay: a.time, damage: a.damage, color: 0xffb08a, warnColor: WARN,
        knock: a.knockback, shake: 0.6, sound: 'slam' }));
      audio.whoosh(); audio.wingBeat();
      sparkles.emit(e.pos, { count: 30, color: 0xe8d6c0, speed: 3, up: e.up, upBias: 0.5, life: 0.7, size: 0.5 });
      return 'active';
    },
    active(e) {
      const a = A(e, 'leap'), k = Math.min(1, e.actT / a.time);
      slerpDir(e.leapFrom, e.leapTo, k, e.up); e.up.normalize();
      e.r = groundHeight(e.up); e.pos.copy(e.up).multiplyScalar(e.r); projectTangent(e.fwd, e.up).normalize();
      e.hover = a.height * 4 * k * (1 - k);
      if (k >= 1) { e.hover = 0; finish(e); }
      return 0;
    },
    cancel(e) { e.hover = 0; },
  },
};

/** One lobbed fireball: the first goes where the hero is heading, the rest scatter around it. */
function lob(e, a, i) {
  const target = keepInArena(e, i ? scatterIn(predictHero(a.flight * 0.6), a.spread) : predictHero(a.flight * 0.6));
  e.snapT = 0.2; audio.castFire();
  addHazard(new Blast({ owner: e, team: 'enemy', center: target, radius: a.radius, delay: a.flight, damage: a.damage, color: 0xff7a2a, warnColor: WARN,
    knock: a.knockback, fall: 'lob', from: mouth(e).clone(), size: 0.55, shake: 0.25,
    onImpact: b => {                                               // a short-lived burning patch (only a few at once, so the arena stays playable)
      if (hazardsOf(e).filter(h => h instanceof Zone).length < 4) addHazard(new Zone({ owner: e, team: 'enemy', center: b.center, radius: a.radius * 0.7, color: 0xff6a2a, rain: 'embers', ...a.pool }));
    } }));
}

const lerp = (obj, key, target, k) => { obj[key] += (target - obj[key]) * k; };

export const dragon = defineBoss({
  moves,
  init(e) {
    const a = e.def.attacks;
    e.biteMark = bossDecal(e, 'sector', WARN, { arc: rad(a.bite.arc) });
    e.coneMark = bossDecal(e, 'sector', 0xff6a2a, { arc: rad(a.breath.arc), k: 1.3 });
    e.sweepMark = bossDecal(e, 'sector', WARN, { arc: rad(a.breath.arc + a.breath.sweep), k: 0.9 });
    e.sweepMarkE = bossDecal(e, 'sector', WARN, { arc: rad(a.breath.arc + a.breath.sweepEnraged), k: 0.9 });
    e.zoneMark = bossDecal(e, 'disc', WARN, { k: 0.9 }); e.zoneEdge = bossDecal(e, 'ring', WARN, { k: 1.8, lift: 0.14 });
    e.breathDir = new V3(); e.breathAxis = new V3(); e.leapFrom = new V3(); e.leapTo = new V3();
    e.snapT = 0; e.yaw = 0;
  },
  reset(e) { e.hover = 0; e.snapT = 0; },
  cancel(e) { e.hover = 0; },
  onPhase(e) {
    roar(e, true, `${shortName(e)} erupts in flame: Inferno!`);
    ringFX(e.pos, 8, 0xff7a2a, 0.8); sparkles.emit(e.center(), { count: 60, color: 0xff7a2a, speed: 5, up: e.up, upBias: 0.8, life: 1.1, size: 0.5 });
    return true;
  },
  approach(e, dt, dist, ph) {
    const d = e.def;
    turnToward(e.fwd, e.toP, e.up, damp(d.turnRate * ph.speedMul, dt));                       // turns slowly: flanking is possible...
    if (dist > 6) { e.move.copy(e.toP); return d.speed * ph.speedMul; }
    if (dist < 3.2) return 0;
    e.move.crossVectors(e.up, e.toP).multiplyScalar(Math.sin(ctx.time * 0.5 + e.seed) > 0 ? 1 : -1);   // ...and it prowls sideways
    return d.speed * 0.35;
  },
  update(e, dt) { e.snapT = Math.max(0, e.snapT - dt); },
  animate(e, dt) {
    const s = Math.abs(e.speed), walk = Math.sin(e.phase * 0.8) * Math.min(1, s / 2) * 0.55, t = ctx.time, st = e.state, at = e.attack;
    const k = st === 'windup' ? 1 - e.timer / e.windupTime : 0, kk = damp(10, dt);
    let neck = -0.6, head = 0.55, jaw = 0.06, glow = 1, fold = 1, flap = 0, yaw = 0, lean = 0, tuck = 0;
    if (st === 'windup' && at === 'bite') { neck = -0.6 - 0.45 * k; jaw = 0.5 * k; head = 0.75; }
    if (st === 'windup' && (at === 'breath' || at === 'fireballs')) { neck = -0.9; jaw = 0.35 * k; glow = 1 + 2.5 * k; }
    if (st === 'active' && at === 'breath') { neck = -0.35; head = 0.8; jaw = 0.75; glow = 2.6 + Math.random() * 0.6; }
    if (st === 'active' && at === 'fireballs') { neck = -0.8; jaw = e.snapT > 0 ? 0.7 : 0.25; glow = 2; }
    if (e.snapT > 0 && at === 'bite') { neck = -0.2; jaw = 0.02; head = 0.45; }
    if (st === 'windup' && at === 'tail') yaw = -0.5 * k;
    if (st === 'active' && at === 'tail') yaw = -0.5 + (Math.PI * 2 + 0.5) * Math.min(1, e.actT / A(e, 'tail').spinTime);
    if (at === 'leap' && st === 'windup') { fold = 1 - k; flap = Math.sin(t * 9) * 0.3 * k; lean = -0.15 * k; }
    if (at === 'leap' && st === 'active') { fold = 0; flap = Math.sin(t * 11) * 0.6; tuck = 0.6; lean = 0.1; }
    if (enraged(e) && fold > 0.5) { fold = 0.55; flap = Math.sin(t * 2.5) * 0.15; glow = Math.max(glow, 1.4 + Math.sin(t * 7) * 0.3); }
    lerp(e.neck.rotation, 'x', neck, kk); lerp(e.head.rotation, 'x', head, kk); lerp(e.jaw.rotation, 'x', jaw, damp(18, dt));
    e.core.scale.setScalar(glow);
    // tail spin is set directly (a full turn); everything else eases. Unwind whole turns so it never spins back.
    if (st === 'active' && at === 'tail') e.yaw = yaw; else { e.yaw -= Math.round(e.yaw / (Math.PI * 2)) * Math.PI * 2; e.yaw += (yaw - e.yaw) * damp(8, dt); }
    e.body.rotation.y = e.yaw;
    e.body.rotation.x += (lean - e.body.rotation.x) * damp(8, dt);
    e.body.rotation.z = e.stunnedT > 0 || e.stunT > 0 ? Math.sin(t * 6) * 0.1 : 0;
    e.legs.forEach((l, i) => { const swing = (i === 0 || i === 3 ? walk : -walk); lerp(l.rotation, 'x', tuck ? (i < 2 ? -tuck : tuck) : swing, damp(14, dt)); });
    const coil = st === 'windup' && at === 'tail' ? 0.22 * k : 0;
    e.tail.forEach((seg, i) => { seg.rotation.y = Math.sin(t * 1.6 - i * 0.7) * (0.1 + s * 0.02) + coil; });
    for (const [w, sx] of [[e.wingL, -1], [e.wingR, 1]]) {
      lerp(w.rotation, 'y', sx * (0.25 + 1.15 * fold), damp(8, dt));
      lerp(w.rotation, 'z', sx * ((1 - fold) * 0.45 + flap - fold * 0.15), damp(12, dt));
    }
    e.body.scale.setScalar(1 + e.hitPop * 0.05);
  },
});
