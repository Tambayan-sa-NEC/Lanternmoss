/* JELLYBELL (ai 'drifter'): a jellyfish that floats on the sea and goes where the tide takes it. A rising tide carries
   it up the slope onto the newly flooded flats; a falling one pulls it back out (the drift follows the measured change
   of the water level, so it also follows a draining lagoon). It never swims onto dry ground (water.js fence), so it
   can't follow you ashore. Close in, it swells and pulses a stinging ring across the water (a warning ring grows
   first; jump or step out). If the water drains from under it, it's stranded: it flops toward the sea, unable to
   sting, until there's water under it again. Popped, it bursts into light. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { ringFX } from '../../../fx/combatFx.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { clamp, damp } from '../../../utils/math.js';
import { frameQuat, turnToward } from '../../../utils/sphere.js';
import { terrainGradient, waterAt } from '../../../world/terrain.js';
import { resetWater, steerToWater, waterFence, waterSpeed } from './water.js';

const _g = new THREE.Vector3(), _p = new THREE.Vector3();
const LIGHT = 0xdffcff;

export const drifter = {
  reset(e) { resetWater(e); e.prevLevel = null; e.tideDrift = 0; },
  /** Stranded: crawling back to the water, whatever its state. */
  steer(e, dt) { return e.stranded ? steerToWater(e, dt, e.def.crawlSpeed) : undefined; },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
        if (dist < d.pulseRange && e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; audio.charge(); return 0; }
        e.move.copy(e.toP); return dist > d.pulseRange * 0.6 ? waterSpeed(e, d.speed) : 0;
      case 'windup': {
        const w = waterAt(e.up), k = 1 - e.timer / d.windup;
        e.tele.visible = true; e.tele.position.copy(e.up).multiplyScalar((w?.level ?? e.r) + 0.06);
        frameQuat(e.up, e.fwd, e.tele.quaternion); e.tele.scale.setScalar(d.pulseRadius * (0.4 + 0.6 * k)); e.tele.material.opacity = 0.25 + 0.5 * k;
        if (e.timer <= 0) pulse(e, dist, w);
        return 0;
      }
      case 'recover':
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  update(e, dt) {
    const d = e.def;
    if (!e.stranded) drift(e, dt);
    if (!waterFence(e, d.floatDepth)) { if (e.state === 'windup') { e.state = 'recover'; e.timer = e.cool = d.cooldown * 0.5; } return; }
    const w = waterAt(e.up);                                            // afloat: ride the surface
    e.r = w.level - d.sink + Math.sin(ctx.time * 1.7 + e.seed) * 0.05; e.vy = 0; e.grounded = true; e.pos.copy(e.up).multiplyScalar(e.r);
  },
  onDie(e) {
    const w = waterAt(e.up), c = e.center();
    sparkles.emit(c, { count: 60, color: LIGHT, speed: 4, up: e.up, upBias: 0.9, life: 1.1, size: 0.45 });
    sparkles.emit(c, { count: 24, color: e.def.color, speed: 2.2, up: e.up, upBias: 1.4, life: 1.4, size: 0.5 });
    ringFX(e.pos, 2.4, LIGHT, 0.6, w?.level ?? null); audio.sparkle();
  },
  animate(e) {
    const d = e.def, k = e.state === 'windup' ? 1 - e.timer / d.windup : 0, pop = 1 + e.hitPop * 0.14;
    const beat = e.stranded ? 0 : Math.sin(ctx.time * 3 + e.seed) * 0.08;
    e.body.scale.set((1 + beat + k * 0.25) * pop, (1 - beat - k * 0.3) * pop * (e.stranded ? 0.6 : 1), (1 + beat + k * 0.25) * pop);
    e.body.position.y = e.stranded ? 0.15 : 0.45;
    e.body.rotation.z = e.stranded ? 0.35 + Math.sin(ctx.time * 5 + e.seed) * 0.12 : 0;
    e.core.scale.setScalar(1 + k * 0.9);
    e.tentacles.forEach((t, i) => { t.rotation.x = Math.sin(ctx.time * 2.2 + i * 1.3 + e.seed) * 0.25 + (e.stranded ? 1.2 : 0); });
  },
};

/** Tide drift: uphill (onto the flats) while the water rises, downhill while it falls, at up to def.drift m/s. */
function drift(e, dt) {
  const d = e.def, w = waterAt(e.up); if (!w || dt <= 0) { e.prevLevel = null; e.tideDrift = 0; return; }
  const rate = e.prevLevel == null ? 0 : (w.level - e.prevLevel) / dt; e.prevLevel = w.level;
  const slope = terrainGradient(e.up, _g); e.tideDrift = clamp(rate / d.tideRate, -1, 1);
  if (slope < 0.02 || e.tideDrift === 0) return;
  _p.copy(e.pos).addScaledVector(_g, e.tideDrift * d.drift * dt);              // _g is the unit uphill direction
  e.up.copy(_p).normalize(); e.pos.copy(e.up).multiplyScalar(e.r);
}

function pulse(e, dist, w) {
  const d = e.def, P = ctx.player, level = w?.level ?? e.r;
  e.state = 'recover'; e.timer = d.cooldown * 0.5; e.cool = d.cooldown; e.hideTele();
  ringFX(e.pos, d.pulseRadius, d.color, 0.5, level); ringFX(e.pos, d.pulseRadius * 0.6, LIGHT, 0.35, level);
  sparkles.emit(e.center(), { count: 20, color: d.color, speed: 3, up: e.up, upBias: 0.3, life: 0.5, size: 0.32 }); audio.nova();
  if (!P.dead && dist < d.pulseRadius + P.radius && P.r - level < d.reachUp) hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
}
