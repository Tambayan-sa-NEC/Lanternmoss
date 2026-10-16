# Fix: Witch mini-boss variance (mini bosses and their leash)

Clock reads: 15:40 (start), 15:42 (per-seed stats), the user's decision, 15:56 (rule in, reports started), 16:07
(reports), 16:08-16:18 (reports with new health), 16:25 (suites), 16:26 (merge). Steps between reads are grouped.

| DATETIME | TASK TYPE | TODO ID | ACTION | BRANCH | REMARK | DURATION |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-16 15:42 | RESEARCH | TODO N/A | Per-seed stats of the Witch vs the Frost Hydra (seeds 1, 2, 3, 4, 7) | fix/witch-mini-boss-variance | Damage dealt 4,979-10,107 against 3,700 HP; the excess tracked the number of re-engages (1-4) | 0h 02m |
| 2026-10-16 15:56 | RESEARCH | TODO N/A | Logged each switch to 'return' | fix/witch-mini-boss-variance | Leash: the Hydra chased past 18 m and walked home healing to full, once at 155 HP; the Basilisk the same at 174 HP of 2,200. The Witch fights at ~6 m inside the 6.5 m bite and is knocked back, so fights creep outward. A real player meets it too: a game rule, not a bot defect | 0h 14m (15:42-15:56, with the rows below) |
| 2026-10-16 15:56 | DECISION | TODO N/A | User: option 2 (mini bosses keep their damage), healing back only after more than 5 s out of combat | fix/witch-mini-boss-variance | Rejected by the user: holding the leash edge; leaving the game as is. Ordinary monsters unchanged | (above) |
| 2026-10-16 15:56 | FEATURE | TODO N/A | `COMBAT.leashReturn` (heal 0.3/s, miniBossHealDelay 5); Enemy tracks seconds out of combat; mini bosses do not heal while returning or at home until then | fix/witch-mini-boss-variance | The Hydra's own 4% heal when it grows a head is a designed rule and stays | (above) |
| 2026-10-16 15:56 | TEST | TODO N/A | `tests/sim/miniBossLeash.sim.mjs` | fix/witch-mini-boss-variance | Fails without the change ("no healing on the way home (2800 / 2800)"). First run with it failed on re-engage: the test set health directly, skipping the head thresholds, whose 4% heals then fired; the test now uses real hits. Passes: damage kept home, resumed within 5 s, heals after 5 s, goblins unchanged | (above) |
| 2026-10-16 15:56 | BALANCE | TODO N/A | Witch mini bosses, seeds 1/2/3/4/7 | fix/witch-mini-boss-variance | Frost Hydra 103-105 s (was 129-283), Emberfall 111-127 s (was 172-194 on 1/7) | (above) |
| 2026-10-16 16:07 | BALANCE | TODO N/A | Full report, base and depth, seeds 1 and 7 | fix/witch-mini-boss-variance | Ranger mini bosses fell under the 90 s floor (77-83 s): her old ~95-111 s had been inflated by the same resets | 0h 11m |
| 2026-10-16 16:07 | DECISION | TODO N/A | Raise mini-boss health 20% (Hydra 3,360, Basilisk 2,640, Frost Hydra 4,440) | fix/witch-mini-boss-variance | Targets are not loosened (AGENTS.md); +20% puts the Ranger near 90-98 s while the Warrior and Witch stay well under 180 s. Rejected: a Ranger-only change (hero-specific nerf), a smaller raise (77 s x 1.15 < 90). Old Ironclaw (unreleased) left for 27h | (above) |
| 2026-10-16 16:18 | BALANCE | TODO N/A | Full report again, base and depth, seeds 1 and 7 | fix/witch-mini-boss-variance | Every profile inside target: mini bosses 92.2-167.5 s, bosses 181.6-288.2 s; with sets and talents every boss >= 140.6 s | 0h 10m |
| 2026-10-16 16:18 | DOCS | TODO N/A | balance.md (leash section, tables, mini-boss health), README (mini-boss paragraph, tuning row) | fix/witch-mini-boss-variance | No visual change, so no screenshots retaken | (above) |
| 2026-10-16 16:25 | TEST | TODO N/A | `npm test`, `npm run sim` | fix/witch-mini-boss-variance | 236/236, 51/51 (ironclaw, coastalDuels and bosses also checked earlier: pass) | 0h 07m |
| 2026-10-16 16:26 | MERGE | TODO N/A | Committed d2941d3, merged into `develop` (7df9b8e), pushed, deleted the branch | develop | | 0h 01m |
| 2026-10-16 16:26 | TOTAL | TODO N/A | Witch mini-boss variance, start to log | develop | Mini bosses keep damage past the leash (user rule), health +20%; all profiles in target | 0h 46m |
