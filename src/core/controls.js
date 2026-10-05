/* Key bindings: what each input does in play and on the character-select screen. */
import { CHARACTERS } from '../config/characters.js';
import { INVENTORY } from '../config/items.js';
import { ctx } from './context.js';
import { confirmAim, kit, tryCast } from '../combat/casting.js';
import { cancelAim, isAiming } from '../combat/aiming.js';
import { nearestNPC } from '../entities/npc/NPC.js';
import { audio } from '../systems/AudioSystem.js';
import { dragCamera, zoomCamera } from '../systems/CameraSystem.js';
import { initInput } from '../systems/InputSystem.js';
import { CharacterSelect } from '../ui/CharacterSelect.js';
import { Dialog } from '../ui/Dialog.js';
import { toggleHint } from '../ui/hud.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { toast } from '../ui/toast.js';

/** Keys whose browser default (page scroll, quick-find...) would get in the way. */
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyM', 'KeyX', 'KeyH',
  'KeyC', ...INVENTORY.keys, ...Object.values(CHARACTERS).flatMap(c => Object.values(c.abilities).flatMap(s => s.keys))]);

function onKey(code) {
  const player = ctx.player;
  if (ctx.transitioning) return;                       // travelling between planets
  if (INVENTORY.keys.includes(code)) { if (Dialog.open) Dialog.close(); InventoryUI.toggle(); return; }
  if (code === 'Escape' && InventoryUI.isOpen) { InventoryUI.close(); return; }
  if (code === 'Escape' && isAiming()) { cancelAim(); return; }
  if (code === 'Space' && !player.dead) player.jumpBuf = 0.14;
  if (code === 'KeyM') toast(audio.toggle() ? 'Sound off' : 'Sound on');
  if (code === 'KeyC') CharacterSelect.requestMenu();
  if (code === 'KeyH') toggleHint();
  if (InventoryUI.isOpen) return;                      // bag open: you can still move and jump, but not fight or talk
  for (const id in kit()) if (kit()[id].keys.includes(code)) { if (Dialog.open) Dialog.close(); tryCast(id); }
  if (code === 'KeyE') { if (Dialog.open) Dialog.advance(); else { const n = nearestNPC(player, ctx.npcs); if (n) Dialog.start(n); } }
  if (code === 'KeyX' && Dialog.choice) Dialog.choose(false);
  if (code === 'Escape' && Dialog.open) Dialog.close();
}

/** Clicking casts the active hero's mouse ability, or the area ability being aimed. */
function onClick() {
  if (ctx.inventoryOpen) return;
  if (isAiming()) { confirmAim(); return; }
  for (const id in kit()) if (kit()[id].mouse) tryCast(id);
}

export function initControls(canvas) {
  initInput(canvas, {
    preventKeys: GAME_KEYS,
    isActive: () => ctx.started,
    onMenuKey: code => CharacterSelect.key(code),
    onKey, onClick,
    onCancel: cancelAim,
    onDrag: dragCamera,
    onZoom: zoomCamera,
  });
}
