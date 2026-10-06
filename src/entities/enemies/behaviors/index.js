/* def.behavior ?? def.ai -> behaviour module for the newer enemy types. A behaviour is
     { think(e, dt, dist) -> ground speed (required; sets e.move),
       init(e), reset(e) on (re)spawn, update(e, dt, collisionNormal) after moving, animate(e, dt), onDie(e), dispose(e) }
   The original AIs ('melee', 'ranged', 'hopper') are still methods on Enemy. Planet bosses all have ai 'boss' and pick
   their own AI with def.behavior (each a kit on the shared boss framework in ./boss/core.js). seal = a lair seal (animate only). */
import { bomber } from './bomber.js';
import { demonLord } from './boss/demonLord.js';
import { dragon } from './boss/dragon.js';
import { gloomcap } from './boss/gloomcap.js';
import { basilisk } from './boss/basilisk.js';
import { hydra } from './boss/hydra.js';
import { burrower } from './burrower.js';
import { charger } from './charger.js';
import { support } from './support.js';
import { ctx } from '../../../core/context.js';

/** Lair seals (def.static): the rune crystal turns and bobs; a hit makes the stone shudder. */
const seal = {
  animate(e, dt) {
    e.crystal.rotation.y += dt * 1.6; e.crystal.position.y = 2.85 + Math.sin(ctx.time * 2 + e.seed) * 0.12;
    e.body.rotation.z = Math.sin(ctx.time * 60) * 0.04 * e.hitPop;
  },
};

export const BEHAVIORS = { bomber, charger, burrower, support, boss: gloomcap, gloomcap, dragon, demonLord, seal, hydra, basilisk };
