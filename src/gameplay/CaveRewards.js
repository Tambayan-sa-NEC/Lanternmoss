/* CAVE REWARDS (TODO 29d, config/dungeons.js): what a cave gives out, and what it remembers.
   The fixtures themselves are placed by `caveFixtures` (world/caveLayout.js) from each room's own id, so a cave
   always holds the same chests and veins; this module builds them in the room frame, hands out their loot and keeps
   the progress that must survive leaving, fainting, reloading and the cave being rebuilt:
     opened   chest ids already emptied            mined    vein ids already worked out
     cleared  rooms whose monsters have fallen     visited  rooms the hero has walked into
   A room's wandering monsters (29f, CAVES[].roster) come in the first time the hero steps into it, and stay gone
   once the room is cleared.
   Progress is saved per planet (core/save.js `caves`), keyed by cave id, so each planet's cave is its own: travelling
   by portal never carries one cave's progress into another. Nothing is handed out twice, because a chest or a vein
   that is already in `opened` / `mined` is rebuilt empty.
   Mining a cave vein follows the surface rules (a pickaxe, a few swings: config/resources.js GATHER), but in the
   cave's flat room frame rather than on the planet's sphere. */
import * as THREE from 'three';
import { CAVE, CAVE_VEINS, CAVES } from '../config/dungeons.js';
import { CHEST_KINDS } from '../config/chests.js';
import { GATHER } from '../config/resources.js';
import { TOOL_KINDS } from '../config/items.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { encounterEvents } from '../combat/events.js';
import { sparkles } from '../fx/sparkles.js';
import { buildChestModel } from '../models/chest.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { LocalLights } from '../render/lighting.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { damp } from '../utils/math.js';
import { rng } from '../utils/random.js';
import { caveFixtures, caveMonsters, roomAt } from '../world/caveLayout.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { enemyDef } from '../combat/enemyDefs.js';
import { Gathering } from './Gathering.js';
import { holdTool, releaseTool } from './heldTool.js';
import { Hotbar } from './hotbar.js';
import { lootName, rollChestLoot } from './loot.js';
import { grantItem } from './pickups.js';
import { rollDrops, toolCheck } from './resourceRules.js';
import { gainCoins } from './wallet.js';

const OPEN_ANGLE = -1.95;

