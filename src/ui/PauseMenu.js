/* PAUSE MENU (Esc / P during play, or automatically when the window loses focus). Pausing freezes the simulation
   (Game.update skips while ctx.paused; the scene keeps rendering), ducks the audio and releases held keys.
   Pages:
     main      Resume · Settings · Controls · Quit to menu
     settings  generated from SETTINGS_SCHEMA (config/settings.js); changes apply and save immediately. Its Keys section
               remaps any KEYBINDS action (click one, press the new key; a key already in use swaps over)
     controls  the current keybinds, the fixed keys (config/controls.js) and the hero's abilities, never out of date
     quit      save before returning to the title; Continue restores the adventure
     new / import   confirmation before replacing the adventure slot
     credits   who made it (config/credits.js); title screen only
   Esc on a sub-page goes back to the main page; Esc / P on the main page resumes.
   The title screen opens single pages with openPanel(page) (no pausing): Back / Esc closes the panel again. */
import { ABILITY_TEXT, CHARACTERS } from '../config/characters.js';
import { AIM_CONTROLS, FIXED_CONTROLS, KEYBINDS, keyLabel } from '../config/controls.js';
import { CREDITS } from '../config/credits.js';
import { PLANETS } from '../config/planets.js';
import { SETTINGS_SCHEMA } from '../config/settings.js';
import { cancelAim } from '../combat/aiming.js';
import { ctx } from '../core/context.js';
import { bindKbd, bindLabel, bindable, is, rebind, resetBinds } from '../core/keybinds.js';
import { resetSettings, setSetting, settings } from '../core/settings.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { dom } from './dom.js';
import { icon } from './icons.js';
import { JournalUI } from './JournalUI.js';
import { toast } from './toast.js';

const keys = list => list.map(k => `<kbd>${k}</kbd>`).join(' ');
const fmt = (def, v) => `${v}${def.unit ?? ''}`;

function settingControl(def) {
  const v = settings[def.key];
  if (def.type === 'toggle') return `<button type="button" class="tog ${v ? 'on' : ''}" data-set="${def.key}" aria-pressed="${v}"><i></i></button>`;
  if (def.type === 'choice') return `<div class="seg">${def.options.map(([o, label]) =>
    `<button type="button" class="${o === v ? 'on' : ''}" data-set="${def.key}" data-value="${o}">${label}</button>`).join('')}</div>`;
  return `<input type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${v}" data-set="${def.key}"><output>${fmt(def, v)}</output>`;
}

const BIND_GROUPS = [...new Set(KEYBINDS.map(b => b.group))];
/** The Keys section of the Settings page: every remappable action, grouped. */
function keysSection() {
  const rows = g => KEYBINDS.filter(b => b.group === g).map(b => `<div class="row"><span>${b.label}</span><span class="ctl">` +
    `<button type="button" class="bind ${PauseMenu.capture === b.id ? 'listening' : ''}" data-bind="${b.id}">` +
    `${PauseMenu.capture === b.id ? 'Press a key…' : bindLabel(b.id, true)}</button></span></div>`).join('');
  return `<section class="keys"><h3>Keys</h3><p class="note">Click an action, then press its new key (<kbd>Esc</kbd> cancels). A key
    that's already in use swaps over. <kbd>1</kbd>–<kbd>9</kbd> (the hotbar) and <kbd>Esc</kbd> can't be taken.</p>
    ${BIND_GROUPS.map(g => `<h4>${g}</h4>${rows(g)}`).join('')}
    ${PauseMenu.bindMsg ? `<p class="bindmsg">${PauseMenu.bindMsg}</p>` : ''}
    <div class="menu"><button type="button" class="quiet" data-go="reset-keys">Reset keys</button></div></section>`;
}

