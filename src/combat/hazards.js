/* HAZARDS: timed area effects that outlive the move that created them, for both sides:
     Blast  a marked circle that detonates after `delay` (Meteor, a dragon's lobbed fireball, a demon lord's hellfire)
     Zone   a lingering circle that deals damage in ticks for `duration` (Arrow Rain, fire pools)
   team 'player' damages monsters (the hero's abilities: level scaling, no source), anything else damages the hero.
   Each hazard has an owner (a boss, or 'player') so a boss that resets or dies can clear its own leftovers.
   Updated from CombatSystem after the enemies; clearHazards() runs on planet changes and restarts. */
import * as THREE from 'three';
import { groundPoint, hitStop, ringFX } from '../fx/combatFx.js';
import { GroundDecal } from '../fx/groundDecals.js';
import { sparkles } from '../fx/sparkles.js';
import { ctx } from '../core/context.js';
import { buildArrow } from '../models/heroes.js';
import { disposeTree, G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { shakeCamera } from '../systems/CameraSystem.js';
import { clamp } from '../utils/math.js';
import { mr, rng } from '../utils/random.js';
import { dirAlong, frameQuat, projectTangent, tangentFrame } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { edgeFraction, enemiesInArea, playerInArea } from './area.js';
import { damageEnemy, hurtPlayer } from './damage.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3(), _up = new V3();

const list = [];
export function addHazard(h) { list.push(h); return h; }
export function updateHazards(dt) { for (let i = list.length - 1; i >= 0; i--) if (!list[i].update(dt)) { list[i].dispose(); list.splice(i, 1); } }
/** Removes every hazard of `owner` (or all of them when owner is omitted). */
export function clearHazards(owner = null) {
  for (let i = list.length - 1; i >= 0; i--) if (!owner || list[i].owner === owner) { list[i].dispose(); list.splice(i, 1); }
}
export function hazardsOf(owner) { return list.filter(h => h.owner === owner); }

/** A random surface direction inside the circle (uniform over its area). */
export function scatterIn(center, radius) {
  const [t1, t2] = tangentFrame(center), a = rng() * Math.PI * 2;
  return dirAlong(center, t1.multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a)), radius * Math.sqrt(rng()));
}

/** Shake scaled by how close the hero is to the effect. */
function shakeNear(point, amount) { if (amount) shakeCamera(amount * clamp(1.2 - point.distanceTo(ctx.player.pos) / 30, 0.2, 1)); }

/** The falling meteor / hellfire bolt / lobbed fireball drawn while a blast counts down. */
function makeMissile(kind, color, size) {
  const g = new THREE.Group();
  if (kind === 'meteor') {
    g.add(part(G.dodec(size), 0x4a2a22));
    for (const [x, y, z] of [[0.6, 0.3, 0.2], [-0.5, -0.2, 0.4], [0.1, 0.5, -0.6]]) {
      const m = part(G.dodec(size * 0.45), 0x3a1e18); m.position.set(x * size, y * size, z * size); g.add(m);
    }
    const glow = part(G.ico(size * 1.12, 1), color, { glow: true, intensity: 1.6 }); glow.material = glow.material.clone();
    glow.material.transparent = true; glow.material.opacity = 0.55; glow.material.blending = THREE.AdditiveBlending; glow.material.depthWrite = false; g.add(glow);
    g.userData.ownMat = glow.material;
  } else g.add(part(G.ico(size, 1), color, { glow: true, intensity: 2.8 }));
  scene.add(g); return g;
}

