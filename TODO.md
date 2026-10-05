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

## 2. Pause menu **(core)**

**Goal:** `Esc` (when nothing else is open) pauses the game and opens a menu.
Code: `src/core/controls.js` (Esc handling), `src/core/Game.js` (update loop), new `src/ui/PauseMenu.js`.

- [ ] Pausing freezes the simulation (skip `Game.update`, keep rendering), mutes or ducks audio, and releases held keys.
- [ ] **Resume**: closes the menu and continues.
- [ ] **Settings**: opens the settings screen (section 2a).
- [ ] **Controls / keymap**: shows every binding, generated from `CHARACTERS[...].abilities` and the fixed keys, so it never goes stale.
- [ ] **Quit**: back to the main menu (with an "are you sure? progress on this planet is lost" confirm until saving exists).
- [ ] Esc priority: close the inventory / dialogue / ability aiming first; only open the pause menu when none of those is active.

### 2a. Settings screen **(core)**
- [ ] Audio: master, music and effects volume sliders (`src/systems/AudioSystem.js`).
- [ ] Camera: mouse sensitivity, invert Y, default zoom (`src/systems/CameraSystem.js`).
- [ ] Graphics: bloom on/off, outline width, pixel ratio / quality preset (`src/config/render.js`).
- [ ] Gameplay: screen shake intensity, damage numbers on/off, hit-stop on/off.
- [ ] Interface: HUD size slider (call `setUiScale()` from `src/ui/hud.js`), compass on/off.
- [ ] Remappable keys (stretch goal; needs bindings to move out of `CHARACTERS` key lists into one keymap table).
- [ ] Remember settings in `localStorage`.

## 3. Main menu / landing page **(core)**

**Goal:** a proper title screen before character selection.
Code: `index.html` (`#start`), `src/ui/CharacterSelect.js`, `styles/main.css`.

- [ ] Title screen with the logo, a slowly orbiting live view of the planet behind it, and soft music.
- [ ] Buttons: **Play** / **Continue** (once saving exists), **Settings**, **Controls**, **Credits**.
- [ ] Animated transition from the menu into character selection, and from selection into the game.
- [ ] Show a short tagline and the current campaign (Lanternmoss → Emberfall → Frostveil).

## 4. Character selection **(core)**

**Goal:** choosing a hero feels like a moment, and the differences between heroes are obvious.
Code: `src/ui/CharacterSelect.js`, `src/config/characters.js`, `src/models/heroes.js`.

- [ ] Show the selected hero's 3D model large on screen, playing an idle or showcase animation (with drag to rotate).
- [ ] Hero card with role, difficulty, a stat summary (HP, resource, range) and their companion.
- [ ] Ability preview: the 5 abilities with icon, key, short description, and the ultimate highlighted.
- [ ] Switching heroes plays a short swap animation and voice-like sound cue.
- [ ] Optional: colour variants / outfits per hero.

## 5. Better NPCs **(core)**

**Goal:** villagers feel alive and give the player reasons to come back.
Code: `src/entities/npc/NPC.js`, `src/entities/npc/npcDefs.js`, `src/ui/Dialog.js`, `src/gameplay/challenges/`.

- [ ] Daily routines: walk between home, work spot and the square depending on the sun / time of day.
- [ ] More dialogue: lines that react to progress (bosses defeated, current planet, hero picked, level).
- [ ] Portraits or expressions in the dialogue box.
- [ ] Shopkeeper NPC that buys and sells items (item `value` already exists in `src/config/items.js`).
- [ ] Quest givers with multi-step quests, building on the challenge system.
- [ ] Villagers on every planet, not just the same cast relocated (new looks per planet).

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
