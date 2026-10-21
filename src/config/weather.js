/* ---------------------------------------------------------------------
   WEATHER: what can blow over a planet (runtime: src/world/weather.js). Each planet draws from its own mix
   (PLANETS[i].weather = { kind: weight }); a spell of weather lasts WEATHER.duration seconds, and the next blends in
   over WEATHER.blend seconds. Weather is for the mood (it changes no rules).
     wind      how hard the grass and wildflowers lean (0..2)
     fog       the fog distance as a share of RENDER.fog (smaller = thicker)
     light     the sun and sky light as a share of normal
     overcast  how far the sky and fog turn toward `tint` (0..1)
     rain / snow / embers / petals / spores   how much of each falls or drifts (0..2)
     deepDark  0..1: how much a world's own mechanic should thicken its darkness (Duskhollow reads it in
               src/world/mechanics/lantern.js; the weather itself changes no rules)
     lightning a flash and a roll of thunder now and then
     sound     { rain, wind } levels of the ambient loops
   --------------------------------------------------------------------- */

export const WEATHER_KINDS = {
  seaMist: { label:'Sea Mist',icon:'\u224b',wind:.2,fog:.36,light:.92,overcast:.35,tint:0xd8f0e9 },
  squall: { label:'Squall',icon:'\u2602',wind:1.8,fog:.55,light:.65,overcast:.65,tint:0x85a8b9,rain:1.6,whitecaps:1,sound:{rain:1,wind:1} },
  sporeDrift: { label: 'Spore Drift', icon: '✵', wind: 0.5, fog: 0.72, light: 0.95, overcast: 0.3, tint: 0xbfd8b0, spores: 1.4, sound: { wind: 0.3 } },
  deepDark: { label: 'Deep Dark', icon: '☾', wind: 0.2, fog: 0.42, light: 0.72, overcast: 0.6, tint: 0x2a2448, deepDark: 1 },
  clear:    { label: 'Clear', icon: '☀', wind: 0.35, fog: 1, light: 1, overcast: 0 },
  breezy:   { label: 'Breezy', icon: '༄', wind: 1.2, fog: 1, light: 1, overcast: 0, petals: 1, sound: { wind: 0.5 } },
  rain:     { label: 'Rain', icon: '☂', wind: 0.6, fog: 0.62, light: 0.72, overcast: 0.55, tint: 0x9aa4bc, rain: 1, sound: { rain: 0.8 } },
  storm:    { label: 'Storm', icon: '⛈', wind: 1.5, fog: 0.48, light: 0.5, overcast: 0.8, tint: 0x6e7490, rain: 1.8, lightning: true, sound: { rain: 1.2, wind: 0.8 } },
  fog:      { label: 'Fog', icon: '≋', wind: 0.15, fog: 0.3, light: 0.85, overcast: 0.6, tint: 0xdcdde6 },
  snow:     { label: 'Snow', icon: '❄', wind: 0.4, fog: 0.62, light: 0.9, overcast: 0.45, tint: 0xe2e8f2, snow: 1 },
  blizzard: { label: 'Blizzard', icon: '❄', wind: 1.7, fog: 0.36, light: 0.72, overcast: 0.75, tint: 0xd6dde8, snow: 2.2, sound: { wind: 1.2 } },
  embers:   { label: 'Ashfall', icon: '✦', wind: 0.55, fog: 0.7, light: 0.85, overcast: 0.4, tint: 0xd8906a, embers: 2, sound: { wind: 0.3 } },
};

export const WEATHER = {
  duration: [70, 150],     // seconds a spell of weather lasts
  blend: 8,                // seconds the next one takes to blend in
  arrival: 45,             // seconds of clear skies after arriving on a planet
  volume: { half: 24, height: 20 },   // the box of rain / snow around the hero (metres)
  counts: { rain: 2200, snow: 1600, embers: 1100, petals: 320, spores: 520 },
};
