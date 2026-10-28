// Test-only fifth-world catalog substitute. Install before importing Game or save schemas.
// The authored entry and release flag remain untouched until 30i acceptance passes.
import { PLANET_CATALOG, PLANETS, CAMPAIGN_PLANETS } from '../../../src/config/planets.js';
import { releasedPlanets, campaignPlanets } from '../../../src/config/planetRules.js';

export function installDuskhollowCandidate() {
  const index = PLANET_CATALOG.findIndex(p => p.id === 'duskhollow');
  const original = PLANET_CATALOG[index];
  const planets = [...PLANETS], campaign = [...CAMPAIGN_PLANETS];
  const { released, ...content } = original;
  PLANET_CATALOG[index] = { released: true, ...structuredClone(content) };
  PLANETS.splice(0, PLANETS.length, ...releasedPlanets(PLANET_CATALOG));
  CAMPAIGN_PLANETS.splice(0, CAMPAIGN_PLANETS.length, ...campaignPlanets(PLANET_CATALOG));
  return { restore() {
    PLANET_CATALOG[index] = original;
    PLANETS.splice(0, PLANETS.length, ...planets);
    CAMPAIGN_PLANETS.splice(0, CAMPAIGN_PLANETS.length, ...campaign);
  } };
}
