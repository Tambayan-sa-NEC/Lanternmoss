import { FURNISHINGS } from '../config/home.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { Home } from '../gameplay/Home.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { InventoryUI } from './InventoryUI.js';
import { itemIconHtml } from './itemTooltip.js';

export const HomeUI = {
  isOpen: false, root: null, message: '',
  init() {
    this.root = document.createElement('div'); this.root.id = 'home-menu'; this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'home-title'); document.body.appendChild(this.root);
    this.root.addEventListener('click', e => {
      if (e.target.closest('[data-home-close]')) { this.close(); return; }
      if (e.target.closest('[data-home-craft]')) { this.close(); InventoryUI.open('craft'); return; }
      const b = e.target.closest('button[data-home-action]'); if (!b || b.disabled) return;
      const result = b.dataset.homeAction === 'claim' ? Home.claim() : b.dataset.homeAction === 'place' ? Home.place(b.dataset.item) : Home.remove(b.dataset.item);
      this.message = result.message; this.render();
      (b.dataset.item ? this.root.querySelector(`[data-item="${b.dataset.item}"]`) : this.root.querySelector('[data-home-close]'))?.focus();
    });
    this.root.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return; e.preventDefault(); e.stopPropagation();
      const buttons = [...this.root.querySelectorAll('button:not(:disabled)')], i = buttons.indexOf(document.activeElement);
      buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
    });
  },
  open() {
    if (this.isOpen || ctx.paused || ctx.inventoryOpen || !Home.canModify()) return;
    this.isOpen = true; this.previousFocus = document.activeElement; this.message = ''; ctx.paused = true; releaseAllKeys(); audio.duck(true);
    this.render(); this.root.classList.add('show'); this.root.querySelector('[data-home-close]').focus();
  },
  close() {
    if (!this.isOpen) return; this.isOpen = false; this.root.classList.remove('show'); ctx.paused = false; audio.duck(false);
    releaseAllKeys(); this.previousFocus?.focus?.();
  },
  key(code) { if (code === 'Escape') this.close(); },
  render() {
    const claimed = Home.state.claimed;
    this.root.innerHTML = `<div class="portal-panel home-panel"><header><h2 id="home-title">${claimed ? 'Your cottage' : 'An empty cottage'} · ${PLANETS[ctx.planet].name}</h2><button type="button" data-home-close aria-label="Close home menu">×</button></header>
      <p>${claimed ? 'Craft furniture, then place it in the spots below. Your belongings stay here when you travel.' : 'Nobody lives here. Claim this cottage for free, then make it your own with crafted furniture.'}</p>
      ${claimed ? `<div class="home-furniture">${Object.entries(FURNISHINGS).map(([id, f]) => {
        const installed = Home.state.furniture.includes(id), problem = installed ? ctx.player.inventory.spaceFor(id) < 1 : Home.placeProblem(id);
        return `<div class="home-row">${itemIconHtml(itemRegistry.get(id))}<div><strong>${f.name}</strong><small>${installed ? 'Placed in your cottage' : `Bag: ${ctx.player.inventory.count(id)} · ${f.station ? 'Craft at the workbench' : 'Craft by hand'}`}<br>${f.needs.map(([item, n]) => `${n} ${itemRegistry.get(item).name}`).join(' + ')}</small></div><button type="button" data-home-action="${installed ? 'remove' : 'place'}" data-item="${id}" ${problem ? 'disabled' : ''}>${installed ? 'Take to bag' : 'Place'}</button></div>`;
      }).join('')}</div><button type="button" data-home-craft>Open Craft tab</button>` : '<button type="button" data-home-action="claim">Claim cottage</button>'}
      <p class="home-message" role="status">${this.message || (claimed ? 'Your bed restores health and energy, and refills mana, stamina or focus. At night, sleep through to morning.' : 'One cottage on each planet; ownership lasts for this adventure.')}</p>
      <p class="portal-foot">Furniture fits fixed spots. Rugs are walk-through; solid furniture blocks movement. Taking furniture back requires room in the bag. Esc closes this menu.</p></div>`;
  },
};
