/* HOUSES: walking into village houses (data: config/houses.js, rooms: src/world/interiors.js).
   Outside, a door within reach shows "E Enter ..."; the screen fades, the room is built far from the planet and the
   hero walks its flat floor (Player.motion = the indoor controller) under a dollhouse camera (CameraSystem room view).
   Inside: no combat (abilities are off and monsters lose interest), furniture to use, the resident or the sleeping
   owner to talk to, a note when nobody's home. Step back onto the doormat (or press E at the door) to leave.
   currentInteraction() is the single "what does E do here" answer the prompt and the E key share. */
import * as THREE from 'three';
import { HOUSES, INTERACTIONS, REST } from '../config/houses.js';
import { DAY } from '../config/day.js';
import { ctx } from '../core/context.js';
import { held } from '../core/keybinds.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { buildGranny, buildLibrarian } from '../models/villagers.js';
import { audio } from '../systems/AudioSystem.js';
import { setRoomView, snapCamera } from '../systems/CameraSystem.js';
import { keys } from '../systems/InputSystem.js';
import { setFade, showBanner } from '../ui/banner.js';
import { Dialog } from '../ui/Dialog.js';
import { toast } from '../ui/toast.js';
import { damp } from '../utils/math.js';
import { arcDist, projectTangent, turnToward } from '../utils/sphere.js';
import { buildRoom, ROOM_UP } from '../world/interiors.js';
import { groundHeight } from '../world/terrain.js';
import { buff } from './buffs.js';
import { RecipeBook } from './RecipeBook.js';
import { Challenges } from './challenges/Challenges.js';
import { Chests } from './Chests.js';
import { Farm } from './Farm.js';
import { Fishing } from './Fishing.js';
import { Gathering } from './Gathering.js';
import { Stations } from './Stations.js';
import { Pets } from './Pets.js';
import { rareTarget } from '../entities/wildlife/wildlife.js';
import { dayClock } from './dayClock.js';
import { grantItem } from './pickups.js';
import { gainCoins } from './wallet.js';
import { nearestNPC } from '../entities/npc/NPC.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { Portals } from './Portals.js';

const V3 = THREE.Vector3;
const DOOR_REACH = 2.1, USE_REACH = 1.0, TALK_REACH = 2.4, FADE = 0.35;
const WALK = 3.4, RUN = 5.2;
const RESIDENT_LOOKS = { granny: buildGranny, librarian: buildLibrarian };
const _tv = new V3(), _w = new V3(), _fwd = new V3(), BACK = new V3(0, 0, 1);

/** This house's settings on the current planet (its `planets` entry merged in), or null for a house without an entry. */
export function houseDef(index, planet = ctx.planet) {
  const base = HOUSES[index]; if (!base) return null;
  return { ...base, ...(base.planets?.[planet] ?? {}) };
}

/** A speaker that isn't a walking villager: furniture, notes, a sleeping owner, an indoor resident. */
const speaker = (name, title, color, pos, portrait = null) => ({ name, def: { title, color, portrait }, pos: pos.clone(), talking: false });

