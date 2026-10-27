/* REMATCHES (TODO 31a, config/rematch.js): challenging an encounter you have already beaten, harder, for its own
   loot. The lifecycle lives here; each world's rematch kit is written in its own stage (31b-31f).
     spots      where this world's encounters stand, recorded when the planet is populated, with the def each one
                spawned with. A beaten boss is disposed and gone from the world within a second of falling, so a
                rematch cannot re-arm the old body: it needs to know where to put a new one, and **which** one --
                a planet's mini boss may be a variant (Frostveil's Frost Hydra is a Hydra with its own name,
                colours and health), and the challenger must be that same encounter (31d)
     the ladder is kept per encounter, keyed `<planet>:<type>`, not per monster type: two worlds may field the
                same species, and beating one of them is not practice for the other (31d)
     offers()   the beaten encounters here whose kit is ready, whose cooldown has run out, and whose treasure has
                been collected: a chest still lying where it fell is yours to open before anything else
     target()   the "E Challenge <boss> again" prompt where one waits (Houses.js currentInteraction)
     begin()    spawns it afresh at that spot with this tier's numbers and its rematch kit, and sets it on the hero
     the kit    `def.rematch.attacks` and `.phases` replace the campaign ones **for that fight only** (31b-31f), so
                a rematch is a different fight rather than the same one with bigger numbers. The encounter's own
                module carries the moves; campaign phases that never name them keep them out of the first fight
     a win      rolls this tier's chest where it falls, plus that encounter's own `rematch.extra`, and counts one
   **The campaign never moves.** The rematch is a fresh encounter, not the lair's own boss, so
   PlanetProgression.onBossDefeated (which only answers for `ctx.boss`, and only once per world) cannot fire for
   it: no trophy, portal opening, key, achievement or first-win banner can repeat. The sealed lair, the waking
   sequence and the arena ring stay the campaign's ceremony; a rematch simply comes for you.
   A rematch in progress is not saved: a reload, a journey or a faint ends it and leaves the spot offering again.
   Saved per adventure: how many rematches of each encounter are won. */
import { COMBAT } from '../config/combat.js';
import { PLANETS } from '../config/planets.js';
import { REMATCH, rematchReady, rematchTier } from '../config/rematch.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { encounterEvents } from '../combat/events.js';
import { addEnemy } from '../combat/spawning.js';
import { Chests } from './Chests.js';
import { grantItem } from './pickups.js';
import { gainXp } from '../progression/experience.js';
import { gainCoins } from './wallet.js';
import { audio } from '../systems/AudioSystem.js';
import { showBanner } from '../ui/banner.js';
import { toast } from '../ui/toast.js';
import { arcDist } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const shortName = def => def.name.split(',')[0];

/** The ladder's key for an encounter: its world and its type. A spot, a key, or a bare type (meaning this world's
    encounter of that type) all resolve to the same string, so callers can use whichever they have. */
export function encounterKey(what) {
  if (what && typeof what === 'object') return what.key ?? `${ctx.planetId}:${what.type}`;
  return typeof what === 'string' && what.includes(':') ? what : `${ctx.planetId}:${what}`;
}

