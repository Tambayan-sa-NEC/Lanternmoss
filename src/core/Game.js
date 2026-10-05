/* Game: builds everything in a fixed order, runs the per-frame update order, and owns the run lifecycle
   (character select -> play, planet to planet via PlanetProgression -> back to select restarts the adventure). */
import { CHALLENGES } from '../config/challenges.js';
import { CHARACTERS } from '../config/characters.js';
import { COMBAT } from '../config/combat.js';
import { resetCooldowns, tryCast } from '../combat/casting.js';
import { updateCombat } from '../combat/CombatSystem.js';
import { updateKnight } from '../combat/abilities/knight.js';
import { addEnemy, resetEnemies } from '../combat/spawning.js';
import { clearHazards } from '../combat/hazards.js';
import { clearTargets } from '../combat/targeting.js';
import { NPC } from '../entities/npc/NPC.js';
import { createNpcDefs } from '../entities/npc/npcDefs.js';
import { Player } from '../entities/player/Player.js';
import { spawnWildlife, updatePonds } from '../entities/wildlife/wildlife.js';
import { updateEmotes } from '../fx/emotes.js';
import { createSparkles, sparkles } from '../fx/sparkles.js';
import { applyCharacter } from '../gameplay/characters.js';
import { buffs, resetBuffs, updateBuffs } from '../gameplay/buffs.js';
import { useItemInSlot } from '../gameplay/itemUse.js';
import { dropFromSlot, spawnWorldItem, updateWorldItems } from '../gameplay/pickups.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { installItemNotices } from '../ui/itemNotices.js';
import { Challenges } from '../gameplay/challenges/Challenges.js';
import { PlanetProgression } from '../gameplay/PlanetProgression.js';
import { PLANETS } from '../config/planets.js';
import { installLevelFeedback } from '../progression/levelFeedback.js';
import { gainXp, levelEvents } from '../progression/experience.js';
import { LEVELING } from '../config/leveling.js';
import { camera } from '../render/scene.js';
import { audio } from '../systems/AudioSystem.js';
import { cam, initCamera, resetView, snapCamera, updateCamera } from '../systems/CameraSystem.js';
import { keys, releaseAllKeys } from '../systems/InputSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { CharacterSelect } from '../ui/CharacterSelect.js';
import { Dialog } from '../ui/Dialog.js';
import { applyUiScale, buildSpellBar, setSkillHint } from '../ui/hud.js';
import { updateWaypoints } from '../ui/waypoints.js';
import { updateOverlay } from '../ui/overlay.js';
import { toast, updateToast } from '../ui/toast.js';
import { offsetDir } from '../utils/sphere.js';
import { colliders } from '../physics/colliders.js';
import { ponds } from '../world/terrain.js';
import { World } from '../world/World.js';
import { ctx } from './context.js';
import { onSettingsChange, settings } from './settings.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { initControls } from './controls.js';
import { GameLoop } from './GameLoop.js';

export class Game {
  /** ORDER MATTERS: world generation and the initial enemy spawn share one seeded random stream, and moving bodies
      resolve collisions in creation order (player, critters, villagers, enemies). */
  init() {
    this.renderSystem = new RenderSystem();
    this.world = new World();
    ctx.planet = 0;
    this.world.generate(PLANETS[0]);
    createSparkles();

    ctx.player = new Player(this.world.spawnDir);
    initCamera(ctx.player);
    spawnWildlife(this.world);
    ctx.npcs = createNpcDefs(this.world).map(d => new NPC(d));
    resetCooldowns(COMBAT.spells);
    buildSpellBar(COMBAT.spells); setSkillHint(CHARACTERS.witch.hint);
    this.planets = new PlanetProgression(this.world);
    this.planets.populate();

    Dialog.init();
    Dialog.lineProvider = npc => Challenges.lineFor(npc);
    installLevelFeedback();
    const bag = ctx.player.inventory;
    installItemNotices(bag);
    InventoryUI.init(bag, { use: slot => useItemInSlot(bag, slot), drop: slot => dropFromSlot(slot) });
    CharacterSelect.init({ onPick: applyCharacter, onConfirm: () => this.beginGame(), onOpen: () => this.resetRun() });
    initControls(this.renderSystem.canvas);
    PauseMenu.init({ onQuit: () => CharacterSelect.open() });            // quitting = back to the menu (restarts the run)
    this.applySettings();
    onSettingsChange(key => { this.applySettings(); if (key === 'cameraDistance' || key === null) cam.dist = settings.cameraDistance; });
    addEventListener('resize', () => { this.renderSystem.resize(); applyUiScale(); }); this.renderSystem.resize();

    this.loop = new GameLoop(dt => this.update(dt), () => this.renderSystem.render(ctx.time));
  }

