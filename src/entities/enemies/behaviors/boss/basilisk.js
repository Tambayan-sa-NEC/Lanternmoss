/* MINI BOSS: the Basilisk (COMBAT.enemies.basilisk), roaming the far wilds. A quick serpent-lizard whose signature
   move asks you to do something unusual: look away.
     gaze   its crest rises and its eyes burn brighter and brighter (a ring pulses under you); when they flare, if you are
            FACING it you are turned to stone for a moment (and hurt). Turn your back (move away from it) to be safe.
     whip   close by, or when flanked: its tail spins through the marked circle (jump over it, or step out)
     lunge  from a little way off: it marks a lane and darts along it, jaws first
     spit   (enraged) a fan of venom
   Fallback: whip up close, else lunge. */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { playerInArea } from '../../../../combat/area.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { ringFX } from '../../../../fx/combatFx.js';
import { emote } from '../../../../fx/emotes.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { toast } from '../../../../ui/toast.js';
import { damp } from '../../../../utils/math.js';
import { arcDist, projectTangent, tangentToward, turnToward } from '../../../../utils/sphere.js';
import { Projectile } from '../../../Projectile.js';
import { hideDots, layLane, makeDots } from '../telegraphs.js';
import { bossDecal, defineBoss, facing, finish } from './core.js';
import { rng } from '../../../../utils/random.js';

const WARN = 0xff4d6d, VENOM = 0xb8ff6a, GAZE = 0xfff066;
const A = (e, id) => e.def.attacks[id];
const _tv = new THREE.Vector3(), _aim = new THREE.Vector3();
let gazeHint = false;

/** Turns the hero to stone for `secs` (they can't move or act; the HUD greys out: hud.js). */
export function petrify(secs) {
  const P = ctx.player; P.petrifyT = Math.max(P.petrifyT ?? 0, secs); P.vel.set(0, 0, 0);
  sparkles.emit(P.pos.clone().addScaledVector(P.up, 1), { count: 40, color: 0xb8b0a8, speed: 2.2, up: P.up, upBias: 0.6, life: 1, size: 0.4 });
}
/** Is the hero facing the basilisk (looking at it, within ~70 degrees)? */
function lookingAt(e) { const P = ctx.player; return P.fwd.dot(tangentToward(P.up, e.up)) > 0.35; }

const moves = {
  gaze: {
    ready: (e, dist) => dist <= A(e, 'gaze').range,
    weight: e => (e.bossPhase > 0 ? 3 : 2),
    begin(e) {
      audio.doomCharge(); emote(e, '!', '#fff066');
      if (!gazeHint) { gazeHint = true; toast('The Basilisk\'s eyes are blazing: turn your back on it before they flare!'); }
    },
    windup(e, dt, k) {
      turnToward(e.fwd, e.toP, e.up, damp(3, dt));
      const P = ctx.player; e.gazeRing.place(P.up, null, 1.2 + 0.6 * Math.sin(ctx.time * 10)).opacity = 0.3 + 0.6 * k;
      e.gazeK = k;
    },
    fire(e, dist) {
      const a = A(e, 'gaze'), P = ctx.player; e.gazeK = 0; e.flareT = 0.4;
      ringFX(e.pos, 6, GAZE, 0.5); audio.nova(); shakeCamera(0.25);
      if (P.dead || dist > a.range) return;
      if (lookingAt(e)) { petrify(a.petrify); hurtPlayer(a.damage, e.pos, 0); toast('Turned to stone! Look away from the Basilisk\'s gaze.'); }
      else { emote(P, '✓', '#7fd06a'); }
    },
    cancel(e) { e.gazeK = 0; },
  },
  whip: {
    ready: (e, dist) => dist <= A(e, 'whip').radius - 0.4,
    weight: e => (facing(e) < 0.3 ? 5 : 1),
    begin() { audio.growl(); },
    windup(e, dt, k) { const a = A(e, 'whip'); e.zoneMark.place(e.up, e.fwd, a.radius).opacity = 0.12 + 0.3 * k; e.zoneEdge.place(e.up, e.fwd, a.radius).opacity = 0.4 + 0.5 * k; },
    fire(e) { e.hitPlayer = false; audio.tailSweep(); return 'active'; },
    active(e, dt) {
      const a = A(e, 'whip');
      e.fwd.applyAxisAngle(e.up, dt * 16);
      if (!e.hitPlayer && playerInArea(e.up, a.radius, true)) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback); shakeCamera(0.3); }
      if (e.actT > 0.4) finish(e);
      return 0;
    },
  },
  lunge: {
    ready: (e, dist) => dist >= A(e, 'lunge').minRange,
    weight: (e, dist) => (dist > 8 ? 2.5 : 1),
    begin(e) { e.laneFrom.copy(e.up); e.lungeDir.copy(e.fwd); audio.growl(); },
    windup(e, dt, k) {
      const a = A(e, 'lunge');
      if (k < 0.6) { turnToward(e.fwd, e.toP, e.up, damp(8, dt)); e.lungeDir.copy(e.fwd); e.laneFrom.copy(e.up); }
      layLane(e.lane, e.laneFrom, e.lungeDir, a.distance, a.width, 0.2 + 0.5 * k);
    },
    fire(e) { const a = A(e, 'lunge'); e.lungeT = a.distance / a.speed; e.hitPlayer = false; hideDots(e.lane); audio.whoosh(); return 'active'; },
    active(e, dt, dist) {
      const a = A(e, 'lunge'), P = ctx.player;
      projectTangent(e.lungeDir, e.up).normalize(); e.fwd.copy(e.lungeDir); e.move.copy(e.lungeDir);
      if (!e.hitPlayer && !P.dead && dist < e.radius + P.radius + a.width * 0.5) { e.hitPlayer = true; hurtPlayer(a.damage, e.pos, a.knockback); }
      if ((e.lungeT -= dt) <= 0 || arcDist(e.up, e.home) > e.def.leash - 3) finish(e);
      return a.speed;
    },
    cancel(e) { hideDots(e.lane); },
  },
  spit: {
    begin() { audio.charge(); },
    windup(e, dt) { turnToward(e.fwd, e.toP, e.up, damp(6, dt)); },
    fire(e) {
      const a = A(e, 'spit'), spread = THREE.MathUtils.degToRad(a.spread);
      for (let i = 0; i < a.count; i++) {
        const dir = e.toP.clone().applyAxisAngle(e.up, (i / (a.count - 1) - 0.5) * spread);
        ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir, alt: 1.2, speed: a.speed, range: 22, radius: 0.4, size: 0.3, color: VENOM,
          homing: a.homing, homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
          onHit: (p, h) => { if (h === ctx.player) hurtPlayer(a.damage, p.pos, 2); sparkles.emit(p.pos, { count: 12, color: VENOM, speed: 2.2, life: 0.5, size: 0.3 }); } }));
      }
      audio.wispShot();
    },
  },
};

