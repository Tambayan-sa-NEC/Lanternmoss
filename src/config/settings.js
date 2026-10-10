/* ---------------------------------------------------------------------
   PLAYER SETTINGS: everything the Settings screen (pause menu) can change. This one table drives the screen itself,
   the defaults, and validation of saved values (src/core/settings.js). Add a setting = add a row here, then read
   `settings.<key>` where it matters (or react in Game.applySettings).
     type 'range'   min, max, step, unit (shown after the value; '%' values are stored as percent numbers)
     type 'toggle'  true / false
     type 'choice'  options: [[value, label], ...]
   --------------------------------------------------------------------- */

export const SETTINGS_STORAGE_KEY = 'lanternmoss.settings';

export const SETTINGS_SCHEMA = [
  { group: 'Audio', items: [
    { key: 'masterVolume', label: 'Master volume', type: 'range', min: 0, max: 100, step: 5, unit: '%', default: 100 },
    { key: 'musicVolume', label: 'Music & ambience', type: 'range', min: 0, max: 100, step: 5, unit: '%', default: 100 },
    { key: 'sfxVolume', label: 'Sound effects', type: 'range', min: 0, max: 100, step: 5, unit: '%', default: 100 },
  ] },
  { group: 'Camera', items: [
    { key: 'mouseSensitivity', label: 'Mouse sensitivity', type: 'range', min: 25, max: 250, step: 5, unit: '%', default: 100 },
    { key: 'invertY', label: 'Invert vertical drag', type: 'toggle', default: false },
    { key: 'cameraDistance', label: 'Default zoom', type: 'range', min: 4, max: 15, step: 0.5, unit: 'm', default: 8.5 },
  ] },
  { group: 'Graphics', items: [
    { key: 'quality', label: 'Quality', type: 'choice', default: 'high',
      options: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] },
    ...[['sceneryDensity', 'Scenery decoration'], ['grassDensity', 'Grass & wildflowers'],
      ['resourceDensity', 'Distant resource detail'], ['particleDensity', 'Sparkles & fireflies'],
      ['weatherDensity', 'Weather particles']].map(([key, label]) =>
      ({ key, label, type: 'range', min: 0, max: 100, step: 5, unit: '%', default: 100 })),
    { key: 'perfOverlay', label: 'Performance overlay', type: 'toggle', default: false },
    { key: 'bloom', label: 'Glow (bloom)', type: 'toggle', default: true },
    { key: 'outlineWidth', label: 'Outline width', type: 'range', min: 0, max: 5, step: 0.2, unit: 'px', default: 3.2 },
  ] },
  { group: 'Gameplay', items: [
    { key: 'screenShake', label: 'Screen shake', type: 'range', min: 0, max: 150, step: 10, unit: '%', default: 100 },
    { key: 'damageNumbers', label: 'Damage numbers', type: 'toggle', default: true },
    { key: 'hitStop', label: 'Impact slow-motion', type: 'toggle', default: true },
  ] },
  { group: 'Interface', items: [
    { key: 'uiScale', label: 'HUD size', type: 'range', min: 60, max: 160, step: 5, unit: '%', default: 100 },
    { key: 'compass', label: 'Compass & target arrows', type: 'toggle', default: true },
    { key: 'pauseOnBlur', label: 'Pause when the window loses focus', type: 'toggle', default: true },
  ] },
];

/** Graphics quality -> render pixel ratio (capped by the screen's own ratio; see config/render.js maxPixelRatio). */
export const QUALITY_PIXEL_RATIO = { low: 0.7, medium: 1, high: 1.5 };

/** Sliders multiply these presets. Logical world placement and resource availability never change. */
export const QUALITY_DENSITY = {
  low: { scenery: 0.35, grass: 0.3, resource: 0.3, particle: 0.35, weather: 0.35 },
  medium: { scenery: 0.65, grass: 0.65, resource: 0.65, particle: 0.65, weather: 0.65 },
  high: { scenery: 1, grass: 1, resource: 1, particle: 1, weather: 1 },
};
export function densityFor(feature, settings) {
  const preset = QUALITY_DENSITY[settings.quality] ?? QUALITY_DENSITY.high;
  const value = settings[`${feature}Density`];
  return preset[feature] * (Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 1);
}
