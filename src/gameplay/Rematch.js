/* REMATCHES (TODO 31a, config/rematch.js): challenging a boss you have already beaten, harder, for its own loot.
   The lifecycle, and nothing else: the fights themselves keep their own kits, and each world's rematch kit lands in
   its own stage (31b-31f). Until a kit exists (`COMBAT.enemies[type].rematch`), a beaten lair stays quiet.
     offered    the boss of this world is beaten, its kit is ready, and its cooldown has run out
     target()   the "E Challenge <boss> again" prompt at the lair (gameplay/Houses.js currentInteraction)
     begin()    the boss is put back on its feet at this tier's numbers and woken; the arena ring closes as usual
     a win      rolls this tier's chest where it falls, and counts one more rematch for that encounter
   **The campaign never moves.** PlanetProgression.onBossDefeated already refuses a second win on a world it has
   recorded, so no trophy, no portal opening, no key, no achievement and no first-win banner can repeat; this module
   adds its own reward instead and touches none of that state. A rematch in progress is not saved as "in progress":
   a reload, a journey or a faint puts the lair back to beaten-and-offered, so nothing can be left half-woken.
   Saved per adventure: how many rematches of each encounter are won. */
import { COMBAT } from '../config/combat.js';
import { PLANETS } from '../config/planets.js';
import { REMATCH, rematchReady, rematchTier } from '../config/rematch.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { encounterEvents } from '../combat/events.js';
import { BossGate } from './BossGate.js';
import { Chests } from './Chests.js';
import { gainXp } from '../progression/experience.js';
import { gainCoins } from './wallet.js';
import { audio } from '../systems/AudioSystem.js';
import { showBanner } from '../ui/banner.js';
import { toast } from '../ui/toast.js';
import { arcDist } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const shortName = def => def.name.split(',')[0];

export const Rematch = {
  wins: {},            // encounter type -> rematches already won, this adventure
  active: null,        // the planet id of a rematch being fought right now (never saved)
  cool: {},            // planet id -> seconds before that lair offers another (never saved)

  toJSON() { return { wins: { ...this.wins } }; },
  load(data) { this.wins = { ...(data?.wins ?? {}) }; this.active = null; this.cool = {}; },
  reset() { this.wins = {}; this.active = null; this.cool = {}; },

  init() {
    encounterEvents.addEventListener('bossdefeated', e => this.onBossDefeated(e.detail.boss));
  },

  /** How many rematches of this encounter the hero has already won. */
  won(type) { return this.wins[type] ?? 0; },
  /** What the next one is worth. */
  tier(type) { return rematchTier(this.won(type)); },

  /** Is this world's boss beaten, with a rematch kit, and ready to be challenged again? */
  get offered() {
    const boss = ctx.boss;
    if (!boss || this.active || BossGate.state !== 'beaten') return false;
    if (!rematchReady(COMBAT.enemies[boss.type])) return false;        // 31b-31f: no kit, no rematch
    return !(this.cool[ctx.planetId] > 0);
  },

  /** The "E Challenge ... again" prompt at a beaten lair. */
  target() {
    if (!this.offered || ctx.indoors || ctx.player.dead || !ctx.started) return null;
    const lair = BossGate.lair, dist = arcDist(ctx.player.up, lair);
    if (dist > REMATCH.reach) return null;
    const boss = ctx.boss, next = this.won(boss.type) + 1;
    return { dist, label: `Challenge ${shortName(boss.def)} again <span class="ctag">(rematch ${next})</span>`,
      at: lair.clone().multiplyScalar(groundHeight(lair) + 3.2), run: () => this.begin() };
  },

  /** Puts the boss back on its feet at this tier's numbers and wakes it. */
  begin() {
    if (!this.offered) return false;
    const boss = ctx.boss, type = boss.type, t = this.tier(type), base = COMBAT.enemies[type];
    this.active = ctx.planetId;
    // Its own scaled stats, raised for this tier. The def is this encounter's copy, so the authored table is safe.
    boss.def = { ...boss.def, hp: Math.round(boss.def.hp * t.hp), rematchTier: t,
      damage: boss.def.damage == null ? boss.def.damage : boss.def.damage * t.damage,
      speed: boss.def.speed * t.speed, xp: Math.round(base.xp * t.xp) };
    boss.spawn(BossGate.lair);
    boss.dormant = true; boss.hidden = true; boss.selfCollider.active = false;
    BossGate.state = 'ready'; BossGate.styleBeacon();
    boss.root.visible = boss.shadow.visible = false;
    showBanner(`${shortName(boss.def)} stirs again`, `Rematch ${this.won(type) + 1}: it is stronger than you remember.`);
    audio.roar();
    emit('rematchbegun', { planet: ctx.planetId, type, tier: this.won(type) + 1 });
    BossGate.wake();
    return true;
  },

  /** A boss has fallen. Only a rematch win is ours; the first win belongs to the campaign. */
  onBossDefeated(boss) {
    if (!boss || this.active !== ctx.planetId || boss !== ctx.boss) return;
    const type = boss.type, t = this.tier(type), tier = this.won(type) + 1;
    this.wins[type] = tier;
    this.active = null; this.cool[ctx.planetId] = REMATCH.cooldown;
    const kill = COMBAT.enemies[type];
    if (t.coins) gainCoins(Math.round((kill.xp ?? 0) * t.coins), boss.center());
    if (t.xp) gainXp(Math.round((kill.xp ?? 0) * t.xp));
    Chests.spawnRematchChest(boss.up, t.loot, `${ctx.planetId}:rematch:${tier}`);
    showBanner(`${shortName(boss.def)} falls again`, `Rematch ${tier} won. Its treasure is waiting.`);
    audio.melody();
    emit('rematchwon', { planet: ctx.planetId, type, tier });
  },

  /** A rematch never survives a journey, a reload or a faint: the lair simply goes back to beaten. */
  cancel() {
    if (!this.active) return;
    this.active = null;
    const boss = ctx.boss;
    if (boss?.alive) { boss.vanish(); }
    if (BossGate.state !== 'beaten') { BossGate.state = 'beaten'; BossGate.styleBeacon(); }
    toast('The rematch is called off.');
  },

  update(dt) {
    for (const id of Object.keys(this.cool)) { this.cool[id] -= dt; if (this.cool[id] <= 0) delete this.cool[id]; }
    if (this.active && (this.active !== ctx.planetId || ctx.player.dead)) this.cancel();
  },

  /** Which released worlds have a rematch waiting, for the lantern gate's destination list. */
  waiting(defeated) {
    const out = new Set();
    for (const p of PLANETS) {
      if (!defeated?.has?.(p.id) || !p.boss?.type) continue;
      if (rematchReady(COMBAT.enemies[p.boss.type])) out.add(p.id);
    }
    return out;
  },
};
