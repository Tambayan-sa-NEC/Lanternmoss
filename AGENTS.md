# Project work logs

Record every meaningful task, decision, change, and verification in a Markdown file under `docs/logs/`.
Use a Markdown table with one entry per row, keeping these seven columns in this order:

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-14 15:18 | FEATURE | TODO 27f | Describe the action | feat/todo-27f-old-ironclaw | Record the outcome or limitation | 0h 25m |
| 2026-10-14 18:40 | TOTAL | TODO 27f | Whole feature, start to finish | develop | Summary of the feature's outcome | 3h 22m |

- DATETIME is when the row is written (when that step finished), read from the machine clock, never typed or
  estimated, as `YYYY-MM-DD HH:MM` and nothing else: `date +"%Y-%m-%d %H:%M"` in Bash or
  `Get-Date -Format "yyyy-MM-dd HH:mm"` in PowerShell.
- DURATION is how long that step took, measured from the clock: note the time when the step starts and subtract it
  from the row's DATETIME. Write it as `Xh MMm` (`0h 25m`; `0h 01m` for anything under a minute).
- Every feature or task log ends with one `TOTAL` row: its DURATION is the elapsed time from the start of the
  first step to the end of the last one (the feature's whole execution, including checks, merge and logging).
- Use a task type from the list below, the applicable TODO number (or `TODO N/A` for work outside the roadmap),
  and the current branch name. Record outcomes and limitations truthfully.
- Append new rows to the table. Escape literal pipes as `\|` and use `<br>` for line breaks inside cells.
- Preserve existing entries when changing the log format: older rows and tables keep their original columns
  (`TASK`, ISO datetimes, no DURATION). Start a new table in the new format below an old one rather than mixing them.

Task types (pick the one that best describes the row):

| Type | Use for |
| --- | --- |
| `PLAN` | Scoping, estimates, breaking work into stages, roadmap edits |
| `RESEARCH` | Investigating code, tools, data or options before deciding |
| `DECISION` | A choice made, with its reason and the alternatives rejected |
| `DESIGN` | Game, art, UI or architecture design (behaviour, models, layouts, data formats) |
| `FEATURE` | Implementing new behaviour or content |
| `FIX` | Correcting a bug or wrong behaviour |
| `REFACTOR` | Restructuring code without changing behaviour |
| `PERF` | Performance measurement or optimisation |
| `BALANCE` | Tuning numbers, pacing and difficulty |
| `TEST` | Writing tests or running checks (unit, simulation, browser) and their results |
| `REVIEW` | Code, visual or design review, and self-review before merging |
| `DOCS` | README, docs, TODO, guides and screenshots |
| `CHORE` | Maintenance: dependencies, tooling, branch cleanup, repository housekeeping |
| `BUILD` | Build, packaging, scripts and CI setup |
| `MERGE` | Merging a branch (task branch into `develop`, `develop` into `master`) |
| `RELEASE` | Publishing a playable version on `master` (release merge, tag, release notes) |
| `HOTFIX` | An urgent fix to the playable `master`, made on a `hotfix/` branch |
| `SECURITY` | Security review, secrets or credential handling |
| `BLOCKED` | Work that cannot continue, and why |
| `TOTAL` | The last row of a feature or task log: the whole execution time |

# Branches

- `master`: the public, playable game. It only receives tested releases from `develop` and hotfixes.
  Never commit or develop on it directly, and never delete it.
- `develop`: the integration branch where new features and ideas are combined and tested. Never delete it.
- Task branches: one per TODO stage, fix or idea, created from an up-to-date `develop`:
  `feat/todo-<N>-<slug>` (e.g. `feat/todo-27f-old-ironclaw`), `fix/<slug>`, `docs/<slug>`, `chore/<slug>`,
  `refactor/<slug>`, `perf/<slug>`.
- Hotfix branches: `hotfix/<slug>`, created from `master` for an urgent problem in the playable game.

# Task completion workflow

Implement every TODO, feature or fix on its own task branch, never directly on `develop` or `master`.
After completing it:

1. Bring the task branch up to date with `develop` and resolve conflicts.
2. Run all project tests, including `npm test` and `npm run sim`, plus any required feature-specific or browser checks.
   All checks must pass before merging. Fix failures and rerun the affected checks; do not merge or delete the branch while any check fails.
3. Commit the completed changes and merge the tested task branch into `develop` (`--no-ff`).
   If conflict resolution or additional edits change the tested code, rerun the tests before completing the merge.
4. Push `develop` when a remote is configured. Confirm the task branch's work is included in it,
   then delete the task branch locally and remotely if it exists there.
5. Record test results, the merge, push, and branch deletion in `docs/logs/` using the table format above.
   These rows can only be written after the merge, so they may be committed directly on `develop` (or on `master`
   after a release or hotfix) and pushed. This is the only exception to the no-direct-commits rule: the commit
   must change log files under `docs/logs/` and nothing else.

This is the standing completion workflow; no additional confirmation is needed for these steps.

# Release workflow (`develop` into `master`)

`master` receives `develop` when a group of features is complete (for example, a whole TODO such as 27 with its world
released and playable) or when the user asks. Because `master` is the public game, confirm with the user before
each release merge.

1. Make sure `develop` is pushed and up to date, and that nothing unfinished is exposed to players
   (staged content stays behind its release flags).
2. Run all checks on `develop`: `npm test`, `npm run sim`, and the browser checks for everything in the release.
3. Merge `develop` into `master` (`--no-ff`), then tag the release (for example `v0.27.0`) and push `master` and the tag.
4. Record the release, its checks and its tag in `docs/logs/` (`RELEASE`, `TEST`, `MERGE` rows).

# Hotfix workflow

Branch `hotfix/<slug>` from `master`, fix it, run all checks, merge it into `master` and tag it, then merge `master`
into `develop` so the fix isn't lost. Push both, delete the hotfix branch, and log it (`HOTFIX`).
