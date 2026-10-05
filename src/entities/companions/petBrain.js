/* What every pet body shares: choosing what to fight (by the current command) and landing a hit.
   Bodies: ./FlyingPet.js (swoops), ./WalkingPet.js (runs in and bites). State lives in src/gameplay/Pets.js. */
import { PET_CARE } from '../../config/pets.js';
import { ctx } from '../../core/context.js';
import { damageEnemy } from '../../combat/damage.js';
import { targeting } from '../../combat/targeting.js';
import { Pets } from '../../gameplay/Pets.js';
import { arcDist } from '../../utils/sphere.js';
import { ENGAGED } from '../enemies/states.js';

const fightable = e => e && e.alive && !e.hidden;

/** The monster this pet should go for right now, or null:
     follow   whatever you last hit (recently), else the nearest monster fighting you, within reach
     attack   your aim target or whoever you last hit, a bit further out too
     stay     only monsters fighting near its spot
     passive  nothing */
export function pickTarget(pet) {
  const mode = Pets.mode, range = pet.def.attack.range, P = ctx.player;
  if (mode === 'passive' || Pets.fainted || P.dead) return null;
  if (mode === 'attack') return [targeting.aim, targeting.lastHit].find(e => fightable(e) && arcDist(P.up, e.up) < range * 1.8) ?? null;
  const anchor = mode === 'stay' && Pets.stayDir ? Pets.stayDir : P.up;
  const last = targeting.lastHit;
  if (mode === 'follow' && fightable(last) && ctx.time - targeting.lastHitT < 5 && arcDist(anchor, last.up) < range) return last;
  let best = null, bd = range;
  for (const e of ctx.enemies) {
    if (!fightable(e) || !ENGAGED.has(e.state)) continue;
    const d = arcDist(anchor, e.up); if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/** Is this target still worth chasing? (alive, and not dragged too far from where the pet belongs) */
export function keepTarget(pet, e) {
  if (!fightable(e) || Pets.mode === 'passive' || Pets.fainted || ctx.player.dead) return false;
  const anchor = Pets.mode === 'stay' && Pets.stayDir ? Pets.stayDir : ctx.player.up;
  return arcDist(anchor, e.up) < pet.def.attack.range * (Pets.mode === 'attack' ? 2.2 : 1.6);
}

/** Lands the pet's attack on e (damage grows with the pet's level); the monster may hit back. */
export function strike(pet, e) {
  const a = pet.def.attack;
  damageEnemy(e, Pets.damage(), { source: 'pet', mark: a.mark, stagger: a.stagger, slow: a.slow, slowTime: a.slowTime, knock: a.knock, from: pet.pos, color: pet.color });
  if (e.alive && Math.random() < PET_CARE.retaliate) Pets.hurt((e.def.damage ?? 5) * PET_CARE.retaliateDamage);
}
