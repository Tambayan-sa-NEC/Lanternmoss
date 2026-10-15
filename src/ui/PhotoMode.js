/* PHOTO MODE (#photomode, TODO 39): opened with its key (K by default). The world pauses (like the pet menu), the HUD
   hides and the camera orbits the hero freely within PHOTO.camera's limits: drag or the move keys / arrows to orbit,
   the wheel to zoom, Q / E to tilt the horizon. A small toolbar picks a filter, a frame, a pose and an emote, and saves
   a PNG. The filter and frame are drawn by the post-processing pass, so they are in the picture; the toolbar is not
   (and H hides it to look at the shot). The hero and pet keep posing on the mode's own clock. Nothing is saved. */
import { PHOTO, cycleIndex, photoFileName } from '../config/photo.js';
import { cancelAim } from '../combat/aiming.js';
import { ctx } from '../core/context.js';
import { bindKbd, held, is } from '../core/keybinds.js';
import { animatePhotoPose } from '../entities/player/poses.js';
import { updateFx } from '../fx/combatFx.js';
import { emote, updateEmotes } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { Pets } from '../gameplay/Pets.js';
import { audio } from '../systems/AudioSystem.js';
import { cam, setPhotoView, updateCamera } from '../systems/CameraSystem.js';
import { keys, releaseAllKeys } from '../systems/InputSystem.js';
import { clamp } from '../utils/math.js';
import { Dialog } from './Dialog.js';
import { dom } from './dom.js';
import { InventoryUI } from './InventoryUI.js';
import { ShopUI } from './ShopUI.js';
import { toast } from './toast.js';

const C = PHOTO.camera;
const label = (list, i) => list[i].label;

