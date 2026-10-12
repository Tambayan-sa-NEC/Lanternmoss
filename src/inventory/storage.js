/** Transfer only what fits, preserving per-copy data. No removal happens on a full destination. */
export function transferStack(from, to, slot, quantity = Infinity) {
  const s = from.getSlot(slot); if (!s || from === to || !(quantity > 0)) return 0;
  const n = Math.min(s.quantity, Math.floor(quantity), to.spaceFor(s.itemId, s.props));
  if (!n) return 0;
  from.removeFromSlot(slot, n); to.add(s.itemId, n, s.props); return n;
}
/** Existing matching stacks only; hotbar stays with the hero. */
export function quickStack(bag, stores, start = 0) {
  let moved = 0;
  for (let slot = start; slot < bag.size; slot++) for (const store of stores) {
    const s = bag.getSlot(slot); if (!s) break;
    if (!store.getSlots().some(t => t?.itemId === s.itemId && JSON.stringify(t.props) === JSON.stringify(s.props))) continue;
    moved += transferStack(bag, store, slot);
  }
  return moved;
}
