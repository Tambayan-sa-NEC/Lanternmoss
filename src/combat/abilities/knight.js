/* The knight's (axe warrior's) moves (CHARACTERS.knight.abilities): Axe Cleave, Shoulder Charge, Whirlwind, Guard,
   plus the per-frame upkeep for the dash hit-sweep and the guard bubble. His ultimate, Leap Slam, is in ./ultimates.js. */
import * as THREE from 'three';
import { CHARACTERS } from '../../config/characters.js';
import { ctx } from '../../core/context.js';
import { arcFX, ringFX } from '../../fx/combatFx.js';
import { sparkles } from '../../fx/sparkles.js';
import { KNIGHT_SWING } from '../../entities/player/poses.js';
import { audio } from '../../systems/AudioSystem.js';
import { shakeCamera } from '../../systems/CameraSystem.js';
import { tangentTo } from '../../utils/sphere.js';
import { AREA_MAX_ALT } from '../area.js';
import { damageEnemy } from '../damage.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _a2 = new V3();

/** Living enemies within range and inside an arc (degrees) centred on dir; 360 = all around. */
function meleeTargets(dir, range, arcDeg) {
  const cosA = Math.cos(THREE.MathUtils.degToRad(arcDeg / 2)), out = [];
  for (const e of ctx.enemies) { if (!e.alive || e.hidden || e.hover > AREA_MAX_ALT) continue; const d = tangentTo(ctx.player.pos, ctx.player.up, e.pos, _a2);
    if (d > range + e.def.radius) continue; if (arcDeg < 360 && d > e.def.radius && _a2.dot(dir) < cosA) continue; out.push(e); }
  return out;
}

export const KNIGHT_ABILITIES = {
  slash(s, dir) { const P = ctx.player; P.swingT = KNIGHT_SWING; arcFX(P.pos, P.up, dir, s.range, s.arc, s.color);
    const hits = meleeTargets(dir, s.range, s.arc); for (const e of hits) damageEnemy(e, s.damage, { from: P.pos, knock: s.knockback });
    audio.swipe(); if (hits.length) shakeCamera(0.12); },
  dash(s, dir) { const P = ctx.player; P.dashT = s.time; P.dashHits = new Set(); P.invuln = Math.max(P.invuln, s.time);
    P.knock.addScaledVector(dir, s.distance * 6);           // rides the existing knockback channel (decays at 6/s => ~distance travelled)
    sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 0.6), { count: 18, color: s.color, speed: 2, up: P.up, upBias: 0.3, life: 0.5, size: 0.32 }); audio.whoosh(); },
  whirl(s) { const P = ctx.player; P.spinT = s.spinTime; ringFX(P.pos, s.radius, s.color, 0.4);
    for (const e of meleeTargets(P.fwd, s.radius, 360)) damageEnemy(e, s.damage, { from: P.pos, knock: s.knockback });
    sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 1), { count: 36, color: s.color, speed: 4, up: P.up, upBias: 0.2, life: 0.6, size: 0.34 });
    shakeCamera(0.2); audio.whoosh(); audio.swipe(); },
  guard(s) { const P = ctx.player; P.guardT = s.duration; P.guardReduction = s.reduction; audio.clang();
    sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 1), { count: 24, color: s.color, speed: 2, up: P.up, upBias: 0.5, life: 0.6, size: 0.3 }); },
};

export function updateKnight(dt) {
  const P = ctx.player; if (P.charId !== 'knight') return;
  for (const k of ['swingT', 'spinT', 'guardT', 'dashT']) P[k] = Math.max(0, P[k] - dt);
  if (P.dashT > 0) { const s = CHARACTERS.knight.abilities.dash;
    for (const e of ctx.enemies) if (e.alive && !P.dashHits.has(e) && e.hover <= AREA_MAX_ALT && e.pos.distanceTo(P.pos) < s.width + e.def.radius) {
      P.dashHits.add(e); damageEnemy(e, s.damage, { from: P.pos, knock: s.knockback, stagger: s.stun }); audio.clang(); shakeCamera(0.2); }
    sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 0.5), { count: 1, color: s.color, speed: 0.4, life: 0.4, size: 0.3 }); }
  P.bubble.visible = P.guardT > 0;
  if (P.guardT > 0) { P.bubble.scale.setScalar(1 + Math.sin(ctx.time * 10) * 0.03); P.bubble.material.opacity = Math.min(1, P.guardT / 0.4); }
}
