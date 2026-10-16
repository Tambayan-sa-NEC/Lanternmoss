# The journal

`gameplay/Journal.js` listens on the event buses and fills in the journal:
- `combat/events.js`: `enemydefeated`, `bossdefeated`, plus `enemyhit` and `playerhurt`, which were added for the boss
  challenges.
- `core/events.js`: `chestopened`, `questcomplete`, plus `crafted` and `petfound`, which are new.
- The bag's `itemadded`, whose detail now carries the item's `props`, so Legendary finds count.

Nothing else knows the journal exists. Its saved shape, the counters and achievement progress are pure functions in
`gameplay/journalRules.js` (unit-tested). It's written to localStorage (`lanternmoss.journal`) a moment after each
change, and cleaned on load. A boss fight starts when the boss engages. A win then sets `flawless` if no hit landed on
the hero, `petless` if the pet never struck the boss, and `underdog` if the fight began at or under the planet's
`BOSS_CHALLENGES.lowLevel`.

To add an achievement, add an entry to `ACHIEVEMENTS` with a goal on one of the `JOURNAL_STATS` counters (or a flag) and
a glyph in `ui/icons.js`. A new monster needs a page in `BESTIARY_ENTRIES`. `npm test` checks both.
