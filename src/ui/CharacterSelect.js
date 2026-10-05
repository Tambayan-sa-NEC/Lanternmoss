/* CHARACTER SELECT (#start), reached from the title screen (src/ui/MainMenu.js) or with C during play. Two steps:
     hero  left: a compact picker (portrait, role, difficulty). Middle: the hero's live 3D model, close up; drag to turn
           the hero, who shows off now and then. Right: the detail panel (role, difficulty, health and resource, 1-5
           ratings, companion, and all five abilities with icon, keys and description, the ultimate in gold).
     pet   the same layout for the pet that comes along: every pet (locked ones say how to find them), the pet live
           in front of the hero (Pets.presenting), and its detail panel (stats, strike, ability; rename it there).
           Comes from src/ui/petViews.js.
   The camera holds a still, fixed framing of the hero or the pet (setShowcase), it never circles them.
   Everything shown comes from CHARACTERS (config/characters.js, incl. each hero's `profile`), ABILITY_TEXT and PETS.
   The screen opens with the current hero (and the pet they took last time) already picked, so Play is two Enters away. */
import * as THREE from 'three';
import { ABILITY_TEXT, CHARACTERS } from '../config/characters.js';
import { PETS } from '../config/pets.js';
import { ctx } from '../core/context.js';
import { Pets } from '../gameplay/Pets.js';
import { audio } from '../systems/AudioSystem.js';
import { setShowcase } from '../systems/CameraSystem.js';
import { dom, flashEl } from './dom.js';
import { icon } from './icons.js';
import { petCardsHtml, petDetailHtml } from './petViews.js';
import { clearStage, heroShowcase, petShowcase } from './showcase.js';
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
    <div class="comp"><b>${c.companionName}</b> ${p.companionText}. <span class="dim">(any pet can come along: you choose next)</span></div>
    <div class="abl">${abilities}</div>`;
}

export const CharacterSelect = {
  choice: null, step: 'hero', petView: null, cards: {}, menuArmed: -1, handlers: null, visible: false, showT: 0,
  face: new THREE.Vector3(),
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
    // the pet step: click a pet to take it (a locked one just shows how to find it); rename it in the panel
    dom.petCards.addEventListener('click', e => { const b = e.target.closest('[data-pet]'); if (b) this.pickPet(b.dataset.pet); });
    dom.petCards.addEventListener('dblclick', e => { const b = e.target.closest('[data-pet]'); if (b && Pets.unlocked.has(b.dataset.pet)) this.confirm(); });
    dom.petDetail.addEventListener('change', e => { const id = e.target.dataset?.rename; if (id) { e.target.value = Pets.rename(id, e.target.value); this.renderPets(false); } });
    dom.petDetail.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } });   // typing a name isn't a menu key
    // drag anywhere on the open stage (not on a panel) to turn the hero round; the camera stays put
    let drag = null;
    dom.start.addEventListener('pointerdown', e => { if (this.step === 'hero' && (e.target === dom.start || e.target.classList?.contains('stage'))) drag = e.clientX; });
    addEventListener('pointermove', e => { if (drag === null) return; const P = ctx.player; P.fwd.applyAxisAngle(P.up, (e.clientX - drag) * 0.01); drag = e.clientX; });
    addEventListener('pointerup', () => { drag = null; });
  },
  /** quiet = no sound or flourish (opening the screen on the hero you already have). */
  pick(id, quiet = false) {
    const same = id === this.choice;
    this.choice = id; for (const k in this.cards) this.cards[k].classList.toggle('sel', k === id);
    if (!same) { dom.heroDetail.innerHTML = detailHtml(id); flashEl(dom.heroDetail, 'swap'); }
    this.handlers.onPick(id, quiet); this.showT = SHOWCASE_EVERY;
    this.updateGo();
    if (!quiet) audio.heroCue(CHARACTERS[id].profile.voice);
  },
  /** On the pet step: take an unlocked pet along (it comes round in front of the hero), or look at how to find a locked one. */
  pickPet(id, quiet = false) {
    if (!PETS[id]) return;
    const changed = id !== this.petView; this.petView = id;
    if (Pets.unlocked.has(id) && id !== Pets.id) { Pets.choose(id, true); if (!quiet) audio.blip(); }
    else if (Pets.unlocked.has(id)) Pets.remember(id);
    else if (!quiet) audio.fizzle();
    this.renderPets(changed); this.showT = SHOWCASE_EVERY;
  },
  renderPets(swap = true) {
    dom.petCards.innerHTML = petCardsHtml(this.petView);
    if (!dom.petDetail.contains(document.activeElement)) { dom.petDetail.innerHTML = petDetailHtml(this.petView); if (swap) flashEl(dom.petDetail, 'swap'); }
    this.updateGo();
  },
  updateGo() {
    dom.go.classList.toggle('disabled', !this.choice);
    dom.go.textContent = !this.choice ? 'Choose your hero' : this.step === 'hero' ? 'Next: choose a pet  ▶'
      : `Play as ${CHARACTERS[this.choice].title} with ${Pets.nameOf()}  ▶`;
  },
  /** Hero step: on to the pet. Pet step: into the game. */
  confirm() {
    if (!this.choice) { flashEl(dom.go, 'nudge'); return; }
    if (this.step === 'hero') { this.setStep('pet'); audio.blip(); return; }
    this.handlers.onConfirm();
  },
  /** Back one step: pet -> hero. Returns false on the hero step (the title screen takes over). */
  back() { if (this.step !== 'pet') return false; this.setStep('hero'); audio.blip(); return true; },
  setStep(step) {
    this.step = step; dom.start.classList.toggle('petstep', step === 'pet'); Pets.presenting = step === 'pet';
    dom.selHead.textContent = step === 'pet' ? 'Choose your pet' : 'Choose your hero';
    dom.selKeys.textContent = step === 'pet' ? '← → or click to choose · Enter to play · Esc back to heroes'
      : '← → or click to choose · drag to turn · Enter for the pet · Esc back';
    if (step === 'pet') { this.petView = Pets.id; this.renderPets(); clearStage(this.face, { hero: false }); this.framePet(); }
    else { this.frameHero(); this.updateGo(); }
    flashEl(dom.selHead, 'swap');
  },
  key(code) {
    const prev = ['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(code), next = ['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(code);
    if (code === 'Enter' || code === 'Space') { this.confirm(); return; }
    if (code === 'Backspace') { this.back(); return; }
    if (this.step === 'pet') {                                // arrows step through the pets (locked ones too: they say how to find them)
      const ids = Object.keys(PETS), i = Math.max(0, ids.indexOf(this.petView));
      if (prev || next) this.pickPet(ids[(i + (next ? 1 : ids.length - 1)) % ids.length]);
      else if (/^Digit[1-9]$/.test(code) && ids[+code.slice(5) - 1]) this.pickPet(ids[+code.slice(5) - 1]);
      return;
    }
    const ids = Object.keys(CHARACTERS), i = Math.max(0, ids.indexOf(this.choice));
    if (prev) this.pick(ids[(i + ids.length - 1) % ids.length]);
    else if (next) this.pick(ids[(i + 1) % ids.length]);
    else if (/^Digit[1-9]$/.test(code) && ids[+code.slice(5) - 1]) this.pick(ids[+code.slice(5) - 1]);
  },
  /** Back to selection from play (C twice): restarts the adventure, then shows the screen. */
  open() { this.handlers.onOpen(); this.show(); },
  /** Shows the screen with its entrance animation, the current hero already picked. */
  show() {
    ctx.started = false; this.visible = true; document.body.classList.add('menu');
    clearStage(this.face);                                    // (turns the hero to an open view if a prop is in the way)
    this.choice = null; this.pick(ctx.player.charId, true); this.setStep('hero');
    dom.start.classList.remove('leave', 'enter'); dom.start.style.display = 'flex'; void dom.start.offsetWidth;
    dom.start.style.opacity = 1; dom.start.classList.add('enter');
  },
  /** The camera's still framing of the hero: a little to one side of their front. */
  frameHero() { setShowcase(heroShowcase(this.face)); },
  /** ...and of the pet, which comes round in front of them (the hero stands just behind it). */
  framePet() { setShowcase(petShowcase(this.face)); },
  /** Back to the title screen: a quick fade (the title takes over). */
  hide() {
    this.visible = false; Pets.presenting = false; setShowcase(null); dom.start.classList.remove('enter'); dom.start.classList.add('leave');
    setTimeout(() => { if (!this.visible) dom.start.style.display = 'none'; }, 350);
  },
  /** Into the game: the overlay fades out while the camera swoops in (hidden, not removed: C brings it back). */
  close() {
    this.visible = false; Pets.presenting = false; setShowcase(null); document.body.classList.remove('menu'); dom.start.style.opacity = 0;
    setTimeout(() => { if (ctx.started) dom.start.style.display = 'none'; }, 700);
  },
  /** The hero (or, on the pet step, the pet) shows off every few seconds while you look. */
  update(dt) {
    if (!this.visible || (this.showT -= dt) > 0) return;
    this.showT = SHOWCASE_EVERY;
    if (this.step === 'pet') ctx.companion?.celebrate?.(); else this.handlers.onShowcase();
  },
  requestMenu() {      // C twice: going back restarts the adventure, so ask once
    if (this.menuArmed > ctx.time) { this.menuArmed = -1; this.open(); }
    else { this.menuArmed = ctx.time + 2.5; toast('Press C again to return to character select (your adventure restarts).'); }
  },
};
