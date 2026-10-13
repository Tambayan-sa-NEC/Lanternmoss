/* Pure mechanic definitions: import/register real modules here when their world stages land.
   Factories receive their environment at runtime; importing this registry must not create scenes or state. */
import { tides } from './tides.js';
const definitions = new Map([['tides', tides]]);

export function registerMechanic(id, definition) {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(id) || definitions.has(id) || typeof definition?.create !== 'function' || typeof definition?.clean !== 'function')
    throw new Error(`Invalid or duplicate mechanic: ${id}`);
  definitions.set(id, definition);
  return () => { if (definitions.get(id) === definition) definitions.delete(id); };
}
export const mechanicDefinition = id => definitions.get(id) ?? null;
export const mechanicAvailable = planet => planet.mechanic == null || !!mechanicDefinition(planet.mechanic);

/** Clone schema-cleaned state so snapshots, defaults and different planets cannot share mutable objects. */
export function cleanMechanicState(definition, value) {
  const state = definition.clean(value);
  if (!state || typeof state !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(state)))
    throw new Error('A mechanic cleaner must return a plain state object');
  return JSON.parse(JSON.stringify(state));
}

/** Optional v1 planet snapshot. Unknown or mismatched modules fall back to that world's defaults. */
export function cleanMechanicSnapshot(value, expectedId = undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || expectedId !== undefined && value.id !== expectedId) return null;
  const definition = mechanicDefinition(value.id);
  if (!definition) return null;
  return { id: value.id, state: cleanMechanicState(definition, value.state),
    at: typeof value.at === 'number' && Number.isFinite(value.at) && value.at >= 0 ? Math.min(value.at, 1e12) : null };
}
