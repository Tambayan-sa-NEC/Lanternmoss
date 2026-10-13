// Test-only borrowed encounter/resource data; flora and wildlife use the actual unreleased Tidewhisper config.
import { installTideFixture } from './tideFixture.mjs';
import { PLANETS } from '../../../src/config/planets.js';
import tidewhisper from '../../../src/config/planets/tidewhisper.js';
export function installCoastalFixture(){
  const fixture=installTideFixture();Object.assign(PLANETS[0],{flora:structuredClone(tidewhisper.flora),wildlife:structuredClone(tidewhisper.wildlife)});return fixture;
}
