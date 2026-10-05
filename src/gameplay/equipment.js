/* What the hero wears: P.equipment = { weapon, armor, charm }, each { itemId, props } or null (EQUIP_SLOTS).
   Gear lives here while worn, not in the bag. The hero's stats are always computeStats(P): their base stats grown to
   their level (progression/leveling.js), plus everything they wear (items/gear.js). Reset with the adventure. */
import { CHARACTERS } from '../config/characters.js';
import { EQUIP_SLOTS } from '../config/items.js';
import { ctx } from '../core/context.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { applyGear, equipProblem, gearTotals } from '../items/gear.js';
import { statsForLevel } from '../progression/leveling.js';
import { audio } from '../systems/AudioSystem.js';

export function emptyEquipment() { return Object.fromEntries(Object.keys(EQUIP_SLOTS).map(k => [k, null])); }

/** [{ def, props, slot }] for every worn piece. */
export function wornPieces(P = ctx.player) {
  return Object.entries(P.equipment ?? {}).filter(([, w]) => w).map(([slot, w]) => ({ slot, def: itemRegistry.get(w.itemId), props: w.props }));
}

/** The hero's stats right now: base -> level -> gear. */
export function computeStats(P = ctx.player) {
  return applyGear(statsForLevel(CHARACTERS[P.charId].stats, P.level), gearTotals(wornPieces(P), P.charId));
}

/** Re-derives P.stats after gear changes; a bigger maximum adds the difference, a smaller one clamps. */
export function refreshStats(P = ctx.player) {
  const old = P.stats; P.stats = computeStats(P);
  P.hp = Math.min(P.stats.maxHp, P.hp + Math.max(0, P.stats.maxHp - (old?.maxHp ?? P.stats.maxHp)));
  P.mana = Math.min(P.stats.maxMana, P.mana + Math.max(0, P.stats.maxMana - (old?.maxMana ?? P.stats.maxMana)));
}

/** Wears the piece in bag slot `slot` (what was worn there goes back into the bag). Returns { ok, message }. */
export function equipFromSlot(inv, slot) {
  const P = ctx.player, stack = inv.getSlot(slot); if (!stack) return { ok: false, message: 'That slot is empty.' };
  const def = itemRegistry.get(stack.itemId), problem = equipProblem(def, P.charId);
  if (problem) return { ok: false, message: problem };
  const where = def.equip.slot, taken = inv.removeFromSlot(slot, 1), prev = P.equipment[where];
  P.equipment[where] = { itemId: taken.itemId, props: taken.props };
  if (prev && !inv.insertAt(slot, prev.itemId, 1, prev.props)) inv.add(prev.itemId, 1, prev.props);   // swapped into the slot it came from
  refreshStats(P); audio.clang();
  inv.notify('change', { slots: [slot] });
  return { ok: true, message: prev ? `Equipped ${def.name} (${itemRegistry.get(prev.itemId).name} went back in the bag).` : `Equipped ${def.name}.` };
}

/** Takes off what's worn in `where`, back into the bag (if there's room). */
export function unequip(inv, where) {
  const P = ctx.player, w = P.equipment[where]; if (!w) return { ok: false, message: '' };
  const def = itemRegistry.get(w.itemId);
  if (inv.spaceFor(w.itemId, w.props) < 1) return { ok: false, message: `No room in the bag for the ${def.name}.` };
  inv.add(w.itemId, 1, w.props); P.equipment[where] = null; refreshStats(P); audio.plip();
  return { ok: true, message: `Took off the ${def.name}.` };
}
