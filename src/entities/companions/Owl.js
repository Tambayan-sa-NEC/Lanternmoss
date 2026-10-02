/* Pet owl (witch): springs along over the magician's shoulder; swoops at enemies that are
   already fighting her, marking them (+spell damage) and interrupting wind-ups. */
import * as THREE from 'three';
import { COMBAT } from '../../config/combat.js';
import { ctx } from '../../core/context.js';
import { damageEnemy } from '../../combat/damage.js';
import { targeting } from '../../combat/targeting.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { buildOwl } from '../../models/creatures.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { damp } from '../../utils/math.js';
import { mr } from '../../utils/random.js';
import { frameQuat, projectTangent, turnToward } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';
import { ENGAGED } from '../enemies/states.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3();

export class Owl {
  constructor() {
    Object.assign(this, buildOwl()); scene.add(this.root); this.shadow = makeShadow(0.3);
    this.up = ctx.player.up.clone(); this.pos = ctx.player.pos.clone().addScaledVector(ctx.player.up, COMBAT.owl.followHeight);
    this.vel = new V3(); this.fwd = ctx.player.fwd.clone(); this.goal = new V3(); this.side = new V3();
    this.state = 'follow'; this.cool = 2; this.target = null; this.t = 0; this.height = 0.45; this.hootT = mr(12, 25);
  }
  pickTarget() {
    const o = COMBAT.owl; let best = null, bd = o.range;
    const last = targeting.lastHit;
    if (last && last.alive && !last.hidden && ctx.time - targeting.lastHitT < 5 && last.pos.distanceTo(ctx.player.pos) < o.range) best = last;
    else for (const e of ctx.enemies) { if (!e.alive || e.hidden || !ENGAGED.has(e.state)) continue; const d = e.pos.distanceTo(ctx.player.pos); if (d < bd) { bd = d; best = e; } }
    if (best) { this.target = best; this.state = 'swoop'; this.t = 0; }
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); }
  strike() {
    const o = COMBAT.owl; damageEnemy(this.target, o.damage, { source: 'owl', mark: o.markTime, stagger: o.stagger, from: this.pos });
    sparkles.emit(this.pos, { count: 16, color: 0xf3e2c8, speed: 2.4, up: this.up, upBias: 0.6, life: 0.6, size: 0.3 });
    audio.owlStrike(); this.state = 'return'; this.cool = o.cooldown; this.vel.addScaledVector(this.up, 7);
  }
  update(dt) {
    const o = COMBAT.owl; this.cool -= dt; this.hootT -= dt;
    if (this.state === 'swoop') {
      this.t += dt;
      if (!this.target || !this.target.alive || this.target.hidden || this.t > 2.5 || ctx.player.dead) { this.state = 'return'; this.cool = o.cooldown * 0.5; }
      else { _tv.copy(this.target.center()).sub(this.pos); const d = _tv.length();
        this.vel.lerp(_tv.divideScalar(Math.max(d, 1e-4)).multiplyScalar(o.swoopSpeed), damp(7, dt));
        if (d < this.target.hitR + 0.45) this.strike(); }
    }
    if (this.state !== 'swoop') {
      this.side.crossVectors(ctx.player.fwd, ctx.player.up);
      this.goal.copy(ctx.player.pos).addScaledVector(ctx.player.up, o.followHeight + Math.sin(ctx.time * 1.7) * 0.18).addScaledVector(this.side, 0.95).addScaledVector(ctx.player.fwd, -0.6);
      _tv.copy(this.goal).sub(this.pos); const d = _tv.length();
      if (d > 25) { this.pos.copy(this.goal); this.vel.set(0, 0, 0); }          // catch up instantly after a respawn
      const k = this.state === 'return' ? 40 : 22, c = this.state === 'return' ? 9 : 7.5;
      this.vel.addScaledVector(_tv, k * dt).multiplyScalar(Math.exp(-c * dt));
      if (this.state === 'return' && d < 1.2) this.state = 'follow';
      if (this.state === 'follow' && this.cool <= 0 && !ctx.player.dead) this.pickTarget();
      if (this.state === 'follow' && this.hootT < 0) { this.hootT = mr(20, 40); emote(this, '♪', '#b58cff'); audio.hoot(); }
    }
    this.pos.addScaledVector(this.vel, dt);
    const len = this.pos.length(); this.up.copy(this.pos).divideScalar(len);
    const minR = groundHeight(this.up) + 0.6; if (len < minR) this.pos.copy(this.up).multiplyScalar(minR);
    _tv.copy(this.vel); projectTangent(_tv, this.up); const hs = _tv.length();
    if (hs > 1.5) turnToward(this.fwd, _tv.divideScalar(hs), this.up, damp(8, dt));
    else { _tv2.copy(ctx.player.fwd); projectTangent(_tv2, this.up).normalize(); turnToward(this.fwd, _tv2, this.up, damp(3, dt)); }
    projectTangent(this.fwd, this.up).normalize();
    const flap = Math.sin(ctx.time * (this.state === 'swoop' ? 22 : 9 + hs * 1.2)) * (hs > 0.8 || this.state === 'swoop' ? 0.9 : 0.35);
    this.wingL.rotation.z = -flap; this.wingR.rotation.z = flap;
    this.body.rotation.x = this.state === 'swoop' ? 0.5 : Math.min(0.3, hs * 0.04);
    this.head.rotation.y = this.state === 'follow' ? Math.sin(ctx.time * 0.6) * 0.5 : 0;
    this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion);
    updateShadow(this.shadow, this.up, this.fwd, len - groundHeight(this.up));
  }
}
