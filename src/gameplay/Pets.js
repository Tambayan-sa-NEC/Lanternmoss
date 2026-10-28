/* PETS: the hero's companion as a feature of its own (data: config/pets.js, bodies: src/entities/companions/).
   Owns everything that outlives one pet body (a body is rebuilt after travel, leaving a house, swapping pets):
     which pets are unlocked and which one is out, their names, the command (follow / stay / attack / passive),
     health and fainting, the ability cooldown. Pets level with the hero (pet level = hero level).
   It also remembers which pet each hero last took (./petPicks.js: localStorage, kept across adventures): picking a hero
   brings that pet back if it's unlocked in this adventure, otherwise the hero's own.
   The body asks Pets what to do (mode, stay spot, damage); Pets tells the body to show / hide and to celebrate.
   Unlocks come from game events: a quest finished, a chest opened (core/events.js).
   Care (TODO 35, config/pets.js PET_FOOD / PET_FINDS / PET_BED): feeding from the pet menu (a favourite makes it Happy:
   more damage for a while), a pet fed today sometimes brings back a find, an outfit per pet (worn on its head,
   models/vanity.js dressPet; the item leaves the bag while worn), and the cottage pet basket where it rests and heals
   (`resting`, set by the cottage while you are home). */
import { CHARACTERS } from '../config/characters.js';
import { PET_BED, PET_CARE, PET_COMMANDS, PET_FAVOURITES, PET_FINDS, PET_FOOD, PET_LEVELS, PET_SWAP, PETS, petAvailable, availablePetIds, petEdible } from '../config/pets.js';
import { ctx } from '../core/context.js';
import { peaceful, pointOf, distance } from '../combat/space.js';
import { emit, gameEvents } from '../core/events.js';
import { bindLabel } from '../core/keybinds.js';
import { FlyingPet } from '../entities/companions/FlyingPet.js';
import { WalkingPet } from '../entities/companions/WalkingPet.js';
import { floatText } from '../fx/combatFx.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { dressPet } from '../models/vanity.js';
import { gainXp, levelEvents } from '../progression/experience.js';
import { encounterEvents } from '../combat/events.js';
import { audio } from '../systems/AudioSystem.js';
import { showBanner } from '../ui/banner.js';
import { toast } from '../ui/toast.js';
import { mpick, rng } from '../utils/random.js';

import { PET_ABILITIES, petEffects, resetPetAbilities, updatePetAbilities } from './petAbilities.js';
import { dayClock } from './dayClock.js';
import { loadPicks, savePicks } from './petPicks.js';
import { grantItem } from './pickups.js';
import { gainCoins } from './wallet.js';

const STARTERS = Object.keys(PETS).filter(id => !PETS[id].unlock);
const MODES = Object.keys(PET_COMMANDS);
const PET_LINES = ['{name} leans into the scratch.', '{name} looks very pleased with themself.', 'A happy little wiggle from {name}.',
  '{name} nuzzles your hand.', '{name} would like that to continue, please.'];

