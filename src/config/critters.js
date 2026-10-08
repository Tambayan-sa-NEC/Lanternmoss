/* Ambient animal looks (fed to buildQuad, or buildToad with build: 'toad', in src/models/creatures.js) and how each
   kind behaves (src/entities/wildlife/Critter.js):
     kind    cat / dog (village pets), fox, wolf, bunny (hops, flees), deer (shy: bolts from far off), frog (hops by its
             pond, ribbits), lizard (scurries in bursts), toad (the dragontoad pet)
     speed   wandering speed; hop = jump speed while moving (hoppers); radius = body size for collisions
     rare    a rare creature: { name, gift (item id, first time per adventure), color (its sparkle) }. It bolts if you
             run at it; walk up slowly and press E to befriend it (src/entities/wildlife/wildlife.js).
   Which animals live where: PLANETS[i].wildlife (config/planets.js). */

export const CRITTER_DEFS = {
  catOrange: { kind: 'cat', fur: 0xffa65c, belly: 0xfff0dc, ear: 'point', tail: 'cat', tailCol: 0xff9444, len: 0.95, leg: 0.2, snout: 0.8 },
  catGrey: { kind: 'cat', fur: 0xa6abc8, belly: 0xffffff, ear: 'point', tail: 'cat', len: 0.95, leg: 0.2, snout: 0.8 },
  catBlack: { kind: 'cat', fur: 0x3e3656, belly: 0x5a5078, ear: 'point', tail: 'cat', len: 0.95, leg: 0.2, snout: 0.8, eye: 0xffe066, eyeGlow: true },
  dogShiba: { kind: 'dog', fur: 0xf0a860, belly: 0xfff4e6, ear: 'point', tail: 'curl', len: 1.05, leg: 0.26, snout: 1.25, w: 1.1 },
  dogGold: { kind: 'dog', fur: 0xe8c07a, belly: 0xfff4e6, ear: 'flop', earCol: 0xc99a58, tail: 'curl', len: 1.1, leg: 0.27, snout: 1.3, w: 1.15 },
  wolf: { kind: 'wolf', fur: 0x8f97ad, belly: 0xeef0f6, ear: 'big', earCol: 0x7d859a, tail: 'fox', tip: 0xbfe6ff, len: 1.25, leg: 0.3, snout: 1.45, w: 1.15, paw: 0x5a6070, eye: 0x7fd6ff, eyeGlow: true },
  fox: { kind: 'fox', fur: 0xff8c4a, belly: 0xfff4ea, ear: 'big', earCol: 0xff8c4a, tail: 'fox', tip: 0xc7a8ff, len: 1.05, leg: 0.24, snout: 1.35, paw: 0x5a3a4a },
  // ---- wild animals (TODO 15)
  bunny: { kind: 'bunny', fur: 0xb08a6a, belly: 0xfff4ea, ear: 'long', tail: 'puff', len: 0.75, leg: 0.12, snout: 0.7, w: 0.9, speed: 1.6, hop: 3.4 },
  sandHare: { kind: 'bunny', fur: 0xd8a868, belly: 0xfff0d8, ear: 'long', earCol: 0xc89858, tail: 'puff', len: 0.8, leg: 0.14, snout: 0.75, w: 0.9, speed: 1.8, hop: 3.6 },
  snowHare: { kind: 'bunny', fur: 0xf4f6ff, belly: 0xffffff, ear: 'long', earCol: 0xe8eaf6, tail: 'puff', len: 0.8, leg: 0.14, snout: 0.75, w: 0.9, speed: 1.8, hop: 3.6 },
  deer: { kind: 'deer', fur: 0xb07a50, belly: 0xf6e6d0, ear: 'big', tail: 'puff', len: 1.4, leg: 0.55, snout: 1.4, w: 1.0, antlers: 1, speed: 1.1, radius: 0.45 },
  reindeer: { kind: 'deer', fur: 0x9a8a80, belly: 0xf4f0ec, ear: 'big', tail: 'puff', len: 1.45, leg: 0.55, snout: 1.4, w: 1.1, antlers: 1.35, speed: 1.0, radius: 0.48 },
  frog: { kind: 'frog', fur: 0x6fc46a, belly: 0xe8f6c0, ear: 'none', tail: 'none', frogEyes: true, len: 0.75, leg: 0.08, snout: 0.6, w: 1.45, speed: 0.9, hop: 3.0, radius: 0.22 },
  lizard: { kind: 'lizard', fur: 0xe0703a, belly: 0xffd08a, ear: 'none', tail: 'cat', tailCol: 0xc85a2a, len: 1.3, leg: 0.08, snout: 1.6, w: 0.8, spines: 0xffb03d, speed: 2.4, radius: 0.24 },
  // ---- rare creatures: one wanders each planet
  goldBunny: { kind: 'bunny', fur: 0xffd36b, belly: 0xfff6d0, ear: 'long', earCol: 0xffc040, tail: 'puff', tailCol: 0xffffff, len: 0.8, leg: 0.13, snout: 0.7, w: 0.9,
    speed: 1.8, hop: 3.8, eye: 0x3a2a6a, rare: { name: 'Golden Moonbunny', gift: 'goldenClover', color: 0xffe08a } },
  emberSalamander: { kind: 'lizard', fur: 0xff5a3a, belly: 0xffe08a, ear: 'none', tail: 'cat', tailCol: 0xffb03d, len: 1.4, leg: 0.1, snout: 1.5, w: 0.85, spines: 0xffe08a,
    eye: 0xffe066, eyeGlow: true, speed: 2.4, radius: 0.26, rare: { name: 'Ember Salamander', gift: 'emberScale', color: 0xffb03d } },
  auroraHare: { kind: 'bunny', fur: 0xeaf6ff, belly: 0xffffff, ear: 'long', earCol: 0xbff4ff, tail: 'puff', tailCol: 0x9ff3ff, len: 0.85, leg: 0.15, snout: 0.75, w: 0.95,
    speed: 2.0, hop: 4.0, eye: 0x7fd6ff, eyeGlow: true, rare: { name: 'Aurora Hare', gift: 'auroraFeather', color: 0x9ff3ff } },
  // ---- the dragontoad pet (config/pets.js)
  dragontoad: { kind: 'toad', build: 'toad', fur: 0x5aa86a, belly: 0xf0e0a0, accent: 0xff8a3a, wing: 0xd8603a, speed: 1.4, hop: 3.2, radius: 0.36 },
};

/** How a rare creature behaves: it bolts when you come at it faster than a walk within `spook` metres, lets you
    befriend it within `reach`, and returns somewhere else `away` seconds after it gave its gift. */
export const RARE_CRITTERS = { spook: 11, spookSpeed: 1.15, reach: 2.4, away: 240, giftRarity: 'legendary', laterLoot: 'rare' };
