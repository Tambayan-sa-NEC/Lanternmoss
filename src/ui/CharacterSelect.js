/* CHARACTER SELECT (#start), reached from the title screen (src/ui/MainMenu.js) or with C during play.
   Left: a compact picker (portrait, role, difficulty). Middle: the hero's live 3D model, close up; drag to turn it,
   and the hero shows off now and then. Right: the detail panel for the picked hero (role, difficulty, health and
   resource, 1-5 ratings, companion, and all five abilities with icon, keys and description, the ultimate in gold).
   Everything shown comes from CHARACTERS (config/characters.js, incl. each hero's `profile`) and ABILITY_TEXT.
   The screen opens with the current hero already picked, so Play is always one click away. */
import { ABILITY_TEXT, CHARACTERS } from '../config/characters.js';
import { ctx } from '../core/context.js';
import { audio } from '../systems/AudioSystem.js';
import { spinCamera } from '../systems/CameraSystem.js';
import { dom, flashEl } from './dom.js';
import { icon } from './icons.js';
import { toast } from './toast.js';

const SHOWCASE_EVERY = 6;                                     // seconds between idle flourishes
const DIFFICULTY = ['', 'Easy', 'Normal', 'Tricky'];
const RATINGS = { damage: 'Damage', toughness: 'Toughness', range: 'Range', mobility: 'Mobility' };
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const pips = n => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
const hex = c => `#${c.toString(16).padStart(6, '0')}`;
const titleCase = w => w.charAt(0) + w.slice(1).toLowerCase();

/** The detail panel for one hero. */
function detailHtml(id) {
  const c = CHARACTERS[id], p = c.profile;
  const abilities = Object.entries(c.abilities).map(([aid, s]) =>
    `<div class="ab${s.ult ? ' ult' : ''}"><span class="ic" style="--c:${hex(s.color)}">${icon(aid)}</span>` +
    `<span class="tx"><b>${s.name}</b>${s.ult ? '<em>ultimate</em>' : ''}<small>${ABILITY_TEXT[aid] ?? ''}</small></span>` +
    `<span class="akeys">${s.label.split('/').map(k => `<kbd>${k}</kbd>`).join('')}</span></div>`).join('');
  return `<div class="hd"><div class="pic ${id}"></div><div><h3 style="color:${c.color}">${c.title}</h3><div class="sub">${c.style}</div></div></div>
    <div class="tags"><span class="role">${p.role}</span><span class="diff d${p.difficulty}">${DIFFICULTY[p.difficulty]} ${stars(p.difficulty)}</span></div>
    <p class="bl">${c.blurb}</p>
    <div class="vit"><span><b>${c.stats.maxHp}</b> health</span><span><b>${c.stats.maxMana}</b> ${titleCase(c.resource)}</span>${c.stats.armor ? `<span><b>${Math.round(c.stats.armor * 100)}%</b> armor</span>` : ''}</div>
    <div class="rt">${Object.entries(RATINGS).map(([k, label]) => `<div><span>${label}</span><span class="pips">${pips(p.ratings[k])}</span></div>`).join('')}</div>
    <div class="comp"><b>${c.companionName}</b> ${p.companionText}.</div>
    <div class="abl">${abilities}</div>`;
}

export const CharacterSelect = {
  choice: null, cards: {}, menuArmed: -1, handlers: null, visible: false, showT: 0, dragT: -99,
  /** handlers: onPick(id) applies the hero (and shows it off), onShowcase() an idle flourish, onConfirm() starts play,
      onOpen() resets the adventure. */
  init(handlers) {
    this.handlers = handlers;
    for (const [id, c] of Object.entries(CHARACTERS)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
      b.innerHTML = `<div class="pic ${id}"></div><h3 style="color:${c.color}">${c.title}</h3>` +
        `<div class="sub">${c.profile.role}</div><div class="stars d${c.profile.difficulty}">${stars(c.profile.difficulty)}</div>`;
      b.addEventListener('click', () => this.pick(id)); b.addEventListener('dblclick', () => { this.pick(id); this.confirm(); });
      dom.cards.appendChild(b); this.cards[id] = b;
    }
    dom.go.addEventListener('click', () => this.confirm());
    // drag anywhere on the open stage (not on a panel) to turn the hero
    let drag = null;
    dom.start.addEventListener('pointerdown', e => { if (e.target === dom.start || e.target.classList?.contains('stage')) drag = e.clientX; });
    addEventListener('pointermove', e => { if (drag === null) return; spinCamera(-(e.clientX - drag) * 0.008); drag = e.clientX; this.dragT = ctx.time; });
    addEventListener('pointerup', () => { drag = null; });
  },
  /** quiet = no sound or flourish (opening the screen on the hero you already have). */
  pick(id, quiet = false) {
    const same = id === this.choice;
    this.choice = id; for (const k in this.cards) this.cards[k].classList.toggle('sel', k === id);
    dom.go.classList.remove('disabled'); dom.go.textContent = `Play as ${CHARACTERS[id].title}  ▶`;
    if (!same) { dom.heroDetail.innerHTML = detailHtml(id); flashEl(dom.heroDetail, 'swap'); }
    this.handlers.onPick(id, quiet); this.showT = SHOWCASE_EVERY;
    if (!quiet) audio.heroCue(CHARACTERS[id].profile.voice);
  },
  confirm() { if (!this.choice) { flashEl(dom.go, 'nudge'); return; } this.handlers.onConfirm(); },
  key(code) {
    const ids = Object.keys(CHARACTERS), i = Math.max(0, ids.indexOf(this.choice));
    if (['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(code)) this.pick(ids[(i + ids.length - 1) % ids.length]);
    else if (['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(code)) this.pick(ids[(i + 1) % ids.length]);
    else if (/^Digit[1-9]$/.test(code) && ids[+code.slice(5) - 1]) this.pick(ids[+code.slice(5) - 1]);
    else if (code === 'Enter' || code === 'Space') this.confirm();
  },
  /** Back to selection from play (C twice): restarts the adventure, then shows the screen. */
  open() { this.handlers.onOpen(); this.show(); },
  /** Shows the screen with its entrance animation, the current hero already picked. */
  show() {
    ctx.started = false; this.visible = true; document.body.classList.add('menu');
    this.choice = null; this.pick(ctx.player.charId, true);
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
  /** The hero shows off every few seconds while you look. */
  update(dt) {
    if (!this.visible || (this.showT -= dt) > 0) return;
    this.showT = SHOWCASE_EVERY; this.handlers.onShowcase();
  },
  /** True for a moment after the player drags the hero around (the camera orbit holds still meanwhile). */
  get dragging() { return ctx.time - this.dragT < 3; },
  requestMenu() {      // C twice: going back restarts the adventure, so ask once
    if (this.menuArmed > ctx.time) { this.menuArmed = -1; this.open(); }
    else { this.menuArmed = ctx.time + 2.5; toast('Press C again to return to character select (your adventure restarts).'); }
  },
};
