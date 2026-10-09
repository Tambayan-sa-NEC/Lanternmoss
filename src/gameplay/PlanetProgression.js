/* PLANET PROGRESSION: every planet has a boss; defeating it clears the planet and carries the hero to the next
   entry of PLANETS (config/planets.js). State machine, advanced from the game loop (no timers, so a restart can
   cancel it at any point):
     playing --boss dies--> victory (banner; other monsters vanish; hero can't be hurt; the boss chest falls)
             --outroDelay--> loot (waits for the boss chest to be opened) --> departing --travelDelay-->
             fadeOut --fadeTime--> [load next planet] fadeIn --fadeTime--> playing
   After the last planet's boss: victory -> complete (the hero stays and can keep exploring). */
import { BOSS_CHEST } from '../config/chests.js';
import { PLANETS, TRANSITION } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { encounterEvents } from '../combat/events.js';
import { clearHazards } from '../combat/hazards.js';
import { clearEnemies, spawnBoss, spawnMiniBosses, spawnRoster } from '../combat/spawning.js';
import { clearTargets } from '../combat/targeting.js';
import { NPC } from '../entities/npc/NPC.js';
import { createLocalDefs, createNpcDefs } from '../entities/npc/npcDefs.js';
import { despawnWildlife, spawnWildlife } from '../entities/wildlife/wildlife.js';
import { audio } from '../systems/AudioSystem.js';
import { snapCamera } from '../systems/CameraSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { setFade, showBanner } from '../ui/banner.js';
import { Dialog } from '../ui/Dialog.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { toast } from '../ui/toast.js';
import { Challenges } from './challenges/Challenges.js';
import { Quests } from './quests/Quests.js';
import { Chests } from './Chests.js';
import { BossGate } from './BossGate.js';
import { Houses } from './Houses.js';
import { resetCompanion } from './characters.js';
import { clearWorldItems, spawnForage } from './pickups.js';
import { Farm } from './Farm.js';
import { Fishing } from './Fishing.js';
import { Gathering } from './Gathering.js';
import { Stations } from './Stations.js';

export class PlanetProgression {
  constructor(world) {
    this.world = world;
    this.state = 'playing'; this.timer = 0; this.pendingClear = false; this.introAt = null; this.introShown = false;
    this.lairs = {}; this.defeated = new Set(); // stable planet IDs, independent of campaign order
    encounterEvents.addEventListener('bossdefeated', e => this.onBossDefeated(e.detail.boss));
  }

  get planet() { return PLANETS[ctx.planet]; }
  get nextPlanet() { return PLANETS[ctx.planet + 1] || null; }

  /** Spawns the current planet's monsters and boss (right after the planet is generated: seeded order), then its
      forage and chests. */
  populate() {
    spawnRoster(this.world, this.planet.roster);
    spawnMiniBosses(this.world, this.planet.miniBosses);                // the hydra / basilisk out in the wilds
    const boss = spawnBoss(this.world, this.planet.boss, this.lairs[ctx.planetId]);
    this.lairs[ctx.planetId] = boss.home.clone();
    BossGate.setup(ctx.planet, boss);                                   // it sleeps until the planet's conditions are met
    spawnForage(this.planet.forage);
    Chests.spawnFor(ctx.planet, boss.home);
    this.spawnResources();
  }

  /** The village farm and crafting corner, then the planet's resource nodes (they keep clear of both). */
  spawnResources() {
    const farm = Farm.setup(this.world, ctx.planet), corner = Stations.setup(this.world, ctx.planet, farm ? [farm] : []);
    Gathering.spawnFor(this.world, ctx.planet, [farm, corner].filter(Boolean));
  }

  /** First adventure only: once play starts, point the hero at the boss after a moment. */
  onBegin() { if (ctx.planetId === PLANETS[0].id && !this.introShown) { this.introShown = true; this.introAt = ctx.time + TRANSITION.introHintDelay; } }

  toJSON() { return { defeated: [...this.defeated], introShown: this.introShown,
    lairs: Object.fromEntries(Object.entries(this.lairs).map(([id, dir]) => [id, dir.toArray()])) }; }

  /** Raised from inside the combat update (possibly mid-iteration over enemies), so the clean-up is deferred to update(). */
  onBossDefeated(boss) {
    if (this.state !== 'playing' || boss !== ctx.boss) return;          // once per planet, and only for this planet's boss
    this.state = 'victory'; this.timer = TRANSITION.outroDelay; this.pendingClear = true;
    this.defeated.add(ctx.planetId); ctx.bossesDefeated = this.defeated.size;
  }

