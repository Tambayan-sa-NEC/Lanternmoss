/* RAMHORN (ai 'charger'): circles at mid range, marks a lane, then charges in a straight line it can't steer.
   Sidestep it. A charge that slams into a tree, rock or house leaves it dazed and taking bonus damage. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { hitsStatic } from '../../../physics/colliders.js';
import { audio } from '../../../systems/AudioSystem.js';
import { shakeCamera } from '../../../systems/CameraSystem.js';
import { damp } from '../../../utils/math.js';
import { projectTangent, turnToward } from '../../../utils/sphere.js';
import { layLane, makeDots } from './telegraphs.js';
import { rng } from '../../../utils/random.js';

const V3 = THREE.Vector3;
const _probe = new V3();

export const charger = {
  init(e) { e.lane = makeDots(e, 9, 0xff4d6d); e.laneFrom = new V3(); e.chargeDir = new V3(); },
  think(e, dt, dist) {
    const d = e.def, toP = e.toP;
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, toP, e.up, damp(d.turnRate, dt));
        if (dist > d.chargeRange) { e.move.copy(toP); return d.speed; }
        if (e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; audio.growl(); emote(e, '!', '#ff4d6d'); return 0; }
        e.move.crossVectors(e.up, toP).multiplyScalar(Math.sin(ctx.time * 0.7 + e.seed) > 0 ? 1 : -1);   // circle while it recharges
        return d.speed * 0.6;
      case 'windup': {
        const k = 1 - e.timer / d.windup;
        if (k < 0.6) { turnToward(e.fwd, toP, e.up, damp(10, dt)); e.chargeDir.copy(e.fwd); e.laneFrom.copy(e.up); }   // aims, then commits
        layLane(e.lane, e.laneFrom, e.chargeDir, d.chargeSpeed * d.chargeTime, d.width, 0.2 + 0.5 * k);
        if (e.timer <= 0) { e.state = 'charge'; e.timer = d.chargeTime; e.hitPlayer = false; e.hideTele(); audio.whoosh(); }
        return 0;
      }
      case 'charge':
        projectTangent(e.chargeDir, e.up).normalize(); e.fwd.copy(e.chargeDir); e.move.copy(e.chargeDir);
        if (!e.hitPlayer && !ctx.player.dead && dist < e.radius + ctx.player.radius + d.width * 0.5) { e.hitPlayer = true; hurtPlayer(d.damage, e.pos, d.knockback, { source: e }); }
        if (rng() < dt * 25) sparkles.emit(e.pos, { count: 1, color: 0xe8d6c0, speed: 1.2, up: e.up, upBias: 0.6, life: 0.4, size: 0.3 });
        if (e.timer <= 0) { e.state = 'recover'; e.timer = e.cool = d.cooldown; }
        return d.chargeSpeed;
      case 'recover':
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  update(e, dt, n) {
    if (e.state !== 'charge' || !n) return;
    // bumping into the hero or another monster isn't a crash; only scenery is
    if (!hitsStatic(_probe.copy(e.pos).addScaledVector(e.chargeDir, e.radius + 0.25).addScaledVector(e.up, 0.5), e.radius * 0.6)) return;
    const d = e.def; e.state = 'recover'; e.timer = e.cool = d.stunTime + d.cooldown * 0.5; e.stunT = e.stunnedT = d.stunTime; e.speed = 0;
    emote(e, '?', '#ffd24a'); audio.slam(); shakeCamera(0.15);
    sparkles.emit(e.center(), { count: 20, color: 0xffe066, speed: 2.4, up: e.up, upBias: 1, life: 0.8, size: 0.32 });
  },
  animate(e) {
    const s = Math.abs(e.speed), sw = Math.sin(e.phase * 1.4) * Math.min(1, s / 3) * 0.7;
    e.legs.forEach((l, i) => { l.rotation.x = i % 2 ? sw : -sw; });
    e.body.rotation.x = e.state === 'windup' ? -0.15 + Math.sin(ctx.time * 25) * 0.04 : e.state === 'charge' ? 0.25 : 0;
    e.body.rotation.z = e.stunnedT > 0 ? Math.sin(ctx.time * 8) * 0.25 : 0;           // dazed wobble
    e.body.scale.setScalar(1 + e.hitPop * 0.14);
  },
};
