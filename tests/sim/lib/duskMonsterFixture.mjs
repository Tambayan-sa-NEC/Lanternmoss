// Duskhollow's real but unreleased roster (shadelings and mosslurks) in the borrowed village slot (30e).
// Development only: the authored `duskhollow` entry and its released: false flag are never touched.
import { installDuskVillageFixture } from './duskVillageFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import duskhollow from '../../../src/config/planets/duskhollow.js';
export function installDuskMonsterFixture() {
  const fixture = installDuskVillageFixture();
  Object.assign(PLANETS[0], { roster: structuredClone(duskhollow.roster) });
  return fixture;
}
