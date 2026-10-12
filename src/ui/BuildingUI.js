import { BUILDING, PLACEABLES } from '../config/placeables.js';
import { ctx } from '../core/context.js';
import { bindLabel } from '../core/keybinds.js';
import { Building } from '../gameplay/Building.js';
import { Farm } from '../gameplay/Farm.js';
import { Houses } from '../gameplay/Houses.js';
import { Stations } from '../gameplay/Stations.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { InventoryUI } from './InventoryUI.js';
import { itemIconHtml } from './itemTooltip.js';

export const BuildingUI = {
  isOpen: false, entry: null, message: '', quantity: Infinity,
  init() {
    this.preview = document.createElement('div'); this.preview.id = 'building-preview'; document.body.appendChild(this.preview);
    this.preview.innerHTML = '<strong></strong><span role="status"></span><div><button data-build-preview="place">Place</button><button data-build-preview="rotate">Rotate</button><button data-build-preview="grid">Grid</button><button data-build-preview="cancel">Cancel</button></div>';
    this.preview.addEventListener('click', e => {
      const action = e.target.closest('[data-build-preview]')?.dataset.buildPreview;
      if (action === 'place') Building.confirm(); if (action === 'rotate') Building.rotate(); if (action === 'grid') Building.toggleGrid(); if (action === 'cancel') Building.cancel();
    });
    this.root = document.createElement('div'); this.root.id = 'building-menu'; this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'building-title'); document.body.appendChild(this.root);
    this.root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-build-close')) { this.close(); return; }
      if (b.hasAttribute('data-build-quantity')) { this.quantity = this.quantity === 1 ? Infinity : 1; this.render(); return; }
      if (b.hasAttribute('data-build-transfer')) {
        const n = Building.transfer(this.entry, b.dataset.buildTransfer, Number(b.dataset.slot), this.quantity);
        this.message = n ? `Moved ${n} item${n === 1 ? '' : 's'}.` : 'No room to move those items.';
      }
      if (b.hasAttribute('data-build-stack')) { const n = Building.quickStack(); this.message = n ? `Quick-stacked ${n} items into nearby matching chests.` : 'No matching items fit in nearby chests.'; }
      if (b.hasAttribute('data-build-sort')) { ctx.player.inventory.sort(9); Building.changed(); this.message = 'Sorted the bag; hotbar kept in place.'; }
      if (b.hasAttribute('data-build-pickup')) {
        const r = Building.remove(this.entry); if (r.ok) { this.close(); return; } this.message = r.message;
      }
      if (b.hasAttribute('data-build-use')) {
        const entry = this.entry, def = PLACEABLES[entry.record.itemId]; this.close();
        if (def.crafting) Stations.open(def.crafting);
        else if (def.farm) { const target = Farm.target(entry.plot); target?.run(); }
        else if (def.furniture === 'bed') Houses.rest(true);
        return;
      }
      this.render();
      const attr = [...b.attributes].find(a => a.name.startsWith('data-build-'));
      if (attr) this.root.querySelector(`[${attr.name}="${attr.value}"]${b.hasAttribute('data-slot') ? `[data-slot="${b.dataset.slot}"]` : ''}`)?.focus();
    });
    this.root.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return; e.preventDefault(); e.stopPropagation();
      const buttons = [...this.root.querySelectorAll('button:not(:disabled)')], i = buttons.indexOf(document.activeElement);
      buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
    });
  },
  showPreview(a) {
    this.preview?.classList.toggle('show', !!a); if (!a) return;
    this.preview.querySelector('strong').textContent = `${PLACEABLES[a.id].name} · ${ctx.player.inventory.count(a.id)} in bag · ${a.turn * 90}° · ${a.grid ? 'Grid' : 'Free ground'}`;
    this.preview.querySelector('span').textContent = a.problem || `Ready · Click / Enter / ${bindLabel('interact')} to place · ${bindLabel('buildRotate')} rotate · ${bindLabel('buildGrid')} grid · Esc / right click cancel`;
    this.preview.classList.toggle('invalid', !!a.problem); this.preview.querySelector('[data-build-preview="place"]').disabled = !!a.problem;
  },
  open(entry) {
    if (ctx.paused || ctx.inventoryOpen || !Building.canEdit(entry)) return;
    Building.cancel(); this.entry = entry; this.message = ''; this.isOpen = true; this.previousFocus = document.activeElement;
    ctx.paused = true; releaseAllKeys(); audio.duck(true); this.render(); this.root.classList.add('show'); this.root.querySelector('[data-build-close]').focus();
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; this.entry = null; this.root.classList.remove('show'); ctx.paused = false; audio.duck(false); releaseAllKeys(); this.previousFocus?.focus?.();
  },
  key(code) { if (code === 'Escape') this.close(); },
  render() {
    const e = this.entry; if (!e) return; const def = PLACEABLES[e.record.itemId], bag = ctx.player.inventory;
    const stacks = (inv, action) => inv.getSlots().map((s, i) => s ? `<button type="button" data-build-transfer="${action}" data-slot="${i}" title="${action === 'deposit' ? 'Store' : 'Take'} ${inv.registry.get(s.itemId).name}">${itemIconHtml(inv.registry.get(s.itemId))}<span>${inv.registry.get(s.itemId).name}<small>×${s.quantity}${s.props?.rarity ? ` · ${s.props.rarity}` : ''}${s.props?.enchantment ? ' · enchanted' : ''}${action === 'deposit' && i < 9 ? ' · hotbar' : ''}</small></span></button>` : '').join('');
    this.root.innerHTML = `<div class="portal-panel building-panel"><header><h2 id="building-title">${def.name}</h2><button type="button" data-build-close aria-label="Close building menu">×</button></header>
      ${e.store ? `<p>Click bag items to store them; click chest items to take them. Transfers keep rarity and enchantments.</p><div class="storage-actions"><button data-build-quantity>Move: ${this.quantity === 1 ? 'one' : 'stack'}</button><button data-build-stack>Quick-stack nearby</button><button data-build-sort>Sort bag</button></div>
      <div class="storage-columns"><section><h3>Bag</h3><div class="storage-list">${stacks(bag, 'deposit') || '<p>Your bag is empty.</p>'}</div></section><section><h3>Chest · ${e.store.size - e.store.freeSlots()} / ${BUILDING.storageSlots}</h3><div class="storage-list">${stacks(e.store, 'withdraw') || '<p>This chest is empty.</p>'}</div></section></div>` : `<p>${def.description}</p>`}
      <div class="storage-actions">${def.crafting || def.farm || def.furniture === 'bed' ? `<button data-build-use>${def.crafting ? 'Open Craft tab' : def.farm ? 'Tend this plot' : 'Rest in bed'}</button>` : ''}<button data-build-pickup>Pick up</button></div>
      <p role="status" class="home-message">${this.message || (e.store ? 'Quick-stack matches nearby chest contents and keeps your hotbar in place. Empty this chest before picking it up.' : e.plot?.s.crop ? 'Harvest the crop before picking up this plot.' : 'Pick up returns the crafted item if there is room in your bag.')}</p><p class="portal-foot">Your builds stay on this planet. Esc closes this menu.</p></div>`;
  },
};
