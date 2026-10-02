/* Temporary buffs (Moon-Hop, Feather-Step). Treats are inventory items now (tag 'treat', config/items.js). */
import { ctx } from '../core/context.js';
import { sparkles } from '../fx/sparkles.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';

/** Seconds left on each buff. */
export const buffs = { moon: 0, feather: 0 };
export const BUFF_NAMES = { moon: 'Moon-Hop', feather: 'Feather-Step' };

export function buff(kind, secs, msg) {
  const player = ctx.player;
  buffs[kind] = secs; toast(msg); audio.sparkle();
  sparkles.emit(player.pos.clone().addScaledVector(player.up, 1), { count: 36, color: kind === 'moon' ? 0xd6ccff : 0xb8ffe0, speed: 2.4, up: player.up, upBias: 0.9, life: 1.2, size: 0.32 });
}

export function updateBuffs(dt) { buffs.moon = Math.max(0, buffs.moon - dt); buffs.feather = Math.max(0, buffs.feather - dt); }
export function resetBuffs() { for (const k in buffs) buffs[k] = 0; }
