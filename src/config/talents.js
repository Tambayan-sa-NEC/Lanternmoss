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
    witch: { released: false, talents: [] },
    knight: { released: false, talents: [] },
    ranger: { released: false, talents: [] },
  },
};