const PAGES = {
  main: () => {
    const hero = CHARACTERS[ctx.player.charId];
    return `<h2>Paused</h2><div class="sub">${PLANETS[ctx.planet].name} · ${hero.title} · level ${ctx.player.level}</div>
      <div class="menu">
        <button type="button" class="primary" data-go="resume">Resume</button>
        <button type="button" data-go="save">Save</button>
        <div class="row2"><button type="button" data-go="export">Export Save</button><button type="button" data-go="import">Import Save</button></div>
        <button type="button" data-go="journal">Journal</button>
        <button type="button" data-go="settings">Settings</button>
        <button type="button" data-go="controls">Controls</button>
        <button type="button" class="quiet" data-go="quit">Quit to menu</button>
      </div><div class="foot"><kbd>Esc</kbd> resume</div>`;
  },
  settings: () => `<h2>Settings</h2><div class="scroll">${SETTINGS_SCHEMA.map(g => `<section><h3>${g.group}</h3>${g.items.map(def =>
      `<div class="row"><span>${def.label}</span><span class="ctl">${settingControl(def)}</span></div>`).join('')}</section>`).join('')}${keysSection()}</div>
    <div class="menu row2"><button type="button" class="quiet" data-go="reset">Reset to defaults</button><button type="button" class="primary" data-go="main">Back</button></div>
    <div class="foot">Changes apply right away and are remembered on this device · <kbd>Esc</kbd> back</div>`,
  controls: () => {
    const hero = CHARACTERS[ctx.player.charId], abilities = Object.entries(hero.abilities).map(([id, s]) =>
      `<div class="krow ab"><span class="keys">${keys(s.label.split('/'))}${s.mouse ? ' <kbd>Click</kbd>' : ''}</span>
        <span class="ic" style="--c:#${s.color.toString(16).padStart(6, '0')}">${icon(id)}</span><span><b>${s.name}</b>${s.ult ? ' <em>ultimate</em>' : ''}<small>${ABILITY_TEXT[id] ?? ''}</small></span></div>`).join('');
    const rows = list => list.map(([k, what]) => `<div class="krow"><span class="keys">${keys(k)}</span><span>${what}</span></div>`).join('');
    const bound = g => KEYBINDS.filter(b => b.group === g && g !== 'Skills').map(b => `<div class="krow"><span class="keys">${bindKbd(b.id, true)}</span><span>${b.label}</span></div>`).join('');
    const skillKeys = KEYBINDS.filter(b => b.group === 'Skills').map(b => bindKbd(b.id)).join(' ');
    const heroPart = ctx.started ? `<section class="wide"><h3>${hero.title}'s abilities</h3>${abilities}${rows(AIM_CONTROLS)}</section>`
      : `<section class="wide"><h3>Abilities</h3><p class="note">Each hero has five skills on ${skillKeys} (the first one on click too; the last is the
         ultimate). You'll see them on the character cards, on the skill bar (hover for details), and here during play.</p>${rows(AIM_CONTROLS)}</section>`;
    return `<h2>Controls</h2><div class="scroll cols">
      ${heroPart}
      ${BIND_GROUPS.filter(g => g !== 'Skills').map(g => `<section><h3>${g}</h3>${bound(g)}</section>`).join('')}
      ${FIXED_CONTROLS.map(g => `<section><h3>${g.group}</h3>${rows(g.rows)}</section>`).join('')}
      <p class="note wide">Change any of these in Settings → Keys.</p></div>
      <div class="menu"><button type="button" class="primary" data-go="main">Back</button></div><div class="foot"><kbd>Esc</kbd> back</div>`;
  },
  quit: () => `<h2>Quit to menu?</h2><p class="warn">Your adventure will be saved. Choose Continue on the title screen to return here.</p>
    <div class="menu row2"><button type="button" data-go="main">Keep playing</button><button type="button" class="primary" data-go="confirm-quit">Save and quit</button></div>`,
  new: () => `<h2>New adventure?</h2><p class="warn">Starting an adventure replaces your saved adventure. Export a copy first if you want to keep it.</p>
    <div class="menu"><button type="button" data-go="export">Export Save</button><div class="row2"><button type="button" data-go="main">Back</button><button type="button" class="danger" data-go="confirm-new">Start new</button></div></div>`,
  import: () => `<h2>Import adventure?</h2><p class="warn">Importing replaces your saved adventure and continues the imported game. Export your current adventure first if you want to keep it.</p>
    <div class="menu"><button type="button" data-go="export">Export Save</button><div class="row2"><button type="button" data-go="main">Cancel</button><button type="button" class="danger" data-go="confirm-import">Import and continue</button></div></div>`,
  credits: () => `<h2>Credits</h2><div class="scroll credits">${CREDITS.map(([h, lines]) =>
      `<section><h3>${h}</h3>${lines.map(l => `<p>${l}</p>`).join('')}</section>`).join('')}</div>
    <div class="menu"><button type="button" class="primary" data-go="main">Back</button></div><div class="foot"><kbd>Esc</kbd> back</div>`,
};

