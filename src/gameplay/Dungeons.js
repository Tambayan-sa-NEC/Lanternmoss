/* CAVES (TODO 29b, config/dungeons.js): entering a planet's cave from its surface mouth, walking its rooms and leaving.
   The layout comes from the planet's seed (world/caveLayout.js), so its room ids never change; the rooms are built
   far below the planet (world/caves.js) and the hero uses the shared flat-floor Walker physics
   under the room camera, in the dark (local light: the lanterns and the hero's own light).
   The room combat frame enables the existing hero kits and pets; surface enemies and pickups wait outside.
   Leave by stepping back onto the mouth (or E there). Fainting inside, travelling, or a new adventure takes the hero out
   at once; a save made inside records the surface mouth, so Continue never starts underground (the indoor pose is 29d).
   The surface mouth's spot is worked out for every planet with a cave, placed last so nothing else moves, but the mouth
   only appears for a released cave: unreleased caves stay out of normal play. */
import * as THREE from 'three';
import { CAVE, CAVES } from '../config/dungeons.js';
import { PLANETS } from '../config/planets.js';
import { encounterEvents } from '../combat/events.js';
import { cancelAim } from '../combat/aiming.js';
import { clearTargets } from '../combat/targeting.js';
import { clearHazards } from '../combat/hazards.js';
import { RoomSpace } from '../physics/RoomSpace.js';
import { ctx } from '../core/context.js';

import { LocalLights } from '../render/lighting.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { addCollider, freeOfColliders, removeCollider } from '../physics/colliders.js';
import { audio } from '../systems/AudioSystem.js';
import { setRoomView, snapCamera } from '../systems/CameraSystem.js';

import { setFade } from '../ui/banner.js';
import { Dialog } from '../ui/Dialog.js';

import { arcDist, matrixAt, offsetDir, projectTangent, tangentToward } from '../utils/sphere.js';
import { generateCave, roomAt } from '../world/caveLayout.js';
import { buildCave, CAVE_ORIGIN, CAVE_UP } from '../world/caves.js';
import { Pets } from './Pets.js';
import { petEffects } from './petAbilities.js';
import { isFree } from '../world/placement.js';
import { dryGround, groundHeight, slopeAt } from '../world/terrain.js';

const V3 = THREE.Vector3, BACK = new V3(0, 0, 1), FADE = 0.35;
const _tv = new V3(), _fwd = new V3();

