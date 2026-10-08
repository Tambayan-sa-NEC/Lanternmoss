/* Applies XP to the hero and announces it. Anything that wants to react listens on levelEvents:
     'xp'      detail { amount, enemy, level, xp, next }   (next = XP needed for the next level, 0 at the cap)
     'levelup' detail { level, from }
   Level and XP live on the player like hp / mana and reset with the run (there is no save system). */
import { LEVELING } from '../config/leveling.js';
import { ctx } from '../core/context.js';
import { computeStats } from '../gameplay/equipment.js';
import { addXp, xpToNext } from './leveling.js';

export const levelEvents = new EventTarget();

export function gainXp(amount, enemy = null) {
  const P = ctx.player, from = P.level, r = addXp(P.level, P.xp, amount);
  if (!r.gained) return;
  P.level = r.level; P.xp = r.xp;
  levelEvents.dispatchEvent(new CustomEvent('xp', { detail: { amount: r.gained, enemy, level: P.level, xp: P.xp, next: xpToNext(P.level) } }));
  if (P.level === from) return;
  const old = P.stats; P.stats = computeStats(P);
  if (!P.dead) {
    if (LEVELING.healOnLevelUp) { P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; }
    else { P.hp += P.stats.maxHp - old.maxHp; P.mana += P.stats.maxMana - old.maxMana; }
  }
  levelEvents.dispatchEvent(new CustomEvent('levelup', { detail: { level: P.level, from } }));
}
