/* One-line notifications at the top of the screen. */
import { dom } from './dom.js';

let toastT = 0;
export function toast(msg, { menu = false } = {}) {
  dom.toast.textContent = msg; dom.toast.classList.toggle('menu-visible', menu); dom.toast.style.opacity = 1; toastT = 2.6;
}
export function updateToast(dt) { if (toastT > 0 && (toastT -= dt) <= 0) dom.toast.style.opacity = 0; }
