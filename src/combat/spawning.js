/* Spawning: monsters live out in the wilds, never near the village or villagers. A planet's roster and boss lair
   draw from the SEEDED world rand, so they must be spawned right after the planet is generated. Coastal roster
   groups (near: 'beach' | 'shallows' | 'surf') draw from their own stream seeded by the planet, so adding them never
   moves the scenery, nodes or chests generated after them. */
import { COMBAT } from '../config/combat.js';
import { WORLD } from '../config/game.js';
import { ctx } from '../core/context.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { freeOfColliders } from '../physics/colliders.js';
import { mulberry32, rand } from '../utils/random.js';
import { arcDist, offsetDir, randomDir } from '../utils/sphere.js';
import { PLANETS } from '../config/planets.js';
import { spawnDrySpot } from '../world/placement.js';
import { seaLevel } from '../world/physics.js';
import { dryGround, groundHeight, ponds, slopeAt, waterAt } from '../world/terrain.js';
import { enemyDef } from './enemyDefs.js';

/** overrides: per-planet changes to the type's stats or look (a returning wisp's sea-green, say). */
export function addEnemy(type, dir, overrides = null) { const e = new Enemy(type, dir, overrides ? { ...enemyDef(type), ...overrides } : enemyDef(type)); ctx.enemies.push(e); return e; }
const addLandEnemy = (type, dir, overrides) => dir && dryGround(dir) ? addEnemy(type, dir, overrides) : null;

/** Where coastal monsters live, against the declared high water H (ground height ranges, metres from the centre):
    beach    dry even at high water, at most 2.5 m above it (the high-tide line)
    shallows always water, a little to a few metres deep (the flats flood above it)
    surf     deep even at low water, with dry land within 9 m (ambush range from the shore) */
const COAST = {
  beach: (d, H) => { const h = groundHeight(d); return h > H + 0.15 && h < H + 2.5 && dryGround(d, 0.8, { high: true }); },
  shallows: (d, H) => { const h = groundHeight(d); return h > H - 3.9 && h < H - 2.1; },
  surf: (d, H) => { const h = groundHeight(d); if (h < H - 4.1 || h > H - 2.7) return false;
    for (let r = 3; r <= 9; r += 2) for (let a = 0; a < 6.28; a += 0.5) if (!waterAt(offsetDir(d, a, r), { high: true })) return true;
    return false; },
};
function coastSpot(world, kind, random, spacing) {
  const H = seaLevel(true), { spawnDir, houses } = world, fits = COAST[kind];
  if (H === null) return null;
  for (let i = 0; i < 4000; i++) {
    const d = randomDir(random);
    if (arcDist(d, spawnDir) < COMBAT.player.safeRadius + 11 || (world.lairDir && arcDist(d, world.lairDir) < WORLD.flats.lair[0])) continue;
    if (houses.some(h => arcDist(d, h.dir) < 10) || ctx.enemies.some(e => arcDist(d, e.home) < spacing) || !fits(d, H)) continue;
    if (kind === 'beach' && !freeOfColliders(d, 1.2)) continue;
    return d;
  }
  return null;
}
function campMate(camp, kind, random) {
  for (let k = 0; k < 40; k++) { const d = offsetDir(camp, random() * 6.28, 1.5 + random() * 2); if (COAST[kind](d, seaLevel(true)) && freeOfColliders(d, 0.8)) return d; }
  return null;
}
function spawnCoastal(world, g, more) {
  const random = mulberry32(((PLANETS[ctx.planet]?.seed ?? 0) ^ 0x7ede) + ctx.enemies.length);
  if (g.groups) for (let c = 0; c < more(g.groups); c++) {
    const camp = coastSpot(world, g.near, random, 9); if (!camp) continue;
    for (let i = 0; i < g.size; i++) { const d = i ? campMate(camp, g.near, random) : camp; if (d) addEnemy(g.type, d, g.overrides); }
  } else for (let i = 0; i < more(g.count); i++) { const d = coastSpot(world, g.near, random, 6); if (d) addEnemy(g.type, d, g.overrides); }
}

