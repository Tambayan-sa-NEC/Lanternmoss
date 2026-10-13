/* Daily phase belongs to the adventure clock. Only the lagoon's bounded drain timer needs a save owner. */
import { DAY } from '../../config/day.js';
import { dryGround } from '../terrain.js';

export function tideAt(seconds, config) {
  const phase = ((seconds / DAY.length) % 1 + 1) % 1, angle = (phase - config.lowAt) * Math.PI * 2;
  const amount = (1 - Math.cos(angle)) / 2;
  return { phase, amount, level: config.low + (config.high - config.low) * amount,
    label: amount <= 0.25 ? 'Low tide' : amount >= 0.75 ? 'High tide' : Math.sin(angle) > 0 ? 'Rising tide' : 'Falling tide' };
}
export const tides = {
  clean(value) { return { drainRemaining: typeof value?.drainRemaining === 'number' && Number.isFinite(value.drainRemaining) ? Math.max(0, Math.min(DAY.length, value.drainRemaining)) : 0 }; },
  create(env) {
    let state = tides.clean(null);
    const config = env.planet.tides;
    const apply = () => {
      const level = tideAt(env.clock(), config).level;
      env.world.physics.set({ seaLevel: level, regions: { lagoon: state.drainRemaining > 0 ? config.drainLevel : level } });
      env.world.syncPhysics();
    };
    const advance = seconds => { state.drainRemaining = Math.max(0, state.drainRemaining - seconds); apply(); };
    return {
      get status() { return { ...tideAt(env.clock(), config), causewayOpen: dryGround(env.world.coast.causeway), lagoonDrained: state.drainRemaining > 0 }; },
      drainLagoon(seconds = config.drainSeconds) {
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > DAY.length) return false;
        state.drainRemaining = seconds; apply(); return true;
      },
      refloodLagoon() { state.drainRemaining = 0; apply(); },
      load(value) { state = tides.clean(value); }, toJSON() { return state; },
      enter: apply, update: advance, advance, exit() {},
    };
  },
};
