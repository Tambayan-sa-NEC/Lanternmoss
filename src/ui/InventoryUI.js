/* The bag window. Renders the inventory's current state and turns clicks into commands; all rules (stacking,
   moving, using, dropping) live in the inventory and gameplay layers. Re-renders whenever the inventory changes.
   Selection works like a simple drag-and-drop: click an item, then click where it should go (empty slot = move,
   same item = merge, different item = swap). Double-click or "Use" applies it. */
import { INVENTORY } from '../config/items.js';
import { ctx } from '../core/context.js';
import { ITEM_ACTIONS, actionFor } from '../items/itemActions.js';
import { dom } from './dom.js';
import { describeItem, itemIconHtml, rarityColor } from './itemTooltip.js';

export const InventoryUI = {
  isOpen: false, selected: -1, hovered: -1, message: '', inventory: null, commands: null, slotEls: [],

  /** commands: { use(slot) -> { ok, message }, drop(slot) -> boolean }, supplied by the game. */
  init(inventory, commands) {
    this.inventory = inventory; this.commands = commands;
    dom.invGrid.style.setProperty('--cols', INVENTORY.columns);
    for (let i = 0; i < inventory.size; i++) {
      const el = document.createElement('button'); el.className = 'inv-slot'; el.type = 'button';
      el.addEventListener('mouseenter', () => { this.hovered = i; this.renderDetail(); });
      el.addEventListener('mouseleave', () => { if (this.hovered === i) { this.hovered = -1; this.renderDetail(); } });
      el.addEventListener('click', () => this.clickSlot(i));
      el.addEventListener('dblclick', () => this.use(i));
      dom.invGrid.appendChild(el); this.slotEls.push(el);
    }
    dom.invUse.addEventListener('click', () => this.use(this.selected));
    dom.invDrop.addEventListener('click', () => this.drop(this.selected));
    dom.invClose.addEventListener('click', () => this.close());
    inventory.addEventListener('change', () => this.render());
  },

  toggle() { if (this.isOpen) this.close(); else this.open(); },
  open() { this.isOpen = ctx.inventoryOpen = true; this.message = ''; dom.inventory.classList.add('show'); this.render(); },
  close() { this.isOpen = ctx.inventoryOpen = false; this.selected = this.hovered = -1; dom.inventory.classList.remove('show'); },

  clickSlot(i) {
    const inv = this.inventory;
    if (this.selected < 0) { if (inv.getSlot(i)) this.selected = i; }
    else if (this.selected === i) this.selected = -1;
    else { inv.move(this.selected, i); this.selected = -1; }
    this.message = ''; this.render();
  },
  use(i) {
    if (!this.inventory.getSlot(i)) return;
    this.message = this.commands.use(i).message;
    if (!this.inventory.getSlot(i)) this.selected = -1;
    this.render();
  },
  drop(i) {
    const s = this.inventory.getSlot(i); if (!s) return;
    const name = this.inventory.registry.get(s.itemId).name;
    this.message = this.commands.drop(i) ? `Dropped ${name}.` : `${name} can't be dropped.`;
    this.selected = -1; this.render();
  },

  render() {
    if (!this.isOpen) return;
    const inv = this.inventory, slots = inv.getSlots();
    if (this.selected >= 0 && !slots[this.selected]) this.selected = -1;
    slots.forEach((s, i) => {
      const el = this.slotEls[i], def = s && inv.registry.get(s.itemId);
      el.classList.toggle('filled', !!s); el.classList.toggle('selected', i === this.selected);
      el.style.borderColor = def && def.rarity !== 'common' ? rarityColor(def) : '';
      el.innerHTML = def ? itemIconHtml(def) + (s.quantity > 1 ? `<span class="inv-qty">${s.quantity}</span>` : '') : '';
      el.title = def ? def.name : '';
    });
    dom.invCount.textContent = `${inv.size - inv.freeSlots()} / ${inv.size}`;
    this.renderDetail();
  },

  renderDetail() {
    if (!this.isOpen) return;
    const inv = this.inventory;
    const shown = this.hovered >= 0 && inv.getSlot(this.hovered) ? this.hovered : this.selected;
    const s = shown >= 0 ? inv.getSlot(shown) : null;
    dom.invDetail.innerHTML = s ? describeItem(inv.registry.get(s.itemId), s) : '<p class="inv-d-empty">Select an item to see what it is.</p>';
    const sel = this.selected >= 0 ? inv.getSlot(this.selected) : null, def = sel && inv.registry.get(sel.itemId), action = def && actionFor(def);
    dom.invUse.textContent = action ? ITEM_ACTIONS[action].label : 'Use';
    dom.invUse.disabled = !action || !ITEM_ACTIONS[action].supported;
    dom.invDrop.disabled = !def || !def.droppable;
    dom.invMsg.textContent = this.message;
  },
};
