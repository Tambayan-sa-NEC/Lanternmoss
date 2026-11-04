/* VILLAGER FRIENDSHIP (TODO 33, config/friendship.js): the villagers become friends you care about. Hearts go up when
   you talk to someone for the first time each day, give them a present they like (friendshipRules.js decides what each
   present is worth), and finish the quests they ask of you. Each heart hands over its reward: a thank-you from their
   own shelf, a recipe they know, the keeper's discount, their own keepsake, and at the last heart the personal quest
   they only ask a real friend. Friends greet you by name, wave when they spot you across the square, and once in a
   while leave a present at your cottage door. Saved with the adventure (SAVE_SYSTEMS.friendship): points per villager,
   which rewards were handed over, and the day's talking, gifts and door presents. */
import { FRIENDSHIP } from '../config/friendship.js';
import { PLANETS } from '../config/planets.js';
import { RECIPES } from '../config/crafting.js';
import { ctx } from '../core/context.js';
import { emit, gameEvents } from '../core/events.js';
import { emote } from '../fx/emotes.js';
import { QUESTS } from '../config/quests.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist } from '../utils/sphere.js';
import { rng } from '../utils/random.js';
import { dayClock } from './dayClock.js';
import { Hotbar } from './hotbar.js';
import { grantItem, spawnWorldItem } from './pickups.js';
import { RecipeBook } from './RecipeBook.js';
import { cleanFriendshipState, clampPoints, emptyFriendship, giftKind, giftPoints, heartProgress, heartsFor,
  isVillager, rewardsBetween, shopDiscount, tastesFor, VILLAGER_NAMES } from './friendshipRules.js';

const itemName = id => itemRegistry.get(id)?.name ?? id;

