// Unreleased actual economy/weather/music in a borrowed original encounter slot, never imported by production.
import { installCoastalFixture } from './coastalFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import tidewhisper from '../../../src/config/planets/tidewhisper.js';
export function installCoastalResourceFixture(){
  const fixture=installCoastalFixture();
  Object.assign(PLANETS[0],{resources:structuredClone(tidewhisper.resources),weather:structuredClone(tidewhisper.weather),music:tidewhisper.music});
  return fixture;
}
