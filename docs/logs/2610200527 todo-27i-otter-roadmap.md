# TODO 27i: prioritize the Tidewhisper otter

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-20 05:27 | PLAN | TODO 27i | Start the owner's otter roadmap update | docs/todo-27i-otter-roadmap | Updated `develop` with `git pull --ff-only`; tree was clean. Read TODO 27, the pet wiki and Tidewhisper release handoff. | 0h 01m |
| 2026-10-20 05:28 | DECISION | TODO 27i | Put the otter in the earliest pending TODO stage | docs/todo-27i-otter-roadmap | Added 27i after completed 27h with a separate 3-5 h estimate. It does not block the completed functional gate, 29g or 30. Public unlock still needs passing Acer performance acceptance, currently 0/18 timing rows. Rejected folding pet development into the completed 27h stage or adding it to the much later Pet care TODO 35. | 0h 01m |
| 2026-10-20 05:30 | TEST | TODO 27i | Check the roadmap edit and unit suite | docs/todo-27i-otter-roadmap | `git diff --check` clean; `npm test` 275/275 pass. | 0h 02m |
| 2026-10-20 05:44 | TEST | TODO 27i | Run the complete simulation suite | docs/todo-27i-otter-roadmap | `npm run sim`: all 58 passed, including pet, campaign, save, portal and terrain timing checks. Documentation-only change adds no browser behavior or browser check. | 0h 16m |