  start() { this.loop.start(); }

  /** Pushes the player settings (core/settings.js) into the systems that hold state: audio, renderer, HUD scale.
      Others (camera feel, shake, hit-stop, damage numbers, compass) read `settings` when they need it. */
  applySettings() {
    audio.setVolumes(settings.masterVolume / 100, settings.musicVolume / 100, settings.sfxVolume / 100);
    this.renderSystem.applyGraphics(settings);
    applyUiScale();
  }

  /** One simulation step. The order mirrors the dependencies: movement first, then everything that reacts to it. */
  update(dt) {
    if (ctx.paused) return;                                        // pause menu open: freeze everything (rendering continues)
    if (ctx.hitStop > 0) { ctx.hitStop -= dt; dt *= 0.2; }        // heavy-impact slow motion (fx/combatFx.js hitStop)
    ctx.time += dt;
    ctx.player.update(dt, { keys, viewFwd: cam.fwd, enabled: ctx.started && !ctx.transitioning });
    for (const c of ctx.critters) c.update(dt);
    for (const b of ctx.birds) b.update(dt);
    updatePonds(dt);
    for (const n of ctx.npcs) n.update(dt);
    updateWorldItems(dt);
    updateCombat(dt, this.world, keys);
    this.planets.update(dt);                                       // before challenges: a boss win calls off any active one
    Challenges.update(dt);
    updateKnight(dt);
    CharacterSelect.update(dt);
    updateCamera(dt);
    updateWaypoints();                                             // after the camera: bearings are relative to the view
    this.world.update(dt, ctx.time, ctx.player, cam.up, camera);
    sparkles.update(dt); updateEmotes(dt);
    Dialog.update(dt);
    updateOverlay(dt); updateBuffs(dt); updateToast(dt);
  }

  beginGame() {
    if (ctx.started || !CharacterSelect.choice) return;             // a hero must be picked first
    ctx.started = true; audio.init();
    CharacterSelect.close();
    resetView(ctx.player.fwd);                                     // same framing as before the menu orbit
    toast(CHARACTERS[ctx.player.charId].welcome); this.renderSystem.canvas.focus();
    this.planets.onBegin();
  }

  /** Back to a fresh adventure: clears everything the previous character left behind. */
  resetRun() {
    const P = ctx.player, world = this.world;
    Dialog.close(); InventoryUI.close();
    Challenges.reset();
    for (const n of ctx.npcs) n.resetLines();
    resetBuffs();
    for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
    clearHazards(); ctx.hitStop = 0;
    resetEnemies();
    clearTargets();
    if (ctx.companion) { ctx.companion.dispose(); ctx.companion = null; }
    this.planets.reset();                                          // back to the first planet (and its boss)
    Object.assign(P, { dead: false, deadT: 0, vy: 0, level: 1, xp: 0, stats: CHARACTERS[P.charId].stats });   // a fresh adventure starts back at level 1
    P.clearTimers(); P.inventory.clear();
    const fwd = P.placeAt(world.spawnDir);
    P.root.visible = true; snapCamera(world.spawnDir, fwd);
    world.resetSun();
    releaseAllKeys();
  }

  /** Console handle for poking at a running game (window.LANTERNMOSS). */
  debugHandle() {
    const game = this;
    return { Challenges, CHALLENGES, Dialog, buffs, cam, keys, CharacterSelect, CHARACTERS, LEVELING, levelEvents, gainXp, tryCast, colliders, ponds,
      get player() { return ctx.player; }, get npcs() { return ctx.npcs; }, get critters() { return ctx.critters; }, get birds() { return ctx.birds; },
      get enemies() { return ctx.enemies; }, get projectiles() { return ctx.projectiles; }, get companion() { return ctx.companion; },
      get inventory() { return ctx.player.inventory; }, get worldItems() { return ctx.worldItems; }, items: itemRegistry, InventoryUI,
      spawnItem: (id, qty = 1, arc = 2) => spawnWorldItem(id, qty, offsetDir(ctx.player.up, Math.random() * 6.28, arc)),
      get planet() { return ctx.planet; }, get boss() { return ctx.boss; }, planets: game.planets, PLANETS,
      goToPlanet: i => { game.planets.load(i); game.planets.announceArrival(); },
      begin: () => game.beginGame(), update: dt => game.update(dt),
      spawnEnemy: (type, arc = 7) => addEnemy(type, offsetDir(ctx.player.up, Math.random() * 6.28, arc)) };
  }
}
