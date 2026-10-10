/* Shared Journal/tutorial copy rendering; all substituted text is escaped. */
import { CHARACTERS } from '../config/characters.js';
import { TUTORIAL_STEPS, HELP_TOPICS, GATHERING_TIPS, TUTORIAL_EVASION } from '../config/tutorial.js';
import { ctx } from '../core/context.js';
import { bindLabel } from '../core/keybinds.js';
import { Tutorial } from '../gameplay/Tutorial.js';

export const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const esc = escapeHtml;
export function helpText(text) {
  const heroId = ctx.player?.charId ?? 'witch', hero = CHARACTERS[heroId], spells = Object.values(hero.abilities);
  const evasion = hero.abilities[TUTORIAL_EVASION[heroId]];
  const names = { attackName: spells[0].name, evasionName: evasion.name, evasionKey: bindLabel(`skill${evasion.slot}`), ultimateName: spells.find(s => s.ult).name };
  return esc(text.replace(/\{(\w+)\}/g, (_, id) => names[id] ?? bindLabel(id)));
}
export function helpHtml() {
  const card = (title, text, seen) => `<section class="help-card"><h3>${esc(title)}${seen ? ' <small>Seen</small>' : ''}</h3><p>${helpText(text)}</p></section>`;
  const seen = Tutorial.state?.seen ?? [];
  return `<div class="jscroll help-page"><p>Help stays here throughout your adventure. Restart the guided walk from the pause menu.</p>` +
    HELP_TOPICS.map(t => card(t.title, t.text, seen.includes(t.id))).join('') +
    `<h3>First finds</h3>` + Object.entries(GATHERING_TIPS).map(([id, text]) => card(id === 'copperOre' ? 'Copper ore' : id === 'seed' ? 'Seeds' : id[0].toUpperCase() + id.slice(1), text, seen.includes(id))).join('') +
    `<h3>The first walk</h3>` + TUTORIAL_STEPS.map(s => card(s.title, s.text, Tutorial.state?.done.includes(s.id))).join('') + '</div>';
}

