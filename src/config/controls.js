/* CONTROLS: every key the game uses.
     KEYBINDS        the actions players can remap (Settings → Keys; runtime: src/core/keybinds.js). keys[0] is the
                     main key; later ones are alternatives (arrow keys, Tab, right Shift) that stay unless taken.
                     Skills 1-5 are the hero's five abilities in order (the fifth is the ultimate); every hero uses
                     the same skill keys. Skills only ever use letter keys: the number row belongs to the hotbar.
     HOTBAR_KEYS     1-9 select the hotbar slot the hero holds (fixed, like Esc).
     FIXED_CONTROLS  the mouse and fixed keys, as listed on the Controls page (src/ui/PauseMenu.js), next to the
                     current KEYBINDS and the hero's abilities.
   Keep in step with src/core/controls.js (what the keys do) and the README's controls table. */

export const KEYBINDS = [
  { group: 'Move', id: 'moveForward', label: 'Move forward', keys: ['KeyW', 'ArrowUp'] },
  { group: 'Move', id: 'moveBack', label: 'Move back', keys: ['KeyS', 'ArrowDown'] },
  { group: 'Move', id: 'moveLeft', label: 'Move left', keys: ['KeyA', 'ArrowLeft'] },
  { group: 'Move', id: 'moveRight', label: 'Move right', keys: ['KeyD', 'ArrowRight'] },
  { group: 'Move', id: 'jump', label: 'Jump (hold for a floatier rise)', keys: ['Space'] },
  { group: 'Move', id: 'sprint', label: 'Sprint', keys: ['ShiftLeft', 'ShiftRight'] },
  { group: 'Skills', id: 'skill1', label: 'Skill 1: basic attack (left click too)', keys: ['KeyZ'] },
  { group: 'Skills', id: 'skill2', label: 'Skill 2', keys: ['KeyQ'] },
  { group: 'Skills', id: 'skill3', label: 'Skill 3', keys: ['KeyR'] },
  { group: 'Skills', id: 'skill4', label: 'Skill 4', keys: ['KeyF'] },
  { group: 'Skills', id: 'skill5', label: 'Skill 5: ultimate', keys: ['KeyG'] },
  { group: 'Actions', id: 'interact', label: 'Talk, use, accept', keys: ['KeyE'] },
  { group: 'Actions', id: 'decline', label: 'Decline', keys: ['KeyX'] },
  { group: 'Actions', id: 'bag', label: 'Open / close the bag', keys: ['KeyI', 'Tab'] },
  { group: 'Actions', id: 'petCommand', label: 'Pet command (follow, stay, attack, passive)', keys: ['KeyT'] },
  { group: 'Actions', id: 'petAbility', label: "Pet's ability", keys: ['KeyV'] },
  { group: 'Actions', id: 'petMenu', label: 'Pet menu: see, swap and rename your pets', keys: ['KeyB'] },
  { group: 'Game', id: 'pause', label: 'Pause menu (Esc always works too)', keys: ['KeyP'] },
  { group: 'Game', id: 'journal', label: 'Journal: achievements, bestiary and collection', keys: ['KeyJ'] },
  { group: 'Game', id: 'toggleHint', label: 'Show / hide the controls panel', keys: ['KeyH'] },
  { group: 'Game', id: 'mute', label: 'Mute / unmute', keys: ['KeyM'] },
  { group: 'Game', id: 'heroSelect', label: 'Back to character select (press twice)', keys: ['KeyC'] },
];

export const HOTBAR_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
/** Keys no action can be bound to. */
export const RESERVED_KEYS = ['Escape', 'Enter', ...HOTBAR_KEYS];

export const FIXED_CONTROLS = [
  { group: 'Hotbar', rows: [
    [['1', '…', '9'], 'hold the item in that hotbar slot (or click it); press the number again to use it'],
    [['Right click'], 'use the held item: eat or drink it, or equip a weapon, armour or trinket'],
  ] },
  { group: 'Camera', rows: [
    [['Drag'], 'rotate the camera (it only changes the view: attacks go where the hero faces)'],
    [['Wheel'], 'zoom in / out (while aiming an ultimate: the marker nearer / farther)'],
  ] },
  { group: 'Always', rows: [
    [['Esc'], 'close the shop, bag, dialogue or aiming first; otherwise open the pause menu'],
  ] },
];

/** Shown under the ability list: how aimed (ground-targeted) abilities work. */
export const AIM_CONTROLS = [[['Click'], 'cast an aimed ability at the marker (or press its key again)'], [['Esc', 'Right click'], 'cancel aiming']];

const NAMED = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt',
  AltRight: 'R-Alt', Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', CapsLock: 'Caps' };
/** What a KeyboardEvent.code looks like on a key cap: 'KeyQ' -> 'Q', 'Digit1' -> '1', 'ShiftLeft' -> 'Shift'. */
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMED[code]) return NAMED[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}
