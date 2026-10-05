/* QUESTS runtime (data: src/config/quests.js). Offered through the normal talk flow (Dialog.lineProvider, before
   challenges and the shop): accept, then work through the steps at your own pace. Collect / reach steps tick off by
   themselves, defeat steps count monsters ('enemydefeated' encounter events), deliver / talk steps happen when you
   speak to the right villager. The tracked quest shows in the HUD chips and on the compass.
   state[id] = { status: 'new' | 'active' | 'done' | 'dropped', step, n (defeat count), readyAt (after declining) }. */
import { PLANETS } from '../../config/planets.js';
import { QUESTS } from '../../config/quests.js';
import { SHOP } from '../../config/shop.js';
import { encounterEvents } from '../../combat/events.js';
import { ctx } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { itemRegistry } from '../../items/ItemRegistry.js';
import { gainXp } from '../../progression/experience.js';
import { audio } from '../../systems/AudioSystem.js';
import { showBanner } from '../../ui/banner.js';
import { toast } from '../../ui/toast.js';
import { grantItem } from '../pickups.js';
import { gainCoins } from '../wallet.js';

const DECLINE_WAIT = 45;                       // seconds before a declined quest is offered again
const itemName = id => itemRegistry.get(id)?.name ?? id;

export const Quests = {
  state: {}, tracked: null, checkT: 0,
  init() { encounterEvents.addEventListener('enemydefeated', e => this.onDefeat(e.detail.enemy)); },
  reset() { this.state = {}; this.tracked = null; },
  st(id) { return this.state[id] ??= { status: 'new', step: 0, n: 0, readyAt: 0 }; },
  step(id) { return QUESTS[id].steps[this.st(id).step]; },
  active() { return Object.keys(QUESTS).filter(id => this.st(id).status === 'active'); },
  done() { return Object.keys(QUESTS).filter(id => this.st(id).status === 'done'); },
  /** A quest this villager can offer right now, or null. */
  offerable(npc) {
    return Object.keys(QUESTS).find(id => { const q = QUESTS[id], s = this.st(id);
      return q.giver === npc.name && s.status === 'new' && ctx.planet >= (q.planet ?? 0) && ctx.time >= s.readyAt; }) ?? null;
  },
  /** Dialog line: a quest step that needs this villager right now (hand-ins come before anything else), or null. */
  stepLineFor(npc) {
    for (const id of this.active()) {
      const st = this.step(id); if ((st.kind !== 'deliver' && st.kind !== 'talk') || st.to !== npc.name) continue;
      const bag = ctx.player.inventory;
      if (st.kind === 'deliver' && !bag.has(st.item, st.count))
        return { t: `You have ${bag.count(st.item)} of the ${st.count} ${itemName(st.item)} I need. Come back when you have them all!`, e: 'thinking' };
      if (st.kind === 'deliver') bag.remove(st.item, st.count);
      const finished = this.advance(id);
      return { t: finished ? `${st.say} ${QUESTS[id].text.done}` : st.say, e: 'excited' };
    }
    return null;
  },
  /** Dialog line: this villager offers you a quest (accept / not now), or null. */
  offerFor(npc) {
    const id = this.offerable(npc); if (!id) return null;
    const q = QUESTS[id];
    return { t: q.text.offer, choice: { yes: 'Accept quest', no: 'Not now',
      onYes: () => { this.start(id); return { t: q.text.accept, e: 'excited' }; },
      onNo: () => { this.st(id).readyAt = ctx.time + DECLINE_WAIT; return { t: q.text.decline, e: 'sad' }; } } };
  },
  start(id) {
    const s = this.st(id); Object.assign(s, { status: 'active', step: 0, n: 0 }); this.tracked = id;
    toast(`New quest: ${QUESTS[id].title}`); audio.sparkle(); this.check(id);
  },
  /** Finishes the current step (handing over its `give` items); returns true when that was the last step. */
  advance(id) {
    const s = this.st(id), done = this.step(id);
    for (const [item, n] of done.give ?? []) grantItem(item, n);
    s.step++; s.n = 0;
    if (s.step >= QUESTS[id].steps.length) { this.complete(id); return true; }
    toast(`${QUESTS[id].title}: ${this.step(id).text}`); audio.tone(880, 0.25, 'triangle', 0.05); audio.tone(1175, 0.3, 'triangle', 0.05, 0.12);
    return false;
  },
  complete(id) {
    const q = QUESTS[id], r = q.reward ?? {}, parts = []; this.st(id).status = 'done';
    if (r.coins) { gainCoins(r.coins); parts.push(`+${r.coins} ✦`); }
    if (r.xp) { gainXp(r.xp); parts.push(`+${r.xp} XP`); }
    for (const [item, n] of r.items ?? []) { grantItem(item, n); parts.push(`${n > 1 ? `${n}x ` : ''}${itemName(item)}`); }
    showBanner('Quest complete!', [q.title, ...parts].join(' · ')); audio.melody();
    if (this.tracked === id) this.tracked = this.active()[0] ?? null;
    emit('questcomplete', { id });                                      // (a pet may come with it: config/pets.js)
  },
  /** Ticks off steps that are already satisfied (items in the bag, planet reached), possibly several in a row. */
  check(id) {
    for (let guard = 0; guard < 10 && this.st(id).status === 'active'; guard++) {
      const st = this.step(id);
      const ok = (st.kind === 'collect' && ctx.player.inventory.count(st.item) >= st.count) || (st.kind === 'reach' && ctx.planet >= st.planet);
      if (!ok || this.advance(id)) return;
    }
  },
  onDefeat(e) {
    for (const id of this.active()) {
      const st = this.step(id), s = this.st(id);
      if (st.kind === 'defeat' && (st.enemy === 'any' || st.enemy === e.type) && ++s.n >= st.count) this.advance(id);
    }
  },
  /** Can the hero still get `count` of an item here: in the bag, growing on this planet, or sold at the shop? */
  obtainable(item, count) {
    return ctx.player.inventory.count(item) >= count || PLANETS[ctx.planet].forage.some(f => f.item === item) || SHOP.stock.some(s => s.item === item);
  },
  /** After travelling: quests that still need a villager who stayed behind are dropped; a step whose items can no
      longer be found (they grew on the planet you left) skips to the quest's next planet, or drops the quest. */
  onPlanetChange() {
    const here = new Set(ctx.npcs.map(n => n.name));
    for (const id of this.active()) {
      const q = QUESTS[id], s = this.st(id), rest = q.steps.slice(s.step), missing = [q.giver, ...rest.map(st => st.to).filter(Boolean)].find(n => !here.has(n));
      if (missing && rest.some(st => st.to === missing)) { s.status = 'dropped'; toast(`Quest dropped: ${q.title} (${missing} stayed behind)`); continue; }
      const st = this.step(id);
      if ((st.kind === 'collect' || st.kind === 'deliver') && !this.obtainable(st.item, st.count)) {
        const next = q.steps.findIndex((x, i) => i > s.step && x.kind === 'reach');
        if (next < 0) { s.status = 'dropped'; toast(`Quest dropped: ${q.title} (no more ${itemName(st.item)} to be found)`); }
        else { s.step = next; s.n = 0; toast(`${q.title}: that part is behind you now. Onward!`); this.check(id); }
      }
    }
    if (this.tracked && this.st(this.tracked).status !== 'active') this.tracked = this.active()[0] ?? null;
  },
  update(dt) {
    if ((this.checkT -= dt) > 0) return; this.checkT = 0.25;
    for (const id of this.active()) this.check(id);
    if (!this.tracked || this.st(this.tracked).status !== 'active') this.tracked = this.active()[0] ?? null;
  },
  /** { title, text, progress } of the tracked quest for the HUD, or null. */
  trackerInfo() {
    const id = this.tracked; if (!id) return null;
    const st = this.step(id), s = this.st(id);
    const progress = st.kind === 'collect' ? `${Math.min(st.count, ctx.player.inventory.count(st.item))}/${st.count}`
      : st.kind === 'defeat' ? `${s.n}/${st.count}` : st.kind === 'deliver' ? `${Math.min(st.count, ctx.player.inventory.count(st.item))}/${st.count}` : '';
    return { title: QUESTS[id].title, text: st.text, progress };
  },
  /** The villager the tracked quest needs next (deliver / talk), for the compass, or null. */
  target() {
    const id = this.tracked; if (!id) return null;
    const st = this.step(id); if (!st.to) return null;
    return ctx.npcs.find(n => n.name === st.to) ?? null;
  },
};
