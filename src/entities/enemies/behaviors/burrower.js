/* THORNMOLE (ai 'burrower'): tunnels toward the hero, untargetable underground (a moving dirt mound gives it away),
   erupts beneath them after a short tremor, then stays exposed for a few seconds before diving again.
   Keep moving to dodge the eruption, then punish it while it's up. */
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { ringFX, groundPoint } from '../../../fx/combatFx.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../systems/CameraSystem.js';
import { damp } from '../../../utils/math.js';
import { turnToward } from '../../../utils/sphere.js';
import { groundHeight } from '../../../world/terrain.js';
import { ENGAGED } from '../states.js';
import { showDisc } from './telegraphs.js';
import { rng } from '../../../utils/random.js';

const DUST = 0xc8a67a;

export const burrower = {
  reset(e) { setHidden(e, false); e.body.position.y = 0; },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'chase':
        if (!e.hidden) { setHidden(e, true); audio.squish(); sparkles.emit(groundPoint(e.pos, 0.2), { count: 18, color: DUST, speed: 2, up: e.up, upBias: 0.8, life: 0.6, size: 0.34 }); }
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt)); e.move.copy(e.toP);
        if (dist < 1.0) { e.state = 'windup'; e.timer = d.windup; audio.growl(); return 0; }
        return d.speed;
      case 'windup':                                                     // the tremor: a growing warning disc under the hero
        showDisc(e, e.pos, d.eruptRadius, 1 - e.timer / d.windup);
        if (rng() < dt * 20) sparkles.emit(groundPoint(e.pos, 0.1), { count: 2, color: DUST, speed: 1.5, up: e.up, upBias: 1, life: 0.5, size: 0.3 });
        if (e.timer <= 0) erupt(e, dist);
        return 0;
      case 'recover':                                                    // exposed and vulnerable
        turnToward(e.fwd, e.toP, e.up, damp(3, dt));
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  update(e, dt) {
    if (e.hidden && !ENGAGED.has(e.state)) setHidden(e, false);          // gave up the hunt: surfaces to wander home
    e.selfCollider.active = !e.hidden;                                   // the hero can walk over a tunnel
    e.body.position.y += ((e.hidden ? -1.1 : 0) - e.body.position.y) * damp(10, dt);
    e.mound.visible = e.hidden;
    if (e.hidden && Math.abs(e.speed) > 1 && rng() < dt * 14) sparkles.emit(groundPoint(e.pos, 0.15), { count: 1, color: DUST, speed: 1, up: e.up, upBias: 0.8, life: 0.5, size: 0.32 });
  },
  animate(e) {
    e.body.scale.setScalar(1 + e.hitPop * 0.14);
    e.body.rotation.x = e.state === 'recover' ? Math.sin(ctx.time * 3 + e.seed) * 0.08 : 0;
    e.mound.scale.y = 0.45 + Math.abs(Math.sin(e.phase * 2)) * 0.12;
  },
};

function setHidden(e, hidden) { e.hidden = hidden; e.shadow.visible = !hidden; }

function erupt(e, dist) {
  const d = e.def, P = ctx.player;
  setHidden(e, false); e.hideTele(); e.state = 'recover'; e.timer = d.exposed; e.cool = d.cooldown;
  ringFX(e.pos, d.eruptRadius, DUST, 0.4);
  sparkles.emit(groundPoint(e.pos, 0.3), { count: 36, color: DUST, speed: 3.5, up: e.up, upBias: 1.2, life: 0.8, size: 0.4 });
  audio.slam(); if (dist < 10) shakeCamera(0.15);
  if (!P.dead && dist < d.eruptRadius + P.radius && P.r - groundHeight(P.up) < 1) hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
}
