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

## 9. Better pet system **(core)**

**Goal:** companions are a feature in their own right, not just a hero accessory.
Code: `src/entities/companions/Owl.js`, `src/entities/companions/Wolf.js`, `src/gameplay/characters.js`.

- [ ] Pets level up alongside the hero, with stronger attacks at higher levels.
- [ ] Pet commands: follow, stay, attack my target, passive.
- [ ] More pets, unlocked through quests, chests or bosses, and any hero can pick any unlocked pet.
- [ ] Pet abilities with their own cooldown shown on the HUD (e.g. Wolf howl buff, Owl scouting reveal).
- [ ] Pet care touches: naming, petting, an emote reaction, a pet health bar and fainting instead of dying.

---

## Suggested additions

- [ ] **Save / load (suggested, high priority):** persist the current planet, level, XP, bag, settings and opened chests in `localStorage`. Several features above (Continue, chests, pets) depend on it. The inventory already has `toJSON()` / `load()`.
- [ ] **Balance pass on the new bosses (suggested, high priority):** playtest Pyrrhax and Malgrath with each hero. In particular, check how often the Doom Blade is used, the damage of the Demon Lord's flying phase, and the 50% transition timing.
- [ ] **Minimap or compass (suggested):** helps with finding the boss lair, chests and quest NPCs on the round planet.
- [ ] **Tutorial / onboarding (suggested):** a short guided first fight that teaches dodging, abilities and the ultimate's aim mode.
- [ ] **Death / respawn screen (suggested):** "You fainted" with a short recap and a respawn countdown, instead of only a toast.
- [ ] **Gamepad support (suggested):** movement, camera and abilities on a controller, with aiming for ground-targeted ultimates.
- [ ] **Accessibility (suggested):** colour-blind-friendly telegraph colours, reduced motion (less shake and flashing), adjustable text size.
- [ ] **Real audio (suggested):** replace the procedural placeholder sounds and music with real samples (`src/systems/AudioSystem.js`).
- [ ] **Achievements / bestiary (suggested):** a journal of monsters met, bosses beaten and items found.
- [ ] **Small fixes (suggested):** add a `favicon.ico` (the server currently returns 404 for it); add a project skill for launching and screenshotting the game in a browser (`/run-skill-generator`).
