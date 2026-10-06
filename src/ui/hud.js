/* Combat HUD: HP / resource / XP bars (each with a damage trail that drains after a hit), the level badge, the status
   row (buffs, Guard, regeneration), the ability bar (drawn icons, cooldown sweep + seconds left, a flash when a move is
   ready again, the ultimate in its own gold slot, a hover tooltip), floating enemy health bars, the boss bar (phase
   ticks, damage trail, a flash when a phase starts), the lock-on reticle, the collapsible controls panel and UI scale,
   and the hotbar (keys 1-9: src/gameplay/hotbar.js).
   Layout: vitals (health, level, mana / stamina / focus, XP) above the hotbar at the bottom centre, skills on the
   lower right, the pet card on the lower left (ui/petHud.js), the boss bar at the top. */
import * as THREE from 'three';
import { ABILITY_TEXT, CHARACTERS } from '../config/characters.js';
import { HOTBAR_KEYS, keyLabel } from '../config/controls.js';
import { HOTBAR, RARITIES } from '../config/items.js';
import { PLANET_RADIUS as R } from '../config/game.js';
import { ctx } from '../core/context.js';
import { setSetting, settings } from '../core/settings.js';
import { aim } from '../combat/aiming.js';
import { ENGAGED } from '../entities/enemies/states.js';
import { buffs } from '../gameplay/buffs.js';
import { bindKbd, onBindsChange } from '../core/keybinds.js';
import { Hotbar } from '../gameplay/hotbar.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { itemRarity } from '../items/gear.js';
import { damageMultiplier, xpToNext } from '../progression/leveling.js';
import { camera } from '../render/scene.js';
import { clamp } from '../utils/math.js';
import { dom, flashEl } from './dom.js';
import { icon } from './icons.js';
import { itemIconHtml } from './itemTooltip.js';

const HUD = {
  trailHold: 0.45,      // seconds a bar's damage trail waits before draining
  trailRate: 0.8,       // ...then drains this fraction of the bar per second
  lowHp: 0.3,           // below this share of max HP the bar pulses and the screen edges glow red
  hintAutoHide: 25,     // seconds of play before the controls panel folds away (H toggles it)
};

// ---------------------------------------------------------------- bars
function makeBar(el) {
  return { el, fill: el.querySelector('i'), lag: el.querySelector('b'), label: el.querySelector('em'), value: el.querySelector('strong'), k: 1, trail: 1, hold: 0, text: '' };
}
/** Sets a bar to frac (0..1). A loss leaves a pale trail that holds for a moment, then drains down to the new value. */
function setBar(b, frac, text, dt) {
  frac = clamp(frac, 0, 1);
  if (frac < b.k - 1e-4) b.hold = HUD.trailHold;
  b.k = frac; b.fill.style.transform = `scaleX(${frac})`;
  if (b.lag) {
    if (frac >= b.trail) b.trail = frac; else if (b.hold > 0) b.hold -= dt; else b.trail = Math.max(frac, b.trail - HUD.trailRate * dt);
    b.lag.style.transform = `scaleX(${b.trail})`;
  }
  if (text !== b.text) { b.text = text; b.value.textContent = text; }
}
const bars = { hp: makeBar(dom.hpBar), mp: makeBar(dom.mpBar), xp: makeBar(dom.xpBar) };
const boss = { el: dom.bossBar, fill: dom.bossFill, lag: dom.bossLag, value: dom.bossPct, k: 1, trail: 1, hold: 0, text: '', ref: null, phase: 0 };
let shownLevel = 0, shownRes = '';

// ---------------------------------------------------------------- ability bar + tooltip
let slots = {};

