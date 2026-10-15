# Talents: Witch (TODO 28c)

Open **Talents** from the pause menu while playing the Witch. Earn one point at levels 2, 4, 6, 8, 10, 12, 14 and
16 (eight total). Each Learn click buys one rank. Grey Learn buttons explain a missing prerequisite, points or
maximum rank. Visit Old Bramble in the Lanternmoss village to reset every rank for free and spend the points again.

| Talent | Points per rank | Ranks | Needs | Effect per rank |
| --- | ---: | ---: | --- | --- |
| Bright Bolt | 1 | 2 | — | Arcane Bolt deals 10% more base damage (20% at two ranks). |
| Quick Frost | 1 | 2 | — | Frost Nova cooldown falls by 1 second (8 → 6 seconds). |
| Light Step | 1 | 2 | — | Blink costs 2 less mana (15 → 11 mana). |
| Seeking Flame | 2 | 1 | Bright Bolt | Fireball becomes Seeking Fireball, following the foe aimed at when cast. |
| Deep Freeze | 1 | 2 | Quick Frost | Frost Nova slows last 0.5 seconds longer (3.5 → 4.5 seconds). |

The whole tree costs ten points, so eight points cannot buy everything. A prerequisite needs one rank, not its
maximum rank. The Warrior and Ranger trees remain hidden until their own stages (28d and 28e).

Seeking Fireball keeps Fireball's damage, blast radius, cost, cooldown and maximum flight time/range budget. It
captures the current soft-lock target when cast; it does not choose a new target in flight. Without a target it
flies straight. A dead or hidden target stops attracting it. Like Arcane Bolt, it uses the existing homing
projectile flight on the planet surface, including elevated targets and scenery collision.

The spell bar and hover tooltips show the learned ability name, mana cost, cooldown, blast radius and slow duration.
The Controls page uses the learned name, variant description, cost and cooldown. Remapping a skill key also refreshes
a cached talent kit. The character-select screen describes the base kit for a new adventure.

Only ranks are saved, per adventure. Points are derived from the saved level. Continue revalidates known ranks,
prerequisites and the point budget; old saves default to an empty tree. Two reloads cannot duplicate points.
Reset rebuilds the original kit without changing its shared data, and starting a new adventure clears all ranks.

![Witch tree at 720p](screenshots/huds/talents.jpg)

## Verification

- `node --test tests/talents.test.mjs`: tree validity, point budget, prerequisites, modifiers, variant text and saves.
- `node tests/sim/witchTalents.sim.mjs`: production learning and casts; a target sidesteps after Fireball launch;
  base flight misses while seeking flight hits and explodes. Also checks lost/no targets, bounded flight,
  key remapping, two Continue cycles, free reset and a new adventure. Repeat with `SIM_SEED=7`.
- `node scripts/witch-talents-smoke.mjs`: real Learn clicks, budget and prerequisite UI, 720p/1080p Low layout,
  live HUD/Controls/tooltips and key labels, full browser reload + Continue, and real E with Old Bramble. Requires
  `puppeteer-core`; Edge by default (`CHROME` overrides). Owns port 8120 and its own browser profile.
- The older `talents` simulation and browser smoke retain their stable test-only tree for foundation regressions.

The simulation also prints paired base/learned throughput samples for all three heroes on seeds 1 and 7. These
are isolated level-8 regular fights, with starting equipment, passive pets and invulnerability. See
[measurement limits and numbers](balance.md#witch-talents-28c). They do not replace the original summon-level
balance contract or human playtesting. Mixed set/talent and all-tree acceptance belongs to 28e.
