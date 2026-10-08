/* PLANET 1 BOSS: Gloomcap, the Moss King (COMBAT.enemies.gloomcap). The introductory fight: a slow, readable
   walk-up brawler whose every move has a long, clear warning. Same moves and numbers as before the boss framework:
     slam       big ground pound in front of it (warning disc)
     charge     straight rush along a marked lane; dazed and taking bonus damage if it hits scenery (it pulls up at
                the edge of its arena instead of charging out of the fight)
     volley     a fan of slow homing spores (also its fallback when nothing else fits)
     shockwave  an expanding ring along the ground: jump over it
     summon     calls a few temporary minions
   Below each health threshold it roars and gets faster and more aggressive. */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { groundPoint, ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { Projectile } from '../../../Projectile.js';
import { hitsStatic } from '../../../../physics/colliders.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { damp } from '../../../../utils/math.js';
import { arcDist, dirAlong, projectTangent, turnToward } from '../../../../utils/sphere.js';
import { groundHeight } from '../../../../world/terrain.js';
import { hideDots, layLane, layRing, makeDots, showDisc } from '../telegraphs.js';
import { defineBoss, finish, glowOf } from './core.js';
import { rng } from '../../../../utils/random.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _probe = new V3(), _aim = new V3();

function minionCount(e) { return ctx.enemies.filter(m => m.owner === e && m.alive).length; }
function slamCenter(e) { return _tv.copy(e.pos).addScaledVector(e.fwd, e.def.attacks.slam.reach); }

function endCharge(e, crashed) {
  if (!crashed) { finish(e); return; }
  finish(e, e.def.attacks.charge.crashStun); e.stunT = e.stunnedT = e.def.attacks.charge.crashStun; e.speed = 0;   // dazed: a window to punish it
  emote(e, '?', '#ffd24a'); audio.slam(); shakeCamera(0.35);
  sparkles.emit(e.center(), { count: 30, color: 0xffe066, speed: 2.6, up: e.up, upBias: 1, life: 0.9, size: 0.4 });
}

/** Shockwave rings roll outward along the ground; touching one while on the ground hurts (a jump clears it). */
function updateWaves(e, dt) {
  const a = e.def.attacks.shockwave, P = ctx.player;
  for (let i = e.waves.length - 1; i >= 0; i--) {
    const w = e.waves[i]; w.r += a.speed * dt;
    if (w.r > a.maxRadius) { hideDots(w.slot); e.waves.splice(i, 1); continue; }
    layRing(w.slot, w.center, w.r, a.width * 0.5, 0.1 + 0.9 * (1 - w.r / a.maxRadius));
    if (!w.hit && !P.dead && Math.abs(arcDist(P.up, w.center) - w.r) < a.width * 0.5 + P.radius && P.r - groundHeight(P.up) < 0.6) {
      w.hit = true; hurtPlayer(a.damage, _tv.copy(w.center).multiplyScalar(groundHeight(w.center)), a.knockback);
    }
  }
}

const moves = {
  slam: {
    ready: (e, dist) => dist <= e.def.attacks.slam.range,
    begin() { audio.growl(); },
    windup(e, dt, k) { turnToward(e.fwd, e.toP, e.up, damp(2, dt)); showDisc(e, slamCenter(e), e.def.attacks.slam.radius, k); },
    fire(e, dist) {
      const a = e.def.attacks.slam, P = ctx.player, c = slamCenter(e).clone();
      ringFX(c, a.radius, 0xffb08a, 0.55); ringFX(c, a.radius * 0.6, 0xffffff, 0.4);
      sparkles.emit(groundPoint(c, 0.3), { count: 40, color: 0xe8d6c0, speed: 4, up: e.up, upBias: 0.5, life: 0.8, size: 0.5 });
      shakeCamera(dist < 16 ? 0.45 : 0.2); audio.slam();
      if (!P.dead && P.pos.distanceTo(c) < a.radius + P.radius && P.r - groundHeight(P.up) < 0.9) hurtPlayer(a.damage, c, a.knockback);
    },
  },
  charge: {
    ready: (e, dist) => dist >= e.def.attacks.charge.minRange,
    begin(e) { e.chargeDir.copy(e.fwd); e.laneFrom.copy(e.up); audio.growl(); },
    windup(e, dt, k) {
      const a = e.def.attacks.charge;
      if (k < 0.55) { turnToward(e.fwd, e.toP, e.up, damp(8, dt)); e.chargeDir.copy(e.fwd); e.laneFrom.copy(e.up); }   // aims, then commits
      layLane(e.lane, e.laneFrom, e.chargeDir, a.distance, a.width, 0.2 + 0.5 * k);
    },
    fire(e) { const a = e.def.attacks.charge; e.chargeT = a.distance / a.speed; e.hitPlayer = false; audio.whoosh(); return 'active'; },
    active(e, dt, dist) {
      const a = e.def.attacks.charge, P = ctx.player;
      projectTangent(e.chargeDir, e.up).normalize(); e.fwd.copy(e.chargeDir); e.move.copy(e.chargeDir);
      if (!e.hitPlayer && !P.dead && dist < e.radius + P.radius + a.width * 0.5) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback); shakeCamera(0.3); }
      if (rng() < dt * 30) sparkles.emit(groundPoint(e.pos, 0.2), { count: 1, color: 0xe8d6c0, speed: 1.6, up: e.up, upBias: 0.6, life: 0.5, size: 0.4 });
      if ((e.chargeT -= dt) <= 0 || arcDist(e.up, e.home) > e.def.leash - 4) endCharge(e, false);   // pulls up short of the arena's edge
      return a.speed;
    },
  },
  volley: {
    begin() { audio.charge(); },
    windup(e, dt) { turnToward(e.fwd, e.toP, e.up, damp(6, dt)); },
    fire(e) {
      const a = e.def.attacks.volley, color = glowOf(e), spread = THREE.MathUtils.degToRad(a.spread);
      for (let i = 0; i < a.count; i++) {
        const dir = e.toP.clone().applyAxisAngle(e.up, a.count > 1 ? (i / (a.count - 1) - 0.5) * spread : 0);
        ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir, alt: 1.2, speed: a.speed, range: 26, radius: 0.4, size: 0.3, color,
          homing: a.homing, homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
          onHit: (p, h) => { if (h === ctx.player) hurtPlayer(a.damage, p.pos, 2.5); sparkles.emit(p.pos, { count: 14, color, speed: 2.4, life: 0.5, size: 0.32 }); } }));
      }
      audio.wispShot();
    },
  },
  shockwave: {
    begin() { audio.growl(); },
    windup(e, dt, k) { showDisc(e, e.pos, e.radius + 2.5 * k, k); },
    fire(e) {
      const slot = e.waveSlots.find(s => !e.waves.some(w => w.slot === s));
      if (slot) e.waves.push({ slot, center: e.up.clone(), r: e.radius, hit: false });
      ringFX(e.pos, 3, glowOf(e), 0.4); shakeCamera(0.3); audio.slam(); audio.nova();
    },
  },
  summon: {
    ready: e => minionCount(e) < e.def.attacks.summon.max,
    begin() { audio.charge(); },
    windup(e, dt) { if (rng() < dt * 14) sparkles.emit(_tv.copy(e.pos).addScaledVector(e.up, 0.3), { count: 2, color: glowOf(e), speed: 1, up: e.up, upBias: 2.5, life: 0.9, size: 0.34 }); },
    fire(e) {
      const a = e.def.attacks.summon, want = Math.min(a.types.length, a.max - minionCount(e));
      for (let i = 0; i < want; i++) {
        const m = e.spawnMinion(a.types[i], dirAlong(e.up, _tv.copy(e.fwd).applyAxisAngle(e.up, i * 2.1 + 0.7), 3.2));
        sparkles.emit(m.center(), { count: 24, color: glowOf(e), speed: 2.5, up: m.up, upBias: 0.8, life: 0.8, size: 0.36 });
      }
      audio.sparkle();
    },
  },
};

