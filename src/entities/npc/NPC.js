/* Villagers: follow a daily schedule between named places (npcDefs.js, config/day.js), stroll around where they are,
   sleep at night, face the hero when close, and hand out lines: story reactions first (once each), then a shuffled
   bag of whatever currently applies. They dress for each planet (models/villagers.js buildOutfit). */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { PLAYER } from '../../config/game.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { dayClock } from '../../gameplay/dayClock.js';
import { storyState } from '../../gameplay/storyState.js';
import { buildOutfit, outfitColor } from '../../models/villagers.js';
import { addDyn, removeDyn, resolveCollisions } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { damp } from '../../utils/math.js';
import { mpick, mr, rng } from '../../utils/random.js';
import { arcDist, offsetDir, projectTangent, tangentTo, tangentToward, turnToward } from '../../utils/sphere.js';
import { SPAWN_DIR } from '../../world/World.js';
import { groundHeight } from '../../world/terrain.js';

const V3 = THREE.Vector3;
const _toP = new V3(), _tv = new V3(), _tv2 = new V3(), _p = new V3();
const WALK = 2.4, STROLL = 1.5;          // travelling between places / strolling around one
const ARRIVE = 1.6;                     // close enough to a place to count as there
const SHORTCUT_AFTER = 4;               // failed detours in a row before a stuck villager skips ahead (only out of the hero's sight)

