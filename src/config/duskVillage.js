/* ---------------------------------------------------------------------
   DUSKHOLLOW'S VILLAGE (TODO 30d): the lines the four travellers say when they arrive, Wick the lamplighter, and
   what is inside the houses built into the mushroom stalks.
   Shaped exactly like config/coastalVillage.js, and read the same way: `npcs` by the planet entry
   (planets/duskhollow.js), `houses` by index through resolveHouse() in config/houses.js.
   Wick keeps the lamplighter's look and lantern swing already used for Tidewhisper's keeper (npcDefs.js
   LOCAL_LOOKS / LOCAL_ANIMATIONS). His quest, "Light the Old Road", is in config/quests.js, and the three moonwells
   it asks for are Umbra's gate together with level 11.
   `dusk: true` on a house asks world/interiors.js for the inside of a stalk: lit gills overhead instead of a flat
   ceiling, a lantern vine, and the lamplighter's oil jars. It adds no save state of its own.
   --------------------------------------------------------------------- */

export const DUSK_NPCS = {
  arrivals: {
    'Old Bramble': { t: 'An endless dusk, and every lamp out but one. Someone has been neglecting the road.', e: 'thinking' },
    Pim: { t: 'Mushrooms the size of houses and I may not bake a single one of them. The injustice!' },
    Lio: { t: 'Listen: the caps drip in threes. This whole world is keeping time without us.', e: 'excited' },
    Fern: { t: 'The moss lights up where I step! Look, look, I am making a little glowy path~', e: 'excited' },
  },
  locals: [{ name: 'Wick', title: 'Lamplighter', color: '#f0c070', look: 'keeper', portrait: 'keeper', height: 2.15, radius: 0.6,
    headR: 0.36, hat: true, gesture: 'wave', home: 0, sleepsIndoors: true, animation: 'lantern',
    at: { anchor: 'house', house: 0, distance: 2 },
    places: { stalk: { anchor: 'house', house: 0, distance: 2, wander: 1 }, square: { angle: 5.3, distance: 7.5, wander: 1.5 } },
    schedule: { morning: 'square', noon: 'stalk', evening: 'square', night: 'home' },
    lines: [
      { t: 'Welcome to the hollow. Stay in the village light while you find your feet; the caps keep the sky off us here.' },
      { t: 'The Old Road runs out to three moonwells, one under each gap of starlight. They have been dark for years.', e: 'thinking' },
      { t: 'Carry fire from the brazier and light the waylamps as you go. A lit lamp will give you fire again, so the road lights itself once you start.' },
      { t: 'Umbra dives at the brightest light she can find. Remember that when you finally go out to meet her.', e: 'thinking' },
      { t: 'Oil runs out faster than courage does. Glowcaps, firefly jars, a flask of lumen oil: keep one of each.' },
    ] }],
};

export const DUSK_HOUSES = {
  1: null, 3: null, 4: null, 5: null,
  0: { name: "Wick's stalk", owner: 'Wick', layout: 'mushroom', dusk: true,
    props: ['bed', 'rug', 'table', 'chest', 'lamp', 'bookshelf', 'window'],
    note: 'Gone up the road with a can of oil. If the brazier is low, feed it a glowcap. -- Wick',
    gift: { coins: 18, items: [['lumenOil', 1]] },
    lore: ['Lamplighter\'s round, year nine: waylamps 1 to 24, then the three moonwells. Nobody has finished the round since.',
      'Umbra came the night the last moonwell went out. Light and she comes; dark and she stays. Choose which night you want.'] },
  2: { name: 'A traveller\'s stalk', layout: 'mushroom', dusk: true,
    props: ['bed', 'rug', 'table', 'chest', 'plant', 'lamp'],
    note: "I can't see my own beard in this place! Back when it's brighter. Which it never is. -- a traveller",
    gift: { items: [['glowcap', 3], ['fireflyJar', 1]] } },
};
