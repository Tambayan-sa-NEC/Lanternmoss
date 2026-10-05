/* The bag window. Renders the inventory's current state and turns clicks into commands; all rules (stacking,
   moving, using, equipping, crafting) live in the inventory, items and gameplay layers. Re-renders whenever the
   inventory changes. Two tabs:
     Bag    the grid, the worn gear (weapon / armour / trinket: click one to take it off) with the stats it adds, and
            the details of the hovered or selected item. Selection works like a simple drag-and-drop: click an item,
            then click where it should go (empty slot = move, same item = merge, different item = swap).
            Double-click or the first button uses / equips it; "Quick 6/7/8" puts a consumable on a quick key.
    Craft  every recipe the hero can use (config/crafting.js), what it needs and what you have.
    Pets   every pet (config/pets.js): take one along, rename it, give it a command; locked ones say how to find them. */
import { CHARACTERS } from '../config/characters.js';
import { RECIPES } from '../config/crafting.js';
import { PET_COMMANDS, PET_KEYS, PETS } from '../config/pets.js';
import { EQUIP_SLOTS, INVENTORY, QUICK_SLOTS, RARITIES } from '../config/items.js';
import { ctx } from '../core/context.js';
import { craftProblem, recipesFor, requirements } from '../items/crafting.js';
import { formatStat, gearTotals } from '../items/gear.js';
import { ITEM_ACTIONS, actionFor } from '../items/itemActions.js';
import { dom } from './dom.js';
import { icon } from './icons.js';
import { describeItem, itemIconHtml, rarityColor } from './itemTooltip.js';

const PROBLEM = { materials: 'Not enough materials.', coins: 'Not enough coins.', space: 'No room in the bag.' };
const titleCase = w => w.charAt(0) + w.slice(1).toLowerCase();

