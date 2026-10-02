/* PLANET PROGRESSION: every planet has a boss; defeating it clears the planet and carries the hero to the next
   entry of PLANETS (config/planets.js). State machine, advanced from the game loop (no timers, so a restart can
   cancel it at any point):
     playing --boss dies--> victory (banner; other monsters vanish; hero can't be hurt)
             --outroDelay--> fadeOut --fadeTime--> [load next planet] fadeIn --fadeTime--> playing
   After the last planet's boss: victory -> complete (the hero stays and can keep exploring). */
import { PLANETS, TRANSITION } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { encounterEvents } from '../combat/events.js';
import { clearHazards } from '../combat/hazards.js';
import { clearEnemies, spawnBoss, spawnRoster } from '../combat/spawning.js';
import { clearTargets } from '../combat/targeting.js';
import { createNpcDefs } from '../entities/npc/npcDefs.js';
import { despawnWildlife, spawnWildlife } from '../entities/wildlife/wildlife.js';
import { audio } from '../systems/AudioSystem.js';
import { snapCamera } from '../systems/CameraSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { setFade, showBanner } from '../ui/banner.js';
import { Dialog } from '../ui/Dialog.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { toast } from '../ui/toast.js';
import { Challenges } from './challenges/Challenges.js';
import { resetCompanion } from './characters.js';
import { clearWorldItems, grantItem, spawnForage } from './pickups.js';

export class PlanetProgression {
  constructor(world) {
    this.world = world;
    this.state = 'playing'; this.timer = 0; this.pendingClear = false; this.introAt = null; this.introShown = false;
    this.lairs = [];                     // each planet's boss lair, kept so a revisited planet's boss waits in the same place
    encounterEvents.addEventListener('bossdefeated', e => this.onBossDefeated(e.detail.boss));
  }

  get planet() { return PLANETS[ctx.planet]; }
  get nextPlanet() { return PLANETS[ctx.planet + 1] || null; }

  /** Spawns the current planet's monsters and boss (right after the planet is generated: seeded order), then its forage. */
  populate() {
    spawnRoster(this.world, this.planet.roster);
    const boss = spawnBoss(this.world, this.planet.boss, this.lairs[ctx.planet]);
    this.lairs[ctx.planet] = boss.home.clone();
    spawnForage(this.planet.forage);
  }

  /** First adventure only: once play starts, point the hero at the boss after a moment. */
  onBegin() { if (ctx.planet === 0 && !this.introShown) { this.introShown = true; this.introAt = ctx.time + TRANSITION.introHintDelay; } }

  /** Raised from inside the combat update (possibly mid-iteration over enemies), so the clean-up is deferred to update(). */
  onBossDefeated(boss) {
    if (this.state !== 'playing' || boss !== ctx.boss) return;          // once per planet, and only for this planet's boss
    this.state = 'victory'; this.timer = TRANSITION.outroDelay; this.pendingClear = true;
  }

  update(dt) {
    if (this.introAt !== null && ctx.time >= this.introAt) { this.introAt = null; toast(this.planet.arrival); }
    if (this.state === 'playing' || this.state === 'complete') return;
    const P = ctx.player;
    if (this.state === 'victory') {
      if (this.pendingClear) { this.pendingClear = false; this.clearPlanet(); }
      P.invuln = Math.max(P.invuln, 0.25);
      if ((this.timer -= dt) > 0) return;
      if (!this.nextPlanet) { this.state = 'complete'; return; }
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
    if (this.planet.boss.trophy) grantItem(this.planet.boss.trophy);
  }

  /** Replaces the world with PLANETS[index] and everything living on it. The hero keeps level, XP, buffs and the bag. */
  load(index) {
    const P = ctx.player, world = this.world;
    ctx.planet = index;
    Dialog.close(); Challenges.cancel();
    for (const p of ctx.projectiles) p.dispose(); ctx.projectiles.length = 0;
    clearHazards();
    clearEnemies(); clearTargets(); despawnWildlife(); clearWorldItems();
    world.dispose(); world.generate(this.planet);
    Object.assign(P, { dead: false, deadT: 0, vy: 0 }); P.clearTimers();
    const fwd = P.placeAt(world.spawnDir); P.root.visible = true; P.shadow.visible = true;
    if (TRANSITION.healOnArrival) { P.hp = P.stats.maxHp; P.mana = P.stats.maxMana; }
    P.invuln = TRANSITION.fadeTime + 1;
    const homes = createNpcDefs(world); ctx.npcs.forEach((n, i) => n.relocate(homes[i].dir));
    spawnWildlife(world);
    this.populate();
    if (ctx.companion) resetCompanion();
    snapCamera(world.spawnDir, fwd); releaseAllKeys();
  }

  announceArrival() { showBanner(`Planet ${ctx.planet + 1} · ${this.planet.name}`, this.planet.tagline); toast(this.planet.arrival); }

  /** A fresh adventure (back at character select): cancel any travel and return to the first planet with its boss.
      Expects the caller to have reset the enemies already (which removes bosses). */
  reset() {
    this.state = 'playing'; this.timer = 0; this.pendingClear = false; this.introAt = null; this.introShown = false;
    ctx.transitioning = false; setFade(false, 0);
    if (ctx.planet !== 0) this.load(0);
    else { spawnBoss(this.world, this.planet.boss, this.lairs[0]); clearWorldItems(); spawnForage(this.planet.forage); }
  }
}
