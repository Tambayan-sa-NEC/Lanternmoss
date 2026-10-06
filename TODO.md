# Lanternmoss TODO

Planned features, in rough priority order. Each entry says **what** it is, **why** it matters, and the main
**tasks**, with pointers to the code it touches. Check items off as they land.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done. Tags: **(core)** must-have, **(nice)** polish,
**(suggested)** an idea added on top of the original list.

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
- [x] **Quit to menu**: with a confirmation that says what is lost (the adventure restarts; no saving yet).
- [x] Esc priority: closes the bag, then ability aiming, then dialogue; only then opens the pause menu. Esc on a sub-page
      goes back; Esc on the main page resumes.

### 2a. Settings screen **(core)** ✓
Schema: `src/config/settings.js` (one table drives the screen, defaults and validation); store: `src/core/settings.js`.
- [x] Audio: master, music & ambience, and effects volume (separate audio buses).
- [x] Camera: mouse sensitivity, invert vertical drag, default zoom.
- [x] Graphics: quality preset (render resolution), bloom on/off, outline width (0 hides outlines).
- [x] Gameplay: screen shake strength, damage numbers on/off, impact slow-motion on/off.
- [x] Interface: HUD size, compass & target arrows on/off, pause when the window loses focus.
- [ ] Remappable keys (stretch goal; needs bindings to move out of `CHARACTERS` key lists into one keymap table).
- [x] Remembered in `localStorage` (`lanternmoss.settings`); saved values are validated on load, Reset restores defaults.

## 3. Main menu / landing page **(core)** ✓

**Goal:** a proper title screen before character selection.
Code: `src/ui/MainMenu.js`, `index.html` (`#title`, `#start`), `src/ui/CharacterSelect.js`, `styles/main.css`.

- [x] Title screen with the floating logo and tagline over a slow, wide, high orbit of the planet; the music starts on
      the first click or key press (browsers block audio until then).
- [x] Buttons: **Play**, **Settings**, **Controls**, **Credits** (credits text in `src/config/credits.js`); mouse or
      ↑ ↓ + Enter. Settings / Controls / Credits open as panels of the pause menu (`PauseMenu.openPanel`).
- [ ] **Continue**: needs the save system (see "Suggested"); add the button then.
- [x] Animated transitions: the title lifts away as the hero cards slide in (and the camera moves in close); character
      select has Back / Esc; starting fades the overlay while the camera swoops into play, with the planet banner.
- [x] Campaign strip: Lanternmoss → Emberfall → Frostveil with each planet's colour and boss (from `config/planets.js`).
- [x] "Quit to menu" in the pause menu now returns to the title screen (restarting the run).

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
**14**, **15**, **16**, **18** and **19** place things on, and **Save / load** (Suggested additions) becomes a must-have
once players can build (**18**) and travel back and forth (**19**).

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
    equipped. Materials and keys show a hint about where they're used. Placeables wait for 18, and tools for 16. The held
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
- [ ] Saved with the rest of the game (needs Save / load).
  - For now: the journal saves itself to localStorage (`lanternmoss.journal`, cleaned on load) and is kept across
    adventures, so it doesn't wait on Save / load. Fold it into the save system when that arrives.

## 14. Better fights **(core)**

**Goal:** fighting feels natural, and bosses feel earned and part of the world, not just a lair at the far side of the
planet.
Code: `src/combat/targeting.js` (`aimDirection`, soft lock-on), `src/combat/aiming.js`, `src/combat/casting.js`,
`src/gameplay/PlanetProgression.js`, `src/combat/spawning.js`, `src/config/planets.js`,
`src/entities/enemies/behaviors/boss/`.

- [ ] **Aim where the hero is facing, not where the camera looks.** Today, aiming and attacks follow the camera angle.
      Instead:
  - Attacks, projectiles and the soft lock-on go in the direction the character faces.
  - Aimed abilities place their marker in front of the hero.
  - Turning the hero (with movement keys or the mouse) is how you aim.
  - Rotating the camera only changes the view.

