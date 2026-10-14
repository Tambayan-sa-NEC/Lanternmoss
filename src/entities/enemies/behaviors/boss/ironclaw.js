/* MINI BOSS: Old Ironclaw (COMBAT.enemies.ironclaw), a giant hermit crab living in a sunken bronze bell on Tidewhisper's
   far beach, where it guards the black pearl beds. Its signature is the bell:
     the bell     covers its back, sides and top. A hero's blow there does nothing but ring it: after a short glow a
                  stunning shockwave rolls out (jump over it). Pet strikes only clang. Its face (the front cone,
                  def.faceArc) can be hurt, but only a little while it stays tucked in its shell (def.guarded).
     open         it is soft and takes bonus damage from anywhere (def.openBonus), and the bell can't ring:
                    - shell swap: at 66% and 33% it crawls out of its shell and scuttles about, then climbs back into a
                      new one (phase change, def.swap seconds);
                    - wedged: a charge across wet tidal sand (dry now, under water at high tide: the flats at low
                      tide) ploughs it into the sand for def.wedge seconds.
   Moves: pinch (a claw snap over a marked wedge in front), charge (a marked lane; the wedge chance), toll (from the
   second shell: it rears and slams the bell down, a shockwave to jump). Fallback: pinch up close, else charge. */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { arcFX, ringFX, groundPoint } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { damp } from '../../../../utils/math.js';
import { rng } from '../../../../utils/random.js';
import { arcDist, projectTangent, tangentTo, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { groundHeight, waterAt } from '../../../../world/terrain.js';
import { seaLevel } from '../../../../world/physics.js';
import { hideDots, layLane, layRing, makeDots, showDisc } from '../telegraphs.js';
import { bossDecal, defineBoss, facing, finish, inWedge, keepInArena } from './core.js';

const WARN = 0xff4d6d, BRONZE = 0xffc86a, SAND = 0xd8c08a;
const SHELLS = [0xc8913a, 0x6fae8e, 0x5a5f7a];                       // bronze, verdigris, a dark old bell: one per shell
const A = (e, id) => e.def.attacks[id];
const _to = new THREE.Vector3(), _c = new THREE.Vector3();
let wedgeHint = false, bellHint = false;

/** Ironclaw is soft right now (out of its shell, or stuck in the sand). */
export const isOpen = e => e.state === 'transition' || e.openT > 0;

/** Where a hit coming from world point `from` lands: 'face' (the front cone), 'bell' (back, sides, top) or 'none'
    (no direction: burning ground). Pure geometry, exported for the tests. */
export function hitZone(e, from) {
  if (!from) return 'none';
  const d = tangentTo(e.pos, e.up, from, _to);
  if (d < e.radius * 0.8) return 'bell';
  return e.fwd.dot(_to) > Math.cos(THREE.MathUtils.degToRad(e.def.faceArc)) ? 'face' : 'bell';
}

/** Wet tidal sand: dry right now but under water at high tide (the flats at low tide). */
export function wedgeable(dir) {
  const high = seaLevel(true); return high !== null && !waterAt(dir) && groundHeight(dir) < high;
}

/** An expanding ring along the ground from the bell: hurts and stuns a grounded hero it passes through. */
function launchWave(e, spec) {
  const slot = e.waveSlots.find(s => !e.waves.some(w => w.slot === s)); if (!slot) return;
  e.waves.push({ slot, center: e.up.clone(), r: e.radius, hit: false, spec });
  ringFX(e.pos, 3, BRONZE, 0.4); audio.clang(); audio.slam(); shakeCamera(0.3);
}
function updateWaves(e, dt) {
  const P = ctx.player;
  for (let i = e.waves.length - 1; i >= 0; i--) {
    const w = e.waves[i], s = w.spec; w.r += s.speed * dt;
    if (w.r > s.maxRadius) { hideDots(w.slot); e.waves.splice(i, 1); continue; }
    layRing(w.slot, w.center, w.r, s.width * 0.5, 0.15 + 0.85 * (1 - w.r / s.maxRadius));
    if (!w.hit && !P.dead && Math.abs(arcDist(P.up, w.center) - w.r) < s.width * 0.5 + P.radius && P.r - groundHeight(P.up) < 0.6) {
      w.hit = true; const hp = P.hp; hurtPlayer(s.damage, _c.copy(w.center).multiplyScalar(groundHeight(w.center)), s.knockback ?? 0, { source: e });
      if (!P.dead && P.hp < hp) { P.petrifyT = Math.max(P.petrifyT ?? 0, s.stun); P.vel.set(0, 0, 0); emote(P, '★', '#ffd24a'); }   // dazed by the ringing
    }
  }
}

const moves = {
  pinch: {
    ready: (e, dist) => dist <= A(e, 'pinch').range + 0.4 && facing(e) > 0.2,
    weight: () => 3,
    begin() { audio.growl(); },
    windup(e, dt, k) { if (k < 0.6) turnToward(e.fwd, e.toP, e.up, damp(4, dt)); e.pinchMark.place(e.up, e.fwd, A(e, 'pinch').range).opacity = 0.2 + 0.5 * k; },
    fire(e) {
      const a = A(e, 'pinch'), P = ctx.player; e.snapT = 0.3;
      arcFX(e.pos, e.up, e.fwd, a.range, a.arc, 0xffb08a); audio.bite();
      if (!P.dead && inWedge(e, e.fwd, P.pos, a.range + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, a.knockback, { source: e });
    },
  },
  charge: {
    ready: (e, dist) => dist >= A(e, 'charge').minRange,
    weight: (e, dist) => (dist > 8 ? 2.5 : 1),
    begin(e) { e.laneFrom.copy(e.up); e.chargeDir.copy(e.fwd); audio.growl(); emote(e, '!', '#ff4d6d'); },
    windup(e, dt, k) {
      const a = A(e, 'charge');
      if (k < 0.6) { turnToward(e.fwd, e.toP, e.up, damp(8, dt)); e.chargeDir.copy(e.fwd); e.laneFrom.copy(e.up); }
      layLane(e.lane, e.laneFrom, e.chargeDir, a.distance, a.width, 0.2 + 0.5 * k);
    },
    fire(e) { const a = A(e, 'charge'); e.chargeT = a.distance / a.speed; e.hitPlayer = false; hideDots(e.lane); audio.whoosh(); return 'active'; },
    active(e, dt, dist) {
      const a = A(e, 'charge'), P = ctx.player;
      projectTangent(e.chargeDir, e.up).normalize(); e.fwd.copy(e.chargeDir); e.move.copy(e.chargeDir);
      if (!e.hitPlayer && !P.dead && dist < e.radius + P.radius + a.width * 0.5) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback, { source: e }); }
      if (rng() < dt * 25) sparkles.emit(groundPoint(e.pos, 0.2), { count: 1, color: SAND, speed: 1.2, up: e.up, upBias: 0.6, life: 0.4, size: 0.32 });
      const run = a.distance - (e.chargeT -= dt) * a.speed;                // metres covered so far
      if (run > 2 && wedgeable(e.up)) { wedge(e); return 0; }               // ploughed into the wet sand
      if (e.chargeT <= 0 || arcDist(e.up, e.home) > e.def.leash - 3) finish(e);
      return a.speed;
    },
    cancel(e) { hideDots(e.lane); },
  },
  toll: {
    begin(e) { audio.doomCharge(); emote(e, '!', '#ffd36b'); },
    windup(e, dt, k) { showDisc(e, e.pos, e.radius + 3 * k, k); e.rear = k; e.bellGlow.visible = k > 0.5; },
    fire(e) { e.rear = 0; e.bellGlow.visible = false; launchWave(e, A(e, 'toll')); },
    cancel(e) { e.rear = 0; },
  },
};

