// Where every screenshot lives: docs/screenshots/<folder>/<name>.jpg, grouped by subject. The README tour
// (screenshots.mjs) and the feature smokes save through shotPath(), so a new shot needs a line here first.
//   characters  the heroes themselves          pets      pets and the pet menus
//   critters    ambient and rare wildlife      mobs      ordinary monsters and mini bosses
//   bosses      planet bosses, lairs, arenas   npcs      villagers and talking to them
//   village     the village, its houses, farm and crafting corner
//   building    the player's home and building     world     landscapes, weather, tides, flora
//   activities  things the hero does (fish, gather, open chests, photos)
//   huds        menus, windows, overlays and the title screens
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SHOT_FOLDERS = {
  characters: ['select', 'swim'],
  pets: ['pets', 'pet-field', 'select-pet', 'dragontoad', 'otter', 'pet-care', 'pet-outfits', 'pet-bed'],
  critters: ['meadow', 'rare', 'tidewhisper-pearl-turtle', 'duskhollow-wildlife'],
  mobs: ['combat', 'basilisk', 'hydra', 'tidewhisper-enemies', 'mob-brawl', 'duskhollow-shadeling', 'duskhollow-mosslurk', 'duskhollow-gloomweaver', 'duskhollow-beetles', 'duskhollow-snuffer'],
  bosses: ['boss-demon', 'boss-dragon', 'lair', 'summon', 'arena', 'balance-flight', 'tidewhisper-ironclaw',
    'tidewhisper-mirelure-beached', 'tidewhisper-mirelure-lures', 'tidewhisper-mirelure-decoys',
    'duskhollow-grandweaver', 'duskhollow-umbra', 'duskhollow-umbra-crash'],
  npcs: ['dialogue', 'duskhollow-wick'],
  village: ['village', 'night', 'house', 'farm', 'stations', 'bounty-board', 'tidewhisper-village'],
  building: ['home-claim', 'home-furnishings', 'home-interior', 'building-preview', 'building-storage',
    'structures-exterior', 'structures-interior'],
  world: ['mesas', 'storm', 'blizzard', 'tidewhisper-high', 'tidewhisper-low', 'tidewhisper-flora', 'lighting-harness',
    'tidewhisper-campaign-720', 'tidewhisper-campaign-1080', 'cave', 'cave-combat', 'cave-rewards', 'cave-guardian',
    'duskhollow', 'duskhollow-canopy', 'duskhollow-old-road'],
  activities: ['fishing', 'gathering', 'chest', 'photo-mode', 'photo-storybook', 'duskhollow-lumen'],
  huds: ['title', 'continue', 'save-menu', 'controls', 'keys', 'help', 'tutorial', 'fainted', 'bag', 'journal', 'bestiary',
    'achievement', 'crafting', 'enchanting', 'bounty-window', 'portal-destinations', 'portal-one-way', 'rematch-gate', 'tidewhisper-portal', 'balance-shop',
    'performance', 'performance-settings', 'gear-sets', 'talents', 'witch-talents-1080', 'warrior-talents', 'warrior-talents-1080', 'ranger-talents', 'ranger-talents-1080'],
};

const FOLDER_OF = new Map(Object.entries(SHOT_FOLDERS).flatMap(([folder, names]) => names.map(n => [n, folder])));
const ROOT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));

/** Repo-relative path of a shot, as README and docs link it: docs/screenshots/<folder>/<name>.jpg */
export function shotLink(name) {
  const folder = FOLDER_OF.get(name);
  if (!folder) throw new Error(`screenshot "${name}" has no folder: add it to SHOT_FOLDERS in scripts/shots.mjs`);
  return `docs/screenshots/${folder}/${name}.jpg`;
}
/** Absolute path to save a shot to (its folder is created if needed). */
export function shotPath(name) {
  const path = ROOT + shotLink(name).slice('docs/screenshots/'.length);
  mkdirSync(dirname(path), { recursive: true }); return path;
}