export const Friendship = {
  state: emptyFriendship(), waveT: new Map(), onChange: null, home: null,

  toJSON() { return structuredClone({ ...this.state, talked: [...this.state.talked] }); },
  load(data) { this.state = cleanFriendshipState(data); this.waveT.clear(); this.onChange?.(); },
  reset() { this.state = emptyFriendship(dayClock.day); this.waveT.clear(); this.onChange?.(); },

  points(name) { return this.state.points[name] ?? 0; },
  hearts(name) { return heartsFor(this.points(name)); },
  progress(name) { return heartProgress(this.points(name)); },
  /** Every villager met so far, friendliest first (the Friends page). */
  friends() { return VILLAGER_NAMES.filter(n => this.points(n) > 0).sort((a, b) => this.points(b) - this.points(a)); },

  /** The planet a villager's tastes come from: a local belongs to the world they live on, travellers to this one. */
  planetFor(name) {
    const local = PLANETS.find(p => (p.npcs?.locals ?? []).some(n => n.name === name));
    return local ?? PLANETS[ctx.planet] ?? PLANETS[0];
  },

  /** A new day clears the day's talking and gifts, and rolls the presents friends leave at your door. */
  update() {
    if (this.state.day === dayClock.day) return;
    this.state.day = dayClock.day; this.state.talked = []; this.state.gifts = {};
    this.doorGifts();
    this.onChange?.();
  },

  // ---- earning hearts ------------------------------------------------------------------------------------------

  /** Adds points and hands over every reward the new hearts unlock. Returns { hearts, gained } (gained = hearts won). */
  add(name, points, { quiet = false } = {}) {
    if (!isVillager(name) || !points) return { hearts: this.hearts(name), gained: 0 };
    const before = this.hearts(name);
    this.state.points[name] = clampPoints(this.points(name) + points);
    const after = this.hearts(name);
    if (after > before) this.grant(name, before, after, quiet);
    this.onChange?.();
    return { hearts: after, gained: after - before };
  },
  /** The first chat of each day is worth something; the rest of the day's chatter is free. */
  noteTalk(npc) {
    const name = npc?.name;
    if (!isVillager(name) || this.state.talked.includes(name)) return false;
    this.state.talked.push(name); this.add(name, FRIENDSHIP.talk.points);
    return true;
  },
  giftsToday(name) { return this.state.gifts[name] ?? 0; },
  canGift(name) { return isVillager(name) && this.giftsToday(name) < FRIENDSHIP.gift.perDay; },

  /** Hands a present over: takes it from the bag, pays the points and returns the villager's reaction line. */
  give(npc, itemId) {
    const name = npc.name, bag = ctx.player.inventory;
    if (!this.canGift(name)) return { t: 'You have already given me something today, and a good something it was.', e: 'happy' };
    if (!bag.count(itemId)) return { t: 'Ah... you have not got it on you.', e: 'thinking' };
    bag.remove(itemId, 1);
    this.state.gifts[name] = this.giftsToday(name) + 1;
    const planet = this.planetFor(name), kind = giftKind(name, itemId, planet), says = tastesFor(name, planet).says[kind];
    emote(npc, says.emote ?? 'heart', kind === 'disliked' ? '#b9a6c9' : '#ff6b9a');
    if (kind === 'disliked') audio.fizzle?.(); else audio.sparkle();
    this.add(name, giftPoints(kind));
    emit('gifted', { name, itemId, kind });
    return { t: says.t, e: says.e };
  },

  /** The gift choice offered with a villager's first line (Dialog.choiceProvider). */
  giftChoice(npc) {
    if (!npc || !isVillager(npc.name) || !this.canGift(npc.name)) return null;
    const itemId = this.pick(); if (!itemId) return null;
    return { yes: `Give ${itemName(itemId)}`, no: 'Just talking',
      onYes: () => this.give(npc, itemId), onNo: () => null };
  },
  /** You give what you are holding. The gift option only offers the hotbar's held item, so the advance key can never
      hand over something the player did not choose to put in their hand. */
  pick() { const id = Hotbar.held()?.itemId; return this.giftable(id) ? id : null; },
  /** Quest items and the keepsakes friends made for you are never given away. */
  giftable(id) { const d = itemRegistry.get(id); return !!d && d.category !== 'quest' && !d.props?.keepsake; },

  // ---- the heart ladder ----------------------------------------------------------------------------------------

  /** Hands over every reward between two heart counts, and remembers that it did. */
  grant(name, before, after, quiet = false) {
    const planet = this.planetFor(name);
    for (const r of rewardsBetween(name, Math.max(before, this.state.claimed[name] ?? 0), after, planet)) {
      this.state.claimed[name] = r.hearts;
      if (r.kind === 'items') for (const [id, n] of r.items) { grantItem(id, n); if (!quiet) toast(`${name}: ${n}× ${itemName(id)}`); }
      else if (r.kind === 'keepsake') { grantItem(r.item, 1); if (!quiet) toast(`${name} made you a keepsake: ${itemName(r.item)}`); }
      else if (r.kind === 'recipe') { const rec = RECIPES.find(x => x.id === r.recipe); if (rec) RecipeBook.discover(rec); }
      else if (r.kind === 'discount' && !quiet) toast(`${name} will not charge a friend full price any more.`);
      else if (r.kind === 'quest' && !quiet) toast(`${name} has a favour to ask, when you have a moment.`);
    }
    if (!quiet) { audio.melody?.(); toast(`${name}: ${'♥'.repeat(after)} (${after} heart${after === 1 ? '' : 's'})`); }
    emit('friendship', { name, hearts: after });
  },
  /** Has this villager's ladder already handed over that kind of reward? */
  has(name, kind) {
    const hearts = this.hearts(name);
    return (tastesFor(name, this.planetFor(name)).rewards ?? []).some(r => r.kind === kind && hearts >= r.hearts);
  },
  /** The fraction off the shop's prices (src/gameplay/wallet.js). */
  discount(name) { return this.has(name, 'discount') ? shopDiscount(this.hearts(name)) : 0; },
  /** A personal quest is only offered once its heart is earned (src/gameplay/quests/Quests.js). */
  questUnlocked(questId) {
    const giver = QUESTS[questId]?.giver, need = QUESTS[questId]?.hearts ?? 0;
    return !need || (!!giver && this.hearts(giver) >= need);
  },

  // ---- how friends behave --------------------------------------------------------------------------------------

  /** A friend's opening line: your name instead of their ordinary greeting, then their warm chatter now and then. */
  lineFor(npc) {
    const name = npc?.name; if (!isVillager(name)) return null;
    const hearts = this.hearts(name); if (hearts < FRIENDSHIP.greetFrom) return null;
    const lines = tastesFor(name, this.planetFor(name)).chatter ?? [];
    if (!lines.length || rng() > 0.4) return null;
    return { ...lines[Math.floor(rng() * lines.length)], e: 'happy' };
  },
  /** ♥ by a friend's name on the E prompt. */
  tagFor(npc) { const h = isVillager(npc?.name) ? this.hearts(npc.name) : 0; return h ? ` <span class="ftag">${'♥'.repeat(h)}</span>` : ''; },

  /** Friends wave when they spot you across the square (not while asleep, talking or on their way somewhere). */
  waves(dt) {
    if (!ctx.started || ctx.paused) return;
    const P = ctx.player;
    for (const npc of ctx.npcs) {
      if (this.hearts(npc.name) < FRIENDSHIP.waveFrom || npc.asleep || npc.talking || !npc.root.visible) continue;
      const left = (this.waveT.get(npc.name) ?? 0) - dt; this.waveT.set(npc.name, left);
      if (left > 0) continue;
      const d = arcDist(P.up, npc.up);
      if (d < FRIENDSHIP.wave.near || d > FRIENDSHIP.wave.far) continue;
      npc.gesture = 1; emote(npc, 'heart', '#ff6b9a');
      this.waveT.set(npc.name, FRIENDSHIP.wave.cooldown);
    }
  },

  /** A new day: close friends sometimes leave a present at your cottage door. */
  doorGifts() {
    if (this.state.doorDay === dayClock.day) return [];
    this.state.doorDay = dayClock.day;
    const door = this.home?.cottage?.door; if (!door) return [];
    const left = [];
    for (const name of VILLAGER_NAMES) {
      if (this.hearts(name) < FRIENDSHIP.door.from || rng() > FRIENDSHIP.door.chance) continue;
      const planet = this.planetFor(name), t = tastesFor(name, planet);
      const pool = [...t.favourite, ...t.liked].filter(id => itemRegistry.has(id));
      const id = pool[Math.floor(rng() * pool.length)]; if (!id) continue;
      spawnWorldItem(id, 1, door); left.push({ name, itemId: id });
    }
    if (left.length) toast(`Someone left something at your door: ${left.map(g => itemName(g.itemId)).join(', ')}`);
    return left;
  },
};

/** Finishing a quest for a villager is worth more than any present. */
gameEvents.addEventListener('questcomplete', e => {
  const giver = QUESTS[e.detail.id]?.giver;
  if (giver) Friendship.add(giver, FRIENDSHIP.quest.points);
});
