// Test-only catalog substitute: borrow an already released fixture's metadata, with the fourth world's ids/content.
// Never mutate the authored Tidewhisper object or its release flag. This does not prove production release readiness.
// Install BEFORE importing Game/save/achievement modules: some owners derive their schemas at module initialization.
import { PLANET_CATALOG, PLANETS, CAMPAIGN_PLANETS } from '../../../src/config/planets.js';
import { releasedPlanets, campaignPlanets } from '../../../src/config/planetRules.js';
export function installTidewhisperCandidate() {
  const index = PLANET_CATALOG.findIndex(p => p.id === 'tidewhisper'), tide = PLANET_CATALOG[index];
  const planets = [...PLANETS], campaign = [...CAMPAIGN_PLANETS];
  const { released, ...content } = tide;
  const candidate = { released: PLANETS[0].released, ...structuredClone(content) };
  PLANET_CATALOG[index] = candidate;
  PLANETS.splice(0, PLANETS.length, ...releasedPlanets(PLANET_CATALOG));
  CAMPAIGN_PLANETS.splice(0, CAMPAIGN_PLANETS.length, ...campaignPlanets(PLANET_CATALOG));
  return { restore() {
    PLANET_CATALOG[index] = tide; PLANETS.splice(0, PLANETS.length, ...planets);
    CAMPAIGN_PLANETS.splice(0, CAMPAIGN_PLANETS.length, ...campaign);
  } };
}
