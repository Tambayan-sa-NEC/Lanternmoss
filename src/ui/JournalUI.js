/* JOURNAL SCREEN (#journal): J during play (remappable), Journal on the pause menu, or Journal on the title screen.
   Four tabs over the journal's data (src/gameplay/Journal.js) and adventure help:
     Achievements  every achievement (config/achievements.js) by group, with progress, reward and when it was earned,
                   and the lifetime totals
     Bestiary      a page per monster and boss (config/bestiary.js): its portrait (src/ui/monsterPortraits.js; a
                   silhouette until met), where it lives, how it attacks and how to beat it; its stats per planet,
                   its drops and how many you've defeated once you've beaten one
     Collection    every item, the ones found so far in colour
     Help          lasting first-time tips and the guided walk; seen/progress belongs to the adventure
   During play it pauses the world (unless the pause menu already has); on the title screen nothing is running. */
import { ACHIEVEMENTS, JOURNAL_STATS } from '../config/achievements.js';
import { BESTIARY_DROPS, BESTIARY_ENTRIES } from '../config/bestiary.js';
import { COMBAT } from '../config/combat.js';
import { ITEM_CATEGORIES, RARITIES } from '../config/items.js';
import { PLANETS } from '../config/planets.js';
import { scaleEnemyDef } from '../combat/enemyDefs.js';
import { ctx } from '../core/context.js';
import { bindKbd, is } from '../core/keybinds.js';
import { describeSummon } from '../gameplay/BossGate.js';
import { Journal } from '../gameplay/Journal.js';
import { BESTIARY_ORDER, isBoss, pageName, progress, statValue } from '../gameplay/journalRules.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { audio } from '../systems/AudioSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { icon } from './icons.js';
import { itemIconHtml } from './itemTooltip.js';
import { monsterPortrait } from './monsterPortraits.js';
import { helpHtml } from './help.js';