export const InventoryUI = {
  isOpen: false, tab: 'bag', selected: -1, hovered: -1, hoveredGear: null, message: '', inventory: null, commands: null,
  slotEls: [], gearEls: {}, quickBtns: [],

  /** commands (supplied by the game): use(slot) / unequip(where) / craft(recipe) -> { ok, message }, drop(slot) -> boolean,
      quick(i, itemId), quickIds() -> [itemId | null], worn() -> P.equipment. */
  init(inventory, commands) {
    this.inventory = inventory; this.commands = commands;
    const root = dom.inventory;
    // tabs
    const tabs = document.createElement('div'); tabs.className = 'inv-tabs';
    tabs.innerHTML = '<button type="button" data-tab="bag">Bag</button><button type="button" data-tab="craft">Craft</button><button type="button" data-tab="pets">Pets</button>';
    tabs.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) this.setTab(t.dataset.tab); });
    root.querySelector('.inv-head b').after(tabs); this.tabsEl = tabs;
    // worn gear
    const gear = document.createElement('div'); gear.className = 'inv-gear';
    for (const [k, label] of Object.entries(EQUIP_SLOTS)) {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'inv-slot gear'; el.dataset.label = label;
      el.addEventListener('click', () => { this.message = this.commands.unequip(k).message; this.render(); });
      el.addEventListener('mouseenter', () => { this.hoveredGear = k; this.renderDetail(); });
      el.addEventListener('mouseleave', () => { if (this.hoveredGear === k) { this.hoveredGear = null; this.renderDetail(); } });
      gear.appendChild(el); this.gearEls[k] = el;
    }
    this.gearStats = document.createElement('div'); this.gearStats.className = 'inv-gear-stats'; gear.appendChild(this.gearStats);
    root.querySelector('.inv-body').before(gear); this.gearRow = gear;
    // the grid
    dom.invGrid.style.setProperty('--cols', INVENTORY.columns);
    for (let i = 0; i < inventory.size; i++) {
      const el = document.createElement('button'); el.className = 'inv-slot'; el.type = 'button';
      el.addEventListener('mouseenter', () => { this.hovered = i; this.renderDetail(); });
      el.addEventListener('mouseleave', () => { if (this.hovered === i) { this.hovered = -1; this.renderDetail(); } });
      el.addEventListener('click', () => this.clickSlot(i));
      el.addEventListener('dblclick', () => this.use(i));
      dom.invGrid.appendChild(el); this.slotEls.push(el);
    }
    // quick-slot buttons
    for (let i = 0; i < QUICK_SLOTS.keys.length; i++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'inv-quick'; b.textContent = `Quick ${QUICK_SLOTS.labels[i]}`;
      b.addEventListener('click', () => this.quick(i)); dom.invMsg.before(b); this.quickBtns.push(b);
    }
    // crafting
    this.craftEl = document.createElement('div'); this.craftEl.className = 'inv-craft';
    this.craftEl.addEventListener('click', e => { const b = e.target.closest('[data-recipe]'); if (b) this.craft(b.dataset.recipe); });
    root.querySelector('.inv-actions').after(this.craftEl);
    // pets
    this.petsEl = document.createElement('div'); this.petsEl.className = 'inv-pets';
    this.petsEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pet) { this.commands.choosePet(b.dataset.pet); this.message = ''; }
      if (b.dataset.mode) this.commands.petCommand(b.dataset.mode);
      this.render();
    });
    this.petsEl.addEventListener('change', e => { const id = e.target.dataset?.rename; if (id) { e.target.value = this.commands.renamePet(id, e.target.value); this.render(); } });
    this.petsEl.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } });   // typing a name never moves the hero
    this.craftEl.after(this.petsEl);
    this.hintEl = root.querySelector('.inv-hint');
    dom.invUse.addEventListener('click', () => this.use(this.selected));
    dom.invDrop.addEventListener('click', () => this.drop(this.selected));
    dom.invClose.addEventListener('click', () => this.close());
    inventory.addEventListener('change', () => this.render());
  },

  toggle() { if (this.isOpen) this.close(); else this.open(); },
  open(tab = 'bag') { this.isOpen = ctx.inventoryOpen = true; this.message = ''; this.tab = tab; dom.inventory.classList.add('show'); this.render(); },
  close() { this.isOpen = ctx.inventoryOpen = false; this.selected = this.hovered = -1; this.hoveredGear = null; dom.inventory.classList.remove('show'); },
  setTab(t) { this.tab = t; this.selected = -1; this.message = ''; this.render(); },

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
  quick(i) {
    const s = this.inventory.getSlot(this.selected); if (!s) return;
    this.commands.quick(i, s.itemId);
    this.message = `${this.inventory.registry.get(s.itemId).name} is on key ${QUICK_SLOTS.labels[i]}.`; this.render();
  },
  craft(id) {
    const r = RECIPES.find(x => x.id === id); if (!r) return;
    this.message = this.commands.craft(r).message; this.render();
  },

  render() {
    if (!this.isOpen) return;
    for (const b of this.tabsEl.children) b.classList.toggle('on', b.dataset.tab === this.tab);
    dom.inventory.classList.toggle('crafting', this.tab === 'craft');
    dom.inventory.classList.toggle('petting', this.tab === 'pets');
    const inv = this.inventory;
    dom.invCount.textContent = `${inv.size - inv.freeSlots()} / ${inv.size}`;
    if (this.tab === 'craft') { this.renderCraft(); return; }
    if (this.tab === 'pets') { this.renderPets(); return; }
    const slots = inv.getSlots();
    if (this.selected >= 0 && !slots[this.selected]) this.selected = -1;
    slots.forEach((s, i) => {
      const el = this.slotEls[i], def = s && inv.registry.get(s.itemId);
      el.classList.toggle('filled', !!s); el.classList.toggle('selected', i === this.selected);
      const col = def && rarityColor(def, s.props);
      el.style.borderColor = def && col !== rarityColor({ rarity: 'common' }) ? col : '';
      const q = def ? this.commands.quickIds().indexOf(s.itemId) : -1;
      el.innerHTML = def ? itemIconHtml(def) + (s.quantity > 1 ? `<span class="inv-qty">${s.quantity}</span>` : '') +
        (q >= 0 ? `<span class="inv-qk">${QUICK_SLOTS.labels[q]}</span>` : '') : '';
      el.title = def ? def.name : '';
    });
    this.renderGear();
    this.renderDetail();
  },

  renderGear() {
    const worn = this.commands.worn(), reg = this.inventory.registry, P = ctx.player;
    for (const [k, el] of Object.entries(this.gearEls)) {
      const w = worn[k], def = w && reg.get(w.itemId);
      el.classList.toggle('filled', !!def);
      el.style.borderColor = def ? rarityColor(def, w.props) : '';
      el.innerHTML = def ? itemIconHtml(def) : `<span class="gear-empty">${el.dataset.label}</span>`;
      el.title = def ? `${def.name} (click to take off)` : `${el.dataset.label}: nothing worn`;
    }
    const pieces = Object.values(worn).filter(Boolean).map(w => ({ def: reg.get(w.itemId), props: w.props }));
    const t = gearTotals(pieces, P.charId), res = titleCase(CHARACTERS[P.charId].resource).toLowerCase();
    const parts = Object.entries(t).filter(([, v]) => v).map(([k, v]) => formatStat(k, v, res));
    this.gearStats.innerHTML = parts.length ? `<b>Gear:</b> ${parts.join(' · ')}` : '<span class="dim">No gear worn yet: equip a weapon, armour or a trinket.</span>';
  },

  renderDetail() {
    if (!this.isOpen || this.tab !== 'bag') return;
    const inv = this.inventory, hero = ctx.player.charId;
    const worn = this.hoveredGear && this.commands.worn()[this.hoveredGear];
    const shown = this.hovered >= 0 && inv.getSlot(this.hovered) ? this.hovered : this.selected;
    const s = shown >= 0 ? inv.getSlot(shown) : null;
    dom.invDetail.innerHTML = worn ? describeItem(inv.registry.get(worn.itemId), { quantity: 1, props: worn.props }, { hero, worn: true })
      : s ? describeItem(inv.registry.get(s.itemId), s, { hero }) : '<p class="inv-d-empty">Select an item to see what it is.</p>';
    const sel = this.selected >= 0 ? inv.getSlot(this.selected) : null, def = sel && inv.registry.get(sel.itemId), action = def && actionFor(def);
    dom.invUse.textContent = action ? ITEM_ACTIONS[action].label : 'Use';
    dom.invUse.disabled = !action || !ITEM_ACTIONS[action].supported;
    dom.invDrop.disabled = !def || !def.droppable;
    const quickable = action === 'use';
    this.quickBtns.forEach((b, i) => { b.style.display = quickable ? '' : 'none'; b.classList.toggle('on', quickable && this.commands.quickIds()[i] === sel.itemId); });
    dom.invMsg.textContent = this.message;
  },

  renderPets() {
    if (this.petsEl.contains(document.activeElement)) return;               // don't redraw under someone typing a name
    const v = this.commands.pets(), key = c => c.replace('Key', '');
    const modes = Object.entries(PET_COMMANDS).map(([m, c]) => `<button type="button" data-mode="${m}" class="${v.mode === m ? 'on' : ''}" title="${c.text}">${c.label}</button>`).join('');
    const rows = Object.entries(PETS).map(([id, p]) => {
      const open = v.unlocked.has(id), out = v.active === id, a = p.ability;
      const hp = out ? `<div class="pet-hp" title="${Math.ceil(v.hp(id))} / ${v.maxHp(id)} HP"><i style="transform:scaleX(${v.hp(id) / v.maxHp(id)})"></i></div>` : '';
      return `<div class="pet${open ? '' : ' locked'}${out ? ' out' : ''}" style="--pc:${p.color}"><div class="pc-face">${open ? icon(id) : '?'}</div>` +
        `<div class="pet-main"><div class="pet-head">${open ? `<input data-rename="${id}" value="${v.nameOf(id)}" maxlength="14" aria-label="Name">` : '<b>???</b>'}` +
        `<small>${p.name} · Lv ${v.level}</small>${hp}</div>` +
        `<p>${open ? p.blurb : `<em>Locked:</em> ${p.unlock.text}`}</p>` +
        (open ? `<div class="pet-ab">${icon(a.id)}<b>${a.name}</b> <kbd>${key(PET_KEYS.ability)}</kbd> ${a.cooldown}s · ${a.text}</div>` : '') + '</div>' +
        (open ? (out ? `<span class="pet-with">${v.fainted ? 'Resting' : 'With you'}</span>` : `<button type="button" data-pet="${id}">Take along</button>`) : '') + '</div>';
    });
    this.petsEl.innerHTML = `<div class="pet-cmds"><b>Command</b> ${modes} <span class="dim">(<kbd>${key(PET_KEYS.command)}</kbd> cycles · stand still by your pet and press <kbd>E</kbd> to pet them)</span></div>` +
      `<div class="pet-list">${rows.join('')}</div>`;
  },

  renderCraft() {
    const inv = this.inventory, P = ctx.player, reg = inv.registry;
    const rows = recipesFor(P.charId, reg).map(r => {
      const out = reg.get(r.result), req = requirements(r, inv, P.coins), problem = craftProblem(r, inv, P.coins);
      const col = rarityColor(out, r.rarity ? { rarity: r.rarity } : null);
      const needs = req.items.map(n => `<span class="need${n.have >= n.need ? ' ok' : ''}">${itemIconHtml(reg.get(n.item))}${Math.min(n.have, 99)}/${n.need}</span>`).join('') +
        (req.coins.need ? `<span class="need coin${req.coins.have >= req.coins.need ? ' ok' : ''}">✦ ${req.coins.need}</span>` : '');
      return `<div class="recipe${problem ? '' : ' can'}" title="${out.description.replace(/"/g, '&quot;')}">${itemIconHtml(out)}` +
        `<div class="rc-name" style="color:${col}">${r.qty > 1 ? `${r.qty}x ` : ''}${out.name}<small>${out.equip ? EQUIP_SLOTS[out.equip.slot] : ''}${r.rarity ? ` · ${RARITIES[r.rarity].label}` : ''}</small></div>` +
        `<div class="rc-needs">${needs}</div><button type="button" data-recipe="${r.id}" ${problem ? `disabled title="${PROBLEM[problem]}"` : ''}>Craft</button></div>`;
    });
    this.craftEl.innerHTML = `<div class="rc-list">${rows.join('')}</div><div class="inv-msg rc-msg">${this.message}</div>`;
  },
};
