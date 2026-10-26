| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-22 16:38 | FIX | TODO 27 | Stabilize coastal combat browser checks | fix/coastal-enemy-smoke-aim | Seeded play before enemy spawn, refreshed auto-aim after scripted teleports, and added Ironclaw shot diagnostics. Initial release sweep failed coastal rear bolt and Ironclaw face bolt; coastal retest also missed the skipper bite. | 0h 38m |
| 2026-10-22 16:38 | TEST | TODO 27 | Verify smoke fix | fix/coastal-enemy-smoke-aim | Coastal enemy and Ironclaw smokes each passed three consecutive full runs; npm test 278/278; npm run sim 62/62; git diff --check clean. | 0h 05m |
| 2026-10-22 16:38 | MERGE | TODO 27 | Merge and push fix to develop | develop | Merged 4fc4a53 through 1f73d20 with --no-ff, pushed origin/develop, confirmed ancestry, and deleted the local fix branch; no remote fix branch existed. | 0h 01m |
| 2026-10-22 16:38 | TOTAL | TODO 27 | Complete coastal combat smoke repair | develop | Release browser checks are stable for the tested encounters; release gate continues separately. | 0h 38m |
