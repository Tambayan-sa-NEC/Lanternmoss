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
import { arcDist, frameQuat, projectTangent, tangentFrame, tangentTo, turnToward } from '../../utils/sphere.js';
import { SPAWN_DIR } from '../../world/World.js';
import { groundHeight } from '../../world/terrain.js';
import { canHarmMob, damageEnemy, hitMob, hitMobs, hurtPlayer } from '../../combat/damage.js';
import { BURN_TICK } from '../../config/sets.js';
import { forgetTarget } from '../../combat/targeting.js';
import { encounterEvents } from '../../combat/events.js';
import { Projectile } from '../Projectile.js';
import { ENGAGED } from './states.js';
import { BEHAVIORS } from './behaviors/index.js';
import { enemyDef } from '../../combat/enemyDefs.js';
import { altitude, pointOf, distance, advance, toward, peaceful, visible } from '../../combat/space.js';

const V3 = THREE.Vector3;
const _tv = new V3(), _tv2 = new V3(), _a2 = new V3();
/** Boss states in which a stun lands (never in the middle of a telegraphed attack). */
const STUNNABLE = new Set(['chase', 'recover']);

/** Enemies never fight inside the village safe zone, indoors, or a fainted hero. */
function playerSafe() { return ctx.player.dead || peaceful() || (!ctx.room && arcDist(ctx.player.up, SPAWN_DIR) < COMBAT.player.safeRadius); }

export class Enemy extends Walker {
  /** def defaults to this planet's scaled stats for the type (a boss passes its own, with per-planet overrides). */
  constructor(type, dir, def = enemyDef(type), space = ctx.room) {
    super(dir, def.radius, space);
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
    if (this.space) this.space.place(this, dir);
    else { this.up.copy(dir); this.r = groundHeight(this.up); this.pos.copy(this.up).multiplyScalar(this.r); }
    this.vy = 0; this.grounded = true;
    this.fwd.copy(tangentFrame(this.up)[0]).applyAxisAngle(this.up, rng() * 6.28);
    Object.assign(this, { hp: this.def.hp, alive: true, state: 'idle', timer: mr(0.5, 2.5), cool: 0, speed: 0, phase: 0, deadT: 0, turn: 0,
      slowT: 0, slowAmt: 0, markT: 0, stunT: 0, hitPop: 0, hopT: mr(0.2, 1), hopDir: null, fled: false, remove: false,
      hidden: false, shieldT: 0, shieldAmt: 0, stunnedT: 0, burn: null, burnTick: 0, calmT: 0, foe: null, foeT: 0, distP: Infinity, killedBy: null });   // calmT = seconds out of combat; burn = { dps, t }: the Ember set (config/sets.js); hidden = untargetable (burrowed); shield = damage reduction; stunned = takes bonus damage
    this.knock.set(0, 0, 0); this.selfCollider.active = !this.space; this.root.visible = this.shadow.visible = true; this.root.scale.setScalar(this.baseScale);
    this.behavior?.reset?.(this);
  }
  center() { return this._c.copy(this.pos).addScaledVector(this.up, this.hover + this.height * 0.5); }
  /** What this monster is fighting right now: its foe if another monster provoked it, else the hero (TODO 45b). */
  get target() { return this.foe ?? ctx.player; }
  /** Does distance still end this monster's chase? (TODO 45a)
      An ordinary monster: never. Once it has seen the hero it keeps coming for as long as they are in this world and
      not safe - there is no home leash and no outrunning it. What ends the chase instead is the hero reaching the
      village's safe radius, fainting, a peaceful place, travelling to another world, or a new adventure; each of those
      already tears the encounter down. Where the ground gives out (a wall, an island, a cave room with no open route)
      it keeps pressing toward the hero as far as it can walk, rather than giving up and healing.
      A mini boss: yes, through its earlier forms, so a fight that drifts out of its lair still resets as before; no,
      once its final form has begun, which lasts until the encounter ends or the world resets.
      A main boss: yes, unchanged - its arena ring, not this rule, is what bounds it. */
  get leashed() {
    const d = this.def;
    if (d.miniBoss) return this.bossPhase < (d.phases?.length ?? 1) - 1;
    return d.ai === 'boss';
  }

