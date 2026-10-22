# TODO 34: bounty board

The feature was built in an earlier session that left it uncommitted on `feat/todo-34-bounty-board` (no log). This
session finished it from 15:47: review, checks, two fixes, merge. The earlier session's own time is not recorded here.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-15 15:47 | REVIEW | TODO 34 | Reviewed the uncommitted bounty board work (Bounties, bountyRules, BountyUI, config, save wiring, journal counters, README/TODO/balance notes) | feat/todo-34-bounty-board | Coherent; no blocking issues in review. The tutorial card covering the retaken README tour shots was already in the committed shots, so it is not a TODO 34 regression (left to the screenshots chore) | 0h 01m |
| 2026-10-15 15:47 | TEST | TODO 34 | `npm test` | feat/todo-34-bounty-board | 220/220 pass | 0h 01m |
| 2026-10-15 15:52 | TEST | TODO 34 | `npm run sim` | feat/todo-34-bounty-board | FAILED 2 of 43: `planetCatalog` (Frostveil layout digest changed) and `save` (bounties runtime round-trip, day 3 vs 1) | 0h 04m |
| 2026-10-15 15:55 | FIX | TODO 34 | Board placement moved after the portal gate; it avoids the farm, crafting corner, gate and every resource node; nodes no longer avoid the board | feat/todo-34-bounty-board | Probe showed only the Frostveil gate had moved (portal avoided the board). Saved positions are now unchanged on all worlds; boards sit 6 m from each square, 7.7-13 m from the gate, 8-12 m from the nearest node | 0h 03m |
| 2026-10-15 15:55 | FIX | TODO 34 | `save` sim populates the board (ticks it to day 3, one count, one claim) before the round-trip | feat/todo-34-bounty-board | The sim set the day without ticking the board; reload correctly posted a fresh set. Test defect, not a game bug | 0h 01m |
| 2026-10-15 15:56 | TEST | TODO 34 | `save`, `planetCatalog`, `bounties` sims | feat/todo-34-bounty-board | All pass | 0h 01m |
| 2026-10-15 15:58 | DOCS | TODO 34 | Bounty smoke retook `bounty-board.jpg` and `bounty-window.jpg`; opened both | feat/todo-34-bounty-board | An achievement toast overlapped the window shot; the smoke's tidy step now hides `#achv`. Retaken: both clean | 0h 02m |
| 2026-10-15 15:58 | TEST | TODO 34 | `node scripts/bounty-smoke.mjs` (Edge) | feat/todo-34-bounty-board | PASS: real E, claim click, 720p/1080p fit, reload + Continue, zero page/shader errors | 0h 01m |
| 2026-10-15 16:03 | TEST | TODO 34 | Full rerun after the fixes: `npm test`, `npm run sim` | feat/todo-34-bounty-board | 220/220 tests, 43/43 sims pass | 0h 05m |
| 2026-10-15 16:03 | DECISION | TODO 34 | Did not retake the README tour for this merge | feat/todo-34-bounty-board | The tour retaken by the earlier session is committed as is; the screenshots chore that follows retakes every shot and fixes the tutorial-card staging. Rejected: retaking twice | 0h 01m |
| 2026-10-15 16:03 | FEATURE | TODO 34 | Committed `feat: TODO 34 bounty board` (9735b42) | feat/todo-34-bounty-board | Includes the earlier session's work and this session's fixes | 0h 01m |
| 2026-10-15 16:04 | MERGE | TODO 34 | Merged into `develop` (`--no-ff`, 4382ca0), pushed, deleted the task branch | develop | `develop` matches `origin/develop`; branch was local only | 0h 01m |
| 2026-10-15 16:04 | TOTAL | TODO 34 | Finishing TODO 34 in this session, review to log | develop | Bounty board merged with all checks passing; two fixes (board placement, save sim) and one screenshot staging fix | 0h 17m |
