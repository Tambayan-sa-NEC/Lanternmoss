/* BOUNTY BOARD (TODO 34, config/bounties.js): a notice board near each village square posting the day's small tasks
   (bountyRules.js generates them from the planet's config). Defeats, catches and harvests on this planet count from the
   moment a set is posted; bring tasks are checked in the bag and handed over at the board. E at the board opens
   src/ui/BountyUI.js to claim finished ones: coins, the planet's material and now and then a rare piece of gear.
   A new day posts a new set. Saved per planet (SAVE_SYSTEMS.bounties): the day, each task's count and what was claimed. */
import { BOUNTIES } from '../config/bounties.js';
import { PLANETS } from '../config/planets.js';
import { encounterEvents } from '../combat/events.js';
import { ctx } from '../core/context.js';
import { emit, gameEvents } from '../core/events.js';
import { sparkles } from '../fx/sparkles.js';
import { bountyBoard } from '../models/stations.js';
import { addCollider, freeOfColliders, removeCollider } from '../physics/colliders.js';
import { toonMat } from '../render/materials.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { batchParts } from '../render/staticParts.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist, matrixAt, offsetDir, tangentToward } from '../utils/sphere.js';
import { isFree } from '../world/placement.js';
import { dryGround, groundHeight, slopeAt } from '../world/terrain.js';
import { bountyMatches, bountyProgress, cleanBountyState, emptyBountyState, generateBounties, itemLabel } from './bountyRules.js';
import { dayClock } from './dayClock.js';
import { rollGear } from './loot.js';
import { grantItem } from './pickups.js';
import { gainCoins } from './wallet.js';

const NOTE = { posted: 0xfff3d6, ready: 0xffd36b };

