# Lanternmoss TODO

Planned features, in the order to build them. Each entry says **what** it is, **why** it matters, and the main
**tasks**, with pointers to the code it touches. Check items off as they land. Items 1–20 are done and keep their
numbers; **Round 3** (after 17) explains the order of everything still open, the risks, and what changed on 2026-10-08.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done. Tags: **(core)** must-have, **(nice)** polish,
**(suggested)** an idea added on top of the original list. From Round 3 on, each item also has a **Size** (S / M / L / XL,
explained in Round 3), **Needs** (items that must land first), and where it applies, a **Risk** and a
**Recommendation**.

---

## 1. Better HUD **(core)** ✓

**Goal:** a clearer, better-looking heads-up display that stays readable in hectic boss fights.
Code: `src/ui/hud.js`, `src/ui/icons.js`, `src/ui/waypoints.js`, `index.html`, `styles/main.css`.

- [x] Redesign the HP / mana / XP bars: smoother fill, a damage trail that drains after a hit, label + value on each bar,
      a level badge, the resource bar coloured per hero (mana / stamina / focus), a pulsing bar and red screen edges at low HP.
- [x] Ability bar: drawn SVG icons for every ability, cost in the resource colour, the ultimate glows when ready, and a
      hover tooltip (description from `ABILITY_TEXT` in `config/characters.js`, key, damage at your level, area, cost, cooldown).
- [x] Status row with remaining time: Moon-Hop, Feather-Step, Guard, plus a "regenerating" heart. (No hero debuffs exist yet;
      new ones are one entry in `STATUSES` in `hud.js`.)
- [x] Boss bar: a tick at each phase threshold, phase name, HP %, a damage trail and a flash when a phase starts.
- [x] Off-screen arrows at the screen edge toward the boss and the active challenge's next target (with distance).
- [x] Compass strip (top centre) with the village, the boss, the challenge target and villagers offering a challenge.
      A full minimap is still open, if wanted.
- [x] HUD scales with the window (`--ui`, `applyUiScale`); `setUiScale()` stores a player preference, ready for the
      Settings menu slider (section 2a).
- [x] The controls panel folds into a small `H Controls` pill after 25 s of play; `H` toggles it.

## 2. Pause menu **(core)** ✓

**Goal:** `Esc` (when nothing else is open) pauses the game and opens a menu.
Code: `src/ui/PauseMenu.js`, `src/core/controls.js` (Esc / P), `src/core/Game.js` (update loop, `applySettings`).

- [x] Pausing freezes the simulation (`ctx.paused`: `Game.update` skips, rendering continues), ducks the audio and
      releases held keys. `P` also pauses, and losing window focus pauses automatically (can be turned off).
- [x] **Resume**: closes the menu and continues.
- [x] **Settings**: opens the settings screen (section 2a).
- [x] **Controls**: the current hero's abilities (icon, keys, description) generated from `CHARACTERS`, then the fixed
      keys from `src/config/controls.js`.
- [x] **Quit to menu**: confirms, saves the adventure, then returns to the title (Continue restores it).
- [x] Esc priority: closes the bag, then ability aiming, then dialogue; only then opens the pause menu. Esc on a sub-page
      goes back; Esc on the main page resumes.

### 2a. Settings screen **(core)** ✓
Schema: `src/config/settings.js` (one table drives the screen, defaults and validation); store: `src/core/settings.js`.
- [x] Audio: master, music & ambience, and effects volume (separate audio buses).
- [x] Camera: mouse sensitivity, invert vertical drag, default zoom.
- [x] Graphics: quality preset (render resolution), bloom on/off, outline width (0 hides outlines).
- [x] Gameplay: screen shake strength, damage numbers on/off, impact slow-motion on/off.
- [x] Interface: HUD size, compass & target arrows on/off, pause when the window loses focus.
- [x] Remappable keys (stretch goal; needs bindings to move out of `CHARACTERS` key lists into one keymap table).
  - Done in 10.4: Settings → Keys (`src/core/keybinds.js`).
- [x] Remembered in `localStorage` (`lanternmoss.settings`); saved values are validated on load, Reset restores defaults.

## 3. Main menu / landing page **(core)** ✓

**Goal:** a proper title screen before character selection.
Code: `src/ui/MainMenu.js`, `index.html` (`#title`, `#start`), `src/ui/CharacterSelect.js`, `styles/main.css`.

- [x] Title screen with the floating logo and tagline over a slow, wide, high orbit of the planet; the music starts on
      the first click or key press (browsers block audio until then).
- [x] Buttons: **Continue**, **New Adventure**, **Import Save**, **Settings**, **Journal**, **Controls**, **Credits** (credits text in `src/config/credits.js`); mouse or
      ↑ ↓ + Enter. Settings / Controls / Credits open as panels of the pause menu (`PauseMenu.openPanel`).
- [x] **Continue**: restores the adventure; New Adventure confirms before replacing the slot (done in 19).
- [x] Animated transitions: the title lifts away as the hero cards slide in (and the camera moves in close); character
      select has Back / Esc; starting fades the overlay while the camera swoops into play, with the planet banner.
- [x] Campaign strip: Lanternmoss → Emberfall → Frostveil with each planet's colour and boss (from `config/planets.js`).
- [x] "Quit to menu" in the pause menu now returns to the title screen after saving (Continue restores the run).

## 4. Character selection **(core)** ✓

**Goal:** choosing a hero feels like a moment, and the differences between heroes are obvious.
Code: `src/ui/CharacterSelect.js`, `src/config/characters.js` (`profile`), `src/gameplay/characters.js` (`showcaseHero`).

- [x] The picked hero's live model, framed close in the middle; drag the stage to turn it (the slow orbit pauses
      meanwhile). The hero does their signature move (staff flourish / axe spin / bow draw) when picked and every 6 s.
- [x] Picker cards (portrait, role, difficulty stars) on the left; a detail panel on the right with role, difficulty,
      health, resource, armor, 1–5 ratings (damage, toughness, range, mobility) and what the companion does.
- [x] All 5 abilities with icon, keys and description; the ultimate in a gold row.
- [x] Switching heroes: the panel slides in, the hero hops in a burst of their colour, and a short per-hero voice chirp
      plays (`profile.voice`). The screen opens with your current hero already picked.
- [ ] Optional: colour variants / outfits per hero (the hero builders in `src/models/heroes.js` would need palettes first).

## 5. Better NPCs **(core)** ✓

**Goal:** villagers feel alive and give the player reasons to come back.
Code: `src/entities/npc/`, `src/config/day.js`, `src/config/shop.js`, `src/config/quests.js`, `src/gameplay/` (dayClock,
storyState, wallet, quests/), `src/ui/` (Dialog, portraits, ShopUI).

- [x] Day and night: a village clock (Morning / Afternoon / Evening / Night, 5 minutes a day) with gently shifting light
      and a HUD chip. Villagers follow schedules between home, work spots and the square, walk around obstacles, and
      sleep at night (they wake with a yawn if you talk to them).
- [x] Story-aware dialogue: lines can depend on the planet, bosses beaten, your hero, level and time of day; one-off
      reactions are said once per adventure; text placeholders ({hero}, {planet}, {level}...).
- [x] Portraits with expressions (happy, excited, surprised, sad, thinking, sleepy) drawn as SVG per villager.
- [x] Coins (from monsters, challenges and quests) and Pim's bakery shop: buy food and charms, sell from your bag;
      open by day only.
- [x] Multi-step quests (collect / deliver / talk / defeat / reach a planet) with a HUD tracker, compass guidance and
      rewards: 5 quests, one spanning all three planets.
- [x] A local villager on each later planet (Cinder the smith on Emberfall, Tuva the snow keeper on Frostveil, each with
      lines, tips for that planet's boss and a quest), and the travelling villagers dress for each planet.

## 6. Enterable houses **(core)** ✓

**Goal:** the player can walk into village houses.
Code: `src/config/houses.js`, `src/world/interiors.js`, `src/gameplay/Houses.js`, `src/systems/CameraSystem.js`.

- [x] Doors with a "press E to enter" prompt (E talks to a villager instead when one is closer).
- [x] Interiors as separate small scenes, built far from the planet: fade out, build the room, fade in, and the reverse
      on exit (walk onto the doormat or press E at the door). Two layouts: round mushroom rooms and cottages.
- [x] A fixed dollhouse camera for small indoor spaces (front walls kept low so nothing blocks the view).
- [x] Six houses per planet with their own furniture: owners' homes (Lio, Pim's bakery, Old Bramble, Cinder, Tuva),
      residents who live indoors (Granny Thimble, Moth the librarian), and empty houses with notes. Things to use:
      bed (nap to heal, or sleep until morning at night), a chest with a gift (once per adventure), bookshelf lore,
      kettle tea, Pim's oven (a bun a day), instruments, telescope, fireplace, anvil. Villagers who sleep at home are
      found asleep in their bed at night.
- [x] No combat indoors (abilities are blocked, monsters ignore you, the companion waits outside).

## 7. Chests **(core)** ✓

**Goal:** rewarding exploration with loot.
Code: `src/config/chests.js`, `src/entities/Chest.js`, `src/models/chest.js`, `src/gameplay/Chests.js`, `src/gameplay/loot.js`.

- [x] Chest entity with an opening animation (the lid swings up, a squash, a glow inside), sparkle burst and sound; loot
      hops out onto the ground around it and coins go straight to the wallet.
- [x] Loot tables per chest type (Mossy / locked Lantern / boss Treasure chest) in config, with guaranteed items,
      weighted rolls, coins that grow per planet and planet-specific materials.
- [x] Placement per planet in config (`chests` in `config/planets.js`), away from the village and the boss lair, in the
      same spots every visit. House chests open their lids too. A boss chest falls where each boss is beaten: it
      holds the trophy, and the journey to the next planet waits until you open it (marked on the compass).
- [x] Opened state remembered for the adventure, so chests don't refill when you come back.
- [x] Locked Lantern chests need a Lantern Key: monsters drop one now and then while a locked chest waits (guaranteed
      after a few kills), and Old Bramble hands you his spare once.

## 8. Better items **(core)** ✓

**Goal:** items that matter for gameplay, not just healing.
Code: `src/config/items.js`, `src/config/crafting.js`, `src/items/` (gear, crafting), `src/gameplay/` (equipment, drops,
quickSlots, loot), `src/ui/` (InventoryUI, itemTooltip, itemArt), `src/models/items.js`.

- [x] **Equipment system:** weapon, armour and trinket slots shown in the bag, with stat bonuses (damage, max HP / mana,
      regeneration, armour, move speed; capped). Six hero weapons (two per hero), three armours, three trinkets.
- [x] Item rarities that affect stats: every piece rolls its own rarity when it drops; Uncommon x1.3, Rare x1.7,
      Legendary x2.3 its Common stats. Bag borders and names show the rarity.
- [x] Monster and boss drops: monsters sometimes drop food, materials, tonics or gear (tougher ones more often);
      chests can hold gear, and each boss chest holds a Rare-or-better piece for your hero.
- [x] Crafting from materials: the bag's Craft tab with 18 recipes (tonics, stews, draughts, tarts, Lantern Keys, all
      the gear), showing what you have and what's missing.
- [x] Better item art: an SVG icon and a 3D world model for each kind of item, tinted per item.
- [x] Quick-use slots for food and tonics on `6` `7` `8` (shown next to the ability bar; new snacks fill an empty key).

## 9. Better pet system **(core)** ✓

**Goal:** companions are a feature in their own right, not just a hero accessory.
Code: `src/config/pets.js`, `src/gameplay/Pets.js`, `src/gameplay/petAbilities.js`, `src/entities/companions/`,
`src/ui/petHud.js`, the bag's Pets tab (`src/ui/InventoryUI.js`).

