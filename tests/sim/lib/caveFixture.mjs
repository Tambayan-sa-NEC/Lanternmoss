// Test-only cave enemies and placement for sims and browser checks. Never changes release flags or the surface roster.
import { ctx } from '../../../src/core/context.js';
import { Dungeons } from '../../../src/gameplay/Dungeons.js';
import { Enemy } from '../../../src/entities/enemies/Enemy.js';
import { enemyDef } from '../../../src/combat/enemyDefs.js';
import { clearHazards } from '../../../src/combat/hazards.js';
import { clearTargets } from '../../../src/combat/targeting.js';
import { kit, resetCooldowns } from '../../../src/combat/casting.js';
import { CavePuzzles } from '../../../src/gameplay/CavePuzzles.js';
import { CaveRewards } from '../../../src/gameplay/CaveRewards.js';

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

/** Test-only: solve whichever puzzle this cave set, take its key and turn the ward, so a sim whose subject is not the
    puzzle (traversal, rewards) can reach the end room. Uses the real runtime steps; changes no release flag. */
export function openCaveWard() {
  const Q = CavePuzzles;
  if (!Q.built) throw new Error('openCaveWard needs a cave to be entered');
  for (const sw of Q.switches) Q.light(sw);
  for (const st of Q.stones) {                                   // set each stone down on its own plate
    const pl = Q.plates.find(p => Math.abs(p.x - st.x) < 1e-6) ?? Q.plates[0];
    st.root.position.set(pl.x, 0, pl.z); Q.built.toWorld(pl.x, pl.z, 0, st.body.pos);
    Q.placed.set(st.id, { x: pl.x, z: pl.z });
  }
  Q.checkPlates();
  Q.openKeyChest(); Q.turnDoor();
  return Q.door.open;
}

/** Test-only: keep this cave's wandering monsters (29f) out of the way, for checks whose subject is not combat.
    Clears the roster so no room populates, and disposes any already standing. Changes no release flag. */
export function clearCaveRoster() {
  CaveRewards.monsters = [];
  for (let i = ctx.enemies.length - 1; i >= 0; i--) {
    const e = ctx.enemies[i];
    if (e.caveRoom || e.caveGuardian) { e.dispose(); ctx.enemies.splice(i, 1); }
  }
  CavePuzzles.guardian = null;
}
