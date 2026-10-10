import { PLANETS } from '../config/planets.js';

/** Boss wins open their world and its successor. A key opens only the next locked world or the route home. */
export function portalDestinations(currentId, defeated, stranded, keys = 0) {
  const cleared = new Set(defeated);
  const unlocked = i => i === 0 || cleared.has(PLANETS[i].id) || cleared.has(PLANETS[i - 1].id);
  const frontier = PLANETS.findIndex((p, i) => !unlocked(i));
  const away = stranded?.at === currentId && !cleared.has(currentId);
  return PLANETS.map((planet, i) => {
    const current = planet.id === currentId, free = unlocked(i) && !away;
    const reachable = free || i === frontier || away && (unlocked(i) || planet.id === stranded.from);
    const cost = current || free ? 0 : 1;
    const enabled = !current && reachable && (cost === 0 || keys > 0);
    const reason = current ? 'You are here' : free ? 'Open portal · free travel'
      : reachable ? `1 Wayfarer's Key · ${unlocked(i) ? 'open the way home' : 'one-way trip; another key or its boss opens the way home'}`
        : 'Defeat the earlier bosses to reach this world';
    return { id: planet.id, name: planet.name, tagline: planet.tagline, current, free, home: unlocked(i), cost, enabled, reason };
  });
}
