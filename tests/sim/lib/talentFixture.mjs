/* Test-only talent tree (TODO 28b): the real trees stay empty and unreleased until 28c-28e. This fills the witch's
   slot with a small tree of real ability changes so rules, saves, the page and the wizard reset can be exercised.
   Never imported by the game. */
import { TALENTS } from '../../../src/config/talents.js';

export const FIXTURE_TREE = {
  released: true,
  talents: [
    { id: 'sharpBolt', name: 'Sharp Bolt', text: 'Arcane Bolt deals 15% more damage per rank.', row: 1, max: 2, cost: 1, needs: [],
      mods: [{ ability: 'bolt', key: 'damage', mul: 0.15 }] },
    { id: 'quickNova', name: 'Quick Frost', text: 'Frost Nova is ready a second sooner.', row: 1, max: 1, cost: 1, needs: [],
      mods: [{ ability: 'nova', key: 'cooldown', add: -1 }] },
    { id: 'cheapBolt', name: 'Light Touch', text: 'Arcane Bolt costs 1 less mana per rank.', row: 2, max: 3, cost: 1, needs: ['sharpBolt'],
      mods: [{ ability: 'bolt', key: 'cost', add: -1 }] },
    { id: 'wideFire', name: 'Wildfire', text: 'Fireball bursts 25% wider.', row: 2, max: 1, cost: 2, needs: ['sharpBolt'],
      mods: [{ ability: 'fireball', key: 'blastRadius', mul: 0.25 }] },
  ],
};

/** Puts the fixture tree in `hero`'s slot; restore() puts the real one back. */
export function installTalentFixture(hero = 'witch') {
  const original = TALENTS.trees[hero]; TALENTS.trees[hero] = structuredClone(FIXTURE_TREE);
  return { restore() { TALENTS.trees[hero] = original; } };
}
