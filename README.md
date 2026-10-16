# Lanternmoss

<img src="docs/logo/witch-A1.png" width="140" align="right" alt="Lanternmoss character mark: the Girl Witch in her violet hat">

A tiny cozy planet of lanterns, moss and friendly critters: a third-person browser game built with
[Three.js](https://threejs.org/) (r160) and plain ES modules, with no asset files (every model, icon and sound is made in
code). Pick the Girl Witch, the Boy Warrior or the Elf Archer, explore hilly little planets, help the villagers, open
treasure chests, gear up, raise a pet, claim and furnish a cottage, and fight the monsters beyond the village lanterns.

![The village of Lanternmoss](docs/screenshots/village/village.jpg)

## Game overview

- **Genre:** a cozy third-person action-adventure in the browser, on small spherical planets.
- **Campaign:** every planet has a boss in a lair on its far side, marked by a shaft of light. Each boss sleeps in its
  sealed lair until you have earned the fight. Defeat it, open the treasure chest it leaves, and choose your next
  destination at the village lantern gate (Lanternmoss, Emberfall or Frostveil), keeping your level, gear, bag, coins and
  pets. Each boss is its own fight: Gloomcap the Moss King, Pyrrhax the red dragon, and Malgrath, the two-phase Winged
  Demon Lord.
- **Core loop:** explore a planet, fight its monsters and gather its resources, help the villagers, craft and upgrade
  gear, then earn and win the boss fight and travel on.

## Key features

- **Three heroes** with four abilities and an aimed ultimate each, and a **talent tree** per hero.
- **Pets** that fight beside you, with commands, abilities and levels.
- **A living village:** villagers on a day / night clock, quests, a shop, enterable houses and a bounty board.
- **Combat** built on facing and a soft lock-on, with mini bosses and earned boss fights in arena rings.
- **Living off the land:** energy, gathering, fishing, farming, crafting stations, smelting and enchanting.
- **Gear** with rarity, worn slots and **set bonuses**; a cottage of your own to claim, build around and furnish.
- **A journal** (achievements, bestiary, collection), **save / load**, a guided tutorial and **photo mode**.

The [feature tour](docs/wiki/game-design/feature-tour.md) shows each of these with screenshots.

<p>
  <img src="docs/screenshots/mobs/combat.jpg" width="32%" alt="A fight with goblins">
  <img src="docs/screenshots/huds/bag.jpg" width="32%" alt="The bag with gear">
  <img src="docs/screenshots/bosses/arena.jpg" width="32%" alt="Inside the ring of thorns">
</p>

## Technology

- **Three.js 0.160** and plain ES modules, loaded in the browser through the import map in `index.html` (Three.js and
  the UI font come from CDNs, so an internet connection is needed).
- **Node.js 18 or later** for the zero-dependency dev server, the unit tests (Node's built-in test runner) and the
  gameplay simulations. `three` (the same version as the import map) is the only dev dependency, used by the sims.
- **Optional:** `puppeteer-core` with Edge or Chrome for the browser checks and screenshots (not a project dependency).

## Getting started

ES modules can't be loaded from `file://`, so the game needs a local web server:

```sh
npm start            # zero-dependency static server -> http://localhost:8080/
npm start -- 3000    # or pick a port
npm stop             # stop this project's server on port 8080
```

Any static server works too (`npx serve`, `python -m http.server`). To run the checks:

```sh
npm test             # unit tests
npm install          # once, for the sims
npm run sim          # gameplay simulations and pacing audits (several minutes)
```

The default keys are in [Controls](docs/wiki/reference/controls.md); every key except the number row and `Esc` can be
remapped in **Settings → Keys**. More commands (single sims, the balance report, browser checks, refreshing the
screenshots) are in [Running, checks and screenshots](docs/wiki/technical/running-and-checks.md).

## Project structure

| Path | What it holds |
| --- | --- |
| `index.html`, `styles/main.css` | the page markup (HUD, dialogue, menus) and all styling |
| `src/` | the game: `config/` (tunable data), `core/`, `gameplay/`, `combat/`, `entities/`, `world/`, `render/`, `ui/`, `models/`, `systems/`, `items/`, `inventory/`, `progression/` |
| `tests/` | unit tests (`*.test.mjs`) and gameplay simulations (`tests/sim/`) |
| `scripts/` | the dev server, browser checks (`*-smoke.mjs`), the screenshot tour and benchmarks |
| `docs/wiki/` | the project wiki: design, systems, world, technical and reference pages |
| `docs/screenshots/`, `docs/logs/` | screenshots by subject, and the timestamped work logs |
| `TODO.md`, `AGENTS.md` | the roadmap, and the working rules for contributors and AI agents |

The full file-by-file map is in [Project structure](docs/wiki/technical/file-map.md).

## Development status

- **Playable now:** three worlds (Lanternmoss, Emberfall, Frostveil) with their campaign, bosses and mini bosses. The
  public game is on `master`; `develop` integrates newer work.
- **On `develop`:** gear set bonuses and a talent tree for each hero (TODO 28), shared local lighting for dark places
  (TODO 29a), the bounty board and photo mode.
- **In development, not released:** Tidewhisper, the fourth world (TODO 27a-27g built; 27h waits for hardware
  certification). Duskhollow and the secret Lantern Moon are planned.

The roadmap and every stage's notes are in [TODO.md](TODO.md); a summary of major updates is in the
[changelog](docs/wiki/reference/changelog.md).

## Documentation

The [project wiki](docs/wiki/README.md) is the detailed reference: how the game works, its rules, systems, world and
technical design.

## Contributing

Work follows [AGENTS.md](AGENTS.md): task branches from `develop`, tests and simulations for every change, and a log of
each task in `docs/logs/`.
