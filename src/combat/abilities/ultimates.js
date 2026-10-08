/* ULTIMATES (key 5/G): one big area ability per hero, aimed on the ground first (src/combat/aiming.js).
   They share the ability-table format (cost, cooldown, damage, range, radius, duration, stun / slow...) plus
   target: 'ground' and an object entry in CAST: { execute(s, dir, target) } where target is the chosen surface
   direction and dir the heading toward it. The damage itself rides on the shared hazards (src/combat/hazards.js):
     meteor   (witch)  a Blast with a falling meteor: huge hit with falloff, then a short burning patch
     leapSlam (knight) a scripted jump (Player.motion) whose landing is a Blast that stuns
     rain     (ranger) a Zone of falling arrows that hurts and slows in ticks for its duration */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { ringFX } from '../../fx/combatFx.js';
import { sparkles } from '../../fx/sparkles.js';
import { resolveCollisions } from '../../physics/colliders.js';
import { audio } from '../../systems/AudioSystem.js';
import { slerpDir, projectTangent, tangentToward, turnToward } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';
import { addHazard, Blast, Zone } from '../hazards.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _to = new V3();

/** A scripted leap for Player.motion: an arc from where the hero stands to `to` over `dur` seconds, landing exactly there. */
function leapMotion(from, to, dur, height) {
  let t = 0;
  return (P, dt) => {
    t = Math.min(dur, t + dt); const k = t / dur;
    slerpDir(from, to, k, P.up); P.up.normalize();
    const g = groundHeight(P.up);
    P.r = g + height * 4 * k * (1 - k); P.pos.copy(P.up).multiplyScalar(P.r);
    projectTangent(P.fwd, P.up).normalize();
    if (k < 0.98) { _to.copy(tangentToward(P.up, to)); turnToward(P.fwd, _to, P.up, 0.3); }
    P.vy = 0; P.grounded = false; P.knock.set(0, 0, 0); P.vel.set(0, 0, 0); P.leapK = k;
    if (k < 1) return true;
    resolveCollisions(P.pos, P.radius, P.selfCollider);                // never land inside a monster
    P.up.copy(P.pos).normalize(); P.r = groundHeight(P.up); P.pos.copy(P.up).multiplyScalar(P.r);
    P.grounded = true; P.squash = -0.32; P.leapK = 0;
    return false;
  };
}

export const ULTIMATES = {
  meteor: {
    execute(s, dir, target) {
      const P = ctx.player; P.castT = 0.6; P.castFaceT = 0.8;
      sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 2.2), { count: 26, color: s.color, speed: 2.4, up: P.up, upBias: 2.5, life: 0.8, size: 0.4 });
      audio.meteorCall();
      addHazard(new Blast({ owner: 'player', team: 'player', center: target, radius: s.radius, delay: s.delay, damage: s.damage, color: s.color,
        knock: s.knockback, falloff: s.falloff, fall: 'meteor', size: 1.3, shake: 0.8, stop: 0.09, sound: 'meteorImpact',
        onImpact: b => {
          ringFX(b.point, s.radius * 1.35, 0xffe0a0, 0.8);
          if (s.burn) addHazard(new Zone({ owner: 'player', team: 'player', center: b.center, radius: s.radius * 0.7, color: s.color, rain: 'embers', ...s.burn }));
        } }));
    },
  },

  leapSlam: {
    execute(s, dir, target) {
      const P = ctx.player;
      P.motion = leapMotion(P.up.clone(), target, s.leapTime, s.leapHeight);
      P.invuln = Math.max(P.invuln, s.leapTime + 0.15); P.castT = 0; P.castFaceT = 0;
      sparkles.emit(P.pos, { count: 24, color: 0xe8d6c0, speed: 2.4, up: P.up, upBias: 0.6, life: 0.6, size: 0.4 });
      audio.jump(); audio.whoosh();
      addHazard(new Blast({ owner: 'player', team: 'player', center: target, radius: s.radius, delay: s.leapTime, damage: s.damage, color: s.color,
        knock: s.knockback, stun: s.stun, shake: 0.85, stop: 0.1, sound: 'leapSlam',
        onImpact: b => {
          ringFX(b.point, s.radius * 1.25, 0xfff0d0, 0.7);
          sparkles.emit(b.point, { count: 40, color: 0xd8c0a0, speed: 4.5, up: b.center, upBias: 0.4, life: 0.9, size: 0.55 });
          P.swingT = 0.2;                                                   // the axe bites into the ground
        } }));
    },
  },

  rain: {
    execute(s, dir, target) {
      const P = ctx.player; P.castT = 0.4;
      sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 1.6), { count: 20, color: s.color, speed: 1.6, up: P.up, upBias: 3, life: 0.7, size: 0.32 });
      audio.bowShot(); audio.arrowRain();
      addHazard(new Zone({ owner: 'player', team: 'player', center: target, radius: s.radius, duration: s.duration, tick: s.tick, firstTick: s.firstTick,
        damage: s.damage, color: s.color, slow: s.slow, slowTime: s.slowTime, rain: 'arrows' }));
    },
  },
};
