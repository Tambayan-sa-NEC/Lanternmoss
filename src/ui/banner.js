/* The big centred banner (challenge results, boss defeats, planet arrivals) and the full-screen travel fade. */
import { dom } from './dom.js';

export function showBanner(title, sub = '', fail = false) {
  const el = dom.challengeResult; el.className = fail ? 'fail' : '';
  el.innerHTML = `<h2>${title}</h2>` + (sub ? `<p>${sub}</p>` : ''); void el.offsetWidth; el.classList.add('show');
}

/** Fades the screen to the background colour (on = true) or back, over secs. */
export function setFade(on, secs) { dom.fade.style.transition = `opacity ${secs}s`; dom.fade.style.opacity = on ? 1 : 0; }
