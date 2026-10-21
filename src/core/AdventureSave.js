/* Adventure lifecycle and the save registry. Restore globals first, regenerate the planet, apply its snapshots,
   then position the hero and pet. No gameplay rewards or journal events are emitted during restoration. */
import { CHARACTERS } from '../config/characters.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from './context.js';
import { AUTOSAVE_SECONDS, MAX_SAVE_BYTES, parseSave, SaveRegistry, SaveStore } from './save.js';
import { CombatState } from '../combat/casting.js';
import { RareGifts } from '../entities/wildlife/wildlife.js';
import { BuffState } from '../gameplay/buffs.js';
import { BossGate } from '../gameplay/BossGate.js';
import { Challenges } from '../gameplay/challenges/Challenges.js';
import { Chests } from '../gameplay/Chests.js';
import { CaveRewards } from '../gameplay/CaveRewards.js';
import { CavePuzzles } from '../gameplay/CavePuzzles.js';
import { dayClock } from '../gameplay/dayClock.js';
import { Equipment, computeStats } from '../gameplay/equipment.js';
import { Farm } from '../gameplay/Farm.js';
import { Fireflies } from '../gameplay/Fireflies.js';
import { Gathering } from '../gameplay/Gathering.js';
import { Hotbar } from '../gameplay/hotbar.js';
import { Houses, houseDef } from '../gameplay/Houses.js';
import { Pets } from '../gameplay/Pets.js';
import { Pickups } from '../gameplay/pickups.js';
import { Quests } from '../gameplay/quests/Quests.js';
import { StoryMemory } from '../gameplay/storyState.js';
import { Tutorial } from '../gameplay/Tutorial.js';
import { RecipeBook } from '../gameplay/RecipeBook.js';
import { Portals } from '../gameplay/Portals.js';
import { Home } from '../gameplay/Home.js';
import { Building } from '../gameplay/Building.js';
import { Bounties } from '../gameplay/Bounties.js';
import { Talents } from '../gameplay/Talents.js';
import { Dungeons } from '../gameplay/Dungeons.js';
import { applyCharacter } from '../gameplay/characters.js';
import { audio } from '../systems/AudioSystem.js';
import { resetView, snapCamera } from '../systems/CameraSystem.js';
import { releaseAllKeys } from '../systems/InputSystem.js';
import { setFade } from '../ui/banner.js';
import { CharacterSelect } from '../ui/CharacterSelect.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { toast } from '../ui/toast.js';
import { dom } from '../ui/dom.js';
import { projectTangent } from '../utils/sphere.js';

/** Saved inside a cave (29d): the surface pose still points at the cave mouth, so a save that cannot go back inside
    (an old file, a cave since unreleased) puts the hero down safely above ground; `cave` and the room coordinates
    carry the indoor pose, and restore() walks back in. */
const cavePose = () => {
  const s = Dungeons.inside; if (!s) return {};
  const m = Dungeons.mouth?.dir ?? Dungeons.world?.spawnDir;
  return { ...(m ? { up: m.toArray(), fwd: (Dungeons.mouth?.fwd ?? ctx.player.fwd).toArray() } : {}),
    cave: s.cave.id, caveX: s.x, caveZ: s.z };
};

