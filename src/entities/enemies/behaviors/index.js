/* def.ai -> behaviour module for the newer enemy types. A behaviour is
     { think(e, dt, dist) -> ground speed (required; sets e.move),
       init(e), reset(e) on (re)spawn, update(e, dt, collisionNormal) after moving, animate(e, dt), onDie(e), dispose(e) }
   The original AIs ('melee', 'ranged', 'hopper') are still methods on Enemy. */
import { bomber } from './bomber.js';
import { boss } from './boss.js';
import { burrower } from './burrower.js';
import { charger } from './charger.js';
import { support } from './support.js';

export const BEHAVIORS = { bomber, charger, burrower, support, boss };
