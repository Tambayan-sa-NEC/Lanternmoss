/* Daily phase belongs to the adventure clock. Only the lagoon's bounded drain timer needs a save owner.
   drainLagoon(seconds, reflood): with reflood > 0 the water creeps back over the drain's last `reflood` seconds
   (Mirelure's sluice break) instead of returning all at once. activeTides() is the live instance, for encounters. */
import { DAY } from '../../config/day.js';
import { dryGround } from '../terrain.js';

export function tideAt(seconds, config) {
  const phase = ((seconds / DAY.length) % 1 + 1) % 1, angle = (phase - config.lowAt) * Math.PI * 2;
  const amount = (1 - Math.cos(angle)) / 2;
  return { phase, amount, level: config.low + (config.high - config.low) * amount,
    label: amount <= 0.25 ? 'Low tide' : amount >= 0.75 ? 'High tide' : Math.sin(angle) > 0 ? 'Rising tide' : 'Falling tide' };
}
const seconds = v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(DAY.length, v)) : 0;
let live = null;
export const activeTides = () => live;
export const tides = {
  clean(value) {
    const drainRemaining = seconds(value?.drainRemaining), reflood = Math.min(seconds(value?.reflood), drainRemaining);
    return reflood > 0 ? { drainRemaining, reflood } : { drainRemaining };
  },
  create(env) {
    let state = tides.clean(null);
    const config = env.planet.tides;
    const lagoon = level => {
      const left = state.drainRemaining; if (left <= 0) return level;
      const back = state.reflood > 0 ? Math.max(0, 1 - left / state.reflood) : 0;      // 0 drained .. 1 refilled
      return config.drainLevel + (level - config.drainLevel) * back;
    };
    const apply = () => {
      const level = tideAt(env.clock(), config).level;
      env.world.physics.set({ seaLevel: level, regions: { lagoon: lagoon(level) } });
      env.world.syncPhysics();
    };
    const advance = s => { state.drainRemaining = Math.max(0, state.drainRemaining - s); if (state.drainRemaining <= 0) delete state.reflood; apply(); };
    const instance = {
      get status() { return { ...tideAt(env.clock(), config), causewayOpen: dryGround(env.world.coast.causeway), lagoonDrained: state.drainRemaining > 0 }; },
      drainLagoon(seconds = config.drainSeconds, reflood = 0) {
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > DAY.length || !Number.isFinite(reflood) || reflood < 0) return false;
        state = tides.clean({ drainRemaining: seconds, reflood }); apply(); return true;
      },
      refloodLagoon() { state = { drainRemaining: 0 }; apply(); },
      load(value) { state = tides.clean(value); }, toJSON() { return state; },
      enter() { live = instance; apply(); }, update: advance, advance, exit() { if (live === instance) live = null; },
    };
    return instance;
  },
};