export const PhotoMode = {
  isOpen: false, render: null, view: null, filter: 0, frame: 0, pose: 0, t: 0, saving: false, lastSaved: null,
  /** renderSystem: draws the filter / frame and captures the picture. */
  init(renderSystem) {
    this.render = renderSystem;
    dom.photoMode.innerHTML = `<div class="ph-bar">
        <button type="button" data-ph="filter"></button><button type="button" data-ph="frame"></button><button type="button" data-ph="pose"></button>
        ${PHOTO.emotes.map((e, i) => `<button type="button" class="ph-emote" data-emote="${i}" style="color:${e.color}">${e.label}</button>`).join('')}
        <button type="button" class="ph-save" data-ph="save">📷 Save</button><button type="button" data-ph="close">✕</button>
      </div><div class="keys ph-keys"></div>`;
    dom.photoMode.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.emote) this.emote(+b.dataset.emote);
      else ({ filter: () => this.cycle('filter'), frame: () => this.cycle('frame'), pose: () => this.cycle('pose'),
        save: () => this.save(), close: () => this.close() })[b.dataset.ph]?.();
      b.blur();
    });
  },
  toggle() { if (this.isOpen) this.close(); else this.open(); },
  open() {
    const P = ctx.player;
    if (this.isOpen || !ctx.started || ctx.transitioning || ctx.cutscene || ctx.paused || !P || P.dead || P.motion) return false;
    if (ctx.indoors) { toast('Photo mode works outdoors'); return false; }
    if (ShopUI.isOpen) ShopUI.close(); if (InventoryUI.isOpen) InventoryUI.close(); if (Dialog.open) Dialog.close();
    cancelAim(); releaseAllKeys();
    // start from the gameplay view: the same heading, pitch and distance (within photo limits)
    this.view = { fwd: cam.fwd.clone(), pitch: clamp(cam.pitch, C.minPitch, C.maxPitch), dist: clamp(cam.curDist, C.minDist, C.maxDist), roll: 0, lift: C.lift };
    Object.assign(this, { isOpen: true, filter: 0, frame: 0, pose: 0, t: 0 });
    ctx.paused = true; Pets.presenting = true; audio.duck(true); audio.blip();
    setPhotoView(this.view); this.look();
    document.body.classList.add('photo'); dom.photoMode.classList.add('show'); dom.photoMode.classList.remove('bare');
    this.renderBar(); return true;
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; ctx.paused = false; Pets.presenting = false; audio.duck(false);
    this.filter = this.frame = this.pose = 0; this.look(); setPhotoView(null);
    if (ctx.player) ctx.player.photoPose = null;
    document.body.classList.remove('photo'); dom.photoMode.classList.remove('show', 'bare');
    if (dom.photoMode.contains(document.activeElement)) document.activeElement.blur();
  },
  look() { this.render?.setPhotoLook?.(this.filter, this.frame); },
  /** Next option for 'filter' | 'frame' | 'pose' (dir -1 = previous). */
  cycle(what, dir = 1) {
    const list = { filter: PHOTO.filters, frame: PHOTO.frames, pose: PHOTO.poses }[what];
    this[what] = cycleIndex(this[what], list.length, dir); this.look(); audio.blip(); this.renderBar();
  },
  emote(i) { const e = PHOTO.emotes[i]; if (e && ctx.player) { emote(ctx.player, e.id, e.color); audio.blip(); } },
  renderBar() {
    if (!this.isOpen) return;
    const set = (k, text) => { dom.photoMode.querySelector(`[data-ph="${k}"]`).textContent = text; };
    set('filter', `Filter: ${label(PHOTO.filters, this.filter)}`); set('frame', `Frame: ${label(PHOTO.frames, this.frame)}`);
    set('pose', `Pose: ${label(PHOTO.poses, this.pose)}`);
    dom.photoMode.querySelector('.ph-keys').innerHTML = `<kbd>Drag</kbd>/${bindKbd('moveForward')}${bindKbd('moveLeft')}${bindKbd('moveBack')}${bindKbd('moveRight')} orbit · `
      + `<kbd>Wheel</kbd> zoom · <kbd>Q</kbd><kbd>E</kbd> tilt · <kbd>1</kbd> filter · <kbd>2</kbd> frame · <kbd>3</kbd> pose · <kbd>4</kbd>–<kbd>6</kbd> emote · `
      + `<kbd>Enter</kbd> save · <kbd>H</kbd> hide bar · ${bindKbd('photoMode')}/<kbd>Esc</kbd> close`;
  },
  /** Mouse drag orbits (dx, dy pixels); the wheel zooms (sign +1 = out). */
  drag(dx, dy) { const v = this.view; v.fwd.applyAxisAngle(ctx.player.up, -dx * 0.005); v.pitch = clamp(v.pitch + dy * 0.004, C.minPitch, C.maxPitch); },
  zoom(sign) { this.view.dist = clamp(this.view.dist * (1 + sign * 0.1), C.minDist, C.maxDist); },
  /** Keys while photo mode is open (play input is ignored). Held orbit / tilt keys are read in update. */
  key(code) {
    if (code === 'Escape' || is('photoMode', code)) { this.close(); return; }
    if (code === 'Enter') this.save();
    else if (code === 'Digit1') this.cycle('filter');
    else if (code === 'Digit2') this.cycle('frame');
    else if (code === 'Digit3') this.cycle('pose');
    else if (['Digit4', 'Digit5', 'Digit6'].includes(code)) this.emote(+code.slice(5) - 4);
    else if (code === 'KeyH') dom.photoMode.classList.toggle('bare');
  },
  /** Runs while the world is paused: held keys orbit and tilt, the hero holds the pose, the pet shows off. */
  update(dt) {
    const v = this.view, P = ctx.player; this.t += dt;
    const turn = (held('moveRight', keys) ? 1 : 0) - (held('moveLeft', keys) ? 1 : 0), tilt = (held('moveForward', keys) ? 1 : 0) - (held('moveBack', keys) ? 1 : 0);
    if (turn) v.fwd.applyAxisAngle(P.up, -turn * C.orbitSpeed * dt);
    if (tilt) v.pitch = clamp(v.pitch + tilt * C.orbitSpeed * 0.6 * dt, C.minPitch, C.maxPitch);
    const roll = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
    if (roll) v.roll = clamp(v.roll + roll * C.rollSpeed * dt, -C.maxRoll, C.maxRoll);
    animatePhotoPose(P, PHOTO.poses[this.pose].id, dt, this.t);
    ctx.companion?.pose?.(dt);
    updateCamera(dt); updateEmotes(dt); sparkles.update(dt); updateFx(dt);
  },
  /** Saves exactly what the camera sees (filter and frame included, never the toolbar) as a PNG download. */
  async save() {
    if (!this.isOpen || this.saving || !this.render?.capture) return;
    this.saving = true;
    try {
      const blob = await this.render.capture(ctx.time), name = photoFileName(ctx.planetId);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.lastSaved = { name, size: blob.size }; audio.blip(); toast(`Saved ${name}`);
    } catch { toast('Could not save the picture'); } finally { this.saving = false; }
  },
};
