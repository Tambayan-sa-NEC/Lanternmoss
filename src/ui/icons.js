/* HUD icons drawn as inline SVG (no asset files, like the rest of the art): one glyph per ability id and per status.
   Glyphs use currentColor, so CSS decides the ink colour. Unknown ids fall back to a plain dot. */

const S = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';

const GLYPHS = {
  // ---- witch
  bolt: `<path ${F} d="M12 2.5l2.2 6.8 7.3 2.7-7.3 2.6L12 21.5l-2.2-6.9L2.5 12l7.3-2.7z"/>`,
  fireball: `<path ${F} d="M12 2.5c1.2 3.4 5.6 5.5 5.6 11a5.6 5.6 0 0 1-11.2 0c0-2.8 1.6-4.6 2.8-5.6.3 2.2 1.3 3.4 2.4 3.8C10.8 9 10.8 6 12 2.5z"/>`,
  nova: `<path ${S} d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>`,
  blink: `<path ${S} stroke-dasharray="2.6 2.6" d="M4 17c3-8 9-10.5 14-8.5"/><path ${F} d="M15.5 4.5l5.5 4.6-6.6 2.3z"/><circle ${F} cx="5" cy="18" r="2"/>`,
  meteor: `<circle ${F} cx="9" cy="15" r="5"/><path ${S} d="M13 11l7-7M11 8.5l4.5-5.5M15.5 13l5.5-4"/>`,
  // ---- knight
  slash: `<path ${S} stroke-width="2.6" d="M5 20L16 7"/><path ${F} d="M12.5 3c3.5-.2 7.5 2.8 8.3 7.3l-6-1.1-3.2-3.4z"/>`,
  dash: `<path ${S} stroke-width="2.6" d="M4 6l6 6-6 6M11.5 6l6 6-6 6"/>`,
  whirl: `<path ${S} d="M12 4a8 8 0 1 1-7.5 5.2"/><path ${F} d="M2.6 4.2l2.2 5.8 5.4-2.7z"/><circle ${F} cx="12" cy="12" r="2.2"/>`,
  guard: `<path ${F} d="M12 2.5l7.5 3.2v5.4c0 5.2-3.6 8.8-7.5 10.4-3.9-1.6-7.5-5.2-7.5-10.4V5.7z"/>`,
  leapSlam: `<path ${S} d="M12 2.5v10M7.8 8.8L12 13l4.2-4.2M3 20.5h18M6.5 17.5l-2-2.2M17.5 17.5l2-2.2"/>`,
  // ---- ranger
  shot: `<path ${S} d="M4 20L17.5 6.5M4 20l-.4-3.6M4 20l3.6.4"/><path ${F} d="M21 3l-1.2 6.7-5.5-5.5z"/>`,
  volley: `<path ${S} d="M12 21V7M12 21L5.5 9M12 21l6.5-12"/><path ${F} d="M12 2.5l-3 4.5h6zM4.2 5l.1 5.4 4-2.4zM19.8 5l-4.1 3 4 2.4z"/>`,
  snare: `<path ${S} d="M4 20L17.5 6.5M8 13l-2-.8M11 10l-.8-2M11.2 15.8l-.8-2M14.2 12.8l2 .8"/><path ${F} d="M21 3l-1.2 6.7-5.5-5.5z"/>`,
  leap: `<path ${S} d="M19 18c-.8-6.5-5.2-9.6-11.5-8.6"/><path ${F} d="M3.5 9.5l5.8-4.2.4 7.3z"/><path ${S} d="M15 21h6"/>`,
  rain: `<path ${S} d="M6 2.5v11M12 2.5v13M18 2.5v11"/><path ${F} d="M3.6 12.5L6 17.5l2.4-5zM9.6 14.5l2.4 5 2.4-5zM15.6 12.5l2.4 5 2.4-5z"/>`,
  // ---- statuses
  moon: `<path ${F} d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15.5 3.5z"/>`,
  feather: `<path ${F} d="M20 3.5C12 4 6.5 9.5 6 17l-2 3.5 1.4.8L7.3 18c7.6-.6 12.3-6.6 12.7-14.5z"/><path fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" d="M7.3 18L16 8"/>`,
  regen: `<path ${F} d="M12 20.5S3.5 15.3 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2c0 6.1-8.5 11.3-8.5 11.3z"/><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" d="M12 9.5v6M9 12.5h6"/>`,
  // ---- waypoints
  boss: `<path ${F} d="M12 3c-4.7 0-8 3.2-8 7.5 0 2.4 1.1 4.3 2.8 5.4V19h2.4v-2h1.6v2h2.4v-2h1.6v2h2.4v-3.1c1.7-1.1 2.8-3 2.8-5.4C20 6.2 16.7 3 12 3z"/><circle fill="#fff" cx="8.8" cy="11" r="1.9"/><circle fill="#fff" cx="15.2" cy="11" r="1.9"/>`,
  home: `<path ${F} d="M12 3.5L2.5 11.5h2.8V20h5v-5h3.4v5h5v-8.5h2.8z"/>`,
  star: `<path ${F} d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/>`,
  talk: `<path ${F} d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 16.5H10l-4.5 4v-4H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" d="M12 7.5v4M12 14v.1"/>`,
};

/** Inline SVG markup for an ability / status / waypoint id. */
export function icon(id) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[id] ?? `<circle ${F} cx="12" cy="12" r="5"/>`}</svg>`;
}