export class Blast {
  /** o: owner, team, center (surface dir), radius, delay, damage, color (+ warnColor for the ground mark), knock,
        falloff (0..1: damage lost toward the edge), lethal, stun, slow + slowTime, jumpable (a jump clears it),
        fall: 'meteor' (drops from the sky) | 'lob' (arcs over from `from`, a world point) | null, size (missile size),
        shake, stop (hit-stop seconds on impact), sound (audio method), onImpact(blast) */
  constructor(o) {
    Object.assign(this, { falloff: 0, knock: 0, shake: 0.35, stop: 0, size: 0.5, sound: 'explode', jumpable: false, ...o });
    this.center = o.center.clone(); this.t = 0; this.point = groundPoint(this.center, 0);
    const warn = o.warnColor ?? o.color;
    this.fill = new GroundDecal('disc', warn, { k: 0.8 }).place(this.center, null, o.radius);
    this.edge = new GroundDecal('ring', warn, { k: 1.8, lift: 0.14 }).place(this.center, null, o.radius);
    this.core = new GroundDecal('disc', warn, { k: 1.1, lift: 0.16 });
    if (o.fall) {
      this.missile = makeMissile(o.fall === 'meteor' ? 'meteor' : 'orb', o.color, this.size);
      this.start = o.fall === 'lob' ? o.from.clone()
        : dirAlong(this.center, tangentFrame(this.center)[0].applyAxisAngle(this.center, mr(0, 6.28)), 7).multiplyScalar(groundHeight(this.center) + 34);
    }
  }
  update(dt) {
    this.t += dt; const k = Math.min(1, this.t / this.delay);
    this.fill.opacity = 0.1 + 0.22 * k; this.edge.opacity = 0.55 + 0.45 * Math.abs(Math.sin(this.t * (6 + 10 * k)));
    this.core.place(this.center, null, Math.max(0.05, this.radius * k)); this.core.opacity = 0.18 + 0.3 * k;   // fills up as impact nears
    if (this.missile) {
      if (this.fall === 'lob') {
        this.missile.position.lerpVectors(this.start, this.point, k);
        _up.copy(this.missile.position).normalize(); this.missile.position.addScaledVector(_up, Math.sin(Math.PI * k) * 5);
      } else this.missile.position.lerpVectors(this.start, this.point, k * k);   // accelerates as it falls
      this.missile.rotation.x += dt * 3; this.missile.rotation.y += dt * 2;
      if (rng() < dt * 40) sparkles.emit(this.missile.position, { count: 2, color: this.color, speed: 0.8, life: 0.5, size: this.size * 0.9 });
    }
    if (k >= 1) { this.detonate(); return false; }
    return true;
  }
  detonate() {
    const c = this.center, p = this.point;
    ringFX(p, this.radius, this.color, 0.55); ringFX(p, this.radius * 0.55, 0xffffff, 0.35);
    sparkles.emit(groundPoint(c, 0.4), { count: 24 + Math.round(this.radius * 6), color: this.color, speed: 2 + this.radius * 0.6, up: c, upBias: 0.7, life: 0.8, size: 0.45 });
    sparkles.emit(groundPoint(c, 0.4), { count: 12, color: 0xfff0c0, speed: 1.5 + this.radius * 0.3, up: c, upBias: 1, life: 0.6, size: 0.38 });
    shakeNear(p, this.shake); if (this.stop) hitStop(this.stop); audio[this.sound]?.();
    if (this.team === 'player') {
      for (const e of enemiesInArea(c, this.radius))
        damageEnemy(e, this.damage * (1 - this.falloff * edgeFraction(e.up, c, this.radius)),
          { from: p, knock: this.knock, stun: this.stun, slow: this.slow, slowTime: this.slowTime, color: this.color });
    } else if (playerInArea(c, this.radius, this.jumpable)) hurtPlayer(this.damage, p, this.knock, { lethal: this.lethal, source: this.owner });
    this.onImpact?.(this);
  }
  dispose() {
    for (const d of [this.fill, this.edge, this.core]) d.dispose();
    if (this.missile) { scene.remove(this.missile); disposeTree(this.missile); this.missile.userData.ownMat?.dispose(); }
  }
}

