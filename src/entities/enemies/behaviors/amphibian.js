/* SURF SKIPPER (ai 'amphibian'): a mudskipper raider that lurks in the surf. Under deep enough water it's submerged:
   only its sail fin shows, and nothing can hit it. It follows you along the shore (never onto land: water.js fence)
   and in the shallows it has to show itself. Within reach it surfaces, marks a lane and leaps out at you, then
   stands exposed on the beach for a moment before it scurries back into deep water, where you can't follow it on
   foot. A stagger as it surfaces leaves it floundering in the shallows just as long. When the tide leaves it high and dry it's stranded: visible and hittable while it hurries back to the sea. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hurtPlayer } from '../../../combat/damage.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { damp } from '../../../utils/math.js';
import { projectTangent, turnToward } from '../../../utils/sphere.js';
import { waterAt } from '../../../world/terrain.js';
import { layLane, makeDots } from './telegraphs.js';
import { depthAt, nearestWater, resetWater, steerToWater, waterFence, waterSpeed } from './water.js';

const SPRAY = 0xd8fbff, _p = new THREE.Vector3();
/** States in which it has chosen to be out of the water. */
const ASHORE = new Set(['charge', 'recover', 'flee']);

export const amphibian = {
  init(e) { e.lane = makeDots(e, 8, 0x4fd0e0); e.leapFrom = new THREE.Vector3(); e.leapDir = new THREE.Vector3(); },
  reset(e) { resetWater(e); setHidden(e, false); e.hover = 0; },
  /** Going back to the sea (after a raid, or stranded by the tide): overrides every state. */
  steer(e, dt) {
    const d = e.def;
    if (e.stranded) return steerToWater(e, dt, d.speed);
    if (e.state !== 'flee') return undefined;
    if (depthAt(e.up) >= d.hideDepth) { e.state = 'chase'; e.cool = d.cooldown; e.toWater = null; return 0; }
    return steerToWater(e, dt, d.speed * 1.25);
  },
  think(e, dt, dist) {
    const d = e.def;
    switch (e.state) {
      case 'chase':
        turnToward(e.fwd, e.toP, e.up, damp(d.turnRate, dt));
        if (dist < d.ambushRange && e.cool <= 0) { e.state = 'windup'; e.timer = d.windup; setHidden(e, false); splash(e, 14); emote(e, '!', '#ff4d6d'); audio.growl(); return 0; }
        e.move.copy(e.toP); return dist > 1.5 ? waterSpeed(e, d.swimSpeed) : 0;
      case 'windup': {
        const k = 1 - e.timer / d.windup;
        if (k < 0.6) { turnToward(e.fwd, e.toP, e.up, damp(10, dt)); e.leapDir.copy(e.fwd); e.leapFrom.copy(e.up); }
        layLane(e.lane, e.leapFrom, e.leapDir, d.leapSpeed * d.leapTime, d.width, 0.2 + 0.5 * k);
        if (e.timer <= 0) { e.state = 'charge'; e.timer = d.leapTime; e.hitPlayer = false; e.hideTele(); e.speed = d.leapSpeed; e.vy = d.leapLift; e.grounded = false; splash(e, 22); audio.whoosh(); }
        return 0;
      }
      case 'charge':
        projectTangent(e.leapDir, e.up).normalize(); e.fwd.copy(e.leapDir); e.move.copy(e.leapDir);
        if (!e.hitPlayer && !ctx.player.dead && dist < e.radius + ctx.player.radius + d.width * 0.5) { e.hitPlayer = true; hurtPlayer(d.damage, e.pos, d.knockback, { source: e }); }
        if (e.timer <= 0) { e.state = 'recover'; e.timer = d.exposed; }
        return waterSpeed(e, d.leapSpeed);
      case 'recover':                                                       // stranded by choice: the window
        turnToward(e.fwd, e.toP, e.up, damp(4, dt));
        if (e.timer <= 0) { e.state = 'flee'; e.toWater = nearestWater(e.up, d.hideDepth + 0.3, 24) ?? e.home.clone(); }
        return 0;
    }
    return 0;
  },
  update(e, dt) {
    const d = e.def;
    if (e.state === 'recover' && e.lastState === 'windup') e.timer = Math.max(e.timer, d.exposed);   // staggered as it surfaced: floundering
    e.lastState = e.state;
    if (e.state === 'windup' || e.state === 'charge') e.wasWet = false;    // a leap is a choice, not a stranding
    const wet = waterFence(e, d.fenceDepth, ASHORE.has(e.state) || e.state === 'windup');
    const lurk = wet && !e.stranded && !ASHORE.has(e.state) && e.state !== 'windup' && depthAt(e.up) >= d.hideDepth;
    if (lurk !== e.hidden) { setHidden(e, lurk); if (!lurk) splash(e, 10); }
    const w = waterAt(e.up);                                            // float the body at the surface while in water
    const lift = w && e.state !== 'charge' ? Math.max(0, w.level - (e.hidden ? 0.75 : 0.42) - e.r) : 0;
    e.hover += (lift - e.hover) * damp(8, dt);
    if (e.hidden && Math.abs(e.speed) > 1 && w) wake(e, w, dt);
  },
  animate(e) {
    const s = Math.abs(e.speed), sw = Math.sin(e.phase * 2) * Math.min(1, s / 3);
    e.finL.rotation.x = sw * 0.6; e.finR.rotation.x = -sw * 0.6; e.tail.rotation.y = sw * 0.5;
    e.body.rotation.x = e.state === 'windup' ? -0.35 : e.state === 'charge' ? -0.15 : 0;
    e.body.rotation.z = e.stranded ? Math.sin(ctx.time * 9 + e.seed) * 0.15 : 0;
    e.fin.scale.y = e.hidden ? 1.2 : 1;
    e.body.scale.setScalar(1 + e.hitPop * 0.14);
  },
};

function setHidden(e, hidden) { e.hidden = hidden; e.shadow.visible = !hidden; e.selfCollider.active = !hidden; }

function splash(e, count) {
  const w = waterAt(e.up); if (!w) return;
  sparkles.emit(_p.copy(e.up).multiplyScalar(w.level + 0.1), { count, color: SPRAY, speed: 2.6, up: e.up, upBias: 1.2, life: 0.6, size: 0.32 });
  audio.splash(count > 15);
}

/** A little wake behind the fin while it swims submerged (the only sign of it). */
function wake(e, w, dt) {
  e.wakeT = (e.wakeT ?? 0) - dt; if (e.wakeT > 0) return; e.wakeT = 0.12;
  sparkles.emit(_p.copy(e.up).multiplyScalar(w.level + 0.05).addScaledVector(e.fwd, -0.5), { count: 1, color: SPRAY, speed: 0.6, up: e.up, upBias: 0.6, life: 0.5, size: 0.26 });
}
