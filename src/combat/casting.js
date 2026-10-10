/* Ability casting for whichever hero is active: cooldowns, a global cooldown, input buffering and hold-to-repeat.
   Abilities are looked up by id in CAST, so adding one = an entry in CHARACTERS[...].abilities + an entry here:
   a function (s, dir) for instant abilities, or { execute(s, dir, target) } for target: 'ground' abilities, which
   first go through aim mode (./aiming.js) and only pay their cost and cooldown once the spot is confirmed. */
import { CHARACTERS } from '../config/characters.js';
import { COMBAT } from '../config/combat.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { audio } from '../systems/AudioSystem.js';
import { flashManaBar, flashSlot } from '../ui/hud.js';
import { KNIGHT_ABILITIES } from './abilities/knight.js';
import { RANGER_ABILITIES } from './abilities/ranger.js';
import { ULTIMATES } from './abilities/ultimates.js';
import { WITCH_ABILITIES } from './abilities/witch.js';
import { aim, aimedTarget, beginAim, cancelAim, isAiming, updateAiming } from './aiming.js';
import { aimDirection } from './targeting.js';

const CAST = { ...WITCH_ABILITIES, ...KNIGHT_ABILITIES, ...RANGER_ABILITIES, ...ULTIMATES };

/** cd[id] = seconds until ready, gcd = global cooldown, queued = id pressed just before it was ready. */
export const spellState = { cd: {}, gcd: 0, queued: null, queuedT: 0 };
export const CombatState = {
  toJSON() { return { ...spellState.cd }; },
  load(data) { resetCooldowns(kit()); spellState.cd = { ...data }; },
};

/** The active character's ability table. */
export function kit() { return CHARACTERS[ctx.player.charId].abilities; }

export function resetCooldowns(abilities) {
  spellState.cd = {}; spellState.gcd = 0; spellState.queued = null; cancelAim();
  for (const k in abilities) spellState.cd[k] = 0;
}

/** False (with the deny feedback) when ability id can't be cast right now; queues presses that are nearly ready. */
function ready(id, s, quiet = false) {
  if (spellState.gcd > 0 || spellState.cd[id] > 0) {
    if (!quiet && Math.max(spellState.gcd, spellState.cd[id]) <= COMBAT.inputBuffer && !s.target) { spellState.queued = id; spellState.queuedT = COMBAT.inputBuffer; }
    else if (!quiet && !s.repeat) { audio.fizzle(); flashSlot(id, 'deny'); }
    return false;
  }
  if (ctx.player.mana < s.cost) { if (!quiet) { audio.fizzle(); flashSlot(id, 'deny'); flashManaBar(); } return false; }
  return true;
}

function pay(id, s) {
  const player = ctx.player;
  player.mana -= s.cost; spellState.cd[id] = s.cooldown; spellState.gcd = COMBAT.globalCooldown; spellState.queued = null;
  flashSlot(id, 'pop');
}

export function tryCast(id) {
  const player = ctx.player, s = kit()[id]; if (!ctx.started || ctx.transitioning || ctx.cutscene || ctx.inventoryOpen || ctx.indoors || player.dead || player.petrifyT > 0 || !s || player.motion) return;   // no fighting indoors
  if (isAiming() && !isAiming(id)) cancelAim();                        // another ability drops the aim
  if (s.target === 'ground') {
    if (isAiming(id)) { confirmAim(); return; }
    if (ready(id, s)) { beginAim(id, s); flashSlot(id, 'pop'); audio.blip(); }
    return;
  }
  if (!ready(id, s)) return;
  pay(id, s);
  const dir = aimDirection();
  if ((id === 'blink') && player.vel.lengthSq() > 1) dir.copy(player.vel).normalize();   // blink goes where you're running
  player.fwd.copy(dir); player.castFaceT = COMBAT.castFaceTime; player.castT = 0.28;
  CAST[id](s, dir);
  emit('abilitycast', { id });
}

/** Casts the ability being aimed at the marked spot (click, or its key again). An invalid spot keeps the aim open. */
export function confirmAim() {
  const id = aim.id, s = aim.s; if (!id) return;
  const dir = aimDirection(), target = aimedTarget(dir);
  if (!target) { audio.fizzle(); flashSlot(id, 'deny'); return; }
  cancelAim();
  if (!ready(id, s)) return;                                            // e.g. ran out of mana while aiming
  pay(id, s);
  const player = ctx.player; player.fwd.copy(dir); player.castFaceT = COMBAT.castFaceTime;
  CAST[id].execute(s, dir, target);
  emit('abilitycast', { id });
}

/** Cooldowns, buffered presses, and hold-to-repeat for abilities whose key is held down. */
export function updateCasting(dt, keys) {
  spellState.gcd -= dt; for (const id in spellState.cd) spellState.cd[id] = Math.max(0, spellState.cd[id] - dt);
  if (spellState.queued && (spellState.queuedT -= dt) > 0) {
    const q = spellState.queued; if (spellState.gcd <= 0 && spellState.cd[q] <= 0) { spellState.queued = null; tryCast(q); }
  } else spellState.queued = null;
  for (const id in kit()) {
    const s = kit()[id];
    if (s.repeat && !isAiming() && s.keys.some(k => keys[k]) && spellState.cd[id] <= 0 && spellState.gcd <= 0 && ctx.player.mana >= s.cost) tryCast(id);
  }
  updateAiming();
}