export function buildSpellBar(abilities) {
  dom.spells.innerHTML = ''; slots = {}; hideTip();
  for (const [id, s] of Object.entries(abilities)) {
    const el = document.createElement('div'); el.className = s.ult ? 'slot ult' : 'slot';
    el.innerHTML = `<kbd>${s.label}</kbd><div class="ico" style="--c:#${new THREE.Color(s.color).getHexString()}">${icon(id)}</div>` +
      `<div class="nm">${s.name}</div><div class="mc">${s.cost}</div><div class="cd"></div><div class="cdt"></div>`;
    el.addEventListener('mouseenter', () => showTip(id, s, el)); el.addEventListener('mouseleave', hideTip);
    dom.spells.appendChild(el); slots[id] = { el, cd: el.querySelector('.cd'), cdt: el.querySelector('.cdt'), was: 0, text: '' };
  }
}
// ---------------------------------------------------------------- hotbar
let hot = [];
export function buildHotbar() {
  dom.hotbar.innerHTML = '';
  hot = HOTBAR_KEYS.slice(0, HOTBAR.size).map((code, i) => {
    const el = document.createElement('div'); el.className = 'hslot';
    el.innerHTML = `<kbd>${keyLabel(code)}</kbd><div class="hi"></div><span class="hn"></span><div class="cd"></div>`;
    el.addEventListener('click', () => Hotbar.select(i)); dom.hotbar.appendChild(el);
    return { el, hi: el.querySelector('.hi'), hn: el.querySelector('.hn'), cd: el.querySelector('.cd'), key: '' };
  });
}
let heldKey = '';
function updateHotbar() {
  const inv = ctx.player.inventory;
  hot.forEach((h, i) => {
    const s = inv.getSlot(i), def = s && itemRegistry.get(s.itemId), key = s ? `${s.itemId}|${s.quantity}|${s.props?.rarity ?? ''}` : '';
    if (key !== h.key) {
      h.key = key; h.el.classList.toggle('filled', !!s);
      h.hi.innerHTML = def ? itemIconHtml(def) : ''; h.hn.textContent = s && s.quantity > 1 ? s.quantity : '';
      const r = def && itemRarity(def, s.props); h.el.style.setProperty('--rc', r && r !== 'common' ? RARITIES[r].color : 'transparent');
      h.el.title = def ? def.name : '';
    }
    h.el.classList.toggle('held', i === Hotbar.selected);
    h.cd.style.transform = `scaleY(${i === Hotbar.selected ? Hotbar.cd / HOTBAR.useCooldown : 0})`;
  });
  // the held item's name, for a moment after it changes (like Minecraft)
  const def = Hotbar.heldDef(), s = Hotbar.held(), name = def ? def.name : '', k = `${Hotbar.selected}|${name}`;
  if (k !== heldKey) { heldKey = k; Hotbar.changedAt = ctx.time; dom.heldName.textContent = name; dom.heldName.style.color = def ? RARITIES[itemRarity(def, s.props)].color : ''; }
  dom.heldName.classList.toggle('show', !!def && ctx.time - Hotbar.changedAt < 2.2);
}

// ---------------------------------------------------------------- the controls panel (top left), from the live keybinds
let hintAbilities = null;
const join = list => list.map(([k, what]) => `<span class="hk">${k} ${what}</span>`).join(' ');
function renderHint() {
  const a = hintAbilities ? Object.values(hintAbilities) : [];
  dom.hintKeys.innerHTML =
    `<div>${join([[`${bindKbd('moveForward')}${bindKbd('moveLeft')}${bindKbd('moveBack')}${bindKbd('moveRight')}`, 'move'], [bindKbd('sprint'), 'sprint'], [bindKbd('jump'), 'jump']])}</div>` +
    `<div>${join([[bindKbd('interact'), 'talk / use'], [bindKbd('decline'), 'decline'], [bindKbd('bag'), 'bag'], ['<kbd>1</kbd>–<kbd>9</kbd>', 'hold item'], ['<kbd>RMB</kbd>', 'use it']])}</div>` +
    `<div>${join([[bindKbd('petCommand'), 'pet command'], [bindKbd('petAbility'), 'pet ability'], [bindKbd('mute'), 'mute'], [bindKbd('heroSelect'), 'change hero']])}</div>` +
    `<div>${join([['<kbd>Drag</kbd>', 'camera'], ['<kbd>Wheel</kbd>', 'zoom']])}</div>` +
    (a.length ? `<div class="hs">${join(a.map(s => [`${s.mouse ? '<kbd>Click</kbd>/' : ''}<kbd>${s.label}</kbd>`, s.name.toLowerCase()]))}</div>` : '');
  dom.hintHide.innerHTML = `${bindKbd('toggleHint')} hide`; dom.hintMini.innerHTML = `${bindKbd('toggleHint')} Controls`;
}
/** The hero's abilities for the controls panel. */
export function setSkillHint(abilities) { hintAbilities = abilities; renderHint(); }
onBindsChange(() => { renderHint(); if (hintAbilities) buildSpellBar(hintAbilities); });
renderHint();

