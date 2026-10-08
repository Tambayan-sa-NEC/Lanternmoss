/* PET MENU (#petmenu): your pets during play, opened with its key (B by default) or by clicking the pet card.
   The world pauses (like the pause menu) while the camera holds a still framing of the pet out with you, who idles on
   the menu's own clock (pet bodies' pose()). Left: every pet (locked ones say how to find them). Right: the pet's
   detail panel (src/ui/petViews.js): rename it, see its stats and ability, give it a command, take another along
   (it swaps in right there). The one place for all of that; the HUD pet card keeps quick command / ability buttons. */
import * as THREE from 'three';
import { PETS } from '../config/pets.js';
import { cancelAim } from '../combat/aiming.js';
import { ctx } from '../core/context.js';
import { bindKbd, is } from '../core/keybinds.js';
import { updateFx } from '../fx/combatFx.js';
import { updateEmotes } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { Pets } from '../gameplay/Pets.js';
import { audio } from '../systems/AudioSystem.js';
import { setShowcase, updateCamera } from '../systems/CameraSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { Dialog } from './Dialog.js';
import { dom, flashEl } from './dom.js';
import { InventoryUI } from './InventoryUI.js';
import { petCardsHtml, petDetailHtml } from './petViews.js';
import { clearStage, petShowcase } from './showcase.js';
import { ShopUI } from './ShopUI.js';


export const PetMenu = {
  isOpen: false, view: null, face: new THREE.Vector3(),
  init() {
    const root = dom.petMenu;
    root.innerHTML = `<h2>Your pets</h2><button type="button" class="back pm-close">✕ Close</button>` +
      `<div class="sel-cards pm-cards"></div><div class="sel-detail pm-detail"></div><div class="keys pm-keys"></div>`;
    this.cardsEl = root.querySelector('.pm-cards'); this.detailEl = root.querySelector('.pm-detail'); this.keysEl = root.querySelector('.pm-keys');
    root.querySelector('.pm-close').addEventListener('click', () => this.close());
    this.cardsEl.addEventListener('click', e => { const b = e.target.closest('[data-pet]'); if (b) this.pick(b.dataset.pet); });
    this.detailEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode) { Pets.command(b.dataset.mode); ctx.companion?.celebrate?.(); }
      if (b.dataset.take) this.pick(b.dataset.take);
      this.render(false);
    });
    this.detailEl.addEventListener('change', e => { const id = e.target.dataset?.rename; if (id) { e.target.value = Pets.rename(id, e.target.value); this.render(false); } });
    this.detailEl.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } });   // typing a name isn't a menu key
  },
  toggle() { if (this.isOpen) this.close(); else this.open(); },
  open() {
    if (this.isOpen || !ctx.started || ctx.transitioning || ctx.cutscene || ctx.paused || ctx.player.dead) return;
    if (ShopUI.isOpen) ShopUI.close(); if (InventoryUI.isOpen) InventoryUI.close(); if (Dialog.open) Dialog.close();
    cancelAim(); releaseAllKeys();
    this.isOpen = true; ctx.paused = true; Pets.presenting = true; audio.duck(true); audio.blip();
    document.body.classList.add('petmenu'); dom.petMenu.classList.add('show');
    this.view = Pets.id; this.frame(); this.render();
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; ctx.paused = false; Pets.presenting = false; audio.duck(false); setShowcase(null);
    document.body.classList.remove('petmenu'); dom.petMenu.classList.remove('show');
    if (dom.petMenu.contains(document.activeElement)) document.activeElement.blur();
  },
  /** Click a pet: an unlocked one comes along (and is remembered for this hero); a locked one shows how to find it. */
  pick(id) {
    if (!PETS[id]) return;
    const changed = id !== this.view; this.view = id;
    if (Pets.unlocked.has(id) && id !== Pets.id) { Pets.choose(id, true); ctx.companion?.celebrate?.(); this.frame(); audio.blip(); }
    else if (!Pets.unlocked.has(id)) audio.fizzle();
    this.render(changed);
  },
  /** The camera's still framing of the pet, come round in front of the hero, who turns to an open view if a prop is
      in the way (none indoors or while it rests: the view stays as it was). */
  frame() {
    if (!ctx.companion || ctx.indoors || Pets.fainted) { setShowcase(null); return; }
    clearStage(this.face, { hero: false, bodies: [ctx.companion.def.body] }); setShowcase(petShowcase(this.face));
  },
  render(swap = true) {
    if (!this.isOpen) return;
    this.cardsEl.innerHTML = petCardsHtml(this.view);
    if (!this.detailEl.contains(document.activeElement)) { this.detailEl.innerHTML = petDetailHtml(this.view, { play: true }); if (swap) flashEl(this.detailEl, 'swap'); }
    this.keysEl.innerHTML = `↑ ↓ or click to choose · ${bindKbd('petMenu')} or <kbd>Esc</kbd> to close`;
  },
  /** Keys while the menu is open (play input is ignored). */
  key(code) {
    if (code === 'Escape' || is('petMenu', code)) { this.close(); return; }
    const ids = Object.keys(PETS), i = Math.max(0, ids.indexOf(this.view));
    if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(code)) this.pick(ids[(i + ids.length - 1) % ids.length]);
    else if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(code)) this.pick(ids[(i + 1) % ids.length]);
    else if (is('petCommand', code)) { Pets.cycleCommand(); this.render(false); }
  },
  /** Runs while the world is paused: the pet idles and the camera eases to its framing. */
  update(dt) {
    ctx.companion?.pose?.(dt);
    updateCamera(dt); updateEmotes(dt); sparkles.update(dt); updateFx(dt);   // (damage numbers and rings fade out)
  },
};
