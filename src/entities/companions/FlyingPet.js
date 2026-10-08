/* A flying pet (owl, wisp, dragon whelp): flutters at the hero's shoulder (or hovers over its stay spot), swoops at
   the monster its command picks (./petBrain.js), strikes and flies back. Models: src/models/creatures.js. */
import * as THREE from 'three';
import { PET_MOTION, PET_SHOWCASE, PETS } from '../../config/pets.js';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { Pets } from '../../gameplay/Pets.js';
import { buildOwl, buildWhelp, buildWispPet } from '../../models/creatures.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { damp } from '../../utils/math.js';
import { mr } from '../../utils/random.js';
import { frameQuat, projectTangent, turnToward } from '../../utils/sphere.js';
import { groundHeight } from '../../world/terrain.js';
import { keepTarget, pickTarget, strike } from './petBrain.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3();
const MODELS = { owl: buildOwl, wisp: () => buildWispPet(), whelp: buildWhelp };
const VOICE = { owl: 'hoot', wisp: 'chirp', whelp: 'chirp' };
const STRIKE_SOUND = { owl: 'owlStrike', wisp: 'wispShot', whelp: 'castFire' };

export class FlyingPet {
  constructor(id) {
    this.petId = id; this.def = PETS[id]; this.color = parseInt(this.def.color.slice(1), 16);
    Object.assign(this, MODELS[this.def.model]()); scene.add(this.root); this.shadow = makeShadow(0.3);
    const P = ctx.player, M = PET_MOTION.fly;
    this.up = P.up.clone(); this.pos = P.pos.clone().addScaledVector(P.up, M.height);
    this.vel = new V3(); this.fwd = P.fwd.clone(); this.goal = new V3(); this.side = new V3();
    this.state = 'follow'; this.cool = 2; this.target = null; this.t = 0; this.height = 0.45; this.voiceT = mr(12, 25);
    this.spinT = 0; this.flinchT = 0; this.visible = true;
    this.voice = audio[VOICE[this.def.model]];
  }
  get busy() { return this.state === 'swoop'; }
  setVisible(on) { this.visible = on; this.root.visible = this.shadow.visible = on; if (!on) { this.state = 'follow'; this.target = null; } }
  snapToHero() { const P = ctx.player; this.pos.copy(P.pos).addScaledVector(P.up, PET_MOTION.fly.height); this.vel.set(0, 0, 0); this.state = 'follow'; }
  celebrate() { this.spinT = 0.8; this.vel.addScaledVector(this.up, 4); }
  flourish(kind) { if (kind === 'rise') this.vel.addScaledVector(this.up, 9); else this.spinT = 0.8; }
  flinch() { this.flinchT = 0.25; }
  onCommand(mode) { if (mode === 'passive' || mode === 'stay') { this.state = 'return'; this.target = null; } emote(this, mode === 'stay' ? '!' : '♪', this.def.color); }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); }

  hit() {
    strike(this, this.target);
    sparkles.emit(this.pos, { count: 16, color: this.color, speed: 2.4, up: this.up, upBias: 0.6, life: 0.6, size: 0.3 });
    audio[STRIKE_SOUND[this.def.model]](); this.state = 'return'; this.cool = this.def.attack.cooldown; this.vel.addScaledVector(this.up, 7);
  }
  /** Where it wants to be: the hero's shoulder, or above its stay spot (in front of the hero while a menu shows it off). */
  home(out) {
    const P = ctx.player, M = PET_MOTION.fly, bob = Math.sin(ctx.time * 1.7) * 0.18;
    if (Pets.presenting) { const S = PET_SHOWCASE.fly; return out.copy(P.pos).addScaledVector(P.up, S.height).addScaledVector(P.fwd, S.ahead); }
    if (Pets.mode === 'stay' && Pets.stayDir) return out.copy(Pets.stayDir).multiplyScalar(groundHeight(Pets.stayDir) + M.height * 0.8 + bob);
    this.side.crossVectors(P.fwd, P.up);
    return out.copy(P.pos).addScaledVector(P.up, M.height + bob).addScaledVector(this.side, 0.95).addScaledVector(P.fwd, -0.6);
  }
  /** While the world is paused for the pet menu (src/ui/PetMenu.js): hover at the hero's shoulder (or its stay spot),
      flapping gently, on the menu's own clock. A body swapped in there flies in from above the hero. */
  pose(dt) {
    if (!this.visible) return;
    const t = this.poseT = (this.poseT ?? 0) + dt;
    this.home(this.goal).addScaledVector(this.up, Math.sin(t * 1.7) * 0.15);
    this.pos.lerp(this.goal, damp(4, dt)); const len = this.pos.length(); this.up.copy(this.pos).divideScalar(len);
    if (this.spinT > 0) { this.spinT -= dt; this.fwd.applyAxisAngle(this.up, 14 * dt); }
    else { _tv2.copy(ctx.player.fwd); projectTangent(_tv2, this.up).normalize(); turnToward(this.fwd, _tv2, this.up, damp(4, dt)); }
    projectTangent(this.fwd, this.up).normalize();
    const flap = Math.sin(t * 9) * 0.45; this.wingL.rotation.z = -flap; this.wingR.rotation.z = flap;
    this.body.rotation.set(0, 0, 0); this.head.rotation.y = Math.sin(t * 0.6) * 0.5;
    this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion);
    updateShadow(this.shadow, this.up, this.fwd, len - groundHeight(this.up));
  }
  update(dt) {
    if (!this.visible) return;
    const M = PET_MOTION.fly; this.cool -= dt; this.voiceT -= dt; this.spinT -= dt; this.flinchT -= dt;
    if (this.state === 'swoop') {
      this.t += dt;
      if (!keepTarget(this, this.target) || this.t > 2.5) { this.state = 'return'; this.cool = this.def.attack.cooldown * 0.5; }
      else { _tv.copy(this.target.center()).sub(this.pos); const d = _tv.length();
        this.vel.lerp(_tv.divideScalar(Math.max(d, 1e-4)).multiplyScalar(M.swoopSpeed), damp(7, dt));
        if (d < this.target.hitR + 0.45) this.hit(); }
    }
    if (this.state !== 'swoop') {
      this.home(this.goal); _tv.copy(this.goal).sub(this.pos); const d = _tv.length();
      if (d > M.teleportDist && Pets.mode !== 'stay') { this.pos.copy(this.goal); this.vel.set(0, 0, 0); }   // catch up after a respawn
      const k = this.state === 'return' ? 40 : 22, c = this.state === 'return' ? 9 : 7.5;
      this.vel.addScaledVector(_tv, k * dt).multiplyScalar(Math.exp(-c * dt));
      if (this.state === 'return' && d < 1.2) this.state = 'follow';
      if (this.state === 'follow' && this.cool <= 0) { const e = pickTarget(this); if (e) { this.target = e; this.state = 'swoop'; this.t = 0; } }
      if (this.state === 'follow' && this.voiceT < 0) { this.voiceT = mr(20, 40); emote(this, '♪', this.def.color); this.voice.call(audio); }
    }
    this.pos.addScaledVector(this.vel, dt);
    const len = this.pos.length(); this.up.copy(this.pos).divideScalar(len);
    const minR = groundHeight(this.up) + 0.6; if (len < minR) this.pos.copy(this.up).multiplyScalar(minR);
    _tv.copy(this.vel); projectTangent(_tv, this.up); const hs = _tv.length();
    if (this.spinT > 0) this.fwd.applyAxisAngle(this.up, 14 * dt);
    else if (hs > 1.5) turnToward(this.fwd, _tv.divideScalar(hs), this.up, damp(8, dt));
    else { _tv2.copy(ctx.player.fwd); projectTangent(_tv2, this.up).normalize(); turnToward(this.fwd, _tv2, this.up, damp(3, dt)); }
    projectTangent(this.fwd, this.up).normalize();
    const flap = Math.sin(ctx.time * (this.state === 'swoop' ? 22 : 9 + hs * 1.2)) * (hs > 0.8 || this.state === 'swoop' ? 0.9 : 0.35);
    this.wingL.rotation.z = -flap; this.wingR.rotation.z = flap;
    this.body.rotation.x = this.state === 'swoop' ? 0.5 : Math.min(0.3, hs * 0.04);
    this.body.rotation.z = this.flinchT > 0 ? Math.sin(this.flinchT * 60) * 0.3 : 0;
    this.head.rotation.y = this.state === 'follow' ? Math.sin(ctx.time * 0.6) * 0.5 : 0;
    this.root.position.copy(this.pos); frameQuat(this.up, this.fwd, this.root.quaternion);
    updateShadow(this.shadow, this.up, this.fwd, len - groundHeight(this.up));
  }
}