export const Pets = {
  unlocked: new Set(STARTERS), active: null, names: {}, mode: 'follow', stayDir: null, picks: loadPicks(),
  hp: null, hpFor: null, faintT: 0, hurtAt: -99, abilityCd: 0, petCool: 0, swapCool: 0,
  diveDay: 0, divesToday: 0,
  // care (TODO 35): meals eaten today per pet, the Happy timer of the pet that's out, today's finds, outfits worn
  fedDay: 0, fed: {}, happyT: 0, findDay: 0, findsToday: 0, findT: PET_FINDS.interval, outfits: {},
  resting: false,        // in the cottage pet basket right now (the cottage sets it; never saved)
  presenting: false,     // a menu is showing the pet off: it comes round in front of the hero (PET_SHOWCASE)

  toJSON() {
    const stay = ctx.room ? ctx.room.surface.stay ?? ctx.room.surface.exit : this.stayDir;
    return { unlocked: [...this.unlocked], active: this.id, names: { ...this.names }, mode: this.mode,
      stayDir: this.mode === 'stay' ? stay?.toArray() ?? null : null, hp: this.hp, faintT: this.faintT, hurtAt: this.hurtAt,
      abilityCd: this.abilityCd, petCool: this.petCool, swapCool: this.swapCool, diveDay: this.diveDay,
      divesToday: this.divesToday, mend: petEffects.mend ? { ...petEffects.mend } : null,
      fedDay: this.fedDay, fed: { ...this.fed }, happyT: this.happyT, findDay: this.findDay, findsToday: this.findsToday,
      findT: this.findT, outfits: { ...this.outfits } };
  },
  load(data) {
    const { unlocked, stayDir, mend, fed, outfits, ...state } = data;
    Object.assign(this, state); this.unlocked = new Set(unlocked); this.hpFor = this.id;
    this.fed = { ...(fed ?? {}) }; this.outfits = { ...(outfits ?? {}) }; this.resting = false;
    this.hp = Math.min(this.maxHp(), this.hp); this.presenting = false;
    resetPetAbilities(); petEffects.mend = mend;
    this.spawn();
    this.stayDir = stayDir ? ctx.player.up.clone().fromArray(stayDir) : null;
  },

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
  damage(id = this.id) {
    const happy = id === this.id && this.happyT > 0 ? 1 + PET_FOOD.happyDamage : 1;   // a favourite meal (TODO 35)
    return Math.round(PETS[id].attack.damage * (1 + PET_LEVELS.damagePerLevel * (this.level - 1)) * happy);
  },
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
    ctx.companion.setVisible(!this.fainted && !peaceful());
    this.dress();
    if (this.mode === 'stay') this.stayDir = pointOf(ctx.companion).clone();   // a new place: wait here instead
    return ctx.companion;
  },
  /** Takes pet `id` along instead (it must be unlocked), and remembers it for this hero. quiet = no toast. */
  choose(id, quiet = false) {
    if (!this.unlocked.has(id) || !petAvailable(id)) return false;
    this.remember(id);
    if (id === this.id) return true;
    this.active = id; this.spawn();
    if (!this.fainted && !peaceful()) { emote(ctx.companion, 'heart'); audio.sparkle(); }
    if (!quiet) toast(`${this.nameOf()} the ${PETS[id].name.toLowerCase()} comes along now.`);
    return true;
  },
  /** Swap key: the next unlocked pet (in PETS order) comes out right away, with a puff. */
  cycle() {
    if (peaceful() || ctx.player.dead) return false;
    const ids = availablePetIds().filter(id => this.unlocked.has(id));
    if (ids.length < 2) { toast('No other pets yet: find more out in the wilds!'); audio.fizzle(); return false; }
    if (this.swapCool > 0) return false;
    const next = ids[(ids.indexOf(this.id) + 1) % ids.length], old = ctx.companion;
    if (old?.visible) sparkles.emit(old.pos.clone().addScaledVector(old.up, 0.5), { count: 24, color: 0xffffff, speed: 2.4, up: old.up, upBias: 0.8, life: 0.6, size: 0.36 });
    this.swapCool = PET_SWAP.cooldown;
    return this.choose(next);
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
    this.stayDir = mode === 'stay' && pet ? pointOf(pet).clone() : null;
    pet?.onCommand?.(mode);
    toast(`${PET_COMMANDS[mode].label}: ${this.nameOf()} ${PET_COMMANDS[mode].text}${this.fainted ? ' (once back on their feet)' : ''}.`);
    audio.blip();
  },
  cycleCommand() { this.command(MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]); },

  // ---------------------------------------------------------------- the ability (key V)
  useAbility() {
    const pet = ctx.companion, a = this.def.ability;
    if (!pet || peaceful() || ctx.player.dead) return false;
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
    const d = distance(pointOf(P), pointOf(pet)); if (d > PET_CARE.petReach) return null;
    return { dist: d + 1.2, label: `Pet ${this.nameOf()}`, at: pet.pos.clone().addScaledVector(pet.up, pet.height + 0.9), run: () => this.pat() };   // (+1.2: villagers and doors come first)
  },
  pat() {
    const pet = ctx.companion; if (!pet) return;
    this.petCool = 1.5; this.heal(this.maxHp() * 0.1);
    emote(pet, 'heart'); pet.celebrate?.(); (pet.voice ?? audio.chirp).call(audio);
    toast(mpick(PET_LINES).replace('{name}', this.nameOf()));
  },

  // ---------------------------------------------------------------- care (TODO 35)
  /** Meals pet `id` has eaten today. */
  meals(id = this.id) { return this.fedDay === dayClock.day ? this.fed[id] ?? 0 : 0; },
  isFavourite(itemId, id = this.id) { return (PET_FAVOURITES[id] ?? []).includes(itemId); },
  /** Why the pet that's out can't eat `itemId` right now, or null. */
  feedProblem(itemId) {
    const def = itemRegistry.get(itemId);
    if (!ctx.companion || ctx.player.dead) return 'Your pet is not with you.';
    if (this.fainted) return `${this.nameOf()} is resting.`;
    if (!petEdible(def)) return `${this.nameOf()} won't eat that.`;
    if (!ctx.player.inventory.count(itemId)) return `You have no ${def.name}.`;
    if (this.meals() >= PET_FOOD.perDay) return `${this.nameOf()} is full. Try again tomorrow.`;
    return null;
  },
  /** Feeds the pet that's out one `itemId` from the bag: a little XP, some health, and a favourite makes it Happy. */
  feed(itemId) {
    const problem = this.feedProblem(itemId);
    if (problem) { toast(problem); audio.fizzle(); return { ok: false, message: problem }; }
    ctx.player.inventory.remove(itemId, 1);
    const fav = this.isFavourite(itemId), pet = ctx.companion, name = itemRegistry.get(itemId).name;
    if (this.fedDay !== dayClock.day) { this.fedDay = dayClock.day; this.fed = {}; }
    this.fed[this.id] = (this.fed[this.id] ?? 0) + 1;
    this.heal(this.maxHp() * PET_FOOD.heal);
    gainXp(fav ? PET_FOOD.favouriteXp : PET_FOOD.likedXp);
    if (fav) this.happyT = PET_FOOD.happySeconds;
    emote(pet, 'heart', fav ? '#ff6b9a' : undefined); pet.celebrate?.(); (pet.voice ?? audio.chirp).call(audio);
    const message = fav ? `${this.nameOf()} loves ${name}! Happy: +${Math.round(PET_FOOD.happyDamage * 100)}% damage for ${PET_FOOD.happySeconds}s.`
      : `${this.nameOf()} munches the ${name} happily.`;
    toast(message);
    return { ok: true, favourite: fav, message };
  },
  /** Fed today: a well-fed pet goes looking for things while you explore. */
  get wellFed() { return this.meals() > 0; },
  /** One try at a find: something off the table, at most PET_FINDS.perDay a day. Returns what it found, or null. */
  tryFind() {
    if (this.findDay !== dayClock.day) { this.findDay = dayClock.day; this.findsToday = 0; }
    if (!this.wellFed || this.findsToday >= PET_FINDS.perDay || rng() >= PET_FINDS.chance) return null;
    const total = PET_FINDS.table.reduce((n, [, w]) => n + w, 0);
    let r = rng() * total, pick = PET_FINDS.table[0];
    for (const row of PET_FINDS.table) if ((r -= row[1]) <= 0) { pick = row; break; }
    const [what, , [lo, hi]] = pick, qty = lo + Math.floor(rng() * (hi - lo + 1)), pet = ctx.companion;
    this.findsToday++;
    if (what === 'coins') gainCoins(qty, pet?.pos ?? null);
    else grantItem(what, qty);
    if (pet) { emote(pet, '!', '#ffd36b'); pet.celebrate?.(); }
    audio.sparkle();
    toast(`${this.nameOf()} found ${what === 'coins' ? `${qty} coins` : `${qty > 1 ? `${qty}x ` : ''}${itemRegistry.get(what).name}`}!`);
    return { what, qty };
  },
  /** The outfit pet `id` has on (an item definition), or null. */
  outfitOf(id = this.id) { return this.outfits[id] ? itemRegistry.get(this.outfits[id]) ?? null : null; },
  /** Puts outfit `itemId` on pet `id` from the bag (whatever it wore goes back), or takes it off with null. */
  wear(itemId, id = this.id) {
    const inv = ctx.player.inventory, old = this.outfits[id] ?? null;
    if (itemId === old) return { ok: true };
    if (!this.unlocked.has(id)) return { ok: false, message: 'Find that pet first.' };
    if (itemId && !itemRegistry.get(itemId)?.props?.petOutfit) return { ok: false, message: 'That is not a pet outfit.' };
    if (itemId && !inv.count(itemId)) return { ok: false, message: 'Craft that outfit first.' };
    if (old && !itemId && inv.spaceFor(old) < 1) return { ok: false, message: 'Make room in the bag first.' };
    if (itemId) inv.remove(itemId, 1);
    if (old) inv.add(old, 1);
    if (itemId) this.outfits[id] = itemId; else delete this.outfits[id];
    if (id === this.id) { this.dress(); if (ctx.companion) { emote(ctx.companion, 'heart'); ctx.companion.celebrate?.(); } }
    audio.blip();
    return { ok: true };
  },
  /** Draws the outfit of the pet that's out on its body. */
  dress() { if (ctx.companion) dressPet(ctx.companion, this.id, this.outfitOf()); },

  // ---------------------------------------------------------------- unlocking
  unlock(id) {
    if (!petAvailable(id) || this.unlocked.has(id)) return false;
    this.unlocked.add(id); emit('petfound', { id });
    showBanner(`New pet: ${this.nameOf(id)} the ${PETS[id].name.toLowerCase()}!`, `Open the pet menu (${bindLabel('petMenu')}, or click the pet card) to bring them along.`);
    audio.melody();
    return true;
  },

  update(dt) {
    this.abilityCd = Math.max(0, this.abilityCd - dt); this.petCool = Math.max(0, this.petCool - dt); this.swapCool = Math.max(0, this.swapCool - dt);
    this.happyT = Math.max(0, this.happyT - dt);
    const rest = this.resting ? PET_BED.faintRate : 1;                 // the cottage pet basket: a quicker rest
    if (this.fainted) { if ((this.faintT -= dt * rest) <= 0) { if (peaceful()) this.faintT = 0.01; else this.revive(); } }   // (back outside, not in a room)
    else if (this.resting && this.hp !== null) this.heal(this.maxHp() * PET_BED.heal * dt);
    else if (this.hp !== null && ctx.time - this.hurtAt > PET_CARE.regenDelay) this.heal(PET_CARE.regen * dt);
    // a well-fed pet out exploring with you, between fights, sometimes brings something back
    const pet = ctx.companion;
    if (this.wellFed && pet?.visible && !this.fainted && !peaceful() && !ctx.player.dead && this.mode !== 'stay' && !pet.busy && (this.findT -= dt) <= 0) {
      this.findT = PET_FINDS.interval; this.tryFind();
    }
    updatePetAbilities(dt);
  },
  /** A fresh adventure: back to the starter pets, default names, full health (which pet each hero likes is kept). */
  reset() {
    this.unlocked = new Set(STARTERS); this.active = null; this.names = {}; this.mode = 'follow'; this.stayDir = null;
    this.hp = null; this.hpFor = null; this.faintT = 0; this.hurtAt = -99; this.abilityCd = 0; this.petCool = 0;
    this.diveDay = 0; this.divesToday = 0;
    this.fedDay = 0; this.fed = {}; this.happyT = 0; this.findDay = 0; this.findsToday = 0; this.findT = PET_FINDS.interval;
    this.outfits = {}; this.resting = false;
    resetPetAbilities();
  },
};

// unlocks
gameEvents.addEventListener('questcomplete', e => { for (const [id, p] of Object.entries(PETS)) if (p.unlock?.quest === e.detail.id) Pets.unlock(id); });
encounterEvents.addEventListener('minibossdefeated', e => {
  for (const [id, p] of Object.entries(PETS)) if (p.unlock?.miniBoss && p.unlock.miniBoss === e.detail.boss.type) Pets.unlock(id);
});
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
