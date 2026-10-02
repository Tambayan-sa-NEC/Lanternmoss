/* PLANET BOSS (ai 'boss'), e.g. Gloomcap: guards a lair far from the village, marked by a shaft of light.
   Each attack is telegraphed, then chosen from its current phase (COMBAT.enemies.gloomcap.attacks / .phases):
     slam       big ground pound in front of it (warning disc)
     charge     straight rush along a marked lane; dazed and taking bonus damage if it hits scenery
     volley     a fan of slow homing spores
     shockwave  an expanding ring along the ground: jump over it
     summon     calls a few temporary minions
   Below each health threshold it roars and gets faster and more aggressive. Immune to stagger and knockback.
   Leaving its arena sends it home to recover, as with any monster. Dying raises encounterEvents 'bossdefeated'. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { encounterEvents } from '../../../combat/events.js';
import { fxMaterial, groundPoint, ringFX } from '../../../fx/combatFx.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { Projectile } from '../../Projectile.js';
import { hitsStatic } from '../../../physics/colliders.js';
import { scene } from '../../../render/scene.js';
import { audio } from '../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../systems/CameraSystem.js';
import { toast } from '../../../ui/toast.js';
import { damp } from '../../../utils/math.js';
import { mpick } from '../../../utils/random.js';
import { arcDist, dirAlong, frameQuat, projectTangent, tangentFrame, turnToward } from '../../../utils/sphere.js';
import { groundHeight } from '../../../world/terrain.js';
import { ENGAGED } from '../states.js';
import { hideDots, layLane, layRing, makeDots, showDisc } from './telegraphs.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _probe = new V3(), _aim = new V3();

export const boss = {
  init(e) {
    const color = e.def.capColor ?? e.def.color;
    e.lane = makeDots(e, 12, 0xff4d6d);
    e.waveSlots = [makeDots(e, 44, color, 1.6), makeDots(e, 44, color, 1.6)];      // up to two shockwaves in flight
    e.chargeDir = new V3(); e.laneFrom = new V3(); e.waves = [];
    // PLACEHOLDER beacon: a tall shaft of light over the lair, visible from across the planet
    e.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 60, 10, 1, true), fxMaterial(color, 0.9));
    e.beacon.material.opacity = 0.55; e.beacon.renderOrder = 2;
    e.beacon.position.copy(e.home).multiplyScalar(groundHeight(e.home) + 30); frameQuat(e.home, tangentFrame(e.home)[0], e.beacon.quaternion);
    scene.add(e.beacon);
  },
  reset(e) {
    e.bossPhase = 0; e.attack = e.lastAttack = null; e.introduced = false; e.beacon.visible = true;
    for (const w of e.waves) hideDots(w.slot); e.waves.length = 0;
  },
  think(e, dt, dist) {
    const d = e.def, A = d.attacks;
    if (!e.introduced) { e.introduced = true; roar(e); e.cool = 1.2; }
    updatePhase(e);
    const ph = d.phases[e.bossPhase];
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate * ph.speedMul, dt));
        if (e.cool <= 0) { start(e, pickAttack(e, dist)); return 0; }
        e.move.copy(e.toP);
        return dist > A.slam.range * 0.75 ? d.speed * ph.speedMul : 0;
      case 'windup': return windup(e, dt, dist);
      case 'charge': return charging(e, dt, dist);
      case 'recover':
        turnToward(e.fwd, e.toP, e.up, damp(2, dt));
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  update(e, dt, n) {
    if (e.state === 'idle' && e.hp >= e.def.hp) { e.bossPhase = 0; e.introduced = false; }   // fully recovered at home: the fight starts over
    if (!ENGAGED.has(e.state) && e.waves.length) { for (const w of e.waves) hideDots(w.slot); e.waves.length = 0; }
    updateWaves(e, dt);
    if (e.state === 'charge' && n && hitsStatic(_probe.copy(e.pos).addScaledVector(e.chargeDir, e.radius + 0.3).addScaledVector(e.up, 0.8), e.radius * 0.6)) endCharge(e, true);
  },
  animate(e, dt) {
    const d = e.def, s = Math.abs(e.speed), sw = Math.sin(e.phase) * Math.min(1, s / 2) * 0.6;
    e.legL.rotation.x = sw; e.legR.rotation.x = -sw;
    let aL = -sw * 0.5, aR = sw * 0.5, lean = e.state === 'chase' ? 0.1 : 0;
    if (e.state === 'windup') {
      const t = Math.min(1, (1 - e.timer / d.attacks[e.attack].windup) * 1.4);
      if (e.attack === 'slam' || e.attack === 'shockwave') { aL = aR = -2.8 * t; lean = -0.2; }
      else if (e.attack === 'charge') { aL = aR = 0.6; lean = 0.45; }
      else if (e.attack === 'volley') { aR = -1.6; lean = -0.1; }
      else { aL = aR = -2.2 * t; }                                        // summon: arms raised to the sky
    } else if (e.state === 'charge') { aL = aR = 0.9; lean = 0.5; }
    e.armL.rotation.x += (aL - e.armL.rotation.x) * damp(10, dt); e.armR.rotation.x += (aR - e.armR.rotation.x) * damp(10, dt);
    e.body.rotation.x += (lean - e.body.rotation.x) * damp(8, dt);
    e.body.rotation.z = e.stunnedT > 0 ? Math.sin(ctx.time * 6) * 0.15 : 0;
    e.body.scale.setScalar(1 + e.hitPop * 0.06);
    const charging = e.state === 'windup' && e.attack === 'volley' ? (1 - e.timer / d.attacks.volley.windup) * 1.5 : 0;
    e.core.scale.setScalar(1 + charging + (e.bossPhase >= d.phases.length - 1 ? Math.sin(ctx.time * 8) * 0.25 : 0));
  },
  onDie(e) {
    const color = e.def.capColor ?? e.def.color;
    for (const w of e.waves) hideDots(w.slot); e.waves.length = 0;
    e.beacon.visible = false;
    [color, 0xfff0a0, 0xffd6f5, 0xbff4ff].forEach((c, i) => sparkles.emit(e.center(), { count: 40, color: c, speed: 3 + i, up: e.up, upBias: 0.8, life: 1.4, size: 0.5 }));
    ringFX(e.pos, 6, color, 0.8); shakeCamera(0.6); audio.roar();
    encounterEvents.dispatchEvent(new CustomEvent('bossdefeated', { detail: { boss: e } }));
  },
  dispose(e) { scene.remove(e.beacon); e.beacon.geometry.dispose(); e.beacon.material.dispose(); },
};

function roar(e, angrier = false) {
  emote(e, '!', '#ff4d6d'); audio.roar(); shakeCamera(0.4);
  sparkles.emit(e.center(), { count: 30, color: e.def.capColor ?? e.def.color, speed: 3, up: e.up, upBias: 0.6, life: 1, size: 0.45 });
  if (angrier) { toast(`${e.def.name} grows furious!`); e.cool = Math.max(e.cool, 1); }
}

/** The active phase is the last whose `below` threshold is at or above the current health fraction; it never goes back mid-fight. */
function updatePhase(e) {
  const frac = e.hp / e.def.hp; let p = 0;
  e.def.phases.forEach((ph, i) => { if (frac <= ph.below) p = i; });
  if (p > e.bossPhase) { e.bossPhase = p; roar(e, true); }
}