const titleCase = w => w.charAt(0) + w.slice(1).toLowerCase();
/** Tooltip body: what the ability does, its key, numbers at the hero's current level, cost and cooldown. */
function tipHtml(id, s) {
  const P = ctx.player, res = titleCase(CHARACTERS[P.charId].resource), dmg = v => Math.round(v * damageMultiplier(P.level)), stats = [];
  if (s.damage) stats.push(s.tick ? `${dmg(s.damage)} damage every ${s.tick}s for ${s.duration}s` : `${dmg(s.damage)} damage`);
  if (s.target) stats.push(`${s.radius} radius, up to ${s.range} away`);
  else if (s.radius) stats.push(`${s.radius} radius`);
  if (s.stun) stats.push(`stuns ${s.stun}s`);
  if (s.slow) stats.push(`slows ${Math.round(s.slow * 100)}%`);
  if (s.reduction) stats.push(`-${Math.round(s.reduction * 100)}% damage for ${s.duration}s`);
  if (s.invuln) stats.push(`${s.invuln}s invulnerable`);
  return `<h4>${s.name}${s.ult ? '<span class="u">Ultimate</span>' : ''}</h4>` +
    `<div class="k"><kbd>${s.label}</kbd>${s.mouse ? ' or click' : ''}${s.target ? ', then click a spot' : ''}</div>` +
    `<p>${ABILITY_TEXT[id] ?? ''}</p>${stats.length ? `<div class="st">${stats.join(' · ')}</div>` : ''}` +
    `<div class="cc"><span class="cost">${s.cost} ${res}</span><span>${s.cooldown}s cooldown</span></div>`;
}
function showTip(id, s, el) {
  const t = dom.tip; t.innerHTML = tipHtml(id, s); t.dataset.res = CHARACTERS[ctx.player.charId].resource; t.style.display = 'block';
  const r = el.getBoundingClientRect(), w = t.offsetWidth || 240;
  t.style.left = clamp(r.left + r.width / 2, w / 2 + 8, innerWidth - w / 2 - 8) + 'px'; t.style.top = (r.top - 10) + 'px';
}
function hideTip() { dom.tip.style.display = 'none'; }

export function flashSlot(id, cls) { if (slots[id]) flashEl(slots[id].el, cls); }
export function flashManaBar() { flashEl(bars.mp.el, 'flash'); }
/** Red vignette pulse + HP bar shake when the hero takes a hit. */
export function showPlayerHurt() {
  dom.hurt.style.opacity = 1; setTimeout(() => { dom.hurt.style.opacity = 0; }, 90);
  flashEl(bars.hp.el, 'flash');
}

// ---------------------------------------------------------------- status row
/** left(P) = seconds remaining (0 = inactive); timeless statuses use active(P) instead. max is learned when it starts. */
const STATUSES = [
  { id: 'moon', name: 'Moon-Hop', left: () => buffs.moon },
  { id: 'feather', name: 'Feather-Step', left: () => buffs.feather },
  { id: 'howl', name: 'Howl (+damage)', left: () => buffs.howl },
  { id: 'guard', name: 'Guard', left: P => P.guardT },
  { id: 'regen', name: 'Regenerating', active: P => !P.dead && P.hp < P.stats.maxHp && ctx.time - P.lastHurt > P.stats.hpRegenDelay },
];
for (const st of STATUSES) {
  st.el = document.createElement('div'); st.el.className = `st ${st.id}`; st.el.title = st.name;
  st.el.innerHTML = `${icon(st.id)}<span></span><i></i>`; st.text = st.el.querySelector('span'); st.bar = st.el.querySelector('i');
  st.max = 0; st.prev = 0; st.shown = ''; dom.status.appendChild(st.el);
}
function updateStatus(P) {
  for (const st of STATUSES) {
    const left = st.left ? Math.max(0, st.left(P)) : 0, on = st.left ? left > 0 : st.active(P);
    if (left > st.prev + 0.05) st.max = left;                                   // (re)started: remember its full length
    st.prev = left; st.el.style.display = on ? 'flex' : 'none';
    if (!on || !st.left) continue;
    const txt = `${Math.ceil(left)}s`; if (txt !== st.shown) { st.shown = txt; st.text.textContent = txt; }
    st.bar.style.transform = `scaleX(${st.max ? left / st.max : 0})`;
  }
}

