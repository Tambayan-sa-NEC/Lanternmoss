# Talents: Witch (28c), Warrior (28d) and Ranger (28e)

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
maximum rank. All three heroes have a tree (28c-28e).

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

![Witch tree at 720p](../../screenshots/huds/talents.jpg)

## Warrior (TODO 28d)

| Talent | Points per rank | Ranks | Needs | Effect per rank |
| --- | ---: | ---: | --- | --- |
| Keen Edge | 1 | 2 | — | Axe Cleave deals 10% more base damage (20% at two ranks). |
| Quick Spin | 1 | 2 | — | Whirlwind cooldown falls by 1 second (7 → 5 seconds). |
| Steady Guard | 1 | 2 | — | Guard lasts 0.5 seconds longer (2.5 → 3.5 seconds). |
| Wide Cleave | 2 | 1 | Keen Edge | Axe Cleave becomes Wide Cleave: its arc grows from 110° to 170°. |
| Tempest | 1 | 2 | Quick Spin | Whirlwind reaches 0.4 m further (3.4 → 4.2 m). |

Again ten points of choices for eight. Wide Cleave keeps Axe Cleave's damage, reach, cost and cooldown: it only
catches more foes, so against one foe it is no stronger (its value is crowds). The soft lock still aims the swing;
the wider arc reaches foes beside the one locked. Shoulder Charge's hit sweep reads the learned kit like every cast,
and ability tooltips list a swing's arc. Bosses keep their immunity windows: no talent lands while one is immune.

![Warrior tree at 720p](../../screenshots/huds/warrior-talents.jpg)

## Ranger (TODO 28e)

| Talent | Points per rank | Ranks | Needs | Effect per rank |
| --- | ---: | ---: | --- | --- |
| Steady Aim | 1 | 2 | — | Arrow Shot deals 10% more base damage (20% at two ranks). |
| Quick Fan | 1 | 2 | — | Arrow Fan cooldown falls by 0.5 seconds (4 → 3 seconds). |
| Light Feet | 1 | 2 | — | Evasive Leap costs 2 less stamina (15 → 11). |
| Wide Fan | 2 | 1 | Quick Fan | Arrow Fan becomes Wide Fan: 7 arrows over 60° instead of 5 over 40°. |
| Bramble Snare | 1 | 2 | Steady Aim | Thorn Arrow slows last 0.5 seconds longer (3 → 4 seconds). |

Wide Fan keeps the arrows 10° apart, so a single foe takes what Arrow Fan dealt; the two extra arrows reach foes
further aside. Damage per arrow, cost and range are unchanged.

![Ranger tree at 720p](../../screenshots/huds/ranger-talents.jpg)

## Sets and talents together (TODO 28e)

Set bonuses ride on whatever an ability hits, so a talent variant spreads them: one Wide Cleave with the Ember set
burns both foes it catches, Wide Fan with the Frost set chills the foe aside, and Seeking Fireball with the Ember set
leaves its target burning. They stay independent: Old Bramble's reset takes talents only, taking a set off takes its
bonus only, and Continue keeps both. Burns tick on monsters, not on static objects such as lair seals. Boss pacing
with sets and talents is in [balance](../game-design/balance.md#sets-and-talents-together-28e).

## Verification

- `node --test tests/talents.test.mjs`: tree validity, point budget, prerequisites, modifiers, variant text and saves.
- `node tests/sim/witchTalents.sim.mjs`: production learning and casts; a target sidesteps after Fireball launch;
  base flight misses while seeking flight hits and explodes. Also checks lost/no targets, bounded flight,
  key remapping, two Continue cycles, free reset and a new adventure. Repeat with `SIM_SEED=7`.
- `node scripts/witch-talents-smoke.mjs`: real Learn clicks, budget and prerequisite UI, 720p/1080p Low layout,
  live HUD/Controls/tooltips and key labels, full browser reload + Continue, and real E with Old Bramble. Requires
  `puppeteer-core`; Edge by default (`CHROME` overrides). Owns port 8120 and its own browser profile.
- `node tests/sim/warriorTalents.sim.mjs` (seeds 1 and 7): a foe 70° aside of a locked target takes nothing from Axe
  Cleave and full damage from Wide Cleave; reach, cost and cooldown unchanged; Tempest reaches a foe 4.6 m away;
  Quick Spin's cooldown; Guard against a real Gloomcap hit three seconds in (32 → 10 HP with Steady Guard x2); boss
  immunity refuses the talents; two Continue cycles; Old Bramble's reset; paired pace samples.
- `node scripts/warrior-talents-smoke.mjs`: the Warrior page, Wide Cleave in HUD/Controls/tooltips (170° arc), Tempest
  radius, a remapped key, reload + Continue, real E with Old Bramble and Steady Guard's tooltip. Owns port 8121.
- `node tests/sim/rangerTalents.sim.mjs` (seeds 1 and 7): Wide Fan reaches a foe 32° aside (0 → 16 damage) while a
  lone foe takes the same 48; cost, Quick Fan, Bramble Snare, Light Feet, boss immunity, saves, reset, pace samples.
- `node scripts/ranger-talents-smoke.mjs`: the Ranger page, Wide Fan in HUD/Controls/tooltips, Bramble Snare's slow,
  keys, reload + Continue, real E with Old Bramble and Light Feet's HUD cost. Owns port 8122.
- `node tests/sim/talentDepth.sim.mjs`: sets and talents together across all three heroes (see above).
- `BALANCE_BUILD=depth node tests/sim/balance.sim.mjs`: the balance report with each world's set and the talents
  earned at its boss level.
- The older `talents` simulation and browser smoke retain their stable test-only tree for foundation regressions.

The simulation also prints paired base/learned throughput samples for all three heroes on seeds 1 and 7. These
are isolated level-8 regular fights, with starting equipment, passive pets and invulnerability. See
[measurement limits and numbers](../game-design/balance.md#witch-talents-28c). They do not replace the original summon-level
balance contract or human playtesting. Mixed set/talent and all-tree acceptance belongs to 28e.
