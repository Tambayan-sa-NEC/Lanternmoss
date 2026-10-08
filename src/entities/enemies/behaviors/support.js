/* HEXLANTERN (ai 'support'): a floating lantern spirit that tucks in behind whichever monster is fighting the hero,
   mends the wounded and wards fighters with a damage-reducing shield. Harmless on its own and skittish: take it
   out first. It never helps bosses or other lanterns. */
import * as THREE from 'three';
import { ctx } from '../../../core/context.js';
import { settings } from '../../../core/settings.js';
import { floatText } from '../../../fx/combatFx.js';
import { sparkles } from '../../../fx/sparkles.js';
import { audio } from '../../../systems/AudioSystem.js';
import { damp } from '../../../utils/math.js';
import { mr } from '../../../utils/random.js';
import { tangentTo, turnToward } from '../../../utils/sphere.js';
import { ENGAGED } from '../states.js';

const V3 = THREE.Vector3;
const _a = new V3(), _b = new V3(), _p = new V3();

export const support = {
  reset(e) { e.healCool = mr(0.5, 1.5); e.shieldCool = mr(1, 3); e.castT = 0; },
  think(e, dt, dist) {
    const d = e.def, toP = e.toP;
    turnToward(e.fwd, toP, e.up, damp(6, dt));
    e.healCool -= dt; e.shieldCool -= dt; e.castT = Math.max(0, e.castT - dt);
    if (e.healCool <= 0) { const a = pickAlly(e, x => x.hp < x.def.hp * 0.9, x => x.hp / x.def.hp); if (a) mend(e, a); e.healCool = a ? d.healCooldown : 0.5; }
    if (e.shieldCool <= 0) { const a = pickAlly(e, x => x.shieldT <= 0 && ENGAGED.has(x.state), x => x.pos.distanceTo(e.pos)); if (a) ward(e, a); e.shieldCool = a ? d.shieldCooldown : 0.5; }
    if (dist < d.keepDistance * 0.5) { e.move.copy(toP).negate(); return d.speed * 1.1; }   // skittish: flees a close hero
    // tuck in behind the nearest monster that is fighting, on the far side from the hero, to keep it in range
    const buddy = pickAlly(e, x => ENGAGED.has(x.state), x => x.pos.distanceTo(e.pos), d.healRadius * 2.5);
    if (buddy) {
      _p.copy(buddy.pos).addScaledVector(buddy.toP, -3);
      if (tangentTo(e.pos, e.up, _p, e.move) > 1.5) return d.speed;
    } else {
      if (dist < d.keepDistance - 1.5) { e.move.copy(toP).negate(); return d.speed; }
      if (dist > d.keepDistance + 3) { e.move.copy(toP); return d.speed * 0.7; }
    }
    e.move.crossVectors(e.up, toP).multiplyScalar(Math.sin(ctx.time * 0.6 + e.seed) > 0 ? 1 : -1);
    return d.speed * 0.5;
  },
  animate(e, dt) {
    e.core.scale.setScalar(0.8 + e.castT * 1.5 + Math.sin(ctx.time * 4 + e.seed) * 0.08);
    e.body.rotation.y += dt * 0.8; e.body.scale.setScalar(1 + e.hitPop * 0.14);
  },
};

/** The ally within `range` (default: heal range) that passes `want`, with the lowest `score`. Bosses are never helped. */
function pickAlly(e, want, score, range = e.def.healRadius) {
  let best = null, bs = Infinity;
  for (const a of ctx.enemies) {
    if (a === e || !a.alive || a.hidden || a.def.ai === 'boss' || a.def.ai === 'support' || a.pos.distanceTo(e.pos) > range || !want(a)) continue;
    const s = score(a); if (s < bs) { bs = s; best = a; }
  }
  return best;
}
function beam(from, to, color) {
  _a.copy(from.center()); _b.copy(to.center());
  for (let i = 0; i <= 8; i++) sparkles.emit(_p.copy(_a).lerp(_b, i / 8), { count: 1, color, speed: 0.4, life: 0.6, size: 0.3 });
}
function mend(e, a) {
  const amt = Math.min(e.def.heal, a.def.hp - a.hp); a.hp += amt; e.castT = 0.4;
  beam(e, a, 0x8fffc0); if (settings.damageNumbers) floatText(_p.copy(a.center()).addScaledVector(a.up, a.height * 0.5), `+${Math.round(amt)}`, '#7dffb0'); audio.plip();
}
function ward(e, a) {
  a.shieldT = e.def.shieldTime; a.shieldAmt = e.def.shieldReduction; e.castT = 0.4;
  beam(e, a, 0xbff4ff); sparkles.emit(a.center(), { count: 20, color: 0xbff4ff, speed: 2, up: a.up, upBias: 0.4, life: 0.7, size: 0.32 }); audio.blink();
}
