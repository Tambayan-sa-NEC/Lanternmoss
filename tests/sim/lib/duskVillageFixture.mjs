// Duskhollow's real but unreleased village, Wick, his quest and Umbra's gate in a borrowed slot (30d).
// Development only: the authored `duskhollow` entry and its released: false flag are never touched, and the quest's
// home planet is re-pointed at the borrowed id exactly as the coastal village fixture does for Marlo's.
import { installDuskhollowFixture } from './duskhollowFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import duskhollow from '../../../src/config/planets/duskhollow.js';
import { QUESTS } from '../../../src/config/quests.js';
export function installDuskVillageFixture() {
  const fixture = installDuskhollowFixture(), origin = QUESTS.oldRoad.planet;
  Object.assign(PLANETS[0], { npcs: structuredClone(duskhollow.npcs), houses: structuredClone(duskhollow.houses),
    boss: { ...PLANETS[0].boss, summon: { ...duskhollow.boss.summon } } });
  QUESTS.oldRoad.planet = PLANETS[0].id;
  return { restore() { QUESTS.oldRoad.planet = origin; fixture.restore(); } };
}
