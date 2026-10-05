/** Reward keys usable in a challenge's `reward` / `repeatReward`. Each feeds existing player state and returns a banner label. */
import { ctx } from '../../core/context.js';
import { buff, BUFF_NAMES } from '../buffs.js';
import { grantItem } from '../pickups.js';
import { gainCoins } from '../wallet.js';

export const REWARDS = {
  treats: n => { grantItem('honeyBun', n); return `+${n} Treat${n > 1 ? 's' : ''}`; },   // treats are Honey-moss Buns
  buff: ([kind, secs]) => { buff(kind, secs, `${BUFF_NAMES[kind]}! (${secs}s)`); return BUFF_NAMES[kind]; },
  coins: n => { gainCoins(n); return `+${n} ✦`; },
  restore: () => { ctx.player.hp = ctx.player.stats.maxHp; ctx.player.mana = ctx.player.stats.maxMana; return 'HP & mana restored'; },
};
