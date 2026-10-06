/* Wandering animals: cats, dogs and spirit foxes in the village; bunnies, deer, frogs and lizards out in the wilds
   (config/critters.js). They wander, nap, and react when the hero comes close: the village pets come to say hello,
   the wild ones bolt (deer from far off), frogs hop away with a ribbit. Hoppers move in little jumps.
   A rare creature (def.rare) flees only if you run at it: walk up to it slowly and it sits for you (befriending it:
   ./wildlife.js); after its gift it's away for a while, then turns up somewhere else. */
import * as THREE from 'three';
import { CRITTER_DEFS, RARE_CRITTERS } from '../../config/critters.js';
import { PLAYER } from '../../config/game.js';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { buildQuad, buildToad } from '../../models/creatures.js';
import { addDyn, removeDyn } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { clamp, damp } from '../../utils/math.js';
import { mpick, mr } from '../../utils/random.js';
import { arcDist, projectTangent, tangentTo, tangentToward, turnToward } from '../../utils/sphere.js';
import { spawnSpot } from '../../world/placement.js';
import { toast } from '../../ui/toast.js';
import { groundHeight } from '../../world/terrain.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3();
const REACT = { deer: 9, bunny: 5, lizard: 4.5, frog: 3 };            // how close the hero comes before they react (default 4.2)
const FLEE = { fox: 6.2, deer: 7.5, bunny: 5.2, lizard: 6, frog: 3, toad: 3 };   // running-away speed (default 4.2)
let shyHint = false;

