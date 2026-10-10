import { RUNES } from '../config/magic.js';
import { equipProblem } from './gear.js';

/** Pure preflight for both bag and worn combat gear. A rune occupies the whole enchantment slot. */
export function enchantProblem(def, props, rune, inventory, hero, at) {
  if (!Object.hasOwn(RUNES, rune)) return 'Choose a rune.';
  if (!def?.equip || def.equip.vanity) return 'Choose combat gear: a weapon, armour piece or trinket.';
  const problem = equipProblem(def, hero); if (problem) return problem;
  if (at !== 'forge') return 'Stand at the forge to enchant gear.';
  if (props?.enchantment === rune) return 'This piece already has that rune.';
  if (!inventory.count(rune)) return `You need one ${RUNES[rune].name}.`;
  return null;
}