export const Bounties = {
  state: emptyBountyState(), list: [], board: null, planet: -1, onChange: null, onOpen: null, bag: null,

  /** This planet's board, clear of `avoid` ([[dir, radius]]: the farm, the crafting corner). Returns [dir, radius]. */
  setup(world, planet, avoid = []) {
    this.clear(); this.planet = planet; this.post(dayClock.day);
    const bag = ctx.player?.inventory;                       // bring tasks turn gold as soon as the bag holds enough
    if (bag && bag !== this.bag) { this.bag = bag; bag.addEventListener('change', () => this.refresh()); }
    const B = BOUNTIES.board, seed = PLANETS[planet].seed % 7;
    let at = null;
    for (let ring = B.distance[0]; ring <= B.distance[1] && !at; ring += 1) for (let a = 0; a < 6.28 && !at; a += 0.21) {
      const d = offsetDir(world.spawnDir, a + seed * 0.9 + 0.7, ring);
      if (!isFree(d, B.radius) || !freeOfColliders(d, B.radius + 0.3) || slopeAt(d) > 0.3 || !dryGround(d)) continue;
      if (avoid.some(([c, r]) => arcDist(d, c) < r + B.radius + 1)) continue;
      at = d;
    }
    if (!at) return null;
    const fwd = tangentToward(at, world.spawnDir), parts = bountyBoard();
    batchParts(parts.root, new Set([...parts.glow, ...parts.notes])); parts.root.matrixAutoUpdate = false;
    parts.root.matrix.copy(matrixAt(at.clone().multiplyScalar(groundHeight(at) - 0.04), at, fwd)); scene.add(parts.root);
    this.board = { dir: at, fwd, parts, collider: addCollider(at, 0.5, { r: 0.9, base: 0, top: 2.3 }) };
    this.refresh(); return [at, B.radius + 1];
  },
  clear() {
    if (this.board) { scene.remove(this.board.parts.root); disposeTree(this.board.parts.root); removeCollider(this.board.collider); }
    this.board = null; this.planet = -1; this.list = []; this.state = emptyBountyState(dayClock.day);
  },
  /** A fresh set for `day` (nothing counted, nothing claimed). */
  post(day) { this.state = emptyBountyState(day); this.list = this.planet >= 0 ? generateBounties(PLANETS[this.planet], this.planet, day) : []; },

  toJSON() { return { ...this.state, counts: [...this.state.counts], claimed: [...this.state.claimed] }; },
  load(data) {
    const s = cleanBountyState(data);
    if (s.day === dayClock.day) { this.state = s; this.list = generateBounties(PLANETS[this.planet], this.planet, s.day); }
    else this.post(dayClock.day);
    this.refresh();
  },

  /** { have, need, done } for task i. */
  progress(i) { const b = this.list[i]; return b ? bountyProgress(b, this.state.counts[i], id => ctx.player.inventory.count(id)) : null; },
  ready(i) { return !this.state.claimed[i] && !!this.progress(i)?.done; },
  /** A defeat / catch / harvest on this planet: counts toward every open task it matches. */
  record(event) {
    if (!ctx.started || this.planet !== ctx.planet) return;
    this.list.forEach((b, i) => {
      if (this.state.claimed[i] || !bountyMatches(b, event) || this.state.counts[i] >= b.count) return;
      if (++this.state.counts[i] >= b.count) { toast(`Bounty done: ${b.title}. Claim it at the board!`); audio.sparkle(); }
    });
    this.refresh();
  },
  /** Claims task i at the board: hands over bring items, pays the reward. Returns { ok, message }. */
  claim(i) {
    const b = this.list[i], P = ctx.player;
    if (!b || this.state.claimed[i]) return { ok: false, message: 'Already claimed.' };
    if (!this.progress(i).done) return { ok: false, message: b.kind === 'bring' ? `You need ${b.count} ${itemLabel(b.target)} in your bag.` : 'Not finished yet.' };
    if (b.kind === 'bring') P.inventory.remove(b.target, b.count);
    this.state.claimed[i] = true;
    const r = b.reward, parts = [`+${r.coins} ✦`]; gainCoins(r.coins);
    for (const [item, n] of r.items) { grantItem(item, n); parts.push(`${n}× ${itemLabel(item)}`); }
    if (r.gear) { const g = rollGear(this.planet, P.charId, 'rare'); if (g) { grantItem(g.item, g.qty, g.props); parts.push(`a ${g.props.rarity} ${itemLabel(g.item)}`); } }
    if (this.board) sparkles.emit(this.top(1.5), { count: 30, color: 0xffd36b, speed: 2.4, up: this.board.dir, upBias: 1, life: 0.8, size: 0.32 });
    audio.melody?.(); emit('bountydone', { kind: b.kind, id: b.id }); this.refresh();
    return { ok: true, message: `Bounty claimed: ${parts.join(' · ')}` };
  },

  top(h = 1) { const d = this.board.dir; return d.clone().multiplyScalar(groundHeight(d) + h); },
  /** The E prompt by the board (a star when something is ready to claim). */
  target() {
    if (!this.board || this.planet !== ctx.planet) return null;
    const dist = arcDist(ctx.player.up, this.board.dir); if (dist > BOUNTIES.board.reach) return null;
    const ready = this.list.some((_, i) => this.ready(i));
    return { dist, label: `Read the bounty board${ready ? ' ★' : ''}`, at: this.top(2.6), run: () => this.onOpen?.() };
  },
  /** Notes on the board: cream while posted, gold when ready to claim, gone once claimed. */
  refresh() {
    this.board?.parts.notes.forEach((n, i) => {
      n.visible = !!this.list[i] && !this.state.claimed[i];
      n.material = toonMat(this.ready(i) ? NOTE.ready : NOTE.posted);
    });
    this.onChange?.();
  },
  update() {
    if (this.planet < 0) return;
    if (dayClock.day !== this.state.day) { this.post(dayClock.day); this.refresh(); if (ctx.started) toast('New bounties are posted on the village board.'); }
    if (this.board) { const t = ctx.time; this.board.parts.glow.forEach(g => g.scale.setScalar(1 + Math.sin(t * 3) * 0.08)); }
  },
};

encounterEvents.addEventListener('enemydefeated', e => { const m = e.detail.enemy; if (!m.owner && !m.def?.object) Bounties.record({ kind: 'defeat', type: m.type }); });
gameEvents.addEventListener('fishcaught', e => Bounties.record({ kind: 'fish', itemId: e.detail.itemId }));
gameEvents.addEventListener('harvested', () => Bounties.record({ kind: 'harvest' }));
