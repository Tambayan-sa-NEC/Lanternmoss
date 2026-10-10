/* Temporary buffs (Moon-Hop, Feather-Step, a pet's Howl; from food and potions: Mighty, Stoneskin, Quickstep, Mending).
   Their numbers are config/game.js BUFFS; they're read where they act (Player speed, combat/damage.js, regeneration). */
import { ctx } from '../core/context.js';
import { Needs } from './Needs.js';
import { sparkles } from '../fx/sparkles.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';

/** Seconds left on each buff. */
const timers = { moon: 0, feather: 0, howl: 0, might: 0, ward: 0, swift: 0, mend: 0 };
let meal = null;
// Readers keep the existing API; equal effects use the longer timer, never a doubled bonus.
export const buffs = {};
for (const kind of Object.keys(timers)) Object.defineProperty(buffs, kind, { enumerable: true,
  get: () => Math.max(timers[kind], meal?.kind === kind ? meal.seconds : 0),
  set: seconds => { timers[kind] = seconds; if (seconds === 0 && meal?.kind === kind) meal = null; } });
export const BuffState = {
  toJSON() { return { timers: { ...timers }, meal: meal ? { ...meal } : null, energy: Needs.toJSON() }; },
  load(data) { Object.assign(timers, data.timers); meal = data.meal ? { ...data.meal } : null; Needs.load(data.energy); },
};
export const BUFF_NAMES = { moon: 'Moon-Hop', feather: 'Feather-Step', howl: 'Howl', might: 'Mighty', ward: 'Stoneskin', swift: 'Quickstep', mend: 'Mending' };
const BUFF_COLORS = { moon: 0xd6ccff, feather: 0xb8ffe0, howl: 0x7fb8ff, might: 0xff7a4a, ward: 0xb6aec8, swift: 0x7fe07a, mend: 0xff8fb1 };

export function buff(kind, secs, msg) {
  const player = ctx.player;
  buffs[kind] = secs; toast(msg); audio.sparkle();
  sparkles.emit(player.pos.clone().addScaledVector(player.up, 1), { count: 36, color: BUFF_COLORS[kind] ?? 0xffffff, speed: 2.4, up: player.up, upBias: 0.9, life: 1.2, size: 0.32 });
}

/** Cooked food replaces its one meal effect; potions and pet magic retain their independent timers. */
export function itemBuff(kind, seconds, isMeal) {
  const msg = `${BUFF_NAMES[kind]}! (${seconds}s)`;
  if (!isMeal) { buff(kind, Math.max(timers[kind], seconds), msg); return; }
  meal = { kind, seconds }; toast(`${msg} — meal buff`); audio.sparkle();
}
export function updateBuffs(dt) {
  for (const k in timers) timers[k] = Math.max(0, timers[k] - dt);
  if (meal) { meal.seconds = Math.max(0, meal.seconds - dt); if (!meal.seconds) meal = null; }
}
export function resetBuffs() { for (const k in timers) timers[k] = 0; meal = null; }
