// Gate checks the actual runtime exports. Performance evidence is recorded by each new world's release stage.
import { readFileSync, existsSync } from 'node:fs';
import { COMBAT } from '../../../src/config/combat.js';
import { LEVELING } from '../../../src/config/leveling.js';
import { PLANET_RADIUS } from '../../../src/config/game.js';
import { HOUSES } from '../../../src/config/houses.js';
import { PLANET_CATALOG } from '../../../src/config/planets.js';
import { TREE_KINDS } from '../../../src/config/flora.js';
import { TREE_BUILDERS } from '../../../src/world/props.js';
import { BEHAVIORS } from '../../../src/entities/enemies/behaviors/index.js';
import { ENEMY_BUILDERS } from '../../../src/models/monsters.js';
import { LOCAL_LOOKS } from '../../../src/entities/npc/npcDefs.js';
import { CRITTER_DEFS } from '../../../src/config/critters.js';
import { WEATHER_KINDS } from '../../../src/config/weather.js';
import { NODE_KINDS } from '../../../src/config/resources.js';
import { ITEM_DEFINITIONS } from '../../../src/config/items.js';
import { CHEST_KINDS } from '../../../src/config/chests.js';
import { QUESTS } from '../../../src/config/quests.js';
import { BESTIARY_ENTRIES } from '../../../src/config/bestiary.js';
import { MUSIC_THEMES } from '../../../src/config/music.js';
import { TRAVELER_NAMES } from '../../../src/config/npcs.js';
import { PERFORMANCE_BUDGET } from '../../../src/config/render.js';
import { mechanicDefinition } from '../../../src/world/mechanics/index.js';
export function contentRegistry() {
  const releases = {};
  for (const p of PLANET_CATALOG.filter(p => p.released && p.act > 1)) {
    const path = new URL(`../../../docs/releases/${p.id}.json`, import.meta.url);
    if (existsSync(path)) releases[p.id] = JSON.parse(readFileSync(path, 'utf8'));
  }
  return { maxLevel: LEVELING.maxLevel, radius: PLANET_RADIUS, houses: HOUSES, enemies: COMBAT.enemies, models: ENEMY_BUILDERS, behaviors: BEHAVIORS,
    trees: TREE_KINDS, treeModels: TREE_BUILDERS, critters: CRITTER_DEFS, weather: WEATHER_KINDS, nodes: NODE_KINDS,
    items: new Set(ITEM_DEFINITIONS.map(d => d.id)), quests: QUESTS, locals: LOCAL_LOOKS, music: MUSIC_THEMES,
    bestiary: BESTIARY_ENTRIES, travelers: TRAVELER_NAMES, chests: CHEST_KINDS, mechanicKnown: id => !!mechanicDefinition(id),
    ceilings: PERFORMANCE_BUDGET.ceilings, targetFrameMs: PERFORMANCE_BUDGET.targetFrameMs, releases };
}