export const PauseMenu = {
  isOpen: false, page: 'main', handlers: null, panel: false,
  pendingImport: null,
  capture: null, bindMsg: '',      // the action waiting for its new key (Settings → Keys), and the last remap's note
  /** handlers.onQuit() returns to the main menu (it restarts the adventure); onPanelClosed() after a title-screen panel. */
  init(handlers) {
    this.handlers = handlers;
    dom.pause.addEventListener('click', e => this.onClick(e));
    dom.pause.addEventListener('input', e => this.onInput(e));
    const autoPause = () => { if (settings.pauseOnBlur && !this.panel) this.open(); };
    addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  },
  open() {
    if (this.isOpen || !ctx.started || ctx.transitioning || ctx.paused) return;   // (paused already: the pet menu is up)
    this.isOpen = true; ctx.paused = true; releaseAllKeys(); cancelAim(); audio.duck(true);
    dom.tip.style.display = 'none'; document.body.classList.add('paused'); dom.pause.style.display = 'flex';
    this.page = null; this.show('main');
  },
  /** A single page over the title screen (settings / controls / credits): nothing to pause. */
  openPanel(page) {
    if (this.isOpen) return;
    this.isOpen = true; this.panel = true; dom.pause.style.display = 'flex'; this.page = null; this.show(page);
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; dom.pause.style.display = 'none'; this.capture = null; this.bindMsg = '';
    this.pendingImport = null;
    if (this.panel) { this.panel = false; this.handlers.onPanelClosed?.(); return; }
    ctx.paused = false; audio.duck(false); document.body.classList.remove('paused');
  },
  /** Renders a page; re-rendering the same page (after a settings change) keeps its scroll position. */
  show(page) {
    const same = page === this.page && this.isOpen, scroll = same ? dom.pause.querySelector('.scroll')?.scrollTop ?? 0 : 0;
    this.page = page; dom.pause.innerHTML = `<div class="panel ${page}">${PAGES[page]()}</div>`;
    if (same) { const sc = dom.pause.querySelector('.scroll'); if (sc) sc.scrollTop = scroll; } else dom.pause.querySelector('.primary')?.focus();
  },
  /** Keys while paused (play input is ignored). While an action waits for its new key, the key goes to it. */
  key(code) {
    if (this.capture) { this.assign(code); return; }
    if (code === 'Escape') { if (this.page === 'main' || this.panel) this.close(); else this.show('main'); }
    else if (is('pause', code) && this.page === 'main') this.close();
  },
  /** Gives the waiting action `code`. */
  assign(code) {
    const id = this.capture; this.capture = null;
    const label = KEYBINDS.find(b => b.id === id).label;
    if (code === 'Escape') this.bindMsg = '';
    else if (!bindable(code)) this.bindMsg = `${keyLabel(code)} can't be used: ${/^Digit/.test(code) ? 'the number keys hold hotbar items' : 'it is reserved'}.`;
    else {
      const swapped = rebind(id, code);
      this.bindMsg = `${label}: ${keyLabel(code)}${swapped ? ` (${KEYBINDS.find(b => b.id === swapped).label} moved to ${bindLabel(swapped)})` : ''}.`;
    }
    this.show('settings');
  },
  onClick(e) {
    const go = e.target.closest('[data-go]')?.dataset.go, set = e.target.closest('button[data-set]'), bind = e.target.closest('button[data-bind]');
    if (bind) { this.capture = this.capture === bind.dataset.bind ? null : bind.dataset.bind; this.bindMsg = ''; this.show('settings'); return; }
    this.capture = null;
    if (go === 'reset-keys') { resetBinds(); this.bindMsg = 'Keys are back to their defaults.'; this.show('settings'); return; }
    if (go === 'resume') this.close();
    else if (go === 'journal') JournalUI.open();                         // on top; closing it comes back here
    else if (go === 'save') this.handlers.onSave();
    else if (go === 'export') this.handlers.onExport();
    else if (go === 'import') this.chooseImport();
    else if (go === 'confirm-quit') this.handlers.onQuit();
    else if (go === 'confirm-new') this.handlers.onNew();
    else if (go === 'confirm-import') { const data = this.pendingImport; if (data) this.handlers.onConfirmImport(data); }
    else if (go === 'reset') { resetSettings(); this.show('settings'); }
    else if (go === 'main' && this.panel) this.close();                  // a title-screen panel's Back
    else if (go) this.show(go);
    else if (set) {                                                        // toggles and choice buttons
      const key = set.dataset.set; setSetting(key, set.dataset.value ?? !settings[key]); this.show('settings');
    }
  },
  chooseImport() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const result = await this.handlers.onImport(input.files?.[0]); input.remove();
      if (result.cancelled) return;
      if (!result.ok) { toast(result.message, { menu: true }); return; }
      this.pendingImport = result.data;
      if (this.isOpen) this.show('import'); else if (ctx.started) { this.open(); this.show('import'); } else this.openPanel('import');
    });
    input.addEventListener('cancel', () => input.remove(), { once: true });
    input.hidden = true; document.body.appendChild(input); input.click();
  },
  onInput(e) {                                                             // sliders apply while dragging
    const el = e.target; if (!el.dataset?.set) return;
    setSetting(el.dataset.set, Number(el.value));
    const def = SETTINGS_SCHEMA.flatMap(g => g.items).find(d => d.key === el.dataset.set);
    el.nextElementSibling.textContent = fmt(def, settings[def.key]);
  },
};
