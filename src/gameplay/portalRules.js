import { PLANET_CATALOG } from '../config/planets.js';
import { releasedPlanets, secretUnlocked } from '../config/planetRules.js';

/** Boss wins open their world and its successor. A key opens only the next locked world or the route home. */
export function portalDestinations(currentId, defeated, stranded, keys = 0, { catalog = PLANET_CATALOG, ...unlockState } = {}) {
  const planets = releasedPlanets(catalog), main = catalog.filter(p => !p.secret);
  if (!planets.some(p => p.id === currentId)) return [];
  const cleared = new Set(defeated);
  const unlocked = p => {
    if (p.secret) return secretUnlocked(p, cleared, unlockState);
    const i = main.indexOf(p);
    return i === 0 || cleared.has(p.id) || main[i - 1]?.released === true && cleared.has(main[i - 1].id);
  };
  // An unreleased main world is a barrier, even if a later catalog entry has accidentally been released.
  const frontier = main.find(p => !p.released || !unlocked(p));
  const away = stranded?.at === currentId && !cleared.has(currentId);
  return planets.map(planet => {
    const current = planet.id === currentId, home = unlocked(planet), gateOpen = !planet.secret || home;
    const free = gateOpen && home && !away;
    const reachable = gateOpen && (free || !planet.secret && planet === frontier || away && (home || planet.id === stranded.from));
    const cost = current || free ? 0 : 1;
    const enabled = !current && reachable && (cost === 0 || keys > 0);
    const reason = current ? 'You are here' : !gateOpen ? 'Discover the secret lantern gate to reach this world'
      : free ? 'Open portal · free travel'
      : reachable ? `1 Wayfarer's Key · ${home ? 'open the way home' : 'one-way trip; another key or its boss opens the way home'}`
        : 'Defeat the earlier bosses to reach this world';
    return { id: planet.id, name: gateOpen || current ? planet.name : '?', tagline: gateOpen || current ? planet.tagline : 'An undiscovered world',
      current, free, home, cost, enabled, reason };
  });
}
