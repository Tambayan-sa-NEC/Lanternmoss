# Fix: an unreleased world's rare gift in released loot

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-21 16:58 | FIX | TODO N/A | Marked the Pearl of the Deep gift-only | fix/pearl-gift-only | The owner asked for the leak reported during TODO 30b to be closed. Tidewhisper's Pearl Turtle charm was ordinary tier-3 equipment, so it sat in the random gear pool and could drop from a chest on released Frostveil. Branched from `develop`, which did not yet have 30b's gift-only rule, so the rule itself is included here. | 0h 06m |
| 2026-10-21 17:05 | TEST | TODO N/A | Added a regression test and ran the suites | fix/pearl-gift-only | New `items.test.mjs` case rolls the real gear pool 3000 times on the last released world for every unreleased world's rare gift; it fails without the fix. `npm test`: 278/278. `npm run sim`: 62/62 after the loot pool changed the seeded stream. | 0h 07m |
| 2026-10-21 17:10 | DOCS | TODO N/A | Recorded the change where the Pearl is owned | fix/pearl-gift-only | The Tidewhisper page now states that the charm is gift-only and why. No README or balance change: the pearl was never intended to be reachable before its world ships. | 0h 02m |
| 2026-10-21 17:10 | MERGE | TODO N/A | Merged and pushed the fix | develop | Clean `--no-ff` merge `6d5e7b6` pushed to origin/develop; the fix branch was deleted and had no remote copy. The TODO 30 parent takes the same rule when it next syncs with `develop`. | 0h 01m |
| 2026-10-21 17:11 | TOTAL | TODO N/A | Closed the released-loot leak | develop | Befriending the Pearl Turtle is again the only way to hold the Pearl of the Deep, and any future unreleased-world gift is covered by the same rule and test. | 0h 13m |
