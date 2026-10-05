/* PETS: the hero's companion as a feature of its own (data: config/pets.js, bodies: src/entities/companions/).
   Owns everything that outlives one pet body (a body is rebuilt after travel, leaving a house, swapping pets):
     which pets are unlocked and which one is out, their names, the command (follow / stay / attack / passive),
     health and fainting, the ability cooldown. Pets level with the hero (pet level = hero level).
   It also remembers which pet each hero last took (./petPicks.js: localStorage, kept across adventures): picking a hero
   brings that pet back if it's unlocked in this adventure, otherwise the hero's own.
   The body asks Pets what to do (mode, stay spot, damage); Pets tells the body to show / hide and to celebrate.
   Unlocks come from game events: a quest finished, a chest opened (core/events.js). */
import { CHARACTERS } from '../config/characters.js';
import { PET_CARE, PET_COMMANDS, PET_LEVELS, PETS } from '../config/pets.js';
import { ctx } from '../core/context.js';
import { gameEvents } from '../core/events.js';
import { bindLabel } from '../core/keybinds.js';
import { FlyingPet } from '../entities/companions/FlyingPet.js';
import { WalkingPet } from '../entities/companions/WalkingPet.js';
import { floatText } from '../fx/combatFx.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { levelEvents } from '../progression/experience.js';
import { audio } from '../systems/AudioSystem.js';
import { showBanner } from '../ui/banner.js';
import { toast } from '../ui/toast.js';
import { mpick } from '../utils/random.js';
import { arcDist } from '../utils/sphere.js';
import { PET_ABILITIES, resetPetAbilities, updatePetAbilities } from './petAbilities.js';
import { loadPicks, savePicks } from './petPicks.js';

const STARTERS = Object.keys(PETS).filter(id => !PETS[id].unlock);
const MODES = Object.keys(PET_COMMANDS);
const PET_LINES = ['{name} leans into the scratch.', '{name} looks very pleased with themself.', 'A happy little wiggle from {name}.',
  '{name} nuzzles your hand.', '{name} would like that to continue, please.'];