export const gloomcap = defineBoss({
  moves,
  fallback: () => 'volley',
  init(e) {
    e.lane = makeDots(e, 12, 0xff4d6d);
    e.waveSlots = [makeDots(e, 44, glowOf(e), 1.6), makeDots(e, 44, glowOf(e), 1.6)];      // up to two shockwaves in flight
    e.chargeDir = new V3(); e.laneFrom = new V3(); e.waves = [];
  },
  cancel(e) { for (const w of e.waves) hideDots(w.slot); e.waves.length = 0; },
  approach(e, dt, dist, ph) {
    turnToward(e.fwd, e.toP, e.up, damp(e.def.turnRate * ph.speedMul, dt));
    e.move.copy(e.toP);
    return dist > e.def.attacks.slam.range * 0.75 ? e.def.speed * ph.speedMul : 0;
  },
  update(e, dt, n) {
    updateWaves(e, dt);
    if (e.state === 'active' && e.attack === 'charge' && n && hitsStatic(_probe.copy(e.pos).addScaledVector(e.chargeDir, e.radius + 0.3).addScaledVector(e.up, 0.8), e.radius * 0.6)) endCharge(e, true);
  },
  animate(e, dt) {
    const d = e.def, s = Math.abs(e.speed), sw = Math.sin(e.phase) * Math.min(1, s / 2) * 0.6, charging = e.state === 'active' && e.attack === 'charge';
    e.legL.rotation.x = sw; e.legR.rotation.x = -sw;
    let aL = -sw * 0.5, aR = sw * 0.5, lean = e.state === 'chase' ? 0.1 : 0;
    if (e.state === 'windup') {
      const t = Math.min(1, (1 - e.timer / e.windupTime) * 1.4);
      if (e.attack === 'slam' || e.attack === 'shockwave') { aL = aR = -2.8 * t; lean = -0.2; }
      else if (e.attack === 'charge') { aL = aR = 0.6; lean = 0.45; }
      else if (e.attack === 'volley') { aR = -1.6; lean = -0.1; }
      else { aL = aR = -2.2 * t; }                                        // summon: arms raised to the sky
    } else if (charging) { aL = aR = 0.9; lean = 0.5; }
    e.armL.rotation.x += (aL - e.armL.rotation.x) * damp(10, dt); e.armR.rotation.x += (aR - e.armR.rotation.x) * damp(10, dt);
    e.body.rotation.x += (lean - e.body.rotation.x) * damp(8, dt);
    e.body.rotation.z = e.stunnedT > 0 ? Math.sin(ctx.time * 6) * 0.15 : 0;
    e.body.scale.setScalar(1 + e.hitPop * 0.06);
    if (e.cape) e.cape.rotation.x = Math.min(s, 8) * 0.03 + (charging ? 0.25 : 0) + Math.sin(ctx.time * 2.2 + e.seed) * 0.03;   // cape billows
    const glow = e.state === 'windup' && e.attack === 'volley' ? (1 - e.timer / e.windupTime) * 1.5 : 0;
    e.core.scale.setScalar(1 + glow + (e.bossPhase >= d.phases.length - 1 ? Math.sin(ctx.time * 8) * 0.25 : 0));
  },
});
