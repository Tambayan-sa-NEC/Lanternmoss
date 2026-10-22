/* What each input does in play and on the menus. Which key is which action comes from the keybinds
   (src/core/keybinds.js, defaults in config/controls.js): skills are on letter keys, the number row is the hotbar.
   The pause menu's Controls page lists them from the same tables. */
import { HOTBAR_KEYS } from '../config/controls.js';
import { ctx } from './context.js';
import { settings, setSetting } from './settings.js';
import { boundCodes, is } from './keybinds.js';
import { confirmAim, kit, tryCast } from '../combat/casting.js';
import { cancelAim, isAiming, nudgeAim } from '../combat/aiming.js';
import { groundUnderScreen } from '../combat/area.js';
import { distance, pointOf, toward } from '../combat/space.js';
import { Fishing } from '../gameplay/Fishing.js';
import { Hotbar } from '../gameplay/hotbar.js';
import { currentInteraction } from '../gameplay/Houses.js';
import { Pets } from '../gameplay/Pets.js';
import { audio } from '../systems/AudioSystem.js';
import { dragCamera, zoomCamera } from '../systems/CameraSystem.js';
import { initInput, pointer } from '../systems/InputSystem.js';

import { CharacterSelect } from '../ui/CharacterSelect.js';
import { MainMenu } from '../ui/MainMenu.js';
import { Dialog } from '../ui/Dialog.js';
import { toggleHint } from '../ui/hud.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { PetMenu } from '../ui/PetMenu.js';
import { PhotoMode } from '../ui/PhotoMode.js';
import { JournalUI } from '../ui/JournalUI.js';
import { ShopUI } from '../ui/ShopUI.js';
import { toast } from '../ui/toast.js';
import { PortalUI } from '../ui/PortalUI.js';
import { Building } from '../gameplay/Building.js';
import { BuildingUI } from '../ui/BuildingUI.js';
import { HomeUI } from '../ui/HomeUI.js';
import { BountyUI } from '../ui/BountyUI.js';
import { TalentUI } from '../ui/TalentUI.js';

/** Keys whose browser default (page scroll, quick-find, focus moves...) would get in the way. */
const GAME_KEYS = { has: code => PortalUI.isOpen || HomeUI.isOpen || BountyUI.isOpen || TalentUI.isOpen || BuildingUI.isOpen ? code === 'Escape' : code === 'Escape' || Building.active && code === 'Enter' || HOTBAR_KEYS.includes(code) || boundCodes().has(code) };

