/* The ranger's moves (CHARACTERS.ranger.abilities): Arrow Shot, Arrow Fan, Thorn Arrow, Evasive Leap.
   Her ultimate, Arrow Rain, lives with the others in ./ultimates.js.
   Arrows are ordinary player Projectiles drawn with the 'arrow' shape. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { sparkles } from '../../fx/sparkles.js';
import { Projectile } from '../../entities/Projectile.js';
import { audio } from '../../systems/AudioSystem.js';
import { dirAlong } from '../../utils/sphere.js';
import { damageEnemy } from '../damage.js';
import { targeting } from '../targeting.js';

const _tv = new THREE.Vector3(), _d = new THREE.Vector3();

/** One arrow along dir; s supplies speed / range / radius / damage and the optional knockback, slow and stagger. */
function loose(s, dir, target = null) {
  const P = ctx.player;
  ctx.projectiles.push(new Projectile({ team: 'player', shape: 'arrow', up: dirAlong(P.up, dir, 0.6), dir, alt: 1.3, speed: s.speed, range: s.range,
    radius: s.radius, size: 0.12, color: s.color, homing: s.homing || 0, homeTo: target ? () => (target.alive ? target.center() : null) : null,
    onHit: (p, e) => { if (e) damageEnemy(e, s.damage, { from: p.pos, knock: s.knockback, slow: s.slow, slowTime: s.slowTime, stagger: s.stagger });
      sparkles.emit(p.pos, { count: 10, color: s.color, speed: 2.2, life: 0.4, size: 0.28 }); } }));
}

export const RANGER_ABILITIES = {
  shot(s, dir) { loose(s, dir, targeting.aim); audio.bowShot(); },
  volley(s, dir) {
    const spread = THREE.MathUtils.degToRad(s.spread);
    for (let i = 0; i < s.count; i++) loose(s, _d.copy(dir).applyAxisAngle(ctx.player.up, (i / (s.count - 1) - 0.5) * spread));
    audio.bowShot(); audio.swipe(); },
  snare(s, dir) { loose(s, dir, targeting.aim); audio.bowShot(); audio.castBolt(); },
  leap(s, dir) { const P = ctx.player;
    P.knock.addScaledVector(dir, -s.distance * 6);             // the knockback channel (decays at 6/s => ~distance travelled), away from the aim
    P.vy = s.jump; P.grounded = false; P.invuln = Math.max(P.invuln, s.invuln); P.castT = 0;   // no bow-draw pose mid-leap
    sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 0.4), { count: 20, color: s.color, speed: 2, up: P.up, upBias: 0.4, life: 0.5, size: 0.3 });
    audio.whoosh(); audio.jump(); },
};
