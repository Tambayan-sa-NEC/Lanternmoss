// Duskhollow's real but unreleased boss, Umbra, in the borrowed slot (30h), with her own trophy, arena ring and gate.
// Development only: the authored `duskhollow` entry and its released: false flag are never touched.
import { installDuskBossFixture } from './duskBossFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import duskhollow from '../../../src/config/planets/duskhollow.js';
export function installDuskUmbraFixture() {
  const fixture = installDuskBossFixture();
  Object.assign(PLANETS[0], { boss: structuredClone(duskhollow.boss) });
  return fixture;
}