export class Critter extends Walker {
  constructor(defKey, dir) {
    const def = CRITTER_DEFS[defKey]; super(dir, def.radius ?? (def.kind === 'dog' ? 0.38 : 0.32));
    this.def = def; this.defKey = defKey; this.kind = def.kind; Object.assign(this, (def.build === 'toad' ? buildToad : buildQuad)(def)); scene.add(this.root);
    this.shadow = makeShadow(def.kind === 'deer' ? 0.7 : 0.45); this.height = { deer: 1.5, frog: 0.45, lizard: 0.5 }[def.kind] ?? 0.85; this.fwd.applyAxisAngle(this.up, Math.random() * 6.28);
    this.home = this.up.clone(); this.hopT = 0; this.rare = def.rare ?? null; this.away = 0;
    this.state = 'idle'; this.timer = mr(1, 3); this.speed = 0; this.phase = Math.random() * 10; this.cool = 0; this.turnRate = 0; this.sit = 0; this.trailT = 0;
    this.baseSpeed = def.speed ?? { cat: 1.4, dog: 1.9, fox: 2.3 }[this.kind] ?? 1.5;
    this.selfCollider = addDyn(this.up, this.radius * 0.8);
    this.toP = new V3();      // tangent direction toward the player, refreshed every update (also read by animate)
  }
  dispose() { scene.remove(this.root, this.shadow); disposeTree(this.root); removeDyn(this.selfCollider); }
  react() {
    this.cool = 9 + Math.random() * 4;
    if (this.kind === 'frog') { emote(this, '♪', '#6fc46a'); this.state = 'flee'; this.timer = 0.9; audio.plip(); return; }
    if (this.kind === 'bunny' || this.kind === 'deer' || this.kind === 'lizard') {
      if (this.kind === 'deer' || Math.random() < 0.6) emote(this, '!', '#ff8a3d');
      this.state = 'flee'; this.timer = { deer: 3.5, bunny: 2.2, lizard: 1.6 }[this.kind]; this.cool = 4 + Math.random() * 3; return;
    }
    if (this.kind === 'cat') {
      if (this.state === 'nap' || Math.random() < 0.45) { emote(this, '!', '#ff8a3d'); this.vy = 4.2; this.grounded = false; this.state = 'flee'; this.timer = 1.8; }
      else { emote(this, 'heart'); this.state = 'sit'; this.timer = 4; this.vy = 2.5; this.grounded = false; }
      audio.meow();
    } else if (this.kind === 'dog') {
      emote(this, Math.random() < 0.6 ? 'heart' : '!', Math.random() < 0.5 ? '#ff6b9a' : '#ff8a3d');
      this.state = 'follow'; this.timer = 7; this.vy = 3.6; this.grounded = false; audio.bark();
    } else {
      emote(this, 'star', '#b58cff'); this.state = 'spin'; this.timer = 0.9;
      sparkles.emit(this.pos.clone().addScaledVector(this.up, 0.6), { count: 30, color: 0xd8b8ff, speed: 2.5, up: this.up, upBias: 0.8, life: 1.1, size: 0.3 }); audio.sparkle();
    }
  }
  /** A rare creature: bolts if the hero runs at it, sits still for a slow approach. */
  shy(dist) {
    const P = ctx.player, R = RARE_CRITTERS, running = P.vel.length() > PLAYER.walkSpeed * R.spookSpeed;
    if (this.state === 'flee') return;
    if (dist < R.spook && running) {
      emote(this, '!', '#ffd36b'); this.state = 'flee'; this.timer = 3; audio.chirp();
      if (!shyHint) { shyHint = true; toast(`The ${this.rare.name} is shy... walk up to it slowly, don't run.`); }
    } else if (dist < 6) { if (this.state !== 'sit') { this.state = 'sit'; emote(this, '?', '#ffd36b'); } this.timer = 2; }
  }
  /** Gone after giving its gift; back somewhere else later. */
  goAway() {
    sparkles.emit(this.pos.clone().addScaledVector(this.up, 0.5), { count: 50, color: this.rare.color, speed: 3, up: this.up, upBias: 1, life: 1.2, size: 0.38 });
    this.away = RARE_CRITTERS.away; this.root.visible = this.shadow.visible = false; this.selfCollider.active = false;
  }
  reappear() {
    const P = ctx.player; let d = spawnSpot(null);
    for (let i = 0; i < 20 && arcDist(d, P.up) < 60; i++) d = spawnSpot(null);
    this.up.copy(d); this.r = groundHeight(d); this.pos.copy(d).multiplyScalar(this.r); this.home.copy(d);
    this.root.visible = this.shadow.visible = true; this.selfCollider.active = true; this.state = 'idle'; this.timer = 1;
  }
  update(dt) {
    if (this.away > 0) { if ((this.away -= dt) <= 0) this.reappear(); return; }
    const toP = this.toP, dist = tangentTo(this.pos, this.up, ctx.player.pos, toP);
    this.cool -= dt; this.timer -= dt;
    if (ctx.showcase && dist < 6) { this.state = 'wander'; this.timer = Math.max(this.timer, 1); this.turnRate = 0; this.fwd.copy(toP).negate(); }   // keep out of a menu's shot
    else if (this.rare) this.shy(dist);
    else if (this.cool <= 0 && dist < (REACT[this.kind] ?? 4.2) && !['flee', 'spin'].includes(this.state)) this.react();
    let target = 0;
    switch (this.state) {
      case 'idle':
        if (this.timer < 0) {
          if (this.kind === 'cat' && Math.random() < 0.3) { this.state = 'nap'; this.timer = mr(6, 10); }
          else { this.state = 'wander'; this.timer = mr(2, 5); this.turnRate = mr(-1.2, 1.2); }
        }
        break;
      case 'wander':
        target = this.kind === 'lizard' ? (this.timer % 1.2 < 0.45 ? this.baseSpeed * 2 : 0) : this.baseSpeed;   // lizards scurry in bursts
        this.fwd.applyAxisAngle(this.up, this.turnRate * dt);
        if (this.kind === 'frog' && arcDist(this.up, this.home) > 4) turnToward(this.fwd, tangentToward(this.up, this.home), this.up, damp(3, dt));   // frogs stay by their pond
        if (this.kind === 'frog' && Math.random() < dt * 0.05) { emote(this, '♪', '#6fc46a'); audio.plip(); }
        if (this.timer < 0) { this.state = 'idle'; this.timer = mr(1.2, 4); }
        break;
      case 'nap':
        if (Math.random() < dt * 0.4) emote(this, 'z', '#7a6cff');
        if (this.timer < 0) { this.state = 'idle'; this.timer = 1; }
        break;
      case 'sit':
        turnToward(this.fwd, toP, this.up, damp(5, dt)); if (this.timer < 0) { this.state = 'idle'; this.timer = 1; }
        break;
      case 'follow':
        turnToward(this.fwd, toP, this.up, damp(6, dt)); target = dist > 2.2 ? Math.min(6, dist * 1.8) : 0;
        if (dist < 2.6 && this.grounded && Math.random() < dt * 1.4) { this.vy = 3.4; this.grounded = false; }
        if (this.timer < 0) { this.state = 'idle'; this.timer = 2; }
        break;
      case 'flee':
        _tv.copy(toP).negate(); turnToward(this.fwd, _tv, this.up, damp(8, dt)); target = this.rare ? 7 : FLEE[this.kind] ?? 4.2;
        if (this.timer < 0) { this.state = 'idle'; this.timer = mr(1, 3); }
        break;
      case 'spin':
        this.fwd.applyAxisAngle(this.up, 9 * dt); target = 2.4; if (this.timer < 0) { this.state = 'flee'; this.timer = 2.6; }
        break;
    }
    this.speed += (target - this.speed) * damp(6, dt);
    if (this.def.hop && this.grounded && this.speed > 0.6 && (this.hopT -= dt) <= 0) {   // hoppers move in little jumps
      this.vy = this.def.hop * (this.state === 'flee' ? 1.2 : 1); this.grounded = false; this.hopT = 0.3;
    }
    _tv2.copy(this.fwd).multiplyScalar(this.speed);
    const n = this.step(_tv2, dt, 24);
    if (n && this.speed > 0.3) { this.fwd.addScaledVector(n, 0.9); projectTangent(this.fwd, this.up).normalize(); this.turnRate = -this.turnRate; }
    if (this.rare && Math.random() < dt * 6) sparkles.emit(_tv.copy(this.pos).addScaledVector(this.up, 0.4 + Math.random() * 0.4), { count: 1, color: this.rare.color, speed: 0.6, up: this.up, upBias: 1, life: 0.9, size: 0.3 });
    // spirit fox: sparkle trail from its glowing tail
    if (this.tip && this.speed > 1) {
      this.trailT -= dt;
      if (this.trailT < 0) { this.trailT = 0.04; this.tip.getWorldPosition(_tv); sparkles.emit(_tv, { count: 1, color: mpick([0xc7a8ff, 0xffd6f5, 0xbff4ff]), speed: 0.4, life: 0.9, size: 0.28 }); }
    }
    this.animate(dt, dist);
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
  /** Legs, sitting, tail wag and head-turn toward the player (uses this.toP from the latest update). time = the
      clock the wag and nods follow (the pet menu passes its own while the world is paused). */
  animate(dt, dist, time = ctx.time) {
    const toP = this.toP, s = this.speed; this.phase += dt * (2 + s * 5.5);
    const sw = Math.min(1, s / 1.4) * 0.8, a = Math.sin(this.phase) * sw, [fl, fr, bl, br] = this.legs;
    const sitT = (this.state === 'sit' || this.state === 'nap') ? 1 : 0; this.sit += (sitT - this.sit) * damp(6, dt);
    fl.rotation.x = a; br.rotation.x = a - this.sit * 1.2; fr.rotation.x = -a; bl.rotation.x = -a - this.sit * 1.2;
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.04 * Math.min(1, s) - this.sit * (this.state === 'nap' ? 0.16 : 0.06);
    this.body.rotation.x = -this.sit * (this.state === 'nap' ? 0 : 0.3);
    const wag = this.state === 'follow' ? 18 : this.kind === 'cat' ? 2.5 : 6;
    this.tail.rotation.z = Math.sin(time * wag + this.phase) * (this.kind === 'cat' ? 0.35 : 0.5);
    // look at the player when close
    let look = 0; if (dist < 6 && this.state !== 'nap') { _tv.crossVectors(this.fwd, toP); look = clamp(Math.atan2(_tv.dot(this.up), this.fwd.dot(toP)), -0.8, 0.8); }
    this.head.rotation.y += (look - this.head.rotation.y) * damp(6, dt);
    this.head.rotation.x = this.state === 'nap' ? 0.4 : Math.sin(time * 1.3 + this.phase * 0.1) * 0.05;
  }
}
