# Performance budget

The target is steady **60 FPS at a 1920 × 1080 viewport on Iris Xe class integrated graphics**, using the default
High preset: 16.67 ms per frame. The available test machine reports Intel UHD through Edge/ANGLE/D3D11, not Iris Xe.
It remains below 60 FPS. These measurements establish a reproducible render budget; they do not certify the target.

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

The checked-in [original baseline](performance-baseline.json) was captured before optimization, using `--baseline
--quick` (12 warmup/20 measured frames, High only). [Current results](performance-results.json) record all three
presets. `--quick` is useful for iteration; full sampling is used for final verification. Timing from short samples is
indicative. Neither result is a universal worst case for every combat encounter or camera bearing.

The script fails if any preset exceeds its planet's calls/triangle ceiling, then verifies the live overlay, F3 while
paused and all five density controls, and captures [the overlay](screenshots/performance.jpg) and
[Graphics settings](screenshots/performance-settings.jpg). Commit refreshed JSON alongside intentional render changes
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

Generation consumes the same seeded world stream at every density. Resource IDs, placement and collider counts stay
fixed. Sparkle emission consumes the original random draws even for omitted particles, preserving combat and loot
randomness. Simulation checks exercise all planets, regrowth, density restoration, particle randomness and actor
transform/visibility ownership. The boss simulation bot uses a separate stream so Three.js UUID counts cannot change
its steering when models are optimized.

The remaining 60 FPS work is measurable: animated multi-part actors and near-field props still contribute many calls,
while bloom, MSAA and full-resolution post-processing cost fill rate. Validate on actual Iris Xe hardware before
claiming the default-quality target; these count ceilings are a regression guard, not a substitute for that validation.
