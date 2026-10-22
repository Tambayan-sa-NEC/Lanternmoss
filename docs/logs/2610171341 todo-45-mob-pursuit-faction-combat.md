# TODO 45: mob pursuit and faction combat

Task clock start: 2026-10-17 13:41:42. This is a roadmap proposal only; no gameplay behavior was implemented.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-17 13:42 | RESEARCH | TODO 45 | Read the roadmap sequence, TODO 14 combat scope, TODO 23 balance/leash acceptance, enemy config/runtime and combat balance wiki | docs/todo-45-mob-pursuit-faction-combat | Existing regular enemies have aggro and home-distance cutoffs; mini-boss out-of-combat healing is tied to current leash behavior. Item 23 documents the existing balance targets and regression expectations. | 0h 01m |
| 2026-10-17 13:42 | DECISION | TODO 45 | Scope indefinite pursuit to the current world and end it through existing travel/reset cleanup | docs/todo-45-mob-pursuit-faction-combat | User requested no leash for lesser mobs and leash removal for mini bosses on reaching their final form/state. Cross-planet pursuit would strand combat across world changes; the TODO instead requires no distance cutoff during ordinary same-world pursuit and removes the mini-boss leash only on its final transition. Preserve correct damage ownership and one-time rewards for provoked fights. | 0h 01m |
| 2026-10-17 13:42 | DOCS | TODO 45 | Added Phase H / item 45 and its promotion entry to TODO.md | docs/todo-45-mob-pursuit-faction-combat | Three staged scopes cover pursuit and phase leashes, mob damage/retaliation, and integrated acceptance. `git diff --check` passed. This docs-only roadmap task did not change gameplay or run game tests. | 0h 01m |
| 2026-10-17 13:43 | MERGE | TODO 45 | Merged bb12247 into develop with --no-ff (cb94c79) and pushed origin/develop | develop | Roadmap proposal and its task log are included. No gameplay changed; no game tests were run for this docs-only task. `git diff --check` passed before merge. | 0h 01m |
| 2026-10-17 13:43 | CHORE | TODO 45 | Deleted the merged local task branch and checked for a remote branch | develop | `docs/todo-45-mob-pursuit-faction-combat` deleted after merge/push; no remote branch existed. | 0h 01m |

| 2026-10-17 13:43 | TOTAL | TODO 45 | Add and publish the mob pursuit and faction combat roadmap item | develop | Added item 45 and its staged acceptance. Merged as cb94c79; develop push and log publication completed. Docs-only change; diff check passed, gameplay tests not run. Elapsed from 13:41:42 through this completion row: 1m 58s. | 0h 01m |