export const Rematch = {
  wins: {},            // `<planet>:<type>` -> rematches already won, this adventure
  spots: [],           // { key, type, at, def, mini, portalId } for this world's encounters (rebuilt on every visit)
  active: null,        // the planet id of a rematch being fought right now (never saved)
  fighting: null,      // the encounter itself (never saved)
  fightingSpot: null,  // the spot it got up from, so a win is counted on that encounter's ladder (never saved)
  cool: {},            // planet id -> seconds before that world offers another (never saved)
  progression: null,   // PlanetProgression, for the worlds and mini bosses it remembers

  toJSON() { return { wins: { ...this.wins } }; },
  load(data) { this.wins = { ...(data?.wins ?? {}) }; this.clear(); },
  reset() { this.wins = {}; this.clear(); },
  clear() { this.active = null; this.fighting = null; this.fightingSpot = null; this.spots = []; this.cool = {}; },

  init(progression = null) {
    if (progression) this.progression = progression;
    encounterEvents.addEventListener('enemydefeated', e => this.onDefeated(e.detail.enemy));
  },

  /** Called once a planet is populated: where its boss and mini bosses stand, whether or not they are still up,
      and the def each spawned with (a planet's variant overrides live there and nowhere else). */
  register(boss, miniBosses = []) {
    this.spots = [];
    const spot = (e, mini) => ({ key: encounterKey(e.type), type: e.type, at: e.home.clone(), def: e.def, mini, portalId: e.portalId ?? null });
    if (boss?.type) this.spots.push(spot(boss, false));
    for (const m of miniBosses) if (m?.type) this.spots.push(spot(m, true));
  },

  /** How many rematches of this encounter the hero has already won. Takes a spot, a `<planet>:<type>` key, or a
      bare type, which means this world's encounter of that type. */
  won(what) { return this.wins[encounterKey(what)] ?? 0; },
  /** What the next one is worth. */
  tier(what) { return rematchTier(this.won(what)); },

  /** Has the hero beaten this spot's encounter? */
  beaten(spot) {
    return spot.mini ? !!this.progression?.miniDefeated?.has(spot.portalId)
      : !!this.progression?.defeated?.has(ctx.planetId);
  },

  /** Treasure still lying unopened where this encounter fell. Collect it before asking for another fight: it also
      keeps the "challenge again" prompt from standing on top of the "open the chest" one. */
  treasureAt(spot) {
    return Chests.list.some(c => !c.opened && arcDist(c.up ?? spot.at, spot.at) <= REMATCH.reach + 2);
  },

  /** Every beaten encounter here that will fight again right now. */
  offers() {
    if (this.active || this.cool[ctx.planetId] > 0 || !ctx.started) return [];
    return this.spots.filter(s => rematchReady(COMBAT.enemies[s.type]) && this.beaten(s) && !this.treasureAt(s));
  },
  /** Is anything offered on this world at all? */
  get offered() { return this.offers().length > 0; },

  /** The "E Challenge ... again" prompt where a beaten encounter waits. */
  target() {
    if (ctx.indoors || ctx.player.dead) return null;
    let best = null;
    for (const spot of this.offers()) {
      const dist = arcDist(ctx.player.up, spot.at);
      if (dist > REMATCH.reach || (best && dist >= best.dist)) continue;
      const next = this.won(spot) + 1;
      best = { dist, label: `Challenge ${shortName(spot.def)} again <span class="ctag">(rematch ${next})</span>`,
        at: spot.at.clone().multiplyScalar(groundHeight(spot.at) + 3.2), run: () => this.begin(spot) };
    }
    return best;
  },

  /** This encounter's def for a rematch at tier `t`: this world's numbers raised, and its rematch kit in place of
      the campaign one. Built from a fresh scaled def, so the authored table is never touched. */
  armedDef(spot, t) {
    const here = spot.def, kit = here.rematch ?? {};
    return { ...here, hp: Math.round(here.hp * t.hp), rematchTier: t,
      damage: here.damage == null ? here.damage : here.damage * t.damage,
      speed: here.speed * t.speed, xp: Math.round(here.xp * t.xp),
      respawn: 0, miniBoss: here.miniBoss,
      attacks: { ...here.attacks, ...(kit.attacks ?? {}) },            // its new moves, for this fight only
      phases: kit.phases ? kit.phases.map(p => ({ ...p })) : here.phases };
  },

  /** Spawns the encounter afresh at its spot and sets it on the hero. */
  begin(spot = this.offers()[0]) {
    if (!spot || !this.offers().includes(spot)) return false;
    const type = spot.type, t = this.tier(spot), tier = this.won(spot) + 1;
    const e = addEnemy(type, spot.at, this.armedDef(spot, t));
    e.rematch = true;                                                  // never the campaign's boss, whatever it is
    this.active = ctx.planetId; this.fighting = e; this.fightingSpot = spot;
    showBanner(`${shortName(e.def)} stirs again`, `Rematch ${tier}: it has not been idle.`);
    audio.roar(); e.aggro();
    emit('rematchbegun', { planet: ctx.planetId, type, tier });
    return true;
  },

  /** An encounter has fallen. Only the rematch this module started is ours. */
  onDefeated(e) {
    if (!e || e !== this.fighting) return;
    const spot = this.fightingSpot, type = e.type, t = this.tier(spot), tier = this.won(spot) + 1;
    this.wins[encounterKey(spot)] = tier;
    this.active = null; this.fighting = null; this.fightingSpot = null; this.cool[ctx.planetId] = REMATCH.cooldown;
    const kill = COMBAT.enemies[type];
    if (t.coins) gainCoins(Math.round((kill.xp ?? 0) * t.coins), e.center());
    if (t.xp) gainXp(Math.round((kill.xp ?? 0) * t.xp));
    Chests.spawnRematchChest(e.up, t.loot, `${ctx.planetId}:rematch:${type}:${tier}`);
    for (const [item, qty] of (spot?.def ?? kill).rematch?.extra ?? []) grantItem(item, qty);   // what this encounter alone gives
    showBanner(`${shortName(e.def)} falls again`, `Rematch ${tier} won. Its treasure is waiting.`);
    audio.melody();
    emit('rematchwon', { planet: ctx.planetId, type, tier });
  },

  /** A rematch never survives a journey, a reload or a faint: the challenger simply leaves. */
  cancel() {
    if (!this.active) return;
    const e = this.fighting;
    this.active = null; this.fighting = null; this.fightingSpot = null;
    if (e?.alive) e.vanish();
    toast('The rematch is called off.');
  },

  update(dt) {
    for (const id of Object.keys(this.cool)) { this.cool[id] -= dt; if (this.cool[id] <= 0) delete this.cool[id]; }
    if (!this.active) return;
    if (this.active !== ctx.planetId || ctx.player.dead || !this.fighting?.alive) this.cancel();
  },

  /** Which released worlds have a rematch waiting, for the lantern gate's destination list: a beaten boss, or a
      beaten mini boss of that world. */
  waiting(defeated, miniDefeated = this.progression?.miniDefeated) {
    const out = new Set();
    for (const p of PLANETS) {
      if (defeated?.has?.(p.id) && p.boss?.type && rematchReady(COMBAT.enemies[p.boss.type])) { out.add(p.id); continue; }
      for (const m of p.miniBosses ?? []) {
        if (!rematchReady(COMBAT.enemies[m.type])) continue;
        for (const id of miniDefeated ?? []) if (typeof id === 'string' && id.startsWith(`${p.id}:mini:`)) { out.add(p.id); break; }
      }
    }
    return out;
  },
};