function minionCount(e) { return ctx.enemies.filter(m => m.owner === e && m.alive).length; }

function pickAttack(e, dist) {
  const A = e.def.attacks;
  let options = e.def.phases[e.bossPhase].attacks.filter(a =>
    (a !== 'slam' || dist <= A.slam.range) && (a !== 'charge' || dist >= A.charge.minRange) && (a !== 'summon' || minionCount(e) < A.summon.max));
  if (options.length > 1) options = options.filter(a => a !== e.lastAttack);       // never the same move twice in a row
  return options.length ? mpick(options) : 'volley';
}

function start(e, name) {
  e.attack = e.lastAttack = name; e.state = 'windup'; e.timer = e.def.attacks[name].windup;
  if (name === 'charge') { e.chargeDir.copy(e.fwd); e.laneFrom.copy(e.up); }
  if (name === 'volley' || name === 'summon') audio.charge(); else audio.growl();
}

function windup(e, dt, dist) {
  const a = e.def.attacks[e.attack], k = 1 - e.timer / a.windup;
  if (e.attack === 'slam') { turnToward(e.fwd, e.toP, e.up, damp(2, dt)); showDisc(e, slamCenter(e), a.radius, k); }
  else if (e.attack === 'charge') {
    if (k < 0.55) { turnToward(e.fwd, e.toP, e.up, damp(8, dt)); e.chargeDir.copy(e.fwd); e.laneFrom.copy(e.up); }   // aims, then commits
    layLane(e.lane, e.laneFrom, e.chargeDir, a.distance, a.width, 0.2 + 0.5 * k);
  } else if (e.attack === 'volley') turnToward(e.fwd, e.toP, e.up, damp(6, dt));
  else if (e.attack === 'shockwave') showDisc(e, e.pos, e.radius + 2.5 * k, k);
  else if (Math.random() < dt * 14) sparkles.emit(_tv.copy(e.pos).addScaledVector(e.up, 0.3), { count: 2, color: e.def.capColor ?? e.def.color, speed: 1, up: e.up, upBias: 2.5, life: 0.9, size: 0.34 });
  if (e.timer <= 0) execute(e, dist);
  return 0;
}

