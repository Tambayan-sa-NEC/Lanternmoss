/* Spawning: monsters live out in the wilds, never near the village or villagers.
   The initial spawn draws from the SEEDED world rand, so it must run right after world generation. */
import { COMBAT } from '../config/combat.js';
import { ctx } from '../core/context.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { freeOfColliders } from '../physics/colliders.js';
import { rand } from '../utils/random.js';
import { arcDist, offsetDir, randomDir } from '../utils/sphere.js';
import { spawnSpot } from '../world/placement.js';
import { ponds } from '../world/terrain.js';

export function addEnemy(type, dir) { const e = new Enemy(type, dir); ctx.enemies.push(e); return e; }

function enemySpot(world) {
  const { spawnDir, stoneCenter, houses } = world;
  for (let i = 0; i < 400; i++) {
    const d = randomDir();
    if (arcDist(d, spawnDir) < COMBAT.player.safeRadius + 11 || arcDist(d, stoneCenter) < 12) continue;
    if (houses.some(h => arcDist(d, h.dir) < 10) || ponds.some(p => arcDist(d, p.dir) < p.r + 2)) continue;
    if (!freeOfColliders(d, 1.2) || ctx.enemies.some(e => arcDist(d, e.home) < 6)) continue;
    return d;
  }
  return offsetDir(spawnDir, rand() * 6.28, 70);
}

export function spawnInitialEnemies(world) {
  const S = COMBAT.spawns;
  for (let c = 0; c < S.goblinCamps; c++) { const camp = enemySpot(world); for (let i = 0; i < S.goblinsPerCamp; i++) addEnemy('goblin', i ? spawnSpot(camp, 1.2, 3, 0.6) : camp); }
  for (let i = 0; i < S.ogres; i++) addEnemy('ogre', enemySpot(world));
  for (let i = 0; i < S.wisps; i++) addEnemy('wisp', enemySpot(world));
  const wildPonds = ponds.filter(p => arcDist(p.dir, world.spawnDir) > COMBAT.player.safeRadius + 8);   // slimes gather around far ponds
  for (let i = 0; i < S.slimes; i++) {
    const p = wildPonds[i % Math.max(1, wildPonds.length)];
    addEnemy('slime', p ? spawnSpot(p.dir, p.r + 2.5, p.r + 6, 0.8) : enemySpot(world));
  }
}

/** Back to the start-of-adventure roster: summoned and non-respawning monsters go, the rest return home. */
export function resetEnemies() {
  for (let i = ctx.enemies.length - 1; i >= 0; i--) {
    const e = ctx.enemies[i];
    if (e.temporary || !e.def.respawn) { e.alive = false; e.dispose(); ctx.enemies.splice(i, 1); } else { e.spawn(e.home); e.hideTele(); }
  }
}
