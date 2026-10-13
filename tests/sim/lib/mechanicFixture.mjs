// Development-only probe shared by the headless and browser checks. Never imported by production source.
import { registerMechanic } from '../../../src/world/mechanics/index.js';
import { gameEvents } from '../../../src/core/events.js';

export function installMechanicFixture(id = 'lifecycleProbe') {
  const records = [], instances = [], live = new Set();
  const bounded = (value, max = 1e9) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
  const clean = raw => ({ elapsed: bounded(raw?.elapsed), skipped: bounded(raw?.skipped), away: bounded(raw?.away),
    marker: Math.floor(bounded(raw?.marker, 999)) });
  const unregister = registerMechanic(id, { clean, create(env) {
    let state = clean(null), updates = 0;
    const instance = {
      env, get updates() { return updates; },
      setMarker(value) { state.marker = value; },
      load(value) { state = clean(value); records.push(['load', env.planet.id, state.marker]); },
      toJSON() { return state; },
      enter() {
        if (!env.world.weather) throw new Error('The mechanic entered before the world was ready');
        records.push(['enter', env.planet.id, state.marker, state.away]);
        live.add(instance); gameEvents.addEventListener('mechanicfixturepoke', poke);
      },
      update(dt) { updates++; state.elapsed += dt; },
      advance(seconds, { reason }) {
        state.elapsed += seconds;
        if (reason === 'away') state.away += seconds; else state.skipped += seconds;
        records.push(['advance', env.planet.id, reason, seconds]);
      },
      exit() { records.push(['exit', env.planet.id]); live.delete(instance); gameEvents.removeEventListener('mechanicfixturepoke', poke); },
    };
    const poke = () => { state.marker++; };
    records.push(['create', env.planet.id]); instances.push(instance); return instance;
  } });
  return { id, records, instances, live, unregister };
}
