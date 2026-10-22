// Duskhollow's real but unreleased mini boss, Grandmother Gloomweaver, in the borrowed slot (30g).
// Development only: the authored `duskhollow` entry and its released: false flag are never touched.
import { installDuskMonsterFixture } from './duskMonsterFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import duskhollow from '../../../src/config/planets/duskhollow.js';
export function installDuskBossFixture() {
  const fixture = installDuskMonsterFixture();
  Object.assign(PLANETS[0], { miniBosses: structuredClone(duskhollow.miniBosses),
    resources: structuredClone(duskhollow.resources) });   // the rare vein she guards comes with her
  return fixture;
}