  update(dt) {
    if (this.introAt !== null && ctx.time >= this.introAt) { this.introAt = null; toast(this.planet.arrival); }
    if (this.state === 'playing' || this.state === 'complete') return;
    const P = ctx.player;
    if (this.state === 'victory' || this.state === 'loot' || this.state === 'departing') P.invuln = Math.max(P.invuln, 0.25);
    if (this.state === 'victory') {
      if (this.pendingClear) { this.pendingClear = false; this.clearPlanet(); }
      if ((this.timer -= dt) > 0) return;
      if (!this.nextPlanet) { this.state = 'complete'; return; }
      if (Chests.bossChest && !Chests.bossChest.opened) {
        this.state = 'loot'; toast(`The treasure chest holds your reward. Open it, and the lanterns of ${this.nextPlanet.name} will carry you on.`);
      } else { this.state = 'departing'; this.timer = BOSS_CHEST.travelDelay; }
    } else if (this.state === 'loot') {
      if (!Chests.bossChest || Chests.bossChest.opened) { this.state = 'departing'; this.timer = BOSS_CHEST.travelDelay; }
    } else if (this.state === 'departing') {
      if ((this.timer -= dt) > 0) return;
      Chests.collectBossLoot();
      this.state = 'fadeOut'; this.timer = TRANSITION.fadeTime; ctx.transitioning = true; InventoryUI.close();
      setFade(true, TRANSITION.fadeTime); audio.warp();
    } else if (this.state === 'fadeOut') {
      if ((this.timer -= dt) > 0) return;
      this.load(ctx.planet + 1); this.announceArrival();
      this.state = 'fadeIn'; this.timer = TRANSITION.fadeTime; setFade(false, TRANSITION.fadeTime);
    } else if (this.state === 'fadeIn') {
      P.invuln = Math.max(P.invuln, 0.25);
      if ((this.timer -= dt) <= 0) { this.state = 'playing'; ctx.transitioning = false; }
    }
  }

  /** The boss has fallen: any active challenge is called off, the remaining monsters and stray shots vanish. */
  clearPlanet() {
    const boss = ctx.boss, next = this.nextPlanet;
    Challenges.cancel();
    for (const e of ctx.enemies) if (e !== boss) e.vanish();
    for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
    clearHazards();
    showBanner(`${boss.def.name.split(',')[0]} defeated!`, next ? `The lanterns of ${next.name} are calling...` : 'Every planet shines again. Thank you, hero!');
    audio.melody();
    Chests.spawnBossChest(boss.up);                                     // the trophy and the boss's treasure
    this.onSave?.();                                                   // after loot exists, so reloading cannot lose the reward
  }

  /** Replaces the world with PLANETS[index] and everything living on it. The hero keeps level, XP, buffs and the bag. */
  load(index, { restoring = false } = {}) {
    if (index && typeof index === 'object') {                         // registry restore, before rebuilding the world
      this.defeated = new Set(index.defeated); ctx.bossesDefeated = this.defeated.size; this.introShown = index.introShown;
      this.lairs = Object.fromEntries(Object.entries(index.lairs).map(([id, dir]) => [id, ctx.player.up.clone().fromArray(dir)]));
      return;
    }
    if (typeof index === 'string') index = PLANETS.findIndex(p => p.id === index);
    if (!PLANETS[index]) throw new Error('Unknown planet');
    this.beforeLoad?.();
    const P = ctx.player, world = this.world;
    ctx.planet = index; ctx.planetId = PLANETS[index].id; this.state = 'playing'; this.pendingClear = false;
    Dialog.close(); Challenges.cancel(); Houses.reset();
    for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
    clearHazards();
    clearEnemies(); clearTargets(); despawnWildlife(); clearWorldItems(); Chests.clear(); Fishing.end(); Gathering.clear(); Farm.clear(); Stations.clear();
    world.dispose(); world.generate(this.planet);
    Object.assign(P, { dead: false, deadT: 0, vy: 0 }); P.clearTimers();
    const fwd = P.placeAt(world.spawnDir); P.root.visible = true; P.shadow.visible = true;
    if (TRANSITION.healOnArrival) { P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; }
    P.invuln = TRANSITION.fadeTime + 1;
    // the travelling villagers move into the new village (and dress for it); the old planet's local stays behind
    const travellers = ctx.npcs.filter(n => !n.def.local), homes = createNpcDefs(world);
    for (const n of ctx.npcs) if (n.def.local) n.dispose();
    travellers.forEach((n, i) => { n.relocate(homes[i]); n.dress(index); });
    ctx.npcs = [...travellers, ...createLocalDefs(world, index).map(d => new NPC(d))];
    if (!restoring) Quests.onPlanetChange();
    spawnWildlife(world, this.planet);
    this.populate();
    if (ctx.companion) resetCompanion();
    snapCamera(world.spawnDir, fwd); releaseAllKeys();
    this.afterLoad?.();
    if (this.defeated.has(ctx.planetId)) this.state = this.nextPlanet ? 'loot' : 'complete';
    this.onSave?.();
  }

  announceArrival() { showBanner(`Planet ${ctx.planet + 1} · ${this.planet.name}`, this.planet.tagline); toast(this.planet.arrival); }

  /** A fresh adventure (back at character select): cancel any travel and return to the first planet with its boss.
      Expects the caller to have reset the enemies already (which removes bosses). */
  reset() {
    this.state = 'playing'; this.timer = 0; this.pendingClear = false; this.introAt = null; this.introShown = false;
    ctx.transitioning = false; setFade(false, 0); ctx.bossesDefeated = 0; this.defeated.clear();
    if (ctx.planetId !== PLANETS[0].id) this.load(PLANETS[0].id);
    else {
      BossGate.setup(ctx.planet, spawnBoss(this.world, this.planet.boss, this.lairs[ctx.planetId])); spawnMiniBosses(this.world, this.planet.miniBosses); clearWorldItems(); spawnForage(this.planet.forage); Chests.spawnFor(ctx.planet, this.lairs[ctx.planetId]);
      this.spawnResources();
    }
  }
}
