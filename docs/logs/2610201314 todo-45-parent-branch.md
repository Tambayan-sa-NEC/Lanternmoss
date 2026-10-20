# TODO 45: parent branch and stage 45a restaging

TODO 45 is a three-stage item (45a-45c) but had no parent branch: `feat/todo-45a-pursuit` was cut straight from
`develop`, against the branch rules in `AGENTS.md`. Nothing was merged yet, so no history had to be rewritten:
the parent was created from current `develop` and the finished stage merged into it.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-20 13:14 | RESEARCH | TODO 45 | Check whether TODO 45 has a parent branch | develop | No `feat/todo-45` locally or on the remote. `feat/todo-45a-pursuit` forked from `develop` at `4843cb4` with 3 unmerged commits, and `develop` had since moved on (TODO 27i, the README play link, the vendor-three hotfix) | 0h 04m |
| 2026-10-20 13:15 | CHORE | TODO 45 | Create `feat/todo-45` from the up-to-date `develop` and push it | feat/todo-45 | Parent at `5e1ebe5`. Follows the `AGENTS.md` rule for an existing partially completed TODO: new parent from current `develop`, child branches for the remaining stages | 0h 01m |
| 2026-10-20 13:16 | CHORE | TODO 45a | Bring the stage up to date with its new parent | feat/todo-45a-pursuit | `b761d2b`, merged clean: 45a touches `Enemy.js`, `config/combat.js`, three sims, `TODO.md` and the balance wiki page, none of which the intervening `develop` work had changed | 0h 01m |
| 2026-10-20 13:22 | TEST | TODO 45a | Full suites on the synchronized stage | feat/todo-45a-pursuit | 275 unit tests pass, 0 fail; all 59 sims pass. `pursuit.sim.mjs` rerun on its own: all 7 assertions pass, including all 19 monster kinds following the rule (12 ordinary never give up, 3 mini bosses only until their last form, 4 main bosses unchanged) | 0h 06m |
| 2026-10-20 13:22 | MERGE | TODO 45a | Merge the stage into its parent and push | feat/todo-45 | `d3d586f`. `ee55ea7` confirmed present in the parent. Stage branch deleted locally; it had never been pushed, so there was nothing to delete on the remote | 0h 01m |
| 2026-10-20 13:24 | TOTAL | TODO 45 | Restage TODO 45 under a parent branch | feat/todo-45 | 45a is complete and merged into `feat/todo-45`, which stays out of `develop` until 45b and 45c are done and the combined acceptance checks in the 45c row pass. 45b branches from this parent | 0h 10m |
