/* ---------------------------------------------------------------------
   PLAYABLE CHARACTERS: picked on the start screen (runtime: src/gameplay/characters.js), shown in this order.
   The witch points straight at her original COMBAT values, so she plays exactly as before.
   The knight id is kept for the axe warrior (same moves and numbers as the old sword-and-shield kit, renamed to match the art).
   abilities use the same format as COMBAT.spells and are dispatched through CAST[id] (src/combat/casting.js).
   model = key in HERO_BUILDERS (src/models/heroes.js) and HERO_POSES (src/entities/player/poses.js); companion = 'owl' | 'wolf'.
   --------------------------------------------------------------------- */
import { COMBAT } from './combat.js';

export const CHARACTERS = {
  witch: {
    title: 'Girl Witch', style: 'Arcane magic', companionName: 'Pip the owl', color: '#7a5cc8', model: 'witch', companion: 'owl',
    blurb: 'A staff-wielding mage who casts from range. Pip swoops at foes, marking them for extra spell damage.',
    resource: 'MANA', stats: COMBAT.player, abilities: COMBAT.spells,
    hint: '<kbd>Click</kbd>/<kbd>1</kbd> bolt &nbsp; <kbd>2</kbd>/<kbd>Q</kbd> fireball &nbsp; <kbd>3</kbd>/<kbd>R</kbd> nova &nbsp; <kbd>4</kbd>/<kbd>F</kbd> blink &nbsp; <kbd>5</kbd>/<kbd>G</kbd> meteor',
    welcome: 'Welcome to Lanternmoss! Your owl Pip is with you. Monsters prowl beyond the village lanterns.',
  },
  knight: {
    title: 'Boy Warrior', style: 'Two-handed axe', companionName: 'Fang the wolf', color: '#c0392b', model: 'knight', companion: 'wolf',
    blurb: 'Tough and up close: heavy axe cleaves, shoulder charges and a guard that shrugs off hits.',
    resource: 'STAMINA', stats: { ...COMBAT.player, maxHp: 140, manaRegen: 16, armor: 0.2 },   // armor = damage taken reduction
    abilities: {
      slash: { name: 'Axe Cleave',  label: '1', keys: ['Digit1'], mouse: true, repeat: true, color: 0xdfe8ff,
               cost: 5, cooldown: 0.42, damage: 14, range: 2.7, arc: 110, knockback: 3.5 },
      dash:  { name: 'Shoulder Charge', label: '2/Q', keys: ['Digit2', 'KeyQ'], color: 0x8fb8ff,                  // evasion (i-frames): was 4 s
               cost: 20, cooldown: 3, damage: 18, distance: 5.5, time: 0.3, width: 1.3, knockback: 7, stun: 0.8 },
      whirl: { name: 'Whirlwind', label: '3/R', keys: ['Digit3', 'KeyR'], color: 0xffd36b,
               cost: 30, cooldown: 7, damage: 20, radius: 3.4, knockback: 6, spinTime: 0.5 },
      guard: { name: 'Guard', label: '4/F', keys: ['Digit4', 'KeyF'], color: 0x9fe8ff,
               cost: 15, cooldown: 9, duration: 2.5, reduction: 0.7 },       // blocks knockback, -70% damage (not a lethal blow)
      // ultimate: leaps onto the aimed spot (landing: true = must be standable ground) and slams a stunning shockwave
      leapSlam: { name: 'Leap Slam', label: '5/G', keys: ['Digit5', 'KeyG'], color: 0xffb347, ult: true, target: 'ground', landing: true,
                  cost: 35, cooldown: 22, damage: 80, range: 14, radius: 5, stun: 1.6, knockback: 8, leapTime: 0.7, leapHeight: 5 },
    },
    hint: '<kbd>Click</kbd>/<kbd>1</kbd> cleave &nbsp; <kbd>2</kbd>/<kbd>Q</kbd> charge &nbsp; <kbd>3</kbd>/<kbd>R</kbd> whirlwind &nbsp; <kbd>4</kbd>/<kbd>F</kbd> guard &nbsp; <kbd>5</kbd>/<kbd>G</kbd> leap slam',
    wolf: { sideOffset: 1.4, behind: 1.3, stopDist: 1.2, walkSpeed: 3.2, runSpeed: 9.5, sitAfter: 2.5, teleportDist: 25 },
    welcome: 'Welcome to Lanternmoss! Your wolf Fang is at your side. Monsters prowl beyond the village lanterns.',
  },
  ranger: {
    title: 'Elf Archer', style: 'Longbow', companionName: 'Wren the owl', color: '#3f9a5a', model: 'ranger', companion: 'owl',
    blurb: 'Quick and keen-eyed: arrows from afar, a fan of shots, a pinning thorn arrow and a nimble back-leap.',
    resource: 'FOCUS', stats: { ...COMBAT.player, maxHp: 90, manaRegen: 13 },
    abilities: {
      shot:   { name: 'Arrow Shot', label: '1', keys: ['Digit1'], mouse: true, repeat: true, color: 0xeaffd0,
                cost: 5, cooldown: 0.36, damage: 10, speed: 34, range: 26, radius: 0.28, homing: 3 },
      volley: { name: 'Arrow Fan', label: '2/Q', keys: ['Digit2', 'KeyQ'], color: 0x9fffb0,
                cost: 20, cooldown: 4, damage: 9, count: 5, spread: 40, speed: 30, range: 20, radius: 0.3, knockback: 2 },
      snare:  { name: 'Thorn Arrow', label: '3/R', keys: ['Digit3', 'KeyR'], color: 0x7fe07a,
                cost: 25, cooldown: 7, damage: 24, speed: 28, range: 26, radius: 0.35, homing: 4, knockback: 3,
                slow: 0.6, slowTime: 3, stagger: 0.8 },                                    // slows and interrupts wind-ups
      leap:   { name: 'Evasive Leap', label: '4/F', keys: ['Digit4', 'KeyF'], color: 0xd8ffe8,
                cost: 15, cooldown: 3, distance: 5.5, jump: 6, invuln: 0.45 },             // evasion, hops back away from the aim: was 5 s
      // ultimate: arrows pour onto the aimed circle for `duration`, a damage + slow pulse every `tick`
      rain:   { name: 'Arrow Rain', label: '5/G', keys: ['Digit5', 'KeyG'], color: 0xb8ff9a, ult: true, target: 'ground',
                cost: 40, cooldown: 26, damage: 11, tick: 0.4, firstTick: 0.35, duration: 4, range: 22, radius: 5, slow: 0.35, slowTime: 0.6 },
    },
    hint: '<kbd>Click</kbd>/<kbd>1</kbd> arrow &nbsp; <kbd>2</kbd>/<kbd>Q</kbd> fan &nbsp; <kbd>3</kbd>/<kbd>R</kbd> thorn arrow &nbsp; <kbd>4</kbd>/<kbd>F</kbd> leap &nbsp; <kbd>5</kbd>/<kbd>G</kbd> arrow rain',
    welcome: 'Welcome to Lanternmoss! Your owl Wren keeps watch. Monsters prowl beyond the village lanterns.',
  },
};