export const Dungeons = {
  inside: null,   // { planet, cave, layout, built, x, z, vx, vz, armed, room }
  fade: null, mouth: null, world: null,

  /** The planet's cave (a CAVES entry) or null; and its layout, from the planet's seed (always the same). */
  caveFor(planet = ctx.planet) { return CAVES[PLANETS[planet]?.id] ?? null; },
  layoutFor(planet = ctx.planet) { const c = this.caveFor(planet); return c ? generateCave(c, PLANETS[planet].seed) : null; },

  // ---------------------------------------------------------------- the surface mouth
  /** Works out this planet's mouth: a dry, open spot `distance` from the square, clear of `avoid` ([[dir, r]]).
      Only a released cave shows it. Returns the spot ({ dir, cave }) or null. */
  setup(world, planet, avoid = []) {
    this.clear(); this.world = world; const cave = this.caveFor(planet); if (!cave) return null;
    const E = CAVE.entrance, seed = PLANETS[planet].seed % 11;
    let at = null;
    for (let ring = E.distance[0]; ring <= E.distance[1] && !at; ring += 2) for (let a = 0; a < 6.28 && !at; a += 0.19) {
      const d = offsetDir(world.spawnDir, a + seed * 0.6, ring);
      if (!isFree(d, E.clearance) || !freeOfColliders(d, E.clearance) || slopeAt(d) > 0.3 || !dryGround(d)) continue;
      if (avoid.some(([c, r]) => arcDist(d, c) < r + E.clearance)) continue;
      at = d;
    }
    if (!at) return null;
    this.mouth = { dir: at, fwd: tangentToward(at, world.spawnDir), cave, planet, parts: null, collider: null };
    if (cave.released) this.buildMouth();
    return this.mouth;
  },
  buildMouth() {
    const m = this.mouth, root = new THREE.Group(), c = m.cave.colors;
    for (const x of [-1.6, 1.6]) addTo(root, part(G.box(0.9, 2.6, 0.9), c.wall), [x, 1.3, 0]);   // a rocky arch
    addTo(root, part(G.box(4.1, 0.8, 1.0), c.wall), [0, 2.8, 0]);
    addTo(root, part(G.box(2.3, 2.3, 0.1), 0x0c0a12, { outline: false }), [0, 1.15, -0.3]);       // the dark inside
    root.matrixAutoUpdate = false; root.matrix.copy(matrixAt(m.dir.clone().multiplyScalar(groundHeight(m.dir)), m.dir, m.fwd)); scene.add(root);
    m.parts = root; m.collider = addCollider(m.dir, 0.4, { r: 0.5, base: 0, top: 3 });
  },
  clear() {
    this.reset();
    if (this.mouth?.parts) { scene.remove(this.mouth.parts); disposeTree(this.mouth.parts); }
    if (this.mouth?.collider) removeCollider(this.mouth.collider);
    this.mouth = null;
  },

  // ---------------------------------------------------------------- entering and leaving
  enter(planet = ctx.planet) {
    if (this.fade || this.inside || ctx.indoors) return false;
    const cave = this.caveFor(planet); if (!cave) return false;
    this.fadeThen(() => this.goInside(planet)); return true;
  },
  leave() { if (!this.fade && this.inside) this.fadeThen(() => this.goOutside()); },
  fadeThen(then) { ctx.transitioning = true; setFade(true, FADE); this.fade = { phase: 'out', t: FADE, then }; Dialog.close(); audio.whoosh(); },

  goInside(planet) {
    const P = ctx.player, cave = this.caveFor(planet), layout = generateCave(cave, PLANETS[planet].seed), built = buildCave(layout, cave.colors);
    const m = layout.mouth;
    cancelAim(); clearTargets(); clearHazards();
    for (const p of ctx.projectiles) p.dispose(); ctx.projectiles = [];
    const surface = { enemies: ctx.enemies, boss: ctx.boss, items: ctx.worldItems, stay: Pets.stayDir, exit: this.mouth?.dir ?? this.world.spawnDir,
      spotted: petEffects.spotted, scent: petEffects.scent, weatherVisible: this.world.weather.group.visible, visibility: [] };
    this.world.weather.group.visible = false;   // surface precipitation must not follow the hero into the cave
    for (const e of [...surface.enemies, ...surface.items]) {
      for (const mesh of [e.root, e.mesh, e.shadow, e.tele, ...(e.fxMeshes ?? [])].filter(Boolean)) {
        surface.visibility.push([mesh, mesh.visible]); mesh.visible = false;
      }
      if (e.bar) { surface.visibility.push([e.bar.style, e.bar.style.display, true]); e.bar.style.display = 'none'; }
    }
    ctx.enemies = []; ctx.boss = null; ctx.worldItems = [];
    petEffects.spotted = []; petEffects.scent = null;
    ctx.room = new RoomSpace(layout, CAVE_ORIGIN); ctx.room.surface = surface;
    this.inside = { planet, cave, layout, built, surface, x: m.x, z: m.z - 1.2, vx: 0, vz: 0, armed: false, room: layout.entrance };
    P.selfCollider.active = false; P.vel.set(0, 0, 0); P.knock.set(0, 0, 0); P.vy = 0; P.grounded = true;
    P.motion = null; P.up.copy(CAVE_UP); P.fwd.set(0, 0, -1);
    ctx.room.attach(P, built.toWorld(m.x, m.z - 1.2));
    ctx.indoors = cave.name;
    Pets.spawn();
    setRoomView({ up: CAVE_UP, back: BACK }); LocalLights.setDarkness(CAVE.darkness);
  },
  goOutside() {
    const P = ctx.player, s = this.inside; if (!s) return;
    this.teardown();                                                    // (the fade that called this carries on)
    const dir = this.mouth?.planet === s.planet ? this.mouth.dir : this.world?.spawnDir;
    if (dir) {
      P.placeAt(dir);
      _fwd.copy(this.mouth?.fwd ?? P.fwd); projectTangent(_fwd, P.up).normalize(); P.fwd.copy(_fwd);   // step out, away from the mouth
      snapCamera(P.up, _fwd.clone().negate());
    }
    ctx.companion?.snapToHero();                                        // teardown rebuilt it in the surface frame
  },
  /** Out at once, without a fade: fainting, travel, a new adventure. A fade under way is cancelled (input unlocked). */
  reset() {
    this.teardown();
    if (this.fade) { this.fade = null; ctx.transitioning = false; setFade(false, 0); }
  },
  /** The cave gone and the hero's own movement back. */
  teardown() {
    if (this.inside) {
      cancelAim(); clearTargets(); clearHazards();
      for (const p of ctx.projectiles) p.dispose(); ctx.projectiles = [];
      for (const e of ctx.enemies) e.dispose();
      for (const w of ctx.worldItems) w.dispose();
      const { surface } = this.inside;
      ctx.enemies = surface.enemies; ctx.boss = surface.boss; ctx.worldItems = surface.items;
      this.world.weather.group.visible = surface.weatherVisible;
      for (const [o, value, style] of surface.visibility) { if (style) o.display = value; else o.visible = value; }
      Pets.stayDir = surface.stay; petEffects.spotted = surface.spotted; petEffects.scent = surface.scent;
      const P = ctx.player;
      ctx.room.detach(P); P.motion = null; P.motionHs = 0; P.leapK = 0; P.dashT = 0; P.vy = 0;
      P.selfCollider.active = true; P.placeAt(this.mouth?.dir ?? this.world.spawnDir); P.grounded = true;
      this.inside.built.dispose(); this.inside = null; ctx.room = null; ctx.indoors = null;
      LocalLights.setDarkness(0); setRoomView(null);
      Pets.spawn(); if (Pets.mode === 'stay' && surface.stay) Pets.stayDir = surface.stay;
    }
  },

  // ---------------------------------------------------------------- room placement (fixtures and future saved poses)
  placeHero() { const s = this.inside; ctx.room.place(ctx.player, s.built.toWorld(s.x, s.z)); },
  // ---------------------------------------------------------------- what E does
  target() {
    if (this.fade || !ctx.started || Dialog.open) return null;
    const P = ctx.player, s = this.inside;
    if (s) {
      const m = s.layout.mouth, d = Math.hypot(s.x - m.x, s.z - m.z);
      return d < CAVE.mouthReach ? { dist: d, label: 'Leave the cave', at: s.built.toWorld(m.x, m.z, 1.4), run: () => this.leave() } : null;
    }
    const mo = this.mouth; if (!mo?.parts || mo.planet !== ctx.planet || ctx.indoors) return null;
    const d = arcDist(P.up, mo.dir); if (d > 2.6) return null;
    return { dist: d, label: `Enter ${mo.cave.name}`, at: mo.dir.clone().multiplyScalar(groundHeight(mo.dir) + 3.2), run: () => this.enter() };
  },

  update(dt) {
    if (this.inside) {
      const s = this.inside, P = ctx.player;
      s.x = P.pos.x - CAVE_ORIGIN.x; s.z = P.pos.z - CAVE_ORIGIN.z;
      s.vx = P.vel.x; s.vz = P.vel.z; s.room = roomAt(s.layout, s.x, s.z) ?? s.room;
      const d = Math.hypot(s.x - s.layout.mouth.x, s.z - s.layout.mouth.z);
      if (d > 2.2) s.armed = true;
      else if (s.armed && d < 0.7 && s.vz > 0.5 && P.grounded) this.leave();
    }
    if (!this.fade) return;
    if ((this.fade.t -= dt) <= 0) {
      if (this.fade.phase === 'out') { this.fade.then?.(); this.fade.phase = 'in'; this.fade.t = FADE; setFade(false, FADE); }
      else { this.fade = null; ctx.transitioning = false; }
    }
  },
};

encounterEvents.addEventListener('playerfainted', () => { if (Dungeons.inside) Dungeons.reset(); });   // the usual respawn takes the hero home
