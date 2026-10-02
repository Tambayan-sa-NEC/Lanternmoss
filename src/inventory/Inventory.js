/* INVENTORY: a fixed number of slots, each empty (null) or holding one stack { itemId, quantity, props }.
   `props` carries per-copy runtime data (durability, random rolls...) and is null for plain items; static data
   always comes from the item registry, never copied into slots.
   Pure storage + rules (stacking, capacity, moving); no UI, input or world code. Every change is announced:
     'change'      { slots: [indices] }     anything changed (the UI re-renders on this)
     'itemadded'   { itemId, quantity }
     'itemremoved' { itemId, quantity }
     'full'        { itemId, remaining }    an add did not fit completely
     'itemused'    { itemId, slot, message } raised by the item-use layer through notify()
   Invalid requests (unknown ids, bad quantities, bad slot indices) change nothing and report failure. */
import { INVENTORY } from '../config/items.js';
import { itemRegistry } from '../items/ItemRegistry.js';

/** A whole, positive quantity, or 0 for anything else (zero, negatives, fractions below 1, NaN, strings). */
export function toCount(q) { const n = Math.floor(Number(q)); return Number.isFinite(n) && n > 0 ? n : 0; }
const sameProps = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
const copyProps = p => (p && Object.keys(p).length ? JSON.parse(JSON.stringify(p)) : null);
const event = (type, detail) => (typeof CustomEvent === 'function' ? new CustomEvent(type, { detail }) : Object.assign(new Event(type), { detail }));

export class Inventory extends EventTarget {
  #slots; #registry;

  constructor(size = INVENTORY.slots, registry = itemRegistry) {
    super();
    this.#registry = registry;
    this.#slots = new Array(Math.max(0, Math.floor(size) || 0)).fill(null);
  }

