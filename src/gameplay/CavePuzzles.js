/* CAVE PUZZLES, THE WARDEN AND THE WAY HOME (TODO 29e, config/dungeons.js).
   The last stretch of a cave, placed by `caveEnding` (world/caveLayout.js) and always on the route to the end room:

     the puzzle room   the end room's parent, so the hero cannot help but pass through it. It holds either a set of
                       unlit lantern switches (light them all) or a set of pressure plates with a push stone for each
                       (shoulder a stone onto every plate). Each cave picks its kind in config (`puzzle`).
     the key chest     sealed until that puzzle is solved; it holds the cave's Warden's Key.
     the warded door   the doorway from the puzzle room into the end room. While it is up, a RoomSpace blocker closes
                       it to the hero, pets, monsters and their routes alike. The key turns it once, for good.
     the guardian      the end room's keeper: one of the cave's own monsters made tougher the way a planet's elites
                       are (COMBAT kits unchanged, so no cave needs a boss AI of its own). It drops its loot into the
                       bag and opens the way home.
     the shortcut      once the guardian falls, a lit way back to the entrance, so the walk out is not the walk in.

   Progress is saved per planet (`cavePuzzles` in core/save.js), keyed by cave id like the rewards it sits beside:
   lit switches, where the stones were left, doors already turned, guardians already beaten and shortcuts already
   open. A solved puzzle, an opened door and a beaten guardian never come back. */
import * as THREE from 'three';
import { CAVE, CAVES } from '../config/dungeons.js';
import { CHEST_KINDS } from '../config/chests.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { encounterEvents } from '../combat/events.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { enemyDef } from '../combat/enemyDefs.js';
import { sparkles } from '../fx/sparkles.js';
import { buildChestModel } from '../models/chest.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { LocalLights } from '../render/lighting.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { rng } from '../utils/random.js';
import { caveEnding } from '../world/caveLayout.js';
import { lootName, rollLoot } from './loot.js';
import { grantItem } from './pickups.js';
import { gainCoins } from './wallet.js';

const OPEN_ANGLE = -1.95, KEY = 'wardenKey';
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

