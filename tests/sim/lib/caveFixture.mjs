// Test-only cave enemies and placement for sims and browser checks. Never changes release flags or the surface roster.
import { ctx } from '../../../src/core/context.js';
import { Dungeons } from '../../../src/gameplay/Dungeons.js';
import { Enemy } from '../../../src/entities/enemies/Enemy.js';
import { enemyDef } from '../../../src/combat/enemyDefs.js';
import { clearHazards } from '../../../src/combat/hazards.js';
import { clearTargets } from '../../../src/combat/targeting.js';
import { kit, resetCooldowns } from '../../../src/combat/casting.js';

export function placeCaveHero(x, z) {
  const s = Dungeons.inside;
  s.x = x; s.z = z; Dungeons.placeHero();
  ctx.player.vel.set(0, 0, 0); ctx.player.knock.set(0, 0, 0); ctx.player.fwd.set(0, 0, -1);
}
export function spawnCaveEnemy(type, x, z, { held = false, ...overrides } = {}) {
  if (!ctx.room) throw new Error('A cave combat fixture needs a room');
  const p = Dungeons.inside.built.toWorld(x, z);
  const def = { ...enemyDef(type), xp: 0, respawn: 0, ...overrides };
  const e = new Enemy(type, p, def, ctx.room); e.temporary = true; e.owner = { fixture: true };
  if (held) e.stunT = 1e9;
  ctx.enemies.push(e); return e;
}
export function clearCaveCombat() {
  for (const e of ctx.enemies) e.dispose(); ctx.enemies = [];
  for (const p of ctx.projectiles) p.dispose(); ctx.projectiles = [];
  clearHazards(); clearTargets(); ctx.player.clearTimers(); ctx.player.knock.set(0, 0, 0);
  ctx.player.hp = ctx.player.stats.maxHp; ctx.player.mana = ctx.player.stats.maxMana; resetCooldowns(kit());
}
