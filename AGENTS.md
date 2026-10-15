# Lanternmoss agent guide

How work on this repository is done, in the order it happens: starting a task, working on it, finishing it with
docs and screenshots, merging it, and logging it. The branch, completion, release and hotfix rules near the end are
standing rules. Following them needs no extra confirmation, except where a section says to ask.

# Starting a task

1. Note the start time from the machine clock (`date +"%Y-%m-%d %H:%M"`). It is the log's file name prefix and the
   start of its `TOTAL` duration (see Project work logs).
2. Update `develop` (`git pull --ff-only`) and check the working tree is clean. Then create the task branch from it
   (see Branches). Never start work on `develop` or `master`.
3. Read the task's section in `TODO.md`: its goal, size, dependencies (`Needs`), checklist and any earlier
   "implemented" notes. Read the matching doc in `docs/` (for example `docs/tidewhisper.md`, `docs/balance.md`,
   `docs/performance.md`) and the latest related logs in `docs/logs/`.
4. Before designing, find the closest existing feature and follow it rather than inventing a new pattern. Examples:
   `ui/PetMenu.js` for a paused overlay, `CameraSystem` modes for a camera, the boss kits in
   `entities/enemies/behaviors/boss/` for an encounter. Reuse existing helpers.
5. Ask the user only about decisions that are theirs. Examples: changing an acceptance target or rule, a design
   choice between real trade-offs, a release, or anything public or paid. Give a recommended option and the evidence.
   When the user delegates ("let me know when it's done"), choose the option the evidence supports and record it as a
   `DECISION` row with the alternatives rejected. Report it at the end so it can be changed.

# Working on a task

Code conventions:

- Tunable numbers and authored data live in `src/config/*.js`, with a header comment explaining every field.
  Pure helpers that go with that data may sit beside it (for example `photoFileName` in `config/photo.js`).
  The README's tuning table points to them.
