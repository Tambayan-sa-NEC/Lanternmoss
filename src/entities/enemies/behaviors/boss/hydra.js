/* MINI BOSS: the Hydra (COMBAT.enemies.hydra), lurking by a lake. A slow, heavy body with three heads to start and a
   new one grown at each health threshold (phases[].heads).
     bite   one head rears back over a wedge in front, then snaps
     spit   every head spits an acid glob that curves after you (one more glob per head grown)
     sweep  (four heads and up) all the heads rear and sweep a wide arc in front: get behind it
   Fallback: spit. It keeps to its lake (a short leash). */
import * as THREE from 'three';
import { ctx } from '../../../../core/context.js';
import { hurtPlayer } from '../../../../combat/damage.js';
import { arcFX } from '../../../../fx/combatFx.js';
import { sparkles } from '../../../../fx/sparkles.js';
import { audio } from '../../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../../systems/CameraSystem.js';
import { damp } from '../../../../utils/math.js';
import { mpick, rng } from '../../../../utils/random.js';
import { turnToward } from '../../../../utils/sphere.js';
import { Projectile } from '../../../Projectile.js';
import { bossDecal, defineBoss, facing, glowOf, inWedge, phaseOf, roar } from './core.js';

const WARN = 0xff4d6d, ACID = 0xb8ff6a;
const A = (e, id) => e.def.attacks[id];
const rad = THREE.MathUtils.degToRad;
const _tv = new THREE.Vector3(), _aim = new THREE.Vector3();
const heads = e => phaseOf(e).heads ?? 3;

