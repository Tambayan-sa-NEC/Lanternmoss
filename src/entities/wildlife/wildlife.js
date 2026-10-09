/* Populates the planet with its animals (PLANETS[i].wildlife): the village pets, the planet's wild animals (frogs by
   the ponds), one rare creature, ground birds and flocks in the sky, pond and lake fish; and runs the pond fish
   schedule. Rare creatures are befriended with E (rareTarget, an interaction like petting your pet) for a gift: their
   charm the first time in an adventure, a rare loot roll after that. */
import { CRITTER_DEFS, RARE_CRITTERS } from '../../config/critters.js';
import { COMBAT } from '../../config/combat.js';
import { ctx } from '../../core/context.js';
import { emit } from '../../core/events.js';
import { emote } from '../../fx/emotes.js';
import { rollLoot } from '../../gameplay/loot.js';
import { grantItem } from '../../gameplay/pickups.js';
import { gainCoins } from '../../gameplay/wallet.js';
import { itemRegistry } from '../../items/ItemRegistry.js';
import { audio } from '../../systems/AudioSystem.js';
import { showBanner } from '../../ui/banner.js';
import { toast } from '../../ui/toast.js';
import { mpick, mr, rng } from '../../utils/random.js';
import { arcDist } from '../../utils/sphere.js';
import { spawnSpot } from '../../world/placement.js';
import { ponds } from '../../world/terrain.js';
import { Bird, Flock } from './Bird.js';
import { Critter } from './Critter.js';
import { Fish } from './Fish.js';

/** A spot out in the wilds, at least `min` metres from the village. */
function wildSpot(village, min = COMBAT.player.safeRadius + 6) {
  for (let i = 0; i < 30; i++) { const d = spawnSpot(null); if (arcDist(d, village) > min) return d; }
  return spawnSpot(null);
}

export function spawnWildlife(world, planet = {}) {
  const { spawnDir, stoneCenter, houseA, cottage } = world, w = planet.wildlife ?? {};
  ctx.critters.push(                                                  // the village's own pets come along to every planet
    new Critter('catOrange', spawnSpot(houseA.door, 1, 4)), new Critter('catGrey', spawnSpot(cottage.door, 2, 5)),
    new Critter('catBlack', spawnSpot(null)), new Critter('dogShiba', spawnSpot(spawnDir, 4, 7)),
    new Critter('dogGold', spawnSpot(null)), new Critter('fox', spawnSpot(stoneCenter, 8, 14)), new Critter('fox', spawnSpot(null)),
  );
  for (const [key, count, where] of w.critters ?? []) for (let i = 0; i < count; i++) {
    if (where === 'ponds') { const p = ponds[i % Math.max(1, ponds.length)]; if (p) ctx.critters.push(new Critter(key, spawnSpot(p.dir, p.r + 0.6, p.r + 2.6, 0.4))); }
    else ctx.critters.push(new Critter(key, wildSpot(spawnDir, where === 'far' ? 40 : undefined)));
  }
  if (w.rare) ctx.critters.push(new Critter(w.rare, wildSpot(spawnDir, 45)));
  const plumage = w.plumage ?? null;
  for (let i = 0; i < 4; i++) ctx.birds.push(new Bird(spawnSpot(spawnDir, 5, 16, 0.5), plumage));
  for (let i = 0; i < (w.birds ?? 5); i++) ctx.birds.push(new Bird(spawnSpot(null, 0, 0, 0.5), plumage));
  for (let i = 0; i < (w.flocks ?? 0); i++) ctx.birds.push(new Flock(wildSpot(spawnDir, 10), plumage));
  for (const p of ponds) {
    for (let i = 0; i < 3 + Math.floor(p.r / 2); i++) p.fish.push(new Fish(p, w.fish));
    if (p.r >= 8) p.fish.push(new Fish(p, [{ body: 0xffd36b, spot: 0xffffff, fin: 0xfff0a0 }], 1.9));   // a big golden koi in each lake
  }
}

/** Removes every critter, bird and fish (the planet is being replaced). */
export function despawnWildlife() {
  for (const c of ctx.critters) c.dispose(); ctx.critters.length = 0;
  for (const b of ctx.birds) b.dispose(); ctx.birds.length = 0;
  for (const p of ponds) { for (const f of p.fish) f.dispose(); p.fish.length = 0; }
}

/** Fish leap more often while the hero stands by their pond. */
export function updatePonds(dt) {
  for (const p of ponds) {
    p.jumpCool -= dt;
    const near = arcDist(ctx.player.up, p.dir) < p.r + 3;
    if (p.jumpCool < 0 && p.fish.length) { mpick(p.fish).leap(); p.jumpCool = near ? mr(2.5, 4) : mr(8, 15); }
    for (const f of p.fish) f.update(dt);
  }
}

// ---------------------------------------------------------------- rare creatures
const gifted = new Set();                                              // charms already given this adventure
export const RareGifts = {
  toJSON() { return [...gifted]; },
  load(data) { gifted.clear(); for (const id of data) gifted.add(id); },
};
/** A new adventure: every rare creature has its charm to give again. */
export function resetRareGifts() { gifted.clear(); }

/** The "E Befriend ..." prompt: a rare creature sitting still for you, close enough. */
export function rareTarget() {
  const P = ctx.player; let best = null;
  for (const c of ctx.critters) {
    if (!c.rare || c.away > 0 || c.state === 'flee') continue;
    const d = arcDist(P.up, c.up); if (d > RARE_CRITTERS.reach || (best && d >= best.dist)) continue;
    best = { dist: d, label: `Befriend the ${c.rare.name}`, at: c.pos.clone().addScaledVector(c.up, c.height + 0.8), run: () => befriend(c) };
  }
  return best;
}

export function befriend(c) {
  const R = RARE_CRITTERS, gift = c.rare.gift;
  emote(c, 'heart'); audio.sparkle(); audio.melody();
  if (!gifted.has(gift)) {
    gifted.add(gift); grantItem(gift, 1, { rarity: R.giftRarity });
    showBanner(`${c.rare.name} befriended!`, `It leaves you a gift: ${itemRegistry.get(gift).name}.`);
  } else {
    const { coins, items } = rollLoot(R.laterLoot, ctx.planet, rng, ctx.player.charId);
    if (coins) gainCoins(coins); for (const it of items) grantItem(it.item, it.qty, it.props);
    toast(`The ${c.rare.name} nuzzles you and leaves a little something behind.`);
  }
  emit('rarefriend', { kind: c.defKey });
  c.goAway();
}

export const RARE_KINDS = Object.keys(CRITTER_DEFS).filter(k => CRITTER_DEFS[k].rare);
