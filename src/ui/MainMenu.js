/* MAIN MENU: the title screen (#title) in front of character selection, over a slow, wide orbit of the planet.
     Play       -> character selection (#start, src/ui/CharacterSelect.js); its Back / Esc returns here
     Settings / Controls / Credits -> single pages of the pause menu (PauseMenu.openPanel), no pausing involved
   The campaign strip lists the planets in order with their bosses (config/planets.js). Music starts on the first
   click or key press (browsers only allow audio after a gesture). Screens: title / select / null (playing). */
import { COMBAT } from '../config/combat.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { audio } from '../systems/AudioSystem.js';
import { orbitCamera } from '../systems/CameraSystem.js';
import { CharacterSelect } from './CharacterSelect.js';
import { dom } from './dom.js';
import { PauseMenu } from './PauseMenu.js';

const ORBIT = { title: { dist: 13, speed: 0.1, pitch: 0.55 }, select: { dist: 4.6, speed: 0.22, pitch: 0.3 } };
const hex = c => `#${c.toString(16).padStart(6, '0')}`;

export const MainMenu = {
  handlers: null, focus: 0,
  get screen() { return ctx.started ? null : CharacterSelect.visible ? 'select' : 'title'; },
  get buttons() { return [...dom.titleMenu.querySelectorAll('button')]; },

  /** handlers.onReset() restarts the adventure (used when quitting back here from play). */
  init(handlers) {
    this.handlers = handlers;
    dom.campaign.innerHTML = PLANETS.map((p, i) => {
      const boss = { ...COMBAT.enemies[p.boss.type], ...p.boss }.name.split(',')[0];
      return `${i ? '<i class="arrow">➜</i>' : ''}<div class="planet"><b style="--c:${hex(p.palette.ground[0])};--s:${hex(p.palette.sky.mid)}"></b>` +
        `<span><strong>${p.name}</strong><small>${boss}</small></span></div>`;
    }).join('');
    dom.titleMenu.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.act(b.dataset.act); });
    dom.titleMenu.addEventListener('mousemove', e => { const i = this.buttons.indexOf(e.target.closest('button')); if (i >= 0) this.setFocus(i); });
    dom.selBack.addEventListener('click', () => this.backToTitle());
    const wake = () => { audio.init(); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
    addEventListener('pointerdown', wake); addEventListener('keydown', wake);
    this.showTitle();
  },

  /** Shows the title screen (reset = also restart the adventure, e.g. after "Quit to menu"). */
  showTitle(reset = false) {
    if (reset) this.handlers.onReset();
    ctx.started = false; document.body.classList.add('menu');
    dom.title.classList.remove('leave', 'enter'); dom.title.style.display = 'flex'; void dom.title.offsetWidth; dom.title.classList.add('enter');
    this.setFocus(0);
  },
  play() {
    dom.title.classList.remove('enter'); dom.title.classList.add('leave');
    setTimeout(() => { if (this.screen !== 'title') dom.title.style.display = 'none'; }, 380);
    CharacterSelect.show();
  },
  backToTitle() { CharacterSelect.hide(); this.showTitle(); },
  act(name) {
    audio.init();
    if (name === 'play') this.play(); else PauseMenu.openPanel(name);
  },
  setFocus(i) { this.focus = i; this.buttons.forEach((b, k) => b.classList.toggle('focus', k === i)); },
  onPanelClosed() { this.setFocus(this.focus); },

  /** Keys while no game is running (InputSystem onMenuKey). */
  key(code) {
    if (PauseMenu.isOpen) { PauseMenu.key(code); return; }
    if (this.screen === 'select') { if (code === 'Escape') this.backToTitle(); else CharacterSelect.key(code); return; }
    const n = this.buttons.length;
    if (code === 'ArrowDown' || code === 'KeyS') this.setFocus((this.focus + 1) % n);
    else if (code === 'ArrowUp' || code === 'KeyW') this.setFocus((this.focus + n - 1) % n);
    else if ((code === 'Enter' || code === 'Space') && !dom.title.contains(document.activeElement)) this.act(this.buttons[this.focus].dataset.act);   // a focused button clicks itself
  },
  /** The showcase camera orbit behind the menus: wide and high on the title screen, close on the hero for selection. */
  update(dt) {
    if (ctx.started) return; const o = ORBIT[this.screen];
    orbitCamera(dt, o.dist, CharacterSelect.dragging ? 0 : o.speed, o.pitch);          // holds still after you drag the hero
  },
};
