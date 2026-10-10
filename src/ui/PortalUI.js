import { ctx } from '../core/context.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';

export const PortalUI = {
  isOpen: false, root: null,
  init(portals) {
    this.portals = portals;
    this.root = document.createElement('div'); this.root.id = 'portal-picker';
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'portal-title');
    document.body.appendChild(this.root);
    this.root.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      e.preventDefault(); e.stopPropagation();
      const buttons = [...this.root.querySelectorAll('button:not(:disabled)')];
      const next = (buttons.indexOf(document.activeElement) + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length;
      buttons[next]?.focus();
    });
    this.root.addEventListener('click', e => {
      if (e.target.closest('[data-portal-close]')) this.close();
      const button = e.target.closest('button[data-destination]');
      if (button && !button.disabled) { const id = button.dataset.destination; this.close(); this.portals.travel(id); }
    });
  },
  open() {
    if (this.isOpen || !this.portals.canUse()) return;
    this.isOpen = true; this.previousFocus = document.activeElement; ctx.paused = true; releaseAllKeys(); audio.duck(true);
    const choices = this.portals.destinations();
    this.root.innerHTML = `<div class="portal-panel"><header><h2 id="portal-title">Lantern gate</h2><button type="button" data-portal-close aria-label="Close destinations">×</button></header>
      <p>Choose where to travel. Wayfarer's Keys: <b>${this.portals.keys}</b></p>
      ${this.portals.stranded ? '<p class="portal-warning">The gate home is dark. Defeat this world’s boss or spend another key to return.</p>' : ''}
      <div class="portal-destinations">${choices.map(d => `<button type="button" data-destination="${d.id}" ${d.enabled ? '' : 'disabled'}><strong>${d.name}</strong><span>${d.tagline}</span><small>${d.reason}</small></button>`).join('')}</div>
      <p class="portal-foot">Boss wins open onward travel. Early travel costs one key each way until the destination’s boss falls. Esc closes this menu.</p></div>`;
    this.root.classList.add('show'); this.root.querySelector('[data-portal-close]').focus();
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; this.root.classList.remove('show'); ctx.paused = false; audio.duck(false); releaseAllKeys();
    this.previousFocus?.focus?.();
  },
  key(code) {
    if (code === 'Escape') this.close();
  },
};
