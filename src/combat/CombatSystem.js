/* Per-frame combat update, in a fixed order: hero vitals -> casting (+ area aiming) -> aim -> projectiles -> enemies
   -> hazards -> companion -> effects -> combat HUD. */
import { ctx } from '../core/context.js';
import { updateFx } from '../fx/combatFx.js';
import { Pets } from '../gameplay/Pets.js';
import { updateCombatHud } from '../ui/hud.js';
import { spellState, updateCasting } from './casting.js';
import { updatePlayerVitals } from './damage.js';
import { updateHazards } from './hazards.js';
import { targeting, updateAim } from './targeting.js';
import { peaceful } from './space.js';

export function updateCombat(dt, world, keys) {
  const space = ctx.room;
  updatePlayerVitals(dt, world);
  updateCasting(dt, keys);
  updateAim();
  for (let i = ctx.projectiles.length - 1; i >= 0; i--) {
    const p = ctx.projectiles[i], live = p.update(dt);
    if (ctx.room !== space) return;   // a lethal hit can leave and dispose the room during this callback
    if (!live) ctx.projectiles.splice(i, 1);
  }
  for (let i = ctx.enemies.length - 1; i >= 0; i--) {
    const e = ctx.enemies[i]; e.update(dt);
    if (ctx.room !== space) return;
    if (e.remove) { e.dispose(); ctx.enemies.splice(i, 1); }
  }
  updateHazards(dt);
  if (ctx.room !== space) return;
  if (ctx.companion && !peaceful()) ctx.companion.update(dt);
  Pets.update(dt);
  updateFx(dt);
  updateCombatHud(dt, spellState, targeting.aim);
}
