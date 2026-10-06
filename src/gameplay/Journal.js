/* JOURNAL: achievements, the bestiary and the collection, filled in from game events (combat/events.js, core/events.js,
   the bag's 'itemadded') and kept across adventures in localStorage (JOURNAL_KEY). Rules and the saved shape are pure
   (./journalRules.js); the screen is src/ui/JournalUI.js and the unlock toast src/ui/achievementToast.js.
   Boss challenges: a fight starts when the boss engages (and ends if it gives up); on a win it counts as flawless (no
   hit on the hero), petless (the pet never struck it) and underdog (hero level <= BOSS_CHALLENGES.lowLevel). */
import { BESTIARY, BOSS_CHALLENGES, JOURNAL_KEY } from '../config/achievements.js';
import { encounterEvents } from '../combat/events.js';
import { ctx } from '../core/context.js';
import { emit, gameEvents } from '../core/events.js';
import { ENGAGED } from '../entities/enemies/states.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { arcDist } from '../utils/sphere.js';
import { toast } from '../ui/toast.js';
import { emptyJournal, isBoss, isMiniBoss, newlyDone, pageName, sanitizeJournal } from './journalRules.js';
import { Pets } from './Pets.js';
import { gainCoins } from './wallet.js';

const SCAN_EVERY = 0.5;            // seconds between looks around for monsters to note in the bestiary
const SAVE_AFTER = 1.5;            // seconds a change waits before it's written (kills come in bursts)

function load() {
  try { return sanitizeJournal(JSON.parse(globalThis.localStorage?.getItem(JOURNAL_KEY) ?? 'null'), id => !!itemRegistry.get(id)); }
  catch { return emptyJournal(); }
}

export const Journal = {
  data: load(), fight: null, scanT: 0, saveT: 0,

  /** Records a change: unlocks whatever it completed (with its reward) and saves soon. */
  changed() {
    for (const a of newlyDone(this.data)) {
      this.data.unlocked[a.id] = Date.now();
      if (ctx.started && a.reward?.coins) gainCoins(a.reward.coins);
      emit('achievement', { achievement: a });
    }
    this.saveT = SAVE_AFTER;
  },
  save() { try { globalThis.localStorage?.setItem(JOURNAL_KEY, JSON.stringify(this.data)); } catch { /* blocked: keep for this session */ } },
  add(stat, n = 1) { this.data.stats[stat] = (this.data.stats[stat] ?? 0) + n; this.changed(); },

  // ---------------------------------------------------------------- the bestiary
  meet(type) { if (this.data.seen[type]) return; this.data.seen[type] = true; toast(`New in your bestiary: ${pageName(type)}`); this.changed(); },
  defeat(e) {
    if (e.def.object) return;                                       // lair seals aren't monsters
    const type = e.type, first = !this.data.defeated[type];
    this.data.seen[type] = true; this.data.defeated[type] = (this.data.defeated[type] ?? 0) + 1;
    if (isMiniBoss(type)) this.data.stats.minibosses++;
    else if (!isBoss(type) && !e.owner) this.data.stats.monsters++;     // (a boss's summons can't be farmed)
    if (first && !isBoss(type)) toast(`Bestiary: ${pageName(type)} defeated! Its stats and drops are noted.`);
    this.changed();
  },

  // ---------------------------------------------------------------- boss challenges
  bossWon(boss) {
    const f = this.fight?.boss === boss ? this.fight : null, flags = this.data.flags;
    this.data.stats.bosses++;
    if (f && !f.hit) flags.flawless = true;
    if (f && !f.pet) flags.petless = true;
    if (Math.min(f?.level ?? 99, ctx.player.level) <= (BOSS_CHALLENGES.lowLevel[ctx.planet] ?? 0)) flags.underdog = true;   // (the level the fight began at: the kill's XP comes first)
    this.fight = null; this.changed();
  },

  /** Every frame: notes monsters you meet, follows the boss fight, and saves when it's time. */
  update(dt) {
    if (this.saveT > 0 && (this.saveT -= dt) <= 0) this.save();
    if (!ctx.started) return;
    if ((this.scanT -= dt) <= 0) {
      this.scanT = SCAN_EVERY; const P = ctx.player;
      for (const e of ctx.enemies) if (e.alive && !e.hidden && !e.def.object && !this.data.seen[e.type] && arcDist(P.up, e.up) < BESTIARY.meetDistance) this.meet(e.type);
    }
    const b = ctx.boss, engaged = !!b?.alive && ENGAGED.has(b.state);
    if (engaged && this.fight?.boss !== b) this.fight = { boss: b, hit: false, pet: false, level: ctx.player.level };
    else if (!engaged && b?.alive && this.fight && b.state !== 'dead') this.fight = null;   // it gave up the chase: a new fight next time
  },
  /** Marks the starter pets (and any unlocked so far) and the bag's contents as found. */
  noteStart() {
    let n = 0;
    for (const id of Pets.unlocked) if (!this.data.pets[id]) { this.data.pets[id] = true; n++; }
    for (const s of ctx.player.inventory.getSlots()) if (s && !this.data.found[s.itemId]) { this.data.found[s.itemId] = true; n++; }
    if (n) this.changed();
  },
  /** Forgets everything (the journal's own "start over" button). */
  clear() { this.data = emptyJournal(); this.fight = null; this.noteStart(); this.save(); },
};

// ---------------------------------------------------------------- listening
encounterEvents.addEventListener('enemydefeated', e => Journal.defeat(e.detail.enemy));
encounterEvents.addEventListener('bossdefeated', e => Journal.bossWon(e.detail.boss));
encounterEvents.addEventListener('playerhurt', () => { if (Journal.fight) Journal.fight.hit = true; });
encounterEvents.addEventListener('enemyhit', e => { const f = Journal.fight; if (f && e.detail.source === 'pet' && e.detail.enemy === f.boss) f.pet = true; });
globalThis.addEventListener?.('pagehide', () => { if (Journal.saveT > 0) Journal.save(); });   // don't lose the last few seconds
gameEvents.addEventListener('chestopened', () => Journal.add('chests'));
gameEvents.addEventListener('questcomplete', () => Journal.add('quests'));
gameEvents.addEventListener('crafted', () => Journal.add('crafted'));
gameEvents.addEventListener('rarefriend', () => Journal.add('rareFriends'));
gameEvents.addEventListener('petfound', e => { Journal.data.pets[e.detail.id] = true; Journal.changed(); });
/** The bag: every kind of item found, and every kind found at Legendary rarity (src/core/Game.js hooks this up). */
export function watchBag(bag) {
  bag.addEventListener('itemadded', e => {
    const { itemId, props } = e.detail, d = Journal.data; let ch = false;
    if (!d.found[itemId]) { d.found[itemId] = true; ch = true; }
    if (props?.rarity === 'legendary' && !d.legendary[itemId]) { d.legendary[itemId] = true; ch = true; }
    if (ch) Journal.changed();
  });
}
