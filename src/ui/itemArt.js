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
};

/** SVG markup for item definition `def` (its icon.art), or null when it has no drawing of its own. */
export function itemArtSvg(def) {
  const draw = ART[def.icon.art]; if (!draw) return null;
  const n = def.icon.color ?? 0xffffff;
  return `<svg class="item-art" viewBox="0 0 32 32" aria-hidden="true">${draw(hex(n), shade(n, 0.5), shade(n, -0.45))}</svg>`;
}
export const ART_KINDS = Object.keys(ART);
