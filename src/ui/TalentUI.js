/* TALENT PAGE (#talent-menu, TODO 28b): the hero's tree (config/talents.js) row by row, each talent's ranks and what
   it needs, the points to spend and a Learn button. Opened from the pause menu (on top of it) once the hero's tree is
   released; the world stays paused while it's open. Esc or ✕ closes it (back to the pause menu when it came from there).
   Rules and saves: src/gameplay/Talents.js. */
import { ctx } from '../core/context.js';
import { Talents } from '../gameplay/Talents.js';
import { learnProblem } from '../progression/talentRules.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';

export const TalentUI = {
  isOpen: false, root: null, message: '', ownPause: false,
  init() {
    this.root = document.createElement('div'); this.root.id = 'talent-menu'; this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'talent-title'); document.body.appendChild(this.root);
    this.root.addEventListener('click', e => {
      if (e.target.closest('[data-talent-close]')) { this.close(); return; }
      const b = e.target.closest('button[data-learn]'); if (!b || b.disabled) return;
      this.message = Talents.learn(b.dataset.learn).message; this.render();
      (this.root.querySelector(`button[data-learn="${b.dataset.learn}"]:not(:disabled)`) ?? this.root.querySelector('[data-talent-close]')).focus();
    });
    this.root.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return; e.preventDefault(); e.stopPropagation();
      const buttons = [...this.root.querySelectorAll('button:not(:disabled)')], i = buttons.indexOf(document.activeElement);
      buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
    });
  },
  open() {
    if (this.isOpen || !ctx.started) return;
    this.isOpen = true; this.previousFocus = document.activeElement; this.message = '';
    this.ownPause = !ctx.paused; ctx.paused = true; releaseAllKeys(); audio.blip();
    this.render(); this.root.classList.add('show');
    (this.root.querySelector('button[data-learn]:not(:disabled)') ?? this.root.querySelector('[data-talent-close]')).focus();
  },
  close() {
    if (!this.isOpen) return; this.isOpen = false; this.root.classList.remove('show');
    if (this.ownPause) ctx.paused = false;                    // opened over the pause menu: it stays paused
    releaseAllKeys(); this.previousFocus?.focus?.();
  },
  key(code) { if (code === 'Escape') this.close(); },
  render() {
    const tree = Talents.tree(), level = ctx.player.level, rows = [...new Set(tree.talents.map(t => t.row))].sort((a, b) => a - b);
    const card = t => {
      const r = Talents.ranks[t.id] ?? 0, problem = learnProblem(tree, Talents.ranks, t.id, level), full = r >= t.max;
      const needs = t.needs.length ? `<small class="tl-needs">Needs ${t.needs.map(n => tree.talents.find(x => x.id === n).name).join(', ')}</small>` : '';
      const pips = Array.from({ length: t.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('');
      return `<div class="tl-card${r ? ' learned' : ''}${problem && !full ? ' locked' : ''}" data-talent="${t.id}">
        <div class="tl-body"><strong>${t.name}</strong><span class="tl-pips" aria-label="Rank ${r} of ${t.max}">${pips}</span>
          <small>${t.text}</small>${needs}</div>
        ${full ? '<span class="tl-done">Max ✓</span>' : `<button type="button" data-learn="${t.id}"${problem ? ` disabled title="${problem}"` : ''}>Learn${t.cost > 1 ? ` (${t.cost})` : ''}</button>`}
      </div>`;
    };
    this.root.innerHTML = `<div class="portal-panel talent-panel"><header><h2 id="talent-title">Talents</h2><button type="button" data-talent-close aria-label="Close">✕</button></header>
      <p>A point every two levels. <b class="tl-points">${Talents.available} to spend</b> (${Talents.spent} of ${Talents.earned} used). Old Bramble resets them for free.</p>
      <div class="tl-rows">${rows.map(row => `<div class="tl-row">${tree.talents.filter(t => t.row === row).map(card).join('')}</div>`).join('')}</div>
      <p class="home-message" role="status">${this.message || 'Each talent changes one of your abilities. Learn the top row first.'}</p>
      <p class="portal-foot">Esc closes the page.</p></div>`;
  },
};
