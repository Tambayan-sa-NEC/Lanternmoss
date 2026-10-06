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
  chest: `<path ${F} d="M3 10.5C3 6.5 6 4 12 4s9 2.5 9 6.5zM3 12h18v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z"/><rect fill="#fff" x="10.3" y="10.2" width="3.4" height="4.2" rx="1"/>`,
  // ---- pets and their abilities
  owl: `<path ${F} d="M12 3c-4.6 0-7.5 3-7.5 7.2V15c0 3.6 3.3 6 7.5 6s7.5-2.4 7.5-6v-4.8C19.5 6 16.6 3 12 3zM5 4l3 2.5M19 4l-3 2.5"/><circle fill="#fff" cx="9" cy="10" r="2.6"/><circle fill="#fff" cx="15" cy="10" r="2.6"/><path fill="#fff" d="M11 13.5h2l-1 2z"/>`,
  wolf: `<path ${F} d="M4 3l4 5h8l4-5 1 9c0 5-4.5 9-9 9s-9-4-9-9z"/><circle fill="#fff" cx="9" cy="12" r="1.5"/><circle fill="#fff" cx="15" cy="12" r="1.5"/><path fill="#fff" d="M10.5 16h3L12 18z"/>`,
  fox: `<path ${F} d="M3 4l5 4h8l5-4-1.5 8.5L12 21l-7.5-8.5z"/><path fill="#fff" d="M7 13l5 7 5-7-5 2z"/><circle fill="#fff" cx="9" cy="11" r="1.3"/><circle fill="#fff" cx="15" cy="11" r="1.3"/>`,
  wisp: `<path ${F} d="M12 4a7 7 0 0 1 7 7c0 4-3 6.5-5 8.5l1 2.5-3-1.5-3 1.5 1-2.5c-2-2-5-4.5-5-8.5a7 7 0 0 1 7-7z"/><circle fill="#fff" cx="9.5" cy="11" r="1.4"/><circle fill="#fff" cx="14.5" cy="11" r="1.4"/>`,
  whelp: `<path ${F} d="M6 9l-3-5 5 3 2-2 2 3 2-3 2 2 5-3-3 5c1 1.5 1.5 3 1.5 5 0 4-3.5 7-8.5 7s-8.5-3-8.5-7c0-2 .5-3.5 1.5-5z"/><circle fill="#fff" cx="9" cy="13" r="1.5"/><circle fill="#fff" cx="15" cy="13" r="1.5"/><path fill="#fff" d="M10 17h4"/>`,
  scout: `<path ${S} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle ${F} cx="12" cy="12" r="3.2"/>`,
  howl: `<path ${S} d="M5 19c2-6 3-10 7-14M12 5c2 3 4 4 7 4"/><path ${S} d="M15 14q2 1.5 0 3M18 12q3.5 3 0 6"/>`,
  fetch: `<path ${F} d="M7 7.5a2.3 2.3 0 1 1 0 .1zM17 7.5a2.3 2.3 0 1 1 0 .1zM4 12.5a2 2 0 1 1 0 .1zM20 12.5a2 2 0 1 1 0 .1zM12 11c3.5 0 6 4 6 6.5 0 2-2 2.5-3.5 2-1-.3-1.6-.6-2.5-.6s-1.5.3-2.5.6C8 20 6 19.5 6 17.5 6 15 8.5 11 12 11z"/>`,
  mend: `<path ${F} d="M12 20.5S3.5 15.3 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2c0 6.1-8.5 11.3-8.5 11.3z"/><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" d="M12 9.5v6M9 12.5h6"/>`,
  flame: `<path ${F} d="M12 2.5c1.2 3.4 5.6 5.5 5.6 11a5.6 5.6 0 0 1-11.2 0c0-2.8 1.6-4.6 2.8-5.6.3 2.2 1.3 3.4 2.4 3.8C10.8 9 10.8 6 12 2.5z"/><circle fill="#fff" cx="12" cy="15.5" r="2.2"/>`,
  home: `<path ${F} d="M12 3.5L2.5 11.5h2.8V20h5v-5h3.4v5h5v-8.5h2.8z"/>`,
  star: `<path ${F} d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/>`,
  quest: `<path ${F} d="M6 3.5h10.5a3 3 0 0 1 3 3V19a2 2 0 0 1-2 2H7.5a3 3 0 0 1-3-3V5a1.5 1.5 0 0 1 1.5-1.5z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M8 8h8M8 11.5h8M8 15h5"/>`,
  talk: `<path ${F} d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 16.5H10l-4.5 4v-4H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" d="M12 7.5v4M12 14v.1"/>`,
};
// ---- the journal
Object.assign(GLYPHS, {
  book: `<path ${F} d="M4 4.5c2.8-.8 5.4-.4 7.2 1.2v14c-1.8-1.4-4.4-1.8-7.2-1.2zM20 4.5c-2.8-.8-5.4-.4-7.2 1.2v14c1.8-1.4 4.4-1.8 7.2-1.2z"/>`,
  trophy: `<path ${F} d="M7 3.5h10v5a5 5 0 0 1-10 0zM10.5 14h3v3.5h2.5v3H8v-3h2.5z"/><path ${S} d="M7 5.5H4.2c0 3 1.2 4.6 3.2 5M17 5.5h2.8c0 3-1.2 4.6-3.2 5"/>`,
  gem: `<path ${F} d="M7 4h10l4 5.5-9 11-9-11z"/><path fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" d="M3.5 9.5h17M9.5 4.5 12 9.5l2.5-5M12 9.5v10"/>`,
  craft: `<path ${F} d="M13.5 3.5l6.8 6.8-2.3 2.3-2-2-7.6 7.6a1.9 1.9 0 0 1-2.7-2.7L13.3 8l-2-2z"/><path ${S} d="M4 20.5h7"/>`,
  sprout: `<path ${F} d="M11.2 12.5C6 13 3.5 9.8 3.5 5.5c4.5 0 7.6 2.4 7.7 7zM12.8 10.5c.4-4 3-6.4 7.7-6.4 0 4-2.4 6.8-7.7 6.4z"/><path ${S} d="M12 21v-9.5"/>`,
});
GLYPHS.eye = GLYPHS.scout; GLYPHS.paw = GLYPHS.fetch;   // compass marks for what a pet spotted or sniffed out

/** Inline SVG markup for an ability / status / waypoint id. */
export function icon(id) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[id] ?? `<circle ${F} cx="12" cy="12" r="5"/>`}</svg>`;
}
