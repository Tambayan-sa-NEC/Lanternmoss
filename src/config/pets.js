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
               planet = hide this pet until that world is released (test candidate catalogs can expose it);
               text = how to find it
   --------------------------------------------------------------------- */
import { PLANETS } from './planets.js';

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
  otter: {
    name: 'Otter', defaultName: 'Ripple', role: 'Pearl diver', body: 'walk', model: 'otter', color: '#70dfd7', hp: 75,
    blurb: 'A little lighthouse helper who can retrieve pearls from submerged clam beds.',
    attack: { damage: 5, cooldown: 2.4, range: 9, knock: 0.8 },
    ability: { id: 'pearlDive', name: 'Pearl Dive', cooldown: 90, radius: 14, perDay: 2, yield: 1,
      text: 'Dives to a submerged clam bed within 14m for one pearl, up to twice each adventure day. The bed needs time to regrow.' },
    unlock: { planet: 'tidewhisper', quest: 'darkLighthouse', text: 'Help Marlo relight the Tidewhisper lighthouse.' },
  },
};

/** Only released worlds expose their tied pets in normal play; candidate catalogs can exercise them in tests. */
export const petAvailable = id => !!PETS[id] && (!PETS[id].unlock?.planet || PLANETS.some(p => p.id === PETS[id].unlock.planet));
export const availablePetIds = () => Object.keys(PETS).filter(petAvailable);

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

/* ---------------------------------------------------------------------
   PET CARE (TODO 35): feeding, outfits, finds and the pet bed. Runtime: src/gameplay/Pets.js (care state, saved with
   the pets), the pet menu's Care panel (src/ui/petViews.js), src/models/vanity.js (dressPet) and the cottage
   (src/gameplay/Houses.js, a `petBed` furnishing in config/home.js).
     PET_FAVOURITES  each pet's favourite foods (item ids), from the farm, the ponds and the wilds. Any other food a pet
                     eats (petEdible: anything that fills your energy) is merely liked.
     PET_FOOD        feeding from the pet menu, the pet that is out with you only:
                       perDay        meals a pet will eat in one adventure day (then it is full until tomorrow)
                       favouriteXp / likedXp   hero XP for a favourite or any other food (pet level = hero level)
                       happySeconds  a favourite makes the pet Happy this long: happyDamage more pet damage
                       heal          share of the pet's health a meal restores
     PET_FINDS       a pet fed today sometimes brings back something it found while you explore outdoors:
                       interval      seconds between tries (only while it follows you, outside a fight)
                       chance        of a find on each try; perDay = at most this many finds a day
                       table         [itemId | 'coins', weight, [min, max]]
     PET_OUTFIT_FIT  where an outfit sits on each pet's head group (models/creatures.js): top = hats and bows,
                     neck = scarves, both [x, y, z] in the head's frame, and s = a size for that head
     PET_BED         the cottage pet bed: a pet resting in it (you indoors with it placed) heals `heal` of its health
                     a second, and a fainted pet's rest runs `faintRate` times faster
   --------------------------------------------------------------------- */
export const PET_FAVOURITES = {
  owl:        ['pondPerch', 'moonberry'],
  wolf:       ['iceTrout', 'moonCarrot', 'honeyBun'],
  fox:        ['moonberry', 'pondPerch', 'moonCarrot'],
  wisp:       ['honeyBun', 'moonberryTart', 'moonberry'],
  dragontoad: ['pondPerch', 'firePepper'],
  whelp:      ['firePepper', 'cinderEel', 'pumpkin'],
  otter:      ['silverSprat', 'pondPerch', 'clam'],
};
export const PET_FOOD = { perDay: 3, favouriteXp: 15, likedXp: 5, happySeconds: 120, happyDamage: 0.2, heal: 0.3 };
/** Food a pet will eat: any food you could eat yourself (it fills energy, so potions and elixirs are not food), plus
    the raw crops, fish and forage it might fancy. */
export const petEdible = def => !!def && (def.use?.some(u => u.effect === 'energy')
  || Object.values(PET_FAVOURITES).some(list => list.includes(def.id)));
export const PET_FINDS = {
  interval: 75, chance: 0.4, perDay: 3,
  table: [['sweetleaf', 5, [1, 2]], ['moonberry', 4, [1, 2]], ['glowcap', 2, [1, 1]], ['carrotSeeds', 2, [1, 1]],
    ['wheatSeeds', 2, [1, 1]], ['pumpkinSeeds', 1, [1, 1]], ['coins', 2, [3, 8]]],
};
export const PET_OUTFIT_FIT = {
  owl:        { top: [0, 0.25, -0.02], neck: [0, -0.2, 0], s: 0.9 },
  wolf:       { top: [0, 0.2, -0.04], neck: [0, -0.17, -0.06], s: 1 },
  fox:        { top: [0, 0.2, -0.04], neck: [0, -0.17, -0.06], s: 1 },
  wisp:       { top: [0, 0.26, 0], neck: [0, -0.2, 0], s: 0.9 },
  dragontoad: { top: [0, 0.2, -0.06], neck: [0, -0.18, -0.06], s: 1.1 },
  whelp:      { top: [0, 0.22, -0.04], neck: [0, -0.16, -0.06], s: 0.9 },
  otter:      { top: [0, 0.2, -0.04], neck: [0, -0.17, -0.05], s: 1 },
};
export const PET_BED = { heal: 0.25, faintRate: 6 };

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
