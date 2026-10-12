import { HOME, FURNISHINGS } from '../config/home.js';
import { ctx } from '../core/context.js';
import { audio } from '../systems/AudioSystem.js';
import { buildHomeCottage } from '../world/homeCottage.js';
import { ACTION_HANDLERS } from './itemUse.js';
import { cleanHomeState, furnitureOverlapsHero } from './homeRules.js';

export const Home = {
  state: { claimed: false, furniture: [] }, cottage: null, world: null, callbacks: {},
  toJSON() { return structuredClone(this.state); },
  load(data) { this.state = cleanHomeState(data); this.callbacks.refresh?.(); },
  setup(world, avoid) {
    this.clear(); this.world = world; this.state = cleanHomeState(null);
    this.cottage = buildHomeCottage(world, avoid); world.houses[HOME.houseIndex] = this.cottage;
  },
  clear() {
    if (this.world?.houses[HOME.houseIndex] === this.cottage) this.world.houses.splice(HOME.houseIndex, 1);
    this.cottage?.dispose(); this.cottage = null;
  },
  reset() { this.state = cleanHomeState(null); },
  get inside() { return this.callbacks.inside?.(); },
  canModify() { return ctx.started && !ctx.player.dead && !ctx.transitioning && !ctx.cutscene && this.inside?.index === HOME.houseIndex; },
  save() { this.callbacks.save?.(); },
  changed() { this.callbacks.refresh?.(); this.save(); audio.plip(); },
  claim() {
    if (!this.canModify()) return { ok: false, message: 'Enter the empty cottage to claim it.' };
    if (this.state.claimed) return { ok: false, message: 'This cottage is already yours.' };
    this.state.claimed = true; this.changed(); return { ok: true, message: 'This cottage is now your home! Craft a bed and furniture to make it cosy.' };
  },
  placeProblem(id) {
    if (!Object.hasOwn(FURNISHINGS, id)) return 'That is not cottage furniture.';
    if (!this.canModify() || !this.state.claimed) return 'Claim a cottage and stand inside it to place furniture.';
    if (this.state.furniture.includes(id)) return 'That spot is already furnished.';
    if (!ctx.player.inventory.count(id)) return 'Craft this furniture first, then bring it to your cottage.';
    if (furnitureOverlapsHero(id, this.inside.x, this.inside.z)) return 'Step away from that furniture spot before placing it.';
    return null;
  },
  place(id) {
    const problem = this.placeProblem(id); if (problem) return { ok: false, message: problem };
    if (!ctx.player.inventory.remove(id, 1)) return { ok: false, message: 'That furniture is no longer in your bag.' };
    this.state.furniture.push(id); this.changed(); return { ok: true, message: `Placed ${FURNISHINGS[id].name}.` };
  },
  remove(id) {
    if (!this.canModify() || !this.state.claimed || !this.state.furniture.includes(id)) return { ok: false, message: 'There is no furniture to take from this cottage.' };
    if (ctx.player.inventory.spaceFor(id) < 1) return { ok: false, message: 'Make room in the bag before taking this furniture.' };
    ctx.player.inventory.add(id, 1); this.state.furniture = this.state.furniture.filter(item => item !== id);
    this.changed(); return { ok: true, message: `${FURNISHINGS[id].name} returned to your bag.` };
  },
};
ACTION_HANDLERS.furnish = (inventory, slot) => Home.place(inventory.getSlot(slot)?.itemId);
