// Development-only rule controls. No production import and no Tidewhisper content or timed tide simulation.
import { registerMechanic } from '../../../src/world/mechanics/index.js';
import { PLANET_RADIUS as R } from '../../../src/config/game.js';

export function installPhysicsFixture(id = 'physicsProbe') {
  const cleanNumber = (v, fallback, min, max) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  const clean = v => ({ gravity: cleanNumber(v?.gravity, 1, 0.05, 4), waterOffset: cleanNumber(v?.waterOffset, 0, -12, 12),
    seaLevel: v?.seaLevel == null ? null : cleanNumber(v.seaLevel, null, R - 24, R + 24) });
  const live = new Set();
  const unregister = registerMechanic(id, { clean, create(env) {
    let state = clean(null), updates = 0;
    const apply = () => { env.world.physics.set(state); env.world.syncPhysics(); };
    const instance = { get updates() { return updates; },
      set(values) { const next = clean({ ...state, ...values }); env.world.physics.set(next); state = next; env.world.syncPhysics(); },
      load(value) { state = clean(value); }, toJSON() { return state; },
      enter() { apply(); live.add(instance); }, update() { updates++; apply(); }, advance() {},
      exit() { live.delete(instance); env.world.physics.set({ gravity: env.planet.physics?.gravity ?? 1,
        waterOffset: env.planet.physics?.waterOffset ?? 0, seaLevel: env.planet.physics?.seaLevel ?? null }); },
    };
    return instance;
  } });
  return { id, live, unregister };
}