export const Houses = {
  inside: null,        // { index, def, room, x, z, vx, vz, armed, resident, sleeper, shadow }
  fade: null,          // { phase: 'out' | 'in', t, then }
  opened: new Set(), lore: {}, ovenDay: {}, teaAt: -99,

  toJSON() { return { opened: [...this.opened], lore: { ...this.lore }, ovenDay: { ...this.ovenDay }, teaAt: this.teaAt }; },
  load(data) { this.opened = new Set(data.opened); this.lore = { ...data.lore }; this.ovenDay = { ...data.ovenDay }; this.teaAt = data.teaAt; },

  // ---------------------------------------------------------------- entering and leaving
  enter(index) {
    if (this.fade || this.inside) return;
    if (Challenges.run) { toast('Finish your challenge first!'); return; }
    const def = houseDef(index); if (!def) return;
    this.fadeThen(() => this.goInside(index, def));
  },
  leave() { if (!this.fade && this.inside) this.fadeThen(() => this.goOutside()); },
  /** Fades to black, runs `then` while hidden, fades back in (input is locked meanwhile). */
  fadeThen(then) { ctx.transitioning = true; setFade(true, FADE); this.fade = { phase: 'out', t: FADE, then }; Dialog.close(); audio.whoosh(); },

  goInside(index, def) {
    const P = ctx.player, room = buildRoom(def, def.layout);
    const owner = def.owner ? ctx.npcs.find(n => n.name === def.owner) : null;
    const state = this.inside = { index, def, room, x: room.entrance.x, z: room.entrance.z - 0.4, vx: 0, vz: 0, armed: false, resident: null, sleeper: null, owner };
    // the hero walks in on the room's own flat floor
    P.selfCollider.active = false; P.vel.set(0, 0, 0); P.knock.set(0, 0, 0); P.vy = 0; P.grounded = true;
    P.up.copy(ROOM_UP); P.fwd.set(0, 0, -1); P.motion = (p, dt) => this.walk(p, dt); this.placeHero();
    state.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4a2a50, transparent: true, opacity: 0.3, depthWrite: false }));
    room.root.add(state.shadow);
    if (def.resident) {                                              // someone who lives indoors
      const r = def.resident, parts = RESIDENT_LOOKS[r.look](), at = room.residentAt;
      parts.root.position.set(at.x, 0, at.z); parts.root.rotation.y = Math.atan2(room.entrance.x - at.x, room.entrance.z - at.z); room.root.add(parts.root);
      state.resident = { ...r, parts, x: at.x, z: at.z, line: 0 }; room.obstacles.push({ x: at.x, z: at.z, r: 0.45 });   // solid, like furniture
    } else if (owner?.asleep) {                                      // the owner is home, asleep in bed
      const parts = owner.def.build(), b = room.bedAt;
      parts.root.rotation.set(-Math.PI / 2, b.ry, 0, 'YXZ'); parts.root.position.set(b.x + Math.sin(b.ry) * 0.85, 0.62, b.z + Math.cos(b.ry) * 0.85);
      room.root.add(parts.root); state.sleeper = { parts, zT: 1 };
    } else if (def.note) state.noteAt = room.tableAt;                // nobody home: a note on the table
    ctx.indoors = def.name;
    const chest = room.spots.find(p => p.kind === 'chest');            // emptied earlier this adventure: lid's still up
    if (chest && this.opened.has(`${ctx.planetId}:${index}`)) chest.obj.userData.lid.rotation.x = -1.9;
    if (ctx.companion) { ctx.companion.root.visible = false; if (ctx.companion.shadow) ctx.companion.shadow.visible = false; }
    setRoomView({ up: ROOM_UP, back: BACK });
  },
  goOutside() {
    const P = ctx.player, { index, room } = this.inside, house = this.world.houses[index];
    room.dispose(); this.inside = null; ctx.indoors = null;
    P.motion = null; P.motionHs = 0; P.selfCollider.active = true;
    P.placeAt(house.door);
    _fwd.copy(house.fwd); projectTangent(_fwd, P.up).normalize(); P.fwd.copy(_fwd);   // step out facing away from the door
    // the camera looks back at the door (from behind the hero it would sit inside the house and pop up overhead)
    setRoomView(null); snapCamera(P.up, _fwd.negate());
    this.onLeave?.();                                                // the companion trots back (Game wires this)
  },
  /** Leaves at once without a fade (restarting the adventure, changing planets). */
  reset() {
    if (this.inside) { this.inside.room.dispose(); this.inside = null; }
    ctx.indoors = null; this.fade = null; setRoomView(null);
    const P = ctx.player; if (P) { P.motion = null; P.motionHs = 0; P.selfCollider.active = true; }
  },
  /** A fresh adventure: chests full again, lore from the start. */
  resetRun() { this.reset(); this.opened.clear(); this.lore = {}; this.ovenDay = {}; this.teaAt = -99; },

  // ---------------------------------------------------------------- the indoor controller (Player.motion)
  placeHero() {
    const P = ctx.player, s = this.inside;
    s.room.toWorld(s.x, s.z, 0, P.pos); P.r = P.pos.length();
    if (s.shadow) s.shadow.position.set(s.x, 0.04, s.z);
  },
  walk(P, dt) {
    const s = this.inside; if (!s) return false;
    let f = 0, side = 0;
    if (!ctx.transitioning && !ctx.inventoryOpen) {
      if (held('moveForward', keys)) f += 1; if (held('moveBack', keys)) f -= 1;
      if (held('moveRight', keys)) side += 1; if (held('moveLeft', keys)) side -= 1;
    }
    const len = Math.hypot(f, side) || 1, speed = held('sprint', keys) ? RUN : WALK;
    const k = damp(12, dt); s.vx += (side / len * speed - s.vx) * k; s.vz += (-f / len * speed - s.vz) * k;
    s.x += s.vx * dt; s.z += s.vz * dt;
    for (const o of s.room.obstacles) {                              // slide around furniture
      const dx = s.x - o.x, dz = s.z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.35;
      if (d < min && d > 1e-4) { s.x = o.x + dx / d * min; s.z = o.z + dz / d * min; }
    }
    const sh = s.room.shape;                                         // and stay inside the walls
    if (sh.kind === 'circle') { const d = Math.hypot(s.x, s.z); if (d > sh.r) { s.x *= sh.r / d; s.z *= sh.r / d; } }
    else { s.x = Math.max(-sh.hx, Math.min(sh.hx, s.x)); s.z = Math.max(-sh.hz, Math.min(sh.hz, s.z)); }
    this.placeHero();
    const v = Math.hypot(s.vx, s.vz); P.vel.set(s.vx, 0, s.vz); P.motionHs = v; P.up.copy(ROOM_UP);
    if (v > 0.3) turnToward(P.fwd, _tv.set(s.vx / v, 0, s.vz / v), ROOM_UP, damp(12, dt));
    // the doormat: step back onto it (after walking in) to leave
    const toMat = Math.hypot(s.x - s.room.entrance.x, s.z - s.room.entrance.z);
    if (toMat > 1.4) s.armed = true;
    else if (s.armed && toMat < 0.7 && s.vz > 0.5) this.leave();
    return true;
  },

  // ---------------------------------------------------------------- what E does
  /** The thing E would use right now: { label, at (world point for the prompt), run } or null. */
  target() {
    if (this.fade || !ctx.started || Dialog.open) return null;
    const P = ctx.player;
    if (!this.inside) {                                              // outside: the nearest house door within reach
      let best = null, bd = DOOR_REACH;
      this.world?.houses.forEach((h, i) => { const d = arcDist(P.up, h.door); if (d < bd && houseDef(i)) { bd = d; best = i; } });
      if (best === null) return null;
      const h = this.world.houses[best], def = houseDef(best);
      const asleep = def.owner && ctx.npcs.find(n => n.name === def.owner)?.asleep;
      return { dist: bd, label: `Enter ${def.name}${asleep ? ' <span class="ctag">(asleep)</span>' : ''}`,
        at: _w.copy(h.door).multiplyScalar(groundHeight(h.door) + 2.2).clone(), run: () => this.enter(best) };
    }
    const s = this.inside, opts = [];
    const near = (x, z, reach, label, run, y = 1.6) => { const d = Math.hypot(s.x - x, s.z - z); if (d < reach) opts.push({ dist: d, label, at: s.room.toWorld(x, z, y), run }); };
    for (const sp of s.room.spots) near(sp.x, sp.z, USE_REACH + (sp.kind === 'bed' ? 1.1 : 0.8), INTERACTIONS[sp.kind].label, () => this.use(sp));
    if (s.resident) near(s.resident.x, s.resident.z, TALK_REACH, `Talk to ${s.resident.name}`, () => this.talkResident(), 2.3);
    for (const o of opts) if (/^Talk/.test(o.label)) o.dist -= 0.8;   // people come before furniture when both are in reach
    if (s.sleeper) near(s.room.bedAt.x, s.room.bedAt.z, 2.1, `${s.owner.name} is asleep`, () => this.talkSleeper(), 1.4);
    if (s.noteAt) near(s.noteAt.x, s.noteAt.z, 1.9, INTERACTIONS.note.label, () => this.read('A note', s.def.note), 1.2);
    near(s.room.entrance.x, s.room.entrance.z, 1.2, 'Leave', () => this.leave(), 1.2);
    return opts.sort((a, b) => a.dist - b.dist)[0] ?? null;
  },

  read(title, text, color = '#8a5a44') { Dialog.show(speaker(title, this.inside?.def.name ?? '', color, ctx.player.pos), { t: text, e: 'neutral' }); },
  talkResident() {
    const r = this.inside.resident, line = r.lines[r.line++ % r.lines.length];
    Dialog.show(speaker(r.name, r.title, r.color, ctx.player.pos, r.portrait), line);
  },
  talkSleeper() {
    const o = this.inside.owner;
    Dialog.show(speaker(o.name, o.def.title, o.def.color, ctx.player.pos, o.def.portrait), { t: '*Zzz...* ...five more minutes... *snore*', e: 'sleepy' });
  },
  /** Furniture. */
  use(spot) {
    const P = ctx.player, s = this.inside, def = s.def, key = `${ctx.planetId}:${s.index}`;
    switch (spot.kind) {
      case 'bed': {
        const night = dayClock.phase === 'night' || dayClock.phase === 'evening' && dayClock.frac > 0.7;
        this.fadeThen(() => {
          if (night) {                                               // sleep through to the morning (watered crops grow overnight)
            Farm.growBy(((dayClock.frac > REST.wakeAt ? 1 : 0) + REST.wakeAt - dayClock.frac) * DAY.length);
            if (dayClock.frac > REST.wakeAt) dayClock.day++;
            dayClock.t = REST.wakeAt * DAY.length; P.hp = P.stats.maxHp; P.mana = P.stats.maxMana;
            showBanner(`Day ${dayClock.day}`, 'You wake up rested and ready.');
          } else { dayClock.update(20); Farm.growBy(20); P.hp = Math.min(P.stats.maxHp, P.hp + P.stats.maxHp * REST.napHeal); toast('A short nap. You feel better.'); }
        });
        return;
      }
      case 'chest': {
        if (this.opened.has(key)) { this.read('Storage chest', "Empty. Someone's already had a rummage. (It was you.)"); return; }
        this.opened.add(key); s.lidOpen = { lid: spot.obj.userData.lid, t: 0 }; audio.chestOpen(); const g = def.gift ?? {}, got = [];
        if (g.coins) { gainCoins(g.coins); got.push(`${g.coins} coins`); }
        for (const [id, n] of g.items ?? []) { grantItem(id, n); got.push(`${n > 1 ? `${n}x ` : ''}${itemRegistry.get(id)?.name ?? id}`); }
        sparkles.emit(s.room.toWorld(spot.x, spot.z, 0.8), { count: 30, color: 0xffd36b, speed: 2, up: ROOM_UP, upBias: 1, life: 0.9, size: 0.32 });
        this.read('Storage chest', got.length ? `A note on top: "Take what you need, traveller." Inside: ${got.join(', ')}.` : 'Just old socks.');
        return;
      }
      case 'bookshelf': {
        const lore = def.lore?.length ? def.lore : ["Cookbooks, mostly. One is titled 'Moss: A Love Story'. Another is just a very flat sandwich."];
        const i = this.lore[key] = ((this.lore[key] ?? -1) + 1) % lore.length;
        const learned = RecipeBook.readBook(ctx.planetId);
        this.read('Bookshelf', lore[i] + (learned ? `\nRecipe learned: ${learned}.` : '')); return;
      }
      case 'kettle':
        if (ctx.time - this.teaAt < 60) { this.read('Kettle', 'Still warm, but empty. Granny will brew more soon.'); return; }
        this.teaAt = ctx.time; P.hp = Math.min(P.stats.maxHp, P.hp + 30); buff('feather', 20, 'A cup of tea! Feather-Step for 20s');
        emote(P, 'heart', '#ff8fb1'); return;
      case 'oven':
        if (this.ovenDay[key] === dayClock.day) { this.read('Oven', "Something's rising in there. Come back tomorrow for the next batch."); return; }
        this.ovenDay[key] = dayClock.day; grantItem('honeyBun', 1); this.read('Oven', 'A tray of honey-moss buns, still warm. Pim would want you to have one.'); return;
      case 'instruments': audio.melody(); for (let i = 0; i < 3; i++) setTimeout(() => emote(P, '♪', '#7a6cff'), i * 450); return;
      case 'telescope': this.read('Telescope', ctx.planet < 2 ? 'Through the lens: a speck of light in the dark. The next world, waiting.' : 'Through the lens: Lanternmoss, small and green and glowing. Home.'); return;
      case 'fireplace': P.mana = P.stats.maxMana; toast('You warm your hands by the fire. Feeling cosy.'); emote(P, 'heart', '#ffb03d'); return;
      case 'anvil': this.read('Anvil', 'Still warm. A half-finished horseshoe the size of a dinner plate. Whatever wears it must be enormous.'); return;
    }
  },

  // ---------------------------------------------------------------- per frame
  update(dt) {
    if (this.fade) {
      if ((this.fade.t -= dt) <= 0) {
        if (this.fade.phase === 'out') { this.fade.then?.(); this.fade.phase = 'in'; this.fade.t = FADE; setFade(false, FADE); }
        else { this.fade = null; ctx.transitioning = false; }
      }
    }
    const s = this.inside; if (!s) return;
    const t = ctx.time;
    if (s.lidOpen && s.lidOpen.t < 1) { const k = s.lidOpen.t = Math.min(1, s.lidOpen.t + dt / 0.45); s.lidOpen.lid.rotation.x = -1.9 * (1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2); }
    for (const fire of s.room.fires) fire.scale.setScalar(1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.04);
    s.room.light.intensity = 18 + Math.sin(t * 7) * 0.8;
    if (s.resident) {                                                // turns to look at you when you come over
      const r = s.resident, p = r.parts, dx = s.x - r.x, dz = s.z - r.z;
      p.head.rotation.z = Math.sin(t * 1.4) * 0.05; p.body.position.y = Math.sin(t * 2) * 0.02;
      if (Math.hypot(dx, dz) < 4.5) { const want = Math.atan2(dx, dz); let d = want - p.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); p.root.rotation.y += d * damp(5, dt); }
    }
    if (s.sleeper && (s.sleeper.zT -= dt) <= 0) {
      s.sleeper.zT = 3; const p = s.room.toWorld(s.room.bedAt.x, s.room.bedAt.z, 1.6);
      sparkles.emit(p, { count: 3, color: 0xb8b0ff, speed: 0.4, up: ROOM_UP, upBias: 1.5, life: 1.2, size: 0.3 });
    }
  },
};

/** What E does here: talk to the nearest villager, or the door / furniture / resident Houses offers, or a chest
    (./Chests.js), whichever is closest. */
export function currentInteraction() {
  if (!ctx.started || Dialog.open || Houses.fade) return null;
  if (Fishing.active) return Fishing.target();                      // fishing: E reels in
  let h = Houses.target();
  if (Houses.inside) return h;
  for (const c of [Portals.target(), Chests.target(), Pets.target(), rareTarget(), Stations.target(), Farm.target(), Fishing.target(), Gathering.target()]) if (c && (!h || c.dist < h.dist)) h = c;
  const P = ctx.player, n = nearestNPC(P, ctx.npcs);
  if (n && (!h || n.pos.distanceTo(P.pos) <= h.dist)) {
    return { label: `Talk to ${n.name}${Challenges.tagFor(n)}`, at: _w.copy(n.pos).addScaledVector(n.up, n.height + n.hover + 0.35).clone(), run: () => Dialog.start(n) };
  }
  return h;
}
