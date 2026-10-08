/* The achievement banner: slides in at the top right when one unlocks (the journal's 'achievement' event), with its
   icon, name and reward, and a little fanfare. Several in a row queue up. Times are real time, so it also plays out
   while a menu has the game paused. */
import { ACHIEVEMENT_TOAST } from '../config/achievements.js';
import { gameEvents } from '../core/events.js';
import { audio } from '../systems/AudioSystem.js';
import { icon } from './icons.js';

const queue = []; let el = null, busy = false;

function next() {
  const a = queue.shift(); if (!a) { busy = false; return; }
  busy = true;
  el.innerHTML = `<span class="ic">${icon(a.icon)}</span><div><small>Achievement unlocked</small><b>${a.name}</b><span>${a.text}</span></div>` +
    (a.reward?.coins ? `<em>✦ ${a.reward.coins}</em>` : '');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); audio.achievement();
  setTimeout(() => { el.classList.remove('show'); setTimeout(next, ACHIEVEMENT_TOAST.gap * 1000); }, ACHIEVEMENT_TOAST.seconds * 1000);
}

export function installAchievementToast() {
  el = document.createElement('div'); el.id = 'achv'; document.body.appendChild(el);
  gameEvents.addEventListener('achievement', e => { queue.push(e.detail.achievement); if (!busy) next(); });
}
