/* The hero: a surface Walker driven by camera-relative input, with combat state and a swappable model. */
import * as THREE from 'three';
import { COMBAT } from '../../config/combat.js';
import { BUFFS, PLAYER } from '../../config/game.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { buffs } from '../../gameplay/buffs.js';
import { INVENTORY } from '../../config/items.js';
import { Inventory } from '../../inventory/Inventory.js';
import { HERO_BUILDERS } from '../../models/heroes.js';
import { addDyn } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { projectTangent, tangentFrame, turnToward } from '../../utils/sphere.js';
import { damp } from '../../utils/math.js';
import { groundHeight } from '../../world/terrain.js';
import { animateHero, animateKnight } from './poses.js';

const V3 = THREE.Vector3;
const _cf = new V3(), _cr = new V3(), _wish = new V3(), _tv = new V3(), _tv2 = new V3();

/** Per-ability timers used by the knight's moves (always present so they read as 0 for the witch). */
const KNIGHT_TIMERS = { swingT: 0, spinT: 0, guardT: 0, dashT: 0 };

export class Player extends Walker {
  constructor(spawnDir) {
    super(spawnDir, PLAYER.radius);
    this.partKeys = [];
    this.swapModel(HERO_BUILDERS.witch());
    this.vel = new V3(); this.height = 2.0; this.phase = 0; this.squash = 0; this.coyote = 0; this.jumpBuf = 0; this.trail = 0;
    this.shadow = makeShadow(0.55);
    this.selfCollider = addDyn(this.up, PLAYER.radius);
    this.fwd.copy(tangentFrame(spawnDir)[0]);
    // combat
    Object.assign(this, { charId: 'witch', stats: COMBAT.player, hp: COMBAT.player.maxHp, mana: COMBAT.player.maxMana, invuln: 0, hurtT: 0,
      dead: false, deadT: 0, lastHurt: -99, knock: new V3(), castT: 0, castFaceT: 0, level: 1, xp: 0, ...KNIGHT_TIMERS });
    this.inventory = new Inventory(INVENTORY.slots);   // the hero's bag (kept across planets and fainting; emptied on a new adventure)
  }

  /** Replaces the visible model; every part key the old build added is removed first. */
  swapModel(parts) {
    if (this.root) { scene.remove(this.root); disposeTree(this.root); }
    for (const k of this.partKeys) delete this[k];
    this.partKeys = Object.keys(parts); Object.assign(this, parts); scene.add(this.root);
  }

  /** Clears every short-lived combat / ability timer. */
  clearTimers() { Object.assign(this, { castT: 0, castFaceT: 0, invuln: 0, hurtT: 0, ...KNIGHT_TIMERS }); }

  /** Stands the hero on the ground at dir, at rest, facing the first tangent axis there. */
  placeAt(dir) {
    const [t1] = tangentFrame(dir);
    this.up.copy(dir); this.r = groundHeight(dir); this.pos.copy(dir).multiplyScalar(this.r); this.vel.set(0, 0, 0); this.knock.set(0, 0, 0);
    this.fwd.copy(t1);
    return t1;
  }

  /** Movement for one frame. input: { keys, viewFwd (camera heading), enabled (false while menus own the keys) }. */
  update(dt, { keys, viewFwd, enabled }) {
    let f = 0, s = 0;
    if (enabled && !this.dead) {
      if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
      if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
    }
    // Camera-relative input, built in the player's CURRENT tangent plane: W always = away from the camera.
    _cf.copy(viewFwd); projectTangent(_cf, this.up).normalize(); _cr.crossVectors(_cf, this.up);
    _wish.set(0, 0, 0).addScaledVector(_cf, f).addScaledVector(_cr, s); if (_wish.lengthSq() > 1) _wish.normalize();
    const sprint = keys.ShiftLeft || keys.ShiftRight;
    const speed = (sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * (buffs.feather > 0 ? BUFFS.featherSpeed : 1);
    _tv.copy(_wish).multiplyScalar(speed);
    this.vel.lerp(_tv, damp(this.grounded ? PLAYER.accelGround : PLAYER.accelAir, dt));
    // jump with coyote time + input buffer
    this.jumpBuf -= dt; this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = PLAYER.jumpVel * (buffs.moon > 0 ? BUFFS.moonJump : 1); this.grounded = false; this.coyote = 0; this.jumpBuf = 0; this.squash = 0.22; audio.jump();
      sparkles.emit(this.pos, { count: 6, color: 0xfff0e0, speed: 1.2, up: this.up, upBias: 0.3, life: 0.45, size: 0.3 });
    }
    const g = (this.vy > 0 && keys.Space) ? PLAYER.gravityRise * (buffs.moon > 0 ? BUFFS.moonGravity : 1) : PLAYER.gravityFall;
    const wasGrounded = this.grounded, vyBefore = this.vy, spd = this.vel.length();
    _tv2.copy(this.vel).add(this.knock);                         // knockback from hits rides on top of steering
    const n = this.step(_tv2, dt, g);
    projectTangent(this.knock, this.up).multiplyScalar(Math.exp(-6 * dt));
    // transport velocity into the new tangent plane, then remove the part pushing into obstacles => smooth sliding
    projectTangent(this.vel, this.up); if (this.vel.lengthSq() > 1e-8) this.vel.setLength(spd);
    if (n) { const into = this.vel.dot(n); if (into < 0) this.vel.addScaledVector(n, -into); }
    if (!wasGrounded && this.grounded && vyBefore < -4) {
      this.squash = -0.24; audio.land();
      sparkles.emit(this.pos, { count: 10, color: 0xfff0e0, speed: 1.6, up: this.up, upBias: 0.35, life: 0.5, size: 0.32 });
    }
    // face direction of travel
    const hs = this.vel.length();
    if (hs > 0.4 && this.castFaceT <= 0) { _tv.copy(this.vel).divideScalar(hs); turnToward(this.fwd, _tv, this.up, damp(12, dt)); }
    // trails
    this.trail -= dt;
    if (this.grounded && hs > 6 && this.trail < 0) {
      this.trail = 0.07; sparkles.emit(this.pos, { count: 1, color: buffs.feather > 0 ? 0xb8ffe0 : 0xfff0e0, speed: 0.6, up: this.up, upBias: 0.5, life: 0.5, size: 0.28 });
    }
    animateHero(this, dt, hs); if (this.charId === 'knight') animateKnight(this, dt);
    this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up));
  }
}