  get size() { return this.#slots.length; }
  get registry() { return this.#registry; }
  isValidSlot(i) { return Number.isInteger(i) && i >= 0 && i < this.#slots.length; }

  /** A copy of the stack in slot i, or null when empty / out of range. */
  getSlot(i) {
    const s = this.isValidSlot(i) ? this.#slots[i] : null;
    return s ? { itemId: s.itemId, quantity: s.quantity, props: copyProps(s.props) } : null;
  }
  /** Copies of every slot, in order (null = empty). */
  getSlots() { return this.#slots.map((_, i) => this.getSlot(i)); }

  count(itemId) { let n = 0; for (const s of this.#slots) if (s && s.itemId === itemId) n += s.quantity; return n; }
  has(itemId, quantity = 1) { const q = toCount(quantity); return q > 0 && this.count(itemId) >= q; }
  /** Index of the first slot holding itemId, or -1. */
  find(itemId) { return this.#slots.findIndex(s => s && s.itemId === itemId); }
  freeSlots() { return this.#slots.filter(s => !s).length; }
  /** No empty slot left (partial stacks may still accept more of their item). */
  isFull() { return this.freeSlots() === 0; }

  /** How many of itemId (with these props) would fit right now. */
  spaceFor(itemId, props = null) {
    const def = this.#registry.get(itemId); if (!def) return 0;
    let room = 0;
    for (const s of this.#slots) {
      if (!s) room += def.maxStack;
      else if (this.#compatible(s, itemId, props, def)) room += def.maxStack - s.quantity;
    }
    return room;
  }

  /** Adds up to `quantity`: tops up compatible stacks first, then fills empty slots.
      Returns { added, remaining } (remaining = what did not fit), plus `error` for invalid requests. */
  add(itemId, quantity = 1, props = null) {
    const def = this.#registry.get(itemId), want = toCount(quantity);
    if (!def) return { added: 0, remaining: want, error: 'unknown-item' };
    if (!want) return { added: 0, remaining: 0, error: Number(quantity) === 0 ? null : 'invalid-quantity' };
    let left = want; const changed = [];
    for (let i = 0; i < this.#slots.length && left; i++) {                 // 1. fill existing compatible stacks
      const s = this.#slots[i];
      if (s && this.#compatible(s, itemId, props, def) && s.quantity < def.maxStack) {
        const n = Math.min(left, def.maxStack - s.quantity); s.quantity += n; left -= n; changed.push(i);
      }
    }
    for (let i = 0; i < this.#slots.length && left; i++) {                 // 2. then empty slots, a stack at a time
      if (this.#slots[i]) continue;
      const n = Math.min(left, def.maxStack);
      this.#slots[i] = { itemId, quantity: n, props: copyProps(props) }; left -= n; changed.push(i);
    }
    const added = want - left;
    if (added) { this.notify('itemadded', { itemId, quantity: added }); this.notify('change', { slots: changed }); }
    if (left) this.notify('full', { itemId, remaining: left });
    return { added, remaining: left };
  }

  /** Removes exactly `quantity` of itemId across stacks (last slots first). All-or-nothing: returns false and
      changes nothing when there aren't enough. */
  remove(itemId, quantity = 1) {
    const want = toCount(quantity);
    if (!want || this.count(itemId) < want) return false;
    let left = want; const changed = [];
    for (let i = this.#slots.length - 1; i >= 0 && left; i--) {
      const s = this.#slots[i]; if (!s || s.itemId !== itemId) continue;
      const n = Math.min(left, s.quantity); s.quantity -= n; left -= n; changed.push(i);
      if (!s.quantity) this.#slots[i] = null;                              // an emptied stack frees its slot
    }
    this.notify('itemremoved', { itemId, quantity: want }); this.notify('change', { slots: changed });
    return true;
  }

  /** Takes `quantity` (default: the whole stack) out of slot i. All-or-nothing.
      Returns the removed { itemId, quantity, props }, or null when the slot can't supply that many. */
  removeFromSlot(i, quantity) {
    const s = this.isValidSlot(i) ? this.#slots[i] : null; if (!s) return null;
    const want = quantity === undefined ? s.quantity : toCount(quantity);
    if (!want || want > s.quantity) return null;
    s.quantity -= want; if (!s.quantity) this.#slots[i] = null;
    this.notify('itemremoved', { itemId: s.itemId, quantity: want }); this.notify('change', { slots: [i] });
    return { itemId: s.itemId, quantity: want, props: copyProps(s.props) };
  }

  /** Sets the stack in slot i to `quantity` (0 empties the slot). Rejects empty slots and quantities outside 0..maxStack. */
  setQuantity(i, quantity) {
    const s = this.isValidSlot(i) ? this.#slots[i] : null, q = Number(quantity);
    if (!s || !Number.isInteger(q) || q < 0 || q > this.#registry.get(s.itemId).maxStack) return false;
    if (q === s.quantity) return true;
    const diff = q - s.quantity; s.quantity = q; if (!q) this.#slots[i] = null;
    this.notify(diff > 0 ? 'itemadded' : 'itemremoved', { itemId: s.itemId, quantity: Math.abs(diff) }); this.notify('change', { slots: [i] });
    return true;
  }

  /** Moves the stack in `from` onto `to`: into an empty slot, merged into a compatible stack (any overflow stays
      behind), or swapped with a different item. Returns false when nothing could move. */
  move(from, to) {
    if (!this.isValidSlot(from) || !this.isValidSlot(to) || from === to || !this.#slots[from]) return false;
    const a = this.#slots[from], b = this.#slots[to], def = this.#registry.get(a.itemId);
    if (b && this.#compatible(b, a.itemId, a.props, def)) {
      const n = Math.min(a.quantity, def.maxStack - b.quantity);
      if (!n) return false;                                                // target stack already full
      b.quantity += n; a.quantity -= n; if (!a.quantity) this.#slots[from] = null;
      this.notify('change', { slots: [from, to] });
      return true;
    }
    return this.swap(from, to);
  }

  /** Exchanges two slots (either may be empty, not both). */
  swap(a, b) {
    if (!this.isValidSlot(a) || !this.isValidSlot(b) || a === b || (!this.#slots[a] && !this.#slots[b])) return false;
    [this.#slots[a], this.#slots[b]] = [this.#slots[b], this.#slots[a]];
    this.notify('change', { slots: [a, b] });
    return true;
  }

  /** Empties every slot. */
  clear() {
    const changed = this.#slots.map((s, i) => (s ? i : -1)).filter(i => i >= 0);
    if (!changed.length) return;
    this.#slots.fill(null); this.notify('change', { slots: changed });
  }

  /** Plain data for saving: [{ itemId, quantity, props } | null, ...]. */
  toJSON() { return this.getSlots(); }
  /** Replaces the contents from toJSON() data; unknown items are dropped and quantities clamped to each stack size. */
  load(data) {
    this.#slots.fill(null);
    (Array.isArray(data) ? data : []).slice(0, this.#slots.length).forEach((s, i) => {
      const def = s && this.#registry.get(s.itemId), q = s ? Math.min(toCount(s.quantity), def ? def.maxStack : 0) : 0;
      if (def && q) this.#slots[i] = { itemId: s.itemId, quantity: q, props: copyProps(s.props) };
    });
    this.notify('change', { slots: this.#slots.map((_, i) => i) });
  }

  /** Raises an inventory event (also used by the item-use layer for 'itemused'). */
  notify(type, detail) { this.dispatchEvent(event(type, detail)); }

  #compatible(stack, itemId, props, def) { return def.stackable && stack.itemId === itemId && sameProps(stack.props, copyProps(props)); }
}
