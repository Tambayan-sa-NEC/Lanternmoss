/* CAVES (TODO 29b, config/dungeons.js): entering a planet's cave from its surface mouth, walking its rooms and leaving.
   The layout comes from the planet's seed (world/caveLayout.js), so its room ids never change; the rooms are built
   far below the planet (world/caves.js) and the hero walks their flat floor (Player.motion = the cave controller)
   under the room camera, in the dark (local light: the lanterns and the hero's own light).
   Like a house for now: no combat inside (ctx.indoors; 29c brings fights in), and the companion waits outside.
   Leave by stepping back onto the mouth (or E there). Fainting inside, travelling, or a new adventure takes the hero out
   at once; a save made inside records the surface mouth, so Continue never starts underground (the indoor pose is 29d).
   The surface mouth's spot is worked out for every planet with a cave, placed last so nothing else moves, but the mouth
   only appears for a released cave: unreleased caves stay out of normal play. */
import * as THREE from 'three';
import { CAVE, CAVES } from '../config/dungeons.js';
import { PLANETS } from '../config/planets.js';
import { encounterEvents } from '../combat/events.js';
import { ctx } from '../core/context.js';
import { held } from '../core/keybinds.js';
import { LocalLights } from '../render/lighting.js';
import { addTo, disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { addCollider, freeOfColliders, removeCollider } from '../physics/colliders.js';
import { audio } from '../systems/AudioSystem.js';
import { setRoomView, snapCamera } from '../systems/CameraSystem.js';
import { keys } from '../systems/InputSystem.js';
import { setFade } from '../ui/banner.js';
import { Dialog } from '../ui/Dialog.js';
import { damp } from '../utils/math.js';
import { arcDist, matrixAt, offsetDir, projectTangent, tangentToward, turnToward } from '../utils/sphere.js';
import { generateCave, roomAt, walkable } from '../world/caveLayout.js';
import { buildCave, CAVE_UP } from '../world/caves.js';
import { isFree } from '../world/placement.js';
import { dryGround, groundHeight, slopeAt } from '../world/terrain.js';

const V3 = THREE.Vector3, BACK = new V3(0, 0, 1), FADE = 0.35, WALK = 3.4, RUN = 5.2, RADIUS = 0.35;
const _tv = new V3(), _fwd = new V3();

export const Dungeons = {
  inside: null,   // { planet, cave, layout, built, x, z, vx, vz, armed, room }
  fade: null, mouth: null, onLeave: null, world: null, motion: null,

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
    this.inside = { planet, cave, layout, built, x: m.x, z: m.z - 1.2, vx: 0, vz: 0, armed: false, room: layout.entrance };
    P.selfCollider.active = false; P.vel.set(0, 0, 0); P.knock.set(0, 0, 0); P.vy = 0; P.grounded = true;
    P.up.copy(CAVE_UP); P.fwd.set(0, 0, -1); P.motion = this.motion = (p, dt) => this.walk(p, dt); this.placeHero();
    ctx.indoors = cave.name;
    if (ctx.companion) { ctx.companion.root.visible = false; if (ctx.companion.shadow) ctx.companion.shadow.visible = false; }
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
    this.onLeave?.();                                                    // the companion catches up (Game wires this)
  },
  /** Out at once, without a fade: fainting, travel, a new adventure. A fade under way is cancelled (input unlocked). */
  reset() {
    this.teardown();
    if (this.fade) { this.fade = null; ctx.transitioning = false; setFade(false, 0); }
  },
  /** The cave gone and the hero's own movement back. */
  teardown() {
    if (this.inside) { this.inside.built.dispose(); this.inside = null; ctx.indoors = null; LocalLights.setDarkness(0); setRoomView(null); }
    const P = ctx.player; if (P && this.motion && P.motion === this.motion) { P.motion = null; P.motionHs = 0; P.selfCollider.active = true; }   // only our own controller
    this.motion = null;
  },

  // ---------------------------------------------------------------- the cave controller (Player.motion)
  placeHero() { const P = ctx.player, s = this.inside; s.built.toWorld(s.x, s.z, 0, P.pos); P.r = P.pos.length(); },
  walk(P, dt) {
    const s = this.inside; if (!s) return false;
    let f = 0, side = 0;
    if (!ctx.transitioning && !ctx.inventoryOpen) {
      if (held('moveForward', keys)) f += 1; if (held('moveBack', keys)) f -= 1;
      if (held('moveRight', keys)) side += 1; if (held('moveLeft', keys)) side -= 1;
    }
    const len = Math.hypot(f, side) || 1, speed = held('sprint', keys) ? RUN : WALK, k = damp(12, dt);
    s.vx += (side / len * speed - s.vx) * k; s.vz += (-f / len * speed - s.vz) * k;
    const nx = s.x + s.vx * dt, nz = s.z + s.vz * dt, rects = s.built.rects;
    if (walkable(rects, nx, nz, RADIUS)) { s.x = nx; s.z = nz; }        // walls: slide along whichever axis is free
    else if (walkable(rects, nx, s.z, RADIUS)) { s.x = nx; s.vz = 0; }
    else if (walkable(rects, s.x, nz, RADIUS)) { s.z = nz; s.vx = 0; }
    else { s.vx = s.vz = 0; }
    s.room = roomAt(s.layout, s.x, s.z) ?? s.room;
    this.placeHero();
    const v = Math.hypot(s.vx, s.vz); P.vel.set(s.vx, 0, s.vz); P.motionHs = v; P.up.copy(CAVE_UP);
    if (v > 0.3) turnToward(P.fwd, _tv.set(s.vx / v, 0, s.vz / v), CAVE_UP, damp(12, dt));
    const toMouth = Math.hypot(s.x - s.layout.mouth.x, s.z - s.layout.mouth.z);   // step back onto the mouth to leave
    if (toMouth > 2.2) s.armed = true;
    else if (s.armed && toMouth < 0.7 && s.vz > 0.5) this.leave();
    return true;
  },

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
    if (!this.fade) return;
    if ((this.fade.t -= dt) <= 0) {
      if (this.fade.phase === 'out') { this.fade.then?.(); this.fade.phase = 'in'; this.fade.t = FADE; setFade(false, FADE); }
      else { this.fade = null; ctx.transitioning = false; }
    }
  },
};

encounterEvents.addEventListener('playerfainted', () => { if (Dungeons.inside) Dungeons.reset(); });   // the usual respawn takes the hero home