- [ ] **Conditions before a boss appears**, set per boss in config:
  - a minimum hero level (e.g. Pyrrhax won't show below level 4);
  - a quest done or villagers helped;
  - sigils or keys collected from the planet's elites;
  - lair seals to break;
  - a time of day (Malgrath only rises at night).
- [ ] Until a boss's conditions are met, its lair is sealed or empty. Show what's still needed (on the compass, in
      villager dialogue, on a lair marker).
- [ ] **More immersion:**
  - A summoning or arrival sequence: the camera frames the boss, its name card appears, the music changes.
  - Arena boundaries during the fight (a ring of fire or thorns); villagers who react before and after.
  - Boss lore in the bestiary.
- [ ] Optional harder versions (rematches through portals, at a higher difficulty) with better loot.

## 15. Better environments **(core)**

**Goal:** the planets feel alive and varied: more plants, more creatures to meet, rare finds, weather, and a couple of
fearsome mini bosses out in the wilds. And pets get a little more room to grow.
Code: `src/world/scatter.js`, `src/world/props.js`, `src/world/sky.js`, `src/entities/wildlife/`,
`src/config/critters.js`, `src/config/combat.js` (mini bosses), `src/config/pets.js`, `src/models/creatures.js`.

- [ ] **15.1 Environment**
  - [ ] **More variety in trees:** more shapes, sizes and colours, different per planet.
  - [ ] **Grasses:** grass tufts, tall grass and flowers across the meadows.
  - [ ] **More friendly creatures:**
    - Fish (in ponds and lakes).
    - Land creatures.
    - Birds.
    - Rare creatures with rare drops.
  - [ ] **Special mini bosses** out in the wilds, apart from each planet's boss:
    - A hydra.
    - A basilisk.
  - [ ] **Weather:** variations such as rain, snow, fog and wind, different per planet.
- [ ] **15.2 Pets extension**
  - [ ] **Swap pets during play.** The pet menu (12) already swaps pets with the world paused; this asks for swapping
        right in the game as well (for example a key that cycles through your unlocked pets).
  - [ ] **A new pet: a dragontoad.**
    Reference: https://preview.redd.it/gah9a6dys5q51.png?width=3000&format=png&auto=webp&s=0648643054a264b4a9f86bdf1e029a3fcdf5e5ab

## 16. Resources and survival **(core)**

**Goal:** the hero needs supplies to survive and thrive, so gathering and cooking matter.
Code: `src/config/items.js`, new gathering systems in `src/gameplay/`, `src/world/` (resource nodes),
`src/gameplay/itemUse.js`.

- [ ] **Needs:** a hunger or energy meter (gentle, cozy-friendly: running low slows regeneration and sprinting rather
      than killing you), plus potions and food that matter more in long expeditions.
- [ ] **Expand the consumables:**
  - Meals with buffs, potions (healing, mana, resistance, speed).
  - Planet-specific foods; spoil-free by default.
- [ ] **Gathering** with tools (held from the hotbar, 10.2):
  - Foraging: herbs, berries, mushrooms.
  - Woodcutting: trees give wood.
  - Mining: rocks and ore veins give stone, ores and gems.
  - Fishing: ponds, with a small catch timing game.
- [ ] **Farming:** till soil, plant seeds, water them, and harvest over day / night cycles; a plot in the village.
- [ ] Resource nodes regrow over time; the rarer nodes are on later planets or behind challenges.
- [ ] **Equipment system:** players can pick up, craft or be given armour, vanity items and accessories, and equip
      them. (Today there are three slots: weapon, armour and trinket, from TODO 8.)
- [ ] **The right side of the inventory is the equipment side,** like Minecraft: the worn pieces sit in slots beside
      the bag grid.
- [ ] **Move the item description window** that shows now so it sits right under the whole inventory window.

## 17. More crafting **(core)**

**Goal:** turn raw resources into better things through several crafting stations.
Code: `src/config/crafting.js`, `src/items/crafting.js`, `src/ui/InventoryUI.js` (Craft tab), new station props.

- [ ] **Stations:** a workbench, a furnace or forge (Cinder's anvil), a cooking pot, and a brewing stand. Some recipes
      need you to stand at the right station.
- [ ] **Smelting:** ore to ingots (with fuel), which are used in tools, weapons and armour.
- [ ] **Brewing:** herbs and water become potions and tonics, with stronger versions from rarer ingredients.
- [ ] **Magic:**
  - Enchanting gear with runes or essences (extra stats, elemental effects).
  - Infusing charms; maybe upgrading a piece's rarity.
- [ ] **Cooking:** meals for the needs and buffs from 16.
- [ ] Recipe discovery: recipes are learned from villagers, books, the bestiary, or found as scrolls.

## 18. Building **(core)**

**Goal:** players shape their own spot on the planet.
Code: new `src/gameplay/Building.js`, `src/config/placeables.js`, `src/world/` (placement on terrain), hotbar
(10.2); needs Save / load.

- [ ] **Placeables:** furniture, lights, fences, paths, walls, floors and roofs, chests for storage, crafting stations
      (17) and farm plots (16).
- [ ] **Acquire them** by crafting, buying from villagers, or finding them.
- [ ] **Place:** hold a placeable and a ghost preview snaps to the ground or a grid; turn it, and see valid or invalid
      spots (not in the village square, not on paths or in lairs).
- [ ] **Break / pick up:** taking a piece down gives it back (or its materials).
- [ ] **Build:** structures made of pieces (walls, floors, roofs), maybe a home of your own you can enter like the
      village houses.
- [ ] Placed things block movement and the camera, and are saved per planet.

## 19. Portals between worlds **(core)**

**Goal:** travel is your choice, not a one-way trip.
Code: `src/gameplay/PlanetProgression.js`, new `src/gameplay/Portals.js`, `src/world/` (a portal landmark),
`src/ui/` (destination picker).

- [ ] **A portal on each planet** (e.g. in the village) that takes you back and forth between the worlds you've
      unlocked by defeating their boss.
- [ ] **Going ahead early:** under a special condition (a rare key, a challenge, an item), you can travel to a planet
      whose boss you haven't beaten yet.
  - The consequence: you can't travel freely back and forth (for example, a one-way trip until that planet's boss
    falls, or until you find its portal key).
  - Decide the exact rule.
- [ ] Each planet keeps its state between visits: chests opened, monsters defeated, things built, villagers' progress.
      Today a planet is rebuilt when you arrive, so this needs per-planet saved state.
- [ ] Bosses you've beaten stay beaten (or offer a harder rematch, see 14). Travelling through a portal has its own
      fade and sound.

---

## Suggested additions

- [ ] **Save / load (suggested, high priority, needed by 13, 18 and 19):** persist the current planet, level, XP, bag, gear, pets, settings and opened chests (and, later, journal progress, buildings and each planet's state) in `localStorage`. Several features above (Continue, chests, pets) depend on it. The inventory already has `toJSON()` / `load()`.
- [ ] **Balance pass on the new bosses (suggested, high priority):** playtest Pyrrhax and Malgrath with each hero. In particular, check how often the Doom Blade is used, the damage of the Demon Lord's flying phase, and the 50% transition timing.
- [x] **Minimap or compass (suggested):** the compass strip and off-screen arrows landed with TODO 1 (a minimap could follow once planets get bigger, see 11).
- [ ] **Tutorial / onboarding (suggested):** a short guided first fight that teaches dodging, abilities and the ultimate's aim mode.
- [ ] **Death / respawn screen (suggested):** "You fainted" with a short recap and a respawn countdown, instead of only a toast.
- [ ] **Gamepad support (suggested):** movement, camera and abilities on a controller, with aiming for ground-targeted ultimates.
- [ ] **Accessibility (suggested):** colour-blind-friendly telegraph colours, reduced motion (less shake and flashing), adjustable text size.
- [ ] **Real audio (suggested):** replace the procedural placeholder sounds and music with real samples (`src/systems/AudioSystem.js`).
- [~] **Achievements / bestiary (suggested):** promoted to item 13.
- [ ] **Small fixes (suggested):** add a `favicon.ico` (the server currently returns 404 for it); add a project skill for launching and screenshotting the game in a browser (`/run-skill-generator`).