- [x] Pets level up alongside the hero (pet level = hero level): +10% damage and more health per level.
- [x] Pet commands on `T` (or the pet card / Pets tab): follow, stay (guards its spot), attack my target, passive.
- [x] More pets: a fox (in your first Lantern chest), Glimmer the wisp (finishing the Humming Stones quest) and a dragon
      whelp (hatched from Pyrrhax's treasure chest), besides the owl and the wolf; any hero can take any unlocked pet.
- [x] Pet abilities on `V` with their own cooldown on the HUD pet card: Owl Scout (marks and shows every monster
      nearby on the compass), Wolf Howl (+20% damage), Fox Fetch (brings items over, sniffs out a chest), Wisp Mend
      (heals you over time), Whelp Flame Burst (area damage).
- [x] Pet care: rename them in the Pets tab, pet them with `E` (a heart, a happy hop and a little healing), a health bar
      on the pet card; monsters hit back when bitten, and a pet at 0 HP faints for 20s and bounds back healed.

---

# Round 2

Second batch of features (requested after TODO 1–9 landed). Several of them change the controls or the world itself,
so the order matters: **10** reworks the key layout that later items build on, **11** changes the planets that
**14**, **15**, **16**, Building (now **25**) and Portals (now **24**) place things on, and **Save / load** (now
**19**) becomes a must-have once players can build and travel back and forth. (Round 3 renumbered the open items.)

## 10. A much better HUD **(core)** ✓

**Goal:** a cleaner, more readable HUD in a familiar layout: items in a hotbar at the bottom centre (like Minecraft),
the hero's vitals right above it, and skills on the lower right.
Code: `src/ui/hud.js`, `src/ui/petHud.js`, `src/core/controls.js`, `src/config/controls.js`, `src/config/characters.js`
(ability keys), `src/gameplay/quickSlots.js`, `index.html`, `styles/main.css`.

- [x] **10.1 Fonts that fit Lanternmoss:** type chosen to express the game's identity, not just any nice-looking
      font. Lanternmoss is a cozy, storybook world of lanterns, moss and little planets, so the lettering should feel
      handmade, warm and a little magical. The choice should hold up on the title, the planet banners, names and
      numbers.
  - Pair it with a very readable body font for dialogue, tooltips and small HUD text.
  - Keep sizes and weights consistent across the HUD, menus and dialogue.
  - Before picking, write a short brief on the game's look and feel (mood words, references), and compare 2–3
    candidate pairings in a mock-up of the HUD and the title screen.
  - Done: the brief, the three pairings compared (Fredoka, Grandstander or Fraunces, each with Nunito) and the choice,
    **Grandstander + Nunito**, are in `docs/typography.md`. The specimen is in `docs/type-specimen.html`.
- [x] **10.2 Item hotbar** at the lower centre of the screen:
  - Numbered slots (`1`–`9`). Pressing a number selects that slot and the hero **holds** that item; clicking a slot does
    the same.
  - The hotbar is its own row, separate from the bag: the number keys cycle through the hotbar items, not the bag.
    Items move between the bag and the hotbar.
  - **Overrides the current number keys:** the number row no longer casts abilities (`1`–`5`) or quick-uses food
    (`6`–`8`). The hotbar replaces the quick-use slots.
  - Decide what "holding" does for each kind of item: food and tonics are used, weapons and tools are swung, and
    placeables are put down (needed by 18).
  - Done: the hotbar is the first 9 slots of the hero's inventory. Food and gear land there first; materials go
    in the bag. Press the held slot's number again, or right click, to use it: food and tonics are eaten, gear is
    equipped. Materials and keys show a hint about where they're used. Placeables wait for 25, and tools for 16. The held
    item's name shows above the vitals.
- [x] **10.3 Vitals above the hotbar:** health, mana / stamina / focus, level and XP sit just above the hotbar, centred.
- [x] **10.4 Skills HUD on the lower right:** skill icons with their names, cooldowns and keys.
  - Skills are triggered by **letter keys only**.
  - Needs a new key layout: today `1`–`5` are the main keys, and `E` (interact), `T` / `V` (pet), `C`, `H`, `M`, `X`,
    `I` and `P` are taken.
  - Option: basic attack on click plus `Q`, `R`, `F`, `G` (as now), with one more letter for the fifth skill.
  - Keybinds should be remappable in Settings.
  - Done: the skills are on click / `Z`, then `Q`, `R`, `F` and `G`. Every action is remappable in Settings → Keys: a
    key that's already in use swaps over, and `1`–`9` and `Esc` are reserved (`src/core/keybinds.js`). All key hints
    (the controls panel, prompts, dialogue, the pet card, the Controls page and character select) follow the bindings.
- [x] Move the pet card and boss bar so nothing overlaps the new layout. Done: the pet card is on the lower left and the
      boss bar at the top (toasts move below it). The centre slides left on narrow screens so it never reaches the
      skills. The Controls page, the character-select key chips, the README and the screenshots are updated too.

## 11. Better and bigger planets **(core)** ✓

**Goal:** worlds that feel like places, not balls: varied ground, more room, and terrain you can climb and wade into.
Code: `src/world/` (terrain, planet, placement, scatter, water), `src/physics/` (Walker, colliders),
`src/config/planets.js`, `src/systems/CameraSystem.js`.

- [x] **Not a perfect sphere:** stronger height variation (hills, valleys, cliffs, plateaus, ridges), different per
      planet, with smooth walking on slopes and limits on how steep a slope can be climbed.
  - Done: each planet's shape comes from seeded noise (`terrain` in `config/planets.js`): Lanternmoss has rolling
    hills, Emberfall has terraced mesas with cliffs, and Frostveil has ridged mountains (about -5 to +11 m). It's baked
    into a cube-map height field, so it's cheap to sample. Ground steeper than `WORLD.maxSlope` can't be walked up:
    you slide along it or jump. Cliff faces and peaks get their own colours.
- [x] **Bigger maps,** big enough that the planet no longer looks like a ball from the ground: a larger radius, a lower
      camera horizon, fog and draw distance tuned to match.
  - Done: the radius went from 40 to 72 (about 3x the ground), the fog was pushed out, and the hills break up the
    horizon. There's 3.2x the scenery, 1.5x the monsters, and more chests, forage and ponds plus big lakes. The boss lair
    is 100–130 m from the village. Three outer houses form a hamlet 30–58 m out.
  - Watch the performance budget (batching, culling, level of detail for scenery).
  - Spread spawns, chests and landmarks over the extra space.
- [x] **Rocks you can climb:** jump onto rocks and stand on them, using real tops and collision shapes instead of
      today's push-out cylinders.
- [x] **Water you can enter:** wade into ponds and lakes (slower movement, ripples and splashes, maybe swimming in
      deep water), instead of ponds acting as walls.
- [x] Re-check everything that assumes the current sphere: the boss arenas, waypoints and compass, house doors,
      villager paths and the camera's collision lift.
  - Done:
    - Rocks are solids with a top: you jump onto one and stand on it, and only rocks taller than a step block you.
    - Ponds have no wall any more: you wade (slower), then swim in deep water, with splashes and ripples. Their banks
      are gentle enough to walk out of.
    - The village, the stone circle, each boss arena, every pond and the outer houses are flattened.
    - Spawns, chests and forage stay off cliffs.
    - Aiming rays reach over the taller hills.
    - Shadows lie on rock tops and water.

## 12. Pet selection **(core)** ✓

**Goal:** choosing a pet is a moment of its own, not just a tab in the bag.
Code: `src/ui/CharacterSelect.js`, `src/gameplay/Pets.js`, `src/ui/InventoryUI.js` (Pets tab).

- [x] Choose your pet at the start: a pet step on the hero-select screen, or a pet picker right after it, with each
      unlocked pet shown in 3D, its ability and its stats.
  - Done: character select has two steps, the hero and then the pet. Every pet is listed, and locked ones say how to
    find them. The chosen pet comes round in front of the hero to show off, next to its detail panel: role, body,
    health, strike damage, rate and reach, what its strike does, and its ability with key and cooldown. You can rename
    it there. Esc goes back a step.
- [x] A pet menu during play: a showcase of the pet, swapping, renaming, and how to find the locked pets. It could
      be reached from the pet card.
  - Done: `B` (remappable) or a click on the pet card's face or name opens it (`src/ui/PetMenu.js`). The world
    pauses while the camera holds on the pet, which keeps idling (wags, flaps). From there you can swap pets (the new
    one appears right away), rename them, give commands and see how to find the locked ones. Indoors, or while the pet
    rests, the menu opens without the showcase.
- [x] Remember the chosen pet per hero.
  - Done: `gameplay/petPicks.js` saves `{ hero: pet }` in localStorage, and it's kept across adventures. Picking a
    hero brings back their pet if it's unlocked in this adventure, otherwise their own.
- [x] Keep the bag's Pets tab or fold it into the new menu, but have only one place for each action.
  - Done: the bag's Pets tab is gone, and the pet menu is the one place for all of it. The HUD pet card keeps its
    quick command and ability buttons.
- [x] **No camera orbit when choosing a hero or a pet.** The camera stays still, with a fixed framing of the hero or
      pet, instead of circling around them. This also changes the current hero-select screen, which slowly orbits
      the hero (`src/ui/CharacterSelect.js`, `orbitCamera` in `src/systems/CameraSystem.js`).
  - Done: `setShowcase` eases the camera to a fixed framing, then holds still. Dragging on the hero step turns the
    hero, not the camera. The framings live in `src/ui/showcase.js`: the camera aims at the pet's spot rather than
    the pet, so its hops don't move it. If a lamppost, house or hill would block the view, the hero turns to a clear
    heading first, and wandering critters keep out of the shot. Only the title screen still orbits.

## 13. Achievements and bestiary **(core)** ✓

**Goal:** a journal that rewards exploring and fighting, and teaches you about the monsters.
Code: new `src/config/achievements.js`, `src/gameplay/Journal.js`, `src/ui/` (journal screen, toasts); listens on
`src/combat/events.js` and `src/core/events.js`.

- [x] **Achievements:**
  - Firsts: the first boss, the first Legendary piece, the first crafted item, every pet found.
  - Counts: monsters defeated, chests opened, quests done.
  - Challenges: beat a boss without being hit, at a low level, without a pet.
  - A toast and sound when one unlocks; maybe small rewards (titles, coins, cosmetics).
  - Done: 20 achievements in `config/achievements.js`.
    - Firsts: monster, boss, all three bosses, chest, craft, Legendary, every pet, every monster.
    - Counts: monsters, chests, quests, crafts, kinds of item.
    - Challenges: no hit, no pet, a low level (3 / 5 / 7, by planet, measured when the fight begins). Kills of a
      boss's summoned helpers don't count, so they can't be farmed.
    - Each one pays coins. A banner slides in with a fanfare, and several in a row queue up.
- [x] **Bestiary:**
  - An entry per monster and boss, filled in as you meet and defeat them.
  - Each entry has a 3D or portrait view, where it lives, its stats, its attacks and how to counter them, what it drops,
    and how many you've defeated.
  - Unseen monsters show as silhouettes.
  - Done: a page per monster and boss, with the words in `config/bestiary.js`.
    - Portraits are rendered once from the real models (`ui/monsterPortraits.js`), and are silhouettes until you meet
      the monster (within 16 m).
    - Once met: where it lives, how it fights and how to beat it. Once beaten: stats per planet it lives on, drops,
      and how many you've defeated.
- [x] A journal screen (from the pause menu, or its own key) with tabs: Achievements, Bestiary, and maybe a Collection
      of the items found.
  - Done: `J` (remappable), Journal on the pause menu, or Journal on the title screen. During play it pauses the
    game. The tabs:
    - Achievements: progress bars, rewards, the date earned, and lifetime totals.
    - Bestiary: the pages above.
    - Collection: every item, with the ones found in colour and a gem on gear found at Legendary rarity.
    - "Start the journal over" erases it (it asks twice).
- [x] Saved with the rest of the game (needs Save / load, 19).
  - For now: the journal saves itself to localStorage (`lanternmoss.journal`, cleaned on load) and is kept across
    adventures, so it doesn't wait on Save / load. Fold it into the save system when that arrives.
  - Decided (Round 3): the journal is per device, not per adventure, so it keeps saving itself and stays out of the
    adventure save (19).

## 14. Better fights **(core)** ✓

**Goal:** fighting feels natural, and bosses feel earned and part of the world, not just a lair at the far side of the
planet.
Code: `src/combat/targeting.js` (`aimDirection`, soft lock-on), `src/combat/aiming.js`, `src/combat/casting.js`,
`src/gameplay/PlanetProgression.js`, `src/combat/spawning.js`, `src/config/planets.js`,
`src/entities/enemies/behaviors/boss/`.

- [x] **Aim where the hero is facing, not where the camera looks.** Today, aiming and attacks follow the camera angle.
      Instead:
  - Attacks, projectiles and the soft lock-on go in the direction the character faces.
  - Aimed abilities place their marker in front of the hero.
  - Turning the hero (with movement keys or the mouse) is how you aim.
  - Rotating the camera only changes the view.
  - Done:
    - The soft lock-on cone and every attack follow the hero's facing (`combat/targeting.js`).
    - A click turns the hero to face the clicked ground before the basic attack.
    - Aimed ultimates put their marker ahead of the hero, or on the monster in line; the wheel moves it nearer or
      farther (`combat/aiming.js`).
    - Dragging the camera never moves the aim.

- [x] **Conditions before a boss appears**, set per boss in config:
  - a minimum hero level (e.g. Pyrrhax won't show below level 4);
  - a quest done or villagers helped;
  - sigils or keys collected from the planet's elites;
  - lair seals to break;
  - a time of day (Malgrath only rises at night).
  - Done: `PLANETS[i].boss.summon` (`config/bossSummon.js` explains each kind; runtime `gameplay/BossGate.js`).
    - Gloomcap: level 2 and 3 Thorn Seals (lair objects) to break.
    - Pyrrhax: level 4 and 3 Ember Sigils, carried by 4 golden elites (the planet's farthest monsters, made tougher).
    - Malgrath: level 6, Tuva's quest done, and only at night (a ready lair slips back to sealed if morning comes).
- [x] Until a boss's conditions are met, its lair is sealed or empty. Show what's still needed (on the compass, in
      villager dialogue, on a lair marker).
  - Done:
    - The boss sleeps hidden and untouchable. The lair has a grey beacon and a rune ring, which glow in its colour once
      it can be woken.
    - A status chip lists each condition with progress. The compass points at the sealed lair, and at elites while
      sigils are needed.
    - Each villager gives a hint once per planet about what's still missing.
- [x] **More immersion:**
  - A summoning or arrival sequence: the camera frames the boss, its name card appears, the music changes.
  - Arena boundaries during the fight (a ring of fire or thorns); villagers who react before and after.
  - Boss lore in the bestiary.
  - Done:
    - The waking sequence: the camera frames the lair, the boss rises, its name card shows, and battle music (drums
      and bass) replaces the cozy pad until the fight ends. The hero can't act or be hurt during it.
    - A ring of thorns (Lanternmoss) or fire (Emberfall, Frostveil) rises around the arena while the boss fights, and
      holds you in.
    - Villagers hint before the fight and cheer after.
    - Bestiary boss pages have lore and "To wake it".
- [ ] Optional harder versions (rematches through portals, at a higher difficulty) with better loot.
  - Waits on portals (24): today a beaten planet is left behind, so there's nowhere to rematch from yet. Planned in 31.

## 15. Better environments **(core)** ✓

**Goal:** the planets feel alive and varied: more plants, more creatures to meet, rare finds, weather, and a couple of
fearsome mini bosses out in the wilds. And pets get a little more room to grow.
Code: `src/world/scatter.js`, `src/world/props.js`, `src/world/sky.js`, `src/entities/wildlife/`,
`src/config/critters.js`, `src/config/combat.js` (mini bosses), `src/config/pets.js`, `src/models/creatures.js`.

- [x] **15.1 Environment**
  - [x] **More variety in trees:** more shapes, sizes and colours, different per planet.
    - Done: nine kinds (`config/flora.js`, drawn in `world/props.js`), each planet with its own mix (`flora.trees`):
      - Lanternmoss: blossoms, oaks with fruit, spiral pines, mushroom trees, willows by the water, birches.
      - Emberfall: glowing ember trees, crystal spires.
      - Frostveil: snow-capped pines, birches, crystal spires.
      - About 7% grow as giants.
  - [x] **Grasses:** grass tufts, tall grass and flowers across the meadows.
    - Done: more grass tufts, patches of knee-high tall grass out in the wilds, and wildflowers in the planet's colours.
      All sway with the wind (a shader on the instanced meshes) and lean harder when the weather is windy.
  - [x] **More friendly creatures:**
    - Fish (in ponds and lakes).
    - Land creatures.
    - Birds.
    - Rare creatures with rare drops.
    - Done (`config/critters.js`, `PLANETS[i].wildlife`):
      - Bunnies and hares that hop away, deer and reindeer that bolt from far off, frogs that ribbit by the ponds, and
        lizards that scurry in bursts.
      - Each planet has its own birds, plus flocks wheeling high overhead. Its own fish, and a big golden koi in each
        lake.
      - One rare creature per planet (Golden Moonbunny, Ember Salamander, Aurora Hare). It bolts if you run at it;
        walk up slowly and press `E` to befriend it. The first time in an adventure it gives a Legendary charm
        (Golden Clover, Ember Scale, Aurora Feather), after that a rare loot roll. Then it turns up elsewhere later.
  - [x] **Special mini bosses** out in the wilds, apart from each planet's boss:
    - A hydra.
    - A basilisk.
    - Done: both run on the boss framework, with no beacon and no planet progression.
      - The Hydra keeps to the far lake (Lanternmoss, plus an ice-blue Frost Hydra on Frostveil). It bites, spits
        homing acid and sweeps its heads, and grows a new head at 66% and 33% health.
      - The Basilisk roams Emberfall's wilds. Its gaze turns you to stone if you're facing it when its eyes flare, so
        turn your back: this uses the facing-based aiming from 14. It also has a tail whip, a lane lunge and venom.
      - Both always leave a rare loot roll, show the big health bar and a compass mark nearby, and have bestiary pages
        with lore.
  - [x] **Weather:** variations such as rain, snow, fog and wind, different per planet.
    - Done (`config/weather.js`, `world/weather.js`): clear, breezy (drifting petals), rain, storm (lightning and
      thunder), fog, snow, blizzard and ashfall. Each planet has its own mix of these.
      - A spell lasts 70–150 s and blends into the next.
      - Weather sets the wind, fog distance and colour, sky tint and light, and plays rain and wind sound loops.
      - The time chip shows the weather. It's for mood only and changes no rules.
- [x] **15.2 Pets extension**
  - [x] **Swap pets during play.** The pet menu (12) already swaps pets with the world paused; this asks for swapping
        right in the game as well (for example a key that cycles through your unlocked pets).
    - Done: `N` (remappable) brings out the next unlocked pet right away, with a short wait between swaps.
  - [x] **A new pet: a dragontoad.**
    Reference: https://preview.redd.it/gah9a6dys5q51.png?width=3000&format=png&auto=webp&s=0648643054a264b4a9f86bdf1e029a3fcdf5e5ab
    - Done: Puddle the dragontoad (`models/creatures.js` `buildToad`).
      - Looks: a squat green toad with a cream belly, horns, orange back spines, little bat wings and a spade-tipped tail.
      - Moves: hops after you and flaps its wings in the air. Its sticky-tongue strike slows monsters.
      - Bellow: knocks back, hurts and stuns every monster near you.
      - Unlock: its egg hatches when you defeat the Hydra.
      - Caveat: the reference image couldn't be viewed from here, so the look follows the name. Tell me what to
        change.

## 16. Resources and survival **(core)** ✓

**Goal:** the hero needs supplies to survive and thrive, so gathering and cooking matter.
Code: `src/config/items.js`, new gathering systems in `src/gameplay/`, `src/world/` (resource nodes),
`src/gameplay/itemUse.js`.

- [x] **Needs:** a hunger or energy meter (gentle, cozy-friendly: running low slows regeneration and sprinting rather
      than killing you), plus potions and food that matter more in long expeditions.
  - Done (`config/survival.js`, `gameplay/Needs.js`): an Energy bar beside the XP bar.
    - It drains slowly while you play (full to empty in about 17 minutes), faster sprinting or swimming.
    - Under 30% you're Hungry: half healing and a slower sprint, a status chip and a pulsing bar. Empty means no
      healing and a sprint barely faster than walking. It never hurts you. Fainting wakes you with some energy.
- [x] **Expand the consumables:**
  - Meals with buffs, potions (healing, mana, resistance, speed).
  - Planet-specific foods; spoil-free by default.
  - Done: every food fills energy.
    - Meals: grilled fish, sun bread, veggie stew (Mending), pumpkin pie (Mighty), koi feast (Stoneskin, heals, fills
      you up).
    - Planet foods: fire peppers and the Ember Skewer on Emberfall, snow plums and Plum Porridge (Quickstep) on Frostveil.
    - Potions: Healing, Starwater (mana), Stoneskin Tonic (resistance), Quickstep Tonic (speed).
    - New buffs (`config/game.js` `BUFFS`) show in the status row. Nothing spoils.
- [x] **Gathering** with tools (held from the hotbar, 10.2):
  - Foraging: herbs, berries, mushrooms.
  - Woodcutting: trees give wood.
  - Mining: rocks and ore veins give stone, ores and gems.
  - Fishing: ponds, with a small catch timing game.
  - Done (`config/resources.js`, `gameplay/Gathering.js`, `Fishing.js`):
    - By hand: fallen branches (wood) and loose stones (stone) near each village, so your first tools need no tools.
      Also sweetleaf (sometimes seeds), berry bushes (moonberries, fire peppers, snow plums), glowcaps, frost flowers.
    - Tools are held from the hotbar. `E` uses the right one from the hotbar (and holds it); right click / its number
      again works whatever is in front of you. The hero swings it, the thing wobbles, chips fly.
    - Axe: every tree but crystal spires gives wood, then rests. Pickaxe: rocks give stone. Copper and ember veins need
      a Stone Pickaxe; iron and gem veins need a Copper Pickaxe.
    - Fishing: cast at a pond or lake and wait for the float to dip. Press `E` (or click), then stop the swinging needle
      in the green. Each planet has its own fish, and a rare Golden Koi (likelier in lakes) with a smaller zone.
- [x] **Farming:** till soil, plant seeds, water them, and harvest over day / night cycles; a plot in the village.
  - Done (`gameplay/Farm.js`): a fenced farm of six plots by each village, with a scarecrow.
    - Till with a hoe, plant seeds (moon carrots, sun wheat, pumpkins), water with a can. Rain and snow water every plot.
    - A crop grows only on a day it's watered; a new day dries the soil. It takes 0.6 to 1.3 days, and sleeping
      through the night counts.
    - Seeds come from Pim's shelf, sweetleaf and chests. Pim's new quest, First Harvest, starts you off and ends with
      a straw hat.
- [x] Resource nodes regrow over time; the rarer nodes are on later planets or behind challenges.
  - Done: nodes regrow in 2 to 10 minutes (fruit first, or the whole thing).
    - Iron veins appear from Emberfall on.
    - The gem veins (amethyst, fire opal, frost diamond) sit by each planet's mini boss and need a Copper Pickaxe.
- [x] **Equipment system:** players can pick up, craft or be given armour, vanity items and accessories, and equip
      them. (Today there are three slots: weapon, armour and trinket, from TODO 8.)
  - Done: eight worn slots (`config/items.js` `EQUIP_SLOTS`): head, body, feet, weapon, two trinkets, and the vanity
    hat and cape.
    - New pieces: hoods, helms and circlets, boots, gem trinkets. Vanity: straw hat, flower crown, toad cap, leaf
      cape, starry cape.
    - Vanity is drawn on the hero (`models/vanity.js`; the witch's hat comes off for it) and adds no stats.
    - Found in chests (the starry cape), dropped (the Hydra's toad cap), crafted, or given (Pim's straw hat).
- [x] **The right side of the inventory is the equipment side,** like Minecraft: the worn pieces sit in slots beside
      the bag grid.
  - Done: your hero, rendered in their hat and cape, stands between the head / body / feet and weapon / trinket
    columns, with the vanity row and the gear's totals under them. Select a bag item and the slots it fits light up;
    click one to wear it there.
- [x] **Move the item description window** that shows now so it sits right under the whole inventory window.
  - Done: it's its own little window under the bag.

## 17. More crafting, part 1: stations and smelting **(core)** ✓

**Goal:** turn raw resources into better things through several crafting stations.
Code: `src/config/crafting.js`, `src/items/crafting.js`, `src/ui/InventoryUI.js` (Craft tab), new station props.
The open half of this item (brewing, magic, cooking, recipe discovery) moved to **22. More crafting, part 2**.

- [x] **Stations:** a workbench, a furnace or forge (Cinder's anvil), a cooking pot, and a brewing stand. Some recipes
      need you to stand at the right station.
  - Done (`config/stations.js`, `gameplay/Stations.js`, `models/stations.js`): every village has a crafting corner, a
    row of all four stations a short walk from the square (clear of the farm and the resource nodes).
    - Workbench: the wooden weapons and light armour (hood, cloak, boots).
    - Forge and Anvil: metal tools (copper pickaxe, watering can), Emberfall and Frostveil weapons and armour, and
      every trinket with metal or a gem.
    - Cooking Pot: all the hot meals. Brewing Stand: the potions and tonics.
    - By hand, anywhere: the first tools (axe, stone pickaxe, hoe, fishing rod), the glowcap tonic and moonberry tart,
      the vanity pieces and the lantern key.
  - `E` at a station opens the Craft tab on its recipes. Chips filter the tab (All, By hand, each station), a star marks
    the one you're at, and recipes show a station tag. Away from it they won't craft, and the message says where to go.
  - The coals glow and spark, the pot steams, the flasks bubble, and making something bursts in the station's colour.
    The compass shows the corner (and the farm) near the village.
  - Not done: a forge only in Cinder's smithy. Every village gets the same corner, so the forge isn't tied to Cinder.
- [x] **Smelting:** ore to ingots (with fuel), which are used in tools, weapons and armour.
  - Done (`config/crafting.js` `fuel`, `FUEL`; `items/crafting.js` `fuelIn`, `fuelToBurn`): the forge's Smelting group.
    - 2 copper ore + 1 fuel makes a copper ingot; 2 iron ore + 2 fuel makes an iron ingot.
    - Fuel is whatever burns in the bag: wood (1), ember shards (2), charcoal (3). Plain wood goes first. Charcoal is
      3 wood burned down into 2 charcoal at the forge.
    - The Craft tab shows a 🔥 have / need chip; without enough fuel it won't smelt and says so. Item details name a
      fuel's burn.
  - Ingots replace raw ore in the metal recipes:
    - Copper: watering can, copper pickaxe, the Starfall Staff, Frost Circlet, Lantern Pendant, Amethyst Band.
    - Iron: Ember Greataxe, Frostwind Bow, the Ember helm, mail and greaves, Snowstep Boots, opal and diamond settings.
  - New tools from ingots: an Iron Axe (axe tier 2) and an Iron Pickaxe (pick tier 3). A tool better than a node needs
    takes fewer swings (an iron pick breaks a copper vein in one).

---

# Round 3: the plan from here

Written on 2026-10-08 after a review of the whole list. Items 1–17 are done and keep their places and numbers.
Everything still open is renumbered **18–41** in the order I suggest building it, in six phases. The plan adds three
new worlds (**27**, **30**, **32**) and the groundwork they need (**26**).

**Sizes**, measured against items already built: **S** is smaller than smelting; **M** is about pet selection (12);
**L** is about resources and survival (16); **XL** is bigger than anything built so far. Coding has been fast, but
playtesting and balancing don't speed up the same way, so read L and XL as optimistic.

| Phase | Items | Why here |
|---|---|---|
| **A. Foundations** | 18 Gameplay checks · 19 Save / load · 20 Performance budget | Stop the debt growing before more content lands. |
| **B. A good first hour** | 21 Tutorial · 22 Crafting, part 2 · 23 Balance pass | Make the three worlds you have play well first. |
| **C. Travel and a home** | 24 Portals · 25 Building | Per-planet state, and the way into the new worlds. |
| **D. New worlds** | 26 Groundwork · 27 Tidewhisper · 28 Hero depth · 29 Caves · 30 Duskhollow · 31 After the last boss · 32 The Lantern Moon | The expansion, one world at a time. |
| **E. Cozy depth** | 33 Friendship · 34 Bounties · 35 Pet care · 36 Living village · 37 Museum · 38 Festivals · 39 Photo mode | Independent: pull any forward as a break between worlds. |
| **F. Reach** | 40 Mobile · 41 Multiplayer | Biggest rewrites; they need a stable game under them. |

**Why the big moves** (so you can disagree with them):
- **Save / load jumps from 20 to 19,** behind only the sims (18). Every item since 13 added state that a refresh throws
  away, and every item after this adds more, so it will never be cheaper than now. The sims go first because save / load
  touches every system and needs a safety net. The performance budget (20) comes before any new content because the
  worlds and mobile will both be judged against it.
- **Balance (23) is promoted from Suggested additions and placed before the new worlds,** because the worlds extend
  the level and difficulty curve from wherever 23 leaves it. Tuning six worlds at once is much harder than tuning three
  and then extending.
- **Portals (24) now come before Building (25).** Portals bring per-planet state, which Building also needs, and
  portals are how the new worlds are reached. Building is split so a small "home of your own" ships first.
- **The new worlds start with a groundwork item (26), and the first world (27) is a test run** with a go / no-go check
  before the next. Hero depth (28, was 30) and caves (29, was 28) sit between the worlds because they're prerequisites:
  talents give the new levels (11–16) something to spend points on, and the caves build the darkness tech that Duskhollow needs.
- **Cozy depth (33–39) comes after the worlds but blocks nothing.** These are the old suggested items 24–27, 29, 32 and 33. The only
  hard order is Pet care (35) after Cooking (22). Bounties (34) and Friendship (33) are the cheapest wins if you want a
  break.
- **Mobile and Multiplayer stay last** (40, 41; were 21, 22). Both cost more with every screen and system added,
  but both are also the riskiest to start halfway through. Mobile gets a cheap rule to follow from today (see
  *Rules from here on*). Multiplayer gets a decision gate at the end of phase A (risk 1 below).

**Old number → new:** 17 (open half) → 22 · 18 → 25 · 19 → 24 · 20 → 19 · 21 → 40 · 22 → 41 · 23 → 21 · 24 → 33 ·
25 → 38 · 26 → 35 · 27 → 37 · 28 → 29 · 29 → 34 · 30 → 28 · 31 → 31 · 32 → 36 · 33 → 39. From Suggested additions:
gameplay checks → 18, performance budget → 20, both balance passes → 23. New: 26, 27, 30, 32.

**Assumptions** (one line each; overrule any of them):
- 17 is split: stations and smelting stay as 17 (done); brewing, magic, cooking and recipe discovery become 22.
- 2a's "Remappable keys" was finished by 10.4, so it's checked.
- Malgrath stays the end of the first act. The new worlds are a second act, reached through the portals once he falls.
- The new worlds are **(core)**: they were asked for, not suggested.
- The audio stays procedural: "no asset files" is part of Lanternmoss's identity (README). Each world gets a theme made in code.
- Settings, keys, the journal and remembered pets stay per device, outside the adventure save.
- Monsters respawn when you come back to a planet. Chests, beaten bosses and anything built stay as you left them.
- Multiplayer stays **(core)** but last, behind a decision gate.

## Plan-wide risks and recommendations

Ranked by how likely each is to cause trouble. The items they affect also have inline notes.

1. **Multiplayer (41) is the item most likely to cause trouble.** The game is built for one hero: `ctx.player`
   appears 265 times in `src/`, monsters target that one hero, the pet menu and the journal pause the whole world, and
   two machines would roll every random number differently. 18 routed all randomness through one seedable stream,
   which is a start but not shared state. Every item before 41 adds more of this.
   **Recommendation:** decide by the end of phase A. If it stays core, spend at most three days on a spike right
   after 19: two heroes and one goblin over a host-authoritative WebRTC link, reusing the save's `toJSON()` / `load()`
   pairs as the snapshot format. If the spike can't produce a fair goblin fight in that time, mark 41 **(stretch)** and stop
   paying for it. Either way, don't leave it last *and* core.
2. **Save / load (19) gets bigger with every feature.** Farm plots, equipment, gathered nodes, quests, stations, pets,
   the day clock, and soon tides, lamps and placed things.
   **Recommendation:** do it next, with a registry (each stateful system registers `{ key, toJSON, load }`), a
   round-trip test per system, and a test that fails when a new system keeps state without registering. Keep a fixture
   save in `tests/fixtures/` so old saves are proven to load after every format change.
3. **The code assumes three planets in a fixed order.** `entities/npc/npcDefs.js` checks `s.planet === 1` and
   `=== 2` (lines 65–160), `models/villagers.js:121` dresses villagers by index, `core/Game.js:84,89` starts on
   `PLANETS[0]`, `config/achievements.js` has `allBosses` at 3 and `BOSS_CHALLENGES.lowLevel = [3, 5, 7]`, and
   Frostveil's tagline calls it "the last". Portals break "index = progress", and new worlds break "three".
   **Recommendation:** in 19, give planets ids (`'lanternmoss'`, `'emberfall'`, `'frostveil'`), save the ids, replace
   index checks with `s.planetId === 'emberfall'`, and move per-planet lists (outfits, low-level targets) into the planet
   config. Add a test that fails on `planet === <number>` in `src/`.
4. **The new worlds (26–32) need a lot of content.** By the standard items 11–16 set, a world is much more than a new palette. Each one needs:
   terrain, 3–4 new monsters (each a new AI behaviour and a new body builder), a boss AI (the existing ones are 160–380
   lines each), a mini boss, 2–3 tree kinds, critters, a rare creature, birds and fish, weather, nodes, a material,
   food, gear, a local villager with a quest, bestiary pages, achievements, music, first-arrival lines for every
   travelling villager, and a mechanic. The cross-cutting systems (bounties, museum, festivals, gifts) then want data
   for each world too.
   **Recommendation:** three worlds, not more (a fourth is parked in Suggested additions). A test enforces the content
   checklist (26), so no world ships half-filled or as a reskin. The first world is a test run with a go / no-go check.
   The cross-cutting systems generate their data from the planet config (bounties from the roster and nodes, museum shelves from fish
   and veins) instead of hand-writing it for each world.
5. **Balance and difficulty scaling.** The level cap (10) and XP curve (2308 XP to the cap) were set for three planets.
   Enemy stats multiply per planet (hp 1 → 1.6 → 2.4, damage 1 → 1.35 → 1.75), and none of it has been played through
   together. Carrying on with those multipliers turns monsters into damage sponges by world 5.
   **Recommendation:** 23 sets measurable targets that the sims (18) report per hero: a regular monster falls in 2–6 s at
   the planet's expected level, a mini boss takes 1.5–3 min, a boss 3–5 min, and you arrive at each boss near its summon
   level without grinding. New worlds grow at about +20% per world. Their difficulty comes from mechanics and monster
   behaviour, not bigger numbers (26 has starting values).
6. **Performance isn't measured.** The planets are already 3x bigger with 3.2x the scenery, the weather spawns up to 2200
   particles, and nothing measures frame time. New worlds add unique meshes, Duskhollow wants many lights, and mobile
   wants less of everything.
   **Recommendation:** 20 records a budget before any new content, and every world must stay inside it (it's on the
   checklist in 26). Duskhollow's lights are faked in shaders (29): in three.js each real point light costs every lit
   pixel, and changing the number of lights recompiles every material.
7. **Scope creep in Building (25) and Magic (22).** Walls, floors and roofs on a round, hilly planet, with collisions,
   the camera and saving, is a game of its own. Rarity upgrades break the rarity-scaled loot from 8 (any Common could
   become Legendary, so drops stop being exciting).
   **Recommendation:** Building ships in stages, and the structures stage has its own go / no-go check. Magic drops
   rarity upgrades and keeps to one enchantment slot per piece.
8. **Per-planet state (24).** Today a planet is rebuilt from its seed every time you arrive. Saving whole planets would be big and
   fragile.
   **Recommendation:** store only what changed from the seed: opened chest ids, gathered node ids with the time they regrow,
   farm plots, lit lamps, placed things. Ids come from the seed and placement order. Add a test that builds a planet twice from the same seed and checks that
   every id matches.
9. **Schedule.** There are 24 open items: seven L and three XL (one of them XL+). Content and playtesting are the bottleneck, not code. The
   README rule (refresh the tour and retake the screenshots after every major update) adds time to every item, and that grows with
   every world.
   **Recommendation:** add a playtest checkpoint at the end of each phase: play the whole game once with one hero, list
   what's broken, and fix it before the next phase. Let `scripts/screenshots.mjs` take a list of shots, so only the
   affected ones are retaken.
10. **The tests check the data, not the game.** The 113 unit tests cover configs and rules. Fights, bosses and AI are only
    checked by sims that live outside the repo, and one of those checks is random (the dragon's "uses every move").
    Save / load, portals and the new monster AIs will all touch that code.
    **Recommendation:** 18, first.

## Rules from here on

Cheap habits that keep the expensive items (19, 26, 40, 41) from getting more expensive:
- **No hover-only UI.** Details open on click or tap; hover may add to that, never replace it (for 40).
- **New state registers with the save** (19) the day it's added, with a round-trip test.
- **Planets by id, never by index** (risk 3).
- **Weather stays mood only.** Anything that changes the rules (tides, darkness, gravity) is a planet mechanic (26),
  which may read the weather.
- **Randomness goes through the play stream** (`rng` / `mr` / `mpick` in `src/utils/random.js`, 18), never
  `Math.random()`; a unit test enforces it.
- **New planet content passes the checklist** in 26.

---

# Phase A: Foundations

## 18. Gameplay checks in the repo **(core)** ✓

**Goal:** the headless game simulations (the "sims") that check fights, bosses, items, survival and stations live in the repo and run with
one command, so the big changes ahead (save / load, portals, new monster AIs) can't quietly break the game.
Code: `tests/sim/`, `package.json` (`npm run sim`), `src/utils/random.js` (the play stream).
Promoted from the suggested additions. **Size:** S. **Needs:** nothing.

- [x] Move the sims (environment, fights, bosses, items, survival, stations and others) into `tests/sim/` with a shared
      headless setup, and add `npm run sim`.
  - Done: 18 sims in `tests/sim/*.sim.mjs` (bosses, bossGate, characterSelect, chests, combat, environment, houses, hud,
    items, journal, menus, pause, petMenu, pets, stations, survival, terrain, villagers). The shared fake browser,
    module loader and render stub are in `tests/sim/lib/`, with paths relative to the repo.
  - `npm run sim` runs them six at a time, each in its own process, and sums up (about 2 minutes). Name some to run only
    those, `--verbose` prints everything, and the exit code is 1 on any failure.
  - `three` is now a dev dependency (0.160.0, the version in the import map), so `npm install` is all a fresh clone
    needs. `node_modules/` is ignored.
- [x] **A seeded `rng()`** in `src/utils/rng.js`, used by the AI, loot and spawning code the sims touch. Make the
      dragon's random "uses every move" check reliable with a fixed seed.
  - Done in the existing `src/utils/random.js` rather than a new file: its runtime stream (`rng`, `mr`, `mpick`) can now
    be seeded with `seedPlay(seed)`. It's still `Math.random` in the browser.
  - All 108 `Math.random()` calls in 36 files now go through it. `tests/random.test.mjs` fails if one comes back.
  - The sims seed it (`SIM_SEED`, default 1), and seed `Math.random` separately for their own bots, so a run plays out the
    same every time. The dragon check passes on seeds 1–10; its fight is now 160 s instead of 120, because the leap is
    rare (1–2 per fight).
- [x] **Numbers, not only pass / fail:** the sims print time to kill per monster and hero, boss fight length and damage
      taken. The balance pass (23) uses them as its targets.
  - Done: `npm run sim -- balance` (`tests/sim/balance.sim.mjs`, about 7 minutes, not part of the default run). A bot
    fights each planet's monsters, mini boss and boss with each hero at the boss's summon level and prints a table of
    time to kill, damage taken, deaths and HP top-ups. The first findings are under 23.
- [x] While here, from Small fixes: add a `favicon.ico` (the server returns 404 for it).
  - Done: a 32 px lantern in the game's colours with an ink outline, linked from `index.html`.

## 19. Save / load **(core)** ?

**Goal:** an adventure survives closing the browser: come back and carry on where you left off.
Code: new `src/core/save.js` (format, versions, cleaning on load), `src/core/Game.js` (gathering and restoring state),
`src/ui/MainMenu.js` (Continue), `src/ui/PauseMenu.js`; every system with state gets a `toJSON()` / `load()` pair
(the inventory already has one).
Unlocks **Continue** on the title screen (3); needed by 24 (per-planet state), 25 (building) and 41 (multiplayer
snapshots). **Size:** L. **Needs:** 18.
**Risk:** it grows with every feature (risk 2), and indices saved today break with portals and new worlds (risk 3).
**Recommendation:** ids first, a registry and round-trip tests, and a fixture save checked into the repo.

- [x] **Planet ids first:** `'lanternmoss'`, `'emberfall'`, `'frostveil'`; `ctx.planetId` next to `ctx.planet`. Replace
      the index checks in `npcDefs.js`, `models/villagers.js`, `Game.js` and `achievements.js` (risk 3), and add a test
      that fails on `planet === <number>`.
- [x] **What's saved:**
  - The adventure: current planet, hero, level, XP, coins, health and mana.
  - The bag, the hotbar and the gear worn.
  - Pets: unlocked, names, the one out, the command, health.
  - Progress: quests and challenges, story state (what villagers know), opened chests, bosses beaten, the day clock.
  - The survival state: energy, farm plots, gathered nodes and their regrow times, active buffs.
  - A per-planet section in the format from day one, keyed by planet id, even before 24 fills it.
  - Later: each planet's own state (24) and what's been built (25).
- [x] **A save registry:** each system registers `{ key, toJSON, load }`; a test fails if a system with state isn't in
      it, and each one has a round-trip test (`load(toJSON(x))` gives `x` back).
- [x] **When:** autosave on arriving at a planet, after a boss, on quitting to the menu, and every few minutes; a
      "Save" button on the pause menu too. A small "Saved" note when it happens.
- [x] **Continue** on the title screen loads the save (and starts a new adventure only after asking, if one exists).
- [x] **A safe format:** versioned, and cleaned on load like the settings (unknown items, pets or planets dropped,
      numbers clamped), so an old or broken save never crashes the game. Unit-tested, with a fixture save in
      `tests/fixtures/` that must keep loading after every format change.
- [x] Settings, keys, the journal and remembered pets already save themselves; decide whether they join the save
      or stay separate (they're per device, not per adventure).
  - Decided (Round 3): they stay separate, per device. The adventure save holds only the adventure.
- [x] One save slot with an explicit slot field, and export / import a save as a file.
  - Start with one slot, but make the slot a field in the format. Export / import is cheap and helps with bug reports,
    so do it in this item; extra slots are deferred.

Implementation notes: [save format and ownership](docs/save-format.md), version-1 fixture, registry coverage and
real-system round trips. House interiors, active challenges and uncollected boss loot restore without replaying rewards.

## 20. Performance budget **(core)** ✓

**Goal:** know how fast the game runs, and keep it that way as the worlds grow.
Code: new `src/ui/perfOverlay.js`, `src/config/settings.js` (density settings), `src/config/render.js`,
`src/config/weather.js` (`counts`), `src/world/scatter.js`.
Promoted from the suggested additions. **Size:** M. **Needs:** 18.
**Why now:** the planets keep growing (11 noted "watch the performance budget"), and both the new worlds (26) and Mobile
support (40) need numbers to stay under.

- [x] **A frame-rate overlay** (a setting, or a key): fps, frame time, draw calls and triangles (`renderer.info`).
- [x] **Set the budget:** measure the busiest scene on each planet (the village at night in the heaviest weather) and
      record it as the ceiling. The target is a steady 60 fps at 1080p on integrated graphics (Iris Xe class) at the
      default quality. Write the numbers down in `docs/performance.md`.
- [x] **Density settings per feature** (scenery, grass, resource nodes, particles, weather counts), tied to the
      quality preset from 2a, so lower presets draw less, not only at a lower resolution.
- [x] Batching, culling and level of detail where the overlay shows the need (scenery first).
- [x] The sims (18) or the screenshot script record draw calls per planet, so regressions show up in a diff.

Implemented: F3 / Graphics overlay, five live density sliders, spatial scenery/grass batches, resource and static
prop batching, distant actor culling, and a real-WebGL per-planet regression script. See [measurements, ceilings and
reproduction steps](docs/performance.md). **Target status:** the available Intel UHD test machine remains below
60 FPS; Iris Xe default-quality validation and further frame-time optimization remain performance work.

---

# Phase B: A good first hour

## 21. Tutorial and first-time help **(suggested)** ✓

**Goal:** new players learn the game's many systems without reading toasts that vanish in two seconds.
Code: new `src/gameplay/Tutorial.js`, `src/ui/` (a hint panel), `src/config/` (tutorial steps); builds on the
first-time tips in `src/gameplay/Gathering.js`.
Promoted from the suggested additions (tutorial, death screen). **Size:** M. **Needs:** 19 (so "seen" survives a refresh).
**Risk:** it teaches systems that 22 and 24 will still change. **Recommendation:** keep the steps as data in
`src/config/`, so a changed system means changing one line, not rewriting the tutorial.

- [x] **A guided start:** a short first walk out of the village that teaches moving, the camera, talking (`E`),
      the bag and hotbar, a first fight (dodging, abilities, the ultimate's aim) and the sealed boss lair's conditions.
      It can be skipped, and offered again from the pause menu.
- [x] **Hints that stay:** a small hint panel (or a "help" page in the journal) that keeps the first-time tips:
      energy, tools, stations, smelting, fishing, farming, pets.
- [x] **A death screen:** "You fainted", with a short recap (what hit you, how long you lasted), a respawn countdown
      and a tip.

Implemented: an action-driven, skippable first walk with pause-menu replay, Journal Help and saved progress/seen
tips. Prompts follow the current hero and bindings; the fainting recap identifies enemies and hazard owners and
preserves its countdown across Continue. Original v1 saves still load. See [tutorial notes and screenshots](docs/tutorial.md).
Verified: 134 unit tests, all 21 gameplay simulations, and real-browser refresh/replay, help and fainting checks
at 720p and 1080p for all three heroes.

## 22. More crafting, part 2 **(core)**

**Goal:** the farm, the ponds and the wilds feed into crafting that's worth doing: better meals and potions, magic for
your gear, and recipes worth discovering.
Code: `src/config/crafting.js`, `src/items/crafting.js`, `src/ui/InventoryUI.js` (Craft tab), `src/gameplay/buffs.js`.
The open half of the old 17, in the order to build it. **Size:** M–L. **Needs:** 19.
**Risk:** Magic is where this item can sprawl (risk 7). **Recommendation:** build it last, with no rarity upgrades and
one enchantment slot per piece; recipe discovery never hides a recipe that a quest, the tutorial or a first tool needs.

- [x] **Cooking:** meals for the needs and buffs from 16.
  - Assumption: the pot already cooks the meals from 16, so what's open is depth: meals from the farm's crops and each
    planet's fish, stronger versions from rarer ingredients (a Golden Koi feast), and one meal buff at a time so buffs
    don't stack into silliness.
- [x] **Brewing:** herbs and water become potions and tonics, with stronger versions from rarer ingredients.
- [x] Recipe discovery: bookshelves, chest scrolls and defeated monsters' bestiary pages teach twelve advanced recipes.
  - Start with books (the bookshelves in the houses), scrolls in chests and bestiary pages; villagers teach recipes once
    Friendship (33) lands.
- [x] **Magic:**
  - Enchanting combat gear with Moss, Ember and Frost runes for fixed extra stats, subject to the existing caps.
  - Infusing Moon-Hop and Feather-Step charms to extend their magic from 30 to 90 seconds.
  - Trimmed (Round 3): one enchantment slot per piece and three or four rune kinds (one per world's material), no
    rarity upgrades.
- [x] From Quality of life: a "Craft x5" / "Smelt all" button, and favourite recipes pinned at the top of the Craft tab.

Implemented in the trimmed scope: each world's fish and crops feed a stronger meal, rare gems feed water-based
brews, and each combat piece has one replaceable rune without changing rarity. One meal buff coexists with
independent potion/pet timers. Existing essential recipes stay available. Learned recipes, favourites, enchantments
and meal timers persist in version-1 saves, including old-save defaults. Bulk exchanges preflight exact bag capacity
and pool fuel before spending anything; their output counts toward crafting achievements. See
[docs/crafting.md](docs/crafting.md) for recipes and discovery sources.

## 23. Balance and pacing pass **(core)**

**Goal:** the numbers set by hand play well together, with every hero, and there are written targets the new worlds can
be tuned to.
Code: `src/config/` (combat, planets, leveling, survival, resources, shop, crafting), the sims in `tests/sim/` (18).
Merges the two high-priority balance items from the suggested additions. **Size:** M. **Needs:** 18, 22.

- **First balance report** (2026-10-08, `npm run sim -- balance`, seed 1; the bot never dodges, and heroes are at the
  boss's summon level with starting gear):
  - Monsters on Lanternmoss and Emberfall fall in 0.2–3.5 s, mostly under the 2–6 s target; the opening burst (skills
    ready) kills most of them before they land a hit. Frostveil sits in the target (2–7.5 s) and starts to hurt.
  - Every boss and mini boss except Malgrath falls in 12–58 s, far under the targets (bosses 3–5 min, mini bosses
    1.5–3 min), even though the bot never dodges. Either boss health is low or the targets are wrong for a cozy game:
    decide which.
  - **Malgrath:** the witch and ranger bots barely scratch him (80–84% left after 5 min, about 46 HP top-ups), while
    the knight wins in 124 s. Check whether ranged heroes can hit him while he flies (phase 2), and how often the Doom
    Blade lands.
  - The knight is the fastest and takes the least damage everywhere (difficulty 1 in the hero picker, so maybe
    intended, but by this much?).
- [ ] **Targets first** (risk 5), reported by the sims per hero: a regular monster falls in 2–6 s at the planet's
      expected level; a mini boss takes 1.5–3 min, a boss 3–5 min; a natural play-through reaches each boss's summon
      level (2, 4, 6) without grinding. Write them in `docs/balance.md`.
- [ ] Balance and pacing (was a suggested addition): play through with each hero and tune the numbers that were set by
      hand and never tested together: energy drain, node regrow times, crop growth, fuel costs, mini boss health, coin
      prices and shop costs.
- [ ] Balance pass on the new bosses (was a suggested addition): playtest Pyrrhax and Malgrath with each hero. In
      particular, check how often the Doom Blade is used, the damage of the Demon Lord's flying phase, and the 50%
      transition timing.
- [ ] **The economy:** coins in (monsters, chests, quests, selling) against coins out (shop, seeds); a planet's chests and
      quests should pay for its next gear tier, not more.

---

# Phase C: Travel and a home

## 24. Portals between worlds **(core)**

**Goal:** travel is your choice, not a one-way trip.
Code: `src/gameplay/PlanetProgression.js`, new `src/gameplay/Portals.js`, `src/world/` (a portal landmark),
`src/ui/` (destination picker), `src/core/save.js` (per-planet state).
**Size:** L. **Needs:** 19. The new worlds (26 on) are reached through it, and rematches (31) start from it.
**Risk:** storing whole planets is big and fragile (risk 8); one-off villager lines replay on revisits.
**Recommendation:** store only what changed from the seed, with stable ids; one-off lines are keyed by planet id (19).

- [ ] **A portal on each planet** (e.g. in the village) that takes you back and forth between the worlds you've
      unlocked by defeating their boss.
  - A lantern gate at the edge of the village square, lit in the colour of each world it can reach.
- [ ] **Going ahead early:** under a special condition (a rare key, a challenge, an item), you can travel to a planet
      whose boss you haven't beaten yet.
  - The consequence: you can't travel freely back and forth (for example, a one-way trip until that planet's boss
    falls, or until you find its portal key).
  - Decided (Round 3): a **Wayfarer's Key** (rare: Lantern chests, or a no-hit boss challenge) opens the next locked
    planet one way. The gate home stays dark until that planet's boss falls, or until you use another key.
- [ ] Each planet keeps its state between visits: chests opened, monsters defeated, things built, villagers' progress.
      Today a planet is rebuilt when you arrive, so this needs per-planet saved state.
  - Only what changed from the seed is stored (risk 8). Monsters respawn on a revisit (assumption); nodes regrow by
    the play time that passed.
- [ ] Bosses you've beaten stay beaten (or offer a harder rematch, see 31). Travelling through a portal has its own
      fade and sound.
- [ ] The travelling villagers come with you wherever you go (as now); the locals (Cinder, Tuva) stay home.

## 25. Building **(core)**

**Goal:** players shape their own spot on the planet.
Code: new `src/gameplay/Building.js`, `src/config/placeables.js`, `src/world/` (placement on terrain), hotbar
(10.2). **Size:** L, in three stages. **Needs:** 19 and 24 (saved per planet).
**Risk:** the structures stage (walls, floors, roofs on a round, hilly planet) is a game of its own (risk 7).
**Recommendation:** ship 25a and 25b, play with them, then decide on 25c.

- [ ] **25a. A home to start with (suggested):** before full building, claim an empty cottage in the village, decorate it with
      furniture you craft, and sleep in your own bed. This gives a smaller first step toward the pieces below.
- [ ] **25b. Placeables:** furniture, lights, fences, paths, walls, floors and roofs, chests for storage, crafting stations
      (17) and farm plots (16).
  - In 25b: furniture, lights, fences, paths, storage chests, stations and farm plots. Walls, floors and roofs go to 25c.
  - From Quality of life: quick-stacking into storage chests, and sorting the bag.
- [ ] **Acquire them** by crafting, buying from villagers, or finding them.
- [ ] **Place:** hold a placeable and a ghost preview snaps to the ground or a grid; turn it, and see valid or invalid
      spots (not in the village square, not on paths or in lairs).
- [ ] **Break / pick up:** taking a piece down gives it back (or its materials).
- [ ] Placed things block movement and the camera, and are saved per planet.
- [ ] **25c. Build:** structures made of pieces (walls, floors, roofs), maybe a home of your own you can enter like the
      village houses.
  - Go / no-go after 25b: only if placement on slopes, collisions and the camera already feel solid.

---

# Phase D: New worlds

Three new worlds, each built around one mechanic the first three don't have, in Lanternmoss's look: storybook
low-poly, made in code, ink outlines, warm glowing lights, cozy rather than grim.
- **Tidewhisper** (27): islands, tide pools and lighthouses. Mechanic: **tides**.
- **Duskhollow** (30): a twilight world under giant glowing mushrooms. Mechanic: **light and dark** (your lantern).
- **The Lantern Moon** (32, secret): where every lantern's light drifts up to. Mechanic: **low gravity**.

Why three: each existing world was built up over items 11–16, and a new one has to match that standard (risk 4). Three
worlds give a full second act plus a secret ending without doubling the game. A fourth idea (Windward) is parked in
Suggested additions.

## 26. New worlds: the groundwork **(core)**

**Goal:** adding a world means filling in a checklist, not surgery, and no world ships as a reskin.
Code: `src/config/planets.js` → `src/config/planets/` (one file per world), new `src/world/mechanics/`,
`src/physics/Walker.js`, `src/config/leveling.js`, `src/config/achievements.js`, `src/ui/MainMenu.js` (campaign strip),
`tests/planets.test.mjs`. New in Round 3. **Size:** L. **Needs:** 19, 23, 24.
**Risk:** players never see this item, so it's tempting to skip. **Recommendation:** don't. Without it, world 4 turns into
copy-paste in `planets.js`, and the three-planet assumptions break one at a time during 27.

- [ ] **One file per planet** in `src/config/planets/<id>.js`, with `PLANETS` assembled in campaign order, each with
      its `act`.
- [ ] **Planet mechanics:** `mechanic: 'tides'` loads `src/world/mechanics/tides.js` with `enter`, `update(dt)`, `exit`
      and save hooks (19). Weather stays mood only; a mechanic may read the weather.
- [ ] **Per-planet physics:** gravity (Moon-Hop already scales it: `moonGravity` in `config/game.js`) and a sea level
      that can move (today ponds and lakes are fixed). The Walker, swimming, spawning and node placement read both.
- [ ] **New enemy behaviours as building blocks** in `src/entities/enemies/behaviors/` (like `charger`, `burrower`),
      not buried inside one monster: `armoured`, `drifter`, `amphibian` (27); `lightbound`, `weaver`, `mimic`, `thief`
      (30); `swarm`, `puller`, `launcher` (32). Ten behaviours, three boss AIs and two mini boss AIs in total, which is
      where most of the time goes.
- [ ] **Levels:** cap 10 → 16, with the XP curve extended. Expected levels: Tidewhisper 7–10, Duskhollow 10–13, the
      Lantern Moon 13–16. Starting scale values (tune them to 23's targets): hp 2.9 / 3.4 / 4.0, damage 2.0 / 2.25 /
      2.5. The low-level challenge targets move into each planet's file.
- [ ] **A second act:** the title's campaign strip shows Act II (the secret world as "?"), Frostveil's tagline no
      longer says "the last", and there are achievements for the new bosses plus "Lantern of Five Worlds" (the first three keep
      "Lantern of Three Worlds").
- [ ] **The content checklist, as a test,** for every world: at least 3 monster types found on no other planet (at most 2
      returning types); its own boss AI module and a mini boss; at least 2 tree kinds, 2 critters and a rare creature of
      its own; at least 1 weather kind of its own; a material and a rare vein; a local villager with a quest; a bestiary
      page for every monster; a music theme; first-arrival lines for every travelling villager; and the performance
      budget (20).

## 27. World 4: Tidewhisper **(core)**

**Goal:** a planet of islands, tide pools and lighthouses, and the test run for the groundwork (26).
Code: `src/config/planets/tidewhisper.js`, `src/world/mechanics/tides.js`, new behaviours and models, a boss in
`src/entities/enemies/behaviors/boss/angler.js`. New in Round 3. **Size:** XL. **Needs:** 26.
Reuses on purpose: swimming (11), fishing (16), fuel (17), facing-based aiming (14).
**Risk:** the moving sea touches physics, spawning, monster AI (monsters that end up in water), nodes and the farm.
**Recommendation:** keep the tide range small (about 1.5 m), mark the tidal band in the height field, and only place
things meant for it there (tide pools, clams, driftwood). The farm sits above the high-tide line.

- [ ] **Shape and look:** an archipelago with the sea over most of the planet and a few big islands joined by
      sandbars. Sand, sea-green grass, turquoise shallows, deep blue water, and a peach-and-aqua sky. The village stands
      on stilts on the largest island, with a pier for fishing.
- [ ] **Tides:** the sea rises and falls once a day (low in the afternoon, high at night). Low tide opens sandbars,
      tide pools (crabs, clams, pearls) and the causeway to the boss lagoon; high tide floods them (swim across;
      swimming drains energy faster, 16). Driftwood and shells wash up on the flats at each high tide, a reason to come
      back. A tide chip sits next to the clock.
- [ ] **Monsters (new):**
  - **Shellbacks:** crabs that scuttle sideways. The shell blocks hits from the front, so circle round them (facing, 14).
  - **Jellybells:** jellyfish that drift with the tide over the water and the flooded flats, pulsing a stinging ring;
    popped, they burst into light.
  - **Surf skippers:** mudskipper raiders that ambush from the surf and slip back into deep water where you can't
    follow on foot.
  - Returning: a few wisps, sea-green.
- [ ] **Mini boss: Old Ironclaw,** a giant hermit crab wearing a sunken bronze bell. The bell takes no damage and rings
      a stunning shockwave when hit; Ironclaw is open when it pulls out to swap shells (at 66% and 33%) or when a charge
      wedges it in the sand at low tide. It guards the black pearl beds on the far beach.
- [ ] **Boss: Mirelure, the Lantern Angler,** a huge anglerfish whose lure is a lantern that once drew ships onto the rocks.
  - Wakes when: level 8, Marlo's quest is done (the lighthouse relit) and the tide is low enough to cross the causeway.
  - Phase 1, lagoon flooded: only her lure shows, and she lights false lures around the lagoon. Strike the real one (it
    flickers in time with her breathing) and she surfaces; strike a false one and it bursts.
  - Phase 2, at 50%: she smashes the sluice and the lagoon drains. Beached, she thrashes, rolls and bites, open to
    everything, while the water creeps back on a timer.
  - Arena ring: crashing surf. Trophy: the Tide Crown.
- [ ] **Flora:** lantern palms (glowing coconuts hang like lanterns), kelp trees swaying at the shore, coral fans (no
      wood, like crystal spires), dune grass, sea thrift and sea lavender.
- [ ] **Wildlife:** hermit crabs that hide in their shells, sea turtles on the beaches, seals that loaf on rocks and bark,
      gulls and terns, shoals in the shallows, and lanternfish that glow at night. Rare: the **Pearl Turtle** (gift: the
      Pearl of the Deep charm). New body builders: crab, turtle, seal.
- [ ] **Weather:** clear and breezy, plus two new kinds: **sea mist** (rolls in at dawn) and **squall** (driving rain,
      wind and whitecaps).
- [ ] **Resources and items:** driftwood and shells by hand, clam beds at low tide (pearls), coral (pickaxe), salt pans
      (sea salt for cooking), seaweed, and iron in the old shipwrecks. Material: **seaglass**. Rare vein: black pearl
      beds. Food: salted fish, seaweed rolls, chowder. Gear: the Tide set (28).
- [ ] **People:** Marlo the lighthouse keeper (lines, tips for Mirelure, and the quest "The Dark Lighthouse": seaglass for a
      new lens and fuel to light it); stilt houses with two interiors; beach outfits for the travelling villagers.
- [ ] **Music:** a slow waltz over a sea-swell pad, made in code.
- [ ] Optional, only if the world comes in under budget: an otter pet that dives for pearls.
- [ ] **Go / no-go check** once it plays end to end: how long it took, what the groundwork (26) got wrong, and whether
      the checklist was too much. Fix 26 before starting 30, or cut Duskhollow down to fit.

## 28. Gear sets and hero depth **(suggested)**

**Goal:** choosing gear and growing a hero have more to them than bigger numbers.
Code: `src/config/items.js` (sets), `src/items/gear.js`, `src/config/characters.js` (talents), `src/ui/` (a talent
page). **Size:** M. **Needs:** 26 (the level cap rises to 16).
**Why here:** after 26, levels 11–16 add only small stat bumps; talents give them something to spend points on.

- [ ] **Gear sets:** wearing two or three pieces of a set gives a bonus (the Ember set: burning hits; the Frost set:
      chilling hits; the Moss set: more healing), shown in the bag's equipment side.
  - One set per world: the Tide set (27), the Dusk set (30) and the Star set (32) join them.
- [ ] **A small talent tree per hero:** a point every level or two, spent on upgrades to their abilities or an
      alternative version of a skill (a wider Cleave, a homing Fireball).
- [ ] A free reset at the village (a wizard's service), so trying builds is cozy, not punishing.

## 29. Dungeons and caves **(suggested)**

**Goal:** something to explore beyond the open planet surface, where mining and fighting meet.
Code: new `src/world/caves.js` (interiors like the houses', away from the planet), `src/gameplay/Dungeons.js`,
`src/config/dungeons.js`, new `src/render/lighting.js`. **Size:** L. **Needs:** 19, 20.
**Why here:** it builds the darkness and light that Duskhollow (30) needs, in a small space first.
**Risk:** one hand-made cave per planet means six caves. **Recommendation:** build caves from a kit of room pieces put
together from a seed, so each planet's cave is config (palette, monsters, veins), not hand-built.

- [ ] **A cave or dungeon per planet,** entered from the surface: a few rooms with monsters, chests and ore veins
      that are found nowhere else.
- [ ] **Light puzzles:** lantern switches, pushable stones, pressure plates, a locked door and its key.
- [ ] **A guardian** at the end with its own loot, and a shortcut back to the entrance.
- [ ] Caves are dark: lanterns and glowcaps light the way.
  - **The light tech:** a light radius around the hero and around lanterns, done in the shaders (a few light positions
    passed to the materials) plus emissive glow and bloom. At most about four real point lights (risk 6).
  - Keep a minimum ambient light and the ink outlines, so the dark is moody but always readable.

## 30. World 5: Duskhollow **(core)**

**Goal:** a twilight planet under a canopy of giant glowing mushrooms, where your lantern decides what you can see and
fight.
Code: `src/config/planets/duskhollow.js`, `src/world/mechanics/lantern.js`, the light tech from 29, new behaviours and
models, a boss in `src/entities/enemies/behaviors/boss/moth.js`. New in Round 3. **Size:** XL. **Needs:** 27 (and its
go / no-go check), 28, 29.
**Risk:** a dark world can be hard to read, and frustrating on cheap screens. **Recommendation:** keep a minimum light
level and the outlines, never let an empty lantern hurt you, and test it on the lowest quality preset.

- [ ] **Shape and look:** deep valleys under a canopy of giant lumen caps about 25 m up, with gaps of starlight. An
      endless dusk (the day clock still turns, as brighter and dimmer dusk). Glowmoss carpets light up in your
      footprints as you walk, the world's signature effect.
- [ ] **Your lantern:** it hangs from the hero's belt and has an Oil bar beside Energy, refilled with glowcaps, firefly
      jars and lumen oil. An empty lantern shrinks to a small glow; it never hurts you. The village and its lamp posts
      are safe light. Relight **waylamps** along the roads and they stay lit (per-planet state, 24), making safe paths.
- [ ] **Monsters (new):**
  - **Shadelings:** only shadows outside your light, solid and hittable inside it. A burst of light (fire spells, a
    flare) sends them fleeing.
  - **Gloomweavers:** round, fuzzy spiders that string sticky webs between the stalks. Webs slow you; fire or a blade
    cuts them. (Accessibility: an option draws them as round beetles.)
  - **Mosslurks:** mimics that look like glowcap clusters and bite when you go to gather them.
  - **Snuffers:** little hooded thieves that dart in, steal oil and run; catch one to get it back with interest.
- [ ] **Mini boss: Grandmother Gloomweaver,** a huge spider in a canopy of webs. Burn her three anchor strands to bring
      her down, where she fights and spins new anchors. She guards the moonstone vein.
- [ ] **Boss: Umbra, the Moth of the Last Light.**
  - Wakes when: level 11, and the three moonwell lanterns on the Old Road are relit for Wick's quest by carrying the
    village flame (run dry on the way and you start again from the last lit waylamp).
  - She dives at the brightest light. Light an arena lantern and she crashes into it, stunned and open to hits.
  - Her wingbeats snuff your lantern and the arena's, and in the dark, shadelings join the fight.
  - At 50% she drinks light: the arena dims each time she feeds, and the scales she sheds blind you (a fog that
    follows you).
  - Arena ring: pale moonfire. Trophy: the Dusk Crown.
- [ ] **Flora:** lumen caps (the canopy, and smaller ones you walk under), lantern vines hanging from them, ghost ferns,
      glowmoss and pale moonflowers.
- [ ] **Wildlife:** firefly swarms (catch them in a jar with `E`, for light and oil), glow snails, lantern bats hanging
      under the caps, and crickets you hear before you see. Pale blind fish in glowing pools. Rare: the **Moonmoth**
      (gift: the Moonmoth Wing charm, a wider light).
- [ ] **Weather:** no rain under the canopy (the dripping caps water the farm instead), plus two new kinds: **spore
      drift** (glowing spores) and **deep dark** (the dusk thickens; the lantern mechanic shrinks your light a little).
- [ ] **Resources and items:** lumen ore (needs an iron pickaxe) for lumen ingots, spider silk from cut webs (cloth for
      light armour), firefly jars, and shade mushrooms (a crop that grows only in shade). Material: **lumen dust**. Rare
      vein: moonstone. Gear: the Dusk set (28).
- [ ] **People:** Wick the lamplighter (lines, tips for Umbra, and the quest "Light the Old Road"); houses inside
      mushroom stalks; the travellers' lines ("I can't see my own beard!").
- [ ] **Music:** a music box over low strings, made in code.

## 31. After the last boss **(suggested)**

**Goal:** the adventure doesn't simply stop after the last boss.
Code: `src/gameplay/PlanetProgression.js`, `src/config/planets/`, `src/config/combat.js`. **Size:** M. **Needs:** 24.
Before 32, because the Lantern Moon's boss reuses the rematch versions of the other bosses' moves.

- [ ] **Rematches:** harder versions of the planet bosses and mini bosses, with new attacks and better loot.
  - Reached through the portals (24): a beaten boss's lair offers a rematch (this replaces 14's open "harder
    versions").
- [ ] **A secret fourth planet,** unlocked after the last boss, with its own boss and materials.
  - Now the sixth world: **32. The Lantern Moon**.
- [ ] **New Game+:** start again with your journal, pets and vanity kept, against tougher rosters with better loot.

## 32. World 6 (secret): The Lantern Moon **(core)**

**Goal:** a small secret world after the second act: the place where every lantern's light drifts up to.
Code: `src/config/planets/lanternMoon.js`, `src/world/mechanics/lowGravity.js`, new behaviours and models, a boss in
`src/entities/enemies/behaviors/boss/eclipse.js`. New in Round 3. **Size:** L (a deliberately small world).
**Needs:** 30, 31.
**Risk:** this is a reward for completionists, and it could easily grow as big as a main world. **Recommendation:** keep it
small: radius 40 (the old planet size, so you can see the curve, like a moon), one building, and no farm or cave. Its boss
reuses moves from the other five.

- [ ] **Unlock** (assumption): beat Umbra and befriend every rare creature in this adventure. Their five lights then
      open the lantern gate to the moon at night.
- [ ] **Low gravity:** higher, floatier jumps, slower falls and longer knockbacks, for monsters too (built on
      Moon-Hop's gravity).
- [ ] **Shape and look:** silver-blue grass and craters (a new terrain part), a black starry sky with the worlds you've
      visited hanging in it in their colours, and lanterns from every world drifting up over the horizon. Catch one (`E`)
      for a small gift from the world it came from.
- [ ] **Monsters (new):**
  - **Moonmites:** crystal beetles that roll in swarms and bowl you over.
  - **Gravity puffs:** balloon creatures that pull you in, then pop.
  - **Lunar golems:** they slam the ground and launch you up, so part of the fight happens in the air.
  - The mini boss slot on the checklist is waived here: the rematches (31) fill it.
- [ ] **Boss: Nyxra, the Eclipse,** a lonely being who drinks lantern light.
  - Wakes when: level 14, at the top of the observatory, at night.
  - The fight remembers the journey: each phase borrows a signature move from an earlier boss in its rematch version
    (thorns, dragonfire, the Doom Blade, a false lure, a moth's dive), plus her own moves. She eclipses the sun (the
    darkness from 29) and opens gravity wells.
  - She isn't destroyed. At 0 she's rekindled and stays on the moon as a lantern spirit, the last villager you meet.
- [ ] **Flora:** moonglass trees (see-through, they chime in the wind), star lilies that open at night, silver tufts.
- [ ] **Wildlife:** moon rabbits pounding mochi (a nod to the folk tale, with their own model and animation, not the
      bunny), comet foxes with glowing tail trails, star moths, and starfins in a still star-pool. Rare: the **Jade
      Rabbit** (gift: the Mochi Moon charm).
- [ ] **Weather:** clear, plus a **meteor shower**: star shards fall at marked spots (collecting them is part of the low-gravity
      mechanic). Material: **stardust**.
- [ ] **People and items:** the Lamplighter, who tends the lanterns that drift up, keeps the observatory and sells the last
      tier: the Star set (28) and endgame trinkets.
- [ ] **Music:** a celesta theme, made in code.

---

# Phase E: Cozy depth

Independent of each other and of the worlds: pull any of them forward as a break between worlds. The only hard order
is Pet care (35) after Cooking (22). Where one of them needs data for each world, generate it from the planet config
(risk 4).

## 33. Villager friendship **(suggested)**

**Goal:** the villagers become friends you care about, not only quest givers and a shop.
Code: new `src/gameplay/Friendship.js`, `src/config/npcs` data (favourite gifts, reward tiers), `src/ui/Dialog.js`
(a gift option), the journal (a friends page). **Size:** M. **Needs:** 19.

- [ ] **Friendship hearts** per villager, raised by talking each day, gifts and finishing their quests.
- [ ] **Gifts:** each villager has favourite, liked and disliked things (food you cook, fish, gems, flowers), with a
      reaction line and an emote for each.
- [ ] **Rewards by heart level:** recipes (ties into recipe discovery, 22), shop discounts, a unique trinket or vanity
      piece, new dialogue and a small personal quest.
- [ ] Friends greet you by name, wave from across the square and sometimes leave a gift at your door.
- [ ] The new worlds' locals (Marlo, Wick, the Lamplighter) join with their own tastes.

## 34. Bounty board **(suggested)**

**Goal:** there's always something small to do, every day.
Code: new `src/gameplay/Bounties.js`, `src/config/bounties.js`, a board prop in each village, `src/ui/` (the board).
**Size:** S. **Needs:** 19.

- [ ] **A board in the square** with three rotating daily tasks: bring items ("5 iron ingots"), defeat monsters
      ("3 ramhorns"), catch a fish ("a Golden Koi"), harvest a crop.
  - Generated from the planet's config (roster, nodes, fish, crops), so every world gets bounties without extra writing.
- [ ] Rewards in coins, materials and now and then a rare piece; a new set each day (the day clock, 5).
- [ ] The journal counts bounties finished, with an achievement or two.

## 35. Pet care **(suggested)**

**Goal:** pets feel looked after, and the food you grow matters to them too.
Code: `src/gameplay/Pets.js`, `src/ui/PetMenu.js`, `src/config/pets.js`, `src/models/vanity.js`. **Size:** S–M.
**Needs:** 22 (cooking); the pet bed needs 25a.

- [ ] **Feeding:** pets have favourite foods from the farm, the ponds and the wilds; feeding them gives a short buff
      or a little XP, and a happy emote.
- [ ] **Pet outfits:** small hats, bows and scarves for pets, using the same vanity idea as the hero's hat and cape.
- [ ] **Pet finds:** a well-fed pet sometimes brings back something it found (a forage item, a seed, now and then a
      coin).
- [ ] A pet bed in your home (25) where resting pets heal.

## 36. A living village **(suggested)**

**Goal:** the villagers use the same world you do, so the village feels busy.
Code: `src/entities/npc/NPC.js`, `src/entities/npc/npcDefs.js` (schedules), `src/gameplay/Stations.js`,
`src/gameplay/Farm.js`. **Size:** M.

- [ ] Villagers' schedules include the new places: Cinder at the forge, Pim at the cooking pot, someone fishing at
      the pond in the evening, someone tending a farm plot.
  - And on the new worlds: Marlo fishes from the pier, and Wick relights the lamps at dusk.
- [ ] They react to what you do there ("Nice catch!", "That pumpkin's enormous!").
- [ ] Their activities show with small animations and the stations' own effects (sparks, steam).

## 37. Museum **(suggested)**

**Goal:** collecting has a place to show off, and fishing, mining and foraging lead somewhere.
Code: new `src/gameplay/Museum.js`, `src/world/interiors.js` (a museum room), the journal's Collection tab.
**Size:** M. **Needs:** 19.

- [ ] **Donate** fish, gems, rare forage and monster trophies to Old Bramble's museum. Each donation fills a display
      in a museum room you can walk through.
  - The shelves are generated from the item and planet config, so they grow with each world on their own.
- [ ] **Rewards** for completing a shelf (all the fish, all the gems): coins, a vanity piece, a unique trinket.
- [ ] The journal's Collection tab marks what's been donated.

## 38. Festivals **(suggested)**

**Goal:** the calendar has highlights to look forward to.
Code: `src/config/day.js` (a calendar), new `src/gameplay/Festivals.js`, `src/world/village.js` (decorations),
`src/config/shop.js` (festival stock). **Size:** M.
**Risk:** a hand-made festival per planet means six festivals. **Recommendation:** one festival system whose decorations
take the planet's colours; give the first three worlds their own versions only if time allows.

- [ ] **A lantern festival** every few days: paper lanterns over the square, villagers gathered at night, a special
      shop, and small mini-games (lantern lighting, a race).
- [ ] **A harvest fair:** enter your best crop or fish, and the villagers judge it for a ribbon and a prize.
- [ ] Each planet gets its own version (an ember festival, a frost festival), and the journal remembers the ones
      you've been to.

## 39. Photo mode **(suggested)**

**Goal:** a cozy, pretty game is one people want to take pictures of.
Code: `src/systems/CameraSystem.js` (the showcase camera already exists), new `src/ui/PhotoMode.js`. **Size:** S.

- [ ] Hide the HUD; move the camera freely around the hero (limited range), tilt and zoom.
- [ ] A few filters (warm, night, pastel), a frame or border, and the hero striking a pose or emote.
- [ ] Save the picture as an image file.

---

# Phase F: Reach

## 40. Mobile support **(core)**

**Goal:** the game is playable in a phone or tablet browser, with touch controls.
Code: `src/systems/InputSystem.js`, `src/core/controls.js`, new `src/ui/touchControls.js`, `styles/main.css`,
`index.html` (viewport), `src/config/settings.js` (defaults for mobile). **Size:** L. **Needs:** 20.
**Risk:** every screen built until then becomes a screen to convert, and there are about twenty actions on keys today.
**Recommendation:** follow the no-hover rule from today (*Rules from here on*). Build touch and gamepad on one input
layer (actions, not keys) so Gamepad support comes almost for free.

- [ ] **Detect a touch device** (`pointer: coarse`, touch events) and switch the touch layout on; keep a setting to
      turn it on or off by hand.
- [ ] **Touch controls:**
  - A virtual joystick on the left to move (pushed all the way = sprint).
  - Drag on the right half of the screen to turn the camera; pinch to zoom.
  - Buttons on the right for jump and the five skills, showing cooldowns; aimed ultimates aim by dragging from
    their button and cast on release.
  - A contextual button for talk / use / pet (the `E` prompt becomes tappable), and taps for the hotbar, the pet card,
    the bag, the journal and pause.
- [ ] **Menus by touch:** character select, the bag, the shop, the pet menu, the journal and settings all work with
      taps (no hover-only details; long-press for tooltips).
- [ ] **Fit small screens:** HUD scale and layout for phones, landscape preferred (a "turn your phone" hint in
      portrait), no page scrolling or pinch-zooming of the page, full screen when possible.
- [ ] **Performance:** lower default quality on mobile (pixel ratio, bloom, shadows, scenery density) and a frame-rate
      check.
  - Using the density settings and the budget from 20; Duskhollow (30) is the world to test on.
- [ ] Facing-based aiming (14) suits the joystick: attacks go where the hero faces.

## 41. Multiplayer support **(core)**

**Goal:** friends explore the planets together: co-op adventures with each player as their own hero and pet.
Code: new `src/net/` (connection, messages, state sync), `src/core/Game.js` (local vs. remote players), `src/core/context.js`
(more than one player), `src/entities/player/` (a remote hero driven by network state), a small server (`scripts/` or a
separate service), `src/ui/` (lobby, player list, chat). **Size:** XL+. **Needs:** 19, 24.
**Risk:** this is the item most likely to cause trouble (risk 1). **Recommendation:** a decision gate at the end of phase A, and a
three-day spike right after 19. If it stays, it stays last.

- [ ] **Decide the model:** peer-to-peer with one host (WebRTC) or a small authoritative server (WebSocket). The host
      or server runs the world (monsters, bosses, loot, chests, the day clock, weather); clients send their input and
      draw what they're told. Pick one before building the rest.
  - Recommendation: one host over WebRTC. The game is a static site served by `scripts/serve.mjs`, so there's no server
    to run beyond a tiny signalling step, and the save's `toJSON()` / `load()` pairs (19) are the snapshot format.
- [ ] **Lobby:** host a game and get a short room code or link; join with the code. Each player picks their own hero
      and pet; a player list shows who's in, with a ready check before the adventure starts. Drop-in / drop-out mid
      adventure if possible.
- [ ] **Shared world, separate heroes:**
  - Every player's hero, pet, animations and abilities are seen by the others, with smoothing for network lag.
  - Monsters choose among nearby players; boss fights scale their health with the number of players.
  - Each player keeps their own level, XP, bag, gear, energy and journal.
  - Menus that pause the world today (the pet menu, the journal) can't pause it in co-op: decide what they do.
- [ ] **Sharing rules:**
  - Loot from chests and drops: per-player rolls (everyone gets their own), so nobody steals anything.
  - Resource nodes, the farm and crafting stations are shared; decide whether gathered nodes regrow per player.
  - Quests and boss gates: whose progress counts (the host's, or each player's own), and what happens to a player
    who joins late.
  - Planet travel: everyone travels together when a boss falls, or a vote to leave.
- [ ] **Talking to each other:** quick emotes (the existing emote bubbles), a short text chat, name tags over heroes,
      and the compass showing where the other players are.
- [ ] **Robustness:** reconnecting after a drop, the host leaving (hand the world to another player, or end the
      session cleanly), and keeping cheating out of scope for a friendly co-op game.
- [ ] Needs Save / load (19) for persistent shared worlds; Portals (24) decide how a group moves between planets.

---

## 42. Game wiki website **(suggested)**

**Goal:** a complete, searchable wiki website where players can learn about every part of Lanternmoss, from a
character's abilities to an item's uses, a planet's wildlife and a boss's attacks.
Code: new `wiki/` (website and written guides), a wiki build script under `scripts/`, and the existing game data in
`src/config/`. **Size:** L. **Needs:** the existing game content and journal/help data (13, 21); no dependency on
mobile or multiplayer. It can be built alongside the remaining gameplay work and expanded as content lands.
**Risk:** copied stats and recipes become outdated as the game changes. **Recommendation:** generate factual entries
from the game's configuration, keep explanatory guides alongside them, and distinguish released content from plans.

- [ ] **Characters and people:** every playable character's profile, stats, abilities, resource costs, cooldowns,
      strengths, playstyle and starter companion; villagers, their locations, schedules, shops, dialogue and quests.
- [ ] **Plants and resources:** trees, flowers, herbs, forage, crops, seeds, resource nodes and ores; where they grow,
      how to gather or cultivate them, tool requirements, growth/regrowth and their uses.
- [ ] **Animals and companions:** wildlife, birds, fish and pets; habitats, rarity, behaviour, interactions, fishing,
      pet unlocking, abilities, commands and care.
- [ ] **Mobs:** every ordinary enemy and variant, with images, locations, stats, behaviour, attacks, counters, drops
      and XP rewards.
- [ ] **Mini bosses and main bosses:** individual pages covering lore, lairs, awakening conditions, attack patterns,
      telegraphs, phases, strategies, rewards and the progression they unlock.
- [ ] **Items and crafting:** all materials, food, potions, tools, weapons, armour, accessories, vanity items, keys
      and trophies; images, rarity, stats/effects, sources, recipes, ingredient quantities, stations, fuel and prices.
- [ ] **Environments and planets:** every planet, biome, village and other location; terrain, ponds, weather,
      day/night, local plants, animals, enemies, bosses, resources, travel routes and unlock conditions.
- [ ] **Game systems and guides:** getting started, controls and settings, combat and ultimate aiming, leveling,
      gathering, energy, farming, fishing, smelting, cooking, brewing, quests, challenges, chests, achievements,
      houses, save/load and other systems as they are implemented.
- [ ] **Wiki navigation:** a clear home page, category indexes, search and filters, readable mobile layouts,
      accessible navigation and stable links between related entries (item → recipe → ingredient → planet).
- [ ] **Complete and current information:** cover every released entry in the game data, include screenshots or
      illustrations, show the game version/update date, and check for missing pages, stale generated data and broken
      internal links when content changes.
- [ ] **Publish and maintain:** document how to build, preview, update and deploy the wiki; host the website and link
      it from the game's menus and README.

---

## Suggested additions

Smaller ideas, and where the promoted ones went.

- [~] **Save / load (suggested):** promoted to item 19.
- [~] **Balance and pacing pass (suggested, high priority):** promoted to item 23.
- [~] **Balance pass on the new bosses (suggested, high priority):** promoted to item 23.
- [x] **Minimap or compass (suggested):** the compass strip and off-screen arrows landed with TODO 1 (a minimap could follow once planets get bigger, see 11).
- [~] **Tutorial / onboarding (suggested, promoted to item 21):** a short guided first fight that teaches dodging, abilities and the ultimate's aim mode.
- [~] **Death / respawn screen (suggested, promoted to item 21):** "You fainted" with a short recap and a respawn countdown, instead of only a toast.
- [ ] **Gamepad support (suggested):** movement, camera and abilities on a controller, with aiming for ground-targeted ultimates.
      Build it on the input layer from 40 (actions, not keys).
- [ ] **Accessibility (suggested):** colour-blind-friendly telegraph colours, reduced motion (less shake and flashing), adjustable text size.
      Cheap: do it alongside 21. The screen shake slider and UI scale (2a) are a start; add the beetle option for the
      spiders (30).
- [ ] **Real audio (suggested):** replace the procedural placeholder sounds and music with real samples (`src/systems/AudioSystem.js`).
      Music per planet and per situation: calm village themes, exploring, night, and a stronger boss theme.
      Assumption (Round 3): the audio stays procedural to keep "no asset files"; the themes per world and situation
      are made in code, as part of each world item. Revisit only if that becomes the limit.
- [~] **Achievements / bestiary (suggested):** promoted to item 13.
- [~] **Quality of life (suggested):** a "Craft x5" / "Smelt all" button, sorting the bag, quick-stacking into storage
      chests, and favourite recipes pinned at the top of the Craft tab. Split: crafting ones into 22 (done), bag sorting and
      storage into 25b.
- [x] **Gameplay checks in the repo (suggested):** promoted to item 18 (done).
- [~] **Performance budget (suggested):** promoted to item 20.
- [ ] **Small fixes (suggested):** add a project skill for launching and screenshotting the game in a browser (`/run-skill-generator`). (The `favicon.ico` was done in 18.)
- [ ] **A fourth new world, Windward (suggested, parked):** tall mesas above a sea of clouds, with updrafts and a leaf
      glider. Parked because gliding needs new movement, a new camera and falling rules, and the clouds below need a
      soft respawn. Only consider it after 32, if the three new worlds went smoothly.
