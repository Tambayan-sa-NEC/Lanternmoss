/* Villagers: face the hero when close, optionally wander around home, and hand out lines from a shuffled bag. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { PLAYER } from '../../config/game.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { addDyn, resolveCollisions } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { scene } from '../../render/scene.js';
import { damp } from '../../utils/math.js';
import { mpick, mr } from '../../utils/random.js';
import { arcDist, offsetDir, projectTangent, tangentTo, tangentToward, turnToward } from '../../utils/sphere.js';
import { SPAWN_DIR } from '../../world/World.js';
import { groundHeight } from '../../world/terrain.js';

const V3 = THREE.Vector3;
const _toP = new V3(), _tv = new V3(), _tv2 = new V3(), _p = new V3();

export class NPC extends Walker {
  /** def: see npcDefs.js. */
  constructor(def) {
    super(def.dir, def.radius); this.def = def; this.name = def.name; this.height = def.height; this.hover = def.hover || 0;
    Object.assign(this, def.build()); scene.add(this.root); this.shadow = makeShadow(0.6);
    this.selfCollider = addDyn(this.up, this.radius);
    _p.copy(this.pos); resolveCollisions(_p, this.radius, this.selfCollider); this.up.copy(_p).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r);
    this.home = this.up.clone(); this.state = 'idle'; this.timer = mr(2, 5); this.speed = 0; this.phase = 0; this.gesture = 0; this.loop = 0; this.spin = 0;
    this.talking = false; this.bag = []; this.last = -1; this.fwd.copy(tangentToward(this.up, SPAWN_DIR)); this.goal = null;
    this.baseLineCount = def.lines.length;        // challenges append lines; a new run trims back to this
  }
  /** Next line from a shuffled bag, never repeating the previous line across a reshuffle. */
  nextLine() {
    if (!this.bag.length) {
      this.bag = [...this.def.lines.keys()].sort(() => Math.random() - 0.5);
      if (this.bag[this.bag.length - 1] === this.last && this.bag.length > 1) [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
    }
    this.last = this.bag.pop(); return this.def.lines[this.last];
  }
  /** Moves home to dir (a new planet's village): settles clear of obstacles, facing the village centre. */
  relocate(dir) {
    this.up.copy(dir).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r); this.vy = 0; this.grounded = true;
    _p.copy(this.pos); resolveCollisions(_p, this.radius, this.selfCollider); this.up.copy(_p).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r);
    this.home.copy(this.up); this.state = 'idle'; this.timer = mr(2, 5); this.speed = 0; this.goal = null; this.talking = false; this.loop = this.spin = 0;
    this.fwd.copy(tangentToward(this.up, SPAWN_DIR));
  }
  /** Back to the start-of-adventure chatter. */
  resetLines() { this.def.lines.length = this.baseLineCount; this.bag = []; this.last = -1; }
  update(dt) {
    const time = ctx.time, dist = tangentTo(this.pos, this.up, ctx.player.pos, _toP); let target = 0;
    if (this.talking || dist < 3.8) turnToward(this.fwd, _toP, this.up, damp(6, dt));
    else if (this.def.wander) {
      this.timer -= dt;
      if (this.state === 'idle' && this.timer < 0) { this.state = 'walk'; this.timer = mr(4, 8); this.goal = offsetDir(this.home, Math.random() * 6.28, Math.random() * this.def.wander); }
      else if (this.state === 'walk') {
        _tv.copy(this.goal).sub(this.up); projectTangent(_tv, this.up).normalize(); turnToward(this.fwd, _tv, this.up, damp(3, dt)); target = 1.5;
        if (arcDist(this.up, this.goal) < 1 || this.timer < 0) { this.state = 'idle'; this.timer = mr(2, 5); }
      }
    }
    this.speed += (target - this.speed) * damp(6, dt);
    _tv2.copy(this.fwd).multiplyScalar(this.speed);
    const n = this.step(_tv2, dt, 24);
    if (n && this.state === 'walk') { this.fwd.addScaledVector(n, 0.8); projectTangent(this.fwd, this.up).normalize(); }
    // animation
    this.phase += dt * this.speed * 2.6; const sw = Math.sin(this.phase) * Math.min(1, this.speed) * 0.7;
    if (this.legL) { this.legL.rotation.x = sw; this.legR.rotation.x = -sw; }
    this.body.position.y = Math.sin(time * 2.1 + this.home.x * 10) * 0.025 + Math.abs(Math.sin(this.phase)) * 0.05 * Math.min(1, this.speed);
    this.gesture = Math.max(0, this.gesture - dt * 0.7);
    if (this.def.gesture === 'wave' && this.armR) { this.armR.rotation.x = -this.gesture * 2.6; this.armR.rotation.z = 0.08 + Math.sin(time * 12) * 0.35 * this.gesture; }
    else if (this.def.gesture === 'raise') this.armL.rotation.x = -this.gesture * 2.4;
    if (this.lute) this.lute.rotation.x = Math.sin(time * 9) * 0.05 * (this.talking ? 1 : 0.2);
    this.head.rotation.z = Math.sin(time * 1.5) * 0.05 + (this.talking ? Math.sin(time * 5) * 0.06 : 0);
    this.def.anim?.(this, dt);
    if (this.spin > 0) { this.spin -= dt; this.fwd.applyAxisAngle(this.up, 12 * dt); }
    this.place(this.root);
    if (this.hover) {
      this.root.position.addScaledVector(this.up, Math.sin(time * 2.2) * 0.15);
      if (this.loop > 0) {
        this.loop -= dt; const a = (2.2 - this.loop) / 2.2 * Math.PI * 2; _tv.crossVectors(this.up, this.fwd);
        this.root.position.addScaledVector(this.fwd, Math.sin(a) * 1.6).addScaledVector(_tv, (1 - Math.cos(a)) * 1.2).addScaledVector(this.up, Math.sin(a * 2) * 0.6);
        sparkles.emit(this.root.position.clone().addScaledVector(this.up, 0.5), { count: 2, color: mpick([0xcffaff, 0xffd6f5]), speed: 0.3, life: 0.8, size: 0.3 });
      }
    }
    updateShadow(this.shadow, this.up, this.fwd, this.hover + (this.r - groundHeight(this.up)));
  }
}

/** The villager within talking range of the player, nearest first (or null). */
export function nearestNPC(player, npcs) {
  let best = null, bd = PLAYER.talkRange;
  for (const n of npcs) { const d = player.pos.distanceTo(n.pos); if (d < bd) { bd = d; best = n; } }
  return best;
}