function slamCenter(e) { return _tv.copy(e.pos).addScaledVector(e.fwd, e.def.attacks.slam.reach); }

function execute(e, dist) {
  const d = e.def, a = d.attacks[e.attack], P = ctx.player, color = d.capColor ?? d.color;
  e.hideTele();
  if (e.attack === 'charge') { e.state = 'charge'; e.timer = a.distance / a.speed; e.hitPlayer = false; audio.whoosh(); return; }
  if (e.attack === 'slam') {
    const c = slamCenter(e).clone();
    ringFX(c, a.radius, 0xffb08a, 0.55); ringFX(c, a.radius * 0.6, 0xffffff, 0.4);
    sparkles.emit(groundPoint(c, 0.3), { count: 40, color: 0xe8d6c0, speed: 4, up: e.up, upBias: 0.5, life: 0.8, size: 0.5 });
    shakeCamera(dist < 16 ? 0.45 : 0.2); audio.slam();
    if (!P.dead && P.pos.distanceTo(c) < a.radius + P.radius && P.r - groundHeight(P.up) < 0.9) hurtPlayer(a.damage, c, a.knockback);
  } else if (e.attack === 'volley') {
    const spread = THREE.MathUtils.degToRad(a.spread);
    for (let i = 0; i < a.count; i++) {
      const dir = e.toP.clone().applyAxisAngle(e.up, a.count > 1 ? (i / (a.count - 1) - 0.5) * spread : 0);
      ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir, alt: 1.2, speed: a.speed, range: 26, radius: 0.4, size: 0.3, color,
        homing: a.homing, homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
        onHit: (p, h) => { if (h === ctx.player) hurtPlayer(a.damage, p.pos, 2.5); sparkles.emit(p.pos, { count: 14, color, speed: 2.4, life: 0.5, size: 0.32 }); } }));
    }
    audio.wispShot();
  } else if (e.attack === 'shockwave') {
    const slot = e.waveSlots.find(s => !e.waves.some(w => w.slot === s));
    if (slot) e.waves.push({ slot, center: e.up.clone(), r: e.radius, hit: false });
    ringFX(e.pos, 3, color, 0.4); shakeCamera(0.3); audio.slam(); audio.nova();
  } else {                                                                // summon
    const want = Math.min(a.types.length, a.max - minionCount(e));
    for (let i = 0; i < want; i++) {
      const m = e.spawnMinion(a.types[i], dirAlong(e.up, _tv.copy(e.fwd).applyAxisAngle(e.up, i * 2.1 + 0.7), 3.2));
      sparkles.emit(m.center(), { count: 24, color, speed: 2.5, up: m.up, upBias: 0.8, life: 0.8, size: 0.36 });
    }
    audio.sparkle();
  }
  recover(e, a.recover, a.cooldown);
}

function recover(e, secs, cooldown) {
  e.state = 'recover'; e.timer = secs; e.cool = secs + cooldown * e.def.phases[e.bossPhase].cooldownMul;
}

function charging(e, dt, dist) {
  const a = e.def.attacks.charge, P = ctx.player;
  projectTangent(e.chargeDir, e.up).normalize(); e.fwd.copy(e.chargeDir); e.move.copy(e.chargeDir);
  if (!e.hitPlayer && !P.dead && dist < e.radius + P.radius + a.width * 0.5) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback); shakeCamera(0.3); }
  if (Math.random() < dt * 30) sparkles.emit(groundPoint(e.pos, 0.2), { count: 1, color: 0xe8d6c0, speed: 1.6, up: e.up, upBias: 0.6, life: 0.5, size: 0.4 });
  if (e.timer <= 0) endCharge(e, false);
  return a.speed;
}

function endCharge(e, crashed) {
  const a = e.def.attacks.charge;
  if (!crashed) { recover(e, a.recover, a.cooldown); return; }
  recover(e, a.crashStun, a.cooldown); e.stunT = e.stunnedT = a.crashStun; e.speed = 0;      // dazed: a window to punish it
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
