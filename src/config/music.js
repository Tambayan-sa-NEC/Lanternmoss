/* Registered procedural pad/chime themes. New worlds add their own scores in their music stage. */
export const MUSIC_THEMES = {
  seaWaltz: {pad:[130.81,196,261.63,293.66,392],notes:[523.25,659.25,783.99,659.25,587.33,523.25],interval:[720,720],meter:3},
  cozy: { pad: [130.81, 196, 261.63, 329.63, 392], notes: [523.25, 587.33, 659.25, 783.99, 880, 1046.5], interval: [2500, 7500] },
  // Duskhollow (30c): a music box over low strings, its phrase turning slowly above a minor pad.
  musicBox: { pad: [110, 164.81, 220, 261.63, 329.63], notes: [1046.5, 1244.51, 1396.91, 1567.98, 1396.91, 1244.51, 1046.5, 987.77], interval: [1100, 1100], meter: 3 },
};
