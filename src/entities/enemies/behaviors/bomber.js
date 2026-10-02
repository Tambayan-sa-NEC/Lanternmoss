/* PUFFCAP (ai 'bomber'): rushes in, swells up on a short fuse, then bursts. Staggering it (owl strike, shield dash)
   defuses it; killing it first means no blast. A burst is a self-destruct, so it awards no XP. */
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { ringFX } from '../../../fx/combatFx.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../systems/CameraSystem.js';
import { damp } from '../../../utils/math.js';
import { turnToward } from '../../../utils/sphere.js';
import { groundHeight } from '../../../world/terrain.js';
import { showDisc } from './telegraphs.js';

export const bomber = {
  think(e, dt, dist) {
    const d = e.def;
    if (e.state === 'chase') {
      turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
      if (dist < d.triggerRange) { e.state = 'windup'; e.timer = d.fuse; emote(e, '!', '#ff4d6d'); audio.charge(); return 0; }
      e.move.copy(e.toP).applyAxisAngle(e.up, Math.sin(ctx.time * 7 + e.seed) * 0.4);     // a wobbly sprint
      return d.speed;
    }
    if (e.state === 'windup') {
      showDisc(e, e.pos, d.blastRadius, 1 - e.timer / d.fuse);
      if (e.timer <= 0) { burst(e, dist); return 0; }
      turnToward(e.fwd, e.toP, e.up, damp(6, dt)); e.move.copy(e.toP);
      return d.speed * 0.25;                                                                // still creeping closer on the fuse
    }
    if (e.state === 'recover' && e.timer <= 0) e.state = 'chase';                           // after being defused
    return 0;
  },
  animate(e) {
    const d = e.def, pop = 1 + e.hitPop * 0.14;
    const swell = e.state === 'windup' ? 1 + (1 - e.timer / d.fuse) * 0.45 + Math.sin(ctx.time * 30) * 0.05 : 1 + Math.sin(ctx.time * 9 + e.seed) * 0.04;
    e.body.scale.set(swell * pop, swell * pop, swell * pop);
    e.body.position.y = Math.abs(Math.sin(e.phase * 1.5)) * 0.12 * Math.min(1, Math.abs(e.speed) / 2);
  },
};

function burst(e, dist) {
  const d = e.def, P = ctx.player;
  ringFX(e.pos, d.blastRadius, 0xff8a6a, 0.5);
  sparkles.emit(e.center(), { count: 50, color: d.color, speed: 4.5, up: e.up, upBias: 0.5, life: 0.8, size: 0.42 });
  audio.explode(); if (dist < 14) shakeCamera(0.3);
  if (!P.dead && dist < d.blastRadius + P.radius && P.r - groundHeight(P.up) < 1.5) hurtPlayer(d.damage, e.pos, d.knockback);
  e.die();
}
