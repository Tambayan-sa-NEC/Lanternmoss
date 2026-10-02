/** Reward keys usable in a challenge's `reward` / `repeatReward`. Each feeds existing player state and returns a banner label. */
import { ctx } from '../../core/context.js';
import { buff, BUFF_NAMES, buffs } from '../buffs.js';

export const REWARDS = {
  treats: n => { buffs.buns += n; return `+${n} Treat${n > 1 ? 's' : ''}`; },
  buff: ([kind, secs]) => { buff(kind, secs, `${BUFF_NAMES[kind]}! (${secs}s)`); return BUFF_NAMES[kind]; },
  restore: () => { ctx.player.hp = ctx.player.stats.maxHp; ctx.player.mana = ctx.player.stats.maxMana; return 'HP & mana restored'; },
};