export const CaveRewards = {
  cave: null, built: null, layout: null, chests: [], veins: [], spawns: [], monsters: [], populated: new Set(), job: null,
  opened: new Set(), mined: new Set(), cleared: new Set(), visited: new Set(),

  // ---------------------------------------------------------------- the saved progress (planet scope)
  /** Only this planet's own cave is written, so a planet's snapshot never holds another's progress. */
  toJSON() {
    const id = CAVES[ctx.planetId]?.id ?? null;
    const mine = set => [...set].filter(key => id && key.startsWith(`${id}:`));
    return { cave: id, opened: mine(this.opened), mined: mine(this.mined), cleared: mine(this.cleared), visited: mine(this.visited) };
  },
  load(data) {
    const id = CAVES[ctx.planetId]?.id ?? null;
    for (const [set, saved] of [[this.opened, data.opened], [this.mined, data.mined], [this.cleared, data.cleared], [this.visited, data.visited]]) {
      for (const key of [...set]) if (!id || key.startsWith(`${id}:`)) set.delete(key);   // this planet's rows are replaced
      if (data.cave === id) for (const key of saved) set.add(key);
    }
    this.restoreFixtures();
  },
  /** A fresh adventure: every cave full again. */
  resetRun() { this.opened.clear(); this.mined.clear(); this.cleared.clear(); this.visited.clear(); },

  // ---------------------------------------------------------------- building a cave's fixtures
  /** Builds `cave`'s chests and veins into an entered cave (world/caves.js `built`). Already-claimed ones stay claimed. */
  spawnFor(layout, cave, built) {
    this.clear(); this.cave = cave; this.built = built; this.layout = layout;
    const f = caveFixtures(layout, cave);
    for (const c of f.chests) this.chests.push(this.buildChest(c));
    for (const v of f.veins) this.veins.push(this.buildVein(v));
    this.spawns = f.spawns; this.monsters = caveMonsters(layout, cave); this.populated.clear();
  },

  /** The wandering monsters this room holds (29f), once, and never in a room already cleared of them. */
  populate(roomId) {
    if (!this.cave || !ctx.room || this.populated.has(roomId) || this.cleared.has(roomId)) return 0;
    this.populated.add(roomId);
    const here = this.monsters.filter(m => m.room === roomId);
    for (const m of here) {
      const def = { ...enemyDef(m.type), respawn: 0 };               // a cave monster stays beaten for this visit
      const e = new Enemy(m.type, this.built.toWorld(m.x, m.z), def, ctx.room);
      e.caveRoom = roomId; ctx.enemies.push(e);
    }
    return here.length;
  },
  buildChest(c) {
    const def = CHEST_KINDS[c.kind], opened = this.opened.has(c.id);
    const parts = buildChestModel({ look: def.look, locked: false, beam: false, scale: def.scale });
    parts.root.position.set(c.x, 0, c.z); this.built.root.add(parts.root);   // the cave root already sits at CAVE_ORIGIN
    if (opened) parts.lid.rotation.x = OPEN_ANGLE;
    parts.inner.visible = false;
    const glow = LocalLights.add({ at: this.built.toWorld(c.x, c.z, 0.8), radius: 4, color: def.look.glow, intensity: opened ? 0 : 0.7, outdoor: false });
    return { ...c, def, parts, glow, opened, openT: opened ? 99 : -1 };
  },
  buildVein(v) {
    const def = CAVE_VEINS[v.kind], mined = this.mined.has(v.id), root = new THREE.Group();
    addTo(root, part(G.box(1.1, 0.9, 1.1), 0x4a4a55), [0, 0.45, 0]);
    for (const [dx, dy, dz, s] of [[0.22, 0.95, 0.1, 0.22], [-0.2, 0.82, -0.22, 0.17], [0.02, 1.12, -0.05, 0.14]])
      addTo(root, part(G.ico(s, 0), def.color, { glow: !!def.glow, intensity: 1.8 }), [dx, dy, dz]);
    root.position.set(v.x, 0, v.z); root.visible = !mined; this.built.root.add(root);
    const light = mined ? null : LocalLights.add({ at: this.built.toWorld(v.x, v.z, 1), radius: 3.6, color: def.color, intensity: 0.5, outdoor: false });
    return { ...v, def, root, light, mined, hits: 0 };
  },
  /** Re-applies the saved progress to the fixtures standing right now (a save loaded while inside a cave). */
  restoreFixtures() {
    for (const c of this.chests) { c.opened = this.opened.has(c.id); c.parts.lid.rotation.x = c.opened ? OPEN_ANGLE : 0; c.openT = c.opened ? 99 : -1; if (c.glow) c.glow.source.intensity = c.opened ? 0 : 0.7; }
    for (const v of this.veins) { v.mined = this.mined.has(v.id); v.root.visible = !v.mined; if (v.mined && v.light) { v.light.remove(); v.light = null; } }
  },
  clear() {
    this.stop();
    for (const c of this.chests) { c.glow?.remove(); c.parts.root.parent?.remove(c.parts.root); disposeTree(c.parts.root); }
    for (const v of this.veins) { v.light?.remove(); v.root.parent?.remove(v.root); disposeTree(v.root); }
    this.chests = []; this.veins = []; this.spawns = []; this.monsters = []; this.populated.clear();
    this.cave = null; this.built = null; this.layout = null;
  },

  // ---------------------------------------------------------------- walking the rooms
  /** The hero has entered `roomId` (Dungeons.update). A room counts as visited the first time it is stood in. */
  visit(roomId) {
    if (!roomId) return false;
    this.populate(roomId);
    if (this.visited.has(roomId)) return false;
    this.visited.add(roomId); emit('caveroomentered', { room: roomId, cave: this.cave?.id ?? null }); return true;
  },
  /** A cave monster has fallen: its room is cleared once CAVE.reward.clearedBy of them have. */
  onEnemyDefeated(e) {
    if (!ctx.room || !this.layout || !e) return;
    const o = this.built.root.position, room = roomAt(this.layout, e.pos.x - o.x, e.pos.z - o.z);
    if (!room) return;                                                 // it fell in a corridor: no room to clear
    const left = ctx.enemies.filter(x => x !== e && x.alive && roomAt(this.layout, x.pos.x - o.x, x.pos.z - o.z) === room).length;
    if (left < CAVE.reward.clearedBy) this.cleared.add(room);
  },
  /** Is this room already emptied of its monsters (so a revisit does not repopulate it)? */
  isCleared(roomId) { return this.cleared.has(roomId); },

  // ---------------------------------------------------------------- what E does inside a cave
  /** The nearest chest or vein in reach, or null. Only ever offered while the hero is in a cave. */
  target() {
    if (this.job || !this.built || !ctx.room) return null;
    const R = CAVE.reward, me = this.here();
    let best = null;
    for (const c of this.chests) {
      if (c.opened) continue;
      const d = Math.hypot(me.x - c.x, me.z - c.z); if (d > R.chestReach || best && d >= best.dist) continue;
      best = { dist: d, label: `Open the ${c.def.name.toLowerCase()}`, at: this.built.toWorld(c.x, c.z, 1.1), run: () => this.open(c) };
    }
    for (const v of this.veins) {
      if (v.mined) continue;
      const d = Math.hypot(me.x - v.x, me.z - v.z) - v.def.r; if (d > R.veinReach || best && d >= best.dist) continue;
      const problem = Gathering.toolProblem(v.def);
      const tag = problem ? ` <span class="ctag">(needs ${toolCheck(v.def, Gathering.hotbarTool('pick')?.def.tool ?? null) === 'weak' ? 'a Copper Pickaxe' : `a ${TOOL_KINDS[v.def.tool].label.toLowerCase()}`})</span>` : '';
      best = { dist: d, label: `${v.def.verb} the ${v.def.name.toLowerCase()}${tag}`, at: this.built.toWorld(v.x, v.z, 1.5), run: () => this.mine(v) };
    }
    return best;
  },
  /** Where the hero stands, in the cave's own coordinates. */
  here() { const o = this.built.root.position; return { x: ctx.player.pos.x - o.x, z: ctx.player.pos.z - o.z }; },

  // ---------------------------------------------------------------- chests
  open(c) {
    if (c.opened || !this.built) return;
    c.opened = true; c.openT = 0; this.opened.add(c.id);
    emit('chestopened', { kind: c.kind, planet: ctx.planet, cave: this.cave?.id ?? null });
    const loot = rollChestLoot(c.kind, ctx.planet, rng, ctx.player.charId), names = [];
    if (loot.coins) { gainCoins(loot.coins, this.built.toWorld(c.x, c.z, 0.8)); names.push(`${loot.coins} coins`); }
    // Underground there is no ground to pop loot onto: it goes straight into the bag, so nothing can be left behind.
    for (const { item, qty, props } of loot.items) { grantItem(item, qty, props); names.push(lootName(item, qty, props)); }
    audio.sparkle();
    toast(`${c.def.name}: ${names.join(', ') || 'empty... just dust and a moth'}`);
  },

  // ---------------------------------------------------------------- mining a cave vein
  mine(v) {
    const P = ctx.player; if (v.mined || this.job || P.dead) return;
    const problem = Gathering.toolProblem(v.def); if (problem) { toast(problem); audio.fizzle?.(); return; }
    const tool = Gathering.hotbarTool('pick');
    Hotbar.selected = tool.slot; Hotbar.changedAt = ctx.time; holdTool(P, tool.def);
    P.vel.set(0, 0, 0);
    const extra = tool.def.tool.tier - (v.def.tier ?? 1);              // a better pickaxe than it needs: fewer swings
    this.job = { vein: v, t: 0, hits: 0, total: Math.max(1, (v.def.hits ?? 1) - extra), from: this.here() };
  },
  stop() { if (this.job) { this.job = null; releaseTool(ctx.player); } },

  update(dt) {
    for (const c of this.chests) if (c.openT >= 0 && c.openT < 1) {
      c.openT = Math.min(1, c.openT + dt / 0.5); c.parts.lid.rotation.x = OPEN_ANGLE * c.openT;
      if (c.glow) c.glow.source.intensity = 0.7 * (1 - c.openT);
    }
    const j = this.job; if (!j) return;
    const P = ctx.player, me = this.here();
    if (P.dead || P.hurtT > 0 || ctx.transitioning || !ctx.room || j.vein.mined ||
        Math.hypot(me.x - j.from.x, me.z - j.from.z) > GATHER.cancelMove) { this.stop(); return; }
    const face = ctx.room.toward(P.pos, this.built.toWorld(j.vein.x, j.vein.z)), k = damp(14, dt);   // face the vein
    P.fwd.lerp(face, k); if (P.fwd.lengthSq() > 1e-8) P.fwd.normalize();
    j.t += dt;
    const phase = (j.t % GATHER.swing) / GATHER.swing;
    P.armR.rotation.x = phase < 0.6 ? -2.6 * (phase / 0.6) : -2.6 + 2.4 * ((phase - 0.6) / 0.4); P.armR.rotation.z = -0.2;
    if (j.t < GATHER.swing * (j.hits + 1)) return;
    j.hits++; this.impact(j);
    if (j.hits >= j.total) this.finish(j);
  },
  impact(j) {
    const v = j.vein;
    sparkles.emit(this.built.toWorld(v.x, v.z, 0.9), { count: 10, color: v.def.color, speed: 2.2, up: ctx.player.up, upBias: 0.7, life: 0.5, size: 0.26 });
    audio.tone(1300 + rng() * 300, 0.09, 'square', 0.025); audio.noise(0.08, 0.06, 3000);
  },
  finish(j) {
    const v = j.vein; this.job = null; releaseTool(ctx.player);
    v.mined = true; this.mined.add(v.id); v.root.visible = false;
    if (v.light) { v.light.remove(); v.light = null; }
    const drops = rollDrops(v.def.drops, v.def.extra ?? []);
    for (const [item, n] of drops) grantItem(item, n);
    audio.sparkle(); emit('gathered', { what: v.kind, items: drops, cave: this.cave?.id ?? null });
  },
};

encounterEvents.addEventListener('enemydefeated', ev => CaveRewards.onEnemyDefeated(ev.detail.enemy));