const TABS = { achievements: 'Achievements', bestiary: 'Bestiary', collection: 'Collection', help: 'Help' };
const GROUPS = ['Firsts', 'Counts', 'Challenges'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const when = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Planets a monster lives on (by roster), as indices. */
function homes(type) {
  const from = type === 'slimeling' ? 'slime' : type;
  return PLANETS.map((p, i) => (p.boss.type === type || p.roster.some(r => r.type === from) || (p.miniBosses ?? []).some(m => m.type === type) ? i : -1)).filter(i => i >= 0);
}
/** Damage as shown on a page: a monster's hit, or the range of a boss's attacks (a one-hit kill noted apart). */
function damageText(def) {
  if (def.damage) return `${Math.round(def.damage)}`;
  const hits = Object.values(def.attacks ?? {}).filter(a => a.damage).map(a => a.damage), lethal = hits.some(d => d >= 999), d = hits.filter(x => x < 999);
  if (!d.length) return def.heal ? `heals ${Math.round(def.heal)}` : '—';
  return `${Math.round(Math.min(...d))}–${Math.round(Math.max(...d))}${lethal ? ' (+ a one-hit kill)' : ''}`;
}
function portraitHtml(type, seen, cls = '') {
  const url = monsterPortrait(type);
  return url ? `<img class="pt${seen ? '' : ' unseen'} ${cls}" src="${url}" alt="">` : `<span class="pt glyph${seen ? '' : ' unseen'} ${cls}">${icon(isBoss(type) ? 'boss' : 'slash')}</span>`;
}

export const JournalUI = {
  isOpen: false, tab: 'achievements', page: null, ownPause: false, clearArmed: false, root: null,
  init() {
    const root = this.root = document.createElement('div'); root.id = 'journal';
    root.innerHTML = `<div class="jpanel"><div class="jhead"><h2>${icon('book')} Journal</h2><div class="jtabs">${Object.entries(TABS).map(([k, v]) =>
      `<button type="button" data-tab="${k}">${v}</button>`).join('')}</div><button type="button" class="jclose">✕</button></div>` +
      `<div class="jbody"></div><div class="jfoot"></div></div>`;
    document.body.appendChild(root);
    this.body = root.querySelector('.jbody'); this.foot = root.querySelector('.jfoot'); this.tabsEl = root.querySelector('.jtabs');
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-tab]'), p = e.target.closest('[data-page]');
      if (e.target.closest('.jclose')) this.close();
      else if (t) this.setTab(t.dataset.tab);
      else if (p) { this.page = p.dataset.page; audio.blip(); this.render(); }
      else if (e.target.closest('[data-clear]')) this.clearJournal();
    });
  },
  toggle(tab) { if (this.isOpen) this.close(); else this.open(tab); },
  open(tab = this.tab) {
    if (this.isOpen) return;
    this.isOpen = true; this.tab = tab; this.clearArmed = false; releaseAllKeys();
    this.ownPause = ctx.started && !ctx.paused; if (this.ownPause) { ctx.paused = true; audio.duck(true); }
    Journal.noteStart?.();
    this.root.classList.add('show'); audio.blip(); this.render();
  },
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; this.root.classList.remove('show');
    if (this.ownPause) { this.ownPause = false; ctx.paused = false; audio.duck(false); }
  },
  setTab(t) { this.tab = t; this.clearArmed = false; audio.blip(); this.render(); },
  key(code) {
    if (code === 'Escape' || is('journal', code)) { this.close(); return; }
    const tabs = Object.keys(TABS), i = tabs.indexOf(this.tab);
    if (code === 'ArrowRight' || code === 'KeyE') this.setTab(tabs[(i + 1) % tabs.length]);
    else if (code === 'ArrowLeft' || code === 'KeyQ') this.setTab(tabs[(i + tabs.length - 1) % tabs.length]);
    else if (this.tab === 'bestiary' && (code === 'ArrowDown' || code === 'ArrowUp' || code === 'KeyS' || code === 'KeyW')) {
      const k = BESTIARY_ORDER.indexOf(this.page), n = BESTIARY_ORDER.length, down = code === 'ArrowDown' || code === 'KeyS';
      this.page = BESTIARY_ORDER[(Math.max(0, k) + (down ? 1 : n - 1)) % n]; audio.blip(); this.render();
    }
  },
  clearJournal() {
    if (!this.clearArmed) { this.clearArmed = true; this.render(); return; }
    this.clearArmed = false; Journal.clear(); this.render();
  },

  render() {
    if (!this.isOpen) return;
    for (const b of this.tabsEl.children) b.classList.toggle('on', b.dataset.tab === this.tab);
    const scroll = this.body.querySelector('.jscroll')?.scrollTop ?? 0, same = this.body.dataset.tab === this.tab;
    this.body.dataset.tab = this.tab;
    this.body.innerHTML = this.tab === 'help' ? helpHtml() : this.tab === 'bestiary' ? this.bestiaryHtml() : this.tab === 'collection' ? this.collectionHtml() : this.achievementsHtml();
    if (same) { const s = this.body.querySelector('.jscroll'); if (s) s.scrollTop = scroll; }
    this.foot.innerHTML = (this.tab === 'help' ? `<span>Guide progress and seen tips are saved with your adventure.</span>` : `<span>Kept on this device across adventures.</span>` +
      `<button type="button" class="quiet" data-clear>${this.clearArmed ? 'Click again to erase the whole journal' : 'Start the journal over'}</button>`) +
      `<span>← → tabs${this.tab === 'bestiary' ? ' · ↑ ↓ pages' : ''} · ${bindKbd('journal')} or <kbd>Esc</kbd> to close</span>`;
  },

  achievementsHtml() {
    const j = Journal.data, done = ACHIEVEMENTS.filter(a => j.unlocked[a.id]).length;
    const card = a => {
      const p = progress(a, j), got = j.unlocked[a.id];
      return `<div class="ach${got ? ' done' : ''}"><span class="ic">${icon(a.icon)}</span><div class="tx"><b>${a.name}</b><small>${a.text}</small>` +
        (got ? `<span class="got">Earned ${when(got)}</span>` : p.need > 1 ? `<div class="abar"><i style="width:${(p.have / p.need) * 100}%"></i></div><span class="pr">${p.have} / ${p.need}</span>` : '') +
        `</div>${a.reward?.coins ? `<span class="rw">✦ ${a.reward.coins}</span>` : ''}</div>`;
    };
    const totals = Object.entries(JOURNAL_STATS).map(([k, label]) => `<div><b>${statValue(j, k)}</b><span>${label}</span></div>`).join('');
    return `<div class="jscroll"><div class="jsum"><div class="big"><b>${done}</b> / ${ACHIEVEMENTS.length}<span>achievements</span></div><div class="totals">${totals}</div></div>` +
      GROUPS.map(g => `<h3>${g}</h3><div class="ach-grid">${ACHIEVEMENTS.filter(a => a.group === g).map(card).join('')}</div>`).join('') + '</div>';
  },

  bestiaryHtml() {
    const j = Journal.data;
    if (!this.page) this.page = BESTIARY_ORDER.find(t => j.seen[t]) ?? BESTIARY_ORDER[0];
    const met = BESTIARY_ORDER.filter(t => j.seen[t]).length;
    const tiles = BESTIARY_ORDER.map(t => `<button type="button" class="bt${t === this.page ? ' sel' : ''}${isBoss(t) ? ' boss' : ''}" data-page="${t}">` +
      `${portraitHtml(t, j.seen[t])}<span>${j.seen[t] ? pageName(t) : '???'}</span>${j.defeated[t] ? `<em>×${j.defeated[t]}</em>` : ''}</button>`).join('');
    return `<div class="bst"><div class="bst-list jscroll"><div class="bst-count">${met} / ${BESTIARY_ORDER.length} met</div>${tiles}</div>` +
      `<div class="bst-page">${this.pageHtml(this.page)}</div></div>`;
  },
  pageHtml(type) {
    const j = Journal.data, seen = j.seen[type], beaten = j.defeated[type] ?? 0, base = COMBAT.enemies[type], e = BESTIARY_ENTRIES[type] ?? {};
    const where = homes(type);
    if (!seen) return `<div class="bp-top">${portraitHtml(type, false, 'big')}<div><h3>???</h3><div class="sub">${isBoss(type) ? 'A planet boss' : 'A monster'} you haven't met yet</div></div></div>
      <p class="dim">Explore ${where.length ? 'further' : 'more'} to find it. Its page fills in when you meet it, and again when you beat one.</p>`;
    const list = (title, rows) => `<h4>${title}</h4><ul>${rows.join('')}</ul>`;
    const stats = where.map(i => { const d = scaleEnemyDef(base, PLANETS[i].scale);
      return `<tr><td>${PLANETS[i].name}</td><td>${Math.round(d.hp)}</td><td>${damageText(d)}</td><td>${(d.speed ?? 0).toFixed(1)}</td><td>${d.xp}</td></tr>`; }).join('');
    return `<div class="bp-top">${portraitHtml(type, true, 'big')}<div><h3>${pageName(type)}</h3><div class="sub">${isBoss(type) ? `${esc(base.name.split(', ')[1] ?? 'Boss')} · planet boss` : base.miniBoss ? `${esc(base.name.split(', ')[1] ?? '')} · mini boss` : 'Monster'}</div>
        <div class="where">${e.from ? e.from + ' ' : ''}${where.length ? `Found on ${where.map(i => PLANETS[i].name).join(', ')}` : ''}</div>
        <div class="kills">${beaten ? `Defeated <b>${beaten}</b>×` : 'Not defeated yet'}</div></div></div>
      <p class="bl">${e.blurb ?? ''}</p>
      ${e.lore ? `<h4>Lore</h4><p class="bl">${e.lore}</p>` : ''}
      ${isBoss(type) ? list('To wake it', describeSummon(PLANETS[where[0]]?.boss.summon).map(t => `<li>${t}</li>`)) : ''}
      ${list('How it fights', (e.attacks ?? []).map(([n, t]) => `<li><b>${n}</b> ${t}</li>`))}
      ${list('How to beat it', (e.counters ?? []).map(t => `<li>${t}</li>`))}
      ${beaten ? `<h4>Stats</h4><table class="bst-stats"><tr><th>Planet</th><th>Health</th><th>Damage</th><th>Speed</th><th>XP</th></tr>${stats}</table>
        <h4>Drops</h4><p>${isBoss(type) ? BESTIARY_DROPS.boss : base.miniBoss ? BESTIARY_DROPS.miniBoss : BESTIARY_DROPS.monster}${type === 'slime' ? ' And two slimelings.' : ''}</p>`
      : '<p class="dim">Defeat one to note its stats and what it drops.</p>'}`;
  },

  collectionHtml() {
    const j = Journal.data, all = itemRegistry.all(), found = all.filter(d => j.found[d.id]).length;
    const tile = d => j.found[d.id]
      ? `<div class="ci" title="${esc(d.name)}: ${esc(d.description)}" style="--rc:${RARITIES[d.rarity ?? 'common'].color}">${itemIconHtml(d)}<span>${esc(d.name)}</span>${j.legendary[d.id] ? `<em title="Found at Legendary rarity">${icon('gem')}</em>` : ''}</div>`
      : `<div class="ci unfound"><span class="q">?</span><span>???</span></div>`;
    return `<div class="jscroll"><div class="jsum"><div class="big"><b>${found}</b> / ${all.length}<span>items found</span></div>
      <p class="dim">Everything that has been in your bag. Gear found at Legendary rarity wears a gem.</p></div>` +
      Object.entries(ITEM_CATEGORIES).map(([c, label]) => { const items = all.filter(d => d.category === c); return items.length ? `<h3>${label}</h3><div class="col-grid">${items.map(tile).join('')}</div>` : ''; }).join('') + '</div>';
  },
};
