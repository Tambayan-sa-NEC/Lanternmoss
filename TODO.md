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

## 6. Enterable houses **(core)**

**Goal:** the player can walk into village houses.
Code: `src/world/village.js`, `src/world/props.js`, `src/physics/colliders.js`, `src/systems/CameraSystem.js`.

- [ ] Doors with a "press E to enter" prompt.
- [ ] Interiors as separate small scenes (simpler than carving real interiors into a tiny curved planet): fade out, load the room, fade in, and the reverse on exit.
- [ ] A fixed or close-follow camera mode for small indoor spaces.
- [ ] Furniture, an NPC who lives there, and things to interact with (bed to rest/heal, chest, bookshelf lore).
- [ ] No combat indoors (a safe zone, like the village).

## 7. Chests **(core)**

**Goal:** rewarding exploration with loot.
Code: new `src/entities/Chest.js`, `src/gameplay/pickups.js` (`grantItem` / `spawnWorldItem`), `src/config/items.js`, `src/config/planets.js`.

- [ ] Chest entity with an opening animation, sparkle burst and sound.
- [ ] Loot tables per chest type (common / rare / boss chest), defined in config.
- [ ] Placement per planet in config (like `forage`), plus chests inside houses and a boss chest after each boss.
- [ ] Opened state remembered for the run, so chests don't refill when you come back.
- [ ] Optional: locked chests that need a key dropped by a monster or given by an NPC.

## 8. Better items **(core)**

**Goal:** items that matter for gameplay, not just healing.
Code: `src/config/items.js`, `src/items/`, `src/inventory/`, `src/gameplay/itemUse.js`, `src/ui/InventoryUI.js`.

- [ ] **Equipment system:** equip slots (weapon, armour, charm) with stat bonuses. The `equipment` / `weapon` categories already exist but do nothing yet.
- [ ] Item rarities that affect stats (the `RARITIES` table already exists).
- [ ] Monster and boss drops.
- [ ] Crafting from materials (Glowcap, Ember Shard, Frost Petal already exist but have no use).
- [ ] Better item art: icons and world models per item instead of shared shapes.
- [ ] Quick-use slots for potions on number keys (avoid conflicts with ability keys `1`–`5`).

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