// ---------------------------------------------------------------- screen placement
const _oc = new THREE.Vector3(), _tv = new THREE.Vector3(), _tv2 = new THREE.Vector3();
function occludedByPlanet(p) {
  const c = camera.position; _oc.copy(p).sub(c); const t = clamp(-c.dot(_oc) / _oc.lengthSq(), 0, 1);
  return _oc.multiplyScalar(t).add(c).length() < R - 0.6;
}
/** Screen pixels of world point p, or null when it is off-screen (beyond `margin` in NDC) or behind the planet. */
export function toScreen(p, margin = 1.1, out = { x: 0, y: 0 }) {
  _tv.copy(p).project(camera);
  if (_tv.z > 1 || Math.abs(_tv.x) > margin || Math.abs(_tv.y) > margin || occludedByPlanet(p)) return null;
  out.x = (_tv.x * 0.5 + 0.5) * innerWidth; out.y = (-_tv.y * 0.5 + 0.5) * innerHeight; return out;
}
const _sp = { x: 0, y: 0 };
/** Positions a fixed element over world point p; false when p is off-screen or behind the planet. */
function screenPos(p, el) {
  if (!toScreen(p, 1.1, _sp)) return false;
  el.style.left = _sp.x + 'px'; el.style.top = _sp.y + 'px'; return true;
}

// ---------------------------------------------------------------- boss bar
/** Whose big bar shows: the planet boss while it fights or the hero is near its lair, else a mini boss (hydra,
    basilisk) that's fighting or close by. */
function barTarget() {
  const P = ctx.player, b = ctx.boss;
  if (b && b.alive && !b.dormant && (ENGAGED.has(b.state) || b.pos.distanceTo(P.pos) < 24)) return b;
  let best = null, bd = 20;
  for (const e of ctx.enemies) {
    if (!e.def.miniBoss || !e.alive) continue;
    const d = e.pos.distanceTo(P.pos), k = ENGAGED.has(e.state) ? d - 100 : d;     // a fighting one wins
    if (k < bd) { bd = k; best = e; }
  }
  return best;
}
/** The boss's big health bar. Ticks mark its phase thresholds. */
function updateBossBar(dt) {
  const b = barTarget(), show = !!b;
  dom.bossBar.style.display = show ? 'block' : 'none'; document.body.classList.toggle('bossfight', show);
  if (!show) return;
  if (b !== boss.ref) {                                                        // a new boss: lay out its phase ticks
    boss.ref = b; boss.phase = b.bossPhase; boss.k = boss.trail = b.hp / b.def.hp;
    dom.bossTicks.innerHTML = b.def.phases.slice(1).map(ph => `<u style="left:${ph.below * 100}%"></u>`).join('');
  }
  const frac = Math.max(0, b.hp / b.def.hp), phase = b.def.phases[b.bossPhase];
  if (b.bossPhase !== boss.phase) { boss.phase = b.bossPhase; flashEl(dom.bossBar, 'phase'); }
  const name = phase?.title ? `${b.def.name} · ${phase.title}` : b.def.name;
  if (dom.bossName.textContent !== name) dom.bossName.textContent = name;
  setBar(boss, frac, `${Math.ceil(frac * 100)}%`, dt);
  b.def.phases.slice(1).forEach((ph, i) => dom.bossTicks.children[i]?.classList.toggle('done', frac <= ph.below));
  dom.bossBar.classList.toggle('enraged', b.bossPhase >= b.def.phases.length - 1 && b.def.phases.length > 1);
}