export const Pets = {
  unlocked: new Set(STARTERS), active: null, names: {}, mode: 'follow', stayDir: null, picks: loadPicks(),
  hp: null, hpFor: null, faintT: 0, hurtAt: -99, abilityCd: 0, petCool: 0,
  presenting: false,     // a menu is showing the pet off: it comes round in front of the hero (PET_SHOWCASE)

  /** The pet that's out: the one picked (pet step or pet menu), else the hero's own. */
  get id() { return this.active ?? CHARACTERS[ctx.player.charId].companion; },
  get def() { return PETS[this.id]; },
  get fainted() { return this.faintT > 0; },
  get level() { return ctx.player.level; },
  /** A pet's name: yours for it, or the one its hero gave it, or its species default. */
  nameOf(id = this.id) {
    if (this.names[id]) return this.names[id];
    const own = Object.values(CHARACTERS).find(c => c.companion === id && c === CHARACTERS[ctx.player.charId]);
    return own ? own.companionName.split(' ')[0] : PETS[id].defaultName;
  },
  maxHp(id = this.id) { return PETS[id].hp + PET_LEVELS.hpPerLevel * (this.level - 1); },
  damage(id = this.id) { return Math.round(PETS[id].attack.damage * (1 + PET_LEVELS.damagePerLevel * (this.level - 1))); },
  /** Scales an ability's numbers with the pet's level too. */
  power() { return 1 + PET_LEVELS.damagePerLevel * (this.level - 1); },

  // ---------------------------------------------------------------- the body
  /** (Re)builds the pet's body beside the hero: after travel, a house, a swap. A fainted pet stays hidden, and so
      does one picked indoors (it waits outside: Houses.onLeave brings it to the door). */
  spawn() {
    if (ctx.companion) ctx.companion.dispose();
    if (this.hpFor !== this.id) { this.hpFor = this.id; this.hp = this.maxHp(); this.faintT = 0; }
    const Body = this.def.body === 'fly' ? FlyingPet : WalkingPet;
    ctx.companion = new Body(this.id);
    ctx.companion.setVisible(!this.fainted && !ctx.indoors);
    if (this.mode === 'stay') this.stayDir = ctx.companion.up.clone();   // a new place: wait here instead
    return ctx.companion;
  },
  /** Takes pet `id` along instead (it must be unlocked), and remembers it for this hero. quiet = no toast. */
  choose(id, quiet = false) {
    if (!this.unlocked.has(id) || !PETS[id]) return false;
    this.remember(id);
    if (id === this.id) return true;
    this.active = id; this.spawn();
    if (!this.fainted && !ctx.indoors) { emote(ctx.companion, 'heart'); audio.sparkle(); }
    if (!quiet) toast(`${this.nameOf()} the ${PETS[id].name.toLowerCase()} comes along now.`);
    return true;
  },
  remember(id, hero = ctx.player.charId) {
    if (id === CHARACTERS[hero].companion) delete this.picks[hero]; else this.picks[hero] = id;
    savePicks(this.picks);
  },
  /** A hero was picked: their remembered pet comes out if it's unlocked in this adventure, else their own. */
  forHero(hero) { const p = this.picks[hero]; this.active = p && this.unlocked.has(p) ? p : null; },
  rename(id, name) {
    const clean = String(name ?? '').replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, PET_CARE.nameLength);
    if (clean) this.names[id] = clean; else delete this.names[id];
    return this.nameOf(id);
  },

  // ---------------------------------------------------------------- commands
  command(mode) {
    if (!PET_COMMANDS[mode]) return;
    this.mode = mode; const pet = ctx.companion;
    this.stayDir = mode === 'stay' && pet ? pet.up.clone() : null;
    pet?.onCommand?.(mode);
    toast(`${PET_COMMANDS[mode].label}: ${this.nameOf()} ${PET_COMMANDS[mode].text}${this.fainted ? ' (once back on their feet)' : ''}.`);
    audio.blip();
  },
  cycleCommand() { this.command(MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]); },

  // ---------------------------------------------------------------- the ability (key V)
  useAbility() {
    const pet = ctx.companion, a = this.def.ability;
    if (!pet || ctx.indoors || ctx.player.dead) return false;
    if (this.fainted) { toast(`${this.nameOf()} is resting (${Math.ceil(this.faintT)}s).`); audio.fizzle(); return false; }
    if (this.abilityCd > 0) { audio.fizzle(); return false; }
    if (PET_ABILITIES[a.id](this, pet, a) === false) { audio.fizzle(); return false; }
    this.abilityCd = a.cooldown;
    return true;
  },

  // ---------------------------------------------------------------- health
  hurt(n) {
    const pet = ctx.companion; if (!pet || this.fainted || n <= 0) return;
    n = Math.max(1, Math.round(n)); this.hp -= n; this.hurtAt = ctx.time;
    floatText(pet.pos.clone().addScaledVector(pet.up, pet.height + 0.5), `-${n}`, '#ff8fb1', 0.8);
    pet.flinch?.();
    if (this.hp <= 0) this.faint();
  },
  heal(n) { if (!this.fainted) this.hp = Math.min(this.maxHp(), this.hp + n); },
  faint() {
    const pet = ctx.companion;
    this.hp = 0; this.faintT = PET_CARE.faintTime;
    if (pet) { sparkles.emit(pet.pos.clone().addScaledVector(pet.up, 0.4), { count: 40, color: 0xffd6f5, speed: 2.6, up: pet.up, upBias: 1, life: 1.1, size: 0.34 }); pet.setVisible(false); }
    audio.faint(); toast(`${this.nameOf()} fainted! They'll be back in ${PET_CARE.faintTime}s.`);
  },
  revive() {
    this.faintT = 0; this.hp = this.maxHp();
    const pet = ctx.companion; if (!pet) return;
    pet.snapToHero(); pet.setVisible(true); pet.celebrate?.();
    emote(pet, 'heart'); audio.sparkle(); toast(`${this.nameOf()} is back, good as new!`);
  },

  // ---------------------------------------------------------------- petting (E)
  /** The "E Pet ..." prompt when you stand still next to your pet. */
  target() {
    const pet = ctx.companion, P = ctx.player;
    if (!pet || this.fainted || this.petCool > 0 || P.vel.lengthSq() > 1 || pet.busy) return null;
    const d = arcDist(P.up, pet.up); if (d > PET_CARE.petReach) return null;
    return { dist: d + 1.2, label: `Pet ${this.nameOf()}`, at: pet.pos.clone().addScaledVector(pet.up, pet.height + 0.9), run: () => this.pat() };   // (+1.2: villagers and doors come first)
  },
  pat() {
    const pet = ctx.companion; if (!pet) return;
    this.petCool = 1.5; this.heal(this.maxHp() * 0.1);
    emote(pet, 'heart'); pet.celebrate?.(); (pet.voice ?? audio.chirp).call(audio);
    toast(mpick(PET_LINES).replace('{name}', this.nameOf()));
  },

  // ---------------------------------------------------------------- unlocking
  unlock(id) {
    if (!PETS[id] || this.unlocked.has(id)) return false;
    this.unlocked.add(id);
    showBanner(`New pet: ${this.nameOf(id)} the ${PETS[id].name.toLowerCase()}!`, `Open the pet menu (${bindLabel('petMenu')}, or click the pet card) to bring them along.`);
    audio.melody();
    return true;
  },

  update(dt) {
    this.abilityCd = Math.max(0, this.abilityCd - dt); this.petCool = Math.max(0, this.petCool - dt);
    if (this.fainted) { if ((this.faintT -= dt) <= 0) { if (ctx.indoors) this.faintT = 0.01; else this.revive(); } }   // (back outside, not in a room)
    else if (this.hp !== null && ctx.time - this.hurtAt > PET_CARE.regenDelay) this.heal(PET_CARE.regen * dt);
    updatePetAbilities(dt);
  },
  /** A fresh adventure: back to the starter pets, default names, full health (which pet each hero likes is kept). */
  reset() {
    this.unlocked = new Set(STARTERS); this.active = null; this.names = {}; this.mode = 'follow'; this.stayDir = null;
    this.hp = null; this.hpFor = null; this.faintT = 0; this.hurtAt = -99; this.abilityCd = 0; this.petCool = 0;
    resetPetAbilities();
  },
};

// unlocks
gameEvents.addEventListener('questcomplete', e => { for (const [id, p] of Object.entries(PETS)) if (p.unlock?.quest === e.detail.id) Pets.unlock(id); });
gameEvents.addEventListener('chestopened', e => {
  for (const [id, p] of Object.entries(PETS)) {
    if (p.unlock?.chest && p.unlock.chest === e.detail.kind) Pets.unlock(id);
    if (p.unlock?.bossChest !== undefined && e.detail.kind === 'boss' && p.unlock.bossChest === e.detail.planet) Pets.unlock(id);
  }
});
// growing up with the hero: the new maximum is added on, and a little cheer
levelEvents.addEventListener('levelup', e => {
  if (Pets.hp === null || Pets.fainted) return;
  Pets.hp = Math.min(Pets.maxHp(), Pets.hp + PET_LEVELS.hpPerLevel * (e.detail.level - e.detail.from));
  if (ctx.companion) emote(ctx.companion, '★', '#ffd24a');
});
