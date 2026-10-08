/* The witch's spells (COMBAT.spells): Arcane Bolt, Fireball, Frost Nova, Blink. Each is (spellDef, aimDir) => void.
   Her ultimate, Meteor, lives with the others in ./ultimates.js. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { ringFX } from '../../fx/combatFx.js';
import { sparkles } from '../../fx/sparkles.js';
import { Projectile, touchesEnemy } from '../../entities/Projectile.js';
import { resolveCollisions } from '../../physics/colliders.js';
import { audio } from '../../systems/AudioSystem.js';
import { shakeCamera } from '../../systems/CameraSystem.js';
import { clamp } from '../../utils/math.js';
import { dirAlong, projectTangent } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';
import { AREA_MAX_ALT } from '../area.js';
import { damageEnemy } from '../damage.js';
import { targeting } from '../targeting.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3(), _p = new V3();

export const WITCH_ABILITIES = {
  bolt(s, dir) { const target = targeting.aim;
    ctx.projectiles.push(new Projectile({ team: 'player', up: dirAlong(ctx.player.up, dir, 0.6), dir, alt: 1.3, speed: s.speed, range: s.range, radius: s.radius,
      size: 0.16, color: s.color, homing: s.homing, homeTo: () => (target && target.alive ? target.center() : null),
      onHit: (p, e) => { if (e) damageEnemy(e, s.damage, { from: p.pos }); sparkles.emit(p.pos, { count: 12, color: s.color, speed: 2.4, life: 0.4, size: 0.3 }); } }));
    audio.castBolt(); },
  fireball(s, dir) {
    ctx.projectiles.push(new Projectile({ team: 'player', up: dirAlong(ctx.player.up, dir, 0.6), dir, alt: 1.3, speed: s.speed, range: s.range, radius: s.radius,
      size: 0.3, color: s.color, onHit: p => explode(p.pos, s) }));
    audio.castFire(); },
  nova(s) { const c = ctx.player.pos.clone();
    ringFX(c, s.radius, s.color, 0.5); ringFX(c, s.radius * 0.6, 0xffffff, 0.35);
    for (let i = 0; i < 24; i++) { _tv.copy(ctx.player.fwd).applyAxisAngle(ctx.player.up, i / 24 * Math.PI * 2); projectTangent(_tv, ctx.player.up).normalize();
      sparkles.emit(_tv2.copy(c).addScaledVector(ctx.player.up, 0.5).addScaledVector(_tv, 0.8), { count: 2, color: s.color, speed: 0.4, up: _tv, upBias: s.radius * 2, life: 0.55, size: 0.36 }); }
    for (const e of ctx.enemies) if (e.alive && e.hover <= AREA_MAX_ALT && e.pos.distanceTo(c) < s.radius + e.def.radius) damageEnemy(e, s.damage, { from: c, knock: s.knockback, slow: s.slow, slowTime: s.slowTime });
    shakeCamera(0.18); audio.nova(); },
  blink(s, dir) { const from = ctx.player.pos.clone(), n = 12;
    for (let i = 0; i < n; i++) {        // small collision-resolved steps so you can't blink through walls or into ponds
      _p.copy(ctx.player.pos).addScaledVector(dir, s.distance / n); resolveCollisions(_p, ctx.player.radius, ctx.player.selfCollider);
      ctx.player.up.copy(_p).normalize(); projectTangent(dir, ctx.player.up).normalize(); ctx.player.pos.copy(ctx.player.up).multiplyScalar(ctx.player.r); }
    projectTangent(ctx.player.fwd, ctx.player.up).normalize(); projectTangent(ctx.player.vel, ctx.player.up);
    ctx.player.r = Math.max(ctx.player.r, groundHeight(ctx.player.up)); ctx.player.pos.copy(ctx.player.up).multiplyScalar(ctx.player.r);
    ctx.player.invuln = Math.max(ctx.player.invuln, s.invuln);
    for (const p of [from, ctx.player.pos]) sparkles.emit(_tv.copy(p).addScaledVector(ctx.player.up, 1), { count: 26, color: s.color, speed: 2.6, up: ctx.player.up, upBias: 0.4, life: 0.6, size: 0.34 });
    audio.blink(); },
};

function explode(pos, s) {
  const up = pos.clone().normalize();
  ringFX(pos, s.blastRadius, s.color, 0.45);
  sparkles.emit(pos, { count: 40, color: s.color, speed: 4.2, up, upBias: 0.5, life: 0.8, size: 0.42 });
  sparkles.emit(pos, { count: 16, color: 0xfff0a0, speed: 2.2, up, upBias: 0.8, life: 0.6, size: 0.36 });
  for (const e of ctx.enemies) { if (!e.alive) continue; const d = e.center().distanceTo(pos);
    if (touchesEnemy(e, pos, s.blastRadius)) damageEnemy(e, s.damage * (1 - s.blastFalloff * clamp(d / s.blastRadius, 0, 1)), { from: pos, knock: s.knockback }); }
  shakeCamera(0.32); audio.explode();
}
