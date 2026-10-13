// Real unreleased village/quest in a borrowed encounter slot, never a production release shortcut.
import { installCoastalResourceFixture } from './coastalResourceFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import tidewhisper from '../../../src/config/planets/tidewhisper.js';
import { QUESTS } from '../../../src/config/quests.js';
export function installCoastalVillageFixture(){
  const fixture=installCoastalResourceFixture(),origin=QUESTS.darkLighthouse.planet;
  Object.assign(PLANETS[0],{village:structuredClone(tidewhisper.village),npcs:structuredClone(tidewhisper.npcs),houses:structuredClone(tidewhisper.houses),
    outfit:tidewhisper.outfit,outfitColors:[...tidewhisper.outfitColors],boss:{...PLANETS[0].boss,summon:{...tidewhisper.boss.summon}}});
  QUESTS.darkLighthouse.planet=PLANETS[0].id;
  return {restore(){QUESTS.darkLighthouse.planet=origin;fixture.restore();}};
}
