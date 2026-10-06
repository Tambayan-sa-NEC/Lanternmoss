/* Switching the playable character: model, level-scaled stats, abilities, HUD and pet (src/gameplay/Pets.js); plus
   the little showcase moves the character-select screen plays (showcaseHero). */
import { CHARACTERS } from '../config/characters.js';
import { ctx } from '../core/context.js';
import { resetCooldowns } from '../combat/casting.js';
import { sparkles } from '../fx/sparkles.js';
import { HERO_BUILDERS } from '../models/heroes.js';
import { applyVanity, computeStats } from './equipment.js';
import { Pets } from './Pets.js';
import { buildSpellBar, setSkillHint } from '../ui/hud.js';

/** A fresh pet body beside the hero (after the hero has been moved somewhere new). */
export function resetCompanion() { Pets.spawn(); }

/** Each hero's signature flourish, reusing their ability poses (src/entities/player/poses.js). */
const SHOWCASE = {
  witch: P => { P.castT = 0.7; sparkles.emit(P.pos.clone().addScaledVector(P.up, 2.2), { count: 18, color: 0xd49bff, speed: 1.6, up: P.up, upBias: 1.2, life: 0.8, size: 0.32 }); },
  knight: P => { P.spinT = 0.5; sparkles.emit(P.pos.clone().addScaledVector(P.up, 0.8), { count: 22, color: 0xffd36b, speed: 2.6, up: P.up, upBias: 0.2, life: 0.6, size: 0.3 }); },
  ranger: P => { P.castT = 0.6; sparkles.emit(P.pos.clone().addScaledVector(P.up, 1.4), { count: 14, color: 0xb8ff9a, speed: 1.8, up: P.up, upBias: 0.6, life: 0.6, size: 0.28 }); },
};
/** The hero shows off: their signature move; picked = true adds a happy hop and a burst in their colour. */
export function showcaseHero(picked = false) {
  const P = ctx.player; SHOWCASE[P.charId]?.(P);
  if (!picked) return;
  P.vy = 5; P.grounded = false; P.squash = 0.25;
  sparkles.emit(P.pos.clone().addScaledVector(P.up, 1), { count: 40, color: CHARACTERS[P.charId].color, speed: 3, up: P.up, upBias: 0.8, life: 1, size: 0.36 });
}

export function applyCharacter(id) {
  const C = CHARACTERS[id], P = ctx.player;
  if (P.charId !== id) P.swapModel(HERO_BUILDERS[C.model]());
  P.charId = id; applyVanity(P); P.stats = computeStats(P); P.hp = P.stats.maxHp; P.mana = P.stats.maxMana;
  P.clearTimers();
  resetCooldowns(C.abilities);
  buildSpellBar(C.abilities); setSkillHint(C.abilities);
  Pets.forHero(id);
  if (ctx.companion?.petId !== Pets.id) Pets.spawn();   // the pet this hero took last time, else their own
}
