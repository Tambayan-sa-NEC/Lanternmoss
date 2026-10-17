# Performance budget

Tidewhisper 27h is currently a development candidate, with separate
[diagnostic results](../../tidewhisper-performance.json) and a [release handoff](tidewhisper-release.md).
Its real fourth-world village/night/squall collector uses visible fullscreen Edge, 1920x1080 High at DPR 1,
30 warmup frames and 120 samples per scene, with a fresh adventure for each row.
It passes a scene against max(16.67 ms, the p95 of a valid empty-page 60 Hz clock measured in the same run).
Calibration requires a median within 5% of the target; faster or slower display clocks retain the fixed 16.67 ms limit.
Historical Intel UHD results do not certify the current reference. Run `node scripts/tidewhisper-performance.mjs`
for diagnostics; `--release` requires a clean candidate, a visible browser, an actual RTX 4050 Laptop GPU renderer and passing frame/draw budgets
before it writes a release evidence file. Tidewhisper remains unreleased.

The [latest ordinary reference attempt](tidewhisper-release.md#step-3-live-recheck-after-frustum-gating),
clean `c3375f0`, passes all 18 count budgets but only 5/18 timing cases (p95 14.4-23.6 ms). Acceptance remains a no-go;
the raw matrix is retained and no release artifact was written.

The owner selected the **Acer Nitro ANV15-51, Core i5-13420H, 16 GB RAM, NVIDIA RTX 4050 Laptop GPU** as the default
desktop validation machine on 2026-10-17. The target remains **60 FPS at a 1920 × 1080 viewport**, DPR 1, default
High preset: 16.67 ms per frame. Run on AC with Edge, request the high-performance GPU, and verify the actual WebGL
renderer in every row. The old Iris Xe requirement is superseded because access to that device is uncertain.
This is a desktop hardware reference, not a minimum requirement enforced by the game. Additional machines remain
useful for functional/compatibility tests; their measured limits are reported separately. Integrated graphics and
mid-range phones have no certified frame-rate claim from the RTX 4050 results; mobile remains TODO 40.

Hidden and visible browser measurements differ materially on this host: a matched knight/squall probe submitted 473 calls in
both modes, but measured 51.75 FPS / p95 24.3 ms hidden and 99.32 FPS / p95 16.3 ms visible. The default desktop
validation therefore uses the visible player browser; `--headless` remains a diagnostic option. Optional
`--gpu-timing` adds GPU query/readback instrumentation and also cannot write release evidence. Its on/off probe
did not establish that queries caused the original shortfall (timers off: p95 25.1 ms; on: 20.0 ms), so no timing
gain is attributed to disabling them. Both mode and instrumentation are recorded, and compared runs must match.

## Development and validation machines

Recommended machine roles, recorded at the owner's request on 2026-10-17:

| Machine | Recommended use |
| --- | --- |
| Acer Nitro ANV15-51, Core i5-13420H, 16 GB RAM, Intel UHD and RTX 4050 Laptop GPU (inventory recorded October 17) | Default development and validation machine: coding, complete unit/simulation suites, browser/visual checks and desktop acceptance on the actual RTX 4050 at 1080p High. Its Intel UHD can also supply integrated-graphics diagnostics. |
| Lenovo 81MU, Core i3-8145U, Intel UHD Graphics 620, approximately 4 GB RAM | Additional functional/compatibility checks and controlled low-end performance diagnostics. Record the actual adapter and memory pressure with results. |
| Other available machines, including Iris Xe if available | Additional hardware/browser coverage; an Iris Xe run is optional and no longer blocks 27h. |

The Acer's RTX 4050 profile replaces the named validation hardware only. Existing frame-clock rules and render-count
ceilings remain in force. Tidewhisper stays unreleased until this profile and the remaining 27h gates pass.

Earlier on 2026-10-17 the owner reported that the Iris Xe laptop was at a repair shop, with the next possible test estimated
8–9 days later (approximately October 25–26). This is an availability estimate, not a guaranteed repair/test date.
That historical estimate is superseded as a release dependency by the owner's Acer decision. If tested later,
measure the synchronized candidate and record the actual hardware; it supplies additional coverage.
The [UHD 620 diagnostic](#uhd-620-laptop-diagnostic-2026-10-17) records the evidence behind the secondary-machine recommendation.

## Measuring the game

Press **F3** during play or enable Settings → Graphics → **Performance overlay**. F3 can be rebound, and works while
paused unless a key binding is being captured. The overlay shows rolling mean FPS/frame time, p95 frame time, mean
render CPU duration and peak draw calls, triangles, points and lines over 120 frames. It refreshes four times a second.
Hidden-tab gaps reset the sample window. Timing uses real render timestamps, so pause, hit-stop and the simulation's
1/30-second clamp cannot inflate the FPS reading. Render CPU duration is not a GPU timer.

`renderer.info.autoReset` is disabled and counts reset once before each complete composer render. This includes
bloom, paper and output passes; the default per-pass reset would otherwise report only the last pass's fullscreen
triangles. The Node simulation renderer is a stub and cannot supply WebGL measurements.

## Reproducing the browser check

Use Node 18+, install the repository dependencies, and install the optional browser driver without changing the lockfile:

```powershell
npm install
npm install --no-save --no-package-lock puppeteer-core
$env:CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node scripts/performance.mjs
```

`CHROME` can point to Chrome instead. The script uses a fresh headless profile and its own server on port 8095.
It does not force software rendering; inspect the reported GPU before comparing frame rates. Internet access is
needed for the game's existing Three.js/font CDN imports. Run without other heavy tasks for useful timing.

Each planet uses its village spawn, the witch, a passive pet, night at 88% of the day and the heaviest particle weather
in its configured mix (storm, embers, blizzard). The camera uses pitch 0.38 and distance 8.5. Viewport is 1920 × 1080,
DPR 1, bloom enabled. High and Medium render at 1920 × 1080 on this display; Low renders at 1344 × 756. After 30
warmup frames, collect 90 frames per planet/preset. Record mean cadence, p95 frame time and peak counts. NPC movement
and weather animation can produce small variations, so count ceilings include headroom.

The checked-in [original baseline](../../performance-baseline.json) was captured before optimization, using `--baseline
--quick` (12 warmup/20 measured frames, High only). [Current results](../../performance-results.json) record all three
presets. `--quick` is useful for iteration; full sampling is used for final verification. Timing from short samples is
indicative. Neither result is a universal worst case for every combat encounter or camera bearing.

The script fails if any preset exceeds its planet's calls/triangle ceiling, then verifies the live overlay, F3 while
paused and all five density controls, and captures [the overlay](../../screenshots/huds/performance.jpg) and
[Graphics settings](../../screenshots/huds/performance-settings.jpg). Commit refreshed JSON alongside intentional render changes
so count regressions can be reviewed in a diff. FPS is recorded rather than a portable CI pass/fail assertion.

## Measurements and ceilings

Original High peaks before optimization:

| Planet / weather | Draw calls | Triangles | Mean FPS (short baseline) |
| --- | ---: | ---: | ---: |
| Lanternmoss / storm | 1,281 | 583,920 | 18.9 |
| Emberfall / embers | 1,119 | 480,784 | 21.9 |
| Frostveil / blizzard | 1,130 | 490,210 | 18.7 |

Full measurements on 2026-10-10 (Edge 154, Intel UHD/ANGLE/D3D11, 90 samples per row):

| Planet | Preset | Peak calls | Peak triangles | Mean FPS | Mean frame ms | p95 frame ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Lanternmoss | High | 925 | 269,528 | 19.4 | 51.5 | 63.0 |
| Lanternmoss | Medium | 857 | 250,444 | 17.8 | 56.3 | 67.5 |
| Lanternmoss | Low | 667 | 234,052 | 25.9 | 38.6 | 46.8 |
| Emberfall | High | 782 | 235,451 | 18.3 | 54.6 | 61.9 |
| Emberfall | Medium | 682 | 215,087 | 21.5 | 46.6 | 57.7 |
| Emberfall | Low | 565 | 199,612 | 25.6 | 39.0 | 49.0 |
| Frostveil | High | 657 | 240,006 | 18.2 | 54.9 | 66.0 |
| Frostveil | Medium | 649 | 223,851 | 21.4 | 46.6 | 59.4 |
| Frostveil | Low | 639 | 210,571 | 29.3 | 34.1 | 45.0 |

High draw calls fall by 28–42% and triangles by 49–54% versus the original short baseline. Frame time remains well
above the target. Timing varies with driver scheduling, warmup and machine load; fewer submitted primitives do not
guarantee a proportional FPS increase. Exact values, particle counts, drawing buffers and GPU strings are in
`performance-results.json`. The fixture's regression ceilings, enforced by
`PERFORMANCE_BUDGET` in `src/config/render.js`, are:

| Planet | Maximum draw calls | Maximum triangles |
| --- | ---: | ---: |
| Lanternmoss | 1,050 | 310,000 |
| Emberfall | 900 | 280,000 |
| Frostveil | 850 | 280,000 |

## Density and measured optimizations

Sliders multiply the selected quality preset; 100% means the preset's full density. Changes apply live without
regenerating a planet. Settings remain device-local and are not included in adventure saves.

| Feature | High | Medium | Low | Effect |
| --- | ---: | ---: | ---: | --- |
| Scenery | 100% | 65% | 35% | Fewer pond decorations, flowers and mushrooms; keep trees, rocks and buildings |
| Grass | 100% | 65% | 30% | Fewer tuft, tall-grass and wildflower instances; reduce distant grass range |
| Resource detail | 100% | 65% | 30% | Reduce visible distant nodes; all nodes within 18 m remain drawn even at 0% |
| Particles | 100% | 65% | 35% | Smaller sparkle pool, fewer emitted sparkles and fireflies |
| Weather | 100% | 65% | 35% | Submit fewer rain streaks, snowflakes, embers and petals |

Scenery is batched into 48 m spatial cells instead of one planet-wide bounding sphere. Cosmetic draw ranges stop at
complete primitives and pair their outlines with the same deterministic rank. Grass uses 24 m instance cells, full
bounds padded for wind sway and density-independent bounds. These changes substantially reduce submitted triangles.
Resource bodies and fruit are merged separately into toon/glow/outline meshes, preserving depletion and regrowth.
Static crafting-station parts, farm fences, weeds and crop stages are similarly batched; animated station glows stay
separate. Distant actor render gates use 65/50/38 m camera distance for High/Medium/Low, with a 24 m player safety range.
They preserve actor root visibility, animation references, AI and collisions.
Hidden actor render branches also skip descendant world-matrix traversal. Local poses keep advancing;
the first visible traversal refreshes the complete pose, while explicit world-position queries still update normally.
For direct-scene rigs, a conservative view-frustum envelope also rejects completely off-screen branches. Its
radius derives from full geometry spheres, child translation lengths and largest absolute scales; rotations
cannot increase that bound. Current animated translations/scales are read before each cull, hidden effects stay
included, and only immutable decoration caches its radius. Instanced objects use their complete object sphere.
Deliberately unbounded, skinned/morph and nested rigs keep the safe old path. The camera and distance/player-safety
rules remain intact; this skips matrix/projection walks for geometry that could not contribute a pixel.
Unit properties exercise rotated/scaled/hidden poses and instances. Runtime assertions check behind-camera
rejection, expanding animation and camera-turn restoration. Browser checks compare raw pixels with the previous
distance-only gates restored, including 7-13 off-screen branches in the four-world movement fixtures.

`batchRigidParts` in `render/staticParts.js` merges rigid decorations between explicitly named animation pivots.
Hero rigs, coastal regular enemies/wildlife, NPC bodies/outfits and treasure chests use it. Animated pincer joints,
weapons, hair/capes, opening lids, hidden effects and mutable/transparent materials retain their own objects.
The unit test compares transformed geometry and HDR colours before/after moving a joint; the performance
simulation asserts reduced model submissions and connected animation references. Gameplay counts and AI stay intact.
The origin scene, baked terrain/scenery/grass and new rigid decoration retain their local matrices instead of
recomposing them every frame. Dynamic parents still propagate their world transforms; animated roots/pivots remain
live. This follows a CPU profile whose largest sampled JavaScript cost was matrix updates.
An immutable branch also skips descendant matrix walks when its own world matrix and its parent's transform are
unchanged. `freezeStaticTransforms` is for complete branches with fixed local transforms, geometry bounds and child lists; do not
attach animated descendants afterward. A forced parent update still refreshes the branch, and explicit world
queries keep Three's normal behavior. The unit regression checks clean-walk skipping, moving parents and queries;
the performance simulation checks real scenery/grass on every released planet. The static-transform browser
check compares matrices and canvas pixels with a forced full traversal after keyboard movement at both resolutions.

Prompt and status-chip HTML is replaced only when its contents change, following the existing tutorial/pet HUD
cache pattern. Positioning and the chip polling cadence remain live. Edge markers use the numeric `--ui` value
last applied by HUD settings/resize instead of reading computed styles between marker writes.

Generation consumes the same seeded world stream at every density. Resource IDs, placement and collider counts stay
fixed. Sparkle emission consumes the original random draws even for omitted particles, preserving combat and loot
randomness. Simulation checks exercise all planets, regrowth, density restoration, particle randomness and actor
transform/visibility ownership. The boss simulation bot uses a separate stream so Three.js UUID counts cannot change
its steering when models are optimized.

The remaining 60 FPS work is measurable: animated multi-part actors and near-field props still contribute many calls,
while bloom, MSAA and full-resolution post-processing cost fill rate. Validate on the actual Acer RTX 4050 before
claiming the default-quality target; these count ceilings are a regression guard, not a substitute for that validation.

## UHD 620 laptop diagnostic (2026-10-17)

[Separate diagnostic report](../../performance-uhd620-720p.json), recorded from game source `b188aa4`:
Lenovo 81MU, Core i3-8145U (2 cores / 4 threads), approximately 4 GB RAM, Windows 11 and Edge 154 headless.
The active WebGL renderer is Intel UHD Graphics 620 through ANGLE/D3D11, with no software-rendering launch flags.
The laptop was connected to AC on the Balanced power plan. Windows reported only about 375–535 MB available RAM
and, during the pilot, 6,093 pages input per second. Other applications were left open; memory pressure limits what
these results say about an otherwise idle laptop.

The temporary collector followed `scripts/performance.mjs`, on its own port 8124, with a 1280 × 720 viewport,
DPR 1, the unchanged Low preset and bloom enabled. The actual drawing buffer was 896 × 503. It measured day/clear,
night/clear and night/heaviest configured particle weather at village spawn, with a fixed camera, day phase and a
passive pet. Each row has 30 real warmup frames followed by 90 measured render intervals; simulation time was never
used as the FPS clock. Explicit setup updates settled travel before warmup. World-generation seeds stayed authored;
the varied seeds are the runtime play stream.

Coverage is all three scenes on Lanternmoss for Witch, Warrior and Ranger on seeds 1 and 7 (18 rows), plus all three
scenes on Emberfall and Frostveil for Witch/seed 1 (6 rows). This is an initial machine diagnostic, not a full
cross-world hero audit. The report retains two collection segments; completed rows were kept unchanged when the
collector was stopped to bound its scope. The earlier four-row pilot is excluded from the final measurements.

All 24 cases completed (2,160 measured frames), with zero page, shader or console errors. FPS below is the range
over each scene's recorded rows; Emberfall/Frostveil have one row per scene, as scoped above.

| World | Day / clear FPS | Night / clear FPS | Night / heavy weather FPS |
| --- | ---: | ---: | ---: |
| Lanternmoss | 3.4–4.2 | 3.3–4.0 | 3.9–4.4 (storm) |
| Emberfall | 3.1 | 3.3 | 3.0 (ashfall) |
| Frostveil | 3.8 | 3.4 | 3.1 (blizzard) |

Across the report, p95 frame intervals are 307.7–533.6 ms, versus the strict 16.67 ms target. The empty-page
frame-clock p95 is 16.8–16.9 ms across the two segments; this small pacing difference does not explain the game
results. All rows fit the existing per-world count ceilings; overall peaks are 938 calls and 242,572 triangles.
No scene meets the 60 FPS frame-time target. This laptop, in the recorded conditions, is unsuitable as a 60 FPS
validation substitute. A useful next diagnostic is the same fixed scene with more memory available, before
attributing the whole shortfall to GPU throughput or choosing gameplay/rendering changes.

Render/update CPU durations describe only the JavaScript work they wrap, not GPU time or all browser work. Neither
passing count ceilings nor running on a weaker GPU certified the then-required Iris Xe target. These historical scenes,
resolution and source differ from the historical 1080p measurements above; this is not an optimization before/after.

## Acer Intel UHD Tidewhisper diagnostic (2026-10-17)

[Separate report](../../tidewhisper-performance-acer-20261017.json), clean synchronized commit `1860d90`:
Acer Nitro ANV15-51, Core i5-13420H, 16 GB installed RAM, Windows 11 / Edge 155 headless. Every row confirms actual
Intel UHD A7A8 through ANGLE/D3D11, driver 31.0.101.4146. The RTX 4050 is present as a secondary adapter and was not
the WebGL renderer. AC connected, Acer power plan, approximately 3.5 GiB available before browser launch. Other
user applications stayed open; pre-run Windows sampling recorded 645 pages input/s, so this was not a fully idle host.

All three heroes on runtime seeds 1/7, three scenes each: 18 cases, 120 samples per case (2,160 total), 30 warmup
frames. Authored generation seed, stationary invulnerable level-1 hero, passive pets (IDs recorded per row), fixed
light/tide phase and camera. Viewport 1280x720, DPR 1, Low, actual buffer 896x503. Setup uses explicit simulation
updates; all measured intervals use real render timestamps. The empty-page clock freezes the game tab to remove
its background rendering. No other test, screenshot or benchmark job ran alongside this collector.

The empty clock has 240 samples, median 6.1 ms / p95 6.4 ms (near 165 Hz), outside the approved 60 Hz calibration
band. The applicable frame limit is therefore the fixed 16.67 ms. This supersedes any general claim that all
headless sessions are paced at 60 Hz; the historical HD 4600 observation only described that host.

| Scene (six hero/seed cases each) | FPS range | p95 frame interval (ms) | Peak calls | Peak triangles |
| --- | ---: | ---: | ---: | ---: |
| Afternoon village | 38.8-43.9 | 26.7-32.8 | 580 | 189708 |
| Night clear | 37.5-41.8 | 27.6-32.3 | 636 | 191804 |
| Afternoon squall | 38.3-44.6 | 26.4-31.9 | 594 | 190212 |

**NO-GO on this diagnostic host:** none of 18 cases meets the timing budget; 8/18 exceed the unchanged 550-call
ceiling, peaking at 636. All triangle counts fit the 230,000 ceiling (peak 191,804). Zero page/shader errors, no
hidden or paused samples, and complete hero/seed/scene coverage. CPU p95 ranges 21.1-27.5 ms, GPU p95 17.6-22.9 ms;
these omit browser work and are not additive. A trace is needed to attribute the delay.

Next: identify the meshes/actors behind draw-call peaks, reduce them within the existing ceiling, and repeat a
controlled diagnostic with more memory headroom before attributing the whole shortfall to the GPU. This broader
matrix and fixed-phase collector differ from the earlier three-scene UHD report; it is not an optimization
before/after. The later owner decision replaces Iris Xe with the Acer RTX 4050; Tidewhisper stays unreleased pending
passing evidence on that reference at 1080p High.