function onKey(code) {
  if (is('togglePerformance', code) && !PauseMenu.capture) { setSetting('perfOverlay', !settings.perfOverlay); return; }
  const player = ctx.player;
  if (BuildingUI.isOpen) { BuildingUI.key(code); return; }
  if (HomeUI.isOpen) { HomeUI.key(code); return; }
  if (BountyUI.isOpen) { BountyUI.key(code); return; }
  if (TalentUI.isOpen) { TalentUI.key(code); return; }   // over the pause menu: Esc comes back to it
  if (PortalUI.isOpen) { PortalUI.key(code); return; }
  if (JournalUI.isOpen) { JournalUI.key(code); return; }  // the journal sits on top of everything (even the pause menu)
  if (PauseMenu.isOpen) { PauseMenu.key(code); return; }  // paused: only the menu listens
  if (PetMenu.isOpen) { PetMenu.key(code); return; }      // the pet menu pauses too
  if (PhotoMode.isOpen) { PhotoMode.key(code); return; }  // so does photo mode
  if (ctx.transitioning) return;                       // travelling between planets
  if (ctx.cutscene && code !== 'Escape' && !is('pause', code)) return;   // a boss is waking: only pausing works
  if (Building.active && code === 'Escape') { Building.cancel(); return; }
  if (Building.active && !ctx.paused) {
    if (is('buildRotate', code)) { Building.rotate(); return; }
    if (is('buildGrid', code)) { Building.toggleGrid(); return; }
    if (code === 'Enter' || is('interact', code)) { Building.confirm(); return; }
  }
  if (code === 'Escape' || is('pause', code)) {         // Esc closes what's open first (bag, aiming, dialogue), then pauses
    if (code === 'Escape' && ShopUI.isOpen) ShopUI.close();
    else if (code === 'Escape' && InventoryUI.isOpen) InventoryUI.close();
    else if (code === 'Escape' && isAiming()) cancelAim();
    else if (code === 'Escape' && Dialog.open) Dialog.close();
    else PauseMenu.open();
    return;
  }
  if (is('bag', code)) { if (Dialog.open) Dialog.close(); InventoryUI.toggle(); return; }
  if (is('petMenu', code)) { PetMenu.open(); return; }
  if (is('photoMode', code)) { PhotoMode.open(); return; }
  if (is('journal', code)) { JournalUI.open(); return; }
  const slot = HOTBAR_KEYS.indexOf(code); if (slot >= 0) { Building.cancel(); Hotbar.select(slot); return; }   // hold / use a hotbar item (bag open or not)
  if (is('jump', code) && !player.dead) player.jumpBuf = 0.14;
  if (is('mute', code)) toast(audio.toggle() ? 'Sound off' : 'Sound on');
  if (is('heroSelect', code)) CharacterSelect.requestMenu();
  if (is('toggleHint', code)) toggleHint();
  if (ctx.inventoryOpen) return;                       // bag or shop open: you can still move and jump, but not fight or talk
  if (Building.active) return;
  for (const id in kit()) if (kit()[id].keys.includes(code)) { if (Dialog.open) Dialog.close(); tryCast(id); }
  if (is('petCommand', code)) Pets.cycleCommand();     // follow -> stay -> attack -> passive
  if (is('petAbility', code)) Pets.useAbility();
  if (is('petSwap', code)) Pets.cycle();                // the next unlocked pet comes out
  if (is('interact', code)) { if (Dialog.open) Dialog.advance(); else currentInteraction()?.run(); }   // talk, enter a house, use furniture
  if (is('decline', code) && Dialog.choice) Dialog.choose(false);
}

/** Clicking casts the active hero's mouse ability (the hero first turns to face the clicked ground: that's how the
    mouse aims, since the camera doesn't), or the area ability being aimed. */
function onClick() {
  if (ctx.paused || ctx.transitioning || ctx.inventoryOpen) return;
  if (Building.active) { Building.confirm(); return; }
  if (Fishing.active) { Fishing.press(); return; }      // fishing: a click reels in
  if (isAiming()) { confirmAim(); return; }
  faceClick();
  for (const id in kit()) if (kit()[id].mouse) tryCast(id);
}
function faceClick() {
  const P = ctx.player; if (!pointer.over || P.dead || P.motion || !ctx.started || ctx.cutscene) return;
  const d = groundUnderScreen(pointer.x, pointer.y); if (d && distance(pointOf(P), d) > 0.4) P.fwd.copy(toward(pointOf(P), d));
}
/** Right click: cancels aiming, otherwise uses the held hotbar item. */
function onRightClick() {
  if (ctx.paused || ctx.transitioning) return;
  if (Building.active) { Building.cancel(); return; }
  if (isAiming()) { cancelAim(); return; }
  if (!ctx.inventoryOpen && !Dialog.open) Hotbar.use();
}

export function initControls(canvas) {
  initInput(canvas, {
    preventKeys: GAME_KEYS,
    isActive: () => ctx.started,
    onMenuKey: code => MainMenu.key(code),
    onKey, onClick,
    onCancel: onRightClick,
    onDrag: (dx, dy) => (PhotoMode.isOpen ? PhotoMode.drag(dx, dy) : dragCamera(dx, dy)),
    onZoom: sign => (PhotoMode.isOpen ? PhotoMode.zoom(sign) : isAiming() ? nudgeAim(-sign) : zoomCamera(sign)),   // wheel up = farther while aiming
  });
}
