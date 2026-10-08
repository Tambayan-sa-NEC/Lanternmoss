/* A walking pet (wolf, fox): a Critter that heels beside the hero instead of wandering (or sits at its stay spot),
   runs in to bite the monster its command picks (./petBrain.js), then trots back. */
import * as THREE from 'three';
import { PET_MOTION, PET_SHOWCASE, PETS } from '../../config/pets.js';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { updateShadow } from '../../fx/shadows.js';
import { Pets } from '../../gameplay/Pets.js';
import { removeDyn } from '../../physics/colliders.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { damp } from '../../utils/math.js';
import { mr } from '../../utils/random.js';
import { arcDist, dirAlong, projectTangent, tangentTo, turnToward } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';
import { Critter } from '../wildlife/Critter.js';
import { keepTarget, pickTarget, strike } from './petBrain.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3();
const SCALE = { wolf: 1.15, fox: 1.0, dragontoad: 1.0 };
const W_POSE = 4;              // trotting speed into the show-off spot while the world is paused

export class WalkingPet extends Critter {
  constructor(id) {
    const P = ctx.player, side = new V3().crossVectors(P.up, P.fwd).normalize();
    super(PETS[id].model, dirAlong(P.up, side, PET_MOTION.walk.sideOffset));
    this.petId = id; this.def = { ...this.def, ...PETS[id] }; this.color = parseInt(PETS[id].color.slice(1), 16);
    this.selfCollider.active = false;            // never block the hero with their own pet
    this.root.scale.setScalar(SCALE[id] ?? 1); this.height = 1.0; this.state = 'idle'; this.idleT = 0; this.voiceT = mr(15, 30);
    this.goal = new V3(); this.toGoal = new V3(); this.fwd.copy(P.fwd); projectTangent(this.fwd, this.up).normalize();
    this.target = null; this.atkCool = 1.5; this.spinT = 0; this.visible = true;
    this.voice = this.kind === 'wolf' ? audio.bark : this.kind === 'toad' ? audio.plip : audio.meow; this.hopT = 0;
  }
  get busy() { return this.state === 'chase'; }
  setVisible(on) { this.visible = on; this.root.visible = this.shadow.visible = on; if (!on) { this.state = 'idle'; this.target = null; } }
  snapToHero() {
    const P = ctx.player; _tv.crossVectors(P.up, P.fwd).normalize();
    this.up.copy(dirAlong(P.up, _tv, PET_MOTION.walk.sideOffset)); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r);
    this.fwd.copy(P.fwd); projectTangent(this.fwd, this.up).normalize(); this.speed = 0; this.state = 'idle';
  }
  celebrate() { this.spinT = 0.7; if (this.grounded) { this.vy = 4.5; this.grounded = false; } }
  flourish(kind) { if (kind === 'howl') { this.state = 'sit'; this.idleT = 99; } else this.celebrate(); }
  flinch() { if (this.grounded) { this.vy = 2.5; this.grounded = false; } }
  onCommand(mode) {
    if (mode === 'passive' || mode === 'stay') { this.target = null; if (this.state === 'chase') this.state = 'idle'; }
    emote(this, mode === 'stay' ? '!' : '♪', this.def.color); if (this.grounded) { this.vy = 3; this.grounded = false; }
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); removeDyn(this.selfCollider); }

  /** The dragontoad hops as it goes (def.hop) and flaps its little wings in the air. */
  hopAndFlap(dt) {
    if (this.def.hop && this.grounded && Math.abs(this.speed) > 0.8 && (this.hopT -= dt) <= 0) { this.vy = this.def.hop; this.grounded = false; this.hopT = 0.28; }
    if (this.wingL) { const f = this.grounded ? Math.sin(ctx.time * 2) * 0.1 : Math.sin(ctx.time * 28) * 0.7; this.wingL.rotation.z = -f; this.wingR.rotation.z = f; }
  }
  /** Where it shows off in front of the hero (a menu is presenting it). */
  showSpot(out) { const P = ctx.player; return out.copy(P.pos).addScaledVector(P.fwd, PET_SHOWCASE.walk.ahead); }
  /** While the world is paused for the pet menu (src/ui/PetMenu.js): trots round in front of the hero, then stands
      facing the same way, wagging and hopping on the menu's own clock. */
  pose(dt) {
    if (!this.visible) return;
    const t = this.poseT = (this.poseT ?? 0) + dt, P = ctx.player;
    if (this.state === 'chase') { this.state = 'idle'; this.target = null; }
    const d = tangentTo(this.pos, this.up, this.showSpot(this.goal), this.toGoal), target = d > 0.35 ? Math.min(W_POSE, d * 3) : 0;
    if (target > 0) { turnToward(this.fwd, this.toGoal, this.up, damp(8, dt)); this.state = 'follow'; }
    else { _tv2.copy(P.fwd); projectTangent(_tv2, this.up).normalize(); turnToward(this.fwd, _tv2, this.up, damp(4, dt)); this.state = 'idle'; }
    if (this.spinT > 0) { this.spinT -= dt; this.fwd.applyAxisAngle(this.up, 12 * dt); }
    this.speed += (target - this.speed) * damp(6, dt);
    this.step(_tv2.copy(this.fwd).multiplyScalar(this.speed), dt, 24);
    this.animate(dt, 99, t);
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
  update(dt) {
    if (!this.visible) return;
    const W = PET_MOTION.walk, P = ctx.player;
    const dist = tangentTo(this.pos, this.up, P.pos, this.toP);             // this.toP is also read by Critter.animate (head look)
    this.atkCool -= dt; this.spinT -= dt;
    let target = 0;
    if (this.state === 'chase') {
      if (!keepTarget(this, this.target)) { this.state = 'idle'; this.target = null; this.atkCool = 0.6; }
      else {
        const d = tangentTo(this.pos, this.up, this.target.pos, this.toGoal);
        turnToward(this.fwd, this.toGoal, this.up, damp(10, dt)); target = W.chaseSpeed;
        if (d < this.target.hitR + 0.75) {                                 // bite, and a little hop back
          strike(this, this.target); audio.bite(); this.vy = 3.2; this.grounded = false;
          this.state = 'idle'; this.target = null; this.atkCool = this.def.attack.cooldown; this.speed = -2;
        }
      }
    }
    if (this.state !== 'chase') {
      if (Pets.presenting) this.showSpot(this.goal);                                                   // a menu shows it off
      else if (Pets.mode === 'stay' && Pets.stayDir) this.goal.copy(Pets.stayDir).multiplyScalar(groundHeight(Pets.stayDir));
      else { _tv.crossVectors(P.up, P.fwd).normalize(); this.goal.copy(P.pos).addScaledVector(_tv, W.sideOffset).addScaledVector(P.fwd, -W.behind); }   // heel spot
      const d = tangentTo(this.pos, this.up, this.goal, this.toGoal);
      if (arcDist(this.up, _tv.copy(this.goal).normalize()) > W.teleportDist && Pets.mode !== 'stay') {   // after respawning or a long dash, just catch up (along the surface: a tangent distance shrinks across the planet)
        this.up.copy(this.goal).normalize(); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r);
        this.fwd.copy(P.fwd); projectTangent(this.fwd, this.up).normalize(); }
      const stop = Pets.presenting ? 0.35 : W.stopDist;
      target = d > stop ? Math.min(W.runSpeed, W.walkSpeed + (d - stop) * 2.5) : 0;
      if (target > 0) { turnToward(this.fwd, this.toGoal, this.up, damp(8, dt)); this.idleT = 0; this.state = 'follow'; }
      else {
        _tv2.copy(Pets.mode === 'stay' ? this.toP : P.fwd); projectTangent(_tv2, this.up).normalize(); turnToward(this.fwd, _tv2, this.up, damp(2, dt));
        this.idleT += dt; this.state = this.idleT > W.sitAfter ? 'sit' : 'idle';
      }
      if (this.atkCool <= 0) { const e = pickTarget(this); if (e) { this.target = e; this.state = 'chase'; this.idleT = 0; } }
      if (Pets.mode !== 'stay' && !P.grounded && P.vy > 3 && this.grounded && dist < 5) { this.vy = 4.5; this.grounded = false; }   // hops along with the hero
    }
    if (this.spinT > 0) this.fwd.applyAxisAngle(this.up, 12 * dt);
    this.speed += (target - this.speed) * damp(6, dt);
    this.hopAndFlap(dt);
    _tv2.copy(this.fwd).multiplyScalar(this.speed);
    const n = this.step(_tv2, dt, 24);
    if (n && this.speed > 0.5) { this.fwd.addScaledVector(n, 0.9); projectTangent(this.fwd, this.up).normalize(); }
    if (this.state === 'sit' && (this.voiceT -= dt) < 0) { this.voiceT = mr(25, 45); emote(this, '♪', this.def.color); (this.kind === 'wolf' ? audio.howl : audio.meow).call(audio); }
    this.animate(dt, dist);
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
}