  /** Is this one of the lesser monsters? (TODO 45b) Only they fight each other: a mini boss and a main boss neither
      damage a lesser monster with any attack nor are drawn into a brawl, and a lair seal is not a fighter at all. */
  get lesser() { return this.def.ai !== 'boss' && !this.def.miniBoss && !this.def.static; }

  /** Close enough to the hero to be heard or felt (TODO 45b): a brawl across the valley makes no noise. */
  get heard() { return this.distP < COMBAT.mobFeud.earshot; }

  /** Turned on by another monster's blow (TODO 45b, damageEnemy with source 'mob'). It chases and attacks its
      attacker instead of the hero until one of them is down, the feud is forgotten (COMBAT.mobFeud.forget) or the
      world tears the encounter down. The hero is never the one who provokes this: their hits call aggro(). */
  provoke(attacker) {
    if (!this.alive || this.dormant || !canHarmMob(attacker, this)) return;
    this.foe = attacker; this.foeT = COMBAT.mobFeud.forget;
    if (!ENGAGED.has(this.state)) { this.state = 'chase'; emote(this, '!', '#ff4d6d'); }
  }

  /** The hero has its attention: a monster in the middle of a brawl drops the grudge and comes for them (TODO 45b). */
  aggro() {
    this.foe = null; this.foeT = 0;
    if (!this.alive || this.dormant || this.def.static || ENGAGED.has(this.state) || playerSafe() || !visible(this.pos, ctx.player.pos)) return;
    this.state = 'chase'; emote(this, '!', '#ff4d6d');
  }
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
  /** An Ember set burn (config/sets.js): damage in BURN_TICK steps until it runs out; embers rise while it lasts. */
  tickBurn(dt) {
    const b = this.burn, step = Math.min(dt, b.t); b.t -= step; this.burnTick += step;
    if (rng() < dt * 10) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, this.height * 0.3), { count: 1, color: 0xff8a3a, speed: 1.2, up: this.up, upBias: 1.2, life: 0.5, size: 0.28 });
    if (this.burnTick >= BURN_TICK || b.t <= 0) { damageEnemy(this, b.dps * this.burnTick, { source: 'burn', color: 0xff8a3a }); this.burnTick = 0; }
    if (b.t <= 0) this.burn = null;
  }
  /** killer: the monster that struck the last blow (TODO 45b), null when the hero, their pet or a burn did. */
  die(killer = null) {
    this.killedBy = killer;
    this.alive = false; this.state = 'dead'; this.deadT = 0; this.selfCollider.active = false; this.hideTele(); this.bar.style.display = 'none';
    sparkles.emit(this.center(), { count: 36, color: this.def.color, speed: 3, up: this.up, upBias: 0.6, life: 0.9, size: 0.4 });
    audio.enemyDie(); forgetTarget(this);
    this.behavior?.onDie?.(this);
    encounterEvents.dispatchEvent(new CustomEvent('enemydefeated', { detail: { enemy: this, killer } }));
    for (let i = 0; i < (this.def.splitCount || 0); i++) {
      const e = new Enemy(this.def.splitInto, advance(pointOf(this), _tv.copy(this.fwd).applyAxisAngle(this.up, i * Math.PI * 2 / this.def.splitCount + 0.8), 0.9));
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
    this.space?.bodies.delete(this);
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
      if (show) { this.animate(dt); this.place(this.root); updateShadow(this.shadow, this.up, this.fwd, this.hover + altitude(this), this); }
      return;
    }
    if (this.alive && d.static) {                                  // a lair seal: just stands there, glowing
      this.hitPop = Math.max(0, this.hitPop - dt * 6); this.animate(dt); this.place(this.root);
      updateShadow(this.shadow, this.up, this.fwd, altitude(this), this); return;
    }
    if (this.halo) this.halo.rotation.z += dt * 1.5;
    if (!this.alive) {
      this.deadT += dt; const k = Math.min(1, this.deadT / 0.45);
      this.root.scale.setScalar(this.baseScale * Math.max(0.01, 1 - k)); this.root.visible = this.shadow.visible = k < 1;
      if (k >= 1 && (!d.respawn || this.temporary)) this.remove = true;
      else if (d.respawn && this.deadT > d.respawn && distance(pointOf(ctx.player), this.home) > 22) this.spawn(this.home);
      return;
    }
    this.slowT = Math.max(0, this.slowT - dt); this.markT = Math.max(0, this.markT - dt); this.stunT = Math.max(0, this.stunT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt); this.stunnedT = Math.max(0, this.stunnedT - dt);
    this.cool -= dt; this.timer -= dt; this.hitPop = Math.max(0, this.hitPop - dt * 6);
    if (this.burn) { this.tickBurn(dt); if (!this.alive) return; }
    this.calmT = ENGAGED.has(this.state) ? 0 : this.calmT + dt;
    if (this.def.miniBoss && this.calmT > COMBAT.leashReturn.miniBossHealDelay && this.hp < this.def.hp)   // a mini boss heals only once properly out of the fight
      this.hp = Math.min(this.def.hp, this.hp + this.def.hp * COMBAT.leashReturn.heal * dt);
    if (this.foe && (!canHarmMob(this, this.foe) || (this.foeT -= dt) <= 0)) this.foe = null;   // TODO 45b: the feud ends with its foe
    const target = this.foe ?? ctx.player;                          // a provoked monster hunts its attacker, everyone else the hero
    const dist = tangentTo(this.pos, this.up, target.pos, this.toP);
    const heroSafe = playerSafe();                                  // the hero's own rules: the village, fainting, indoors
    this.distP = this.foe ? tangentTo(this.pos, this.up, ctx.player.pos, _a2) : dist;
    const safe = this.foe ? false : heroSafe;                       // a brawl carries on while the hero is safe
    if (!ENGAGED.has(this.state) && this.state !== 'return' && dist < d.aggro) this.aggro();
    if (ENGAGED.has(this.state) && (safe || (this.leashed && (distance(pointOf(this), this.home) > d.leash || dist > d.aggro * 2.2)))) { this.state = 'return'; this.hideTele(); }
    this.move.copy(this.fwd);
    const slowMul = this.slowT > 0 ? 1 - this.slowAmt : 1;
    const speed = (this.stunT > 0 ? 0 : this.think(dt, dist)) * slowMul;
    if (this.space && ctx.room !== this.space) return;   // a hit can faint the hero and tear down the cave
    if (this.space && this.state === 'chase' && !this.space.clear(this.pos, target.pos, this.radius)) {
      this.move.copy(this.space.toward(this.pos, this.space.waypoint(this.pos, target.pos, this.radius)));
    }
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
    if (d.contact && ENGAGED.has(this.state) && this.cool <= 0) {
      if (!heroSafe && this.distP < this.radius + ctx.player.radius + 0.3 && altitude(ctx.player) < 1) {
        hurtPlayer(d.damage, this.pos, d.knockback, { source: this }); this.cool = d.contactCooldown; }
      else if (hitMobs(this, this.pos, this.radius + 0.3, d.damage, { knock: d.knockback }).length) this.cool = d.contactCooldown; }
    if (this.stunT > 0.1 && rng() < dt * 12) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, this.height * 0.55), { count: 1, color: 0xffe066, speed: 1.4, up: this.up, upBias: 0.3, life: 0.5, size: 0.32 });   // dazed stars
    if (this.slowT > 0 && rng() < dt * 8) sparkles.emit(this.center(), { count: 1, color: 0x9fe8ff, speed: 0.8, life: 0.6, size: 0.26 });
    if (this.shieldT > 0 && rng() < dt * 10) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, mr(-0.5, 0.5) * this.height), { count: 1, color: 0xbff4ff, speed: 1.2, life: 0.5, size: 0.3 });
    if (this.markT > 0 && rng() < dt * 6) sparkles.emit(_tv.copy(this.center()).addScaledVector(this.up, this.height * 0.6), { count: 1, color: 0xc7a8ff, speed: 0.4, up: this.up, upBias: 1.5, life: 0.6, size: 0.3 });
    this.animate(dt);
    this.place(this.root);
    if (this.hover) this.root.position.addScaledVector(this.up, Math.sin(ctx.time * 2 + this.seed) * 0.15);
    updateShadow(this.shadow, this.up, this.fwd, this.hover + altitude(this), this);
  }
  /** Returns the desired ground speed and sets this.move (tangent direction). */
  think(dt, dist) {
    const d = this.def, steered = this.behavior?.steer?.(this, dt, dist);
    if (steered !== undefined) return steered;
    switch (this.state) {
      case 'idle': if (this.timer < 0) { this.state = 'wander'; this.timer = mr(2, 4); this.turn = mr(-1, 1); } return 0;
      case 'wander':
        this.fwd.applyAxisAngle(this.up, this.turn * dt);
        if (distance(pointOf(this), this.home) > d.leash * 0.4) turnToward(this.fwd, toward(pointOf(this), this.space ? this.space.waypoint(this.pos, this.home, this.radius) : this.home), this.up, damp(2, dt));
        if (this.timer < 0) { this.state = 'idle'; this.timer = mr(1.5, 4); }
        this.move.copy(this.fwd); return d.speed * 0.35;
      case 'return':
        turnToward(this.fwd, toward(pointOf(this), this.space ? this.space.waypoint(this.pos, this.home, this.radius) : this.home), this.up, damp(5, dt)); this.move.copy(this.fwd);
        if (!d.miniBoss) this.hp = Math.min(d.hp, this.hp + d.hp * COMBAT.leashReturn.heal * dt);   // mini bosses: see update (calmT)
        if (distance(pointOf(this), this.home) < 1.5) { this.state = 'idle'; this.timer = 1; if (!d.miniBoss) this.hp = d.hp; }
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
      if (dist < d.range && this.cool <= 0 && visible(this.pos, this.target.pos)) { this.state = 'windup'; this.timer = d.windup; if (d.slamRadius && this.heard) audio.growl(); return 0; }
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
      if (this.distP < 12) shakeCamera(0.35); if (this.heard) audio.slam();
      if (!playerSafe() && visible(c, ctx.player.pos) && ctx.player.pos.distanceTo(c) < d.slamRadius + ctx.player.radius && altitude(ctx.player) < 0.9) hurtPlayer(d.damage, c, d.knockback, { source: this });
      hitMobs(this, c, d.slamRadius, d.damage, { knock: d.knockback });                   // TODO 45b: the slam catches monsters too
    } else {
      this.knock.addScaledVector(this.fwd, d.lunge || 0); if (this.heard) audio.swipe();
      if (!playerSafe() && visible(this.pos, ctx.player.pos) && this.distP < d.range + 0.6 && this.fwd.dot(this.toP) > 0.3) hurtPlayer(d.damage, this.pos, d.knockback, { source: this });
      hitMobs(this, this.pos, d.range + 0.6, d.damage, { knock: d.knockback, arc: COMBAT.mobFeud.arc });   // TODO 45b: a swipe catches what is in front of it
    }
  }
  /** Wisps keep their distance, strafe, and fire slow homing orbs after a visible charge. */
  thinkRanged(dt, dist) {
    const d = this.def, toP = this.toP;
    turnToward(this.fwd, toP, this.up, damp(6, dt));
    if (this.state === 'charge') { if (this.timer <= 0) { this.fire(); this.state = 'chase'; this.cool = d.cooldown; } return 0; }
    if (this.state !== 'chase') this.state = 'chase';
    if (this.cool <= 0 && dist < d.aggro * 1.3 && visible(this.pos, this.target.pos)) { this.state = 'charge'; this.timer = d.windup; if (this.heard) audio.charge(); return 0; }
    if (dist < d.keepDistance - 1.5) { this.move.copy(toP).negate(); return d.speed; }
    if (dist > d.keepDistance + 1.5) { this.move.copy(toP); return d.speed; }
    this.move.crossVectors(this.up, toP).multiplyScalar(Math.sin(ctx.time * 0.8 + this.seed) > 0 ? 1 : -1); return d.speed * 0.5;
  }
  fire() {
    const d = this.def;
    ctx.projectiles.push(new Projectile({ team: 'enemy', owner: this, up: pointOf(this), dir: this.toP, alt: 1.1, speed: d.projectileSpeed, range: d.aggro * 1.8, radius: 0.35,
      size: 0.22, color: d.color, homing: d.projectileHoming, homeTo: () => { const t = this.target; return t.dead || t.alive === false ? null : _a2.copy(t.pos).addScaledVector(t.up, 1); },
      onHit: (p, h) => {
        if (h === ctx.player) hurtPlayer(d.damage, p.pos, 2.5, { source: this });
        else if (h) hitMob(this, h, d.damage, { from: p.pos, knock: 2.5 });             // TODO 45b: a ghost's orb burns a monster too
        sparkles.emit(p.pos, { count: 14, color: d.color, speed: 2.4, life: 0.5, size: 0.32 }); } }));
    if (this.heard) audio.wispShot();
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
