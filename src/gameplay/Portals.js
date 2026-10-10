import { ctx } from '../core/context.js';
import { gameEvents } from '../core/events.js';
import { arcDist } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';
import { buildPortal } from '../world/portal.js';
import { PortalUI } from '../ui/PortalUI.js';
import { toast } from '../ui/toast.js';
import { Challenges } from './challenges/Challenges.js';
import { grantItem } from './pickups.js';
import { portalDestinations } from './portalRules.js';
import { Journal } from './Journal.js';

export const Portals = {
  gate: null, progression: null, stranded: null, rewarded: new Set(),
  get keys() { return ctx.player.inventory.count('wayfarerKey'); },
  toJSON() { const fight = Journal.fight?.boss === ctx.boss ? Journal.fight : null;
    return { stranded: this.stranded, rewarded: [...this.rewarded],
      fight: fight ? { planetId: ctx.planetId, hit: fight.hit, pet: fight.pet, level: fight.level } : null }; },
  load(data) { this.stranded = data.stranded; this.rewarded = new Set(data.rewarded); this.savedFight = data.fight; },
  restoreFight() {
    if (this.savedFight?.planetId === ctx.planetId && ctx.boss?.alive) Journal.fight = { ...this.savedFight, boss: ctx.boss };
    this.savedFight = null;
  },
  reset() { PortalUI.close(); this.stranded = null; this.rewarded.clear(); this.savedFight = null; this.clear(); },
  clear() { this.gate?.dispose(); this.gate = null; },
  setup(world, avoid) { this.clear(); this.gate = buildPortal(world, avoid); this.update(); },
  destinations() { return portalDestinations(ctx.planetId, this.progression.defeated, this.stranded, this.keys); },
  canUse() {
    return !!this.gate && ctx.started && !ctx.paused && !ctx.inventoryOpen && !ctx.player.dead && !ctx.indoors && !ctx.transitioning && !ctx.cutscene
      && !this.progression.pendingClear && this.progression.state !== 'victory' && arcDist(ctx.player.up, this.gate.dir) < 3;
  },
  target() {
    if (!this.canUse()) return null;
    return { dist: arcDist(ctx.player.up, this.gate.dir), label: 'Choose a destination at the lantern gate',
      at: this.gate.dir.clone().multiplyScalar(groundHeight(this.gate.dir) + 3.8), run: () => {
        if (Challenges.run) { toast('Finish your challenge before travelling.'); return; }
        PortalUI.open();
      } };
  },
  travel(id) {
    const destination = this.destinations().find(d => d.id === id);
    if (!this.canUse() || Challenges.run || !destination?.enabled) return false;
    if (destination.cost && !ctx.player.inventory.remove('wayfarerKey', 1)) return false;
    this.stranded = destination.home || destination.free ? null : { at: id, from: ctx.planetId };
    this.progression.travelTo(id); return true;
  },
  update() {
    if (this.stranded?.at === ctx.planetId && this.progression.defeated.has(ctx.planetId)) this.stranded = null;
    const options = this.destinations();
    this.gate?.lights.forEach((light, i) => {
      const lit = options[i].enabled || options[i].current && !this.stranded;
      light.lantern.visible = lit; light.dark.visible = !lit;
    });
  },
  reward({ boss, flawless }) {
    const id = ctx.planetId;
    if (!ctx.started || !flawless || boss !== ctx.boss || this.rewarded.has(id) || this.progression?.defeated.has(id)) return;
    this.rewarded.add(id); grantItem('wayfarerKey', 1); toast('No-hit boss challenge: received a Wayfarer’s Key!');
  },
};
gameEvents.addEventListener('bosschallenge', e => Portals.reward(e.detail));
