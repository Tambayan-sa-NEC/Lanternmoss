/* Procedural hero animation: the shared locomotion pose, plus a per-hero overlay (HERO_POSES[charId]):
   the witch's staff, the knight's axe swing / spin / guard and the ranger's bow draw and pigtails. */
import { ctx } from '../../core/context.js';
import { PLAYER } from '../../config/game.js';
import { damp } from '../../utils/math.js';

/** Seconds of the knight's axe-swing animation (also the swing timer set by the Axe Cleave ability). */
export const KNIGHT_SWING = 0.26;

export function animateHero(H, dt, hs) {
  const time = ctx.time, run = hs / PLAYER.walkSpeed, k = damp(14, dt);
  H.phase += dt * hs * 2.3;
  const amp = Math.min(1, run) * 0.8, sw = Math.sin(H.phase) * amp;
  const T = H.grounded ? { lL: sw, lR: -sw, aL: -sw * 0.8, aR: sw * 0.8, zL: -0.08, zR: 0.08 } : { lL: -0.7, lR: 0.35, aL: -0.4, aR: -0.4, zL: -1.0, zR: 1.0 };
  if (H.armHoldR !== undefined) { T.aR = H.armHoldR + T.aR * 0.25; T.zR = Math.min(T.zR, 0.25); }   // a heavy weapon damps the arm swing
  H.legL.rotation.x += (T.lL - H.legL.rotation.x) * k; H.legR.rotation.x += (T.lR - H.legR.rotation.x) * k;
  if (H.castT > 0) { T.aR = -1.55; T.zR = 0.12; }                // snap the casting arm up
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

/** Holds a prop at a fixed pitch to the body whatever its arm does (prop.rotation.order = 'ZYX' undoes the arm's XYZ rotation).
    w blends from body-locked (0) to rigid in the hand (1). */
function holdLevel(prop, arm, pitch = 0, w = 0) {
  const k = 1 - w; prop.rotation.set((pitch - arm.rotation.x) * k, 0, -arm.rotation.z * k);
}

/** Witch: the staff stays upright beside her and tips toward the target while she casts. */
function animateWitch(H, dt) {
  H.staffTilt += ((H.castT > 0 ? 0.6 : 0.08) - H.staffTilt) * damp(H.castT > 0 ? 40 : 10, dt);
  holdLevel(H.staff, H.armR, H.staffTilt);
}

/** Knight overlay on top of animateHero (which still drives legs, bob, coat tails and squash).
    At rest the axe rides over the right shoulder; any move grips it in both hands. */
function animateKnight(H, dt) {
  const fighting = H.swingT > 0 || H.spinT > 0 || H.guardT > 0 || H.dashT > 0 || H.leapK > 0;
  H.axeGrip += ((fighting ? 1 : 0) - H.axeGrip) * damp(fighting ? 40 : 8, dt);
  if (H.swingT > 0) { const t = 1 - H.swingT / KNIGHT_SWING; H.armR.rotation.x = -2.5 + t * 3.0; H.armR.rotation.z = 0.35 - t * 0.5; H.body.rotation.y = (0.5 - t) * 0.7;
    H.armL.rotation.x = H.armR.rotation.x; H.armL.rotation.z = 0.45; }                   // second hand on the haft
  else if (H.spinT > 0) { H.body.rotation.y += dt * 26; H.armR.rotation.set(-0.3, 0, 1.3); H.armL.rotation.set(-0.6, 0, 0.6); }
  else if (H.leapK > 0) {                                            // Leap Slam: axe high overhead, brought down for the landing
    const down = Math.max(0, (H.leapK - 0.7) / 0.3), a = -2.9 + down * down * 3.2;
    H.armR.rotation.set(a, 0, -0.3); H.armL.rotation.set(a, 0, 0.45); H.body.rotation.x = -0.35 + down * 0.8;
  }
  else { const rest = Math.round(H.body.rotation.y / (Math.PI * 2)) * Math.PI * 2; H.body.rotation.y += (rest - H.body.rotation.y) * damp(12, dt); }
  if (H.guardT > 0 || H.dashT > 0) { H.armR.rotation.x = H.armL.rotation.x = -1.3; H.armR.rotation.z = -0.45; H.armL.rotation.z = 0.45; }   // braced behind the axe
  if (H.dashT > 0) H.body.rotation.x = 0.35;
  holdLevel(H.axe, H.armR, -2.07, H.axeGrip);                       // rest: haft up and back over the shoulder
  H.axeRoll.rotation.z = (1 - H.axeGrip) * 1.1;
}

/** Ranger: the bow stays upright in her left hand; a shot raises it and draws the string hand back. Pigtails trail and bounce. */
function animateRanger(H, dt, hs) {
  if (H.castT > 0) { const k = damp(40, dt);
    H.armL.rotation.x += (-1.5 - H.armL.rotation.x) * k; H.armL.rotation.z += (0.12 - H.armL.rotation.z) * k;
    H.armR.rotation.x += (-1.4 - H.armR.rotation.x) * k; H.armR.rotation.z += (-0.55 - H.armR.rotation.z) * k; }
  holdLevel(H.bowHold, H.armL, 0.12);
  H.bow.rotation.y += ((H.castT > 0 ? 0 : -0.9) - H.bow.rotation.y) * damp(H.castT > 0 ? 40 : 8, dt);
  const trail = Math.min(hs, 10) * 0.05 + (H.grounded ? 0 : H.vy < 0 ? -0.3 : 0.25), bounce = Math.sin(H.phase * 2) * 0.06 * Math.min(1, hs / 2);
  H.tails.forEach((t, i) => { const sx = i ? 1 : -1;
    t.rotation.x = trail + bounce + Math.sin(ctx.time * 1.6 + i) * 0.03; t.rotation.z = sx * (0.1 + Math.abs(bounce)); });
}

/** CHARACTERS[id] -> pose overlay run after animateHero. */
export const HERO_POSES = { witch: animateWitch, knight: animateKnight, ranger: animateRanger };
