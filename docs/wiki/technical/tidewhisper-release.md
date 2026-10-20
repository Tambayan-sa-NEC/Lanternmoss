# Tidewhisper 27h: validation and hardware handoff

Status: **functional 27h checks pass; public release no-go**. Tidewhisper remains `released: false`. No release tag or
`master` merge is authorized by this checkpoint. On October 17 the owner selected the available Acer Nitro ANV15-51 / RTX 4050 Laptop GPU as
the default desktop validation machine. Other machines supply additional checks; Iris Xe access is no longer required.

The synchronized 2026-10-19 candidate passed **275 unit tests, all 58 simulations, 25 relevant Edge browser
scripts**, the three-hero duel and pacing audits, and the full screenshot tour (`errors: none`). The browser
campaign script exercises real portal, travel, Continue, return, boss gate and one-time completion paths through
the test-only fourth-world candidate at 720p and 1080p. The source release flag remains off.

Latest synchronized hardware attempt: **0/18 timing cases pass; all 18 render-count cases pass**. See
[the 60 Hz matrix](#synchronized-60-hz-acceptance-matrix-2026-10-19). The collector failed acceptance and
produced no release artifact. The owner-approved gate split permits functional integration to `develop`; production
enablement and public release still depend on a passing Acer matrix.

The test-only candidate harness substitutes the fourth catalog entry **before** importing Game, saves and achievements.
It borrows a released Act I fixture template and copies Tidewhisper content into that test object; the authored
Tidewhisper object and its `released: false` flag remain untouched. Restoration reinstates the original catalog identity.
It preserves the three original worlds and exercises real `tidewhisper` ids, scaling, portal travel and Continue.
It lives under tests/scripts and is never imported by the production entry point. Borrowing an Act I save slot is
insufficient release evidence: those earlier fixtures inherited missing configuration and could hide schema issues.

## Historical checkpoint evidence (2026-10-14–15)

- Fixed the two reviewed Mirelure defects: bubbles and the real lure now share a clock; diving cancels pending and
  active surface attacks. The simulation observes actual bubble emissions and checks both roll states and a bite.
- Added explicit empty forage (coastal resources/washups supply gathering) and eight common/three Lantern chests.
  The content gate now rejects missing forage arrays. The actual fourth-world campaign simulation passed on the original checkpoint; current synchronization results follow below.
- Browser campaign check passed portal UI travel, partial quest/node Continue after a full reload, return travel,
  720p/1080p low rendering, the level/quest/tide gate, campaign completion and one Tide Crown after reload, without
  page/shader errors. It stages prior boss wins and the final kill; it is not an uninterrupted human playthrough.
- Full checks: 211 unit tests and all 43 simulations passed, including terrain timing. The corrected coastal bot
  also passed affected reruns on both seeds. The dedicated Mirelure browser check passed on rerun after one earlier
  real-lure bolt assertion failure; that failure remains recorded in the work log.
- [Available-hardware diagnostic](../../tidewhisper-performance.json): Intel UHD/ANGLE/D3D11, 120 samples per scene at
  1280x720 low. Latest village/night/squall p95: 24.8/27.5/31.0 ms. Latest peaks: 448 calls and 185,864 triangles.
  The earlier run peaked at 451 calls and 186,584 triangles; timing variation is retained in the work log. These are **not**
  Iris Xe results and do not meet the 16.67 ms timing target. Fixed-scene ceilings are 550 calls/230,000 triangles.
- **Duel balance passes** ([report](../../tidewhisper-balance.json), `--check`: 0 of 18 checked rows outside target, both
  seeds, all heroes). The check follows `docs/wiki/game-design/balance.md`: each boss/mini-boss fight, and each hero's regular-roster
  median (2-6 s; measured 3.6-5.6 s). Single monsters are reported but not checked, as the contract allows armoured or
  evasive types to run longer: Shellback takes 4.5-7.7 s. Changes, with no targets loosened:
  - Old Ironclaw was luck-dependent: four early wedges let one ranger fight end in 41 s. It now falls for the wet
    sand once per shell (later charges skid to a stop until its next shell), and its base HP is 800 (was 1000).
    All fights: 156-174 s (target 90-180).
  - Mirelure's base HP is 3250 (was 3000), lifting the ranger from 171-176 s to 188-191 s. All fights: 188-289 s
    (target 180-300).
- The [initial strict balance baseline](../../tidewhisper-balance-baseline.json) is kept as history: 12/30 rows outside
  target, recorded before the melee-bot correction (the knight bot used 1.8 m reach and oscillated between shore and
  target, so its Jellybell times of 16.3/24.2 s were a bot defect, now 3.2/3.8 s).

| Candidate at 720p low | Candidate at 1080p low |
| --- | --- |
| ![Actual fourth-world pier and low-tide HUD](../../screenshots/world/tidewhisper-campaign-720.jpg) | ![Actual fourth-world pier at 1080p](../../screenshots/world/tidewhisper-campaign-1080.jpg) |

## Reproduce the candidate checks

Use the feature branch, Node matching the repository requirements, and a fresh browser profile (the helpers create
their own). These helpers own ports 8114/8115 and leave normal player browser saves alone.

```powershell
git fetch origin
git switch feat/todo-27h-campaign-release
git pull --ff-only
npm ci
npm install --no-save --no-package-lock puppeteer-core
npm test
npm run sim
node scripts/tidewhisper-campaign-smoke.mjs
node scripts/tidewhisper-balance.mjs --check
```

The balance reporter runs all three heroes on seeds 1 and 7 using the existing level-8, starting-equipment bots,
including approach/counter time and counted HP top-ups. Use `--output <path>` to preserve the historical report;
by default it saves `docs/tidewhisper-balance.json` and exits nonzero
with `--check` if any row misses its target. Investigate the bot's approach, reach and counter behavior alongside
damage tuning; a large timing spread is not solved by blindly scaling HP. Do not loosen the targets to publish.

## Run on the Acer reference machine

Run on AC with other heavy work closed, browser hardware acceleration enabled and the RTX 4050 active.
Default performance runs open visible fullscreen Edge. Hidden-browser (`--headless`) and GPU query
(`--gpu-timing`) profiles are separate diagnostics and cannot write release evidence.
The collector requests Chromium's high-performance GPU and verifies the actual WebGL renderer in all 18 rows.
It uses the existing desktop goal of 1920x1080 DPR1 High; earlier 720p Low reports remain separate diagnostics.
Commit candidate source changes first so the report identifies the exact code. `CHROME` can point to Chrome or Edge.

```powershell
$env:CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node scripts/tidewhisper-performance.mjs --release
```

The collector uses the actual fourth world, a 1920x1080 viewport, High preset, fixed village camera, daytime clear,
night clear and daytime squall. Each scene has 30 warmup frames and 120 measured frames, repeated for all three heroes on runtime seeds 1 and 7
(18 rows). World generation retains its authored seed. Light/tide phase is held fixed; real render time continues. It records the browser's
actual WebGL GPU string, candidate commit, working-tree state, p95 frame interval and peak full-composer counts.

The historical HD 4600 browser session paced frames at 60 Hz; `--disable-gpu-vsync --disable-frame-rate-limit`
did not change it there. Its empty-page Edge clock measured a p95 interval of 16.8 ms (median 16.7 ms), over a strict
16.67 ms. So the collector first measures that empty-page frame clock (240 frames) and records it as `frameClock`.
A scene passes if its p95 interval is no worse than max(16.67 ms, a valid empty-page p95). The clock only counts when
its median is a real 60 Hz (within 5% of 16.67 ms), so a 30 Hz display cannot loosen the budget. The content gate
applies the same rule (`frameLimitMs`). Per-frame CPU time of the game loop (`p95CpuMs`) and GPU time from timer
queries (`p95GpuMs`) are recorded as diagnostics only. They omit browser compositing and GC, and on the HD 4600
test machine they read up to 4 ms under the real interval, so they are never the pass number.

Default invocation (without `--release`) writes a diagnostic report only. `--release` writes
`docs/releases/tidewhisper.json` only if the candidate was clean, the actual renderer is the RTX 4050 Laptop GPU and all scenes meet
the frame/draw budgets. A JSON file copied from another device or synthetic test data is not certification.

## Finish 27h

This historical sequence preceded the approved 2026-10-19 gate split. Functional steps 1 and the candidate paths
in step 3 now pass on the cave-synchronized branch; the release-flag and public-release parts of steps 2-3 remain
gated by the failing hardware matrix. The stage can merge to `develop` under the approved functional scope while
`released: false` stays in place.

1. Done: duel timing bands pass on both seeds for all heroes, and the `pacing` audit now covers Tidewhisper's XP
   route, coin budget (new Tide forge fees, 280 coins) and two-day material yields (see `docs/wiki/game-design/balance.md`).
2. Obtain passing Acer RTX 4050 evidence for the final candidate. Re-measure after material rendering changes.
3. Enable the destination only after its full gate passes. Update release-dependent tests, title/portal/journal
   expectations, player-facing tour and affected screenshots. Recheck old v1 saves and the real travel/Continue path.
4. Run full unit/simulation suites and required browser checks on the synchronized stage branch. Do not merge or
   delete it while any required check fails. Merge the completed stage into `feat/todo-27`, then the completed
   parent into `develop`, using the task workflow in [AGENTS.md](../../../AGENTS.md).
5. Record actual session cost, groundwork corrections and the final go/no-go. Do not approve Duskhollow or start
   optional otter work from this incomplete checkpoint. Request the separate release confirmation required by
   [AGENTS.md](../../../AGENTS.md) only when the tested `develop` release is concrete and ready for `master`.

Work started at 2026-10-14 23:57 (machine clock); step/total durations and final check results are recorded in
[the 27h work log](../../logs/2610142357%20todo-27h-release-validation.md). Time waiting for external hardware is not
misrepresented as completed implementation or hardware-validation time.

## Recorded session cost and groundwork corrections

The following are measured totals already present in the work logs. Older missing totals are not reconstructed
from commit dates. Consequently, the whole TODO 27 cost cannot be stated as a complete measured total.

| Work | Recorded elapsed cost | Evidence/limitation |
| --- | --- | --- |
| 27a–27e | Unrecorded totals | Their historical logs have no measured TOTAL row; preserve the original entries. |
| 27f | 0h 28m | [Old Ironclaw log](../../logs/2610141537%20todo-27f-old-ironclaw.md) |
| 27g | 0h 51m | [Mirelure log](../../logs/2610141608%20todo-27g-mirelure.md) |
| Earlier 27h implementation/validation sessions | 2h 08m | Initial gate 29m, frame-clock work 41m, duels 18m, pacing 10m, October 17 synchronization/diagnostic 30m. Separate session totals, excluding external waiting. |
| Earlier related 27h research/advice/review | 0h 07m | Cloud research 3m, independent-work advice 1m, branch review 3m. |
| Current Acer validation checkpoint | 1h 16m | [Clock-based session log](../../logs/2610171924%20todo-27h-acer-validation.md), started 2026-10-17 19:24:42; its TOTAL records elapsed time through this incomplete checkpoint. |
| Controlled comparison and UI cleanup (step 1) | 0h 22m | [Clock-based step 1 log](../../logs/2610172143%20todo-27h-matrix-comparison.md); completed diagnostic/targeted cleanup, full 27h acceptance pending. |
| Full regressions and pause-menu correction (step 2) | 0h 38m | [Clock-based step 2 log](../../logs/2610172211%20todo-27h-step-2-regression.md); 243 units, 53 sims and 17 final browser checks pass; hardware acceptance remains pending. |
| Ordinary hardware acceptance attempt (step 3) | 0h 05m | [Clock-based step 3 log](../../logs/2610172307%20todo-27h-step-3-acceptance.md); completed the run and audit, acceptance failed (5/18 timing rows pass), milestone still open. |
| Step 3 profiling, render fixes and acceptance continuation | 1h 00m | [Clock-based continuation log](../../logs/2610172317%20todo-27h-step-3-optimization.md); includes both comparisons, collector race and fix, final 248-unit/six-sim/three-browser checks and three acceptance attempts. Final ordinary timing remains no-go. |

Groundwork corrections found during 27h include explicit forage/chest configuration, actual fourth-world save ids,
Mirelure clue/dive consistency, and the two-sided frame-clock guard. The Acer continuation also corrects carried
adventure state in performance rows, aligns the expansion fixture with 1080p High, verifies every hero/seed/scene,
and distinguishes visible-browser acceptance from hidden/instrumented diagnostics. Actor batching preserves authored
geometry, animation and gameplay rules. These integration/validation costs belong in the next world's estimate;
Duskhollow approval and a separate optional-otter estimate remain later decisions.

## Synchronized functional checks (2026-10-17)

Continuation uses `feat/todo-27h-campaign-release`, from the new `feat/todo-27` parent at current `develop`.
The published `ae543c0` checkpoint is preserved in the continuation history. Its sole README conflict retained
the current concise overview; detailed handoff material now lives here in the wiki.

- 239 unit tests and all 52 simulations pass. The clock-calibration guard was corrected to enforce both sides
  of the previously approved +/-5% median band; the final unit suite and affected content-gate simulation pass.
- Campaign, Ironclaw and Mirelure Edge browser checks pass real input, 720p/1080p rendering, saved progress and
  zero page/shader errors. Campaign replay includes portal travel, partial quest/node Continue, revisit,
  quest/tide gate, full completion and one crown after a full reload.
- The final two campaign captures were opened and reviewed; incidental pet/save prompts were removed, clear
  weather and afternoon staged, subjects visible, and viewport bounds pass. Unrelated encounter recaptures restored.
- The authored Tidewhisper object remains unreleased during the candidate fixture. The fixture substitutes a
  test-owned catalog entry with existing released fixture metadata and restores the original object afterward.

This is a checkpoint. Target-device certification, destination enablement, release-dependent saves/title/portal/
journal checks and the final affected screenshot tour still belong to completion of 27h. See the
[session log](../../logs/2610171721%20todo-27h-sync-and-acer-diagnostic.md) for measured timings and outcomes.

### Fresh two-seed balance

[October 17 report](../../tidewhisper-balance-20261017.json): clean commit `2c42fce`, all 36 rows present,
all 18 required checks pass. Roster medians 3.58-5.55 s, Ironclaw 155.4-174.1 s, Mirelure 187.8-286.6 s.
See [the six-profile before/after table](../game-design/balance.md#tidewhisper-27h-synchronization-2026-10-17).

### Acer UHD measurement and go/no-go

[Fresh hardware report](../../tidewhisper-performance-acer-20261017.json), clean `1860d90`: all three heroes,
seeds 1/7, 18 cases / 2,160 frames, actual Intel UHD A7A8, 720p Low (896x503 buffer). 37.5-44.6 FPS,
p95 26.4-32.8 ms; none meets the applicable fixed 16.67 ms budget. Empty-page median/p95 6.1/6.4 ms is near 165 Hz,
so it cannot provide the 60 Hz calibration allowance. Eight cases exceed 550 calls (peak 636); triangles fit
230,000 (peak 191,804), with zero page/shader errors. See [conditions and scene table](performance.md#acer-intel-uhd-tidewhisper-diagnostic-2026-10-17).

The Iris Xe hardware dependency was superseded by the owner's Acer decision later on October 17. Profile and
reduce draw-call peaks, then collect clean Acer RTX 4050 evidence at 1080p High. Do not raise the count ceilings
or enable the destination from the earlier UHD report.
The synchronized functional/balance checks pass; performance acceptance and release-dependent work remain open.

### Acer RTX 4050 reference baseline

[Controlled reference baseline](../../tidewhisper-performance-acer-rtx4050-before-20261017.json): actual RTX 4050,
1920x1080 High, all heroes/seeds/scenes, 2160 measured frames. 31.55-42.42 FPS, p95 28.0-37.6 ms, peak 1072 calls;
all timing/count cases fail. Each row reloads a fresh adventure and seeds play before setup. Test-only source
overrides replay the original model files from `b3074d5`; their paths and full commit are recorded in the JSON.
This replaces the earlier carried-state exploratory baseline. It has `dirty: true` because the collector/profile
edits were not committed yet, so it is not release evidence. A per-root draw probe found ranger
119 draws, three visible Shellbacks at 72 each, and scenery only 25. Rigid actor pieces are the first batching target.

The original-mode report above used a hidden browser and GPU queries. The matched visible-browser comparison uses
`docs/tidewhisper-performance-acer-rtx4050-headed-before-20261017.json`, with every changed runtime rendering file
replayed from `b3074d5`, plus the corrected collector/reference configuration. GPU queries are off in both final
comparison runs. A visible-browser performance artifact is still required before enabling the destination.

The first clean optimized run (`8a8e432`) is preserved as
[the loaded-host report](../../tidewhisper-performance-acer-rtx4050-loaded-after-20261017.json).
All 18 render-count rows pass (peak 474 calls and 209111 triangles), but only one timing row passes;
p95 spans 16.1–27.5 ms. Available RAM was approximately 1 GB with active paging during the run.
The owner is closing unused apps for a repeat. This report failed acceptance and produced no release artifact.

[The repeat after closing apps](../../tidewhisper-performance-acer-rtx4050-freed-memory-20261017.json)
started clean at `2e669a9` with 4.44 GiB free before browser launch. All 18 count rows pass (peak 483 calls,
210141 triangles). Average rates improve to 63.14–110.45 FPS, but p95 spans 13.8–23.0 ms and only six timing
rows pass. No release artifact was written. The unchanged rendering source and profile show that freeing memory
helped; it did not resolve the acceptance shortfall. A subsequent knight/squall CPU profile still found matrix
updates among the largest JavaScript costs, motivating a regression-tested skip for hidden actor render branches.
An initial 900-frame knight/squall probe after that change measured 84.11 FPS, p95 18.4 ms and CPU p95 12.0 ms.
The preceding CPU-instrumented probe measured 77.56 FPS, p95 21.3 ms and CPU p95 15.9 ms; instrumentation and
actor motion differ, so this is diagnostic evidence rather than a controlled optimization comparison.
The hidden-branch change has all 243 unit tests and the performance simulation passing; a complete simulation rerun,
browser/tour review and a clean full-matrix repeat remain pending. Keep it on the stage branch with no release artifact.

### Step 1: controlled render comparison

[Raw ABBA comparison](../../tidewhisper-matrix-comparison-20261017.json): `actorCulling.js` from `2e669a9`
versus `253f859`, visible Edge on the RTX 4050, 1080p High, both seeds and every hero. Each profile ran before,
after, after, before: 120 setup updates, then a fixed simulation pose for 120 warmup and 360 sampled real render
intervals. Every row asserts identical setup positions and the exact call/triangle sequence against its control.
All 24 rows / 8640 samples pass those controls and have zero page/shader errors. Values pool 720 frames per variant/profile.

| Hero / seed | Before p95 interval | After p95 interval | Before render CPU p95 | After render CPU p95 |
| --- | ---: | ---: | ---: | ---: |
| Witch / 1 | 12.7 ms | 16.3 ms | 9.7 ms | 11.4 ms |
| Knight / 1 | 13.4 ms | 12.2 ms | 10.8 ms | 9.4 ms |
| Ranger / 1 | 11.7 ms | 10.7 ms | 9.0 ms | 8.0 ms |
| Witch / 7 | 11.6 ms | 10.6 ms | 8.7 ms | 7.8 ms |
| Knight / 7 | 11.8 ms | 12.1 ms | 9.1 ms | 9.3 ms |
| Ranger / 7 | 10.7 ms | 9.4 ms | 8.7 ms | 7.3 ms |

Four profiles improve, two worsen. Repeat ranges and host load vary, including a clear Witch/1 slowdown, so these
results do not support a universal timing gain or a claim that frame pacing is solved. Retain the tested matrix skip
for the next full regression/reference run, with that uncertainty explicit. Fixed poses isolate rendering and exclude
active gameplay cost: none of these rows certifies release performance.

Earlier dynamic diagnostic attempts failed exact pose/draw equivalence and were discarded. Resetting the startup
clock fixed initial poses, but wall-clock audio callbacks consume the play RNG and actor motion still varied.
Even a test-only independent audio stream did not make every draw sequence identical. The final fixed-pose
comparison leaves production audio intact. No diagnostic alters the authored release flag.

Separate live knight/squall traces ([before](../../tidewhisper-frame-trace-before-20261017.json),
[after](../../tidewhisper-frame-trace-after-20261017.json)) motivated a UI cleanup: prompt/chip HTML is cached,
and edge markers use the applied numeric UI scale rather than computed-style reads among DOM writes.
The new regression sim fails against the old implementation (21 prompt replacements instead of one) and passes
with the fix. Timeline HTML parses fall from 1022 to zero. Layout counts remain approximately one per frame
(480 before, 483 after), and the instrumented after trace is slower overall (p95 18.4 versus 14.5 ms).
These live traces have differing motion/load and tracing overhead; no FPS gain is attributed to the UI cleanup.

Targeted UI simulation and the new Edge smoke cover unchanged DOM, live coins/key changes, hide/return, HUD scale,
real rebound keyboard interaction and bounds at 720p/1080p, with zero page/shader errors. The remaining sequence is:
full regressions; clean ordinary 18-case acceptance; destination enablement and production saves/travel/completion;
then tour/docs and stage/parent integration. Tidewhisper stays unreleased until the complete gate passes.

### Step 2: full regression checks

[Structured results](../../tidewhisper-step-2-regressions-20261017.json) retain every browser attempt, timestamps,
durations, output, script hashes and style provenance. The candidate game JavaScript is unchanged from `3be9e00`.

- `npm test`: 243 pass, zero failures/skips. Repeated after the check/layout corrections: 243 pass (7.1 seconds).
- `npm run sim`: all 53 pass, seed 1; 22:12:38-22:24:27 local clock. The terrain timing check ran without a browser,
  performance collector or screenshot job competing. Includes the new HUD check, all hero kits, rendering pivots,
  encounters/duels, saves/travel, coastal systems and the Tidewhisper campaign.
- All 17 browser regressions pass on their latest attempt: HUD performance; coastal enemies, wildlife, village and
  resources; Witch, Warrior and Ranger talents; Ironclaw; Mirelure; Tidewhisper campaign; portals; saves; sets;
  photo; lighting; tutorial. They run sequentially in Edge. Coverage includes real input, 720p/1080p bounds,
  reward/Continue behavior and zero page/shader errors. Software rendering costs are not hardware FPS evidence.

The tutorial script initially failed the main pause-page fit assertion at 720p. A diagnostic capture showed
`scrollHeight: 614`, `clientHeight: 611`; waiting for the opening animation did not fix it. The new main-page-only
viewport height allowance leaves at least 16 px above/below and preserves all actions. The existing strict fit
assertion stays intact. Tutorial and save reruns pass, including content fit at both resolutions; both corrected
save-menu captures were opened and reviewed. Three failed tutorial attempts remain in the report (22 total browser
attempts, 17 distinct scripts). Final successful runs use the current script versions.

Older save/portal/tutorial checks now catch shader console errors and close browsers with a bounded timeout.
Save defaults to Edge and checks 1080p as well as 720p. Simulation source did not change; the only product correction
in this session is scoped CSS, checked by the affected browser reruns. Incidental tracked captures were restored;
the final screenshot tour remains step 5.

Step 2 is complete. Remaining: **3**, clean ordinary 18-case 1080p High reference acceptance; **4**, enable the
destination only after acceptance and check production saves/travel/completion; **5**, final tour/docs and tested
stage/parent integration. No destination flag, merge or public release was performed here.

### Step 3: ordinary hardware acceptance attempt

[Raw report](../../tidewhisper-performance-acer-rtx4050-step-3-20261017.json), clean candidate `da96f77`, collected
on AC in visible Edge on the actual RTX 4050 Laptop GPU at 1920x1080 High/DPR1. Ordinary live gameplay/audio,
fresh adventure per row, 120 setup updates, 30 warmup and 120 real render intervals: 18 unique cases / 2160 samples.
No source overrides, fixed poses, GPU-query instrumentation or competing test/tour jobs were used.

The empty-page clock is 6.1 ms median / 6.3 ms p95 over 240 samples (~165 Hz); it cannot supply the 60 Hz allowance.
The unchanged limit is 16.67 ms. Five cases pass and thirteen fail:

| Hero / seed | Village p95 | Night p95 | Squall p95 |
| --- | ---: | ---: | ---: |
| Witch / 1 | 15.9 ms pass | 16.8 ms fail | 16.9 ms fail |
| Knight / 1 | 18.3 ms fail | 19.0 ms fail | 18.5 ms fail |
| Ranger / 1 | 18.5 ms fail | 17.1 ms fail | 13.9 ms pass |
| Witch / 7 | 14.0 ms pass | 13.8 ms pass | 17.3 ms fail |
| Knight / 7 | 15.2 ms pass | 17.0 ms fail | 18.5 ms fail |
| Ranger / 7 | 17.4 ms fail | 18.8 ms fail | 20.7 ms fail |

Average rates span 76.02-102.24 FPS; that does not satisfy the separate p95 rule. All count rows pass: 329-479
calls and 198667-210017 triangles, below 550/230000. CPU p95 spans 8.3-14.3 ms; this diagnostic omits browser
work and is not a substitute for actual frame intervals. Every row verifies the actual adapter, true buffer,
quality, active simulation and visible document; there are zero page/shader errors.

The host had 2096-2108 MiB available before launch, with zero pages input in the two pre-run samples and
30-39% total CPU use. Reported free memory immediately before browser launch is 2.00 GiB. These snapshots do
not identify the cause of the timing failures. The earlier freed-memory attempt and fixed-pose comparison have
different motion/load; no controlled optimization gain is inferred from their averages.

`--release` exited with the frame-time acceptance assertion and no `docs/releases/tidewhisper.json` was written.
No target, density, preset, release flag or runtime source was changed. Step 3 remains open: profile failing live
scenes (starting with Ranger/7 squall), distinguish update/render/browser stalls, make evidence-backed fixes and
rerun affected regressions plus clean normal acceptance. Step 4 enablement and step 5 tour/docs/integration wait
for a full pass. The test run is finished; the acceptance milestone is not complete.

### Step 3 continuation: immutable traversal and collector cleanup

The [live Ranger/7 squall profile](../../tidewhisper-live-profile-20261017.json) samples scene projection,
world-matrix work and draw submission among the remaining costs. Global blob-shadow instancing was rejected:
water shares its transparent render order, so combining shadows could change coastal blending.

The existing immutable-branch helper now skips clean descendant matrix walks. Moving parents still force fresh
world matrices; animation pivots and explicit world queries keep their previous behavior. Local transforms and
child lists must stay immutable below this helper. Unit coverage demonstrates the original 21 descendant walks
becoming one, and checks moving parents, repeated freezing and world queries. Simulation coverage checks real
scenery/grass on the three released planets.

The [24-row render-only comparison](../../tidewhisper-static-comparison-20261017.json) preserves exact poses and
per-frame draw sequences for both seeds/all heroes. Pooled p95 before/after milliseconds:

| Hero / seed | Before | After |
| --- | ---: | ---: |
| Witch / 1 | 12.7 | 13.6 |
| Knight / 1 | 11.5 | 13.3 |
| Ranger / 1 | 13.8 | 14.7 |
| Witch / 7 | 14.3 | 14.2 |
| Knight / 7 | 11.7 | 11.5 |
| Ranger / 7 | 11.1 | 12.0 |

Timing is mixed, and the owner closed unused apps during the comparison; no overall frame-rate gain is claimed.
The result supports pose/draw preservation and the unit checks prove the removed work. These paused diagnostic
rows cannot certify release performance.

The collector waits for loss of each previous WebGL context, then disposes before reloading, outside setup/warmup
and all measured frames, and records memory before each row. This avoids relying on browser garbage collection
for discarded GPU allocations. Memory variation alone does not establish that retained contexts caused failures.
The target, actual GPU/profile checks, ordinary live simulation and all timing/count rules remain unchanged.

The [affected regression record](../../tidewhisper-step-3-regressions-20261017.json) is separate from the earlier
complete step 2 suites. The new browser check uses keyboard movement and compares matrices/raw canvas pixels
before and after forcing visible immutable branches on all four planets at 720p/1080p. Dormant objects are
excluded from forcing because the baseline intentionally leaves some poses stale. Raw canvas capture excludes
animated DOM overlays. Integration still requires the complete suites on the synchronized final candidate.

The first recheck of clean `67888f9` is [invalid](../../tidewhisper-step-3-invalid-cleanup-attempt-20261017.json):
disposing before asynchronous context loss raced the old animation loop and produced repeated null-program
page errors. All 18 rows ran, but the old error assertion preceded report persistence. The linked file is an
explicitly rounded console summary, not reconstructed raw evidence or certification. The collector now waits for
the loss event with a bounded timeout before disposal, and writes complete matrices before error assertions.
The browser regression exercises captured and initial title contexts with live animation frames afterward.

### Step 3 continuation: conservative view-frustum gates

The corrected clean `65f6a00` [ordinary recheck](../../tidewhisper-performance-acer-rtx4050-step-3-final-20261017.json)
completed all 18 cases with zero page/shader errors, but only five timing passes (p95 15.0-24.2 ms). It preserved
all render-count budgets and correctly wrote no release evidence. That result prompted a second render change.

Actor gates now derive a conservative envelope from geometry spheres and current local translations/scales,
independent of rotations. Only immutable branches cache extents. No authored size guesses or distance reductions
are used; hidden effects stay included and unsupported/unbounded or nested rigs keep the old path. Local animation,
AI, collisions, populations and actor-owned visibility continue unchanged. On return, the existing gate refreshes
the complete current pose. Unit properties and a negative simulation control cover this behavior.

The [paired diagnostic](../../tidewhisper-frustum-comparison-20261017.json) uses 24 ABBA rows/8640 render samples,
both seeds and all heroes, matching setup poses and every sampled draw/triangle pair exactly. Pooled p95:

| Hero / seed | Before interval | After interval | Before render callback | After render callback |
| --- | ---: | ---: | ---: | ---: |
| witch / 1 | 16.5 ms | 11.9 ms | 13.4 ms | 9.4 ms |
| knight / 1 | 14.2 ms | 12.9 ms | 12.1 ms | 10.9 ms |
| ranger / 1 | 14.1 ms | 12.0 ms | 11.6 ms | 9.9 ms |
| witch / 7 | 13.9 ms | 13.3 ms | 11.7 ms | 11.0 ms |
| knight / 7 | 14.0 ms | 12.1 ms | 11.6 ms | 10.0 ms |
| ranger / 7 | 15.1 ms | 12.7 ms | 12.7 ms | 10.2 ms |

All six pooled profiles improve in this diagnostic. Host scheduling/load is not experimentally controlled, and
simulation is paused, so these numbers cannot certify release or replace the ordinary live 18-case matrix.
The four-world browser check also restores distance-only gates after movement and requires identical raw canvas
pixels at 720p/1080p; it restored 7-13 completely off-screen branches per fixture with no pixel change.

### Step 3: live recheck after frustum gating

[Complete raw report](../../tidewhisper-performance-acer-rtx4050-step-3-frustum-20261018.json), clean `c3375f0`,
actual RTX 4050 in visible Edge, High 1920x1080/DPR1, all heroes and seeds 1/7, all three scenes: 18 rows/2160 real
render samples with ordinary live simulation/audio. No source overrides, paused poses or GPU-query instrumentation.
Zero page/shader errors; every row verifies the renderer, drawing buffer, preset, started/unpaused/visible state.
The 240-sample empty-page clock remains 6.1 ms median/6.3 ms p95, so the unchanged 16.67 ms limit applies.

| Hero / seed | Village p95 | Night p95 | Squall p95 |
| --- | ---: | ---: | ---: |
| witch / 1 | 22.6 ms fail | 18.6 ms fail | 18.6 ms fail |
| knight / 1 | 20.0 ms fail | 22.7 ms fail | 19.5 ms fail |
| ranger / 1 | 17.5 ms fail | 18.7 ms fail | 15.6 ms pass |
| witch / 7 | 14.4 ms pass | 14.6 ms pass | 23.6 ms fail |
| knight / 7 | 14.5 ms pass | 17.6 ms fail | 16.1 ms pass |
| ranger / 7 | 18.5 ms fail | 20.6 ms fail | 19.7 ms fail |

Five timing cases pass and thirteen fail. Actual average FPS spans 59.41-80.85; p95 spans 14.4-23.6 ms, and
callback p95 spans 11.4-18.6 ms. All 18 count budgets pass: 329-474 calls and 198669-209113 triangles, below the
unchanged 550/230000 ceilings. The collector exits 1 for frame-time acceptance, saves its raw report and writes
no `docs/releases/tidewhisper.json`. The authored release flag remains false.

Before launch, available memory was 3797-3808 MiB, CPU 16-18%, and pages input 19-21/sec in two snapshots.
Memory recorded before individual rows ranged from about 325 to 3303 MiB. That large host variation is retained;
it does not establish that browser context retention or memory pressure caused the timing failures. Counts pass
and the paired render-only comparison improves, but neither substitutes for passing ordinary live frame times.

[Final affected regressions](../../tidewhisper-step-3-frustum-regressions-20261018.json) pass 248 units, six simulations
and three Edge browser scripts, with negative controls and pixel equivalence recorded above. The latest Tidewhisper
720p/1080p captures were reopened: the hero and village remain readable, without clipped subjects or rendering defects.
The old full step 2 results are historical; complete suites/tour still precede integration.

**Step 3 remains open.** Next, isolate live update/render and host-memory stalls under steady conditions, then
make measured fixes and repeat the complete clean acceptance matrix. Do not cherry-pick passing rows, freeze the
acceptance simulation, loosen the target or treat the paused comparison as certification. Remaining afterward:
**4**, enable the destination and verify production travel/saves/completion; **5**, final tour/docs, complete
synchronized integration checks and stage/parent merges. No stage merge, deletion, destination enablement or public
release is performed by this checkpoint.

### Step 3 finding: the reference display's refresh rate and the frame-interval gate (2026-10-19)

Desk analysis of the existing raw reports, performed on a non-reference machine. No measurement, code change or
acceptance run was made for this section; every number below is read from the step 3 reports already recorded above.

**Evidence.** The acceptance gate is `p95FrameMs`, the real interval between rendered frames, compared against
`frameLimitMs(16.67, frameClock)`. That helper only lets the measured empty-page clock raise the limit when the
clock is a genuine 60 Hz one (median within 5% of 16.67 ms); otherwise the fixed 16.67 ms applies. On the Acer the
240-sample empty-page clock measured **6.1 ms median / 6.3 ms p95**, far outside the 5% calibration window, so every
step 3 run was judged against the fixed 16.67 ms.

**Hypothesis.** A 6.1 ms empty-page interval is a display refreshing at about **164 Hz** (1000 / 6.1). Acer Nitro
ANV15-51 panels are commonly 144 Hz or 165 Hz, and 165 Hz is 6.06 ms. The rule's own comment records that it was
written against a 60 Hz host, where "even an empty page measures ~16.7 ms"; the high-refresh fallback keeps the
fixed limit but was never checked against what that limit means on a high-refresh panel.

**Consequence, if the hypothesis holds.** `requestAnimationFrame` delivers frames on refresh boundaries, so on a
165 Hz display the only intervals available are about 6.06, 12.12, 18.18 and 24.24 ms. For `p95FrameMs` to land at
or below 16.67 ms, 95% of frames must arrive within 12.12 ms, which is a sustained **82.5 FPS**. A game pacing
perfectly at 60 FPS would report intervals of 18.18 ms and **fail the gate by definition**. The nominal
"60 FPS at 1080p High" target is therefore being enforced on this machine as roughly "82 FPS for 95% of frames",
about 37% stricter than intended, as an artifact of the validation display rather than of the game.

The recorded data is consistent with this model without proving it: average FPS across the two clean runs spans
59.41-102.24, which is what a mix of 6.06 / 12.12 / 18.18 ms intervals produces, and the observed p95 values
cluster near 12-16 ms (passing rows) and 18-24 ms (failing rows) rather than spreading evenly.

**This is a hypothesis, not a result.** It is consistent with the recorded numbers and with the helper's own
documented assumption, and it has not been confirmed on the hardware. Confirm it before acting on it.

**Verify first, on the Acer, before any other 27h work:**

1. Read the panel's actual refresh rate (Windows display settings, and `screen.refreshRate` or the collector's own
   `frameClock` median in a browser console). Record the value with the monitor/mode in use.
2. If it is not 60 Hz, note whether the game tab is vsync-paced at that rate.

**Remedies, if the panel is high-refresh.** Preferred first, and none of them relaxes the 60 FPS goal:

| Option | What it does | Cost | Effect on the rule |
| --- | --- | ---: | --- |
| **Set the display to 60 Hz for acceptance runs** | Makes the measurement context the one the rule was written for; the empty-page clock then calibrates and `max(16.67, clock p95)` applies as designed | None, a display setting | No rule change at all |
| Make the limit refresh-aware | Pass when p95 is no worse than the first refresh boundary at or above 16.67 ms (18.18 ms at 165 Hz) | Small change to `frameLimitMs` | Changes the helper; preserves the 60 FPS intent exactly |
| Gate on `p95CpuMs` instead | Measures the game loop only | Small | Rejected: the collector documents that CPU time omits browser compositing and GC and reads up to 4 ms under the real interval, so it must never be the pass number |

The first option is recommended because it needs no code and no rule change: it simply measures 60 FPS on a 60 Hz
display, which is what the acceptance text already says.

**This supersedes the 60 FPS frame-cap idea.** Capping the game at 60 FPS while measuring on a 165 Hz panel would
force every interval to 18.18 ms and make the gate fail harder. Do not add a cap before the refresh rate is
confirmed and the measurement context is settled.

### Acer session runbook (queued, 2026-10-19)

Run in this order. Steps 1-2 are free and may remove the shortfall without changing anything.

1. **Confirm the refresh rate** as above, and record it in this page.
2. **Quiet-host acceptance rerun.** The two clean step 3 runs were taken with only about 3797-3808 MiB of 16 GB
   available and per-row memory swinging between about 325 and 3303 MiB; between them average FPS moved from
   76.02-102.24 down to 59.41-80.85 *after* two optimizations landed, so host noise currently exceeds the signal.
   Before rerunning: close other applications, run no git or file activity during the run, stay on AC with the
   high-performance power plan, confirm the RTX 4050 is the active renderer, and use a clean committed candidate.
   Then `node scripts/tidewhisper-performance.mjs --release` for the full 18 cases.
3. **If it passes:** continue with the existing [Finish 27h](#finish-27h) steps 3-5.
4. **If it still fails:** record the matrix as another no-go, then decide between the remedy table above and the
   gate split below. Do not cherry-pick passing rows, freeze the acceptance simulation, relabel a diagnostic as
   certification or loosen the 60 FPS target.
5. **Screenshot tour and final visual review** belong in this same session, on the reference machine.

**Agreed fallback: split the gate.** The owner approved, on 2026-10-19, separating 27h's functional completion
(content gate, three-hero pacing, travel/Continue, tour, docs) from its performance certification, so that
performance gates only the public `master` release and not the roadmap items that depend on 27h (28, 29g, 30).
This loosens no target. The roadmap restructure is not yet written into `TODO.md`; it is recorded here first.

**Work that can be done away from the reference machine:** everything except the acceptance matrix itself and the
final visual review, namely algorithmic optimization proven by deterministic simulations, the full unit/simulation
suites, the functional browser checks, the three-hero pacing pass, the production-path verification behind the
release flag, and all documentation. Measurements taken elsewhere are diagnostics and never certification.

### Acer refresh verification (2026-10-19)

The actual primary 1920 × 1080 display mode was **165 Hz** (Windows display mode API; Intel UHD is the panel's
connected adapter). A visible Edge session with `--force-high-performance-gpu` reported the active WebGL renderer as
**ANGLE / NVIDIA GeForce RTX 4050 Laptop GPU / D3D11**. Its 240-frame empty-page clock measured **6.1 ms median,
6.3 ms p95**, confirming the earlier refresh-rate hypothesis. The acceptance rule on that mode requires p95 intervals
within 16.67 ms even though the next 165 Hz refresh boundary is 18.18 ms.

The same 1920 × 1080 panel was temporarily switched to its supported **60 Hz** mode without changing game code or
the gate. A second visible Edge session still used the RTX 4050 and measured **16.7 ms median, 16.9 ms p95** over
240 empty-page frames. This is the calibrated display mode for the next clean acceptance matrix. The original
165 Hz mode will be restored after that run.

### Synchronized 60 Hz acceptance matrix (2026-10-19)

The clean candidate `92d02e2` includes the 29a-29f cave merge and the cave render regression. On the Acer, connected
to AC with the Acer power plan and other editor windows closed, visible Edge used the RTX 4050 at 1920 × 1080 DPR1
High. The empty-page clock was 16.7 ms median / 16.8 ms p95, so the unchanged frame limit was **16.80 ms**.
All 18 hero/seed/scene rows completed with zero page or shader errors, no paused/hidden samples and no GPU timer
instrumentation. Every frame p95 was **17.4–18.2 ms**; thus **0/18 timing rows passed**. Average cadence was
59.04–60.03 FPS. All 18 render-count rows passed, peaking at 474/550 calls and 209,113/230,000 triangles.
The complete [matrix](../../tidewhisper-performance.json) is a **no-go**, and no `docs/releases/tidewhisper.json`
certification was written. The original 165 Hz display mode was restored afterward. This removes the high-refresh
measurement defect from the comparison, but the strict p95 interval gate still fails. The approved functional versus
public-release performance split now applies; Tidewhisper stays unreleased.

### Functional completion and next-work verdict (2026-10-19)

The cave-synchronized candidate passes its non-performance content readiness checks: the readiness test reports
only missing release performance evidence. [Fresh balance](../../tidewhisper-balance-20261019.json) passes all 18
checked roster/duel bands on all three heroes and seeds 1/7, with the same values as October 17; the full pacing
audit still reaches level 8, funds one Tide set from 281–360 coins, and yields lighthouse materials within one day
and lighthouse plus gear materials within two. The campaign browser check passed portal travel, partial save and
Continue, return, the low-tide/quest gate, completion and one crown after reload through the test-only fourth-world
candidate at 720p and 1080p. **275/275 units, 58/58 simulations and 25 relevant Edge browser scripts pass.** The
cave browser regression proves identical world matrices and pixels after forced traversal and after restoring a
genuinely culled cave enemy branch. The tour completed in Edge with `errors: none`; the boss frames were restaged
after visual review, and incidental unrelated recaptures were restored.

**Go for functional integration to `develop`; no-go for Tidewhisper destination enablement or a `master` release.**
The release flag stays false. Duskhollow's 30a can start from integrated `develop` because its 27h, 28a-28e and
29a functional prerequisites are satisfied. 29g still waits on 30i. No optional pet was added in 27h.

**Otter priority update (2026-10-20):** the owner placed the pearl-diving otter in TODO 27i, the first pending
Tidewhisper stage, with a separate 3-5 h estimate. It can be developed with the unreleased world fixture. Its public
unlock requires a fresh, passing Acer release matrix including the otter; the present 0/18 timing result provides no
headroom. Stage 27i does not block the already integrated 27h functional gate, 29g or Duskhollow work.

TODO 26 supplied the catalog, mechanic lifecycle and save infrastructure needed to build a fourth world, but it
did not prove a complete real fourth-world campaign path: 27h found missing explicit forage/chest fields, save ids
and borrowed Act I fixture metadata that could mask fourth-world gaps. It also left release validation coupled to
hardware and frame-clock assumptions that had not been checked on the named display. 27h had to add the true-id
content/Continue path, the full hero/seed matrix and frame-clock calibration, then repeat them after the cave merge.
For Duskhollow, reserve explicit time for these integrations and for a fresh hardware audit after later branches land.

The 27 checklist was **too large for one acceptance session**. Eight implementation stages were appropriate, but
27h's 1–3.5 h estimate still bundled functional integration, full regression/tour work and uncertain reference
performance certification. The approved split makes those two outcomes independently reviewable without relaxing
the public 60 FPS rule. Recorded earlier 27h sessions total at least **5h 48m** before this session; the current
session's machine-clock duration is in [its work log](../../logs/2610191920%20todo-27h-synchronized-acceptance.md).
Stages 27a–27e have no measured TOTAL entries, so a whole-TODO actual cost cannot be claimed.
