/* SHELLBACK (ai 'armoured'): a crab that scuttles sideways around you, always turning its barnacled front plate your
   way, but slowly (def.turnRate is a capped angular speed, not a smoothing factor). The plate refuses every hit that
   comes from the front (refuses(): a cone of def.guardArc degrees). Circle round it, or hit it while it's dazed.
   Hits with no direction (burning ground) and blows landing on top of it (a meteor right on it) go past the plate.
   Its pinch: a short wind-up with a warning disc in front, then a snap; it can't turn while recovering. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { hitMobs, hurtPlayer } from '../../../combat/damage.js';
import { emote } from '../../../fx/emotes.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { tangentTo } from '../../../utils/sphere.js';
import { groundHeight } from '../../../world/terrain.js';
import { showDisc } from './telegraphs.js';

const _to = new THREE.Vector3(), _side = new THREE.Vector3(), _c = new THREE.Vector3();

/** Turns heading fwd toward target (both tangent at up) by at most rate * dt radians. */
export function turnCapped(fwd, target, up, rate, dt) {
  const angle = Math.atan2(_side.crossVectors(fwd, target).dot(up), fwd.dot(target));
  fwd.applyAxisAngle(up, Math.sign(angle) * Math.min(Math.abs(angle), rate * dt)).normalize();
}

/** Is a hit from world point `from` stopped by e's front plate? (pure geometry, exported for the tests) */
export function plateBlocks(e, from) {
  if (!from || e.stunnedT > 0) return false;
  const dist = tangentTo(e.pos, e.up, from, _to);
  if (dist < e.radius * 0.8) return false;                                  // from right above it
  return e.fwd.dot(_to) > Math.cos(THREE.MathUtils.degToRad(e.def.guardArc));
}

export const armoured = {
  think(e, dt, dist) {
    const d = e.def, toP = e.toP;
    switch (e.state) {
      case 'chase': {
        turnCapped(e.fwd, toP, e.up, d.turnRate, dt);
        if (dist < d.range && e.cool <= 0 && e.fwd.dot(toP) > 0.7) { e.state = 'windup'; e.timer = d.windup; audio.growl(); return 0; }
        // sideways scuttle: mostly across, closing in when far and backing off when too close
        _side.crossVectors(e.up, toP).multiplyScalar(Math.sin(ctx.time * 0.6 + e.seed) > 0 ? 1 : -1);
        const closing = dist > d.range * 0.9 ? 0.75 : dist < d.range * 0.5 ? -0.5 : 0;
        e.move.copy(_side).addScaledVector(toP, closing).normalize();
        return d.speed;
      }
      case 'windup':
        showDisc(e, _c.copy(e.pos).addScaledVector(e.fwd, d.reach), d.pinchRadius, 1 - e.timer / d.windup);
        if (e.timer <= 0) pinch(e);
        return 0;
      case 'recover':                                                       // claws out, plate fixed: the opening
        if (e.timer <= 0) e.state = 'chase';
        return 0;
    }
    return 0;
  },
  /** Called by damageEnemy before any damage: true = the hit glances off the plate. */
  refuses(e, o) {
    if (!plateBlocks(e, o.from)) return false;                            // every ability and pet strike passes its origin
    e.plateFlash = 1; audio.clang();
    sparkles.emit(_c.copy(e.pos).addScaledVector(e.up, 0.7).addScaledVector(e.fwd, e.radius), { count: 8, color: 0xdff8ff, speed: 2.6, up: e.up, upBias: 0.5, life: 0.35, size: 0.28 });
    if (emoteReady(e)) emote(e, '✦', '#bff4ff');
    return true;
  },
  reset(e) { e.plateFlash = 0; e.lastEmote = -9; },
  animate(e, dt) {
    const s = Math.abs(e.speed), sw = Math.sin(e.phase * 2.2) * Math.min(1, s / 2) * 0.5;
    e.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? sw : -sw); });
    const k = e.state === 'windup' ? 1 - e.timer / e.def.windup : 0, snap = e.state === 'recover' && e.timer > e.def.cooldown - 0.15;
    for (const c of [e.clawL, e.clawR]) { c.rotation.x = -k * 0.9 + (snap ? 0.5 : 0); c.userData.pincer.rotation.x = -0.5 * k + (snap ? 0.3 : Math.sin(ctx.time * 3 + e.seed) * 0.08); }
    e.plateFlash = Math.max(0, (e.plateFlash ?? 0) - dt * 4);
    e.plate.scale.setScalar(1 + e.plateFlash * 0.08); e.plate.position.z = 0.62 + e.plateFlash * 0.06;
    e.body.rotation.z = e.stunnedT > 0 ? Math.sin(ctx.time * 8) * 0.2 : sw * 0.15;
    e.body.position.y = e.state === 'windup' ? k * 0.12 : 0;
    e.body.scale.setScalar(1 + e.hitPop * 0.12);
  },
};

/** At most one '✦' every second, so a flurry of blocked bolts doesn't bury it in emotes. */
function emoteReady(e) { if (ctx.time - (e.lastEmote ?? -9) < 1) return false; e.lastEmote = ctx.time; return true; }

function pinch(e) {
  const d = e.def, P = ctx.player; e.state = 'recover'; e.timer = e.cool = d.cooldown; e.hideTele(); audio.bite();
  const c = _c.copy(e.pos).addScaledVector(e.fwd, d.reach);
  sparkles.emit(c, { count: 12, color: 0xffb38a, speed: 2.4, up: e.up, upBias: 0.6, life: 0.4, size: 0.3 });
  if (!P.dead && P.pos.distanceTo(c) < d.pinchRadius + P.radius && P.r - groundHeight(P.up) < 1.2) hurtPlayer(d.damage, e.pos, d.knockback, { source: e });
  hitMobs(e, c, d.pinchRadius, d.damage, { knock: d.knockback });            // TODO 45b
}
