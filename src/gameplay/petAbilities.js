/* What each pet's ability (key V, PETS[id].ability in config/pets.js) does. Each handler gets (Pets, the pet's body,
   the ability's config) and returns false when there was nothing to do (no cooldown spent). Lasting effects (Mend's
   healing, Scout's spotted monsters, Fetch's chest scent) tick in updatePetAbilities and show on the compass. */
import * as THREE from 'three';
import { ctx } from '../core/context.js';
import { damageEnemy } from '../combat/damage.js';
import { targeting } from '../combat/targeting.js';
import { ringFX } from '../fx/combatFx.js';
import { emote } from '../fx/emotes.js';
import { sparkles } from '../fx/sparkles.js';
import { audio } from '../systems/AudioSystem.js';
import { toast } from '../ui/toast.js';
import { arcDist, offsetDir } from '../utils/sphere.js';
import { buff } from './buffs.js';
import { Chests } from './Chests.js';

/** Lasting effects: spotted = [{ enemy, until }], scent = { dir, until } | null, mend = { left, perSec }. */
export const petEffects = { spotted: [], scent: null, mend: null };

const _p = new THREE.Vector3();
const alive = e => e.alive && !e.hidden;

export const PET_ABILITIES = {
  /** Owl: spots every monster around, marking them. */
  scout(Pets, pet, a) {
    const P = ctx.player, near = ctx.enemies.filter(e => alive(e) && arcDist(P.up, e.up) < a.radius);
    pet.flourish?.('rise'); audio.hoot();
    if (!near.length) { toast(`${Pets.nameOf()} circles high... no monsters within ${a.radius}m.`); return true; }
    for (const e of near) { e.markT = Math.max(e.markT, a.mark); emote(e, '!', '#c7a8ff'); }
    petEffects.spotted = near.map(enemy => ({ enemy, until: ctx.time + a.mark }));
    toast(`${Pets.nameOf()} spots ${near.length} monster${near.length > 1 ? 's' : ''}! They're on your compass for ${a.mark}s.`);
    return true;
  },
  /** Wolf: a rallying howl, +damage for the hero (buffs.howl, read in combat/damage.js). */
  howl(Pets, pet, a) {
    buff('howl', a.seconds, `${Pets.nameOf()} howls! +${Math.round(a.damage * 100)}% damage for ${a.seconds}s`);
    audio.howl(); emote(pet, '♪', '#7fb8ff'); pet.flourish?.('howl');
    return true;
  },
  /** Fox: brings every item lying nearby to your feet, and sniffs out the nearest unopened chest. */
  fetch(Pets, pet, a) {
    const P = ctx.player, items = ctx.worldItems.filter(w => arcDist(P.up, w.up) < a.radius && !w.bossLoot);
    items.forEach((w, i) => w.hopTo(offsetDir(P.up, i * 2.4, 0.6), 0.6 + i * 0.05));
    let best = null, bd = Infinity;
    for (const c of Chests.list) { if (c.opened || c.landing) continue; const d = arcDist(P.up, c.up); if (d < bd) { bd = d; best = c; } }
    if (best) petEffects.scent = { dir: best.up.clone(), until: ctx.time + 20 };
    emote(pet, '!', '#ff8c4a'); pet.flourish?.('spin'); audio.bark();
    const got = items.length ? `fetches ${items.length} thing${items.length > 1 ? 's' : ''}` : 'finds nothing lying about';
    toast(`${Pets.nameOf()} ${got}${best ? ` and sniffs out a chest ${Math.round(bd)}m away (on your compass)` : ''}!`);
    return items.length > 0 || !!best;
  },
  /** Wisp: warm healing over a few seconds (the wisp mends a little too). */
  mend(Pets, pet, a) {
    const P = ctx.player; if (P.hp >= P.stats.maxHp && Pets.hp >= Pets.maxHp()) { toast('Everyone is already fine.'); return false; }
    petEffects.mend = { left: a.seconds, perSec: P.stats.maxHp * a.heal / a.seconds };
    emote(pet, 'heart', '#ffd36b'); audio.sparkle(); toast(`${Pets.nameOf()} glows warm and gold...`);
    return true;
  },
  /** Dragon whelp: a burst of flame around your target (or around you). */
  flame(Pets, pet, a) {
    const P = ctx.player, t = [targeting.aim, targeting.lastHit].find(e => e && alive(e) && arcDist(P.up, e.up) < 16);
    const at = t ? t.pos : P.pos, up = t ? t.up : P.up;
    const hit = ctx.enemies.filter(e => alive(e) && e.pos.distanceTo(at) < a.radius + e.hitR);
    for (const e of hit) damageEnemy(e, Math.round(a.damage * Pets.power()), { source: 'pet', knock: 3, from: at, color: 0xff7a3a });
    ringFX(at, a.radius, 0xff7a3a); audio.castFire();
    sparkles.emit(_p.copy(at).addScaledVector(up, 0.6), { count: 50, color: 0xff8a3a, speed: 4, up, upBias: 0.8, life: 0.8, size: 0.4 });
    pet.flourish?.('rise');
    return true;
  },
};

export function updatePetAbilities(dt) {
  const m = petEffects.mend, P = ctx.player;
  if (m) {
    const k = Math.min(dt, m.left); m.left -= dt;
    if (!P.dead) P.hp = Math.min(P.stats.maxHp, P.hp + m.perSec * k);
    if (ctx.companion && Math.random() < dt * 8) sparkles.emit(_p.copy(P.pos).addScaledVector(P.up, 1.2), { count: 2, color: 0xffd36b, speed: 1, up: P.up, upBias: 1.4, life: 0.8, size: 0.3 });
    if (m.left <= 0) petEffects.mend = null;
  }
  petEffects.spotted = petEffects.spotted.filter(s => s.until > ctx.time && alive(s.enemy));
  if (petEffects.scent && (petEffects.scent.until < ctx.time || arcDist(P.up, petEffects.scent.dir) < 3)) petEffects.scent = null;
}
export function resetPetAbilities() { petEffects.spotted = []; petEffects.scent = null; petEffects.mend = null; }