const moves = {
  bite: {
    ready: (e, dist) => dist <= A(e, 'bite').range + 0.4 && facing(e) > 0.3,
    weight: () => 3,
    begin(e) { e.biter = Math.floor(rng() * heads(e)); audio.growl(); },
    windup(e, dt, k) { if (k < 0.6) turnToward(e.fwd, e.toP, e.up, damp(4, dt)); e.biteMark.place(e.up, e.fwd, A(e, 'bite').range).opacity = 0.2 + 0.5 * k; },
    fire(e) {
      const a = A(e, 'bite'), P = ctx.player; e.snapT = 0.3;
      arcFX(e.pos, e.up, e.fwd, a.range, a.arc, 0xd8ffa0); audio.bite();
      if (!P.dead && inWedge(e, e.fwd, P.pos, a.range + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, a.knockback);
    },
  },
  spit: {
    ready: (e, dist) => dist >= A(e, 'spit').minRange,
    weight: (e, dist) => (dist > 8 ? 3 : 1),
    begin() { audio.charge(); },
    windup(e, dt) { turnToward(e.fwd, e.toP, e.up, damp(4, dt)); },
    fire(e) {
      const a = A(e, 'spit'), n = a.count + heads(e) - 3, spread = rad(a.spread);
      for (let i = 0; i < n; i++) {
        const dir = e.toP.clone().applyAxisAngle(e.up, n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        ctx.projectiles.push(new Projectile({ team: 'enemy', up: e.up, dir, alt: 2.6, speed: a.speed, range: 24, radius: 0.45, size: 0.34, color: ACID,
          homing: a.homing, homeTo: () => (ctx.player.dead ? null : _aim.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
          onHit: (p, h) => { if (h === ctx.player) hurtPlayer(a.damage, p.pos, 2); sparkles.emit(p.pos, { count: 16, color: ACID, speed: 2.4, life: 0.6, size: 0.32 }); } }));
      }
      e.snapT = 0.25; audio.wispShot();
    },
  },
  sweep: {
    ready: (e, dist) => dist <= A(e, 'sweep').radius,
    weight: e => (facing(e) > 0.2 ? 2 : 0.5),
    begin(e) { audio.growl(); e.sweepSide = rng() < 0.5 ? 1 : -1; },
    windup(e, dt, k) { e.sweepMark.place(e.up, e.fwd, A(e, 'sweep').radius).opacity = 0.15 + 0.45 * k; },
    fire(e) {
      const a = A(e, 'sweep'), P = ctx.player; e.sweepT = 0.5;
      arcFX(e.pos, e.up, e.fwd, a.radius, a.arc, 0xd8ffa0); audio.tailSweep(); shakeCamera(0.3);
      if (!P.dead && inWedge(e, e.fwd, P.pos, a.radius + P.radius, a.arc)) hurtPlayer(a.damage, e.pos, a.knockback);
    },
  },
};

export const hydra = defineBoss({
  moves,
  fallback: () => 'spit',
  init(e) {
    const a = e.def.attacks;
    e.biteMark = bossDecal(e, 'sector', WARN, { arc: rad(a.bite.arc) });
    e.sweepMark = bossDecal(e, 'sector', WARN, { arc: rad(a.sweep.arc), k: 0.9 });
    e.snapT = 0; e.sweepT = 0; e.biter = 0;
  },
  reset(e) { e.necks.forEach((n, i) => { n.pivot.visible = i < 3; }); },
  /** A new head grows at each threshold (and it heals a little doing it). */
  onPhase(e, from, to) {
    const n = e.necks[Math.min(e.necks.length - 1, heads(e) - 1)]; n.pivot.visible = true;
    n.head.getWorldPosition(_tv); sparkles.emit(_tv, { count: 40, color: glowOf(e), speed: 3, up: e.up, upBias: 0.8, life: 1, size: 0.45 });
    e.hp = Math.min(e.def.hp, e.hp + e.def.hp * 0.04);
    roar(e, true, `The Hydra grows another head! (${heads(e)})`);
    return true;
  },
  approach(e, dt, dist, ph) {
    turnToward(e.fwd, e.toP, e.up, damp(e.def.turnRate * ph.speedMul, dt));
    e.move.copy(e.toP);
    return dist > A(e, 'bite').range * 0.8 ? e.def.speed * ph.speedMul : 0;
  },
  animate(e, dt) {
    const t = ctx.time, windK = e.state === 'windup' ? 1 - e.timer / e.windupTime : 0;
    e.snapT = Math.max(0, e.snapT - dt); e.sweepT = Math.max(0, e.sweepT - dt);
    e.necks.forEach((n, i) => {
      if (!n.pivot.visible) return;
      let rx = n.base.x + Math.sin(t * 1.3 + i * 1.7) * 0.1, rz = n.base.z + Math.sin(t * 0.9 + i) * 0.08, jaw = 0.1;
      const mine = e.attack === 'bite' && i === e.biter;
      if (e.state === 'windup' && (mine || e.attack !== 'bite')) { rx -= 0.55 * windK; jaw = 0.5 * windK; }
      if (mine && e.snapT > 0) { rx += 0.9 * (e.snapT / 0.3); jaw = 0.6; }
      if (e.attack === 'spit' && e.snapT > 0) jaw = 0.7;
      if (e.attack === 'sweep' && e.sweepT > 0) rz += e.sweepSide * Math.sin((1 - e.sweepT / 0.5) * Math.PI) * 0.9;
      n.pivot.rotation.x += (rx - n.pivot.rotation.x) * damp(10, dt); n.pivot.rotation.z += (rz - n.pivot.rotation.z) * damp(10, dt);
      n.jaw.rotation.x += (jaw - n.jaw.rotation.x) * damp(14, dt);
    });
    e.body.scale.setScalar(1 + e.hitPop * 0.05);
    e.tail.rotation.y = Math.sin(t * 1.1) * 0.3;
    if (rng() < dt * 2) sparkles.emit(_tv.copy(e.pos).addScaledVector(e.up, 0.2), { count: 1, color: mpick([0x9ff3ff, 0xd8ffa0]), speed: 0.6, up: e.up, upBias: 1, life: 0.8, size: 0.3 });
  },
});