/** One-line ability descriptions for the ability-bar tooltips (src/ui/hud.js), by ability id (ids are unique across heroes). */
export const ABILITY_TEXT = {
  bolt: 'A homing arcane missile. Hold to keep casting.',
  fireball: 'A slow fireball that explodes on impact, knocking foes back.',
  nova: 'A freezing burst around you that damages and slows.',
  blink: 'Teleport a short way, toward where you are running. Briefly invulnerable.',
  meteor: 'Aim a spot: a meteor crashes down a moment later, crushing everything in a wide area.',
  slash: 'A wide axe swing in front of you. Hold to keep swinging.',
  dash: 'Charge forward through enemies, stunning them. Invulnerable while charging.',
  whirl: 'Spin with the axe, hitting everything around you.',
  guard: 'Brace behind the axe: much less damage taken and no knockback.',
  leapSlam: 'Aim a spot: leap there and slam the ground, damaging and stunning everything nearby.',
  shot: 'A homing arrow. Hold to keep shooting.',
  volley: 'A fan of five arrows.',
  snare: 'A thorned arrow that slows and interrupts wind-ups.',
  leap: 'Hop back, away from your aim. Briefly invulnerable.',
  rain: 'Aim a spot: arrows pour down for several seconds, hurting and slowing all inside.',
};
