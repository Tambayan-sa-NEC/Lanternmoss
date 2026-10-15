/* ---------------------------------------------------------------------
   BOUNTY BOARD (TODO 34; rules src/gameplay/bountyRules.js, runtime src/gameplay/Bounties.js, window src/ui/BountyUI.js).
   A notice board near each village square with `perDay` small tasks, a new set every day (the day clock). Tasks are
   generated from the planet's own config, so every world gets bounties without extra writing:
     defeat    N of a monster from the planet's roster (counted on this planet after the set is posted)
     bring     N of an item from the planet's own resource nodes or its material (handed over at the board)
     fish      N of the planet's common fish (FISHING / resources.catches; the rare golden koi is never asked for)
     harvest   N crops of any kind from the village farm (worlds without a farm skip it)
   kinds      weight (how often it's picked), count [min, max], coins [for the least, for the most] before planet scaling
   coinsPerPlanet  coins grow like chest coins: x (1 + this x planet index)
   material   [min, max] of the planet's material added to every reward
   rareChance share of bounties that also pay a rare piece of gear (rolled for the hero when claimed)
   board      where it stands: distance from the square (m), clearance radius, and how near you stand to read it
   Bounties are optional, repeatable income on top of the first-visit budgets in docs/balance.md: kept to about what
   selling chest finds pays (Lanternmoss 20-30 coins a day), while materials still gate crafting.
   --------------------------------------------------------------------- */

export const BOUNTIES = {
  perDay: 3,
  kinds: {
    defeat: { weight: 3, count: [3, 5], coins: [6, 10] },
    bring: { weight: 3, count: [4, 8], coins: [5, 8] },
    fish: { weight: 2, count: [1, 2], coins: [7, 11] },
    harvest: { weight: 2, count: [2, 3], coins: [6, 9] },
  },
  coinsPerPlanet: 0.25,
  material: [1, 2],
  rareChance: 0.08,
  board: { distance: [6, 13], radius: 1.4, reach: 2.2 },
};