function enemySpot(world) {
  const { spawnDir, stoneCenter, houses } = world;
  for (let i = 0; i < 400; i++) {
    const d = randomDir();
    if (arcDist(d, spawnDir) < COMBAT.player.safeRadius + 11 || arcDist(d, stoneCenter) < 12) continue;
    if (houses.some(h => arcDist(d, h.dir) < 10) || ponds.some(p => arcDist(d, p.dir) < p.r + 2) || !dryGround(d, 1.2) || slopeAt(d) > 0.6) continue;
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
    if (COAST[g.near]) spawnCoastal(world, g, more);
    else if (g.groups) {
      for (let c = 0; c < more(g.groups); c++) { const camp = enemySpot(world); for (let i = 0; i < g.size; i++) addLandEnemy(g.type, i ? spawnDrySpot(camp, 1.2, 3, 0.6, rand) : camp, g.overrides); }
    } else if (g.near === 'ponds') {
      for (let i = 0; i < more(g.count); i++) {
        const p = wildPonds[i % Math.max(1, wildPonds.length)];
        addLandEnemy(g.type, p ? spawnDrySpot(p.dir, p.r + 2.5, p.r + 6, 0.8) : enemySpot(world), g.overrides);
      }
    } else for (let i = 0; i < more(g.count); i++) addLandEnemy(g.type, enemySpot(world), g.overrides);
  }
}

/** The boss's lair: the flattened arena the world set aside (World.generate lairDir), else a clear far spot. */
function lairSpot(world) {
  if (world.lairDir) return world.lairDir.clone();
  const { spawnDir, houses } = world;
  for (let i = 0; i < 600; i++) {
    const d = randomDir();
    if (arcDist(d, spawnDir) < 70 || houses.some(h => arcDist(d, h.dir) < 12) || ponds.some(p => arcDist(d, p.dir) < p.r + 5) || !dryGround(d, 3.5)) continue;
    if (!freeOfColliders(d, 3.5) || ctx.enemies.some(e => arcDist(d, e.home) < 10)) continue;
    return d;
  }
  return offsetDir(spawnDir, rand() * 6.28, 95);
}

/** boss: PLANETS[i].boss, i.e. { type, trophy, ...overrides of that enemy's stats such as name or colours }.
    lair defaults to a new far-side spot; pass the previous one to bring the boss back to the same place. */
export function spawnBoss(world, { type, trophy: _trophy, summon: _summon, arena: _arena, ...overrides }, lair = lairSpot(world)) {
  const e = new Enemy(type, lair, { ...enemyDef(type), ...overrides });
  ctx.enemies.push(e); ctx.boss = e;
  return e;
}

/** A planet's mini bosses (PLANETS[i].miniBosses = [{ type, near: 'lake' | 'far', overrides }]): the hydra on the bank
    of the lake farthest from the village, others far out in the wilds, away from the lair. */
export function spawnMiniBosses(world, list = []) {
  const out = [];
  for (const m of list) {
    let dir = null;
    if (m.near === 'lake') {
      const lakes = ponds.filter(p => p.r >= 6).sort((a, b) => arcDist(b.dir, world.spawnDir) - arcDist(a.dir, world.spawnDir));
      const lake = lakes[0];
      if (lake) for (let i = 0; i < 40 && !dir; i++) { const d = offsetDir(lake.dir, rand() * 6.28, lake.r + 3.5); if (freeOfColliders(d, 2) && dryGround(d, 2) && slopeAt(d) < 0.5) dir = d; }
    }
    for (let i = 0; i < 300 && !dir; i++) {
      const d = randomDir();
      if (arcDist(d, world.spawnDir) < 60 || (world.lairDir && arcDist(d, world.lairDir) < 45) || slopeAt(d) > 0.4) continue;
      if (!freeOfColliders(d, 2.5) || ponds.some(p => arcDist(d, p.dir) < p.r + 4) || !dryGround(d, 2.5) || out.some(e => arcDist(d, e.home) < 40)) continue;
      dir = d;
    }
    if (!dir) continue;
    const e = new Enemy(m.type, dir, { ...enemyDef(m.type), ...(m.overrides ?? {}) });
    ctx.enemies.push(e); out.push(e);
  }
  return out;
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
