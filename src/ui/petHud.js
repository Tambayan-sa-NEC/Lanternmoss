/* The pet card beside the ability bar: face, name and level, a health bar, the current command (click or T to
   change it) and the pet's ability (click or V) with its cooldown sweep. Fainted pets show how long they'll rest. */
import { PET_COMMANDS, PET_KEYS } from '../config/pets.js';
import { ctx } from '../core/context.js';
import { Pets } from '../gameplay/Pets.js';
import { dom } from './dom.js';
import { icon } from './icons.js';

const keyLabel = code => code.replace('Key', '');
let card = null;

export function buildPetCard() {
  const el = document.createElement('div'); el.id = 'petcard';
  el.innerHTML = `<div class="pc-face"></div><div class="pc-mid"><div class="pc-name"><b></b><small></small></div>` +
    `<div class="pc-hp"><i></i></div><button type="button" class="pc-mode"></button></div>` +
    `<div class="slot pc-ab"><kbd>${keyLabel(PET_KEYS.ability)}</kbd><div class="ico"></div><div class="cd"></div><div class="cdt"></div></div>` +
    `<div class="pc-rest"></div>`;
  el.querySelector('.pc-mode').addEventListener('click', () => Pets.cycleCommand());
  el.querySelector('.pc-ab').addEventListener('click', () => Pets.useAbility());
  dom.quick.after(el);
  card = { el, face: el.querySelector('.pc-face'), name: el.querySelector('.pc-name b'), lvl: el.querySelector('.pc-name small'),
    hp: el.querySelector('.pc-hp i'), mode: el.querySelector('.pc-mode'), ab: el.querySelector('.pc-ab'), abIco: el.querySelector('.pc-ab .ico'),
    cd: el.querySelector('.pc-ab .cd'), cdt: el.querySelector('.pc-ab .cdt'), rest: el.querySelector('.pc-rest'), key: '' };
}

export function updatePetCard() {
  if (!card) return;
  const show = !!ctx.companion && Pets.hp !== null; card.el.style.display = show ? 'flex' : 'none'; if (!show) return;
  const def = Pets.def, a = def.ability, key = `${Pets.id}|${Pets.nameOf()}|${Pets.level}|${Pets.mode}`;
  if (key !== card.key) {
    card.key = key; card.el.style.setProperty('--pc', def.color);
    card.face.innerHTML = icon(Pets.id); card.name.textContent = Pets.nameOf(); card.lvl.textContent = `Lv ${Pets.level}`;
    card.mode.textContent = `${PET_COMMANDS[Pets.mode].label} (${keyLabel(PET_KEYS.command)})`;
    card.mode.title = `${Pets.nameOf()} ${PET_COMMANDS[Pets.mode].text}. Click or press ${keyLabel(PET_KEYS.command)} to change.`;
    card.abIco.innerHTML = icon(a.id); card.ab.title = `${a.name} (${keyLabel(PET_KEYS.ability)}, ${a.cooldown}s): ${a.text}`;
    card.el.title = `${Pets.nameOf()} the ${def.name.toLowerCase()}: ${def.blurb}`;
  }
  card.hp.style.transform = `scaleX(${Math.max(0, Pets.hp / Pets.maxHp())})`;
  const cd = Pets.abilityCd, fainted = Pets.fainted;
  card.cd.style.transform = `scaleY(${fainted ? 1 : cd / a.cooldown})`;
  const t = fainted ? '' : cd > 0 ? Math.ceil(cd) : ''; if (card.cdt.textContent !== String(t)) card.cdt.textContent = t;
  card.el.classList.toggle('fainted', fainted);
  card.rest.textContent = fainted ? `resting ${Math.ceil(Pets.faintT)}s` : '';
}
