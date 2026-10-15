/* TALENTS (TODO 28): a small tree per hero, bought with points from levelling up, changing their abilities. Rules:
   src/progression/talentRules.js (pure); runtime: src/gameplay/Talents.js; the page: src/ui/TalentUI.js.
     points    a point at level `firstAt`, then one every `every` levels (levels 2, 4 ... 16: 8 points by the cap).
               Points are worked out from the level, never stored, so a level-up or a reload cannot hand them out twice.
     wizard    the villager who resets a hero's talents for free (in their dialogue)
     trees     per hero: { released, talents }. A tree stays hidden from players (no page, no wizard offer, no
               level-up note) until `released` is true, which its own stage (28c witch, 28d knight, 28e ranger) sets
               once its talents and checks are done. Until then only test fixtures fill a tree.
   A talent: { id, name, text, row, max, cost, needs, mods }
     row       which row of the page it sits on (1 = top)
     max       ranks it can take (1-3); cost = points per rank
     needs     talent ids that must have at least one rank first
     mods      [{ ability, key, add | mul | set }]: changes to CHARACTERS[hero].abilities[ability][key] per rank:
               add += value x ranks, mul *= 1 + value x ranks, set = value (from the first rank). The hero's
               kit is rebuilt from the base abilities every time, so a reset restores the base kit exactly. */
export const TALENTS = {
  points: { firstAt: 2, every: 2 },
  wizard: 'Old Bramble',
  trees: {
    witch: { released: true, talents: [
      { id: 'brightBolt', name: 'Bright Bolt', text: 'Arcane Bolt deals 10% more damage per rank.', row: 1, max: 2, cost: 1, needs: [],
        mods: [{ ability: 'bolt', key: 'damage', mul: 0.1 }] },
      { id: 'quickFrost', name: 'Quick Frost', text: 'Frost Nova is ready 1 second sooner per rank.', row: 1, max: 2, cost: 1, needs: [],
        mods: [{ ability: 'nova', key: 'cooldown', add: -1 }] },
      { id: 'lightStep', name: 'Light Step', text: 'Blink costs 2 less mana per rank.', row: 1, max: 2, cost: 1, needs: [],
        mods: [{ ability: 'blink', key: 'cost', add: -2 }] },
      { id: 'seekingFlame', name: 'Seeking Flame', text: 'Fireball follows the foe you aim at when cast. Its damage, blast and range stay the same. Costs 2 points.',
        row: 2, max: 1, cost: 2, needs: ['brightBolt'],
        mods: [{ ability: 'fireball', key: 'homing', set: 4 }, { ability: 'fireball', key: 'name', set: 'Seeking Fireball' }] },
      { id: 'deepFreeze', name: 'Deep Freeze', text: 'Frost Nova keeps foes slowed for 0.5 seconds longer per rank.', row: 2, max: 2, cost: 1, needs: ['quickFrost'],
        mods: [{ ability: 'nova', key: 'slowTime', add: 0.5 }] },
    ] },
    knight: { released: false, talents: [] },
    ranger: { released: false, talents: [] },
  },
};
