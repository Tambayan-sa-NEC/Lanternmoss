# Lanternmoss agent guide

How work on this repository is done, in the order it happens: starting a task, working on it, finishing it with
docs and screenshots, merging it, and logging it. The branch, completion, release and hotfix rules near the end are
standing rules. Following them needs no extra confirmation, except where a section says to ask.

# Starting a task

1. Note the start time from the machine clock (`date +"%Y-%m-%d %H:%M"`). It is the log's file name prefix and the
   start of its `TOTAL` duration (see Project work logs).
2. Update `develop` (`git pull --ff-only`) and check the working tree is clean. For a multistep TODO, create or
   update its parent branch from `develop`, then create the stage branch from that parent (see Branches).
   Other task branches start from `develop`. Never implement work directly on `develop` or `master`.
3. Read the task's section in `TODO.md`: its goal, size, dependencies (`Needs`), checklist and any earlier
   "implemented" notes. Read the matching wiki pages (start at `docs/wiki/README.md`; for example
   `docs/wiki/world/tidewhisper.md`, `docs/wiki/game-design/balance.md`, `docs/wiki/technical/performance.md`) and the
   latest related logs in `docs/logs/`.
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
  The wiki's tuning page (`docs/wiki/technical/tuning.md`) points to them.
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

- Timing targets and their rules are in `docs/wiki/game-design/balance.md` and `src/config/balance.js`. Do not loosen a target to
  pass. First rule out a measurement defect (bot reach, approach, a misapplied rule), then tune gameplay numbers.
- Measure on at least two seeds (1 and 7) for all three heroes, and show before and after numbers.
- A new world is audited by the pacing simulation: its XP route, coin budget and material yields.
- Performance acceptance is in `docs/wiki/technical/performance.md`. Only real target hardware certifies a release. Diagnostic runs
  on other machines are recorded as diagnostics, never as certification.
