/* ENEMIES: reuse Walker physics/collisions; behaviour is chosen by def.ai
   ('melee' goblins & ogres, 'ranged' wisps, 'hopper' slimes here; newer AIs such as 'bomber', 'charger', 'burrower',
   'support' and 'boss' are behaviour modules in ./behaviors). Balance numbers live in COMBAT.enemies, scaled per planet.
   States: idle / wander / return (out of combat) and chase / windup / recover / charge / flee, plus the bosses'
   active / transition (ENGAGED).
   dormant: a planet boss asleep in its sealed lair (src/gameplay/BossGate.js): hidden, untouchable and still; 'show'
   while it rises during its waking sequence. def.static: an object that never moves or attacks (lair seals).
   elite: a tougher, golden-haloed monster (makeElite) that carries a sigil. */
import * as THREE from 'three';
import { COMBAT } from '../../config/combat.js';
import { ctx } from '../../core/context.js';
import { discGeo, fxMaterial, groundPoint, ringFX } from '../../fx/combatFx.js';
import { emote } from '../../fx/emotes.js';
import { makeShadow, updateShadow } from '../../fx/shadows.js';
import { sparkles } from '../../fx/sparkles.js';
import { ENEMY_BUILDERS } from '../../models/monsters.js';
import { addDyn, removeDyn } from '../../physics/colliders.js';
import { Walker } from '../../physics/Walker.js';
import { disposeTree } from '../../render/meshes.js';
import { scene } from '../../render/scene.js';
import { audio } from '../../systems/AudioSystem.js';
import { shakeCamera } from '../../systems/CameraSystem.js';
import { dom } from '../../ui/dom.js';
import { damp } from '../../utils/math.js';
import { mr, rng } from '../../utils/random.js';
import { arcDist, dirAlong, frameQuat, projectTangent, tangentFrame, tangentTo, tangentToward, turnToward } from '../../utils/sphere.js';
import { SPAWN_DIR } from '../../world/World.js';
import { groundHeight } from '../../world/terrain.js';
import { hurtPlayer } from '../../combat/damage.js';
import { forgetTarget } from '../../combat/targeting.js';
import { encounterEvents } from '../../combat/events.js';
import { Projectile } from '../Projectile.js';
import { ENGAGED } from './states.js';
import { BEHAVIORS } from './behaviors/index.js';
import { enemyDef } from '../../combat/enemyDefs.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3(), _a2 = new V3();
/** Boss states in which a stun lands (never in the middle of a telegraphed attack). */
const STUNNABLE = new Set(['chase', 'recover']);

/** Enemies never fight inside the village safe zone, indoors, or a fainted hero. */
function playerSafe() { return ctx.player.dead || ctx.indoors || arcDist(ctx.player.up, SPAWN_DIR) < COMBAT.player.safeRadius; }

