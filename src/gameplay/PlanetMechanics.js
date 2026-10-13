/* One instance per generated world. Saved state loads before enter and before actor/resource placement.
   advance handles skipped/away time without simulating combat or granting rewards. Weather remains separate. */
import { gameEvents } from '../core/events.js';
import { cleanMechanicSnapshot, cleanMechanicState, mechanicAvailable, mechanicDefinition } from '../world/mechanics/index.js';

const HOOKS = ['enter', 'update', 'advance', 'exit', 'toJSON', 'load'];
export class PlanetMechanics {
  constructor(world, { clock = () => 0, running = () => true, environment = {}, events = gameEvents } = {}) {
    this.world = world; this.clock = clock; this.running = running; this.environment = environment; this.events = events;
    this.active = null; this.lastAt = 0; this.snapshotForPlanet = () => null;
    this.onSkip = event => this.advance(event.detail?.seconds, event.detail?.reason);
  }
  get id() { return this.active?.id ?? null; }
  accepts(planet) { return mechanicAvailable(planet); }

  enter(planet) {
    if (!this.accepts(planet)) throw new Error(`Unknown planet mechanic: ${planet.mechanic}`);
    this.exit();
    if (planet.mechanic == null) return;
    const definition = mechanicDefinition(planet.mechanic);
    const environment = Object.create(this.environment);
    Object.assign(environment, { world: this.world, planet, clock: this.clock });
    const instance = definition.create(environment);
    if (HOOKS.some(key => typeof instance?.[key] !== 'function')) {
      instance?.exit?.(); throw new Error(`Incomplete mechanic hooks: ${planet.mechanic}`);
    }
    this.active = { id: planet.mechanic, definition, instance };
    try {
      this.load(this.snapshotForPlanet(planet.id));
      instance.enter();
      this.events.addEventListener('timeskip', this.onSkip);
    } catch (error) { this.exit(); throw error; }
  }
  load(value) {
    if (!this.active) return;
    const { id, definition, instance } = this.active, saved = cleanMechanicSnapshot(value, id), now = this.clock();
    instance.load(saved ? saved.state : cleanMechanicState(definition, undefined));
    this.lastAt = now;
    if (saved?.at != null && now > saved.at) instance.advance(now - saved.at, { reason: 'away', from: saved.at, to: now });
  }
  toJSON() {
    if (!this.active) return null;
    return cleanMechanicSnapshot({ id: this.id, state: this.active.instance.toJSON(), at: this.lastAt });
  }
  update(dt) {
    if (!this.active || !this.running() || !Number.isFinite(dt) || dt <= 0) return;
    const now = this.clock(), skipped = now - this.lastAt - dt;
    if (skipped > 1e-6) this.active.instance.advance(skipped, { reason: 'clock', from: this.lastAt, to: now - dt });
    this.active.instance.update(dt); this.lastAt = now;
  }
  advance(seconds, reason = 'skip') {
    if (!this.active || !Number.isFinite(seconds) || seconds <= 0) return;
    const now = this.clock();
    this.active.instance.advance(seconds, { reason, from: now - seconds, to: now }); this.lastAt = now;
  }
  exit() {
    const active = this.active; this.active = null;
    this.events.removeEventListener('timeskip', this.onSkip);
    active?.instance.exit();
  }
}
