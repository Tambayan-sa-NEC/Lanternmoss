/* The active-challenge panel (top right) and the big Clear / Failed banner. */
import { clamp } from '../utils/math.js';
import { dom } from './dom.js';

export function showChallengePanel() { dom.challenge.style.display = 'block'; dom.hud.style.top = '112px'; }   // status chips slide below the panel
export function hideChallengePanel() { dom.challenge.style.display = 'none'; dom.hud.style.top = ''; }

/** progress / timeText: already formatted; left & limit in seconds; warn = player is drifting out of range. */
export function renderChallengePanel({ title, progress, timeText, left, limit, warn, footer }) {
  dom.challenge.classList.toggle('warn', warn);
  dom.challenge.innerHTML = `<div class="ct">✦ ${title}</div><div class="cp">${progress} · ${timeText}</div>` +
    `<div class="tb"><i style="transform:scaleX(${clamp(left / limit, 0, 1)})"></i></div>` +
    `<div class="ch">${footer}</div>`;
}

export function showChallengeResult(win, title, sub) {
  const el = dom.challengeResult; el.className = win ? '' : 'fail';
  el.innerHTML = `<h2>${win ? 'Challenge Clear!' : 'Challenge Failed'}</h2><p>${title} · ${sub}</p>`; void el.offsetWidth; el.classList.add('show');
}
