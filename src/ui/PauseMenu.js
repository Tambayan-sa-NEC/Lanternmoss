/* PAUSE MENU (Esc / P during play, or automatically when the window loses focus). Pausing freezes the simulation
   (Game.update skips while ctx.paused; the scene keeps rendering), ducks the audio and releases held keys.
   Pages:
     main      Resume · Settings · Controls · Quit to menu
     settings  generated from SETTINGS_SCHEMA (config/settings.js); changes apply and save immediately
     controls  the fixed keys (config/controls.js) + the current hero's abilities (CHARACTERS), never out of date
     quit      confirmation: going back to the menu restarts the adventure (there is no saving yet)
   Esc on a sub-page goes back to the main page; Esc / P on the main page resumes. */
import { ABILITY_TEXT, CHARACTERS } from '../config/characters.js';
import { AIM_CONTROLS, FIXED_CONTROLS } from '../config/controls.js';
import { PLANETS } from '../config/planets.js';
import { SETTINGS_SCHEMA } from '../config/settings.js';
import { cancelAim } from '../combat/aiming.js';
import { ctx } from '../core/context.js';
import { resetSettings, setSetting, settings } from '../core/settings.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { dom } from './dom.js';
import { icon } from './icons.js';

const keys = list => list.map(k => `<kbd>${k}</kbd>`).join(' ');
const fmt = (def, v) => `${v}${def.unit ?? ''}`;

function settingControl(def) {
  const v = settings[def.key];
  if (def.type === 'toggle') return `<button type="button" class="tog ${v ? 'on' : ''}" data-set="${def.key}" aria-pressed="${v}"><i></i></button>`;
  if (def.type === 'choice') return `<div class="seg">${def.options.map(([o, label]) =>
    `<button type="button" class="${o === v ? 'on' : ''}" data-set="${def.key}" data-value="${o}">${label}</button>`).join('')}</div>`;
  return `<input type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${v}" data-set="${def.key}"><output>${fmt(def, v)}</output>`;
}

const PAGES = {
  main: () => {
    const hero = CHARACTERS[ctx.player.charId];
    return `<h2>Paused</h2><div class="sub">${PLANETS[ctx.planet].name} · ${hero.title} · level ${ctx.player.level}</div>
      <div class="menu">
        <button type="button" class="primary" data-go="resume">Resume</button>
        <button type="button" data-go="settings">Settings</button>
        <button type="button" data-go="controls">Controls</button>
        <button type="button" class="quiet" data-go="quit">Quit to menu</button>
      </div><div class="foot"><kbd>Esc</kbd> resume</div>`;
  },
  settings: () => `<h2>Settings</h2><div class="scroll">${SETTINGS_SCHEMA.map(g => `<section><h3>${g.group}</h3>${g.items.map(def =>
      `<div class="row"><span>${def.label}</span><span class="ctl">${settingControl(def)}</span></div>`).join('')}</section>`).join('')}</div>
    <div class="menu row2"><button type="button" class="quiet" data-go="reset">Reset to defaults</button><button type="button" class="primary" data-go="main">Back</button></div>
    <div class="foot">Changes apply right away and are remembered on this device · <kbd>Esc</kbd> back</div>`,
  controls: () => {
    const hero = CHARACTERS[ctx.player.charId], abilities = Object.entries(hero.abilities).map(([id, s]) =>
      `<div class="krow ab"><span class="keys">${keys(s.label.split('/'))}${s.mouse ? ' <kbd>Click</kbd>' : ''}</span>
        <span class="ic" style="--c:#${s.color.toString(16).padStart(6, '0')}">${icon(id)}</span><span><b>${s.name}</b>${s.ult ? ' <em>ultimate</em>' : ''}<small>${ABILITY_TEXT[id] ?? ''}</small></span></div>`).join('');
    const rows = list => list.map(([k, what]) => `<div class="krow"><span class="keys">${keys(k)}</span><span>${what}</span></div>`).join('');
    return `<h2>Controls</h2><div class="scroll cols">
      <section class="wide"><h3>${hero.title}'s abilities</h3>${abilities}${rows(AIM_CONTROLS)}</section>
      ${FIXED_CONTROLS.map(g => `<section><h3>${g.group}</h3>${rows(g.rows)}</section>`).join('')}</div>
      <div class="menu"><button type="button" class="primary" data-go="main">Back</button></div><div class="foot"><kbd>Esc</kbd> back</div>`;
  },
  quit: () => `<h2>Quit to menu?</h2><p class="warn">Your adventure restarts from the first planet: your level, bag and progress on
    ${PLANETS[ctx.planet].name} are lost (there is no saving yet).</p>
    <div class="menu row2"><button type="button" data-go="main">Keep playing</button><button type="button" class="danger" data-go="confirm-quit">Quit to menu</button></div>`,
};

export const PauseMenu = {
  isOpen: false, page: 'main', handlers: null,
  /** handlers.onQuit() returns to the main menu (it restarts the adventure). */
  init(handlers) {
    this.handlers = handlers;
    dom.pause.addEventListener('click', e => this.onClick(e));
    dom.pause.addEventListener('input', e => this.onInput(e));
    const autoPause = () => { if (settings.pauseOnBlur) this.open(); };
    addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  },
  open() {
    if (this.isOpen || !ctx.started || ctx.transitioning) return;
    this.isOpen = true; ctx.paused = true; releaseAllKeys(); cancelAim(); audio.duck(true);
    dom.tip.style.display = 'none'; document.body.classList.add('paused'); dom.pause.style.display = 'flex';
    this.page = null; this.show('main');
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; ctx.paused = false; audio.duck(false);
    document.body.classList.remove('paused'); dom.pause.style.display = 'none';
  },
  /** Renders a page; re-rendering the same page (after a settings change) keeps its scroll position. */
  show(page) {
    const same = page === this.page && this.isOpen, scroll = same ? dom.pause.querySelector('.scroll')?.scrollTop ?? 0 : 0;
    this.page = page; dom.pause.innerHTML = `<div class="panel ${page}">${PAGES[page]()}</div>`;
    if (same) { const sc = dom.pause.querySelector('.scroll'); if (sc) sc.scrollTop = scroll; } else dom.pause.querySelector('.primary')?.focus();
  },
  /** Keys while paused (play input is ignored). */
  key(code) {
    if (code === 'Escape') { if (this.page === 'main') this.close(); else this.show('main'); }
    else if (code === 'KeyP' && this.page === 'main') this.close();
  },
  onClick(e) {
    const go = e.target.closest('[data-go]')?.dataset.go, set = e.target.closest('button[data-set]');
    if (go === 'resume') this.close();
    else if (go === 'confirm-quit') { this.close(); this.handlers.onQuit(); }
    else if (go === 'reset') { resetSettings(); this.show('settings'); }
    else if (go) this.show(go);
    else if (set) {                                                        // toggles and choice buttons
      const key = set.dataset.set; setSetting(key, set.dataset.value ?? !settings[key]); this.show('settings');
    }
  },
  onInput(e) {                                                             // sliders apply while dragging
    const el = e.target; if (!el.dataset?.set) return;
    setSetting(el.dataset.set, Number(el.value));
    const def = SETTINGS_SCHEMA.flatMap(g => g.items).find(d => d.key === el.dataset.set);
    el.nextElementSibling.textContent = fmt(def, settings[def.key]);
  },
};
