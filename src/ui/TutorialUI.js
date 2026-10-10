import { TUTORIAL_STEPS, FAINT_TIP } from '../config/tutorial.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { describeSummon } from '../gameplay/BossGate.js';
import { Tutorial } from '../gameplay/Tutorial.js';
import { JournalUI } from './JournalUI.js';
import { Dialog } from './Dialog.js';
import { helpText, escapeHtml as esc } from './help.js';

export const TutorialUI = {
  root: null, faint: null, last: '', lastFaint: '',
  init() {
    this.root = document.createElement('aside'); this.root.id = 'tutorial'; this.root.setAttribute('aria-label', 'Guided walk');
    this.faint = document.createElement('section'); this.faint.id = 'faint-screen'; this.faint.setAttribute('aria-label', 'You fainted');
    document.body.append(this.root, this.faint);
    this.root.addEventListener('click', e => {
      const action = e.target.closest('[data-tutorial]')?.dataset.tutorial;
      if (action === 'skip') Tutorial.skip();
      else if (action === 'next') Tutorial.acknowledge();
      else if (action === 'help') JournalUI.open('help');
      this.render();
    });
  },
  render() {
    const P = ctx.player, visible = ctx.started && !ctx.paused && !ctx.transitioning && !ctx.cutscene && !ctx.indoors && !ctx.inventoryOpen && !Dialog.open;
    const step = Tutorial.step;
    this.root.style.display = visible && !P.dead && step ? 'block' : 'none';
    if (step) {
      const conditions = step.id === 'lair' ? `<ul>${describeSummon(PLANETS[ctx.planet].boss.summon).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
      const html = `<div class="tutorial-count">First walk · ${TUTORIAL_STEPS.indexOf(step) + 1} / ${TUTORIAL_STEPS.length}</div><h3>${esc(step.title)}</h3><p>${helpText(step.text)}</p>${conditions}` +
        `<div class="tutorial-actions">${step.acknowledge ? '<button type="button" data-tutorial="next">Got it</button>' : ''}<button type="button" data-tutorial="help">Help</button><button type="button" data-tutorial="skip">Skip guide</button></div>`;
      if (html !== this.last) { this.root.innerHTML = html; this.last = html; }
    }
    this.faint.style.display = ctx.started && P.dead && !ctx.paused ? 'block' : 'none';
    if (P.dead) {
      const r = Tutorial.state.recap, seconds = Math.floor(r?.duration ?? 0);
      const html = `<h2>You fainted</h2><p>${r ? `${esc(r.source)} hit you for ${r.amount} damage.` : 'The lanterns are guiding you home.'}</p>` +
        `<p>Time since waking: ${Math.floor(seconds / 60)}m ${seconds % 60}s</p><strong>Back home in ${Math.max(0, P.deadT).toFixed(1)}s</strong><p class="faint-tip">${esc(FAINT_TIP)}</p>`;
      if (html !== this.lastFaint) { this.faint.innerHTML = html; this.lastFaint = html; }
    }
  },
};