/** Driven into the wet sand by its own charge: stuck and soft for def.wedge seconds. */
function wedge(e) {
  finish(e, e.def.wedge); e.openT = e.def.wedge; e.stunnedT = 0;
  emote(e, '?', '#ffd24a'); audio.slam(); shakeCamera(0.35);
  sparkles.emit(groundPoint(e.pos, 0.3), { count: 40, color: SAND, speed: 3, up: e.up, upBias: 1, life: 0.9, size: 0.42 });
  if (!wedgeHint) { wedgeHint = true; toast('Old Ironclaw is stuck in the wet sand: strike now, from any side!'); }
}

/** The bell was struck: after a short glow it rings out a shockwave (once per def.bellRing.cooldown). */
function strikeBell(e, byHero) {
  const r = e.def.bellRing;
  e.bellFlash = 1; audio.clang();
  sparkles.emit(_c.copy(e.pos).addScaledVector(e.up, 1.8), { count: 10, color: BRONZE, speed: 2.4, up: e.up, upBias: 0.6, life: 0.4, size: 0.3 });
  if (!byHero || e.ringCd > 0) return;
  e.ringCd = r.cooldown; e.ringAt = r.delay; e.bellGlow.visible = true;
  if (!bellHint) { bellHint = true; toast('The bell only rings! Strike Old Ironclaw\'s face, or wait for it to leave its shell.'); }
}

