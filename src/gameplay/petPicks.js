/* Which pet each hero last took ({ heroId: petId }), kept in localStorage across adventures (src/gameplay/Pets.js).
   sanitizePicks is pure and unit-tested. */
import { CHARACTERS } from '../config/characters.js';
import { PET_PICKS_KEY, PETS } from '../config/pets.js';

/** { heroId: petId } from anything (saved JSON, junk): only real heroes and real pets are kept. */
export function sanitizePicks(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(Object.entries(src).filter(([h, p]) => Object.hasOwn(CHARACTERS, h) && typeof p === 'string' && Object.hasOwn(PETS, p)));
}
export function loadPicks() { try { return sanitizePicks(JSON.parse(globalThis.localStorage?.getItem(PET_PICKS_KEY) ?? 'null')); } catch { return {}; } }
export function savePicks(picks) { try { globalThis.localStorage?.setItem(PET_PICKS_KEY, JSON.stringify(picks)); } catch { /* blocked: keep for this session */ } }
