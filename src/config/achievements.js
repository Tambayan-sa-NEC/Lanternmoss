/* ---------------------------------------------------------------------
   ACHIEVEMENTS: what the journal (src/gameplay/Journal.js, screen: src/ui/JournalUI.js) rewards. Progress is kept
   across adventures, in the browser (JOURNAL_KEY), like the remembered pets.
     group    'Firsts' | 'Counts' | 'Challenges' (the journal lists them in that order)
     icon     a glyph id from src/ui/icons.js
     goal     { stat, at }   done when the journal's counter `stat` reaches `at` (see JOURNAL_STATS);
              { flag }       done when the journal records that flag (the boss challenges below)
     reward   { coins } paid out when it unlocks during an adventure
     secret   the text stays hidden until it's done
   Boss challenges: a fight starts when the boss engages; it counts as `flawless` if no hit lands on the hero,
   `petless` if your pet never strikes the boss, and `underdog` if you win at or under BOSS_CHALLENGES.lowLevel.
   --------------------------------------------------------------------- */

/** Counters the journal keeps (all lifetime totals). */
export const JOURNAL_STATS = {
  monsters: 'Monsters defeated', bosses: 'Bosses defeated', bossKinds: 'Different bosses defeated', chests: 'Chests opened',
  quests: 'Quests finished', crafted: 'Items crafted', legendary: 'Kinds of Legendary gear found', petsFound: 'Pets found',
  kinds: 'Kinds of monster defeated', items: 'Kinds of item found', minibosses: 'Mini bosses defeated', rareFriends: 'Rare creatures befriended',
};

export const ACHIEVEMENTS = [
  // ---- firsts
  { id: 'firstBlood', group: 'Firsts', icon: 'slash', name: 'First Steps', text: 'Defeat your first monster.', goal: { stat: 'monsters', at: 1 }, reward: { coins: 5 } },
  { id: 'firstBoss', group: 'Firsts', icon: 'boss', name: 'Crown Breaker', text: 'Defeat a planet boss.', goal: { stat: 'bosses', at: 1 }, reward: { coins: 40 } },
  { id: 'allBosses', group: 'Firsts', icon: 'trophy', name: 'Lantern of Three Worlds', text: 'Defeat Gloomcap, Pyrrhax and Malgrath.', goal: { stat: 'bossKinds', at: 3 }, reward: { coins: 150 } },
  { id: 'firstChest', group: 'Firsts', icon: 'chest', name: 'Finders Keepers', text: 'Open a treasure chest.', goal: { stat: 'chests', at: 1 }, reward: { coins: 5 } },
  { id: 'firstCraft', group: 'Firsts', icon: 'craft', name: 'Handmade', text: 'Craft an item.', goal: { stat: 'crafted', at: 1 }, reward: { coins: 10 } },
  { id: 'firstLegendary', group: 'Firsts', icon: 'gem', name: 'The Real Treasure', text: 'Find a Legendary piece of gear.', goal: { stat: 'legendary', at: 1 }, reward: { coins: 50 } },
  { id: 'allPets', group: 'Firsts', icon: 'paw', name: 'Menagerie', text: 'Find every pet.', goal: { stat: 'petsFound', at: 'allPets' }, reward: { coins: 80 } },
  { id: 'allKinds', group: 'Firsts', icon: 'book', name: 'Field Notes', text: 'Defeat one of every kind of monster and boss.', goal: { stat: 'kinds', at: 'allKinds' }, reward: { coins: 120 } },
  { id: 'giantSlayer', group: 'Firsts', icon: 'boss', name: 'Giant Slayer', text: 'Defeat a mini boss: the Hydra or the Basilisk.', goal: { stat: 'minibosses', at: 1 }, reward: { coins: 40 } },
  { id: 'gentleHands', group: 'Firsts', icon: 'paw', name: 'Gentle Hands', text: 'Befriend a rare creature (walk up to it slowly).', goal: { stat: 'rareFriends', at: 1 }, reward: { coins: 25 } },
  // ---- counts
  { id: 'monsters25', group: 'Counts', icon: 'slash', name: 'Monster Tamer', text: 'Defeat 25 monsters.', goal: { stat: 'monsters', at: 25 }, reward: { coins: 15 } },
  { id: 'monsters100', group: 'Counts', icon: 'slash', name: 'Lantern Warden', text: 'Defeat 100 monsters.', goal: { stat: 'monsters', at: 100 }, reward: { coins: 40 } },
  { id: 'monsters300', group: 'Counts', icon: 'slash', name: 'Legend of the Moss', text: 'Defeat 300 monsters.', goal: { stat: 'monsters', at: 300 }, reward: { coins: 100 } },
  { id: 'chests10', group: 'Counts', icon: 'chest', name: 'Treasure Hunter', text: 'Open 10 chests.', goal: { stat: 'chests', at: 10 }, reward: { coins: 25 } },
  { id: 'chests30', group: 'Counts', icon: 'chest', name: 'Dragon\'s Hoard', text: 'Open 30 chests.', goal: { stat: 'chests', at: 30 }, reward: { coins: 60 } },
  { id: 'quests3', group: 'Counts', icon: 'quest', name: 'Good Neighbour', text: 'Finish 3 quests.', goal: { stat: 'quests', at: 3 }, reward: { coins: 20 } },
  { id: 'quests10', group: 'Counts', icon: 'quest', name: 'Pillar of the Village', text: 'Finish 10 quests.', goal: { stat: 'quests', at: 10 }, reward: { coins: 50 } },
  { id: 'crafted10', group: 'Counts', icon: 'craft', name: 'Workbench Regular', text: 'Craft 10 items.', goal: { stat: 'crafted', at: 10 }, reward: { coins: 30 } },
  { id: 'collector', group: 'Counts', icon: 'star', name: 'Collector', text: 'Find 20 different kinds of item.', goal: { stat: 'items', at: 20 }, reward: { coins: 30 } },
  // ---- challenges (planet bosses)
  { id: 'flawless', group: 'Challenges', icon: 'guard', name: 'Not a Scratch', text: 'Defeat a boss without being hit once.', goal: { flag: 'flawless' }, reward: { coins: 100 } },
  { id: 'underdog', group: 'Challenges', icon: 'sprout', name: 'Underdog', text: 'Defeat a boss at a low level (Gloomcap at 3 or lower, Pyrrhax at 5, Malgrath at 7).', goal: { flag: 'underdog' }, reward: { coins: 80 } },
  { id: 'petless', group: 'Challenges', icon: 'leap', name: 'Lone Hero', text: 'Defeat a boss without your pet landing a single strike on it.', goal: { flag: 'petless' }, reward: { coins: 60 } },
];

/** Boss challenges: the highest hero level that still counts as "low", per planet (index into PLANETS). */
export const BOSS_CHALLENGES = { lowLevel: [3, 5, 7] };

/** How the unlock toast behaves. */
export const ACHIEVEMENT_TOAST = { seconds: 4.5, gap: 0.4 };

/** The bestiary marks a monster as met once it comes this close (metres) or fights you. */
export const BESTIARY = { meetDistance: 16 };

/** localStorage key for the journal (achievements, bestiary and collection progress). */
export const JOURNAL_KEY = 'lanternmoss.journal';
