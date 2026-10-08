/* ---------------------------------------------------------------------
   BOSS SUMMONING: a planet's boss sleeps in its sealed lair until the planet's conditions are met (each boss sets its
   own: PLANETS[i].boss.summon), then wakes in a short sequence when the hero comes to the lair, and fights inside a
   ring it won't let you leave (PLANETS[i].boss.arena). Runtime: src/gameplay/BossGate.js.
     summon   { level }                  the hero's level at least this
              { seals: { count, type } } that many seal objects (COMBAT.enemies[type], object: true) stand around the
                                         lair; break them all
              { sigils: { count, item, elites } } `elites` of the planet's monsters are elites (tougher, golden); each
                                         drops a sigil item; bring `count` to the lair (they're used up)
              { quest }                  a villager's quest (config/quests.js id) done
              { night: true }            only rises at night (the condition is checked until the boss wakes)
     arena    { wall }                   the look of the ring: ARENA_WALLS key
   --------------------------------------------------------------------- */

/** The waking sequence and the lair. */
export const SUMMON = {
  trigger: 17,             // metres from the lair centre: walking this close with everything done wakes the boss
  sequence: 4.2,           // seconds the sequence lasts (the hero can't act, nor be hurt)
  rise: [0.6, 2.2],        // the boss appears between these times
  card: [1.6, 4.0],        // its name card shows between these times
  camera: { dist: 17, pitch: 0.38, lift: 3 },
  sealRing: 13,            // metres from the lair centre the seals stand at
  readyBanner: true,       // a banner when everything is done ("the lair stirs")
};

/** Elite monsters (sigil carriers). */
export const ELITE = { hp: 2.6, damage: 1.3, xp: 2.5, scale: 1.3, halo: 0xffd36b };

/** The arena ring: radius (metres from the lair centre; inside the boss's leash) and each wall's look. */
export const ARENA = { radius: 25, rise: 0.8, posts: 56 };
export const ARENA_WALLS = {
  thorns:   { color: 0x6a8a3a, glow: 0xb48cff, height: 2.2, kind: 'thorn' },
  fire:     { color: 0xff6a2a, glow: 0xffb03d, height: 2.6, kind: 'flame' },
  hellfire: { color: 0xd0305a, glow: 0xff4d6d, height: 2.8, kind: 'flame' },
};

/** What villagers say about a sealed lair: one hint per unmet condition ({boss} = its short name). */
export const SUMMON_HINTS = {
  level: '{boss} would make short work of you right now, {hero}. Come back when you\'re level {need}. Please.',
  seals: '{boss} sleeps behind thorn seals in its glade. Break all {need}, and it wakes. Are you sure you want it to?',
  sigils: 'The elites out there, the big golden-crowned ones, carry sigils. Bring {need} to the lair and {boss} will answer.',
  quest: 'Help {giver} first. {boss} only shows itself to someone this village trusts.',
  night: '{boss} only rises at night. Wait for the stars, then go to the lair, if you dare.',
  ready: 'Can you feel it? {boss} is stirring in its lair. Whenever you\'re ready, {hero}.',
};
