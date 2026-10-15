/* TALENTS (TODO 28b, config/talents.js): the ranks the hero has learned this adventure, and their kit with those
   talents applied (combat/casting.js kit() reads it, so every cast uses it). Points come from the level
   (progression/talentRules.js), so only the ranks are saved (SAVE_SYSTEMS.talents); a load re-checks them against the
   level. Old Bramble resets them for free (wizardLine). Players only see a tree once it is released. */
import { CHARACTERS } from '../config/characters.js';
import { TALENTS } from '../config/talents.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { cleanTalents, learnProblem, pointsEarned, pointsSpent, talentKit } from '../progression/talentRules.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';

export const Talents = {
  ranks: {}, cache: null, onChange: null,

  tree(hero = ctx.player.charId) { return TALENTS.trees[hero]; },
  /** True when the hero's tree is open to players (released, with talents in it). */
  get open() { const t = this.tree(); return t?.released === true && t.talents.length > 0; },
  get earned() { return pointsEarned(ctx.player.level); },
  get spent() { return pointsSpent(this.tree(), this.ranks); },
  get available() { return this.earned - this.spent; },

  /** The hero's abilities with their talents (the base table itself when none are learned). */
  kit() {
    const hero = ctx.player.charId, key = `${hero}:${JSON.stringify(this.ranks)}`;
    if (this.cache?.key !== key) this.cache = { key, kit: talentKit(CHARACTERS[hero].abilities, this.tree(hero), this.ranks) };
    return this.cache.kit;
  },

  /** One more rank of `id`. Returns { ok, message }. */
  learn(id) {
    const tree = this.tree(), problem = learnProblem(tree, this.ranks, id, ctx.player.level);
    if (problem) { audio.fizzle?.(); return { ok: false, message: problem }; }
    this.ranks = { ...this.ranks, [id]: (this.ranks[id] ?? 0) + 1 }; this.changed(); audio.sparkle?.();
    const t = tree.talents.find(x => x.id === id);
    return { ok: true, message: `Learned ${t.name}${t.max > 1 ? ` (rank ${this.ranks[id]} of ${t.max})` : ''}.` };
  },
  /** Every point back, and the base kit (Old Bramble's free reset). */
  reset() { const had = this.spent; this.ranks = {}; this.changed(); return had; },
  /** A new adventure: nothing learned. */
  clear() { this.ranks = {}; this.cache = null; },
  changed() { this.cache = null; emit('talentschanged', { ranks: { ...this.ranks } }); this.onChange?.(); },

  toJSON() { return { ranks: { ...this.ranks } }; },
  load(data) { this.ranks = cleanTalents(data, this.tree(), ctx.player.level).ranks; this.cache = null; this.onChange?.(); },

  /** Listens for level-ups (from Game: a released tree announces each new point). */
  init(levelEvents) {
    levelEvents.addEventListener('levelup', e => {
      if (this.open && pointsEarned(e.detail.level) > pointsEarned(e.detail.from)) toast('A talent point! Spend it on the Talents page (pause menu).');
    });
  },

  /** Old Bramble's offer, when the hero has talents to reset; otherwise null (their usual lines follow). */
  wizardLine(npc, chat) {
    if (npc.name !== TALENTS.wizard || !this.open || this.spent === 0) return null;
    return { t: 'Your talents feel tangled, dear. I can unpick them all for you, free of charge. Shall I?', e: 'happy',
      choice: { yes: 'Reset my talents', no: 'Just chatting',
        onYes: () => { const n = this.reset(); return { t: `There. ${n} point${n === 1 ? '' : 's'} back in your pocket: spend them however you like.`, e: 'happy' }; },
        onNo: () => chat(npc) } };
  },
};

