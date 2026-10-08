/* The hero's energy (config/survival.js NEEDS, rules: ./needsRules.js): it drains slowly while you play (faster
   sprinting or swimming) and food fills it (the `energy` item effect, ./itemUse.js). Running low slows healing and
   sprinting through P.regenK and P.sprintK (read by combat/damage.js and entities/player/Player.js); it never hurts. */
import { NEEDS } from '../config/survival.js';
import { ctx } from '../core/context.js';
import { toast } from '../ui/toast.js';
import { crossedWarnings, drainRate, needEffects, needLevel } from './needsRules.js';

const WARN = { 0.3: 'Your tummy rumbles. Eat something soon: hungry heroes heal and sprint slower.',
  0.1: "You're running on empty! Eat something: you'll barely heal or sprint until you do." };

export const Needs = {
  get level() { return needLevel(ctx.player.energy); },
  update(dt) {
    const P = ctx.player;
    if (ctx.started && !P.dead && !ctx.transitioning && !ctx.cutscene) {
      const before = P.energy;
      P.energy = Math.max(0, P.energy - drainRate({ sprinting: P.sprinting && P.grounded, swimming: P.swimming }) * dt);
      for (const w of crossedWarnings(before, P.energy)) toast(WARN[w] ?? 'You feel hungry.');
    }
    const fx = needEffects(P.energy); P.regenK = fx.regen; P.sprintK = fx.sprint;
  },
  /** Food: fills `amount`; false when already full. */
  eat(amount) {
    const P = ctx.player; if (P.energy >= NEEDS.max - 0.5) return false;
    P.energy = Math.min(NEEDS.max, P.energy + amount); return true;
  },
  /** After fainting the hero wakes up with at least a little energy. */
  revive() { const P = ctx.player; P.energy = Math.max(P.energy, NEEDS.afterFaint); },
  reset() { const P = ctx.player; P.energy = NEEDS.start; P.regenK = P.sprintK = 1; },
};
