/* ---------------------------------------------------------------------
   PETS: every companion, how it fights, its ability, and how it's unlocked (runtime: src/gameplay/Pets.js, bodies:
   src/entities/companions/). Any hero can take any unlocked pet: on the pet step of character select, or in the pet
   menu during play (src/ui/PetMenu.js). Each hero starts with their own (CHARACTERS[id].companion), and the game
   remembers which pet each hero last took (PET_PICKS_KEY).
     body      'fly' (flutters at the hero's shoulder, swoops to strike) | 'walk' (heels at the hero's side, runs in to bite)
     model     'owl' | 'wisp' | 'whelp' for flyers (src/models/creatures.js), or a CRITTER_DEFS key for walkers
     name      the species; defaultName = what it's called until you rename it; role = one word on its card
     hp        health at level 1 (+ PET_LEVELS.hpPerLevel per hero level above 1); at 0 it faints for a while
     attack    { damage, cooldown, range, ...damageEnemy options (mark, stagger, slow + slowTime, knock) }
     ability   { id, name, key text, cooldown, ...its numbers } (effects: src/gameplay/petAbilities.js)
     unlock    null = always yours; { quest: id } | { chest: kind } | { bossChest: planet index } | { miniBoss: type };
               text = how to find it
   --------------------------------------------------------------------- */

export const PETS = {
  owl: {
    name: 'Owl', defaultName: 'Pip', role: 'Scout', body: 'fly', model: 'owl', color: '#b58cff', hp: 60,
    blurb: 'Swoops at monsters you fight, marking them for +25% damage and interrupting their wind-ups.',
    attack: { damage: 4, cooldown: 4, range: 11, mark: 4, stagger: 0.6 },
    ability: { id: 'scout', name: 'Scout', cooldown: 25, radius: 30, mark: 8,
      text: 'Circles high and spots every monster within 30m: they show on the compass and are marked for 8s.' },
    unlock: null,
  },
  wolf: {
    name: 'Wolf', defaultName: 'Fang', role: 'Brawler', body: 'walk', model: 'wolf', color: '#7fb8ff', hp: 95,
    blurb: 'Runs in to bite whatever you are fighting, slowing it down.',
    attack: { damage: 7, cooldown: 2.6, range: 9, slow: 0.3, slowTime: 1.5, knock: 1.5 },
    ability: { id: 'howl', name: 'Howl', cooldown: 30, seconds: 8, damage: 0.2,
      text: 'A rallying howl: +20% damage for you for 8s.' },
    unlock: null,
  },
  fox: {
    name: 'Fox', defaultName: 'Ember', role: 'Finder', body: 'walk', model: 'fox', color: '#ff8c4a', hp: 70,
    blurb: 'Quick, darting nips that stagger monsters; never far from your heels.',
    attack: { damage: 5, cooldown: 1.8, range: 9, stagger: 0.3 },
    ability: { id: 'fetch', name: 'Fetch', cooldown: 25, radius: 14,
      text: 'Fetches every item lying within 14m and sniffs out the nearest unopened chest.' },
    unlock: { chest: 'rare', text: 'Curled up asleep in a locked Lantern chest.' },
  },
  wisp: {
    name: 'Wisp', defaultName: 'Glimmer', role: 'Healer', body: 'fly', model: 'wisp', color: '#9ff3ff', hp: 50,
    blurb: 'A calmed wisp. Its little sparks chill monsters, slowing them.',
    attack: { damage: 3, cooldown: 3, range: 10, slow: 0.35, slowTime: 2 },
    ability: { id: 'mend', name: 'Mend', cooldown: 35, heal: 0.35, seconds: 5,
      text: 'Glows warm and gold: restores 35% of your HP over 5s (and some of its own).' },
    unlock: { quest: 'humStones', text: 'Befriended when the Humming Stones are tuned (Old Bramble\'s quest).' },
  },
  dragontoad: {
    name: 'Dragontoad', defaultName: 'Puddle', role: 'Guardian', body: 'walk', model: 'dragontoad', color: '#5aa86a', hp: 105,
    blurb: 'Half toad, half dragon, all heart. Lashes monsters with a sticky tongue that slows them down.',
    attack: { damage: 6, cooldown: 2.3, range: 9, slow: 0.4, slowTime: 2, knock: 1 },
    ability: { id: 'bellow', name: 'Bellow', cooldown: 28, radius: 6.5, damage: 14, stun: 1.6,
      text: 'A booming dragon-croak: every monster within 6.5m is knocked back, hurt and stunned for a moment.' },
    unlock: { miniBoss: 'hydra', text: 'An egg the Hydra guards by its lake (Lanternmoss or Frostveil). Defeat the Hydra to hatch it.' },
  },
  whelp: {
    name: 'Dragon whelp', defaultName: 'Cinderling', role: 'Firestarter', body: 'fly', model: 'whelp', color: '#ff7a4a', hp: 80,
    blurb: 'Pyrrhax\'s last egg, hatched. Spits little fireballs that hit hard.',
    attack: { damage: 8, cooldown: 3.5, range: 12, knock: 2 },
    ability: { id: 'flame', name: 'Flame Burst', cooldown: 20, damage: 30, radius: 4.5,
      text: 'Bursts into flame around your target (or you): 30 damage to every monster within 4.5m.' },
    unlock: { bossChest: 1, text: 'An egg in Pyrrhax\'s treasure chest, on Emberfall.' },
  },
};

/** localStorage key for the pet each hero last took ({ heroId: petId }). */
export const PET_PICKS_KEY = 'lanternmoss.pets';

/** The menus show a pet off in front of the hero (ahead = metres in front, height = for flyers), and the camera
    frames it from the front: distance, pitch, and how far above the pet's origin to look. Per body. */
export const PET_SHOWCASE = {
  walk: { ahead: 1.9, dist: 3.3, pitch: 0.3, lift: 0.45 },
  fly: { ahead: 1.8, height: 1.5, dist: 3.4, pitch: 0.18, lift: 0.05 },
};

/** Pets grow with the hero: pet level = hero level. */
export const PET_LEVELS = { damagePerLevel: 0.1, hpPerLevel: 8 };

/** Health, fainting and the little things. */
export const PET_CARE = {
  faintTime: 20,           // seconds a fainted pet is away before it bounds back, fully healed
  regen: 4,                // HP per second once it hasn't been hurt for regenDelay seconds
  regenDelay: 5,
  retaliate: 0.6,          // chance a struck monster hits back...
  retaliateDamage: 0.5,    // ...for this share of its attack damage
  petReach: 2.2,           // stand this close (and still) to pet them with E
  nameLength: 14,
};

/** Swapping pets in play with its key (N): a short wait between swaps. */
export const PET_SWAP = { cooldown: 1.2 };

/** What a pet does when not using its ability. T cycles through them. */
export const PET_COMMANDS = {
  follow:  { label: 'Follow', text: 'stays close and helps with whatever you fight' },
  stay:    { label: 'Stay', text: 'waits right here and only defends this spot' },
  attack:  { label: 'Attack', text: 'goes after your target, whatever it is' },
  passive: { label: 'Passive', text: 'stays close and never fights' },
};

/** How pets move. fly: shoulder height and swoop speed; walk: the heel spot beside and behind the hero. */
export const PET_MOTION = {
  fly: { height: 2.4, swoopSpeed: 15, teleportDist: 25 },
  walk: { sideOffset: 1.4, behind: 1.3, stopDist: 1.2, walkSpeed: 3.2, runSpeed: 9.5, chaseSpeed: 9, sitAfter: 2.5, teleportDist: 25 },
};