// ---------------------------------------------------------------- controls panel + UI scale
let hintMode = 'auto', hintT = 0;       // 'auto' folds the panel after a while; once H is pressed the player decides
export function toggleHint() { hintMode = 'manual'; dom.hint.classList.toggle('collapsed'); }
function updateHint(dt) {
  if (hintMode !== 'auto' || !ctx.started) return;
  if ((hintT += dt) > HUD.hintAutoHide) { hintMode = 'manual'; dom.hint.classList.add('collapsed'); }
}

/** HUD size = fitted to the window (smaller on small screens, larger on big ones) x the HUD-size setting. */
export function applyUiScale() {
  const fit = clamp(Math.min(innerWidth / 1280, innerHeight / 720), 0.75, 1.3);
  document.documentElement.style.setProperty('--ui', (fit * settings.uiScale / 100).toFixed(3));
}
/** Sets the HUD-size setting (1 = 100%); saved with the other settings. */
export function setUiScale(s) { setSetting('uiScale', s * 100); applyUiScale(); }
applyUiScale();

// ---------------------------------------------------------------- per frame
export function updateCombatHud(dt, spellState, aimTarget) {
  const P = ctx.player, C = P.stats, hero = CHARACTERS[P.charId], abilities = hero.abilities;
  if (shownRes !== hero.resource) { shownRes = hero.resource; dom.combat.dataset.res = hero.resource; bars.mp.label.textContent = titleCase(hero.resource); }
  setBar(bars.hp, P.hp / C.maxHp, `${Math.ceil(P.hp)} / ${C.maxHp}`, dt);
  setBar(bars.mp, P.mana / C.maxMana, `${Math.floor(P.mana)} / ${C.maxMana}`, dt);
  const need = xpToNext(P.level);
  setBar(bars.xp, need ? P.xp / need : 1, need ? `${P.xp} / ${need}` : 'MAX', dt);
  updateHotbar();
  dom.combat.classList.toggle('talking', dom.dialog.classList.contains('show'));   // the dialogue box takes the bottom centre
  if (shownLevel !== P.level) { if (shownLevel) flashEl(dom.level.parentElement, 'pop'); shownLevel = P.level; dom.level.textContent = P.level; }
  const low = !P.dead && P.hp / C.maxHp < HUD.lowHp;
  bars.hp.el.classList.toggle('low', low); dom.lowHp.classList.toggle('on', low);
  updateStatus(P);
  for (const [id, s] of Object.entries(abilities)) {
    const sl = slots[id], left = spellState.cd[id];
    sl.cd.style.transform = `scaleY(${left / s.cooldown})`; sl.el.classList.toggle('nomana', P.mana < s.cost);
    const text = left > 0.05 && s.cooldown >= 1.5 ? (left < 1 ? left.toFixed(1) : `${Math.ceil(left)}`) : '';
    if (text !== sl.text) { sl.text = text; sl.cdt.textContent = text; }
    if (sl.was > 0 && left <= 0 && s.cooldown >= 1.5) flashEl(sl.el, 'ready');      // back off cooldown
    sl.was = left; sl.el.classList.toggle('aiming', aim.id === id);
    if (s.ult) sl.el.classList.toggle('charged', left <= 0 && P.mana >= s.cost);    // the ultimate glows when it's ready
  }
  for (const e of ctx.enemies) {
    let show = e.alive && !e.hidden && e !== ctx.boss && !e.def.miniBoss && (e.hp < e.def.hp || ENGAGED.has(e.state)) && e.pos.distanceTo(camera.position) < 32;
    if (show) show = screenPos(_tv2.copy(e.pos).addScaledVector(e.up, e.hover + e.height + 0.45), e.bar);
    e.bar.style.display = show ? 'block' : 'none';
    if (show) { e.barFill.style.transform = `scaleX(${Math.max(0, e.hp / e.def.hp)})`; e.bar.classList.toggle('marked', e.markT > 0); e.bar.classList.toggle('shielded', e.shieldT > 0); }
  }
  updateBossBar(dt);
  document.body.classList.toggle('petrified', P.petrifyT > 0);
  updateHint(dt);
  const showRet = aimTarget && screenPos(_tv2.copy(aimTarget.center()), dom.reticle);
  dom.reticle.style.display = showRet ? 'block' : 'none';
}
