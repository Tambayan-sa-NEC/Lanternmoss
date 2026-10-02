/* Combat HUD: HP / mana / XP bars, the ability bar (cooldown sweep + seconds left, a flash when a move is ready again,
   the ultimate in its own gold slot), floating enemy health bars, the boss bar and the lock-on reticle. */
import * as THREE from 'three';
import { CHARACTERS } from '../config/characters.js';
import { PLANET_RADIUS as R } from '../config/game.js';
import { ctx } from '../core/context.js';
import { aim } from '../combat/aiming.js';
import { ENGAGED } from '../entities/enemies/states.js';
import { xpToNext } from '../progression/leveling.js';
import { camera } from '../render/scene.js';
import { clamp } from '../utils/math.js';
import { dom, flashEl } from './dom.js';

const bars = {};
for (const k of ['hp', 'mp', 'xp']) { const el = dom[k + 'Bar']; bars[k] = { el, fill: el.querySelector('i'), text: el.querySelector('span') }; }
let slots = {};

export function buildSpellBar(abilities) {
  dom.spells.innerHTML = ''; slots = {};
  for (const [id, s] of Object.entries(abilities)) {
    const el = document.createElement('div'); el.className = s.ult ? 'slot ult' : 'slot';
    el.innerHTML = `<kbd>${s.label}</kbd><div class="ico" style="background:#${new THREE.Color(s.color).getHexString()}"></div>` +
      `<div class="nm">${s.name}</div><div class="mc">${s.cost}</div><div class="cd"></div><div class="cdt"></div>`;
    dom.spells.appendChild(el); slots[id] = { el, cd: el.querySelector('.cd'), cdt: el.querySelector('.cdt'), was: 0, text: '' };
  }
}
export function setSkillHint(html) { dom.hintSkills.innerHTML = html; }

export function flashSlot(id, cls) { flashEl(slots[id].el, cls); }
export function flashManaBar() { flashEl(bars.mp.el, 'flash'); }
/** Red vignette pulse + HP bar shake when the hero takes a hit. */
export function showPlayerHurt() {
  dom.hurt.style.opacity = 1; setTimeout(() => { dom.hurt.style.opacity = 0; }, 90);
  flashEl(bars.hp.el, 'flash');
}

const _oc = new THREE.Vector3(), _tv = new THREE.Vector3(), _tv2 = new THREE.Vector3();
function occludedByPlanet(p) {
  const c = camera.position; _oc.copy(p).sub(c); const t = clamp(-c.dot(_oc) / _oc.lengthSq(), 0, 1);
  return _oc.multiplyScalar(t).add(c).length() < R - 0.6;
}
/** Positions a fixed element over world point p; false when p is off-screen or behind the planet. */
function screenPos(p, el) {
  _tv.copy(p).project(camera);
  if (_tv.z > 1 || Math.abs(_tv.x) > 1.1 || Math.abs(_tv.y) > 1.1 || occludedByPlanet(p)) return false;
  el.style.left = ((_tv.x * 0.5 + 0.5) * innerWidth) + 'px'; el.style.top = ((-_tv.y * 0.5 + 0.5) * innerHeight) + 'px'; return true;
}

/** The planet boss's big health bar: shown while it fights or the hero is near its lair. */
function updateBossBar() {
  const b = ctx.boss, show = !!b && b.alive && (ENGAGED.has(b.state) || b.pos.distanceTo(ctx.player.pos) < 24);
  dom.bossBar.style.display = show ? 'block' : 'none';
  if (!show) return;
  const phase = b.def.phases[b.bossPhase]?.title;
  dom.bossName.textContent = phase ? `${b.def.name} · ${phase}` : b.def.name;
  dom.bossFill.style.transform = `scaleX(${Math.max(0, b.hp / b.def.hp)})`;
  dom.bossBar.classList.toggle('enraged', b.bossPhase >= b.def.phases.length - 1);
}

export function updateCombatHud(spellState, aimTarget) {
  const P = ctx.player, C = P.stats, abilities = CHARACTERS[P.charId].abilities;
  bars.hp.fill.style.transform = `scaleX(${P.hp / C.maxHp})`; bars.hp.text.textContent = `HP ${Math.ceil(P.hp)} / ${C.maxHp}`;
  bars.mp.fill.style.transform = `scaleX(${P.mana / C.maxMana})`; bars.mp.text.textContent = `${CHARACTERS[P.charId].resource} ${Math.floor(P.mana)} / ${C.maxMana}`;
  const need = xpToNext(P.level);
  bars.xp.fill.style.transform = `scaleX(${need ? P.xp / need : 1})`; bars.xp.text.textContent = need ? `LV ${P.level} · XP ${P.xp} / ${need}` : `LV ${P.level} · MAX`;
  for (const [id, s] of Object.entries(abilities)) {
    const sl = slots[id], left = spellState.cd[id];
    sl.cd.style.transform = `scaleY(${left / s.cooldown})`; sl.el.classList.toggle('nomana', P.mana < s.cost);
    const text = left > 0.05 && s.cooldown >= 1.5 ? (left < 1 ? left.toFixed(1) : `${Math.ceil(left)}`) : '';
    if (text !== sl.text) { sl.text = text; sl.cdt.textContent = text; }
    if (sl.was > 0 && left <= 0 && s.cooldown >= 1.5) flashEl(sl.el, 'ready');      // back off cooldown
    sl.was = left; sl.el.classList.toggle('aiming', aim.id === id);
  }
  for (const e of ctx.enemies) {
    let show = e.alive && !e.hidden && e !== ctx.boss && (e.hp < e.def.hp || ENGAGED.has(e.state)) && e.pos.distanceTo(camera.position) < 32;
    if (show) show = screenPos(_tv2.copy(e.pos).addScaledVector(e.up, e.hover + e.height + 0.45), e.bar);
    e.bar.style.display = show ? 'block' : 'none';
    if (show) { e.barFill.style.transform = `scaleX(${Math.max(0, e.hp / e.def.hp)})`; e.bar.classList.toggle('marked', e.markT > 0); e.bar.classList.toggle('shielded', e.shieldT > 0); }
  }
  updateBossBar();
  const showRet = aimTarget && screenPos(_tv2.copy(aimTarget.center()), dom.reticle);
  dom.reticle.style.display = showRet ? 'block' : 'none';
}
