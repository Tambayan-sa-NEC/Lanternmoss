/* Placeholder XP / level-up feedback (float text, burst, ring, jingle, toast), wired to levelEvents. */
import * as THREE from 'three';
import { LEVELING } from '../config/leveling.js';
import { ctx } from '../core/context.js';
import { floatText, ringFX } from '../fx/combatFx.js';
import { burstAt } from '../fx/sparkles.js';
import { audio } from '../systems/AudioSystem.js';
import { dom, flashEl } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { levelEvents } from './experience.js';

const _tv = new THREE.Vector3();

export function installLevelFeedback() {
  levelEvents.addEventListener('xp', e => floatText(_tv.copy(ctx.player.pos).addScaledVector(ctx.player.up, 2.7), `+${e.detail.amount}`, '#ffd36b'));
  levelEvents.addEventListener('levelup', e => {
    const P = ctx.player, { level } = e.detail;
    ringFX(P.pos, 2.6, 0xffd36b, 0.6); burstAt(_tv.copy(P.pos).addScaledVector(P.up, 1), P.up, 0xffd36b, 60); audio.melody();
    flashEl(dom.xpBar, 'pop'); toast(level >= LEVELING.maxLevel ? `Level ${level}! That's the max, little hero.` : `Level up! You're now level ${level}.`);
  });
}
