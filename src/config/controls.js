/* The fixed controls, as shown on the pause menu's Controls page (src/ui/PauseMenu.js). The hero's abilities are
   listed from CHARACTERS[...].abilities, so a new ability shows up there by itself. Keep in step with
   src/core/controls.js (what the keys do) and the README's controls table. */

export const FIXED_CONTROLS = [
  { group: 'Move', rows: [
    [['W', 'A', 'S', 'D'], 'move (arrow keys work too)'],
    [['Shift'], 'sprint'],
    [['Space'], 'jump (hold for a floatier rise)'],
  ] },
  { group: 'Camera', rows: [
    [['Drag'], 'rotate the camera'],
    [['Wheel'], 'zoom in / out'],
  ] },
  { group: 'Interact', rows: [
    [['E'], 'talk, advance, accept'],
    [['X'], 'decline'],
    [['I', 'Tab'], 'open / close the bag (and its Craft tab)'],
    [['6', '7', '8'], 'quick-use the food or tonic on that key (set in the bag)'],
  ] },
  { group: 'Pet', rows: [
    [['T'], 'tell your pet: follow, stay, attack my target, passive (press again for the next)'],
    [['V'], "your pet's ability (shown on its card next to the ability bar)"],
    [['E'], 'pet your pet (stand still beside it)'],
  ] },
  { group: 'Game', rows: [
    [['Esc', 'P'], 'pause menu (Esc first closes the shop, bag, dialogue or aiming)'],
    [['H'], 'show / hide the controls panel'],
    [['M'], 'mute / unmute'],
    [['C'], 'back to character select (press twice; restarts the adventure)'],
  ] },
];

/** Shown under the ability list: how aimed (ground-targeted) abilities work. */
export const AIM_CONTROLS = [[['Click'], 'cast an aimed ability at the marker (or press its key again)'], [['Esc', 'Right click'], 'cancel aiming']];
