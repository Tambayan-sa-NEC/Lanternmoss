/* Item pictures as inline SVG (no asset files, like the rest of the art): one drawing per ITEM_ART_KINDS entry
   (config/items.js), tinted with the item's icon.color, so related items (three staves, three crowns...) share a
   drawing but not a look. Matching world models: src/models/items.js. */

const INK = '#3a2340';
const hex = n => '#' + n.toString(16).padStart(6, '0');
/** The colour mixed toward white (k > 0) or ink (k < 0). */
function shade(n, k) {
  const t = k > 0 ? [255, 255, 255] : [58, 35, 64], a = Math.abs(k);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (t[i] - v) * a));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
const S = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const GOLD = '#ffd36b', WOOD = '#b0703a', STEEL = '#dfe6f0';

/** kind -> (main colour hex, light, dark) -> SVG body (viewBox 0 0 32 32). */
const ART = {
  bun: (c, l) => `<path ${S} fill="${c}" d="M4 20c0-7 5.5-11 12-11s12 4 12 11z"/><path ${S} fill="#f6e0c0" d="M4 20h24v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/>
    <path fill="none" stroke="${l}" stroke-width="2" stroke-linecap="round" d="M10 14q3-2 6 0M16 12q3-2 6 1"/>`,
  tart: (c, l) => `<path ${S} fill="#e8b878" d="M3 18h26l-3 8H6z"/><ellipse ${S} fill="${c}" cx="16" cy="18" rx="13" ry="4"/>
    <circle ${S} fill="${l}" cx="12" cy="15" r="2.6"/><circle ${S} fill="${l}" cx="19" cy="14" r="2.6"/><circle ${S} fill="${c}" cx="16" cy="11" r="2.4"/>`,
  berry: (c, l) => `<circle ${S} fill="${c}" cx="13" cy="19" r="7"/><circle ${S} fill="${c}" cx="20" cy="15" r="6"/>
    <circle fill="${l}" cx="11" cy="17" r="1.8"/><circle fill="${l}" cx="18.5" cy="13" r="1.6"/><path ${S} fill="#6fbf6a" d="M19 9c1-4 5-5 7-4-1 3-4 5-7 4z"/>`,
  bottle: (c, l) => `<path ${S} fill="${c}" d="M12 11h8v3c4 2 6 5 6 8a8 8 0 0 1-8 7h-4a8 8 0 0 1-8-7c0-3 2-6 6-8z"/>
    <rect ${S} fill="${WOOD}" x="12" y="4" width="8" height="6" rx="1.5"/><path fill="none" stroke="${l}" stroke-width="2.4" stroke-linecap="round" d="M10.5 21a5 5 0 0 0 3 4"/>`,
  bowl: (c, l) => `<path ${S} fill="${c}" d="M4 15h24a12 9 0 0 1-24 0z"/>
    <ellipse ${S} fill="${l}" cx="16" cy="15" rx="12" ry="3.4"/><path fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" d="M11 9q1-3 0-5M16 9q1-3 0-5M21 9q1-3 0-5"/>`,
  flask: (c, l) => `<path ${S} fill="${c}" d="M13 4h6v8l7 13a3 3 0 0 1-3 4H9a3 3 0 0 1-3-4l7-13z"/><path fill="${l}" d="M9.5 21h13l2 4H7.5z" opacity=".8"/>
    <path ${S} fill="none" d="M12 4h8"/><circle fill="#fff" cx="14" cy="17" r="1.4"/>`,
  moonCharm: (c, l, d) => `<circle ${S} fill="${GOLD}" cx="16" cy="16" r="11"/><path ${S} fill="${c}" d="M19 8a8 8 0 1 0 5 13 6.5 6.5 0 0 1-5-13z"/><circle fill="${d}" cx="11" cy="14" r="1.2"/>`,
  leafCharm: (c, l, d) => `<circle ${S} fill="${GOLD}" cx="16" cy="16" r="11"/><path ${S} fill="${c}" d="M9 23c0-9 6-14 15-14 0 9-6 14-15 14z"/><path fill="none" stroke="${d}" stroke-width="1.6" stroke-linecap="round" d="M10 22l10-10"/>`,
  mushroom: (c, l) => `<path ${S} fill="#fff0dc" d="M13 17h6l1 10h-8z"/><path ${S} fill="${c}" d="M3 18C3 10 9 5 16 5s13 5 13 13z"/>
    <circle fill="${l}" cx="11" cy="12" r="2"/><circle fill="${l}" cx="19" cy="10" r="1.6"/><circle fill="${l}" cx="22" cy="14" r="1.3"/>`,
  shard: (c, l, d) => `<path ${S} fill="${c}" d="M16 3l7 10-3 16h-8L9 13z"/><path fill="${l}" d="M16 3l-7 10h7z" opacity=".9"/><path fill="${d}" d="M16 13h7l-3 16h-4z" opacity=".35"/>`,
  petal: (c, l, d) => `<path ${S} fill="${c}" d="M16 28C6 22 5 11 16 4c11 7 10 18 0 24z"/><path fill="none" stroke="${d}" stroke-width="1.6" stroke-linecap="round" d="M16 26V9"/><path fill="${l}" d="M12 12q2-4 4-6v8z" opacity=".8"/>`,
  staff: (c, l) => `<path ${S} fill="${WOOD}" d="M8 29l11-17 2 1.4L10 30z"/><circle ${S} fill="${c}" cx="22" cy="9" r="5.5"/>
    <circle fill="${l}" cx="20.5" cy="7.5" r="1.8"/><path ${S} fill="none" d="M17 13q-3-2-2-6M27 11q2-3 0-6"/>`,
  axe: (c, l, d) => `<path ${S} fill="${WOOD}" d="M6 29L22 7l2.4 1.6L8.6 30.6z"/><path ${S} fill="${c}" d="M16 9c3-5 9-7 13-5-1 5-4 10-9 11z"/>
    <path fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M27 5.5c-3 0-7 2-9 5"/><circle fill="${d}" cx="21" cy="10" r="1.4"/>`,
  bow: (c, l) => `<path ${S} fill="none" stroke-width="3.4" d="M7 4c12 4 18 12 21 24"/><path fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" d="M7 4c12 4 18 12 21 24"/>
    <path fill="none" stroke="${INK}" stroke-width="1.2" d="M7 4L28 28"/><path ${S} fill="${STEEL}" d="M5 23l9-9 2 2-9 9-3 1z"/><path ${S} fill="${l}" d="M14 14l4-1-1 4z"/>`,
  cloak: (c, l, d) => `<path ${S} fill="${c}" d="M11 5h10l2 4 5 18H4L9 9z"/><path ${S} fill="${d}" d="M11 5q5 5 10 0l-1 6h-8z"/>
    <path fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M12 14l-3 11M20 14l3 11"/><circle ${S} fill="${GOLD}" cx="16" cy="11" r="2"/>`,
  mail: (c, l, d) => `<path ${S} fill="${c}" d="M10 5l6 3 6-3 6 5-3 4v13H7V14l-3-4z"/>
    <path fill="none" stroke="${d}" stroke-width="1.4" d="M9 16h14M9 20h14M9 24h14"/><path fill="${l}" d="M11 7l5 2.5V14h-5z" opacity=".55"/>`,
  mantle: (c, l, d) => `<path ${S} fill="${c}" d="M5 10q11-8 22 0l-2 17H7z"/><path ${S} fill="${l}" d="M5 10q11 6 22 0q-11-6-22 0z"/>
    <path fill="#fff" d="M10 17l1.2 1.2L10 19.4l-1.2-1.2zM22 20l1.2 1.2L22 22.4l-1.2-1.2zM16 23l1.2 1.2L16 25.4l-1.2-1.2z"/>`,
  pendant: (c, l) => `<path fill="none" stroke="${INK}" stroke-width="1.6" d="M7 4q9 10 18 0"/><path ${S} fill="${GOLD}" d="M13 13h6l1 3h-8z"/>
    <path ${S} fill="${c}" d="M12 16h8v8a4 4 0 0 1-8 0z"/><circle fill="#fff" cx="16" cy="20" r="2.2"/><path ${S} fill="${GOLD}" d="M12 24h8v2h-8z"/>`,
  ring: (c, l) => `<circle ${S} fill="none" stroke-width="5" cx="16" cy="19" r="8"/><circle fill="none" stroke="${GOLD}" stroke-width="3" cx="16" cy="19" r="8"/>
    <path ${S} fill="${c}" d="M16 5l5 4-5 5-5-5z"/><path fill="${l}" d="M16 6l3 3h-6z"/>`,
  locket: (c, l) => `<path fill="none" stroke="${INK}" stroke-width="1.6" d="M8 3q8 9 16 0"/><circle ${S} fill="${STEEL}" cx="16" cy="19" r="8"/>
    <path ${S} fill="${c}" d="M16 14l1.5 3.5L21 19l-3.5 1.5L16 24l-1.5-3.5L11 19l3.5-1.5z"/><circle ${S} fill="${STEEL}" cx="16" cy="10.5" r="1.5"/>`,
  key: (c, l, d) => `<circle ${S} fill="${c}" cx="11" cy="11" r="6.5"/><circle fill="${INK}" cx="11" cy="11" r="2.2"/>
    <path ${S} fill="${c}" d="M15.5 15.5L27 27l-2.5 2.5-2-2-2 2-2-2 2-2-5.5-5.5z"/><circle fill="#fff" opacity=".8" cx="9" cy="8.5" r="1.4"/>`,
  crown: (c, l) => `<path ${S} fill="${c}" d="M4 25l-1-14 7 6 6-10 6 10 7-6-1 14z"/><path ${S} fill="${GOLD}" d="M4 22h24v4H4z"/>
    <circle ${S} fill="#fff" cx="16" cy="18" r="2"/><circle fill="${l}" cx="9" cy="19" r="1.4"/><circle fill="${l}" cx="23" cy="19" r="1.4"/>`,
  // ---- resources (TODO 16)
  log: (c, l, d) => `<path ${S} fill="${c}" d="M7 9h17a5 5 0 0 1 0 10H7z"/><ellipse ${S} fill="${l}" cx="7" cy="14" rx="4" ry="5"/>
    <ellipse fill="none" stroke="${d}" stroke-width="1.3" cx="7" cy="14" rx="1.8" ry="2.4"/><path ${S} fill="${c}" d="M10 19h14a4 4 0 0 1 0 8H10z"/>
    <ellipse ${S} fill="${l}" cx="10" cy="23" rx="3.2" ry="4"/><path fill="none" stroke="${d}" stroke-width="1.3" stroke-linecap="round" d="M15 12h6M17 23h5"/>`,
  stone: (c, l, d) => `<path ${S} fill="${c}" d="M4 23l3-9 8-6 9 3 4 9-5 6H9z"/><path fill="${l}" d="M8 14l7-5 5 2-8 5z" opacity=".85"/><path fill="${d}" d="M22 21l5-1-4 5h-5z" opacity=".4"/>`,
  ore: (c, l) => `<path ${S} fill="#b6aec8" d="M4 23l3-9 8-6 9 3 4 9-5 6H9z"/><path ${S} fill="${c}" d="M10 15l5-3 3 3-4 4z"/>
    <path ${S} fill="${c}" d="M17 21l5-2 2 3-5 2z"/><path ${S} fill="${c}" d="M8 21l3-1 1 3-3 1z"/><circle fill="${l}" cx="13" cy="14.5" r="1.1"/>`,
  gemstone: (c, l, d) => `<path ${S} fill="${c}" d="M9 6h14l5 7-12 15L4 13z"/><path fill="${l}" d="M9 6l3 7h8l3-7z" opacity=".85"/>
    <path fill="none" stroke="${d}" stroke-width="1.2" stroke-linejoin="round" d="M4 13h24M12 13l4 15 4-15"/>`,
  herb: (c, l) => `<path ${S} fill="none" d="M16 29V12"/><path ${S} fill="${c}" d="M16 19c-6 0-9-4-9-10 5 0 9 4 9 10z"/>
    <path ${S} fill="${c}" d="M16 15c5 0 9-3 9-10-5 0-9 4-9 10z"/><path ${S} fill="${l}" d="M16 25c-4 0-6-2-6-5 3 0 6 2 6 5z"/>`,
  pepper: (c, l) => `<path ${S} fill="${c}" d="M12 10c-5 5-6 13 0 19 2 2 5 0 3-2-4-5-3-11 3-16z"/>
    <path ${S} fill="#6fbf6a" d="M12 10c0-4 3-6 7-6-1 3-3 5-6 6z"/><path fill="none" stroke="${l}" stroke-width="1.8" stroke-linecap="round" d="M11 15q-2 5 0 9"/>`,
  plum: (c, l, d) => `<circle ${S} fill="${c}" cx="16" cy="19" r="9"/><path fill="none" stroke="${d}" stroke-width="1.4" d="M16 11q-2 8 0 16"/>
    <path ${S} fill="#6fbf6a" d="M16 10c1-3 4-5 8-4-1 3-4 4-8 4z"/><circle fill="#fff" opacity=".75" cx="12" cy="16" r="2"/>`,
  carrot: (c, l, d) => `<path ${S} fill="${c}" d="M21 10L6 27c3 0 15-7 18-12z"/><path ${S} fill="#6fbf62" d="M21 10c-1-4 1-7 4-8 0 3 0 5-2 6 3-1 5-1 7 1-3 2-6 2-9 1z"/>
    <path fill="none" stroke="${d}" stroke-width="1.4" stroke-linecap="round" d="M11 21l3 1M15 17l3 1"/>`,
  wheat: (c) => `<path ${S} fill="none" d="M16 29V9M10 29l4-13M22 29l-4-13"/>` +
    [[16, 7], [16, 12], [13.5, 9.5], [18.5, 9.5], [11, 14], [21, 14], [13.5, 14.5], [18.5, 14.5]].map(([x, y]) => `<ellipse ${S} stroke-width="1.4" fill="${c}" cx="${x}" cy="${y}" rx="2" ry="3"/>`).join(''),
  pumpkin: (c, l, d) => `<ellipse ${S} fill="${c}" cx="16" cy="19" rx="12" ry="9"/><path fill="none" stroke="${d}" stroke-width="1.6" d="M16 10v18M10 11q-4 8 0 16M22 11q4 8 0 16"/>
    <path ${S} fill="#6fbf6a" d="M15 10c0-3 1-5 3-6l1.6 1.6c-2 1-2 2.4-2 4.4z"/><circle fill="#fff" opacity=".55" cx="9" cy="16" r="1.8"/>`,
  seeds: (c) => `<path ${S} fill="#e8c890" d="M9 12h14l3 14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path ${S} fill="#d8b070" d="M10 12l2-5h8l2 5z"/>
    <circle ${S} fill="${c}" cx="16" cy="21" r="3.6"/><path fill="none" stroke="${INK}" stroke-width="1.4" d="M11 9.5h10"/>`,
  fish: (c, l) => `<path ${S} fill="${c}" d="M3 16c4-6 13-8 19-2l6-5v14l-6-5c-6 6-15 4-19-2z"/><circle fill="${INK}" cx="8.5" cy="15" r="1.5"/>
    <path fill="none" stroke="${l}" stroke-width="1.8" stroke-linecap="round" d="M13 12q2 4 0 8M17.5 13q1.5 3 0 6"/>`,
  bread: (c, l) => `<path ${S} fill="${c}" d="M4 20c0-6 5-10 12-10s12 4 12 10v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
    <path fill="none" stroke="${l}" stroke-width="2.2" stroke-linecap="round" d="M10 14l2 3.5M15 13l2 3.5M20 14l2 3.5"/>`,
  skewer: (c, l) => `<path ${S} fill="none" stroke-width="2.4" d="M4 28L28 4"/><path fill="none" stroke="${WOOD}" stroke-width="1.2" d="M4 28L28 4"/>
    <circle ${S} fill="${c}" cx="10" cy="22" r="4.2"/><circle ${S} fill="#6fbf6a" cx="15.5" cy="16.5" r="3.2"/><circle ${S} fill="${c}" cx="21" cy="11" r="4"/><circle fill="${l}" cx="9" cy="21" r="1.3"/>`,
  pickaxe: (c, l) => `<path ${S} fill="${WOOD}" d="M8 29L18 10l2.4 1.2L10.4 30z"/><path ${S} fill="${c}" d="M4 12c7-7 17-8 25-3l-1.6 2.4C21 8 12 9 6.5 14z"/>
    <path fill="none" stroke="${l}" stroke-width="1.4" stroke-linecap="round" d="M8 11.5c5-3.5 11-4.5 17-3"/>`,
  rod: (c) => `<path ${S} fill="none" stroke-width="3.4" d="M5 29L26 4"/><path fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" d="M5 29L26 4"/>
    <path fill="none" stroke="${INK}" stroke-width="1" d="M26 4q4 10 1 18"/><circle ${S} fill="#ff6a6a" cx="27" cy="24" r="2.4"/><circle ${S} fill="${STEEL}" cx="10" cy="23" r="2.6"/>`,
  hoe: (c, l) => `<path ${S} fill="${WOOD}" d="M8 29L21 7l2.3 1.3L10.3 30.3z"/><path ${S} fill="${c}" d="M18 6l9-3 1.4 5-8.4 3.4z"/><path fill="${l}" d="M19 6.5l7-2.2.5 1.6-7 2.4z"/>`,
  can: (c, l) => `<path ${S} fill="${c}" d="M6 13h15v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path ${S} fill="${c}" d="M21 17l6-7 1.6 1.6-6 7.4z"/>
    <path ${S} fill="none" d="M9 13q4.5-7 9 0"/><path fill="${l}" d="M8 16h4v8H8z" opacity=".6"/><circle fill="#9fe8ff" cx="29" cy="13" r="1.2"/>`,
  helm: (c, l, d) => `<path ${S} fill="${c}" d="M6 21c0-8 4-14 10-14s10 6 10 14v3H6z"/><path ${S} fill="${d}" d="M6 20h20v4H6z"/>
    <path ${S} fill="#f6ead8" d="M8 10L4 4l6 3zM24 10l4-6-6 3z"/><path fill="${l}" d="M10 12q2-3 5-3v8h-6z" opacity=".55"/>`,
  boots: (c, l, d) => `<path ${S} fill="${c}" d="M9 4h9v13l7 3a3 3 0 0 1 2 3v3H7V4z"/><path ${S} fill="${d}" d="M7 25h20v3H7z"/><path fill="${l}" d="M10 6h6v4h-6z" opacity=".6"/>`,
  hood: (c, l, d) => `<path ${S} fill="${c}" d="M5 27c0-14 4-22 11-22s11 8 11 22c-3-4-7-5-11-5s-8 1-11 5z"/>
    <path ${S} fill="#ffe2cc" d="M10 22c0-6 3-10 6-10s6 4 6 10c-2-1-4-2-6-2s-4 1-6 2z"/><path fill="none" stroke="${d}" stroke-width="1.4" d="M16 5v6"/>`,
  strawHat: (c) => `<ellipse ${S} fill="${c}" cx="16" cy="21" rx="14" ry="5"/><path ${S} fill="${c}" d="M9 20c0-7 3-11 7-11s7 4 7 11z"/><path ${S} fill="#e0605a" d="M9 16.5h14V20H9z"/>`,
  flowerCrown: (c) => `<ellipse fill="none" stroke="${INK}" stroke-width="4.4" cx="16" cy="19" rx="12" ry="6"/><ellipse fill="none" stroke="#5fae5a" stroke-width="2.4" cx="16" cy="19" rx="12" ry="6"/>` +
    [[4, 19, c], [9, 14, '#fff'], [16, 13, '#ffd36b'], [23, 14, c], [28, 19, '#fff'], [10, 24, '#ffd36b'], [22, 24, c]].map(([x, y, col]) => `<circle ${S} stroke-width="1.6" fill="${col}" cx="${x}" cy="${y}" r="2.8"/>`).join(''),
  frogHat: (c, l) => `<path ${S} fill="${c}" d="M4 25c0-9 5-14 12-14s12 5 12 14z"/><circle ${S} fill="${c}" cx="10" cy="11" r="4.2"/><circle ${S} fill="${c}" cx="22" cy="11" r="4.2"/>
    <circle fill="#fff" cx="10" cy="11" r="2.4"/><circle fill="#fff" cx="22" cy="11" r="2.4"/><circle fill="${INK}" cx="10.4" cy="11.4" r="1.1"/><circle fill="${INK}" cx="22.4" cy="11.4" r="1.1"/><path fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" d="M9 21q7 3 14 0"/>`,
  cape: (c, l, d) => `<path ${S} fill="${c}" d="M9 5h14l5 22-6-2-6 3-6-3-6 2z"/><path ${S} fill="${d}" d="M9 5q7 5 14 0l-1 3q-6 3-12 0z"/>
    <path fill="${l}" d="M13 14l1 1-1 1-1-1zM19 18l1 1-1 1-1-1zM15 22l1 1-1 1-1-1z"/>`,
};

/** SVG markup for item definition `def` (its icon.art), or null when it has no drawing of its own. */
export function itemArtSvg(def) {
  const draw = ART[def.icon.art]; if (!draw) return null;
  const n = def.icon.color ?? 0xffffff;
  return `<svg class="item-art" viewBox="0 0 32 32" aria-hidden="true">${draw(hex(n), shade(n, 0.5), shade(n, -0.45))}</svg>`;
}
export const ART_KINDS = Object.keys(ART);