- Pure logic gets a unit test in `tests/*.test.mjs` (`npm test`, Node's test runner).
- Runtime behaviour gets a simulation in `tests/sim/<name>.sim.mjs`, booted with `tests/sim/lib/boot.mjs`. Run one
  with `node tests/sim/<name>.sim.mjs` or `npm run sim -- <name>`, and all of them with `npm run sim`. Every new
  behaviour or fixed bug gets an assertion that fails without the change.
- Player-facing UI or rendering gets a browser check, `scripts/<feature>-smoke.mjs`. It needs Puppeteer Core:
  `npm i --no-save --no-package-lock puppeteer-core`. Follow the existing smokes:
  - Use Edge by default, overridable with `CHROME`.
  - Start a server on a port of its own (check `scripts/` for used ports).
  - Use real keyboard and mouse input where the feature is about input.
  - Run at 720p and 1080p, asserting that nothing overflows.
  - Assert zero page errors and zero shader errors.
  - Shut the browser down with a bounded timeout, so a hung browser cannot hang the check.
- Software rendering (SwiftShader) runs far below 60 fps. Drive time with explicit frames
  (`window.LANTERNMOSS.update(1/60)` in a loop) instead of sleeping. A timed key hold can otherwise contain zero frames.
- Unreleased content stays `released: false`. Exercise it through test-only fixtures (`tests/sim/lib/*Fixture.mjs`,
  `tidewhisperCandidate.mjs`), never through production code paths. A test must never enable a release flag.
- Throwaway probes (diagnostic copies of a sim or smoke, ledgers, timing probes) go in files prefixed `_` next to
  what they import (`tests/sim/_probe.mjs`, `scripts/_probe.mjs`). Delete them in the same command and never commit
  them. Other temporary output goes in the session scratchpad or the system temp folder, not the repository.
- If a check rewrites tracked files as a side effect (for example a smoke retaking an unrelated screenshot), restore
  them with `git checkout -- <file>` unless that change is part of the task.

Balance and performance:

- Timing targets and their rules are in `docs/balance.md` and `src/config/balance.js`. Do not loosen a target to
  pass. First rule out a measurement defect (bot reach, approach, a misapplied rule), then tune gameplay numbers.
- Measure on at least two seeds (1 and 7) for all three heroes, and show before and after numbers.
- A new world is audited by the pacing simulation: its XP route, coin budget and material yields.
- Performance acceptance is in `docs/performance.md`. Only real target hardware certifies a release. Diagnostic runs
  on other machines are recorded as diagnostics, never as certification.

Commits during the task:

- Commit with a short type prefix: `feat:`, `fix:`, `balance:`, `docs:`, `chore:`. Write a body that says what
  changed and why.
- Work that must pause before it can pass all checks (for example waiting for hardware) may be committed and pushed
  on its task branch as a checkpoint. Say so in the log, and keep it out of `develop` until it is complete.

# Finishing a feature: docs and screenshots

When the feature works and its checks pass, before merging:

1. **Feature screenshots.** The feature's smoke script saves its own shots to `docs/screenshots/<folder>/<feature>.jpg`
   through `shotPath()` in `scripts/shots.mjs`. Give each new shot a subject folder there first (`characters`, `pets`,
   `critters`, `mobs`, `bosses`, `npcs`, `village`, `building`, `world`, `activities`, `huds`).
   - Stage a clean, readable frame. Pick a clear view of the hero (`clearStage` in `ui/showcase.js`), set a calm time
     and weather, and hide toasts and banners that are not the subject.
   - Open every new screenshot and look at it. Check that the subject is visible and unobstructed, nothing is
     clipped, and no debug or HUD clutter shows. Fix the staging and retake until it reads well; record what was fixed.
2. **The README tour.** After a player-facing update, retake every README screenshot with `node scripts/screenshots.mjs`
   (Google Chrome by default, `CHROME` to override; a few minutes). It must finish with `errors: none`.
   - Spot-check a few shots: the Controls page for new keys, and a gameplay shot to confirm normal play looks as before.
   - A feature that deserves a tour picture gets a scene in that script, or its own smoke shot.
3. **README.md.**
   - Feature tour: a paragraph and the screenshots.
   - The controls table, for new keys.
   - The file map, for new files.
   - The tuning table, for new config.
   - The list of browser checks, for a new smoke script.
4. **TODO.md and docs.** Tick the TODO checklist and add an "**N implemented (date):**" note saying what was built and
   how it is checked. Update the feature's doc in `docs/`, and record any limitation honestly.

Then follow the task completion workflow below.

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
   Run timing-sensitive suites (`npm run sim` includes a terrain timing check) when no other heavy job is running,
   for example not alongside the screenshot tour.
3. Commit the completed changes and merge the tested task branch into `develop` (`--no-ff`).
   If conflict resolution or additional edits change the tested code, rerun the tests before completing the merge.
4. Push `develop` when a remote is configured. Confirm the task branch's work is included in it,
   then delete the task branch locally and remotely if it exists there.
5. Record test results, the merge, push, and branch deletion in `docs/logs/` using the table format below.
   These rows can only be written after the merge, so they may be committed directly on `develop` (or on `master`
   after a release or hotfix) and pushed. This is the only exception to the no-direct-commits rule: the commit
   must change log files under `docs/logs/` and nothing else.
6. Report to the user: what was built, the check results (with any failure on the way and how it was fixed), the
   decisions made on their behalf, and what remains. A branch left behind `develop` (for example a paused checkpoint)
   is updated from `develop` and rechecked before it resumes.

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

# Project work logs

Record every meaningful task, decision, change, and verification in a Markdown file under `docs/logs/`.
Name each log file `YYMMDDHHMM <descriptive-title>.md`: the machine-clock time the work started (the log's first
row), a space, then a short kebab-case title starting with the TODO stage when there is one, for example
`2610141529 todo-27f-old-ironclaw.md` or `2610141529 project-status.md`. Get the prefix with `date +"%y%m%d%H%M"`
in Bash or `Get-Date -Format "yyMMddHHmm"` in PowerShell. Quote the path in commands, since it contains a space.
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
  Read the clock at step boundaries as you go (a check's own output, such as a timestamped file name, also counts).
- Every feature or task log ends with one `TOTAL` row: its DURATION is the elapsed time from the start of the
  first step to the end of the last one (the feature's whole execution, including checks, merge and logging).
- Use a task type from the list below, the applicable TODO number (or `TODO N/A` for work outside the roadmap),
  and the current branch name. Record outcomes and limitations truthfully, including failed checks and how they
  were fixed.
- Reviews of someone else's branch and short advice sessions get their own small log too.
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
