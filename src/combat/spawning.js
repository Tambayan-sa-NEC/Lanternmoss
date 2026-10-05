/* Spawning: monsters live out in the wilds, never near the village or villagers. A planet's roster and boss lair
   draw from the SEEDED world rand, so they must be spawned right after the planet is generated. */
import { COMBAT } from '../config/combat.js';
import { WORLD } from '../config/game.js';
import { ctx } from '../core/context.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { freeOfColliders } from '../physics/colliders.js';
import { rand } from '../utils/random.js';
import { arcDist, offsetDir, randomDir } from '../utils/sphere.js';
import { spawnSpot } from '../world/placement.js';
import { ponds, slopeAt } from '../world/terrain.js';
import { enemyDef } from './enemyDefs.js';

export function addEnemy(type, dir) { const e = new Enemy(type, dir); ctx.enemies.push(e); return e; }

function enemySpot(world) {
  const { spawnDir, stoneCenter, houses } = world;
  for (let i = 0; i < 400; i++) {
    const d = randomDir();
    if (arcDist(d, spawnDir) < COMBAT.player.safeRadius + 11 || arcDist(d, stoneCenter) < 12) continue;
    if (houses.some(h => arcDist(d, h.dir) < 10) || ponds.some(p => arcDist(d, p.dir) < p.r + 2) || slopeAt(d) > 0.6) continue;
    if (world.lairDir && arcDist(d, world.lairDir) < WORLD.flats.lair[0]) continue;      // the boss's arena is its own
    if (!freeOfColliders(d, 1.2) || ctx.enemies.some(e => arcDist(d, e.home) < 6)) continue;
    return d;
  }
  return offsetDir(spawnDir, rand() * 6.28, 70);
}

/** Spawns a planet's roster (PLANETS[i].roster) in order: camps, pond dwellers, or spread over the wilds. Counts grow
    with the planet's size (WORLD.rosterScale). */
export function spawnRoster(world, roster) {
  const k = WORLD.rosterScale, more = x => Math.max(1, Math.round(x * k));
  const wildPonds = ponds.filter(p => arcDist(p.dir, world.spawnDir) > COMBAT.player.safeRadius + 8);   // pond dwellers gather around far ponds
  for (const g of roster) {
    if (g.groups) {
      for (let c = 0; c < more(g.groups); c++) { const camp = enemySpot(world); for (let i = 0; i < g.size; i++) addEnemy(g.type, i ? spawnSpot(camp, 1.2, 3, 0.6) : camp); }
    } else if (g.near === 'ponds') {
      for (let i = 0; i < more(g.count); i++) {
        const p = wildPonds[i % Math.max(1, wildPonds.length)];
        addEnemy(g.type, p ? spawnSpot(p.dir, p.r + 2.5, p.r + 6, 0.8) : enemySpot(world));
      }
    } else for (let i = 0; i < more(g.count); i++) addEnemy(g.type, enemySpot(world));
  }
}

/** The boss's lair: the flattened arena the world set aside (World.generate lairDir), else a clear far spot. */
function lairSpot(world) {
  if (world.lairDir) return world.lairDir.clone();
  const { spawnDir, houses } = world;
  for (let i = 0; i < 600; i++) {
    const d = randomDir();
    if (arcDist(d, spawnDir) < 70 || houses.some(h => arcDist(d, h.dir) < 12) || ponds.some(p => arcDist(d, p.dir) < p.r + 5)) continue;
    if (!freeOfColliders(d, 3.5) || ctx.enemies.some(e => arcDist(d, e.home) < 10)) continue;
    return d;
  }
  return offsetDir(spawnDir, rand() * 6.28, 95);
}

/** boss: PLANETS[i].boss, i.e. { type, trophy, ...overrides of that enemy's stats such as name or colours }.
    lair defaults to a new far-side spot; pass the previous one to bring the boss back to the same place. */
export function spawnBoss(world, { type, trophy: _trophy, ...overrides }, lair = lairSpot(world)) {
  const e = new Enemy(type, lair, { ...enemyDef(type), ...overrides });
  ctx.enemies.push(e); ctx.boss = e;
  return e;
}

/** Back to the start-of-adventure roster: summoned and non-respawning monsters (bosses too) go, the rest return home. */
export function resetEnemies() {
  for (let i = ctx.enemies.length - 1; i >= 0; i--) {
    const e = ctx.enemies[i];
    if (e.temporary || !e.def.respawn) { e.alive = false; e.dispose(); ctx.enemies.splice(i, 1); } else { e.spawn(e.home); e.hideTele(); }
  }
  ctx.boss = null;
}

/** Removes every monster at once (the planet is being replaced). */
export function clearEnemies() {
  for (const e of ctx.enemies) e.dispose();
  ctx.enemies.length = 0; ctx.boss = null;
}
