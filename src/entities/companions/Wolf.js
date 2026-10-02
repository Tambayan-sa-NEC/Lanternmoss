/* Wolf companion (knight): a Critter that heels beside the knight instead of wandering. */
import * as THREE from 'three';
import { CHARACTERS } from '../../config/characters.js';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { updateShadow } from '../../fx/shadows.js';
import { removeDyn } from '../../physics/colliders.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { damp } from '../../utils/math.js';
import { mr } from '../../utils/random.js';
import { dirAlong, projectTangent, tangentTo, turnToward } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';
import { Critter } from '../wildlife/Critter.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3();

export class Wolf extends Critter {
  constructor() {
    const side = new V3().crossVectors(ctx.player.up, ctx.player.fwd).normalize();
    super('wolf', dirAlong(ctx.player.up, side, CHARACTERS.knight.wolf.sideOffset));
    this.selfCollider.active = false;            // never block the knight with his own pet
    this.root.scale.setScalar(1.15); this.height = 1.0; this.state = 'idle'; this.idleT = 0; this.howlT = mr(15, 30);
    this.goal = new V3(); this.toGoal = new V3(); this.fwd.copy(ctx.player.fwd); projectTangent(this.fwd, this.up).normalize();
  }
  update(dt) {
    const W = CHARACTERS.knight.wolf, P = ctx.player;
    const dist = tangentTo(this.pos, this.up, P.pos, this.toP);             // this.toP is also read by Critter.animate (head look)
    _tv.crossVectors(P.up, P.fwd).normalize();
    this.goal.copy(P.pos).addScaledVector(_tv, W.sideOffset).addScaledVector(P.fwd, -W.behind);   // heel spot: behind and to the side
    const d = tangentTo(this.pos, this.up, this.goal, this.toGoal);
    if (d > W.teleportDist) {        // after respawning or a long dash, just catch up
      this.up.copy(this.goal).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r);
      this.fwd.copy(P.fwd); projectTangent(this.fwd, this.up).normalize(); }
    const target = d > W.stopDist ? Math.min(W.runSpeed, W.walkSpeed + (d - W.stopDist) * 2.5) : 0;
    if (target > 0) { turnToward(this.fwd, this.toGoal, this.up, damp(8, dt)); this.idleT = 0; this.state = 'follow'; }
    else { _tv2.copy(P.fwd); projectTangent(_tv2, this.up).normalize(); turnToward(this.fwd, _tv2, this.up, damp(2, dt));
      this.idleT += dt; this.state = this.idleT > W.sitAfter ? 'sit' : 'idle'; }
    if (!P.grounded && P.vy > 3 && this.grounded && dist < 5) { this.vy = 4.5; this.grounded = false; }   // hops along with the knight
    this.speed += (target - this.speed) * damp(6, dt);
    _tv2.copy(this.fwd).multiplyScalar(this.speed);
    const n = this.step(_tv2, dt, 24);
    if (n && this.speed > 0.5) { this.fwd.addScaledVector(n, 0.9); projectTangent(this.fwd, this.up).normalize(); }
    if (this.state === 'sit' && (this.howlT -= dt) < 0) { this.howlT = mr(25, 45); emote(this, '♪', '#7fb8ff'); audio.howl(); }
    this.animate(dt, dist);
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); removeDyn(this.selfCollider); }
}
