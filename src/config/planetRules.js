/* Pure catalog rules. The ordered catalog may contain unfinished worlds; runtime lists never do. */
export const releasedPlanets = catalog => catalog.filter(p => p.released === true);
export const campaignPlanets = catalog => releasedPlanets(catalog).filter(p => !p.secret);
export const nextCampaignPlanet = (catalog, id) => {
  const main = catalog.filter(p => !p.secret), i = main.findIndex(p => p.id === id);
  return i >= 0 && main[i + 1]?.released === true ? main[i + 1] : null;
};
export const campaignComplete = (catalog, defeated) => {
  const main = campaignPlanets(catalog), cleared = new Set(defeated);
  return main.length > 0 && main.every(p => cleared.has(p.id));
};

/** A secret needs an explicit gate. Keys do not participate. Its own boss win keeps return travel open. */
export function secretUnlocked(planet, defeated, { night = false, rareGifts = [] } = {}) {
  if (!planet.secret) return true;
  const cleared = new Set(defeated);
  if (cleared.has(planet.id)) return true;
  const gate = planet.unlock;
  if (!gate || !Array.isArray(gate.bosses) || !gate.bosses.length) return false;
  const gifts = new Set(rareGifts);
  return gate.bosses.every(id => cleared.has(id)) && (!gate.night || night)
    && (gate.rareGifts ?? []).every(id => gifts.has(id));
}

/** Main worlds grow their roster; a deliberately small world declares its own explicit population floor. */
export function rosterPopulation(planet) {
  return planet.roster.reduce((n, g) => n + (g.groups ? g.groups * g.size : g.count), 0);
}
export function populationProblem(planet, previous) {
  const floor = planet.population?.min ?? (previous ? rosterPopulation(previous) : 1);
  if (!Number.isInteger(floor) || floor < 1) return 'population.min must be a positive integer';
  if (planet.population && !planet.secret) return 'only a small secret world may override the population floor';
  return rosterPopulation(planet) >= floor ? null : `roster population must be at least ${floor}`;
}

/** Fail early on ambiguous metadata; full world-content acceptance belongs to TODO 26d. */
export function validatePlanetCatalog(catalog) {
  const ids = new Set();
  for (const p of catalog) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(p.id) || ids.has(p.id)) throw new Error(`Invalid or duplicate planet id: ${p.id}`);
    if (!p.name || !Number.isInteger(p.act) || p.act < 1 || typeof p.released !== 'boolean' || typeof p.secret !== 'boolean')
      throw new Error(`Invalid planet metadata: ${p.id}`);
    if (p.released && (!Number.isInteger(p.seed) || !p.palette || !p.terrain || !p.scale || !Array.isArray(p.roster) || !p.boss?.type))
      throw new Error(`Released planet lacks generation data: ${p.id}`);
    ids.add(p.id);
  }
  if (!catalog[0]?.released || catalog[0].secret) throw new Error('The starting world must be released and non-secret');
  return catalog;
}