export class NPC extends Walker {
  /** def: see npcDefs.js. */
  constructor(def) {
    super(def.dir, def.radius); this.def = def; this.name = def.name; this.height = def.height; this.hover = def.hover || 0;
    Object.assign(this, def.build()); scene.add(this.root); this.shadow = makeShadow(0.6);
    this.selfCollider = addDyn(this.up, this.radius);
    this.home = this.up.clone(); this.state = 'idle'; this.timer = mr(2, 5); this.speed = 0; this.phase = 0; this.gesture = 0; this.loop = 0; this.spin = 0;
    this.talking = false; this.bag = []; this.last = -1; this.seen = new Set(); this.goal = null;
    this.asleep = false; this.awakeT = 0; this.zT = mr(1, 4); this.checkT = 0; this.checkDist = 0; this.detourT = 0; this.detourSign = 1; this.stuckN = 0;
    this.outfit = null;
    this.baseLineCount = def.lines.length;        // challenges append lines; a new run trims back to this
    this.settleAt(this.placeNow().dir);
  }
  /** Where the schedule wants this villager right now: { dir, wander }. */
  placeNow() {
    const d = this.def, key = d.schedule?.[dayClock.phase];
    return d.places?.[key] ?? { dir: d.dir, wander: d.wander || 0 };
  }
  /** Stands the villager at dir (clear of obstacles), facing the village centre. */
  settleAt(dir) {
    this.up.copy(dir).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r); this.vy = 0; this.grounded = true;
    _p.copy(this.pos); resolveCollisions(_p, this.radius, this.selfCollider); this.up.copy(_p).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r);
    this.home.copy(this.up); this.state = 'idle'; this.timer = mr(2, 5); this.speed = 0; this.goal = null; this.talking = false; this.loop = this.spin = 0;
    this.asleep = false; this.fwd.copy(tangentToward(this.up, SPAWN_DIR));
  }
  /** A story reaction (a `once` line) that applies now and hasn't been said yet, marked as said; or null. */
  reaction(s = storyState()) {
    const lines = this.def.lines, i = lines.findIndex((l, k) => l.once && !this.seen.has(k) && (!l.when || l.when(s)));
    if (i < 0) return null; this.seen.add(i); return lines[i];
  }
  /** Next line: an unsaid story reaction, else the shuffled bag of lines that apply now (never the same twice running). */
  nextLine() {
    const s = storyState(), lines = this.def.lines, ok = i => !lines[i].once && (!lines[i].when || lines[i].when(s));
    const fresh = this.reaction(s); if (fresh) return fresh;
    for (let pass = 0; pass < 2; pass++) {
      while (this.bag.length) { const i = this.bag.pop(); if (ok(i)) { this.last = i; return lines[i]; } }
      this.bag = [...lines.keys()].filter(ok).sort(() => rng() - 0.5);
      if (this.bag[this.bag.length - 1] === this.last && this.bag.length > 1) [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
    }
    return lines[0];
  }
  /** Moves into a new planet's village: takes that planet's places (def from npcDefs) and stands where the schedule says. */
  relocate(def) {
    this.def = { ...this.def, dir: def.dir, places: def.places };
    this.settleAt(this.placeNow().dir);
  }
  /** Puts on this planet's outfit (none on the home planet). */
  dress(planet) {
    if (this.outfit) { this.outfit.parent.remove(this.outfit); disposeTree(this.outfit); this.outfit = null; }
    const o = buildOutfit(planet, { headR: this.def.headR, color: outfitColor(planet, this.def.color), hat: this.def.hat });
    if (o) { this.head.add(o); this.outfit = o; }
  }
  /** Dialogue memory, without transient presentation state. */
  toJSON() { return { seen: [...this.seen], last: this.last }; }
  load(data) { this.seen = new Set(data.seen.filter(i => this.def.lines[i])); this.last = data.last; this.bag = []; }

  /** Back to the start-of-adventure chatter. */
  resetLines() { this.def.lines.length = this.baseLineCount; this.bag = []; this.last = -1; this.seen.clear(); }
  /** Wakes up for a chat (they doze off again a while after you leave, if it is still night). */
  wake() { this.asleep = false; this.awakeT = 10; }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); removeDyn(this.selfCollider); }

  /** Steering for one frame: returns the desired speed and turns this.fwd. */
  steer(dt, dist) {
    if (this.talking) { this.wake(); turnToward(this.fwd, _toP, this.up, damp(6, dt)); return 0; }
    const place = this.placeNow(), away = arcDist(this.up, place.dir);
    if (away > ARRIVE + place.wander) {                              // on the way to where the schedule says (busy villagers walk on past you)
      this.asleep = false; this.state = 'travel';
      if ((this.checkT -= dt) <= 0) {                               // barely closer than a moment ago: walk round the obstacle
        if (this.checkDist - away < 0.8) {
          this.stuckN++; this.detourT = 1.4 + this.stuckN * 0.5; this.detourSign = this.stuckN % 2 ? 1 : -1;
          // still stuck after several tries and nobody's watching: take the shortcut (they know the village better than we do)
          if (this.stuckN >= SHORTCUT_AFTER && arcDist(ctx.player.up, this.up) > 22 && arcDist(ctx.player.up, place.dir) > 22) { this.settleAt(place.dir); return 0; }
        } else this.stuckN = 0;
        this.checkT = 1.6; this.checkDist = away;
      }
      _tv.copy(tangentToward(this.up, place.dir));
      if ((this.detourT -= dt) > 0) _tv.applyAxisAngle(this.up, this.detourSign * (1.1 + Math.min(this.stuckN, 3) * 0.15));
      turnToward(this.fwd, _tv, this.up, damp(4, dt));
      return WALK;
    }
    if (dist < 3.8 && !this.asleep) { turnToward(this.fwd, _toP, this.up, damp(6, dt)); return 0; }   // say hello when you come close
    const night = dayClock.phase === 'night' && this.def.sleeps !== false;
    if (night && (this.awakeT -= dt) <= 0) {                        // at home for the night
      if (!this.asleep) { this.asleep = true; this.state = 'idle'; }
      if ((this.zT -= dt) <= 0) { this.zT = mr(3.5, 6); emote(this, 'z', '#7a6cff'); }
      return 0;
    }
    this.stuckN = 0;
    if (!place.wander) return 0;                                     // strolls around the place
    this.timer -= dt;
    if (this.state !== 'walk' && this.timer < 0) { this.state = 'walk'; this.timer = mr(4, 8); this.goal = offsetDir(place.dir, rng() * 6.28, rng() * place.wander); }
    else if (this.state === 'walk') {
      _tv.copy(this.goal).sub(this.up); projectTangent(_tv, this.up).normalize(); turnToward(this.fwd, _tv, this.up, damp(3, dt));
      if (arcDist(this.up, this.goal) < 1 || this.timer < 0) { this.state = 'idle'; this.timer = mr(2, 5); }
      return STROLL;
    }
    return 0;
  }

  update(dt) {
    const time = ctx.time, dist = tangentTo(this.pos, this.up, ctx.player.pos, _toP);
    const target = this.steer(dt, dist);
    // asleep at home: they've gone inside to bed (you'll find them there: src/gameplay/Houses.js). Nothing to bump into
    // or push around out here, just the odd "z" drifting from the door.
    const inBed = this.asleep && this.def.sleepsIndoors;
    this.root.visible = this.shadow.visible = !inBed; this.selfCollider.active = !inBed;
    if (inBed) return;
    this.speed += (target - this.speed) * damp(6, dt);
    _tv2.copy(this.fwd).multiplyScalar(this.speed);
    const n = this.step(_tv2, dt, 24);
    if (n && this.speed > 0.3) { this.fwd.addScaledVector(n, 0.8); projectTangent(this.fwd, this.up).normalize(); }
    // animation
    this.phase += dt * this.speed * 2.6; const sw = Math.sin(this.phase) * Math.min(1, this.speed) * 0.7;
    if (this.legL) { this.legL.rotation.x = sw; this.legR.rotation.x = -sw; }
    const breathe = this.asleep ? Math.sin(time * 1.2) * 0.04 : Math.sin(time * 2.1 + this.home.x * 10) * 0.025;
    this.body.position.y = breathe + Math.abs(Math.sin(this.phase)) * 0.05 * Math.min(1, this.speed);
    this.gesture = Math.max(0, this.gesture - dt * 0.7);
    if (this.def.gesture === 'wave' && this.armR) { this.armR.rotation.x = -this.gesture * 2.6; this.armR.rotation.z = 0.08 + Math.sin(time * 12) * 0.35 * this.gesture; }
    else if (this.def.gesture === 'raise') this.armL.rotation.x = -this.gesture * 2.4;
    if (this.lute) this.lute.rotation.x = Math.sin(time * 9) * 0.05 * (this.talking ? 1 : 0.2);
    this.head.rotation.x += ((this.asleep ? 0.35 : 0) - this.head.rotation.x) * damp(3, dt);      // nods off
    this.head.rotation.z = Math.sin(time * 1.5) * 0.05 + (this.talking ? Math.sin(time * 5) * 0.06 : 0);
    this.def.anim?.(this, dt);
    if (this.spin > 0) { this.spin -= dt; this.fwd.applyAxisAngle(this.up, 12 * dt); }
    this.place(this.root);
    if (this.hover) {
      this.root.position.addScaledVector(this.up, Math.sin(time * 2.2) * 0.15 - (this.asleep ? 0.6 : 0));
      if (this.loop > 0) {
        this.loop -= dt; const a = (2.2 - this.loop) / 2.2 * Math.PI * 2; _tv.crossVectors(this.up, this.fwd);
        this.root.position.addScaledVector(this.fwd, Math.sin(a) * 1.6).addScaledVector(_tv, (1 - Math.cos(a)) * 1.2).addScaledVector(this.up, Math.sin(a * 2) * 0.6);
        sparkles.emit(this.root.position.clone().addScaledVector(this.up, 0.5), { count: 2, color: mpick([0xcffaff, 0xffd6f5]), speed: 0.3, life: 0.8, size: 0.3 });
      }
    }
    updateShadow(this.shadow, this.up, this.fwd, this.hover + (this.r - groundHeight(this.up)));
  }
}

/** The villager within talking range of the player, nearest first (or null). Villagers asleep indoors don't count. */
export function nearestNPC(player, npcs) {
  let best = null, bd = PLAYER.talkRange;
  for (const n of npcs) { if (!n.root.visible) continue; const d = player.pos.distanceTo(n.pos); if (d < bd) { bd = d; best = n; } }
  return best;
}
