# Act II progression and release acceptance

The level cap is 16. The XP formula remains `round(30 * level ** 1.3)`, preserving every old threshold through
level 9 and continuing through level 15. Old level-10 saves can earn XP again; Continue preserves levels 11–16
and their computed stats. Cap-16 saves keep zero surplus XP. The original v1 fixture remains unchanged.

Each planet declares `expectedLevel`, `lowLevel` and `scale` in its own config. Act I retains its existing
difficulty. Tidewhisper's measured release-candidate values and the planned later values are:

| World | Expected levels | Low-level challenge | HP scale | Damage scale |
| --- | --- | --- | --- | --- |
| Tidewhisper | 7–10 | 9 | 2.9 | 2 |
| Duskhollow | 10–13 | 12 | 3.4 | 2.25 |
| Lantern Moon | 13–16 | 15 | 4 | 2.5 |

Tidewhisper and Duskhollow both meet their two-seed, three-hero balance bands; Duskhollow still waits on hardware
frame-time acceptance. Lantern Moon retains starting values for its later balance stage. The title shows Tidewhisper as released on `develop`,
Duskhollow as planned and the secret Moon masked as `?`. Planned entries are descriptive
and cannot be selected. Generation, travel, Continue validation and keys still use only released worlds.
Frostveil is the Act I finale; beating all currently released main worlds completes that playable campaign.

`allBosses` remains **Lantern of Three Worlds**, with its original id, reward and named bosses. Tide, Dusk and Moon
boss awards activate only with their released worlds. **Lantern of Five Worlds** activates once all five main worlds
release and never requires the secret Moon. Secret award text remains masked until earned. Staged enemy definitions
do not increase Field Notes/bestiary goals until a released world uses them, including registered boss summons.

`src/config/contentGate.js` checks released content using actual runtime registrations supplied by
`tests/sim/lib/contentRegistry.mjs`. It runs under both `npm test` and the `contentGate` simulation. Keep a new world
unreleased until its own content, encounters, balancing and browser/performance work pass. Merely adding metadata
does not satisfy the gate.

Common checks include reachable levels, positive scaling, valid population, registered enemy behaviors/fights and
body builders, bestiary pages, tree builders, weather/critters, known items/resources/chests, local looks/dialogue/home
ownership, quest references, music/mechanic registrations, physics envelopes and configured render ceilings.

Every expansion world additionally needs:

- At least three exclusive regular enemy types with distinct body builders and at most two returning types.
- Its own planet-boss module and a registered mini boss.
- At least two tree kinds and two critter kinds, its own rare creature and a unique weather kind.
- A unique material, a rare vein, a local villager with a planet quest and first-arrival lines for every traveler.
- A unique registered music theme and a registered mechanic.
- Passing recorded release performance evidence for every hero on seeds 1/7 in village, night and weather scenes,
  using the [desktop reference](performance.md) (`PERFORMANCE_REFERENCE` in `config/render.js`): actual Acer RTX 4050
  Laptop GPU, visible browser, 1920×1080 DPR1 High, clean committed source and no diagnostic GPU queries.
  Every row needs at least 90 samples, p95 frame time at or below the 60-fps budget, and peak draw
  calls/triangles within the world-specific ceilings in `config/render.js`. The owner-approved frame-clock rule
  compares p95 against max(16.67 ms, the same run's calibrated empty-page p95); calibration requires at least 120
  samples and a median within 5% of the target. See [the collector/handoff](tidewhisper-release.md).
Tidewhisper's release evidence additionally requires the otter selected in every row, so its companion cost is
included in the reference matrix.

Only the released secret `lanternMoon` may omit a mini boss; it must explicitly set `farm: false`, `caves: false`
and a positive population minimum. Its other checklist requirements and known boss/rare-gift unlock references
still apply. Main worlds cannot borrow these exceptions. No-farm worlds skip the village plots at runtime.

The three original Act I ids retain their historical content mix. They still undergo common registration,
reference, level and render-budget checks, but are not retrofitted with three exclusive enemies, local villagers
or separate themes. Their outstanding reference-device 60-fps hardware validation remains documented in
[performance notes](performance.md); this stage makes no new hardware-performance claim for them.

New-world release measurements live at `docs/releases/<planetId>.json`:

```json
{
  "device": "NVIDIA GeForce RTX 4050 Laptop GPU",
  "quality": "high",
  "viewport": [1920, 1080],
  "candidateCommit": "<40-character Git commit hash>",
  "dirty": false,
  "gpuTiming": false,
  "browser": { "headless": false },
  "rows": [
    { "hero": "witch", "seed": 1, "scene": "village", "gpu": "NVIDIA GeForce RTX 4050 Laptop GPU",
      "quality": "high", "drawingBuffer": [1920, 1080], "samples": 120, "p95FrameMs": 0, "calls": 0, "triangles": 0 }
  ]
}
```

This abbreviated example omits 17 required rows, uses a placeholder commit and zero timings/counts, so it fails
acceptance. The collector writes all 18 combinations exactly once and the gate validates every row. Record real measurements in the owning release stage;
the synthetic green reports in unit fixtures are not release evidence. Add its ceilings, complete the content,
then flip `released` and run all checks. Do not bypass the gate to expose an unfinished destination.

Music scores register in `config/music.js`; `audio.setTheme(id)` retunes existing pad voices and the next chimes on
travel/Continue. The original cozy score is unchanged. Later music stages supply the new worlds' actual scores.
New quests may use a stable planet id for their origin; old numeric origins remain supported.

Verify with `npm test`, `npm run sim`, and `node scripts/act-two-smoke.mjs` (Puppeteer Core plus Chromium, overridden
by `CHROME`). The helper owns port 8106 and checks 720p/1080p title bounds, old/new level saves, the real portal
picker and masked secret text. It closes its browser/server, stores QA captures in the temporary directory, and
refreshes `docs/screenshots/huds/title.jpg`.
