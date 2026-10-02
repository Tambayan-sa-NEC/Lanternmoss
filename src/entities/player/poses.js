/* Procedural hero animation: the shared locomotion pose, plus the knight's sword / spin / shield overlay. */
import { ctx } from '../../core/context.js';
import { PLAYER } from '../../config/game.js';
import { damp } from '../../utils/math.js';

/** Seconds of the knight's sword-swing animation (also the swing timer set by the Sword Slash ability). */
export const KNIGHT_SWING = 0.26;

export function animateHero(H, dt, hs) {
  const time = ctx.time, run = hs / PLAYER.walkSpeed, k = damp(14, dt);
  H.phase += dt * hs * 2.3;
  const amp = Math.min(1, run) * 0.8, sw = Math.sin(H.phase) * amp;
  const T = H.grounded ? { lL: sw, lR: -sw, aL: -sw * 0.8, aR: sw * 0.8, zL: -0.08, zR: 0.08 } : { lL: -0.7, lR: 0.35, aL: -0.4, aR: -0.4, zL: -1.0, zR: 1.0 };
  H.legL.rotation.x += (T.lL - H.legL.rotation.x) * k; H.legR.rotation.x += (T.lR - H.legR.rotation.x) * k;
  if (H.castT > 0) { T.aR = -1.55; T.zR = 0.12; }                // snap the wand arm up when casting
  const kr = H.castT > 0 ? damp(40, dt) : k;
  H.armL.rotation.x += (T.aL - H.armL.rotation.x) * k; H.armR.rotation.x += (T.aR - H.armR.rotation.x) * kr;
  H.armL.rotation.z += (T.zL - H.armL.rotation.z) * k; H.armR.rotation.z += (T.zR - H.armR.rotation.z) * kr;
  if (H.wandTip) H.wandTip.scale.setScalar(1 + H.castT * 4);
  const lean = Math.min(hs / PLAYER.sprintSpeed, 1) * 0.2;
  H.body.position.y = (H.grounded ? Math.abs(Math.sin(H.phase)) * 0.07 * Math.min(1, run) : 0) + Math.sin(time * 2.2) * 0.012;
  H.body.rotation.x += (lean - H.body.rotation.x) * k; H.head.rotation.x = -lean * 0.5;
  H.cape.rotation.x = 0.12 + Math.min(hs, 10) * 0.075 + Math.sin(time * 9) * 0.05 * (hs > 1 ? 1 : 0.3) + (H.grounded ? 0 : (H.vy < 0 ? -0.35 : 0.3));
  H.squash += (0 - H.squash) * damp(9, dt); const q = H.squash; H.root.scale.set(1 - q * 0.5, 1 + q, 1 - q * 0.5);
}

/** Knight-only pose layered on top of animateHero (which still drives legs, bob, cape and squash). */
export function animateKnight(H, dt) {
  if (H.swingT > 0) { const t = 1 - H.swingT / KNIGHT_SWING; H.armR.rotation.x = -2.5 + t * 3.0; H.armR.rotation.z = 0.35 - t * 0.5; H.body.rotation.y = (0.5 - t) * 0.7; }
  else if (H.spinT > 0) { H.body.rotation.y += dt * 26; H.armR.rotation.set(-0.3, 0, 1.3); }
  else { const rest = Math.round(H.body.rotation.y / (Math.PI * 2)) * Math.PI * 2; H.body.rotation.y += (rest - H.body.rotation.y) * damp(12, dt); }
  if (H.guardT > 0 || H.dashT > 0) { H.armL.rotation.x = -1.35; H.armL.rotation.z = 0.7; }
  if (H.dashT > 0) H.body.rotation.x = 0.35;
}
