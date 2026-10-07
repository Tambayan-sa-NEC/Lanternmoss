/* The bag window. Renders the inventory's current state and turns clicks into commands; all rules (stacking,
   moving, using, equipping, crafting) live in the inventory, items and gameplay layers. Re-renders whenever the
   inventory changes. Two tabs (pets have a menu of their own: src/ui/PetMenu.js):
     Bag    the grid on the left, with the hotbar row under it (the same slots as the hotbar at the bottom of the
            screen, keys 1-9: move things there to hold them). The equipment side on the right, like Minecraft: the
            hero (in their hat and cape) between the worn slots (head, body, feet / weapon, two trinkets), the vanity
            slots under them, and what the gear adds. The details window sits under the whole bag window.
            Selection works like a simple drag-and-drop: click an item, then click where it should go (empty slot =
            move, same item = merge, different item = swap, a worn slot it fits = wear it there). Click a worn piece
            to take it off. Double-click or the first button uses / equips it.
    Craft  every recipe the hero can use (config/crafting.js), what it needs and what you have. Chips along the top
           filter by where it's made: by hand (anywhere) or at a station (config/stations.js); recipes for a station
           can only be crafted standing at it. Opening a station (E) shows its recipes. */
import { CHARACTERS } from '../config/characters.js';
import { RECIPES } from '../config/crafting.js';
import { STATIONS } from '../config/stations.js';
import { HOTBAR_KEYS, keyLabel } from '../config/controls.js';
import { EQUIP_SLOTS, GEAR_KINDS, HOTBAR, INVENTORY, RARITIES } from '../config/items.js';
import { ctx } from '../core/context.js';
import { bindKbd } from '../core/keybinds.js';
import { craftProblem, recipesFor, requirements } from '../items/crafting.js';
import { formatStat, gearTotals } from '../items/gear.js';
import { ITEM_ACTIONS, actionFor } from '../items/itemActions.js';
import { dom } from './dom.js';
import { icon } from './icons.js';
import { describeItem, itemIconHtml, rarityColor } from './itemTooltip.js';
import { heroPortrait } from './monsterPortraits.js';

const PROBLEM = { materials: 'Not enough materials.', coins: 'Not enough coins.', space: 'No room in the bag.', station: 'Stand at its station to make it.' };
/** The Craft tab's filters: everything, by hand, then each station. */
const FILTERS = [['all', 'All'], ['hand', 'By hand'], ...Object.entries(STATIONS).map(([id, s]) => [id, s.short])];
const hex = n => '#' + n.toString(16).padStart(6, '0');
const titleCase = w => w.charAt(0) + w.slice(1).toLowerCase();
/** The equipment side's layout: worn slots left of the hero, right of the hero, and the vanity row under them. */
const SIDE = { left: ['head', 'armor', 'feet'], right: ['weapon', 'charm', 'charm2'], vanity: ['hat', 'back'] };

