# TODO 45 clarification: boss attacks and lesser mobs

Clock start: 2026-10-17 13:47:58.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-17 13:48 | DECISION | TODO 45 | Clarified that main-boss and mini-boss attacks cannot damage lesser mobs | docs/todo-45-boss-attacks-exclude-lesser-mobs | Kept lesser-mob-on-lesser-mob damage and provoked retaliation. Explicitly covered boss projectiles, melee and area effects, and required tests for both HP and aggro so boss attacks cannot trigger a lesser-mob fight. | 0h 01m |
| 2026-10-17 13:48 | DOCS | TODO 45 | Updated TODO 45 stages and acceptance criteria | docs/todo-45-boss-attacks-exclude-lesser-mobs | Added boss/mini-boss exclusion to stage 45b and regression acceptance to 45c and the checklist. `git diff --check` passed. Roadmap-only edit; gameplay tests not run. | 0h 01m |
| 2026-10-17 13:48 | MERGE | TODO 45 | Merged 6d13af7 into develop with --no-ff (249aab8) and pushed origin/develop | develop | Updated boss damage exclusion and acceptance checks are on develop. Docs-only change; `git diff --check` passed. | 0h 01m |
| 2026-10-17 13:48 | CHORE | TODO 45 | Deleted the merged local clarification branch | develop | No remote task branch existed. | 0h 01m |