export class Enemy extends Walker {
  /** def defaults to this planet's scaled stats for the type (a boss passes its own, with per-planet overrides). */
  constructor(type, dir, def = enemyDef(type)) {
    super(dir, def.radius);
    this.type = type; this.def = def; this.hover = def.hover || 0; this.height = def.height; this.hitR = def.radius + 0.3;
    Object.assign(this, ENEMY_BUILDERS[type](def)); this.baseScale = this.root.scale.x; scene.add(this.root);
    this.shadow = makeShadow(def.radius * 1.5); this.selfCollider = addDyn(this.up, def.radius);
    this.home = dir.clone(); this.knock = new V3(); this.move = new V3(); this.toP = new V3(); this._c = new V3(); this.seed = rng() * 10;
    if (def.slamRadius || def.telegraph) { this.tele = new THREE.Mesh(discGeo, fxMaterial(0xff4d6d, 1.2)); this.tele.renderOrder = 3; this.tele.visible = false; scene.add(this.tele); }
    this.fxMeshes = [];                               // extra warning meshes a behaviour owns: hidden by hideTele, removed by dispose
    this.behavior = BEHAVIORS[def.behavior ?? def.ai] || null; this.behavior?.init?.(this);   // def.behavior: a boss's own AI
    this.bar = document.createElement('div'); this.bar.className = 'eb'; this.bar.innerHTML = '<i></i>'; dom.enemyBars.appendChild(this.bar); this.barFill = this.bar.firstChild;
    this.spawn(dir);
  }
  spawn(dir) {
    this.up.copy(dir); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r); this.vy = 0; this.grounded = true;
    this.fwd.copy(tangentFrame(this.up)[0]).applyAxisAngle(this.up, rng() * 6.28);
    Object.assign(this, { hp: this.def.hp, alive: true, state: 'idle', timer: mr(0.5, 2.5), cool: 0, speed: 0, phase: 0, deadT: 0, turn: 0,
      slowT: 0, slowAmt: 0, markT: 0, stunT: 0, hitPop: 0, hopT: mr(0.2, 1), hopDir: null, fled: false, remove: false,
      hidden: false, shieldT: 0, shieldAmt: 0, stunnedT: 0 });   // hidden = untargetable (burrowed); shield = damage reduction; stunned = takes bonus damage
    this.knock.set(0, 0, 0); this.selfCollider.active = true; this.root.visible = this.shadow.visible = true; this.root.scale.setScalar(this.baseScale);
    this.behavior?.reset?.(this);
  }
  center() { return this._c.copy(this.pos).addScaledVector(this.up, this.hover + this.height * 0.5); }
  aggro() { if (!this.alive || this.dormant || this.def.static || ENGAGED.has(this.state) || playerSafe()) return; this.state = 'chase'; emote(this, '!', '#ff4d6d'); }
  hideTele() { if (this.tele) this.tele.visible = false; for (const m of this.fxMeshes) m.visible = false; }
  interrupt(t) {
    if (this.def.staggerImmune) return;
    this.stunT = Math.max(this.stunT, t);
    if (this.state === 'windup' || this.state === 'charge') { this.state = 'recover'; this.timer = this.cool = this.def.cooldown * 0.5; this.hideTele(); emote(this, '?', '#8a6ae0'); }
  }
  /** Freezes the monster for t seconds (Leap Slam and other heavy stuns). Ordinary monsters also lose the attack they
      were winding up; bosses only feel it between attacks (chase / recover), shortened by def.stunResist. */
  stun(t) {
    if (this.def.staggerImmune) { if (!STUNNABLE.has(this.state)) return; t *= 1 - (this.def.stunResist ?? 0.6); }
    else this.interrupt(t);
    if (t < 0.05) return;
    this.stunT = Math.max(this.stunT, t); emote(this, '★', '#ffd24a');
  }
  die() {
    this.alive = false; this.state = 'dead'; this.deadT = 0; this.selfCollider.active = false; this.hideTele(); this.bar.style.display = 'none';
    sparkles.emit(this.center(), { count: 36, color: this.def.color, speed: 3, up: this.up, upBias: 0.6, life: 0.9, size: 0.4 });
    audio.enemyDie(); forgetTarget(this);
    this.behavior?.onDie?.(this);
    encounterEvents.dispatchEvent(new CustomEvent('enemydefeated', { detail: { enemy: this } }));
    for (let i = 0; i < (this.def.splitCount || 0); i++) {
      const e = new Enemy(this.def.splitInto, dirAlong(this.up, _tv.copy(this.fwd).applyAxisAngle(this.up, i * Math.PI * 2 / this.def.splitCount + 0.8), 0.9));
      e.home.copy(this.home); e.state = 'chase'; e.vy = 4; e.grounded = false; ctx.enemies.push(e); }
  }
  /** Leaves without a fight (no XP, no splitting): used when a planet is cleared. */
  vanish() {
    if (!this.alive) return;
    this.alive = false; this.state = 'dead'; this.deadT = 0; this.temporary = true; this.selfCollider.active = false; this.hideTele(); this.bar.style.display = 'none';
    sparkles.emit(this.center(), { count: 24, color: 0xfff0a0, speed: 2.2, up: this.up, upBias: 1, life: 0.9, size: 0.34 });
    forgetTarget(this);
  }
  /** Calls in a temporary helper that fights alongside this enemy (boss summons). */
  spawnMinion(type, dir) {
    const m = new Enemy(type, dir); m.temporary = true; m.owner = this; m.home.copy(this.home);
    ctx.enemies.push(m); m.aggro(); return m;
  }
  dispose() {
    scene.remove(this.root, this.shadow); if (this.tele) scene.remove(this.tele); this.bar.remove(); disposeTree(this.root);
    for (const m of this.fxMeshes) { scene.remove(m); m.material.dispose(); }
    this.behavior?.dispose?.(this);
    removeDyn(this.selfCollider);
  }
  /** Turns this monster into an elite: tougher, bigger, worth more, with a golden halo (it never respawns as one). */
  makeElite(k) {
    const d = this.def;
    this.def = { ...d, hp: d.hp * k.hp, damage: (d.damage ?? 0) * k.damage, xp: Math.round(d.xp * k.xp), respawn: 0, elite: true };
    this.elite = true; this.hp = this.def.hp; this.baseScale *= k.scale; this.root.scale.setScalar(this.baseScale);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 20), fxMaterial(k.halo, 2.2));
    halo.rotation.x = Math.PI / 2; halo.position.y = d.height / this.baseScale * k.scale + 0.25 + (d.hover ?? 0); this.root.add(halo); this.halo = halo;
    this.bar.classList.add('elite');
  }
  update(dt) {
    const d = this.def;
    if (this.dormant) {                                            // asleep in its lair (or rising, while 'show')
      const show = this.dormant === 'show'; this.root.visible = this.shadow.visible = show; this.bar.style.display = 'none';
      if (show) { this.animate(dt); this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.hover + this.r - groundHeight(this.up)); }
      return;
    }
    if (this.alive && d.static) {                                  // a lair seal: just stands there, glowing
      this.hitPop = Math.max(0, this.hitPop - dt * 6); this.animate(dt); this.place(this.root);
      updateShadow(this.shadow, this.up, this.fwd, this.r - groundHeight(this.up)); return;
    }
    if (this.halo) this.halo.rotation.z += dt * 1.5;
    if (!this.alive) {
      this.deadT += dt; const k = Math.min(1, this.deadT / 0.45);
      this.root.scale.setScalar(this.baseScale * Math.max(0.01, 1 - k)); this.root.visible = this.shadow.visible = k < 1;
      if (k >= 1 && (!d.respawn || this.temporary)) this.remove = true;
      else if (d.respawn && this.deadT > d.respawn && arcDist(ctx.player.up, this.home) > 22) this.spawn(this.home);
      return;
    }
    this.slowT = Math.max(0, this.slowT - dt); this.markT = Math.max(0, this.markT - dt); this.stunT = Math.max(0, this.stunT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt); this.stunnedT = Math.max(0, this.stunnedT - dt);
    this.cool -= dt; this.timer -= dt; this.hitPop = Math.max(0, this.hitPop - dt * 6);
    const dist = tangentTo(this.pos, this.up, ctx.player.pos, this.toP), safe = playerSafe();
    if (!ENGAGED.has(this.state) && this.state !== 'return' && dist < d.aggro) this.aggro();
    if (ENGAGED.has(this.state) && (safe || arcDist(this.up, this.home) > d.leash || dist > d.aggro * 2.2)) { this.state = 'return'; this.hideTele(); }
    this.move.copy(this.fwd);
    const slowMul = this.slowT > 0 ? 1 - this.slowAmt : 1;
    const speed = (this.stunT > 0 ? 0 : this.think(dt, dist)) * slowMul;
    this.speed += (speed - this.speed) * damp(8, dt);
    if (d.ai === 'hopper') {            // slimes only travel while airborne
      this.hopT -= dt;
      if (this.grounded && Math.abs(speed) > 0.1 && this.hopT <= 0) { this.vy = d.hopVel; this.grounded = false; this.hopT = d.hopInterval; this.hopDir = this.move.clone(); audio.squish(); }
      _tv2.copy(this.hopDir || this.move).multiplyScalar(this.grounded ? 0 : d.speed * slowMul);
    } else _tv2.copy(this.move).multiplyScalar(this.speed);
    _tv2.add(this.knock);
    const n = this.step(_tv2, dt, d.ai === 'hopper' ? 20 : 24);
    projectTangent(this.knock, this.up).multiplyScalar(Math.exp(-7 * dt));
    if (this.hopDir) projectTangent(this.hopDir, this.up).normalize();
    if (n && this.state === 'wander') { this.fwd.addScaledVector(n, 0.9); projectTangent(this.fwd, this.up).normalize(); this.turn = -this.turn; }
    this.behavior?.update?.(this, dt, n);
    if (d.contact && ENGAGED.has(this.state) && !safe && this.cool <= 0 && dist < this.radius + ctx.player.radius + 0.3 && ctx.player.r - groundHeight(ctx.player.up) < 1) {
      hurtPlayer(d.damage, this.pos, d.knockback); this.cool = d.contactCooldown; }
    if (this.stunT > 0.1 && rng() < dt * 12) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, this.height * 0.55), { count: 1, color: 0xffe066, speed: 1.4, up: this.up, upBias: 0.3, life: 0.5, size: 0.32 });   // dazed stars
    if (this.slowT > 0 && rng() < dt * 8) sparkles.emit(this.center(), { count: 1, color: 0x9fe8ff, speed: 0.8, life: 0.6, size: 0.26 });
    if (this.shieldT > 0 && rng() < dt * 10) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, mr(-0.5, 0.5) * this.height), { count: 1, color: 0xbff4ff, speed: 1.2, life: 0.5, size: 0.3 });
    if (this.markT > 0 && rng() < dt * 6) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, this.height * 0.6), { count: 1, color: 0xc7a8ff, speed: 0.4, up: this.up, upBias: 1.5, life: 0.6, size: 0.3 });
    this.animate(dt);
    this.place(this.root);
    if (this.hover) this.root.position.addScaledVector(this.up, Math.sin(ctx.time * 2 + this.seed) * 0.15);
    updateShadow(this.shadow, this.up, this.fwd, this.hover + this.r - groundHeight(this.up));
  }
  /** Returns the desired ground speed and sets this.move (tangent direction). */
  think(dt, dist) {
    const d = this.def;
    switch (this.state) {
      case 'idle': if (this.timer < 0) { this.state = 'wander'; this.timer = mr(2, 4); this.turn = mr(-1, 1); } return 0;
      case 'wander':
        this.fwd.applyAxisAngle(this.up, this.turn * dt);
        if (arcDist(this.up, this.home) > d.leash * 0.4) turnToward(this.fwd, tangentToward(this.up, this.home), this.up, damp(2, dt));
        if (this.timer < 0) { this.state = 'idle'; this.timer = mr(1.5, 4); }
        this.move.copy(this.fwd); return d.speed * 0.35;
      case 'return':
        turnToward(this.fwd, tangentToward(this.up, this.home), this.up, damp(5, dt)); this.move.copy(this.fwd);
        this.hp = Math.min(d.hp, this.hp + d.hp * 0.3 * dt);
        if (arcDist(this.up, this.home) < 1.5) { this.state = 'idle'; this.timer = 1; this.hp = d.hp; }
        return d.speed;
    }
    if (this.behavior) return this.behavior.think(this, dt, dist);
    return d.ai === 'ranged' ? this.thinkRanged(dt, dist) : d.ai === 'hopper' ? this.thinkHopper(dt) : this.thinkMelee(dt, dist);
  }
  /** Goblins (fast hit-and-run, flee when hurt) and ogres (slow telegraphed ground slam you can jump over). */
  thinkMelee(dt, dist) {
    const d = this.def, toP = this.toP;
    if (this.state === 'chase') {
      turnToward(this.fwd, toP, this.up, damp(d.turnRate, dt));
      if (d.fleeBelow && !this.fled && this.hp < d.hp * d.fleeBelow) { this.fled = true; this.state = 'flee'; this.timer = d.fleeTime; emote(this, '!', '#ffd24a'); return 0; }
      if (dist < d.range && this.cool <= 0) { this.state = 'windup'; this.timer = d.windup; if (d.slamRadius) audio.growl(); return 0; }
      this.move.copy(toP); if (d.weave) this.move.applyAxisAngle(this.up, Math.sin(ctx.time * 5 + this.seed) * d.weave);
      return dist > d.range * 0.8 ? d.speed : 0;
    }
    if (this.state === 'windup') {
      turnToward(this.fwd, toP, this.up, damp(d.windupTurn, dt));
      if (this.tele) { const k = 1 - this.timer / d.windup; this.tele.visible = true; this.tele.position.copy(groundPoint(this.slamCenter(), 0.1));
        frameQuat(this.up, this.fwd, this.tele.quaternion); this.tele.scale.setScalar(d.slamRadius * (0.4 + 0.6 * k)); this.tele.material.opacity = 0.25 + 0.5 * k; }
      if (this.timer <= 0) this.strike(dist);
      return 0;
    }
    if (this.state === 'recover') {
      if (this.timer <= 0) this.state = 'chase';
      if (d.hitAndRun && this.timer > d.cooldown * 0.4) { this.move.copy(toP).negate(); return d.speed * 0.8; }
      return 0;
    }
    if (this.state === 'flee') { this.move.copy(toP).negate(); turnToward(this.fwd, this.move, this.up, damp(8, dt)); if (this.timer <= 0) this.state = 'chase'; return d.speed * 1.1; }
    return 0;
  }
  slamCenter() { return _tv.copy(this.pos).addScaledVector(this.fwd, this.def.slamReach); }
  strike(dist) {
    const d = this.def; this.state = 'recover'; this.timer = this.cool = d.cooldown; this.hideTele();
    if (d.slamRadius) {
      const c = this.slamCenter().clone();
      ringFX(c, d.slamRadius, 0xffb08a, 0.5); sparkles.emit(groundPoint(c, 0.3), { count: 30, color: 0xe8d6c0, speed: 3.5, up: this.up, upBias: 0.5, life: 0.7, size: 0.45 });
      if (dist < 12) shakeCamera(0.35); audio.slam();
      if (!ctx.player.dead && ctx.player.pos.distanceTo(c) < d.slamRadius + ctx.player.radius && ctx.player.r - groundHeight(ctx.player.up) < 0.9) hurtPlayer(d.damage, c, d.knockback);
    } else {
      this.knock.addScaledVector(this.fwd, d.lunge || 0); audio.swipe();
      if (!ctx.player.dead && dist < d.range + 0.6 && this.fwd.dot(this.toP) > 0.3) hurtPlayer(d.damage, this.pos, d.knockback);
    }
  }
  /** Wisps keep their distance, strafe, and fire slow homing orbs after a visible charge. */
  thinkRanged(dt, dist) {
    const d = this.def, toP = this.toP;
    turnToward(this.fwd, toP, this.up, damp(6, dt));
    if (this.state === 'charge') { if (this.timer <= 0) { this.fire(); this.state = 'chase'; this.cool = d.cooldown; } return 0; }
    if (this.state !== 'chase') this.state = 'chase';
    if (this.cool <= 0 && dist < d.aggro * 1.3) { this.state = 'charge'; this.timer = d.windup; audio.charge(); return 0; }
    if (dist < d.keepDistance - 1.5) { this.move.copy(toP).negate(); return d.speed; }
    if (dist > d.keepDistance + 1.5) { this.move.copy(toP); return d.speed; }
    this.move.crossVectors(this.up, toP).multiplyScalar(Math.sin(ctx.time * 0.8 + this.seed) > 0 ? 1 : -1); return d.speed * 0.5;
  }
  fire() {
    const d = this.def;
    ctx.projectiles.push(new Projectile({ team: 'enemy', up: this.up, dir: this.toP, alt: 1.1, speed: d.projectileSpeed, range: d.aggro * 1.8, radius: 0.35,
      size: 0.22, color: d.color, homing: d.projectileHoming, homeTo: () => (ctx.player.dead ? null : _a2.copy(ctx.player.pos).addScaledVector(ctx.player.up, 1)),
      onHit: (p, h) => { if (h === ctx.player) hurtPlayer(d.damage, p.pos, 2.5); sparkles.emit(p.pos, { count: 14, color: d.color, speed: 2.4, life: 0.5, size: 0.32 }); } }));
    audio.wispShot();
  }
  /** Slimes bounce straight at you and hurt on contact; big ones split when popped. */
  thinkHopper(dt) { this.state = 'chase'; turnToward(this.fwd, this.toP, this.up, damp(6, dt)); this.move.copy(this.toP); return this.def.speed; }
  animate(dt) {
    const d = this.def, s = Math.abs(this.speed), pop = 1 + this.hitPop * 0.14; this.phase += dt * (2 + s * 3.2);
    if (this.behavior?.animate) { this.behavior.animate(this, dt); return; }
    if (this.legL) {
      const sw = Math.sin(this.phase) * Math.min(1, s / 2) * 0.8;
      this.legL.rotation.x = sw; this.legR.rotation.x = -sw; this.armL.rotation.x = -sw * 0.6;
      let arm = sw * 0.6, k = 12;
      if (this.state === 'windup') arm = -2.7 * Math.min(1, 1.3 - this.timer / d.windup);
      else if (this.state === 'recover' && this.timer > d.cooldown - 0.2) { arm = 0.5; k = 40; }
      this.armR.rotation.x += (arm - this.armR.rotation.x) * damp(k, dt);
      this.body.rotation.x = this.state === 'windup' ? -0.2 : this.state === 'chase' ? 0.12 : 0;
      this.body.scale.setScalar(pop);
    } else if (d.ai === 'ranged') {
      this.ring.rotation.z += dt * 2.5; this.ring.rotation.x = Math.PI / 2 + Math.sin(ctx.time + this.seed) * 0.4;
      this.core.scale.setScalar(0.5 + (this.state === 'charge' ? 1 - this.timer / d.windup : 0) * 1.3);
      this.body.scale.setScalar(pop);
    } else {
      const sq = this.grounded ? (this.hopT < 0.2 ? 0.22 : Math.sin(ctx.time * 4 + this.seed) * 0.04) : -0.18;
      this.body.scale.set((1 + sq) * pop, (1 - sq) * pop, (1 + sq) * pop);
    }
  }
}