export const InventoryUI = {
  isOpen: false, tab: 'bag', craftFilter: 'all', selected: -1, hovered: -1, hoveredGear: null, message: '', inventory: null, commands: null,
  slotEls: [], gearEls: {}, quickBtns: [],

  /** commands (supplied by the game): use(slot) / equip(slot, where) / unequip(where) / craft(recipe) -> { ok, message },
      drop(slot) -> boolean, held() -> the held hotbar slot, worn() -> P.equipment, station() -> the station the hero
      stands at (or null). */
  init(inventory, commands) {
    this.inventory = inventory; this.commands = commands;
    const root = dom.inventory;
    // tabs
    const tabs = document.createElement('div'); tabs.className = 'inv-tabs';
    tabs.innerHTML = '<button type="button" data-tab="bag">Bag</button><button type="button" data-tab="craft">Craft</button>';
    tabs.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) this.setTab(t.dataset.tab); });
    root.querySelector('.inv-head b').after(tabs); this.tabsEl = tabs;
    // the bag grid (inventory slots HOTBAR.size and up) and, under it, the hotbar row (slots 0 .. HOTBAR.size - 1)
    dom.invGrid.style.setProperty('--cols', INVENTORY.columns);
    const hotRow = document.createElement('div'); hotRow.className = 'inv-hotbar';
    hotRow.innerHTML = '<div class="inv-hot-label">Hotbar</div>';
    const hotGrid = document.createElement('div'); hotGrid.className = 'inv-hot-grid'; hotRow.appendChild(hotGrid);
    const left = document.createElement('div'); left.className = 'inv-left'; dom.invGrid.before(left); left.append(dom.invGrid, hotRow);
    const slotEl = (i, parent) => {
      const el = document.createElement('button'); el.className = 'inv-slot'; el.type = 'button';
      el.addEventListener('mouseenter', () => { this.hovered = i; this.renderDetail(); });
      el.addEventListener('mouseleave', () => { if (this.hovered === i) { this.hovered = -1; this.renderDetail(); } });
      el.addEventListener('click', () => this.clickSlot(i));
      el.addEventListener('dblclick', () => this.use(i));
      parent.appendChild(el); this.slotEls[i] = el;
    };
    for (let i = HOTBAR.size; i < inventory.size; i++) slotEl(i, dom.invGrid);
    for (let i = 0; i < HOTBAR.size; i++) { slotEl(i, hotGrid); this.slotEls[i].dataset.key = keyLabel(HOTBAR_KEYS[i]); this.slotEls[i].classList.add('hot'); }
    // the equipment side: worn slots round the hero, the vanity row, the gear's totals
    const side = document.createElement('div'); side.className = 'inv-equip';
    side.innerHTML = '<div class="eq-title">Equipment</div><div class="eq-doll"><div class="eq-col l"></div><div class="eq-hero"></div><div class="eq-col r"></div></div>' +
      '<div class="eq-vanity"><span class="eq-sub">Look</span></div><div class="inv-gear-stats"></div>';
    const gearEl = (k, parent) => {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'inv-slot gear'; el.dataset.label = EQUIP_SLOTS[k].label;
      if (GEAR_KINDS[EQUIP_SLOTS[k].fits].vanity) el.classList.add('vanity');
      el.addEventListener('click', () => this.clickGear(k));
      el.addEventListener('mouseenter', () => { this.hoveredGear = k; this.renderDetail(); });
      el.addEventListener('mouseleave', () => { if (this.hoveredGear === k) { this.hoveredGear = null; this.renderDetail(); } });
      parent.appendChild(el); this.gearEls[k] = el;
    };
    SIDE.left.forEach(k => gearEl(k, side.querySelector('.eq-col.l')));
    SIDE.right.forEach(k => gearEl(k, side.querySelector('.eq-col.r')));
    SIDE.vanity.forEach(k => gearEl(k, side.querySelector('.eq-vanity')));
    this.heroEl = side.querySelector('.eq-hero'); this.gearStats = side.querySelector('.inv-gear-stats');
    root.querySelector('.inv-body').appendChild(side);
    // crafting
    this.craftEl = document.createElement('div'); this.craftEl.className = 'inv-craft';
    this.craftEl.addEventListener('click', e => {
      const f = e.target.closest('[data-filter]'); if (f) { this.craftFilter = f.dataset.filter; this.message = ''; this.render(); return; }
      const b = e.target.closest('[data-recipe]'); if (b) this.craft(b.dataset.recipe);
    });
    root.querySelector('.inv-actions').after(this.craftEl);
    this.hintEl = root.querySelector('.inv-hint');
    dom.invUse.addEventListener('click', () => this.use(this.selected));
    dom.invDrop.addEventListener('click', () => this.drop(this.selected));
    dom.invClose.addEventListener('click', () => this.close());
    inventory.addEventListener('change', () => this.render());
  },

  toggle() { if (this.isOpen) this.close(); else this.open(); },
  /** filter: which recipes the Craft tab shows ('all', 'hand' or a station id); a station opens on its own. */
  open(tab = 'bag', { filter = 'all' } = {}) {
    this.isOpen = ctx.inventoryOpen = true; this.message = ''; this.tab = tab; this.craftFilter = filter;
    dom.inventory.classList.add('show'); this.render();
  },
  close() { this.isOpen = ctx.inventoryOpen = false; this.selected = this.hovered = -1; this.hoveredGear = null; dom.inventory.classList.remove('show'); },
  setTab(t) { this.tab = t; this.selected = -1; this.message = ''; this.render(); },

  clickSlot(i) {
    const inv = this.inventory;
    if (this.selected < 0) { if (inv.getSlot(i)) this.selected = i; }
    else if (this.selected === i) this.selected = -1;
    else { inv.move(this.selected, i); this.selected = -1; }
    this.message = ''; this.render();
  },
  /** A worn slot: wear the selected bag item there (if it fits), else take off what's worn. */
  clickGear(k) {
    if (this.selected >= 0) {
      const s = this.inventory.getSlot(this.selected), def = s && this.inventory.registry.get(s.itemId);
      if (def?.equip) { this.message = this.commands.equip(this.selected, k).message; this.selected = -1; this.render(); return; }
    }
    this.message = this.commands.unequip(k).message; this.render();
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
  craft(id) {
    const r = RECIPES.find(x => x.id === id); if (!r) return;
    this.message = this.commands.craft(r).message; this.render();
  },

  render() {
    if (!this.isOpen) return;
    for (const b of this.tabsEl.children) b.classList.toggle('on', b.dataset.tab === this.tab);
    dom.inventory.classList.toggle('crafting', this.tab === 'craft');
    const inv = this.inventory;
    const bagUsed = inv.getSlots().slice(HOTBAR.size).filter(Boolean).length;
    dom.invCount.textContent = `${bagUsed} / ${inv.size - HOTBAR.size}`;
    dom.invHint.innerHTML = `click an item, then another slot to move / swap (a worn slot to wear it) · double-click to use · ${bindKbd('bag')} or <kbd>Esc</kbd> to close`;
    if (this.tab === 'craft') { this.renderCraft(); return; }
    const slots = inv.getSlots();
    if (this.selected >= 0 && !slots[this.selected]) this.selected = -1;
    slots.forEach((s, i) => {
      const el = this.slotEls[i], def = s && inv.registry.get(s.itemId);
      el.classList.toggle('filled', !!s); el.classList.toggle('selected', i === this.selected);
      const col = def && rarityColor(def, s.props);
      el.style.borderColor = def && col !== rarityColor({ rarity: 'common' }) ? col : '';
      el.innerHTML = (def ? itemIconHtml(def) + (s.quantity > 1 ? `<span class="inv-qty">${s.quantity}</span>` : '') : '') +
        (el.dataset.key ? `<span class="inv-qk">${el.dataset.key}</span>` : '');
      el.classList.toggle('held', i === this.commands.held());
      el.title = def ? def.name : '';
    });
    this.renderGear();
    this.renderDetail();
  },

  renderGear() {
    const worn = this.commands.worn(), reg = this.inventory.registry, P = ctx.player;
    const sel = this.selected >= 0 ? this.inventory.getSlot(this.selected) : null, selDef = sel && reg.get(sel.itemId);
    for (const [k, el] of Object.entries(this.gearEls)) {
      const w = worn[k], def = w && reg.get(w.itemId);
      el.classList.toggle('filled', !!def);
      el.classList.toggle('fits', !!selDef?.equip && EQUIP_SLOTS[k].fits === selDef.equip.slot);
      el.style.borderColor = def ? rarityColor(def, w.props) : '';
      el.innerHTML = def ? itemIconHtml(def) : `<span class="gear-empty">${el.dataset.label}</span>`;
      el.title = def ? `${def.name} (click to take off)` : `${el.dataset.label}: nothing worn`;
    }
    // the hero, dressed (a rendered portrait; a glyph where there's no renderer)
    const hat = worn.hat && reg.get(worn.hat.itemId), back = worn.back && reg.get(worn.back.itemId), C = CHARACTERS[P.charId];
    const key = `${C.model}|${hat?.id ?? ''}|${back?.id ?? ''}`;
    if (this.heroKey !== key) {
      this.heroKey = key; const url = heroPortrait(C.model, hat, back);
      this.heroEl.innerHTML = url ? `<img src="${url}" alt="${C.title}">` : `<div class="eq-glyph" style="color:${C.color}">${icon('star')}</div>`;
      this.heroEl.title = C.title;
    }
    const pieces = Object.values(worn).filter(Boolean).map(w => ({ def: reg.get(w.itemId), props: w.props }));
    const t = gearTotals(pieces, P.charId), res = titleCase(CHARACTERS[P.charId].resource).toLowerCase();
    const parts = Object.entries(t).filter(([, v]) => v).map(([k, v]) => formatStat(k, v, res));
    this.gearStats.innerHTML = parts.length ? `<b>Gear:</b> ${parts.join(' · ')}` : '<span class="dim">Nothing worn yet: equip a weapon, armour, boots or a trinket.</span>';
  },

  renderDetail() {
    if (!this.isOpen || this.tab !== 'bag') return;
    const inv = this.inventory, hero = ctx.player.charId;
    const worn = this.hoveredGear && this.commands.worn()[this.hoveredGear];
    const shown = this.hovered >= 0 && inv.getSlot(this.hovered) ? this.hovered : this.selected;
    const s = shown >= 0 ? inv.getSlot(shown) : null;
    dom.invDetail.innerHTML = worn ? describeItem(inv.registry.get(worn.itemId), { quantity: 1, props: worn.props }, { hero, worn: true })
      : s ? describeItem(inv.registry.get(s.itemId), s, { hero }) : '<p class="inv-d-empty">Point at an item to see what it is.</p>';
    const sel = this.selected >= 0 ? inv.getSlot(this.selected) : null, def = sel && inv.registry.get(sel.itemId), action = def && actionFor(def);
    dom.invUse.textContent = action ? ITEM_ACTIONS[action].label : 'Use';
    dom.invUse.disabled = !action || !ITEM_ACTIONS[action].supported;
    dom.invDrop.disabled = !def || !def.droppable;
    dom.invMsg.textContent = this.message;
  },

  renderCraft() {
    const inv = this.inventory, P = ctx.player, reg = inv.registry, at = this.commands.station?.() ?? null, f = this.craftFilter;
    let group = '';
    const shown = recipesFor(P.charId, reg).filter(r => f === 'all' || (f === 'hand' ? !r.station : r.station === f));
    const chips = FILTERS.map(([id, label]) => `<button type="button" data-filter="${id}" class="${id === f ? 'on' : ''}${id === at ? ' here' : ''}"` +
      `${STATIONS[id] ? ` style="--sc:${hex(STATIONS[id].color)}"` : ''}>${label}${id === at ? ' ★' : ''}</button>`).join('');
    const where = at ? `You're at the <b>${STATIONS[at].name}</b>: you can make its recipes and anything by hand.`
      : 'Not at a station: you can make things by hand. Recipes with a station tag need you to stand at it (the crafting corner in the village).';
    const rows = shown.map(r => {
      const out = reg.get(r.result), req = requirements(r, inv, P.coins), problem = craftProblem(r, inv, P.coins, at);
      const col = rarityColor(out, r.rarity ? { rarity: r.rarity } : null);
      const needs = req.items.map(n => `<span class="need${n.have >= n.need ? ' ok' : ''}">${itemIconHtml(reg.get(n.item))}${Math.min(n.have, 99)}/${n.need}</span>`).join('') +
        (req.coins.need ? `<span class="need coin${req.coins.have >= req.coins.need ? ' ok' : ''}">✦ ${req.coins.need}</span>` : '');
      const head = r.group && r.group !== group ? `<div class="rc-group">${(group = r.group)}</div>` : '';
      const kind = out.equip ? GEAR_KINDS[out.equip.slot].label : out.tool ? 'Tool' : '';
      return `${head}<div class="recipe${problem ? '' : ' can'}" title="${out.description.replace(/"/g, '&quot;')}">${itemIconHtml(out)}` +
        `<div class="rc-name" style="color:${col}">${r.qty > 1 ? `${r.qty}x ` : ''}${out.name}<small>${kind}${r.rarity ? `${kind ? ' · ' : ''}${RARITIES[r.rarity].label}` : ''}</small>` +
        `${r.station ? `<span class="rc-st${r.station === at ? ' here' : ''}" style="--sc:${hex(STATIONS[r.station].color)}">${STATIONS[r.station].short}</span>` : ''}</div>` +
        `<div class="rc-needs">${needs}</div><button type="button" data-recipe="${r.id}" ${problem ? `disabled title="${PROBLEM[problem]}"` : ''}>Craft</button></div>`;
    });
    this.craftEl.innerHTML = `<div class="rc-filters">${chips}</div><div class="rc-where">${where}</div>` +
      `<div class="rc-list">${rows.join('') || '<p class="rc-empty">Nothing to make here for your hero.</p>'}</div><div class="inv-msg rc-msg">${this.message}</div>`;
  },
};
