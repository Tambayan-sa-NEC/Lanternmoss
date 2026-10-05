/* What each input does in play and on the menus. Which key is which action comes from the keybinds
   (src/core/keybinds.js, defaults in config/controls.js): skills are on letter keys, the number row is the hotbar.
   The pause menu's Controls page lists them from the same tables. */
import { HOTBAR_KEYS } from '../config/controls.js';
import { ctx } from './context.js';
import { boundCodes, is } from './keybinds.js';
import { confirmAim, kit, tryCast } from '../combat/casting.js';
import { cancelAim, isAiming } from '../combat/aiming.js';
import { Hotbar } from '../gameplay/hotbar.js';
import { currentInteraction } from '../gameplay/Houses.js';
import { Pets } from '../gameplay/Pets.js';
import { audio } from '../systems/AudioSystem.js';
import { dragCamera, zoomCamera } from '../systems/CameraSystem.js';
import { initInput } from '../systems/InputSystem.js';
import { CharacterSelect } from '../ui/CharacterSelect.js';
import { MainMenu } from '../ui/MainMenu.js';
import { Dialog } from '../ui/Dialog.js';
import { toggleHint } from '../ui/hud.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { ShopUI } from '../ui/ShopUI.js';
import { toast } from '../ui/toast.js';

/** Keys whose browser default (page scroll, quick-find, focus moves...) would get in the way. */
const GAME_KEYS = { has: code => code === 'Escape' || HOTBAR_KEYS.includes(code) || boundCodes().has(code) };

function onKey(code) {
  const player = ctx.player;
  if (PauseMenu.isOpen) { PauseMenu.key(code); return; }  // paused: only the menu listens
  if (ctx.transitioning) return;                       // travelling between planets
  if (code === 'Escape' || is('pause', code)) {         // Esc closes what's open first (bag, aiming, dialogue), then pauses
    if (code === 'Escape' && ShopUI.isOpen) ShopUI.close();
    else if (code === 'Escape' && InventoryUI.isOpen) InventoryUI.close();
    else if (code === 'Escape' && isAiming()) cancelAim();
    else if (code === 'Escape' && Dialog.open) Dialog.close();
    else PauseMenu.open();
    return;
  }
  if (is('bag', code)) { if (Dialog.open) Dialog.close(); InventoryUI.toggle(); return; }
  const slot = HOTBAR_KEYS.indexOf(code); if (slot >= 0) { Hotbar.select(slot); return; }   // hold / use a hotbar item (bag open or not)
  if (is('jump', code) && !player.dead) player.jumpBuf = 0.14;
  if (is('mute', code)) toast(audio.toggle() ? 'Sound off' : 'Sound on');
  if (is('heroSelect', code)) CharacterSelect.requestMenu();
  if (is('toggleHint', code)) toggleHint();
  if (ctx.inventoryOpen) return;                       // bag or shop open: you can still move and jump, but not fight or talk
  for (const id in kit()) if (kit()[id].keys.includes(code)) { if (Dialog.open) Dialog.close(); tryCast(id); }
  if (is('petCommand', code)) Pets.cycleCommand();     // follow -> stay -> attack -> passive
  if (is('petAbility', code)) Pets.useAbility();
  if (is('interact', code)) { if (Dialog.open) Dialog.advance(); else currentInteraction()?.run(); }   // talk, enter a house, use furniture
  if (is('decline', code) && Dialog.choice) Dialog.choose(false);
}

/** Clicking casts the active hero's mouse ability, or the area ability being aimed. */
function onClick() {
  if (ctx.inventoryOpen) return;
  if (isAiming()) { confirmAim(); return; }
  for (const id in kit()) if (kit()[id].mouse) tryCast(id);
}
/** Right click: cancels aiming, otherwise uses the held hotbar item. */
function onRightClick() {
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
    onDrag: dragCamera,
    onZoom: zoomCamera,
  });
}