export const ironclaw = defineBoss({
  moves,
  fallback: (e, dist) => (dist < 5 ? 'pinch' : 'charge'),
  init(e) {
    e.pinchMark = bossDecal(e, 'sector', WARN, { arc: THREE.MathUtils.degToRad(e.def.attacks.pinch.arc) });
    e.lane = makeDots(e, 14, WARN); e.laneFrom = new THREE.Vector3(); e.chargeDir = new THREE.Vector3();
    e.waveSlots = [makeDots(e, 40, BRONZE, 1.6), makeDots(e, 40, BRONZE, 1.6)]; e.waves = [];
    e.swapFrom = new THREE.Vector3();
  },
  reset(e) {
    for (const w of e.waves) hideDots(w.slot); e.waves.length = 0;
    Object.assign(e, { openT: 0, ringCd: 0, ringAt: 0, bellFlash: 0, rear: 0, snapT: 0, swapT: 0, out: 0 });
    e.bellGlow.visible = false; setShell(e, 0);
  },
  cancel(e) { for (const w of e.waves) hideDots(w.slot); e.waves.length = 0; e.ringAt = 0; e.bellGlow.visible = false; e.openT = 0; e.rear = 0; },
  refuses(e, o) {
    if (isOpen(e) || hitZone(e, o.from) !== 'bell') return false;
    strikeBell(e, o.source !== 'pet'); return true;
  },
  damageScale: e => (isOpen(e) ? 1 + e.def.openBonus : e.def.guarded),
  /** 66% and 33%: out of the shell, a scuttle about, then into a new one. */
  onPhase(e) {
    e.state = 'transition'; e.swapT = e.def.swap; e.hideTele(); e.ringAt = 0; e.bellGlow.visible = false;
    emote(e, '!', '#ffd24a'); audio.roar(); toast('Old Ironclaw crawls out of its shell: hit it while it\'s soft!');
    return true;
  },
  transition(e, dt) {
    e.swapT -= dt;
    if (e.swapT <= 0) {
      setShell(e, e.bossPhase); e.state = 'chase'; e.cool = Math.max(e.cool, 0.8);
      sparkles.emit(e.center(), { count: 30, color: SHELLS[e.bossPhase % SHELLS.length], speed: 2.5, up: e.up, upBias: 0.8, life: 0.9, size: 0.45 });
      audio.clang(); toast(e.bossPhase >= 2 ? 'Old Ironclaw squeezes into its last shell!' : 'Old Ironclaw climbs into a new shell.');
      return 0;
    }
    // scuttles about, keeping a little away from the hero
    _to.copy(e.toP).negate().applyAxisAngle(e.up, Math.sin(ctx.time * 1.5 + e.seed) * 0.9);
    turnToward(e.fwd, e.toP, e.up, damp(3, dt)); e.move.copy(tangentToward(e.up, keepInArena(e, _c.copy(e.pos).addScaledVector(_to, 3).normalize())));
    return e.def.speed * e.def.swapSpeed;
  },
  approach(e, dt, dist, ph) {
    turnToward(e.fwd, e.toP, e.up, damp(e.def.turnRate * ph.speedMul, dt));
    e.move.copy(e.toP);
    return dist > 3.4 ? e.def.speed * ph.speedMul : 0;
  },
  update(e, dt) {
    e.openT = Math.max(0, (e.openT ?? 0) - dt); e.ringCd = Math.max(0, (e.ringCd ?? 0) - dt);
    if (e.ringAt > 0 && (e.ringAt -= dt) <= 0) { e.ringAt = 0; e.bellGlow.visible = false; if (e.alive && !isOpen(e)) launchWave(e, e.def.bellRing); }
    updateWaves(e, dt);
  },
  animate(e, dt) {
    const t = ctx.time, s = Math.min(1, Math.abs(e.speed) / 3), sw = Math.sin(e.phase * 1.6) * 0.5 * s;
    e.legs.forEach((l, i) => { l.rotation.x = i % 2 ? sw : -sw; });
    e.snapT = Math.max(0, (e.snapT ?? 0) - dt); e.bellFlash = Math.max(0, (e.bellFlash ?? 0) - dt * 4);
    const pinching = e.state === 'windup' && e.attack === 'pinch';
    for (const c of [e.clawL, e.clawR]) { c.rotation.x = pinching ? -0.6 : e.snapT > 0 ? 0.35 : Math.sin(t * 2 + e.seed) * 0.05; c.userData.pincer.rotation.x = pinching ? -0.5 : 0; }
    // out of the shell: the crab slides forward and the bell rolls back; wedged: it tips nose-down into the sand
    const out = e.state === 'transition' ? 1 : 0, stuck = e.openT > 0 && e.state !== 'transition' ? 1 : 0;
    e.out += (out - e.out) * damp(4, dt);
    e.body.position.z = e.out * 1.3; e.body.position.y = -stuck * 0.35;
    e.bell.rotation.x = -e.out * 0.5 - (e.rear ?? 0) * 0.6 + stuck * 0.35 + Math.sin(t * 60) * 0.03 * e.bellFlash;
    e.bell.position.y = 1.25 - e.out * 0.55; e.bell.position.z = -0.45 - e.out * 0.6;
    e.body.rotation.x = stuck * 0.3 + (stuck ? Math.sin(t * 9) * 0.06 : 0);
    e.bellGlow.scale.setScalar(1 + Math.sin(t * 25) * 0.25);
    e.body.scale.setScalar(1 + e.hitPop * 0.05);
  },
  dispose(e) { for (const w of e.waves) hideDots(w.slot); },
});

/** Recolours the bell for shell `i` (every swap gives it a different old bell). */
function setShell(e, i) { for (const m of e.bellMats) m.color.setHex(SHELLS[i % SHELLS.length]); }
