/* What villagers know about your adventure: the snapshot their conditional lines test (`when: s => ...` in
   npcDefs.js) and the placeholders any dialogue line may use ({hero} {planet} {level} {coins} {day} {boss}). */
import { CHARACTERS } from '../config/characters.js';
import { COMBAT } from '../config/combat.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { dayClock } from './dayClock.js';

export const StoryMemory = {
  state: {},
  toJSON() { for (const npc of ctx.npcs) this.state[npc.def.local ? `${ctx.planetId}:${npc.name}` : npc.name] = npc.toJSON(); return structuredClone(this.state); },
  load(data) { this.state = structuredClone(data); this.restore(); },
  restore() {
    for (const npc of ctx.npcs) {
      const key = npc.def.local ? `${ctx.planetId}:${npc.name}` : npc.name, data = this.state[key] ?? this.state[npc.name];
      if (data) npc.load(data);
    }
  },
  reset() { this.state = {}; },
};

/** planet (index), planetName, hero (id), heroTitle, level, bosses (defeated this adventure), phase, night, coins, day, boss. */
export function storyState() {
  const P = ctx.player, p = PLANETS[ctx.planet];
  return {
    planet: ctx.planet, planetId: ctx.planetId, planetName: p.name, hero: P.charId, heroTitle: CHARACTERS[P.charId].title, level: P.level,
    bosses: ctx.bossesDefeated, phase: dayClock.phase, night: dayClock.phase === 'night', coins: P.coins ?? 0, day: dayClock.day,
    boss: ({ ...COMBAT.enemies[p.boss.type], ...p.boss }).name.split(',')[0],
  };
}

const VARS = { hero: 'heroTitle', planet: 'planetName', level: 'level', coins: 'coins', day: 'day', boss: 'boss' };
/** Fills {hero} {planet} {level} {coins} {day} {boss}; anything else is left as it is. */
export function fillStory(text, s = storyState()) { return text.replace(/\{(\w+)\}/g, (m, k) => (k in VARS ? String(s[VARS[k]]) : m)); }
