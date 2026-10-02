/* AREA TARGETING for abilities with target: 'ground' (the ultimates). Pressing the key enters aim mode instead of
   casting: a ground marker follows the mouse cursor (clamped to the ability's range; with no cursor over the game it
   sits on the locked-on monster or ahead of the hero), showing the radius it will cover. Click or press the key again
   to cast there; Esc, right click or any other ability cancels. Abilities with landing: true (Leap Slam) snap to the
   nearest spot the hero can stand on; when there is none the marker turns red and the cast is refused.
   Cooldown and cost are only paid when the cast is confirmed (src/combat/casting.js). */
import { ctx } from '../core/context.js';
import { GroundDecal } from '../fx/groundDecals.js';
import { pointer } from '../systems/InputSystem.js';
import { dom } from '../ui/dom.js';
import { arcDist, dirAlong, tangentToward } from '../utils/sphere.js';
import { clampRange, groundUnderScreen, nearestLandable } from './area.js';
import { aimDirection, targeting } from './targeting.js';

const BAD = 0xff4d6d;

/** id/s = the ability being aimed; target = chosen surface direction; valid = it can be cast there. */
export const aim = { id: null, s: null, target: null, valid: false };
let marks = null;

function ensureMarks() {
  if (marks) return marks;
  marks = { fill: new GroundDecal('disc', 0xffffff, { k: 0.6, order: 4 }), edge: new GroundDecal('ring', 0xffffff, { k: 1.8, lift: 0.15, order: 4 }),
    dot: new GroundDecal('disc', 0xffffff, { k: 1.6, lift: 0.16, order: 4 }), range: new GroundDecal('thin', 0xffffff, { k: 0.5, order: 4 }),
    path: new GroundDecal('lane', 0xffffff, { k: 0.7, order: 4 }) };
  return marks;
}
function hideMarks() { if (marks) for (const m of Object.values(marks)) m.hide(); }

export function isAiming(id = null) { return id ? aim.id === id : aim.id !== null; }

export function beginAim(id, s) {
  Object.assign(aim, { id, s, target: null, valid: false });
  dom.aimHint.innerHTML = `<b>${s.name}</b> · <kbd>Click</kbd> or <kbd>${s.label.split('/').pop()}</kbd> to cast · <kbd>Esc</kbd> / right click to cancel`;
  dom.aimHint.style.display = 'block';
  updateAiming();
}
export function cancelAim() { aim.id = aim.s = aim.target = null; aim.valid = false; hideMarks(); dom.aimHint.style.display = 'none'; }

/** Where the marker wants to be this frame (before range clamping and landing checks). */
function rawTarget(s) {
  const P = ctx.player;
  if (pointer.over) { const d = groundUnderScreen(pointer.x, pointer.y); if (d) return d; }
  const t = targeting.aim;
  if (t && t.alive && arcDist(P.up, t.up) <= s.range) return t.up.clone();
  return dirAlong(P.up, aimDirection(), Math.min(s.range, 8));
}

/** Per-frame: follows the cursor and redraws the marker. Drops the aim if the hero can no longer cast. */
export function updateAiming() {
  if (!aim.id) return;
  const P = ctx.player, s = aim.s;
  if (P.dead || ctx.transitioning || ctx.inventoryOpen || !ctx.started || P.motion) { cancelAim(); return; }
  let t = clampRange(P.up, rawTarget(s), s.range);
  if (s.landing) { const snap = nearestLandable(P.up, t, P.radius + 0.15); aim.valid = !!snap; if (snap) t = snap; }
  else aim.valid = true;
  aim.target = t;
  const m = ensureMarks(), color = aim.valid ? s.color : BAD, pulse = 0.5 + 0.5 * Math.sin(ctx.time * 7);
  m.fill.setColor(color, 0.6); m.edge.setColor(color, 1.8); m.dot.setColor(color, 1.6); m.range.setColor(aim.valid ? 0xffffff : BAD, 0.5);
  m.fill.place(t, null, s.radius).opacity = 0.16 + 0.06 * pulse;
  m.edge.place(t, null, s.radius).opacity = 0.75 + 0.25 * pulse;
  m.dot.place(t, null, 0.35).opacity = 0.9;
  m.range.place(P.up, null, s.range).opacity = 0.18;
  if (s.landing) { const len = arcDist(P.up, t); if (len > 0.5) { m.path.setColor(color, 0.7); m.path.place(P.up, tangentToward(P.up, t), 0.3, len).opacity = 0.35; } else m.path.hide(); }
}

/** The surface direction to cast at and the heading toward it (written to `dir`), or null when the spot is invalid. */
export function aimedTarget(dir) {
  if (!aim.target || !aim.valid) return null;
  const P = ctx.player; dir.copy(tangentToward(P.up, aim.target));
  return aim.target.clone();
}
