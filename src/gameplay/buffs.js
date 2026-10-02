/* Temporary buffs (Moon-Hop, Feather-Step) and the treat counter. */
import { ctx } from '../core/context.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';

/** moon / feather = seconds left; buns = treats collected. */
export const buffs = { moon: 0, feather: 0, buns: 0 };
export const BUFF_NAMES = { moon: 'Moon-Hop', feather: 'Feather-Step' };

export function buff(kind, secs, msg) {
  const player = ctx.player;
  buffs[kind] = secs; toast(msg); audio.sparkle();
  sparkles.emit(player.pos.clone().addScaledVector(player.up, 1), { count: 36, color: kind === 'moon' ? 0xd6ccff : 0xb8ffe0, speed: 2.4, up: player.up, upBias: 0.9, life: 1.2, size: 0.32 });
}
export function giveBun(npc, name) { buffs.buns++; emote(npc, 'heart'); emote(ctx.player, 'heart', '#ffb03d'); toast(`Received: ${name}!`); audio.sparkle(); }

export function updateBuffs(dt) { buffs.moon = Math.max(0, buffs.moon - dt); buffs.feather = Math.max(0, buffs.feather - dt); }
export function resetBuffs() { for (const k in buffs) buffs[k] = 0; }
