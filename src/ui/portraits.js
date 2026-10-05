/* Dialogue portraits, drawn as SVG (no art files): a face per villager kind (npcDefs `portrait`) with an expression
   per line (line.e, or guessed from the text): happy, neutral, excited, surprised, sad, thinking, sleepy. */

const INK = '#3a2340';
const SKIN = { wizard: '#ffe2cc', baker: '#ffd9c0', bard: '#ffe6d2', sprite: '#fff0e0', smith: '#d9a07a', snowkeeper: '#ffe6da' };

/** Hair, hats and the like, drawn behind (back) and over (front) the face. */
const KIT = {
  wizard: {
    back: '',
    front: `<path d="M20 40 L54 -2 L80 40 Z" fill="#6a55c0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="20" y="33" width="60" height="8" rx="3" fill="#ffd36b" stroke="${INK}" stroke-width="2.5"/>
      <ellipse cx="50" cy="42" rx="40" ry="6" fill="#5a45a8" stroke="${INK}" stroke-width="3"/>
      <path d="M30 76 Q50 104 70 76 Q62 84 50 84 Q38 84 30 76 Z" fill="#fbf6ff" stroke="${INK}" stroke-width="2.5"/>
      <path d="M34 52 l8 -2 M66 52 l-8 -2" stroke="#fbf6ff" stroke-width="4" stroke-linecap="round"/>`,
  },
  baker: {
    back: `<ellipse cx="50" cy="50" rx="32" ry="26" fill="#8a5a44"/>`,
    front: `<rect x="31" y="18" width="38" height="14" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <circle cx="38" cy="16" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="52" cy="11" r="11" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <circle cx="64" cy="17" r="9" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="33" y="22" width="34" height="9" fill="#fff"/>`,
  },
  bard: {
    back: `<ellipse cx="50" cy="52" rx="33" ry="28" fill="#9a6a44"/>`,
    front: `<path d="M22 38 Q50 6 80 34 L76 40 Q50 26 26 42 Z" fill="#e0605a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M30 30 Q12 16 16 4" fill="none" stroke="#ff9ad0" stroke-width="5" stroke-linecap="round"/>`,
  },
  sprite: {
    back: `<ellipse cx="22" cy="58" rx="14" ry="7" fill="#cffaff" opacity=".85" transform="rotate(-25 22 58)"/>
      <ellipse cx="78" cy="58" rx="14" ry="7" fill="#ffd6f5" opacity=".85" transform="rotate(25 78 58)"/>
      <ellipse cx="50" cy="50" rx="30" ry="27" fill="#9ff5d8"/>`,
    front: `<path d="M38 30 Q34 16 30 10 M62 30 Q66 16 70 10" fill="none" stroke="#5fb35e" stroke-width="2.5"/>
      <circle cx="30" cy="9" r="4" fill="#fff08a" stroke="${INK}" stroke-width="2"/><circle cx="70" cy="9" r="4" fill="#fff08a" stroke="${INK}" stroke-width="2"/>
      <path d="M24 46 Q50 20 76 46 Q64 36 50 38 Q36 36 24 46 Z" fill="#9ff5d8" stroke="${INK}" stroke-width="2.5"/>`,
  },
  smith: {
    back: `<ellipse cx="50" cy="50" rx="32" ry="26" fill="#2e2220"/>`,
    front: `<path d="M20 40 Q50 26 80 40 L80 46 Q50 34 20 46 Z" fill="#e0482a" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="40" cy="34" r="7" fill="#ffd36b" stroke="${INK}" stroke-width="3"/><circle cx="60" cy="34" r="7" fill="#ffd36b" stroke="${INK}" stroke-width="3"/>
      <path d="M47 34 h6" stroke="${INK}" stroke-width="3"/><ellipse cx="66" cy="70" rx="5" ry="3" fill="#7a5040" opacity=".55"/>`,
  },
  snowkeeper: {
    back: `<circle cx="50" cy="54" r="40" fill="#f8fbff" stroke="${INK}" stroke-width="3"/>
      <path d="M22 26 L28 8 L38 22 Z M78 26 L72 8 L62 22 Z" fill="#f8fbff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    front: `<circle cx="16" cy="58" r="8" fill="#ff9fc0" stroke="${INK}" stroke-width="3"/><circle cx="84" cy="58" r="8" fill="#ff9fc0" stroke="${INK}" stroke-width="3"/>`,
  },
};

const eye = (x, y, rx = 3.6, ry = 5) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${x + 1.2}" cy="${y - 1.8}" r="1.3" fill="#fff"/>`;
const arc = (x, y, up = true) => `<path d="M${x - 5} ${y + (up ? 2 : -2)} Q${x} ${y + (up ? -5 : 5)} ${x + 5} ${y + (up ? 2 : -2)}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
/** Eyes, brows and mouth for each expression (face centred at 50,58). */
const FACES = {
  happy: () => arc(39, 58) + arc(61, 58) + `<path d="M42 70 Q50 78 58 70" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  neutral: () => eye(39, 58) + eye(61, 58) + `<path d="M44 72 Q50 75 56 72" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  excited: () => eye(39, 57, 4.4, 6) + eye(61, 57, 4.4, 6) +
    `<path d="M41 69 Q50 69 59 69 Q58 80 50 80 Q42 80 41 69 Z" fill="${INK}"/><ellipse cx="50" cy="76" rx="4" ry="2.4" fill="#ff8fa6"/>`,
  surprised: () => `<circle cx="39" cy="57" r="5" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="39" cy="57" r="2.2" fill="${INK}"/>
    <circle cx="61" cy="57" r="5" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="61" cy="57" r="2.2" fill="${INK}"/>
    <ellipse cx="50" cy="73" rx="3.6" ry="4.4" fill="${INK}"/>`,
  sad: () => eye(39, 59, 3.2, 4.4) + eye(61, 59, 3.2, 4.4) + `<path d="M33 50 l9 3 M67 50 l-9 3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M43 75 Q50 69 57 75" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  thinking: () => arc(39, 59, false) + eye(61, 57) + `<path d="M55 49 l10 -3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M45 73 h9" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  sleepy: () => arc(39, 59, false) + arc(61, 59, false) + `<ellipse cx="50" cy="73" rx="2.6" ry="3" fill="${INK}"/>
    <text x="72" y="40" font-size="14" font-weight="800" fill="#7a6cff" font-family="sans-serif">z</text>`,
};

/** Best-guess expression for a line that doesn't name one. */
export function guessExpression(text) {
  if (/yawn|zzz|sleep/i.test(text)) return 'sleepy';
  if (/\bsorry\b|\bsad\b|\bmiss\b|aww|brr/i.test(text)) return 'sad';
  if (/!\?|\?!|\beep\b|\bwhoa\b|\boh!/i.test(text)) return 'surprised';
  if (/!/.test(text)) return 'excited';
  if (/\.\.\.|\bhmm\b/i.test(text)) return 'thinking';
  return 'happy';
}

/** SVG markup for a villager kind with an expression, on a disc of their colour. */
export function portrait(kind, expression = 'happy', color = '#ffd6e0') {
  const kit = KIT[kind] ?? { back: '', front: '' }, face = FACES[expression] ?? FACES.happy;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="${color}" opacity=".35"/>${kit.back}
    <circle cx="50" cy="58" r="28" fill="${SKIN[kind] ?? '#ffe2cc'}" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="32" cy="68" rx="5" ry="3" fill="#ff9fb0" opacity=".7"/><ellipse cx="68" cy="68" rx="5" ry="3" fill="#ff9fb0" opacity=".7"/>
    ${face()}${kit.front}</svg>`;
}
