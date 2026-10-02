/* INPUT DEVICES: keyboard state and mouse gestures. What each key *does* is decided in src/core/controls.js. */

/** KeyboardEvent.code -> true while held (only tracked while gameplay input is active). */
export const keys = {};
/** Where the cursor is over the game canvas, in normalised device coordinates (-1..1, +y up); over = inside it. */
export const pointer = { x: 0, y: 0, over: false };

/** handlers:
 *   preventKeys          Set of codes whose browser default (scrolling...) is suppressed
 *   isActive()           false while a menu owns the keyboard
 *   onMenuKey(code)      non-repeat key press while inactive
 *   onKey(code)          non-repeat key press while active
 *   onDrag(dx, dy)       pointer drag in pixels
 *   onClick()            quick left click (not a drag)
 *   onCancel()           right click (cancels area-ability aiming)
 *   onZoom(sign)         wheel step (+1 out / -1 in) */
export function initInput(canvas, handlers) {
  addEventListener('keydown', e => {
    if (handlers.preventKeys.has(e.code)) e.preventDefault();
    if (!handlers.isActive()) { if (!e.repeat) handlers.onMenuKey(e.code); return; }
    keys[e.code] = true; if (e.repeat) return;
    handlers.onKey(e.code);
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', releaseAllKeys);

  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now(); canvas.setPointerCapture(e.pointerId); });
  const track = e => { const r = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width * 2 - 1; pointer.y = -((e.clientY - r.top) / r.height * 2 - 1); pointer.over = true; };
  canvas.addEventListener('pointerleave', () => { if (!dragging) pointer.over = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointermove', e => {
    track(e);
    if (!dragging) return; const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    handlers.onDrag(dx, dy);
  });
  canvas.addEventListener('pointerup', e => {
    dragging = false;
    if (e.button === 2) { handlers.onCancel?.(); return; }
    if (e.button === 0 && Math.hypot(e.clientX - downX, e.clientY - downY) < 6 && performance.now() - downT < 350) handlers.onClick();
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); handlers.onZoom(Math.sign(e.deltaY)); }, { passive: false });
}

export function releaseAllKeys() { for (const k in keys) keys[k] = false; }
