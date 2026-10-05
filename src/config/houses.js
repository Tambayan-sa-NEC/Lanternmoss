/* ---------------------------------------------------------------------
   HOUSES: every village house can be entered (runtime: src/gameplay/Houses.js, rooms: src/world/interiors.js).
   Entries are by index in the planet's house list (world.houses, src/world/village.js):
     0 = red mushroom house, 1 = the bakery cottage, 2 = pink mushroom house (these three ring the village square),
     3..5 = houses out on the edge of the village (placed per planet).
   An entry may differ per planet: `planets: { 1: {...} }` overrides fields there.
     name       shown on the door prompt          layout   'mushroom' (round) | 'cottage' (square)
     owner      a villager who lives here (npcDefs.js): asleep in bed at night, away by day (note on the table)
     resident   someone who only lives indoors: { name, title, color, look, portrait, lines: [{ t, e? }] }
     props      furniture, by kind; interactive kinds (INTERACTIONS) get an "E ..." prompt
     note       what the table note says when nobody's home
     gift       the storage chest's one-time contents (per adventure): { coins, items: [[id, n]] }
     lore       bookshelf texts, read in order
   --------------------------------------------------------------------- */

export const HOUSES = {
  0: { name: "Lio's house", owner: 'Lio', layout: 'mushroom',
    props: ['bed', 'rug', 'table', 'instruments', 'chest', 'lamp', 'plant', 'window'],
    note: "Out busking! Back by nightfall. Please don't tune my lute. -- Lio", gift: { coins: 12, items: [['moonberry', 2]] } },
  1: { name: "Pim's Bakery", owner: 'Pim', layout: 'cottage',
    props: ['oven', 'counter', 'bed', 'table', 'rug', 'chest', 'shelf', 'lamp', 'window'],
    note: 'Gone to the square with a tray of buns! Ring the bell. (There is no bell.) -- Pim', gift: { items: [['honeyBun', 2]] } },
  2: { name: "Old Bramble's house", owner: 'Old Bramble', layout: 'mushroom',
    props: ['bed', 'bookshelf', 'telescope', 'rug', 'table', 'chest', 'lamp', 'plant'],
    note: 'Observing the stones. If the kettle whistles, that is the kettle, not a ghost. Probably. -- B.', gift: { coins: 20, items: [['moonHopCharm', 1]] },
    lore: [
      'Lanternmoss was the first world to keep its lanterns lit. The moss remembers the light and hums it back, slightly off-key.',
      'Notes on Gloomcap: "Once a gentle mushroom king. Something in the dark made him furious. Furious things can be calmed."',
      'A star chart with three worlds circled: Lanternmoss, Emberfall, Frostveil. Beside the last one, in shaky ink: "the winged one waits".',
    ] },
  3: { name: "Granny Thimble's house", layout: 'mushroom',
    resident: { name: 'Granny Thimble', title: 'Knitter', color: '#d88fb0', look: 'granny', portrait: 'granny', lines: [
      { t: "Come in, come in, mind the yarn! I'm knitting a scarf for every villager. And one for you, {hero}, if you sit still." },
      { t: 'Have some tea, dearie. It fixes scraped knees, broken hearts and most curses.', e: 'happy' },
      { t: 'When I was young, the lanterns went out for a whole week. We sang until they came back. Never underestimate a song.', e: 'thinking' },
      { t: "Off to fight monsters? Wear a warm scarf. Monsters can't stand a well-dressed hero.", e: 'excited' },
    ] },
    props: ['bed', 'kettle', 'rug', 'table', 'chest', 'plant', 'lamp', 'yarn'],
    gift: { coins: 8, items: [['moonberryTart', 1]] },
    planets: { 1: { name: 'An empty house', resident: null, note: 'Gone to watch the dragon from a safe distance. Help yourself to tea! -- the neighbours' },
               2: { name: 'An empty house', resident: null, note: 'Too cold! Wintering on Lanternmoss. Please water the frost-flowers. -- the neighbours' } } },
  4: { name: "Moth's library", layout: 'cottage',
    resident: { name: 'Moth', title: 'Librarian', color: '#7a8ad0', look: 'librarian', portrait: 'librarian', lines: [
      { t: 'Shh... oh, it is only you. Welcome to the library. Every book here is about a lantern. Some are about two.', e: 'thinking' },
      { t: 'The shelves by the window have the best stories. The dragon chapters are a little singed.' },
      { t: 'Reading tip: monsters that glow before attacking are being polite. Return the courtesy by not being there.', e: 'happy' },
    ] },
    props: ['bookshelf', 'bookshelf', 'table', 'lamp', 'rug', 'chest', 'plant', 'window'],
    gift: { coins: 15 },
    lore: [
      '"A Field Guide to Puffcaps": Chapter 1. Do not hug the puffcap. Chapter 2. See chapter 1.',
      '"Thornmoles and You": the ground trembles before they surface. A small jump is the polite reply.',
      '"Legends of the Three Worlds": the moss king, the red wyrm and the winged lord. Each one sleeps on the far side of its world, under a pillar of light.',
    ],
    planets: { 1: { name: "Cinder's house", resident: null, owner: 'Cinder', props: ['bed', 'anvil', 'fireplace', 'rug', 'chest', 'lamp', 'table'],
                    note: 'At the forge. Do NOT touch the anvil, it is still hot. -- Cinder', gift: { coins: 18, items: [['emberShard', 2]] }, lore: null },
               2: { name: 'An empty house', resident: null, note: 'Moved somewhere warmer. The fireplace still works!', props: ['fireplace', 'bed', 'rug', 'chest', 'table', 'lamp'], lore: null } } },
  5: { name: 'A cosy little house', layout: 'mushroom',
    props: ['bed', 'rug', 'table', 'chest', 'plant', 'lamp', 'fireplace'],
    note: 'Out foraging. There is soup on the fire, help yourself!', gift: { items: [['honeyBun', 1], ['moonberry', 2]] },
    planets: { 2: { name: "Tuva's house", owner: 'Tuva', props: ['bed', 'fireplace', 'rug', 'table', 'chest', 'lamp', 'window'],
                    note: 'At the lookout. The lantern is on the windowsill if you need light. -- Tuva', gift: { coins: 20, items: [['frostPetal', 2]] } } } },
};

/** What each interactive prop does when you press E next to it (Houses.js runs them). */
export const INTERACTIONS = {
  bed: { label: 'Rest in the bed' },           // at night: sleep till morning, full heal; by day: a nap (heals)
  chest: { label: 'Open the storage chest' },  // the house's gift, once per adventure
  bookshelf: { label: 'Read' },                // the house's lore, in order
  kettle: { label: 'Have some tea' },          // heals a little and a Feather-Step
  oven: { label: 'Peek in the oven' },         // a warm bun, once per day
  instruments: { label: 'Play a tune' },       // a melody (and the bard's approval)
  telescope: { label: 'Look through the telescope' },
  fireplace: { label: 'Warm your hands' },     // restores mana / stamina
  anvil: { label: 'Look at the anvil' },
  note: { label: 'Read the note' },
};

export const REST = {
  napHeal: 0.4,            // share of max HP a daytime nap restores
  wakeAt: 0.03,            // sleeping through the night wakes you this far into the next day (fraction)
};
