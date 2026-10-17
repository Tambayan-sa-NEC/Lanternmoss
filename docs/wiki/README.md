# Lanternmoss wiki

The detailed, authoritative reference for how Lanternmoss works: its design, rules, systems, world and technical
implementation. The [root README](../../README.md) is the short project overview and setup guide; [AGENTS.md](../../AGENTS.md)
holds the working rules for contributors and AI agents; [TODO.md](../../TODO.md) is the roadmap with every stage's notes.

**Status markers.** Pages describe implemented behaviour unless they say otherwise. Content marked **unreleased** is
built and tested but hidden from players behind a `released: false` flag. Pages under [Plans](#plans) are proposals,
not confirmed design.

## Game design

| Page | What it covers |
| --- | --- |
| [Feature tour](game-design/feature-tour.md) | Every player-facing feature, with screenshots |
| [Balance and pacing](game-design/balance.md) | Timing targets, the measured balance report, XP route, economy, survival and the decisions behind the numbers |

## Systems

| Page | What it covers |
| --- | --- |
| [Items and the bag](systems/items-and-inventory.md) | Item definitions vs. state, stacking, gear and rarity, the hotbar, using items |
| [Crafting: cooking, brewing and enchanting](systems/crafting.md) | Advanced recipes, discovery, brewing and the Enchant tab |
| [Talents](systems/talents.md) | Talent points, the Witch, Warrior and Ranger trees, saves and the free reset |
| [Pets](systems/pets.md) | Pets, their commands, abilities and growth |
| [The journal](systems/journal.md) | Achievements, the bestiary and the collection |
| [Saving an adventure](systems/saving.md) | Continue, autosave, export and import (the format is in [Adventure saves](technical/save-format.md)) |
| [Your cottage](systems/home.md) | Claiming and furnishing the player home |
| [Building your garden](systems/building.md) | Placing outdoor pieces, storage, sorting and pickup |
| [Build a shelter](systems/structures.md) | Modular shelters and foundations |
| [Village lantern gates](systems/portals.md) | Travel between worlds, keys and one-way trips |
| [Tutorial and first-time help](systems/tutorial.md) | The guided first walk, Help and the fainting recap |

## World

| Page | What it covers |
| --- | --- |
| [Planet catalog and release rules](world/planets.md) | The worlds, their configuration and which are released |
| [Monsters and bosses](world/monsters-and-bosses.md) | Every monster, mini boss and boss, and how they fight |
| [Tidewhisper](world/tidewhisper.md) | The fourth world (**unreleased**): terrain and tides, wildlife, resources, village, monsters and its encounters |

## Technical

| Page | What it covers |
| --- | --- |
| [Architecture](technical/architecture.md) | Startup and per-frame order, seeded generation, one-way dependencies and shared state |
| [Project structure (file map)](technical/file-map.md) | What every file and folder is for |
| [Tuning](technical/tuning.md) | Where each tunable number lives in `src/config/` |
| [Running, checks and screenshots](technical/running-and-checks.md) | Server, unit tests, simulations, balance report, browser checks and the screenshot tour |
| [Adventure saves](technical/save-format.md) | The save format, its systems and validation |
| [Planet mechanic lifecycle](technical/planet-mechanics.md) | Per-world rules: enter, update, exit and their saves |
| [Shared planet gravity and water](technical/world-physics.md) | Gravity, water levels and moving water |
| [Local light](technical/lighting.md) | Light radii in the shaders, the shared real lights and darkness |
| [Performance budget](technical/performance.md) | The 60 FPS target, measurements and acceptance |
| [Tidewhisper release handoff](technical/tidewhisper-release.md) | The incomplete 27h checkpoint, reproducible candidate checks and hardware handoff |
| [Act II progression and release acceptance](technical/content-release.md) | Level cap 16, the content gate and how a world is released |
| [Typography](technical/typography.md) | The type brief and the chosen faces |
| [Refactor notes](technical/refactor-notes.md) | How the single-file original became modules |

## Reference

| Page | What it covers |
| --- | --- |
| [Controls](reference/controls.md) | Every default key |
| [What's new (changelog)](reference/changelog.md) | Major updates, newest first |

Related records outside the wiki: [release records](../releases/README.md), the work logs in `docs/logs/`, and the
screenshots in `docs/screenshots/` (one folder per subject, mapped in `scripts/shots.mjs`).

## Plans

Proposals, **not confirmed design and not for execution yet**:

| Page | What it covers |
| --- | --- |
| [Visual upgrade plan](plans/visual-upgrade.md) | A proposed future art update (for agents) |
| [Visual upgrade guide](plans/visual-upgrade-guide.md) | The same plan as a walkthrough for the product owner |

## Keeping the wiki current

One page per subject: update the page that owns a subject rather than adding a second one. When behaviour changes,
change its page in the same task; record limitations honestly, and mark anything not yet released or only proposed.
The documentation rules are in [AGENTS.md](../../AGENTS.md#documentation-governance).
