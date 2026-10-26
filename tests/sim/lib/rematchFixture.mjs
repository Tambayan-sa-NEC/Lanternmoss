// A finished rematch kit on an already released boss, for the 31a lifecycle checks.
// Development only: no world ships with a rematch kit until its own stage (31b-31f) writes one, so the checks mark
// one ready here rather than the infrastructure quietly exposing an unfinished fight.
import { COMBAT } from '../../../src/config/combat.js';
export function installRematchFixture(type = 'gloomcap') {
  const def = COMBAT.enemies[type], had = Object.hasOwn(def, 'rematch'), original = def.rematch;
  def.rematch = { kit: 'test' };
  return { type, restore() { if (had) def.rematch = original; else delete def.rematch; } };
}
