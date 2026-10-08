/* Enemy stats for the current planet: base values from COMBAT.enemies multiplied by the planet's difficulty scale
   (config/planets.js). scaleEnemyDef is pure and unit-tested. */
import { COMBAT } from '../config/combat.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';

/** Stat key -> which planet scale factor multiplies it (also inside nested tables such as a boss's attacks). */
const SCALED = {
  hp: 'hp', heal: 'hp',
  damage: 'damage',
  speed: 'speed', chargeSpeed: 'speed', projectileSpeed: 'speed',
  cooldown: 'cooldown', contactCooldown: 'cooldown', healCooldown: 'cooldown', shieldCooldown: 'cooldown',
  xp: 'xp',
};

/** A copy of def with every scaled stat multiplied; returns def itself when every factor is 1. Never mutates def. */
export function scaleEnemyDef(def, scale) {
  if (Object.values(scale).every(v => v === 1)) return def;
  const walk = obj => {
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      const factor = typeof v === 'number' && SCALED[k] ? scale[SCALED[k]] : undefined;
      if (factor !== undefined) out[k] = k === 'xp' ? Math.round(v * factor) : v * factor;
      else out[k] = v && typeof v === 'object' ? walk(v) : v;
    }
    return out;
  };
  return walk(def);
}

const cache = new Map();
/** The stats an enemy of `type` spawns with on the current planet. */
export function enemyDef(type) {
  const key = `${ctx.planet}:${type}`;
  if (!cache.has(key)) cache.set(key, scaleEnemyDef(COMBAT.enemies[type], PLANETS[ctx.planet].scale));
  return cache.get(key);
}
