/* Ability casting for whichever hero is active: cooldowns, a global cooldown, input buffering and hold-to-repeat.
   Abilities are looked up by id in CAST, so adding one = an entry in CHARACTERS[...].abilities + a function here. */
import { CHARACTERS } from '../config/characters.js';
import { COMBAT } from '../config/combat.js';
import { ctx } from '../core/context.js';
import { audio } from '../systems/AudioSystem.js';
import { flashManaBar, flashSlot } from '../ui/hud.js';
import { KNIGHT_ABILITIES } from './abilities/knight.js';
import { WITCH_ABILITIES } from './abilities/witch.js';
import { aimDirection } from './targeting.js';

const CAST = { ...WITCH_ABILITIES, ...KNIGHT_ABILITIES };

/** cd[id] = seconds until ready, gcd = global cooldown, queued = id pressed just before it was ready. */
export const spellState = { cd: {}, gcd: 0, queued: null, queuedT: 0 };

/** The active character's ability table. */
export function kit() { return CHARACTERS[ctx.player.charId].abilities; }

export function resetCooldowns(abilities) {
  spellState.cd = {}; spellState.gcd = 0; spellState.queued = null;
  for (const k in abilities) spellState.cd[k] = 0;
}

export function tryCast(id) {
  const player = ctx.player, s = kit()[id]; if (!ctx.started || ctx.transitioning || player.dead || !s) return;
  if (spellState.gcd > 0 || spellState.cd[id] > 0) {
    if (Math.max(spellState.gcd, spellState.cd[id]) <= COMBAT.inputBuffer) { spellState.queued = id; spellState.queuedT = COMBAT.inputBuffer; }
    else if (!s.repeat) { audio.fizzle(); flashSlot(id, 'deny'); }
    return;
  }
  if (player.mana < s.cost) { audio.fizzle(); flashSlot(id, 'deny'); flashManaBar(); return; }
  player.mana -= s.cost; spellState.cd[id] = s.cooldown; spellState.gcd = COMBAT.globalCooldown; spellState.queued = null;
  const dir = aimDirection();
  if (id === 'blink' && player.vel.lengthSq() > 1) dir.copy(player.vel).normalize();   // blink goes where you're running
  player.fwd.copy(dir); player.castFaceT = COMBAT.castFaceTime; player.castT = 0.28;
  flashSlot(id, 'pop');
  CAST[id](s, dir);
}

/** Cooldowns, buffered presses, and hold-to-repeat for abilities whose key is held down. */
export function updateCasting(dt, keys) {
  spellState.gcd -= dt; for (const id in spellState.cd) spellState.cd[id] = Math.max(0, spellState.cd[id] - dt);
  if (spellState.queued && (spellState.queuedT -= dt) > 0) {
    const q = spellState.queued; if (spellState.gcd <= 0 && spellState.cd[q] <= 0) { spellState.queued = null; tryCast(q); }
  } else spellState.queued = null;
  for (const id in kit()) {
    const s = kit()[id];
    if (s.repeat && s.keys.some(k => keys[k]) && spellState.cd[id] <= 0 && spellState.gcd <= 0 && ctx.player.mana >= s.cost) tryCast(id);
  }
}