export const basilisk = defineBoss({
  moves,
  fallback: (e, dist) => (dist < 5 ? 'whip' : 'lunge'),
  init(e) {
    e.zoneMark = bossDecal(e, 'disc', WARN, { k: 0.9 }); e.zoneEdge = bossDecal(e, 'ring', WARN, { k: 1.8, lift: 0.14 });
    e.gazeRing = bossDecal(e, 'ring', GAZE, { k: 2, lift: 0.16 });
    e.lane = makeDots(e, 12, WARN); e.laneFrom = new THREE.Vector3(); e.lungeDir = new THREE.Vector3();
    e.gazeK = 0; e.flareT = 0;
  },
  approach(e, dt, dist, ph) {
    turnToward(e.fwd, e.toP, e.up, damp(e.def.turnRate * ph.speedMul, dt));
    e.move.copy(e.toP);
    return dist > 3.2 ? e.def.speed * ph.speedMul : 0;
  },
  animate(e, dt) {
    const t = ctx.time, s = Math.min(1, Math.abs(e.speed) / 4);
    e.flareT = Math.max(0, e.flareT - dt);
    e.segs.forEach((g, i) => { g.position.x = Math.sin(t * 6 * (0.4 + s) - i * 0.9) * (0.08 + 0.18 * s) * (i / 3); });
    const sw = Math.sin(e.phase) * 0.6 * s; e.legs.forEach((l, i) => { l.rotation.x = (i % 3 === 0 ? sw : -sw); });
    const glow = 1 + e.gazeK * 0.7 + e.flareT * 2; for (const eye of e.eyes) eye.scale.setScalar(glow);
    e.crest.rotation.x += ((e.state === 'windup' && e.attack === 'gaze' ? -0.6 : 0) - e.crest.rotation.x) * damp(8, dt);
    const open = e.state === 'windup' && (e.attack === 'lunge' || e.attack === 'spit') ? 0.5 : e.state === 'active' && e.attack === 'lunge' ? 0.6 : 0.05;
    e.jaw.rotation.x += (open - e.jaw.rotation.x) * damp(12, dt);
    e.body.scale.setScalar(1 + e.hitPop * 0.05);
    if (e.gazeK > 0.3 && rng() < dt * 20) { e.eyes[0].getWorldPosition(_tv); sparkles.emit(_tv, { count: 1, color: GAZE, speed: 0.8, life: 0.4, size: 0.3 }); }
  },
});
