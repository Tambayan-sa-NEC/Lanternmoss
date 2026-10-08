/* What a pet looks like on the menus: its card in a picker list and its detail panel (stats, ability, how to find a
   locked one). Shared by the pet step of character select (src/ui/CharacterSelect.js) and the pet menu during play
   (src/ui/PetMenu.js). Everything comes from PETS (config/pets.js) and the live Pets state. */
import { PET_COMMANDS, PETS } from '../config/pets.js';
import { COMBAT } from '../config/combat.js';
import { ctx } from '../core/context.js';
import { bindKbd } from '../core/keybinds.js';
import { Pets } from '../gameplay/Pets.js';
import { icon } from './icons.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const BODY = { fly: 'Flies at your shoulder', walk: 'Trots at your side' };
/** The extra things a pet's strike does, from its attack options. */
function strikeEffects(a) {
  const out = [];
  if (a.mark) out.push(`marks the monster (+${Math.round(COMBAT.mark.bonus * 100)}% damage from you, ${a.mark}s)`);
  if (a.slow) out.push(`slows it ${Math.round(a.slow * 100)}% for ${a.slowTime}s`);
  if (a.stagger) out.push('interrupts wind-ups');
  if (a.knock) out.push('knocks it back');
  return out;
}

/** One pet's card for a picker list (data-pet = its id). sel = the one being looked at; out = the one with you. */
export function petCardHtml(id, { sel = false } = {}) {
  const p = PETS[id], open = Pets.unlocked.has(id), out = open && Pets.id === id;
  return `<button type="button" class="card pet-card${sel ? ' sel' : ''}${open ? '' : ' locked'}${out ? ' out' : ''}" data-pet="${id}" style="--pc:${p.color}">` +
    `<div class="pc-face">${open ? icon(id) : '?'}</div><div class="pk"><h3>${open ? esc(Pets.nameOf(id)) : '???'}</h3>` +
    `<div class="sub">${open ? `${p.name} · ${p.role}` : 'Not found yet'}</div></div>${out ? '<span class="with">with you</span>' : ''}</button>`;
}
export const petCardsHtml = sel => Object.keys(PETS).map(id => petCardHtml(id, { sel: id === sel })).join('');

/** The detail panel. opts.rename = a name field; opts.play = live health and the command buttons (the pet menu). */
export function petDetailHtml(id, { rename = true, play = false } = {}) {
  const p = PETS[id], open = Pets.unlocked.has(id), a = p.ability, out = open && Pets.id === id;
  if (!open) {
    return `<div class="hd"><div class="pc-face big" style="--pc:${p.color}">?</div><div><h3>A pet to find</h3><div class="sub">${p.role}</div></div></div>
      <p class="bl">Somewhere out there is a ${p.name.toLowerCase()} who'd love to come along.</p>
      <div class="find"><b>How to find them</b>${p.unlock.text}</div>`;
  }
  const name = rename ? `<input class="pet-name" data-rename="${id}" value="${esc(Pets.nameOf(id))}" maxlength="14" aria-label="Name" title="Click to rename">`
    : `<h3>${esc(Pets.nameOf(id))}</h3>`;
  const hp = Pets.maxHp(id), cur = out && Pets.hp !== null ? Math.ceil(Pets.hp) : hp;
  const health = play && out ? `<div class="pet-hp" title="${cur} / ${hp} HP"><i style="transform:scaleX(${cur / hp})"></i></div>` : '';
  const fx = strikeEffects(p.attack);
  const modes = play ? `<div class="pet-cmds"><b>Command</b>${Object.entries(PET_COMMANDS).map(([m, c]) =>
    `<button type="button" data-mode="${m}" class="${Pets.mode === m ? 'on' : ''}" title="${c.text}">${c.label}</button>`).join('')}` +
    `<small>${PET_COMMANDS[Pets.mode].text} · ${bindKbd('petCommand')} cycles</small></div>` : '';
  const status = play ? (out ? `<div class="pet-status">${Pets.fainted ? `Resting for ${Math.ceil(Pets.faintT)}s` : ctx.indoors ? 'Waiting for you outside' : 'With you'}</div>`
    : `<button type="button" class="take" data-take="${id}">Take ${esc(Pets.nameOf(id))} along</button>`) : '';
  return `<div class="hd"><div class="pc-face big" style="--pc:${p.color}">${icon(id)}</div><div class="nm">${name}<div class="sub">${p.name} · Lv ${Pets.level}</div>${health}</div></div>
    <div class="tags"><span class="role" style="--pc:${p.color}">${p.role}</span><span>${BODY[p.body]}</span></div>
    <p class="bl">${p.blurb}</p>
    <div class="vit"><span><b>${hp}</b> health</span><span><b>${Pets.damage(id)}</b> damage every ${p.attack.cooldown}s</span><span><b>${p.attack.range}m</b> reach</span></div>
    ${fx.length ? `<div class="fx">Its strike ${fx.join(', ')}.</div>` : ''}
    <div class="abl"><div class="ab ult"><span class="ic" style="--c:${p.color}">${icon(a.id)}</span>` +
    `<span class="tx"><b>${a.name}</b><em>${a.cooldown}s</em><small>${a.text}</small></span><span class="akeys">${bindKbd('petAbility')}</span></div></div>
    ${modes}${status}`;
}
