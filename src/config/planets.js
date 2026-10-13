/* ---------------------------------------------------------------------
   PLANETS: the campaign, in order. Defeating a planet's boss unlocks the next entry at the village portal
   (runtime: src/gameplay/PlanetProgression.js). The catalog includes unreleased metadata; PLANETS contains only released entries.
     seed     world-generation seed (same seed => same layout)
     palette  ground / grass / water / sky / fog colours
     scale    difficulty multipliers applied to every enemy's base stats from COMBAT.enemies:
              hp (also healing), damage, speed (movement, charges, projectiles), cooldown (<1 = attacks more often), xp
     roster   enemies spawned on arrival, in order. { type, count } spreads them over the wilds,
              { type, groups, size } makes camps, near: 'ponds' gathers them around far ponds
     boss     { type } from COMBAT.enemies (ai 'boss'), plus optional overrides (name, colours, look = model palette + motif);
              summon = what wakes it and arena = its ring (config/bossSummon.js explains both);
              each planet has its own boss type, and with it its own AI (gloomcap -> pyrrhax the dragon -> malgrath);
              trophy = item id (config/items.js) given to the hero when it falls
     forage   items lying around the planet to pick up: { item, count }
     resources what can be gathered there (config/resources.js NODE_KINDS): nodes [[kind, count, near]], near = 'village'
              (a short walk from the square: the first wood, stone and herbs) or none (anywhere in the wilds); rare =
              the rare gem veins, placed around the planet's mini boss (you have to get past it)
     flora    what grows there: trees ({ kind: weight }, src/world/props.js TREE_KINDS), treeCount, giants (share of
              giant trees), flowers (colours), tallGrass (colours), grass / tallCount / meadow (density multipliers)
     weather  { kind: weight } from config/weather.js WEATHER_KINDS: what blows over it
     physics  optional gravity multiplier, seaLevel/seaMaxLevel and waterOffset/waterMaxOffset; rules in world/physics.js
     miniBosses optional big fights out in the wilds: [{ type (COMBAT.enemies, miniBoss), near: 'lake' | 'far', overrides }]
     wildlife its animals: critters [[CRITTER_DEFS key, count, 'ponds' | 'far']], rare (one rare creature), birds,
              flocks, plumage (bird colours), fish (fish colours)
     material the planet's own crafting material ('@material' in chest loot, config/chests.js)
     chests   treasure chests out in the wilds: { kind (CHEST_KINDS in config/chests.js), count }
     terrain  the planet's shape (src/world/terrain.js), each part optional, heights in metres:
              hills    { amp, freq }            rolling fractal hills (freq: bumps around the planet, ~2 = 35 m apart)
              ridges   { amp, freq }            sharp mountain ridges
              plateaus { amp, freq, step, sharp }  flat-topped mesas in steps of `step`; sharp 0..1 = ramps..cliffs
              lakes    n                         extra big, deep lakes you can swim in
     palette.cliff / palette.peak   colour of steep slopes and of the highest ground
   --------------------------------------------------------------------- */

import lanternmoss from './planets/lanternmoss.js';
import emberfall from './planets/emberfall.js';
import frostveil from './planets/frostveil.js';
import tidewhisper from './planets/tidewhisper.js';
import duskhollow from './planets/duskhollow.js';
import lanternMoon from './planets/lanternMoon.js';
import { releasedPlanets, campaignPlanets, validatePlanetCatalog } from './planetRules.js';

export const TRANSITION = {
  outroDelay: 4,          // seconds of victory banner before free exploration resumes
  fadeTime: 0.9,          // fade out, and fade in again on arrival
  healOnArrival: true,    // the hero lands on a new planet with full HP and mana / stamina
  introHintDelay: 6,      // seconds into the first adventure before the "find the boss" hint
};

// Catalog order is campaign order; unfinished metadata never reaches generation or save validation.
export const PLANET_CATALOG = validatePlanetCatalog([lanternmoss, emberfall, frostveil, tidewhisper, duskhollow, lanternMoon]);
export const PLANETS = releasedPlanets(PLANET_CATALOG);
export const CAMPAIGN_PLANETS = campaignPlanets(PLANET_CATALOG);
export const FIRST_ACT_PLANETS = CAMPAIGN_PLANETS.filter(p => p.act === 1);