const ARROW_RATE = 18, ARROW_FALL = 0.26, ARROW_STUCK = 0.45;
const arrowPool = new Map();   // colour -> spare arrow meshes (a rain drops ~70, so they are reused instead of rebuilt)
function takeArrow(color) { const m = arrowPool.get(color)?.pop() ?? buildArrow(color); scene.add(m); return m; }
function returnArrow(color, m) { scene.remove(m); if (!arrowPool.has(color)) arrowPool.set(color, []); arrowPool.get(color).push(m); }

export class Zone {
  /** o: owner, team, center (surface dir), radius, duration, tick (seconds between damage pulses), firstTick, damage,
        color, slow + slowTime, rain: 'arrows' (arrows pour from the sky) | 'embers' (a burning patch) */
  constructor(o) {
    Object.assign(this, { firstTick: o.tick, ...o });
    this.center = o.center.clone(); this.t = 0; this.next = this.firstTick; this.point = groundPoint(this.center, 0);
    this.fill = new GroundDecal('disc', o.color, { k: 0.7 }).place(this.center, null, o.radius);
    this.edge = new GroundDecal('ring', o.color, { k: 1.6, lift: 0.14 }).place(this.center, null, o.radius);
    this.arrows = []; this.spawnT = 0;
  }
  get live() { return this.t < this.duration; }
  update(dt) {
    this.t += dt; const fade = Math.min(1, this.t / 0.2, Math.max(0, this.duration - this.t) / 0.3);
    this.fill.opacity = 0.16 * fade; this.edge.opacity = (0.45 + 0.25 * Math.sin(this.t * 8)) * fade;
    if (this.rain === 'arrows') this.updateArrows(dt);
    else if (this.live && rng() < dt * this.radius * 7) {
      const d = scatterIn(this.center, this.radius);
      sparkles.emit(groundPoint(d, 0.2), { count: 1, color: rng() < 0.5 ? this.color : 0xffd36b, speed: 0.8, up: d, upBias: 2.2, life: 0.7, size: 0.4 });
    }
    if (this.live && (this.next -= dt) <= 0) { this.next += this.tick; this.pulse(); }
    return this.live || this.arrows.length > 0;
  }
  pulse() {
    if (this.team === 'player') {
      for (const e of enemiesInArea(this.center, this.radius)) damageEnemy(e, this.damage, { slow: this.slow, slowTime: this.slowTime, color: this.color });
    } else if (playerInArea(this.center, this.radius, true)) hurtPlayer(this.damage, null, 0, { source: this.owner });
  }
  updateArrows(dt) {
    if (this.live) for (this.spawnT += dt * ARROW_RATE; this.spawnT >= 1; this.spawnT--) {
      const land = scatterIn(this.center, this.radius), mesh = takeArrow(this.color);
      const end = land.clone().multiplyScalar(groundHeight(land) + 0.25);
      const start = dirAlong(land, tangentFrame(land)[0].applyAxisAngle(land, this.t * 0.7), 1.6).multiplyScalar(groundHeight(land) + 9);
      const fwd = _tv.copy(end).sub(start).normalize(), up = projectTangent(_tv2.copy(land), fwd).normalize();
      frameQuat(up, fwd, mesh.quaternion); mesh.position.copy(start);
      this.arrows.push({ mesh, start, end, land, t: 0 });
    }
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i]; a.t += dt;
      if (a.t < ARROW_FALL) a.mesh.position.lerpVectors(a.start, a.end, a.t / ARROW_FALL);
      else if (!a.landed) { a.landed = true; a.mesh.position.copy(a.end); if (rng() < 0.5) sparkles.emit(a.end, { count: 2, color: 0xe8d6c0, speed: 1, up: a.land, upBias: 0.6, life: 0.35, size: 0.26 }); }
      if (a.t > ARROW_FALL + ARROW_STUCK) { returnArrow(this.color, a.mesh); this.arrows.splice(i, 1); }
    }
  }
  dispose() {
    this.fill.dispose(); this.edge.dispose();
    for (const a of this.arrows) returnArrow(this.color, a.mesh); this.arrows.length = 0;
  }
}
