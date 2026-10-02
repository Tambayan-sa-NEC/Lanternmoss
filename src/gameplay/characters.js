/* Switching the playable character: model, level-scaled stats, abilities, HUD and companion. */
import { CHARACTERS } from '../config/characters.js';
import { ctx } from '../core/context.js';
import { resetCooldowns } from '../combat/casting.js';
import { Owl } from '../entities/companions/Owl.js';
import { Wolf } from '../entities/companions/Wolf.js';
import { HERO_BUILDERS } from '../models/heroes.js';
import { statsForLevel } from '../progression/leveling.js';
import { buildSpellBar, setSkillHint } from '../ui/hud.js';

const COMPANIONS = { owl: Owl, wolf: Wolf };

export function applyCharacter(id) {
  const C = CHARACTERS[id], P = ctx.player;
  if (P.charId !== id) P.swapModel(HERO_BUILDERS[C.model]());
  P.charId = id; P.stats = statsForLevel(C.stats, P.level); P.hp = P.stats.maxHp; P.mana = P.stats.maxMana;
  P.clearTimers();
  resetCooldowns(C.abilities);
  buildSpellBar(C.abilities); setSkillHint(C.hint);
  const Companion = COMPANIONS[C.companion];
  if (!(ctx.companion instanceof Companion)) {
    if (ctx.companion) ctx.companion.dispose(); ctx.companion = new Companion();
  }
}
