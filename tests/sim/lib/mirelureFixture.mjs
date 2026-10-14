// Actual unreleased Tidewhisper encounter (roster, Old Ironclaw, Mirelure in the lagoon lair) in the borrowed village slot.
// Test-only, never imported by production.
import { installCoastalEnemyFixture } from './coastalEnemyFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import tidewhisper from '../../../src/config/planets/tidewhisper.js';
export function installMirelureFixture(){
  const fixture=installCoastalEnemyFixture();Object.assign(PLANETS[0],{boss:structuredClone(tidewhisper.boss)});return fixture;
}
