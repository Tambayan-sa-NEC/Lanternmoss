/* Adventure-owned discoveries and favourites. Essential recipes have no discovery gate. */
import { RECIPES } from '../config/crafting.js';
import { ctx } from '../core/context.js';
import { emit } from '../core/events.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { Journal } from './Journal.js';
import { toast } from '../ui/toast.js';

export const RecipeBook = {
  learned: new Set(), favourites: new Set(),
  toJSON() { return { learned: [...this.learned], favourites: [...this.favourites] }; },
  load(data) { this.learned = new Set(data.learned); this.favourites = new Set(data.favourites); },
  reset() { this.learned.clear(); this.favourites.clear(); },
  knows(id) { const r = RECIPES.find(r => r.id === id); return !!r && (!r.discovery || this.learned.has(id)); },
  favourite(id) {
    if (!this.knows(id)) return false;
    if (this.favourites.has(id)) this.favourites.delete(id); else this.favourites.add(id);
    return true;
  },
  discover(recipe) {
    if (!ctx.started || ctx.player.dead || !recipe?.discovery || this.knows(recipe.id)) return null;
    this.learned.add(recipe.id);
    const name = itemRegistry.get(recipe.result).name;
    toast(`Learned recipe: ${name}`); emit('recipelearned', { id: recipe.id }); return name;
  },
  readBook(planetId) {
    return this.discover(RECIPES.find(r => r.discovery?.kind === 'book' && r.discovery.planet === planetId && !this.knows(r.id)));
  },
  readBestiary(type) {
    if (!Journal.data.defeated[type]) return null;
    return this.discover(RECIPES.find(r => r.discovery?.kind === 'bestiary' && r.discovery.enemy === type && !this.knows(r.id)));
  },
  readScroll(itemId) {
    return this.discover(RECIPES.find(r => r.discovery?.kind === 'scroll' && `${r.id}Scroll` === itemId));
  },
  /** Guarantee the next unread scroll, skipping copies already held or lying on this planet. No loot RNG draw. */
  scrollFor(planetId) {
    const r = RECIPES.find(r => r.discovery?.kind === 'scroll' && r.discovery.planet === planetId && !this.knows(r.id)
      && !ctx.player.inventory.count(`${r.id}Scroll`) && !ctx.worldItems.some(w => w.itemId === `${r.id}Scroll`));
    return r ? `${r.id}Scroll` : null;
  },
};
