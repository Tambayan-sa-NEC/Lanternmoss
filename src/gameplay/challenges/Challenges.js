/* NPC CHALLENGES: mini games offered through the normal talk flow.
   Challenge data lives in CHALLENGES (src/config/challenges.js); each entry names a `kind` whose activity code is in
   CHALLENGE_KINDS (./kinds.js). Lifecycle: offer (Dialog line with a choice) -> accept / decline -> run ->
   success / fail -> rewards, progress and a reaction line from the giver the next time you talk. */
import { CHALLENGES } from '../../config/challenges.js';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { audio } from '../../systems/AudioSystem.js';
import { hideChallengePanel, renderChallengePanel, showChallengePanel, showChallengeResult } from '../../ui/challengePanel.js';
import { Dialog } from '../../ui/Dialog.js';
import { arcDist } from '../../utils/sphere.js';
import { CHALLENGE_KINDS } from './kinds.js';
import { REWARDS } from './rewards.js';

const fillText = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const FAIL_REASONS = { timeout: 'Out of time!', left: 'You wandered too far.', fainted: 'You fainted.', abandoned: 'You gave up.' };

/** Challenge runtime. progress[id] is the player's record for that challenge (kept in memory, like `buffs`). */
export const Challenges = {
  run: null, progress: {}, nudgeT: 2,
  state(id) { return this.progress[id] || (this.progress[id] = { attempts: 0, wins: 0, losses: 0, best: null, last: null, readyAt: 0, reaction: null }); },
  idsFor(npc) { return Object.keys(CHALLENGES).filter(id => CHALLENGES[id].giver === npc.name); },
  isAvailable(id) { const c = CHALLENGES[id], s = this.state(id); return !this.run && (c.repeatable || !s.wins) && ctx.time >= s.readyAt; },
  availableFor(npc) { return this.idsFor(npc).find(id => this.isAvailable(id)) || null; },
  /** How many different challenges have been won at least once. */
  clearedCount() { return Object.values(this.progress).filter(p => p.wins).length; },
  say(id, key, fallback = 'fail') {
    const c = CHALLENGES[id], s = this.state(id), r = this.run;
    return fillText(c.text[key] ?? c.text[fallback] ?? '', { time: c.timeLimit, wins: s.wins,
      best: s.best != null ? s.best.toFixed(1) + 's' : '—', progress: r && r.id === id ? r.kind.progress(r) : '' });
  },
  /** Dialog line provider. Returns a challenge line for this NPC, or null to fall back to its normal lines. */
  lineFor(npc) {
    const r = this.run;
    if (r && r.npc === npc) return { t: this.say(r.id, 'active'), choice: { yes: 'Keep going', no: 'Give up',
      onYes: () => null, onNo: () => { this.finish('abandoned'); return this.takeReaction(r.id); } } };
    for (const id of this.idsFor(npc)) if (this.state(id).reaction) return this.takeReaction(id);
    const id = this.availableFor(npc); if (!id) return null;
    const s = this.state(id);
    return { t: this.say(id, s.attempts ? 'offerAgain' : 'offer', 'offer'), choice: { yes: 'Accept', no: 'Decline',
      onYes: () => { this.start(id, npc); return { t: this.say(id, 'accept') }; },
      onNo: () => { s.readyAt = ctx.time + (CHALLENGES[id].declineCooldown ?? 20); return { t: this.say(id, 'decline') }; } } };
  },
  takeReaction(id) {
    const s = this.state(id), key = s.reaction; s.reaction = null;
    return key ? { t: this.say(id, key, key === 'success' ? 'success' : 'fail') } : null;
  },
  start(id, npc) {
    if (this.run) return;
    const c = CHALLENGES[id]; this.state(id).attempts++;
    const run = this.run = { id, def: c, kind: CHALLENGE_KINDS[c.kind], npc, anchor: npc.up.clone(), t: -1.5, done: false };   // 1.5s to get ready
    run.kind.start(run);
    showChallengePanel();
    emote(npc, 'star', '#ffb03d'); audio.sparkle();
  },
  update(dt) {
    const r = this.run, player = ctx.player;
    if (!r) {      // givers with something to offer wave a "!" when you're nearby
      if ((this.nudgeT -= dt) < 0) {
        this.nudgeT = 6;
        for (const n of ctx.npcs) if (!n.talking && this.availableFor(n) && n.pos.distanceTo(player.pos) < 16) emote(n, '!', '#ffb03d');
      }
      return;
    }
    r.t += dt;
    const c = r.def, left = c.timeLimit - Math.max(0, r.t), away = arcDist(player.up, r.anchor);
    const result = player.dead ? 'fainted' : away > c.maxRange ? 'left' : r.kind.update(r, dt) || (left <= 0 ? 'timeout' : null);
    if (result) { this.finish(result); return; }
    const warn = away > c.maxRange * 0.8;
    renderChallengePanel({ title: c.title, progress: r.kind.progress(r), timeText: r.t < 0 ? 'Get ready...' : left.toFixed(1) + 's',
      left, limit: c.timeLimit, warn, footer: warn ? 'Too far, head back!' : `Talk to ${r.npc.name} to give up` });
  },
  /** Resolve the active run exactly once: clean up, record progress, grant rewards, queue the giver's reaction. */
  finish(result) {
    const r = this.run; if (!r || r.done) return; r.done = true; this.run = null;
    r.kind.cleanup(r); hideChallengePanel();
    const c = r.def, s = this.state(r.id), win = result === 'success';
    s.last = result; s.reaction = result; s.readyAt = ctx.time + (c.cooldown ?? 30);
    let sub = FAIL_REASONS[result] || '';
    if (win) {
      s.wins++; const t = Math.max(0, r.t); if (s.best == null || t < s.best) s.best = t;
      const reward = (s.wins > 1 && c.repeatReward) || c.reward || {};
      sub = [`${t.toFixed(1)}s`, ...Object.entries(reward).map(([k, v]) => REWARDS[k](v))].join(' · ');
      if (s.wins === 1 && c.unlockLines) r.npc.def.lines.push(...c.unlockLines.map(t => ({ t })));
      audio.melody(); emote(r.npc, 'heart');
    } else { s.losses++; audio.tone(392, 0.3, 'triangle', 0.06); audio.tone(311, 0.5, 'triangle', 0.06, 0.25); }
    if (Dialog.open && Dialog.npc === r.npc && Dialog.choice) Dialog.close();   // a stale "Keep going / Give up" prompt
    showChallengeResult(win, c.title, sub);
  },
  /** Abandons any active run without rewards or reactions, and forgets all records (a fresh adventure). */
  reset() {
    const r = this.run; if (r) { r.done = true; this.run = null; r.kind.cleanup(r); hideChallengePanel(); }
    this.progress = {};
  },
  tagFor(npc) { return this.availableFor(npc) ? ' <span class="ctag">✦ Challenge</span>' : ''; },
};
