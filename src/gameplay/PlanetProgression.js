/* Boss wins leave the hero on their current world with its treasure. The village portal is the only campaign
   travel trigger: playing/loot/complete -> fadeOut -> load chosen world -> fadeIn -> playing/complete.
   Saved planet deltas restore over deterministic generation; beaten bosses and mini bosses stay beaten. */
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
import { Portals } from './Portals.js';
import { PortalUI } from '../ui/PortalUI.js';
import { cancelAim } from '../combat/aiming.js';
import { ShopUI } from '../ui/ShopUI.js';

export class PlanetProgression {
  constructor(world) {
    this.world = world;
    this.state = 'playing'; this.timer = 0; this.pendingClear = false; this.introAt = null; this.introShown = false;
    this.lairs = {}; this.defeated = new Set(); this.miniDefeated = new Set();
    Portals.progression = this;
    encounterEvents.addEventListener('bossdefeated', e => this.onBossDefeated(e.detail.boss));
    encounterEvents.addEventListener('enemydefeated', e => { if (e.detail.enemy.portalId) this.miniDefeated.add(e.detail.enemy.portalId); });
  }

  get planet() { return PLANETS[ctx.planet]; }
  get nextPlanet() { return PLANETS[ctx.planet + 1] || null; }
  get complete() { return PLANETS.every(p => this.defeated.has(p.id)); }

  /** Spawns the current planet's monsters and boss (right after the planet is generated: seeded order), then its
      forage and chests. */
  populate() {
    spawnRoster(this.world, this.planet.roster);
    spawnMiniBosses(this.world, this.planet.miniBosses).forEach((e, i) => { e.portalId = `${ctx.planetId}:mini:${i}`; });
    const boss = spawnBoss(this.world, this.planet.boss, this.lairs[ctx.planetId]);
    this.lairs[ctx.planetId] = boss.home.clone();
    BossGate.setup(ctx.planet, boss);                                   // it sleeps until the planet's conditions are met
    spawnForage(this.planet.forage);
    Chests.spawnFor(ctx.planet, boss.home);
    this.spawnResources();
    for (const e of ctx.enemies) if (this.miniDefeated.has(e.portalId)) e.vanish();
    Portals.setup(this.world, [Farm.center && [Farm.center, 8], Stations.center && [Stations.center, 5]].filter(Boolean));
  }

  /** The village farm and crafting corner, then the planet's resource nodes (they keep clear of both). */
  spawnResources() {
    const farm = Farm.setup(this.world, ctx.planet), corner = Stations.setup(this.world, ctx.planet, farm ? [farm] : []);
    Gathering.spawnFor(this.world, ctx.planet, [farm, corner].filter(Boolean));
  }

  /** First adventure only: once play starts, point the hero at the boss after a moment. */
  onBegin() { if (ctx.planetId === PLANETS[0].id && !this.introShown) { this.introShown = true; this.introAt = ctx.time + TRANSITION.introHintDelay; } }

  toJSON() { return { defeated: [...this.defeated], introShown: this.introShown,
    lairs: Object.fromEntries(Object.entries(this.lairs).map(([id, dir]) => [id, dir.toArray()])), miniDefeated: [...this.miniDefeated] }; }

  /** Raised from inside the combat update (possibly mid-iteration over enemies), so the clean-up is deferred to update(). */
  onBossDefeated(boss) {
    if (this.state !== 'playing' || boss !== ctx.boss || this.defeated.has(ctx.planetId)) return;
    this.state = 'victory'; this.timer = TRANSITION.outroDelay; this.pendingClear = true;
    this.defeated.add(ctx.planetId); ctx.bossesDefeated = this.defeated.size;
  }