export class AdventureSave {
  constructor(game) {
    this.game = game; this.store = new SaveStore(); this.registry = new SaveRegistry();
    this.restoring = false; this.suspended = false; this.timer = AUTOSAVE_SECONDS; this.errorShown = false;
    const player = {
      toJSON: () => ({ ...ctx.player.toJSON(), ...cavePose(), indoors: Houses.inside?.index ?? null,
        roomX: Houses.inside?.x ?? 0, roomZ: Houses.inside?.z ?? 0 }),
      load: data => ctx.player.load(data),
    };
    for (const [key, system] of Object.entries({ player, inventory: ctx.player.inventory, equipment: Equipment, hotbar: Hotbar,
      pets: Pets, quests: Quests, challenges: Challenges, story: StoryMemory, dayClock, buffs: BuffState,
      houses: Houses, rareGifts: RareGifts, progression: game.planets, portals: Portals, combat: CombatState, tutorial: Tutorial, crafting: RecipeBook, talents: Talents,
      home: Home, farm: Farm, bounties: Bounties, gathering: Gathering, chests: Chests, caves: CaveRewards, cavePuzzles: CavePuzzles, bossGate: BossGate, pickups: Pickups, building: Building,
      fireflies: Fireflies, mechanics: game.world.mechanics })) this.registry.register(key, system);
    this.registry.assertComplete();
    game.world.mechanics.snapshotForPlanet = id => this.registry.planets[id]?.mechanics;
    game.planets.beforeLoad = () => { if (!this.restoring && !this.suspended && ctx.started) { StoryMemory.toJSON(); this.registry.capturePlanet(ctx.planetId); } };
    game.planets.afterLoad = () => { if (!this.suspended) {
      this.registry.restorePlanet(ctx.planetId, { skip: ['mechanics'] }); StoryMemory.restore();
    } }; // Mechanic state already loaded before enter/population; loading again would undo away-time advancement.
    game.planets.onSave = () => this.save({ quiet: true, arrival: true });
    addEventListener('pagehide', () => { this.save({ quiet: true, arrival: true }); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save({ quiet: true, arrival: true }); });
  }
  summary() {
    const r = this.store.read(); if (!r.ok) return null;
    const p = r.data.systems.player;
    return { hero: CHARACTERS[p.charId].title, planet: PLANETS.find(w => w.id === r.data.planetId).name, level: p.level, savedAt: r.data.savedAt };
  }
  save({ quiet = false, arrival = false } = {}) {
    if (!ctx.started || this.restoring || this.suspended) return { ok: false, message: 'Start an adventure before saving.' };
    if (this.game.planets.state === 'fadeOut') return { ok: false, message: 'Wait until portal travel finishes to save.' };
    // A house fade can execute a sleep action; keep the last stable snapshot until that action finishes.
    if (Houses.fade || ctx.transitioning && !arrival) return { ok: false, message: 'Wait until travel finishes to save.' };
    if (this.game.planets.pendingClear) return { ok: false, message: 'Wait for the boss treasure to appear.' };
    let result;
    try { result = this.store.write(this.registry.snapshot(ctx.planetId)); }
    catch { result = { ok: false, message: 'Could not save this adventure. Export a copy before leaving.' }; }
    if (result.ok) {
      this.timer = AUTOSAVE_SECONDS; this.errorShown = false; if (!quiet) toast('Saved'); MainMenu.refreshSave();
      dom.saveNotice.textContent = 'Saved'; dom.saveNotice.style.opacity = 1;
      clearTimeout(this.noticeTimer); this.noticeTimer = setTimeout(() => { dom.saveNotice.style.opacity = 0; }, 2600);
    }
    else if (!quiet || !this.errorShown) { this.errorShown = true; toast(result.message); }
    return result;
  }
  update(dt) {
    if (!ctx.started || this.restoring || this.suspended) return;
    if ((this.timer -= dt) <= 0) {
      const result = this.save(); if (!result.ok) this.timer = 15;
    }
  }
  reset() { this.registry.reset(); this.timer = AUTOSAVE_SECONDS; StoryMemory.reset(); }
  continue() {
    const result = this.store.read(); if (!result.ok) { toast(result.message ?? 'No saved adventure yet.'); return false; }
    return this.restore(result.data);
  }
  restore(data) {
    this.restoring = true;
    try {
      PauseMenu.close(); CharacterSelect.hide(); ctx.started = false;
      this.game.resetRun();
      applyCharacter(data.systems.player.charId);
      this.registry.load(data);
      this.game.planets.load(data.planetId, { restoring: true });
      // World loading heals the hero and rebuilds the pet. Restore saved vitals after those steps.
      ctx.player.load(data.systems.player); ctx.player.stats = computeStats();
      if (ctx.player.dead) ctx.player.deadT = Tutorial.state.remaining;
      ctx.player.hp = Math.min(ctx.player.stats.maxHp, ctx.player.hp);
      ctx.player.mana = Math.min(ctx.player.stats.maxMana, ctx.player.mana);
      const p = ctx.player, saved = data.systems.player;
      const dir = saved.up ? p.up.clone().fromArray(saved.up) : this.game.world.spawnDir;
      p.placeAt(dir); p.grounded = true;
      if (saved.fwd) { projectTangent(p.fwd.fromArray(saved.fwd), p.up); if (p.fwd.lengthSq() > 1e-8) p.fwd.normalize(); else p.fwd.copy(p.placeAt(dir)); }
      Pets.load(data.systems.pets);
      Challenges.restoreRun(); StoryMemory.restore();
      Portals.restoreFight();
      ctx.started = true; ctx.paused = ctx.transitioning = ctx.cutscene = false;
      document.body.classList.remove('menu', 'paused', 'cutscene'); setFade(false, 0);
      CharacterSelect.close(); MainMenu.onBegin(); audio.init(); resetView(p.fwd); snapCamera(p.up, p.fwd);
      if (saved.indoors !== null) {
        Houses.goInside(saved.indoors, houseDef(saved.indoors));
        Houses.inside.x = saved.roomX; Houses.inside.z = saved.roomZ; Houses.placeHero();
      }
      // Back into the cave the hero was standing in, at the room pose. A cave that is no longer this planet's (or no
      // longer released) is skipped, and the surface pose at its mouth stands instead.
      else if (saved.cave && Dungeons.caveFor(ctx.planet)?.id === saved.cave) {
        Dungeons.goInside(ctx.planet);
        Dungeons.inside.x = saved.caveX; Dungeons.inside.z = saved.caveZ; Dungeons.placeHero();
        snapCamera(ctx.player.up, ctx.player.fwd);
      }
      this.game.world.setDaylight(dayClock.light());
      releaseAllKeys(); this.game.renderSystem.canvas.focus(); this.timer = AUTOSAVE_SECONDS;
      toast('Adventure continued'); return true;
    } finally { this.restoring = false; }
  }
  export() {
    if (ctx.started && (ctx.transitioning || Houses.fade || this.game.planets.pendingClear)) {
      toast('Wait until travel or the boss reward finishes to export.'); return false;
    }
    let data;
    try { data = ctx.started ? this.registry.snapshot(ctx.planetId) : this.store.read().data; }
    catch { toast('Could not export this adventure.', { menu: true }); return false; }
    if (!data) { toast('No saved adventure to export.', { menu: true }); return false; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `lanternmoss-${data.planetId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Adventure exported', { menu: true }); return true;
  }
  async importFile(file) {
    if (!file) return { ok: false, cancelled: true };
    if (file.size > MAX_SAVE_BYTES) return { ok: false, message: 'That save file is too large.' };
    try { return parseSave(await file.text()); } catch { return { ok: false, message: 'Could not read that save file.' }; }
  }
  importData(data) {
    const result = this.store.write(data); if (!result.ok) { toast(result.message, { menu: true }); return false; }
    MainMenu.refreshSave(); return this.restore(result.data);
  }
}
