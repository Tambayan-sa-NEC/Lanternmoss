/* ---------------------------------------------------------------------
   PLAYABLE CHARACTERS: picked on the start screen (runtime: src/gameplay/characters.js).
   The witch points straight at her original COMBAT values, so she plays exactly as before.
   abilities use the same format as COMBAT.spells and are dispatched through CAST[id] (src/combat/casting.js).
   model = key in HERO_BUILDERS (src/models/heroes.js); companion = 'owl' | 'wolf'.
   --------------------------------------------------------------------- */
import { COMBAT } from './combat.js';

export const CHARACTERS = {
  witch: {
    title: 'Girl Witch', style: 'Arcane magic', companionName: 'Pip the owl', color: '#7a5cc8', model: 'witch', companion: 'owl',
    blurb: 'Casts from range. Pip swoops at foes, marking them for extra spell damage.',
    resource: 'MANA', stats: COMBAT.player, abilities: COMBAT.spells,
    hint: '<kbd>Click</kbd>/<kbd>1</kbd> bolt &nbsp; <kbd>2</kbd>/<kbd>Q</kbd> fireball &nbsp; <kbd>3</kbd>/<kbd>R</kbd> nova &nbsp; <kbd>4</kbd>/<kbd>F</kbd> blink',
    welcome: 'Welcome to Lanternmoss! Your owl Pip is with you. Monsters prowl beyond the village lanterns.',
  },
  knight: {
    title: 'Boy Knight', style: 'Sword & shield', companionName: 'Fang the wolf', color: '#3f6fc8', model: 'knight', companion: 'wolf',
    blurb: 'Tough and up close: slashes, shield charges and a guard that shrugs off hits.',
    resource: 'STAMINA', stats: { ...COMBAT.player, maxHp: 140, manaRegen: 16, armor: 0.2 },   // armor = damage taken reduction
    abilities: {
      slash: { name: 'Sword Slash', label: '1', keys: ['Digit1'], mouse: true, repeat: true, color: 0xdfe8ff,
               cost: 5, cooldown: 0.42, damage: 14, range: 2.7, arc: 110, knockback: 3.5 },
      dash:  { name: 'Shield Dash', label: '2/Q', keys: ['Digit2', 'KeyQ'], color: 0x8fb8ff,
               cost: 20, cooldown: 4, damage: 18, distance: 5.5, time: 0.3, width: 1.3, knockback: 7, stun: 0.8 },
      whirl: { name: 'Whirlwind', label: '3/R', keys: ['Digit3', 'KeyR'], color: 0xffd36b,
               cost: 30, cooldown: 7, damage: 20, radius: 3.4, knockback: 6, spinTime: 0.5 },
      guard: { name: 'Guard', label: '4/F', keys: ['Digit4', 'KeyF'], color: 0x9fe8ff,
               cost: 15, cooldown: 9, duration: 2.5, reduction: 0.7 },       // blocks knockback, -70% damage
    },
    hint: '<kbd>Click</kbd>/<kbd>1</kbd> slash &nbsp; <kbd>2</kbd>/<kbd>Q</kbd> dash &nbsp; <kbd>3</kbd>/<kbd>R</kbd> whirlwind &nbsp; <kbd>4</kbd>/<kbd>F</kbd> guard',
    wolf: { sideOffset: 1.4, behind: 1.3, stopDist: 1.2, walkSpeed: 3.2, runSpeed: 9.5, sitAfter: 2.5, teleportDist: 25 },
    welcome: 'Welcome to Lanternmoss! Your wolf Fang is at your side. Monsters prowl beyond the village lanterns.',
  },
};
