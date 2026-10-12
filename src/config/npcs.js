// Device/adventure dialogue memory uses these names; local names come from the planet's own NPC data.
export const TRAVELER_NAMES = ['Old Bramble', 'Pim', 'Lio', 'Fern'];

export function storyKeyAllowed(catalog, name) {
  return TRAVELER_NAMES.includes(name) || catalog.some(p => p.released
    && (p.npcs?.locals ?? []).some(n => name === n.name || name === `${p.id}:${n.name}`));
}