export const CavePuzzles = {
  cave: null, built: null, layout: null, ending: null, inside: null,
  switches: [], plates: [], stones: [], door: null, keyChest: null, shortcut: null, guardian: null,
  lit: new Set(), placed: new Map(), unlocked: new Set(), beaten: new Set(), opened: new Set(),

  // ---------------------------------------------------------------- the saved progress (planet scope)
  toJSON() {
    const id = CAVES[ctx.planetId]?.id ?? null, mine = set => [...set].filter(k => id && k.startsWith(`${id}:`));
    return { cave: id, lit: mine(this.lit), unlocked: mine(this.unlocked), beaten: mine(this.beaten), opened: mine(this.opened),
      stones: [...this.placed].filter(([k]) => id && k.startsWith(`${id}:`)).map(([id, p]) => ({ id, x: p.x, z: p.z })) };
  },
  load(data) {
    const id = CAVES[ctx.planetId]?.id ?? null;
    for (const [set, saved] of [[this.lit, data.lit], [this.unlocked, data.unlocked], [this.beaten, data.beaten], [this.opened, data.opened]]) {
      for (const key of [...set]) if (!id || key.startsWith(`${id}:`)) set.delete(key);
      if (data.cave === id) for (const key of saved) set.add(key);
    }
    for (const key of [...this.placed.keys()]) if (!id || key.startsWith(`${id}:`)) this.placed.delete(key);
    if (data.cave === id) for (const s of data.stones) this.placed.set(s.id, { x: s.x, z: s.z });
    this.restore();
  },
  /** A fresh adventure: every puzzle unsolved again. */
  resetRun() { this.lit.clear(); this.placed.clear(); this.unlocked.clear(); this.beaten.clear(); this.opened.clear(); },

  // ---------------------------------------------------------------- building the end of a cave
  /** `inside` is the Dungeons state this cave is being walked in; the shortcut moves the hero through it. */
  spawnFor(layout, cave, built, inside) {
    this.clear(); this.cave = cave; this.built = built; this.layout = layout; this.inside = inside;
    const e = this.ending = caveEnding(layout, cave);
    for (const sw of e.puzzle.switches) this.switches.push(this.buildSwitch(sw));
    for (const pl of e.puzzle.plates) this.plates.push(this.buildPlate(pl));
    for (const st of e.puzzle.stones) this.stones.push(this.buildStone(st));
    this.keyChest = this.buildKeyChest(e.keyChest);
    this.door = this.buildDoor(e.door);
    this.shortcut = this.buildShortcut(e.shortcut);
    this.restore();
  },
  buildSwitch(sw) {
    const root = new THREE.Group(), c = this.cave.colors;
    addTo(root, part(G.cyl(0.08, 0.1, 1.5, 6), c.wall), [0, 0.75, 0]);
    const flame = part(G.ico(0.17, 0), CAVE.lantern.color, { glow: true, intensity: 2.6 });
    addTo(root, flame, [0, 1.62, 0]);
    root.position.set(sw.x, 0, sw.z); this.built.root.add(root);
    return { ...sw, root, flame, light: null, lit: false };
  },
  buildPlate(pl) {
    const root = new THREE.Group();
    addTo(root, part(G.box(1.5, 0.12, 1.5), 0x3a3a46, { outline: false }), [0, 0.06, 0]);
    const glow = part(G.box(1.1, 0.06, 1.1), this.cave.colors.accent, { glow: true, intensity: 1.2, outline: false });
    addTo(root, glow, [0, 0.14, 0]);
    root.position.set(pl.x, 0, pl.z); this.built.root.add(root);
    return { ...pl, root, glow, pressed: false };
  },
  buildStone(st) {
    const root = new THREE.Group(), r = CAVE.puzzle.stoneRadius;
    addTo(root, part(G.box(r * 1.9, r * 1.9, r * 1.9), 0x6a6475), [0, r * 0.95, 0]);
    const at = this.placed.get(st.id) ?? { x: st.x, z: st.z };
    root.position.set(at.x, 0, at.z); this.built.root.add(root);
    // A solid body in the room, so the hero shoulders it instead of walking through it.
    const body = { pos: this.built.toWorld(at.x, at.z, 0), radius: r, height: r * 2, solid: true, alive: true, caveStone: true };
    ctx.room?.bodies.add(body);
    return { ...st, root, body, home: { x: st.x, z: st.z } };
  },
  buildKeyChest(c) {
    const def = CHEST_KINDS[c.kind], opened = this.opened.has(c.id);
    const parts = buildChestModel({ look: def.look, locked: !opened, beam: false, scale: def.scale });
    parts.root.position.set(c.x, 0, c.z); this.built.root.add(parts.root);
    if (opened) parts.lid.rotation.x = OPEN_ANGLE;
    parts.inner.visible = false;
    const glow = LocalLights.add({ at: this.built.toWorld(c.x, c.z, 0.8), radius: 4.5, color: def.look.glow, intensity: opened ? 0 : 0.8, outdoor: false });
    return { ...c, def, parts, glow, opened };
  },
  buildDoor(d) {
    const root = new THREE.Group(), across = d.dir === 'n' || d.dir === 's';
    const w = across ? CAVE.corridor : 0.5, depth = across ? 0.5 : CAVE.corridor;
    addTo(root, part(G.box(w, 2.4, depth), 0x2e2a3a), [0, 1.2, 0]);
    for (const k of [-1, 1]) addTo(root, part(G.ico(0.15, 0), 0x9f8cff, { glow: true, intensity: 2.4 }),
      across ? [k * 0.7, 1.5, 0] : [0, 1.5, k * 0.7]);
    root.position.set(d.x, 0, d.z); this.built.root.add(root);
    const light = LocalLights.add({ at: this.built.toWorld(d.x, d.z, 1.5), radius: 4, color: 0x9f8cff, intensity: 0.8, outdoor: false });
    return { ...d, root, light, open: false };
  },
  buildShortcut(s) {
    const root = new THREE.Group();
    addTo(root, part(G.box(1.8, 0.1, 1.8), 0x4a4458, { outline: false }), [0, 0.05, 0]);
    const glow = part(G.ico(0.4, 1), 0xfff0c8, { glow: true, intensity: 2.2 });
    addTo(root, glow, [0, 1.1, 0]);
    root.position.set(s.x, 0, s.z); this.built.root.add(root);
    const light = LocalLights.add({ at: this.built.toWorld(s.x, s.z, 1.1), radius: 5, color: 0xfff0c8, intensity: 1, outdoor: false });
    return { ...s, root, glow, light, open: false };
  },

  /** Puts the saved progress onto whatever is standing right now (entering, or a save loaded while inside). */
  restore() {
    if (!this.built) return;
    for (const sw of this.switches) this.setLit(sw, this.lit.has(sw.id));
    for (const st of this.stones) {
      const at = this.placed.get(st.id) ?? st.home;
      st.root.position.set(at.x, 0, at.z); this.built.toWorld(at.x, at.z, 0, st.body.pos);
    }
    if (this.keyChest) {
      const opened = this.opened.has(this.keyChest.id);
      this.keyChest.opened = opened; this.keyChest.parts.lid.rotation.x = opened ? OPEN_ANGLE : 0;
      if (this.keyChest.parts.lock) this.keyChest.parts.lock.visible = !opened;
      this.keyChest.glow.source.intensity = opened ? 0 : 0.8;
    }
    if (this.door) this.setDoor(this.unlocked.has(this.door.id));
    if (this.shortcut) this.setShortcut(this.beaten.has(`${this.layout.end}:guardian`));
    this.checkPlates();
  },
  setLit(sw, on) {
    sw.lit = on; sw.flame.visible = on;
    if (on && !sw.light) sw.light = LocalLights.add({ at: this.built.toWorld(sw.x, sw.z, 1.62), radius: CAVE.lantern.radius, color: CAVE.lantern.color, intensity: CAVE.lantern.intensity, outdoor: false });
    if (!on && sw.light) { sw.light.remove(); sw.light = null; }
  },
  setDoor(open) {
    const d = this.door; d.open = open; d.root.visible = !open;
    if (d.light) d.light.source.intensity = open ? 0 : 0.8;
    const room = ctx.room; if (!room) return;
    room.blockers = room.blockers.filter(b => b.id !== d.id);
    if (!open) room.blockers.push({ id: d.id, x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1 });
  },
  setShortcut(open) {
    const s = this.shortcut; s.open = open; s.root.visible = open;
    if (s.light) s.light.source.intensity = open ? 1 : 0;
  },
  clear() {
    for (const sw of this.switches) { sw.light?.remove(); sw.root.parent?.remove(sw.root); disposeTree(sw.root); }
    for (const pl of this.plates) { pl.root.parent?.remove(pl.root); disposeTree(pl.root); }
    for (const st of this.stones) { ctx.room?.bodies.delete(st.body); st.root.parent?.remove(st.root); disposeTree(st.root); }
    for (const o of [this.keyChest, this.door, this.shortcut]) {
      if (!o) continue;
      o.glow?.remove(); o.light?.remove();
      const root = o.parts?.root ?? o.root; root.parent?.remove(root); disposeTree(root);
    }
    if (ctx.room) ctx.room.blockers = [];
    this.switches = []; this.plates = []; this.stones = [];
    this.keyChest = this.door = this.shortcut = this.guardian = null;
    this.cave = this.built = this.layout = this.ending = this.inside = null;
  },

  // ---------------------------------------------------------------- solving it
  /** Is the puzzle room's puzzle done? */
  get solved() {
    if (!this.ending) return false;
    return this.ending.puzzle.kind === 'lanterns'
      ? this.switches.length > 0 && this.switches.every(sw => sw.lit)
      : this.plates.length > 0 && this.plates.every(pl => pl.pressed);
  },
  /** A plate is pressed while a stone rests on it. */
  checkPlates() {
    for (const pl of this.plates) {
      const on = this.stones.some(st => Math.hypot(st.root.position.x - pl.x, st.root.position.z - pl.z) <= CAVE.puzzle.plateRadius);
      if (on !== pl.pressed) { pl.pressed = on; audio.plip?.(); }
      pl.glow.visible = on;
    }
  },
  light(sw) {
    if (sw.lit) return;
    this.setLit(sw, true); this.lit.add(sw.id); audio.sparkle();
    sparkles.emit(this.built.toWorld(sw.x, sw.z, 1.62), { count: 10, color: CAVE.lantern.color, speed: 1.8, up: ctx.player.up, upBias: 0.6, life: 0.5, size: 0.22 });
    if (this.solved) this.onSolved();
  },
  onSolved() {
    emit('cavepuzzlesolved', { cave: this.cave?.id ?? null, kind: this.ending.puzzle.kind });
    audio.unlock?.(); toast('Something heavy shifts: the sealed chest gives.');
  },
  openKeyChest() {
    const c = this.keyChest;
    if (c.opened) return;
    if (!this.solved) {
      toast(this.ending.puzzle.kind === 'lanterns' ? 'Sealed tight. Every lantern in this room must burn.'
        : 'Sealed tight. Every plate in this room must bear a stone.');
      audio.fizzle?.(); return;
    }
    c.opened = true; this.opened.add(c.id);
    c.parts.lid.rotation.x = OPEN_ANGLE; if (c.parts.lock) c.parts.lock.visible = false;
    c.glow.source.intensity = 0;
    grantItem(KEY, 1); audio.sparkle();
    toast(`${c.def.name}: ${lootName(KEY)}`);
  },
  turnDoor() {
    const d = this.door;
    if (d.open) return;
    if (!ctx.player.inventory.count(KEY)) { toast("Warded shut. A Warden's Key would turn it: this cave keeps one sealed away."); audio.fizzle?.(); return; }
    ctx.player.inventory.remove(KEY, 1);
    this.setDoor(true); this.unlocked.add(d.id);
    audio.unlock?.(); toast("The Warden's Key turns and the ward goes out.");
    emit('cavedooropened', { cave: this.cave?.id ?? null, door: d.id });
  },

  // ---------------------------------------------------------------- the guardian and the way home
  /** The end room's keeper, once the hero steps in. One of the cave's own monsters, made tougher. */
  wake(roomId) {
    if (!this.ending || roomId !== this.ending.guardian.room) return;
    const g = this.ending.guardian;
    if (this.beaten.has(g.id) || this.guardian?.alive) return;
    const def = { ...enemyDef(g.type), respawn: 0 };
    const e = new Enemy(g.type, this.built.toWorld(g.x, g.z), def, ctx.room);
    e.makeElite(CAVE.guardian); e.caveGuardian = g.id; e.temporary = true;
    ctx.enemies.push(e); this.guardian = e;
    emit('caveguardianwoke', { cave: this.cave?.id ?? null, guardian: g.id, type: g.type });
    toast(`${def.name?.split(',')[0] ?? g.type}, the warden of this place, blocks the way.`);
  },
  onEnemyDefeated(e) {
    const id = e?.caveGuardian; if (!id || this.beaten.has(id)) return;
    this.beaten.add(id); this.guardian = null;
    const g = this.ending?.guardian;
    const loot = rollLoot(g?.loot ?? 'caveGuardian', ctx.planet, rng, ctx.player.charId), names = [];
    if (loot.coins) { gainCoins(loot.coins, ctx.player.pos.clone()); names.push(`${loot.coins} coins`); }
    for (const { item, qty, props } of loot.items) { grantItem(item, qty, props); names.push(lootName(item, qty, props)); }
    for (const [item, qty] of this.cave?.guardianExtra ?? []) { grantItem(item, qty); names.push(lootName(item, qty)); }
    if (this.shortcut) this.setShortcut(true);
    audio.sparkle();
    toast(`The warden falls: ${names.join(', ') || 'nothing but dust'}. A way back opens.`);
    emit('caveguardianbeaten', { cave: this.cave?.id ?? null, guardian: id });
  },
  /** The way home: back to the entrance room, not out of the cave. */
  useShortcut() {
    const s = this.shortcut; if (!s?.open || !ctx.room) return;
    const inside = this.inside; if (!inside) return;
    const m = this.layout.mouth;
    inside.x = m.x; inside.z = m.z - 1.4;
    ctx.room.place(ctx.player, this.built.toWorld(inside.x, inside.z));
    ctx.player.vel.set(0, 0, 0); ctx.player.fwd.set(0, 0, 1);
    if (!this.opened.has(s.id)) this.opened.add(s.id);
    audio.whoosh?.(); toast('A worn stair carries you back to the cave mouth.');
    emit('caveshortcutused', { cave: this.cave?.id ?? null });
  },

  // ---------------------------------------------------------------- what E does
  target() {
    if (!this.built || !ctx.room) return null;
    const R = CAVE.puzzle.reach, me = this.here();
    let best = null;
    const offer = (dist, label, at, run) => { if (dist <= R && (!best || dist < best.dist)) best = { dist, label, at, run }; };
    for (const sw of this.switches) if (!sw.lit)
      offer(Math.hypot(me.x - sw.x, me.z - sw.z), 'Light the lantern', this.built.toWorld(sw.x, sw.z, 1.9), () => this.light(sw));
    const c = this.keyChest;
    if (c && !c.opened) offer(Math.hypot(me.x - c.x, me.z - c.z),
      this.solved ? `Open the ${c.def.name.toLowerCase()}` : `${c.def.name} <span class="ctag">(sealed)</span>`,
      this.built.toWorld(c.x, c.z, 1.1), () => this.openKeyChest());
    const d = this.door;
    if (d && !d.open) offer(Math.hypot(me.x - d.x, me.z - d.z),
      ctx.player.inventory.count(KEY) ? 'Unlock the warded door <span class="ctag">(Warden\'s Key)</span>' : 'Warded door <span class="ctag">(locked)</span>',
      this.built.toWorld(d.x, d.z, 1.6), () => this.turnDoor());
    const s = this.shortcut;
    if (s?.open) offer(Math.hypot(me.x - s.x, me.z - s.z), 'Take the way back', this.built.toWorld(s.x, s.z, 1.3), () => this.useShortcut());
    return best;
  },
  here() { const o = this.built.root.position; return { x: ctx.player.pos.x - o.x, z: ctx.player.pos.z - o.z }; },

  // ---------------------------------------------------------------- pushing the stones
  update(dt) {
    if (!this.built || !ctx.room) return;
    const P = ctx.player;
    if (this.stones.length && !P.dead) {
      const o = this.built.root.position, speed = P.vel.length();
      for (const st of this.stones) {
        if (speed < 0.4) continue;
        _d.set(st.root.position.x + o.x - P.pos.x, 0, st.root.position.z + o.z - P.pos.z);
        const gap = _d.length(); if (gap < 1e-4) continue;
        _d.divideScalar(gap);
        if (gap > P.radius + st.body.radius + 0.22) continue;        // not shouldering it
        if (_v.copy(P.vel).setY(0).normalize().dot(_d) < 0.55) continue;   // not pushing toward it
        _v.copy(_d).multiplyScalar(Math.min(CAVE.puzzle.pushSpeed, speed) * dt);
        const before = st.body.pos.clone();
        ctx.room.move(st.body.pos, _v, st.body.radius, st.body);
        if (st.body.pos.distanceToSquared(before) < 1e-10) continue;
        st.root.position.set(st.body.pos.x - o.x, 0, st.body.pos.z - o.z);
        this.placed.set(st.id, { x: st.root.position.x, z: st.root.position.z });
      }
      const was = this.solved; this.checkPlates();
      if (!was && this.solved) this.onSolved();
    }
  },
};

encounterEvents.addEventListener('enemydefeated', ev => CavePuzzles.onEnemyDefeated(ev.detail.enemy));
