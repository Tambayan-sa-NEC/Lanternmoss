/* Damage in both directions, plus fainting and respawning. */
import * as THREE from 'three';
import { COMBAT } from '../config/combat.js';
import { LEVELING } from '../config/leveling.js';
import { ctx } from '../core/context.js';
import { settings } from '../core/settings.js';
import { floatText, hitStop } from '../fx/combatFx.js';
import { sparkles } from '../fx/sparkles.js';
import { gainXp } from '../progression/experience.js';
import { damageMultiplier } from '../progression/leveling.js';
import { audio } from '../systems/AudioSystem.js';
import { shakeCamera, snapCamera } from '../systems/CameraSystem.js';
import { Dialog } from '../ui/Dialog.js';
import { showPlayerHurt } from '../ui/hud.js';
import { toast } from '../ui/toast.js';
import { projectTangent } from '../utils/sphere.js';
import { noteHit } from './targeting.js';

const _tv = new THREE.Vector3();

/** Horizontal push direction from `from` toward ent (written to out). */
function knockDir(from, ent, out) {
  out.copy(ent.pos).sub(from); projectTangent(out, ent.up);
  return out.lengthSq() > 1e-6 ? out.normalize() : out.copy(ent.fwd).negate();
}

/** Hits at or above this (after multipliers) get the big gold number. */
const BIG_HIT = 40;

/** o: from (knockback origin), knock, slow + slowTime, mark (seconds), stagger (seconds), stun (seconds, see Enemy.stun),
    color (spark tint), source ('owl' for the companion; omitted for the hero's own abilities). */
export function damageEnemy(e, amount, o = {}) {
  if (!e.alive || e.hidden) return;                                   // burrowed monsters can't be hit
  if (e.invulnerable) {                                               // e.g. a boss mid phase-transition
    if (settings.damageNumbers && ctx.time - (e.immuneTextT ?? -9) > 0.6) { e.immuneTextT = ctx.time; floatText(_tv.copy(e.center()).addScaledVector(e.up, e.height * 0.5), 'IMMUNE', '#b8b0c8'); }
    return;
  }
  if (!o.source) amount *= damageMultiplier(ctx.player.level);       // no source = one of the hero's own abilities
  if (o.source !== 'owl' && e.markT > 0) amount *= 1 + COMBAT.owl.markBonus;
  if (e.stunnedT > 0) amount *= 1 + (e.def.stunnedDamageBonus || 0); // dazed after crashing a charge
  if (e.shieldT > 0) amount *= 1 - e.shieldAmt;                       // hexlantern ward
  amount = Math.max(1, Math.round(amount)); e.hp -= amount; e.hitPop = 1;
  const marked = e.markT > 0 && o.source !== 'owl', big = amount >= BIG_HIT;
  if (settings.damageNumbers) floatText(_tv.copy(e.center()).addScaledVector(e.up, e.height * 0.5), `${amount}`,
    o.source === 'owl' ? '#c7a8ff' : big ? '#ffd36b' : marked ? '#ffb03d' : '#ffffff', big ? 1.6 : 1);
  sparkles.emit(e.center(), { count: big ? 18 : 8, color: o.color ?? 0xffffff, speed: big ? 3.6 : 2.5, life: 0.4, size: big ? 0.4 : 0.3 });
  if (o.knock && o.from) e.knock.addScaledVector(knockDir(o.from, e, _tv), o.knock * (1 - (e.def.knockResist || 0)));
  if (o.slow) { e.slowT = o.slowTime; e.slowAmt = o.slow * (1 - (e.def.slowResist || 0)); }
  if (o.mark) e.markT = o.mark;
  if (o.stagger) e.interrupt(o.stagger);
  if (o.stun && e.hp > 0) e.stun(o.stun);
  if (o.source !== 'owl') noteHit(e);
  e.aggro(); audio.hitEnemy();
  if (e.hp <= 0) { e.die(); if (LEVELING.creditSources.includes(o.source || 'player')) gainXp(e.def.xp, e); }
}

/** o.lethal = a boss's killing blow: ignores armor and Guard and always takes the hero down (only i-frames save you,
    which is why every lethal attack is telegraphed long enough to walk, blink, leap or dash clear). */
export function hurtPlayer(amount, from, knock = 0, o = {}) {
  const P = ctx.player; if (P.dead || P.invuln > 0) return;
  if (o.lethal) amount = Math.max(Math.round(amount), Math.ceil(P.hp));
  else if (P.stats.armor || P.guardT > 0) {     // knight only: armor, and Guard blocks knockback
    amount = Math.max(1, Math.round(amount * (1 - (P.stats.armor || 0)) * (P.guardT > 0 ? 1 - P.guardReduction : 1)));
    if (P.guardT > 0) { knock = 0; audio.clang(); }
  } else amount = Math.max(1, Math.round(amount));
  const heavy = amount >= P.stats.maxHp * 0.25;
  P.hp -= amount; P.invuln = P.hurtT = COMBAT.player.invuln; P.lastHurt = ctx.time; P.squash = -0.2;
  if (settings.damageNumbers) floatText(_tv.copy(P.pos).addScaledVector(P.up, 2.3), `-${amount}`, '#ff5a7a', heavy ? 1.5 : 1);
  showPlayerHurt(); audio.hurt(); shakeCamera(heavy ? 0.5 : 0.25); if (heavy) hitStop(0.08);
  if (knock && from) { P.knock.addScaledVector(knockDir(from, P, _tv), knock); if (P.grounded) { P.vy = knock * 0.5; P.grounded = false; } }
  if (P.hp <= 0) faint();
}

function faint() {
  const P = ctx.player; P.hp = 0; P.dead = true; P.deadT = COMBAT.player.respawnTime; P.root.visible = false; P.vel.set(0, 0, 0);
  sparkles.emit(_tv.copy(P.pos).addScaledVector(P.up, 1), { count: 50, color: 0xffd6f5, speed: 3, up: P.up, upBias: 0.8, life: 1.2, size: 0.4 });
  if (Dialog.open) Dialog.close(); toast('You fainted... the lanterns will guide you home.'); audio.faint();
}

function respawnPlayer(world) {
  const P = ctx.player;
  Object.assign(P, { dead: false, hp: P.stats.maxHp, mana: P.stats.maxMana, invuln: 1.5, vy: 0 });
  const fwd = P.placeAt(world.spawnDir);
  snapCamera(world.spawnDir, fwd); world.resetSun();
  P.root.visible = true; sparkles.emit(P.pos, { count: 40, color: 0xfff0a0, speed: 2, up: P.up, upBias: 1, life: 1, size: 0.35 });
  toast('Back home, safe and sound.');
}

/** Per-frame hero timers, regeneration, and the respawn countdown after fainting. */
export function updatePlayerVitals(dt, world) {
  const P = ctx.player, C = P.stats;
  P.invuln = Math.max(0, P.invuln - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.castT = Math.max(0, P.castT - dt); P.castFaceT = Math.max(0, P.castFaceT - dt);
  if (P.dead) { if ((P.deadT -= dt) <= 0) respawnPlayer(world); }
  else {
    P.mana = Math.min(C.maxMana, P.mana + C.manaRegen * dt);
    if (ctx.time - P.lastHurt > C.hpRegenDelay) P.hp = Math.min(C.maxHp, P.hp + C.hpRegen * dt);
    P.root.visible = !(P.hurtT > 0 && Math.floor(ctx.time * 18) % 2);
  }
  P.shadow.visible = !P.dead;
}
