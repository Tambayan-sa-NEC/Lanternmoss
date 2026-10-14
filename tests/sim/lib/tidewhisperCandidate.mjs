// Test-only release candidate: use the real fourth world, ids and scaling without changing its shipped release flag.
// Install BEFORE importing Game/save/achievement modules: some owners derive their schemas at module initialization.
import { PLANET_CATALOG, PLANETS, CAMPAIGN_PLANETS } from '../../../src/config/planets.js';
import { releasedPlanets, campaignPlanets } from '../../../src/config/planetRules.js';
export function installTidewhisperCandidate() {
  const tide = PLANET_CATALOG.find(p => p.id === 'tidewhisper'), released = tide.released;
  const planets = [...PLANETS], campaign = [...CAMPAIGN_PLANETS];
  tide.released = true;
  PLANETS.splice(0, PLANETS.length, ...releasedPlanets(PLANET_CATALOG));
  CAMPAIGN_PLANETS.splice(0, CAMPAIGN_PLANETS.length, ...campaignPlanets(PLANET_CATALOG));
  return { restore() {
    tide.released = released; PLANETS.splice(0, PLANETS.length, ...planets);
    CAMPAIGN_PLANETS.splice(0, CAMPAIGN_PLANETS.length, ...campaign);
  } };
}
