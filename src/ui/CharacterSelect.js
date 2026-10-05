/* The selection screen (#start), reached from the title screen (src/ui/MainMenu.js) or with C during play.
   The live 3D scene behind it is the preview; the main menu runs the camera orbit. */
import { CHARACTERS } from '../config/characters.js';
import { ctx } from '../core/context.js';
import { dom, flashEl } from './dom.js';
import { toast } from './toast.js';

export const CharacterSelect = {
  choice: null, cards: {}, menuArmed: -1, handlers: null, visible: false,
  /** handlers: onPick(id) applies a hero, onConfirm() starts play, onOpen() resets the adventure. */
  init(handlers) {
    this.handlers = handlers;
    for (const [id, c] of Object.entries(CHARACTERS)) {
      const b = document.createElement('button'); b.className = 'card';
      b.innerHTML = `<div class="pic ${id}"></div><h3 style="color:${c.color}">${c.title}</h3><div class="sub">${c.style} · ${c.companionName}</div>` +
        `<div class="bl">${c.blurb}</div><ul>${Object.values(c.abilities).map(a => `<li><b>${a.label}</b> ${a.name}</li>`).join('')}</ul>`;
      b.addEventListener('click', () => this.pick(id)); b.addEventListener('dblclick', () => { this.pick(id); this.confirm(); });
      dom.cards.appendChild(b); this.cards[id] = b;
    }
    dom.go.addEventListener('click', () => this.confirm());
  },
  pick(id) {
    this.choice = id; for (const k in this.cards) this.cards[k].classList.toggle('sel', k === id);
    dom.go.classList.remove('disabled'); dom.go.textContent = `Play as ${CHARACTERS[id].title}  ▶`;
    this.handlers.onPick(id);
  },
  confirm() { if (!this.choice) { flashEl(dom.go, 'nudge'); return; } this.handlers.onConfirm(); },
  key(code) {
    const ids = Object.keys(CHARACTERS), i = ids.indexOf(this.choice);
    if (code === 'ArrowLeft' || code === 'KeyA') this.pick(ids[i < 0 ? 0 : (i + ids.length - 1) % ids.length]);           // nothing picked yet:
    else if (code === 'ArrowRight' || code === 'KeyD') this.pick(ids[i < 0 ? ids.length - 1 : (i + 1) % ids.length]);   // left/right card
    else if (/^Digit[1-9]$/.test(code) && ids[+code.slice(5) - 1]) this.pick(ids[+code.slice(5) - 1]);
    else if (code === 'Enter' || code === 'Space') this.confirm();
  },
  /** Back to selection from play (C twice): restarts the adventure, then shows the screen. */
  open() { this.handlers.onOpen(); this.show(); },
  /** Shows the screen with its entrance animation (cards slide in). */
  show() {
    ctx.started = false; this.visible = true; this.choice = null; document.body.classList.add('menu');
    for (const k in this.cards) this.cards[k].classList.remove('sel');
    dom.go.classList.add('disabled'); dom.go.textContent = 'Choose your hero';
    dom.start.classList.remove('leave', 'enter'); dom.start.style.display = 'flex'; void dom.start.offsetWidth;
    dom.start.style.opacity = 1; dom.start.classList.add('enter');
  },
  /** Back to the title screen: a quick fade (the title takes over). */
  hide() {
    this.visible = false; dom.start.classList.remove('enter'); dom.start.classList.add('leave');
    setTimeout(() => { if (!this.visible) dom.start.style.display = 'none'; }, 350);
  },
  /** Into the game: the overlay fades out while the camera swoops in (hidden, not removed: C brings it back). */
  close() {
    this.visible = false; document.body.classList.remove('menu'); dom.start.style.opacity = 0;
    setTimeout(() => { if (ctx.started) dom.start.style.display = 'none'; }, 700);
  },
  requestMenu() {      // C twice: going back restarts the adventure, so ask once
    if (this.menuArmed > ctx.time) { this.menuArmed = -1; this.open(); }
    else { this.menuArmed = ctx.time + 2.5; toast('Press C again to return to character select (your adventure restarts).'); }
  },
};
