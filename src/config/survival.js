/* ---------------------------------------------------------------------
   NEEDS: the hero's energy (runtime: src/gameplay/Needs.js, rules: src/gameplay/needsRules.js). Cozy on purpose: it
   drains slowly as you play, food fills it, and running low never hurts you. It only slows your healing and your
   sprint, so a long expedition wants a pocket of food.
   --------------------------------------------------------------------- */

export const NEEDS = {
  max: 100,
  start: 80,                  // a new adventure begins a little peckish
  drain: 0.08,                 // per second of play (full to empty in ~21 minutes, a bit over four days)
  sprint: 0.16,               // extra per second while sprinting
  swim: 0.08,                 // extra per second while swimming
  hungry: { below: 0.3, regen: 0.5, sprint: 0.85 },     // under 30%: half healing, a slower sprint
  starving: { below: 0.01, regen: 0, sprint: 0.65 },    // empty: no healing, sprint barely faster than walking
  afterFaint: 40,             // fainting brings you back with at least this much
  warnings: [0.3, 0.1],       // toasts as it falls past these shares
};
