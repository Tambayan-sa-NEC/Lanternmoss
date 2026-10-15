/* BOUNTY BOARD window (#bounty-menu, TODO 34): the day's tasks on this planet's board (src/gameplay/Bounties.js) with
   their progress and reward, and a Claim button once one is done. Opened with E at the board; the world pauses while it's
   open, like the cottage menu. Esc or ✕ closes it. */
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { Bounties } from '../gameplay/Bounties.js';
import { itemLabel } from '../gameplay/bountyRules.js';
import { dayClock } from '../gameplay/dayClock.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { icon } from './icons.js';

const ICON = { defeat: 'slash', bring: 'leaf', fish: 'fish', harvest: 'sprout' };

export const BountyUI = {
  isOpen: false, root: null, message: '',
  init() {
    this.root = document.createElement('div'); this.root.id = 'bounty-menu'; this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'bounty-title'); document.body.appendChild(this.root);
    this.root.addEventListener('click', e => {
      if (e.target.closest('[data-bounty-close]')) { this.close(); return; }
      const b = e.target.closest('button[data-claim]'); if (!b || b.disabled) return;
      this.message = Bounties.claim(+b.dataset.claim).message; this.render(); this.root.querySelector('[data-bounty-close]').focus();
    });
    this.root.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return; e.preventDefault(); e.stopPropagation();
      const buttons = [...this.root.querySelectorAll('button:not(:disabled)')], i = buttons.indexOf(document.activeElement);
      buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
    });
    Bounties.onOpen = () => this.open();
  },
  open() {
    if (this.isOpen || ctx.paused || ctx.inventoryOpen) return;
    this.isOpen = true; this.previousFocus = document.activeElement; this.message = ''; ctx.paused = true; releaseAllKeys(); audio.duck(true); audio.blip();
    this.render(); this.root.classList.add('show'); (this.root.querySelector('button[data-claim]:not(:disabled)') ?? this.root.querySelector('[data-bounty-close]')).focus();
  },
  close() {
    if (!this.isOpen) return; this.isOpen = false; this.root.classList.remove('show'); ctx.paused = false; audio.duck(false);
    releaseAllKeys(); this.previousFocus?.focus?.();
  },
  key(code) { if (code === 'Escape') this.close(); },
  render() {
    const cards = Bounties.list.map((b, i) => {
      const p = Bounties.progress(i), claimed = Bounties.state.claimed[i], r = b.reward;
      const reward = [`${r.coins} ✦`, ...r.items.map(([id, n]) => `${n}× ${itemLabel(id)}`), ...(r.gear ? ['a rare piece of gear'] : [])].join(' · ');
      return `<div class="bounty-card${claimed ? ' claimed' : p.done ? ' ready' : ''}" data-bounty="${i}">
        <span class="bounty-icon" aria-hidden="true">${icon(ICON[b.kind])}</span>
        <div class="bounty-body"><strong>${b.title}</strong>
          <div class="bounty-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.need}" aria-valuenow="${p.have}"><i style="width:${(p.have / p.need) * 100}%"></i><span>${p.have} / ${p.need}</span></div>
          <small>Reward: ${reward}</small></div>
        ${claimed ? '<span class="bounty-done">Claimed ✓</span>' : `<button type="button" data-claim="${i}"${p.done ? '' : ' disabled'}>${b.kind === 'bring' ? 'Hand over' : 'Claim'}</button>`}
      </div>`;
    }).join('');
    this.root.innerHTML = `<div class="portal-panel bounty-panel"><header><h2 id="bounty-title">Bounty board · ${PLANETS[ctx.planet].name}</h2><button type="button" data-bounty-close aria-label="Close">✕</button></header>
      <p>Today's small jobs for the village (day ${dayClock.day}). A new set goes up each new day.</p>
      <div class="bounty-list">${cards || '<p>Nothing posted here today.</p>'}</div>
      <p class="home-message" role="status">${this.message || 'Defeats, catches and harvests here count from when a job is posted; bring the items with you to hand them over.'}</p>
      <p class="portal-foot">Esc closes the board.</p></div>`;
  },
};
