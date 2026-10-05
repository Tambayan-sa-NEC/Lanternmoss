/* Per-frame combat update, in a fixed order: hero vitals -> casting (+ area aiming) -> aim -> projectiles -> enemies
   -> hazards -> companion -> effects -> combat HUD. */
import { ctx } from '../core/context.js';
import { updateFx } from '../fx/combatFx.js';
import { updateCombatHud } from '../ui/hud.js';
import { spellState, updateCasting } from './casting.js';
import { updatePlayerVitals } from './damage.js';
import { updateHazards } from './hazards.js';
import { targeting, updateAim } from './targeting.js';

export function updateCombat(dt, world, keys) {
  updatePlayerVitals(dt, world);
  updateCasting(dt, keys);
  updateAim();
  for (let i = ctx.projectiles.length - 1; i >= 0; i--) if (!ctx.projectiles[i].update(dt)) ctx.projectiles.splice(i, 1);
  for (let i = ctx.enemies.length - 1; i >= 0; i--) { const e = ctx.enemies[i]; e.update(dt); if (e.remove) { e.dispose(); ctx.enemies.splice(i, 1); } }
  updateHazards(dt);
  if (ctx.companion) ctx.companion.update(dt);
  updateFx(dt);
  updateCombatHud(dt, spellState, targeting.aim);
}
