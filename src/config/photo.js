/* PHOTO MODE (TODO 39; runtime src/ui/PhotoMode.js). The world pauses, the HUD hides and a free camera orbits the hero.
     camera   orbit limits around the hero: distance (m), pitch (rad, + looks down), roll (rad, the horizon tilt),
              lift = the height above the hero's feet it looks at, and how fast keys orbit / tilt (rad/s)
     filters  colour grades applied by the post-processing finish (RenderSystem's paper pass), by index
     frames   borders drawn by the same pass, so they are part of the saved picture
     poses    what the hero does (src/entities/player/poses.js animatePhotoPose); emotes = bubbles over the hero
   Pure data plus the file name helper, unit-tested. */

export const PHOTO = {
  camera: { minDist: 1.6, maxDist: 12, minPitch: -0.2, maxPitch: 1.35, maxRoll: 0.6, lift: 1.0, orbitSpeed: 1.6, rollSpeed: 0.8 },
  filters: [{ id: 'none', label: 'None' }, { id: 'warm', label: 'Warm' }, { id: 'night', label: 'Night' }, { id: 'pastel', label: 'Pastel' }],
  frames: [{ id: 'none', label: 'None' }, { id: 'polaroid', label: 'Polaroid' }, { id: 'storybook', label: 'Storybook' }],
  poses: [{ id: 'none', label: 'Stand' }, { id: 'wave', label: 'Wave' }, { id: 'cheer', label: 'Cheer' }, { id: 'bow', label: 'Bow' }],
  emotes: [{ id: 'heart', label: '♥', color: '#ff6b9a' }, { id: 'star', label: '★', color: '#ffd24a' }, { id: '♪', label: '♪', color: '#7a8cff' }],
};

const pad = n => String(n).padStart(2, '0');
/** 'lanternmoss-tidewhisper-20261015-132301.png': the game, the planet id and the local time it was taken. */
export function photoFileName(planetId, date = new Date()) {
  const id = String(planetId ?? 'planet').replace(/[^a-z0-9-]+/gi, '').toLowerCase() || 'planet';
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return `lanternmoss-${id}-${day}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`;
}

/** The next option's index in a list (dir +1 / -1, wrapping). */
export const cycleIndex = (i, length, dir = 1) => ((i + dir) % length + length) % length;