  update(dt) {
    if (this.introAt !== null && ctx.time >= this.introAt) { this.introAt = null; toast(this.planet.arrival); }
    Portals.update();
    if (this.state === 'playing' || this.state === 'complete') return;
    const P = ctx.player;
    if (this.state === 'victory') P.invuln = Math.max(P.invuln, 0.25);
    if (this.state === 'victory') {
      if (this.pendingClear) { this.pendingClear = false; this.clearPlanet(); }
      if ((this.timer -= dt) > 0) return;
      if (!this.nextPlanet) { this.state = this.complete ? 'complete' : 'playing'; return; }
      if (Chests.bossChest && !Chests.bossChest.opened) {
        this.state = 'loot'; toast(`Your treasure is waiting. The village lantern gate now reaches ${this.nextPlanet.name}; travel when you choose.`);
      } else this.state = 'playing';
    } else if (this.state === 'loot') {
      if (!Chests.bossChest || Chests.bossChest.opened) this.state = 'playing';
    } else if (this.state === 'fadeOut') {
      if ((this.timer -= dt) > 0) return;
      this.load(this.destination); this.announceArrival();
      this.state = 'fadeIn'; this.timer = TRANSITION.fadeTime; setFade(false, TRANSITION.fadeTime);
    } else if (this.state === 'fadeIn') {
      P.invuln = Math.max(P.invuln, 0.25);
      if ((this.timer -= dt) <= 0) {
        this.state = this.complete ? 'complete' : 'playing'; ctx.transitioning = false; this.onSave?.();
      }
    }
  }

  /** Explicit portal travel; keys and reachability are checked by Portals before the fade starts. */
  travelTo(id) {
    this.destination = id; this.state = 'fadeOut'; this.timer = TRANSITION.fadeTime; ctx.transitioning = true;
    InventoryUI.close(); ShopUI.close(); Dialog.close(); cancelAim(); Gathering.stop(); Fishing.end(); releaseAllKeys();
    ctx.player.invuln = Math.max(ctx.player.invuln, TRANSITION.fadeTime * 2 + 1);
    ctx.player.vel.set(0, 0, 0); setFade(true, TRANSITION.fadeTime); audio.warp();
  }

  /** The boss has fallen: any active challenge is called off, the remaining monsters and stray shots vanish. */
  clearPlanet() {
    const boss = ctx.boss, next = this.nextPlanet;
    Challenges.cancel();
    for (const e of ctx.enemies) if (e !== boss) e.vanish();
    for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
    clearHazards();
    showBanner(`${boss.def.name.split(',')[0]} defeated!`, this.complete ? 'Every planet shines again. Thank you, hero!'
      : next ? `The village lantern gate now reaches ${next.name}. Travel when you choose.` : 'The village lantern gate is open. Travel when you choose.');
    audio.melody();
    Chests.spawnBossChest(boss.up);                                     // the trophy and the boss's treasure
    this.onSave?.();                                                   // after loot exists, so reloading cannot lose the reward
  }

  /** Replaces the world with PLANETS[index] and everything living on it. The hero keeps level, XP, buffs and the bag. */
  load(index, { restoring = false } = {}) {
    if (index && typeof index === 'object') {                         // registry restore, before rebuilding the world
      this.defeated = new Set(index.defeated); ctx.bossesDefeated = this.defeated.size; this.introShown = index.introShown;
      this.miniDefeated = new Set(index.miniDefeated ?? []);
      this.lairs = Object.fromEntries(Object.entries(index.lairs).map(([id, dir]) => [id, ctx.player.up.clone().fromArray(dir)]));
      return;
    }
    if (typeof index === 'string') index = PLANETS.findIndex(p => p.id === index);
    if (!PLANETS[index]) throw new Error('Unknown planet');
    this.beforeLoad?.(); PortalUI.close(); Portals.clear();
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
    if (this.defeated.has(ctx.planetId) && BossGate.state !== 'beaten') BossGate.load({ ...BossGate.toJSON(), beaten: true });
    Portals.update();
    if (this.defeated.has(ctx.planetId)) this.state = this.complete ? 'complete' : 'loot';
    this.onSave?.();
  }

  announceArrival() { showBanner(`Planet ${ctx.planet + 1} · ${this.planet.name}`, this.planet.tagline); toast(this.planet.arrival); }

  /** A fresh adventure (back at character select): cancel any travel and return to the first planet with its boss.
      Expects the caller to have reset the enemies already (which removes bosses). */
  reset() {
    Portals.reset(); this.miniDefeated.clear(); this.lairs = {};
    this.state = 'playing'; this.timer = 0; this.pendingClear = false; this.introAt = null; this.introShown = false;
    ctx.transitioning = false; setFade(false, 0); ctx.bossesDefeated = 0; this.defeated.clear();
    // Regenerate even when already home: reuse of the old seed stream moved mini bosses and their resource sites.
    this.load(PLANETS[0].id);
  }
}
