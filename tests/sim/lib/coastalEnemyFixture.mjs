// Actual unreleased Tidewhisper roster and mini boss (Old Ironclaw) in the borrowed village slot; test-only, never imported by production.
import { installCoastalVillageFixture } from './coastalVillageFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import tidewhisper from '../../../src/config/planets/tidewhisper.js';
export function installCoastalEnemyFixture(){
  const fixture=installCoastalVillageFixture();Object.assign(PLANETS[0],{roster:structuredClone(tidewhisper.roster),miniBosses:structuredClone(tidewhisper.miniBosses)});return fixture;
}
