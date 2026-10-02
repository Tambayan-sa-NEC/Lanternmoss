/* Populates the planet with critters, birds and fish, and runs the pond fish schedule. */
import { ctx } from '../../core/context.js';
import { mpick, mr } from '../../utils/random.js';
import { arcDist } from '../../utils/sphere.js';
import { spawnSpot } from '../../world/placement.js';
import { ponds } from '../../world/terrain.js';
import { Bird } from './Bird.js';
import { Critter } from './Critter.js';
import { Fish } from './Fish.js';

export function spawnWildlife(world) {
  const { spawnDir, stoneCenter, houseA, cottage } = world;
  ctx.critters.push(
    new Critter('catOrange', spawnSpot(houseA.door, 1, 4)), new Critter('catGrey', spawnSpot(cottage.door, 2, 5)),
    new Critter('catBlack', spawnSpot(null)), new Critter('dogShiba', spawnSpot(spawnDir, 4, 7)),
    new Critter('dogGold', spawnSpot(null)), new Critter('fox', spawnSpot(stoneCenter, 8, 14)), new Critter('fox', spawnSpot(null)),
  );
  for (let i = 0; i < 4; i++) ctx.birds.push(new Bird(spawnSpot(spawnDir, 5, 16, 0.5)));
  for (let i = 0; i < 5; i++) ctx.birds.push(new Bird(spawnSpot(null, 0, 0, 0.5)));
  for (const p of ponds) for (let i = 0; i < 3 + Math.floor(p.r / 2); i++) p.fish.push(new Fish(p));
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