- Recommended development machines are recorded in [Development and validation machines](docs/wiki/technical/performance.md#development-and-validation-machines).
  Prefer the owner's higher-spec laptop for coding, full test suites, browser checks and visual review; use the UHD 620 laptop
  for occasional low-end diagnostics. Keep final Iris Xe performance validation pending until that machine is available.

Commits during the task:

- Commit with a short type prefix: `feat:`, `fix:`, `balance:`, `docs:`, `chore:`. Write a body that says what
  changed and why.
- Work that must pause before it can pass all checks (for example waiting for hardware) may be committed and pushed
  on its task branch as a checkpoint. Say so in the log; do not merge an incomplete stage into its parent or
  `develop`. A parent may hold completed stages while its remaining stages are unfinished.

# Finishing a feature: docs and screenshots

When the feature works and its checks pass, before merging:

1. **Feature screenshots.** The feature's smoke script saves its own shots to `docs/screenshots/<folder>/<feature>.jpg`
   through `shotPath()` in `scripts/shots.mjs`. Give each new shot a subject folder there first (`characters`, `pets`,
   `critters`, `mobs`, `bosses`, `npcs`, `village`, `building`, `world`, `activities`, `huds`).
   - Stage a clean, readable frame. Pick a clear view of the hero (`clearStage` in `ui/showcase.js`), set a calm time
     and weather, and hide toasts and banners that are not the subject.
   - Open every new screenshot and look at it. Check that the subject is visible and unobstructed, nothing is
     clipped, and no debug or HUD clutter shows. Fix the staging and retake until it reads well; record what was fixed.
2. **The screenshot tour.** After a player-facing update, retake every tour screenshot (used by the README and the
   wiki's feature tour) with `node scripts/screenshots.mjs`
   (Google Chrome by default, `CHROME` to override; a few minutes). It must finish with `errors: none`.
   - Spot-check a few shots: the Controls page for new keys, and a gameplay shot to confirm normal play looks as before.
   - A feature that deserves a tour picture gets a scene in that script, or its own smoke shot.
3. **The wiki** (see Documentation governance), each in the page that owns it:
   - Feature tour (`docs/wiki/game-design/feature-tour.md`): a paragraph and the screenshots.
   - Controls (`docs/wiki/reference/controls.md`), for new keys.
   - The file map (`docs/wiki/technical/file-map.md`), for new files.
   - The tuning page (`docs/wiki/technical/tuning.md`), for new config.
   - The browser checks in `docs/wiki/technical/running-and-checks.md`, for a new smoke script.
   - The wiki home (`docs/wiki/README.md`), for a new page.
   - `README.md` only when the project overview, the key features, setup or onboarding change.
4. **TODO.md and docs.** Tick the TODO checklist and add an "**N implemented (date):**" note saying what was built and
   how it is checked. Update the feature's wiki page in `docs/wiki/`, and record any limitation honestly.

Then follow the task completion workflow below.

# Documentation governance

Each document has one job:

- **`README.md`**: the project's concise overview, onboarding guide and setup reference.
- **`docs/wiki/`**: the authoritative source for detailed game design, gameplay mechanics, lore, terminology, system
  specifications and technical decisions. One page owns each subject; `docs/wiki/README.md` is its index.
- **`AGENTS.md`**: the authoritative source for agent operating instructions, development workflows and
  repository-specific constraints. `TODO.md` stays the roadmap, and `docs/logs/` the record of work done.

Before implementing or changing a game feature:

1. Consult the relevant wiki pages and follow their confirmed rules and technical constraints.
2. Distinguish implemented behaviour from planned or proposed behaviour (unreleased content and `docs/wiki/plans/`).
3. Don't invent mechanics or silently change an established specification.
4. Update the affected wiki pages in the same task whenever an implemented change makes them outdated.
5. Update `README.md` only when the overview, major features, setup or onboarding change, and `AGENTS.md` only when
   workflows, operating instructions or repository conventions change.

When documentation and implementation disagree, don't assume either is right. Check the evidence (the code, its tests,
`TODO.md` notes, decisions in `docs/logs/`), correct only what that evidence supports, and flag anything unresolved for
the user rather than choosing a version.

# Branches

- `master`: the public, playable game. It only receives tested releases from `develop` and hotfixes.
  Never commit or develop on it directly, and never delete it.
- `develop`: the integration branch where new features and ideas are combined and tested. Never delete it.
- Multistep TODO parent branches: `feat/todo-<N>` (e.g. `feat/todo-28`), created from an up-to-date `develop`.
  Keep the parent for the whole TODO; it collects its completed stages and stays out of `develop` until all
  required stages and the TODO's acceptance checks pass.
- Stage branches: `feat/todo-<N><letter>` (e.g. `feat/todo-28a`, `feat/todo-28b`), created from the latest parent
  branch, never directly from `develop`. A descriptive suffix is allowed. Merge each completed, tested stage
  into its parent (`--no-ff`), never directly into `develop`. Start later stages from the updated parent so they
  include earlier completed work.
- Other task branches: one per standalone TODO, fix or idea, created from an up-to-date `develop`:
  `feat/todo-<N>-<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`, `refactor/<slug>`, `perf/<slug>`.
- Hotfix branches: `hotfix/<slug>`, created from `master` for an urgent problem in the playable game.

For example: `develop` -> `feat/todo-28` -> `feat/todo-28a`; merge finished 28a back into `feat/todo-28`,
then branch `feat/todo-28b` from that updated parent. After all required stages (28a-28e in this example)
and the combined acceptance checks pass, merge `feat/todo-28` into `develop`.
Do not rewrite already-merged history to adopt this rule: for an existing partially completed TODO, create its
parent from current `develop` and use child branches for the remaining stages.

# Task completion workflow

Implement every TODO, feature or fix on its own task branch, never directly on `develop` or `master`.
After completing it:

1. Choose the merge target: the TODO parent for a stage, or `develop` for a standalone task or completed parent.
   For a stage, first bring its parent up to date with `develop`, then bring the stage up to date with its parent
   and resolve conflicts. For other tasks, bring the task branch up to date with `develop`.
2. Run all project tests, including `npm test` and `npm run sim`, plus any required feature-specific or browser checks.
   All checks must pass before merging. Fix failures and rerun the affected checks; do not merge or delete the branch while any check fails.
   Run timing-sensitive suites (`npm run sim` includes a terrain timing check) when no other heavy job is running,
   for example not alongside the screenshot tour.
3. Commit the completed changes and merge the tested task branch into its merge target (`--no-ff`).
   If conflict resolution or additional edits change the tested code, rerun the tests before completing the merge.
   A parent can merge into `develop` only after every required stage is finished and merged into it; run the
   complete suites and all required combined feature/browser/acceptance checks on the synchronized parent first.
4. Push the merge target when a remote is configured. Confirm the task branch's work is included in it,
   then delete the merged task branch locally and remotely if it exists there. After a stage merge, keep the
   parent for the remaining stages. Delete the parent only after its completed work is merged and pushed to `develop`.
5. Record test results, the merge, push, and branch deletion in `docs/logs/` using the table format below.
   These rows can only be written after the merge, so they may be committed directly on the merge target
   (a TODO parent, `develop`, or `master` after a release or hotfix) and pushed. For `develop` and `master`,
   this is the only exception to the no-direct-commits rule: the commit
   must change log files under `docs/logs/` and nothing else.
6. Report to the user: what was built, the check results (with any failure on the way and how it was fixed), the
   decisions made on their behalf, and what remains. A branch left behind `develop` (for example a paused checkpoint)
   is synchronized with its merge target (and the parent's latest `develop`, for a stage) and rechecked before it resumes.

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
| `DOCS` | README, wiki, docs, TODO, guides and screenshots |
| `CHORE` | Maintenance: dependencies, tooling, branch cleanup, repository housekeeping |
| `BUILD` | Build, packaging, scripts and CI setup |
| `MERGE` | Merging a branch (stage into TODO parent, completed task/parent into `develop`, `develop` into `master`) |
| `RELEASE` | Publishing a playable version on `master` (release merge, tag, release notes) |
| `HOTFIX` | An urgent fix to the playable `master`, made on a `hotfix/` branch |
| `SECURITY` | Security review, secrets or credential handling |
| `BLOCKED` | Work that cannot continue, and why |
| `TOTAL` | The last row of a feature or task log: the whole execution time |
