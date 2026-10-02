/* ---------------------------------------------------------------------
   NPC CHALLENGES: mini games villagers offer when you talk to them (runtime: src/gameplay/challenges).
   giver      = NPC name (from NPC_DEFS)        kind   = activity in CHALLENGE_KINDS (collect / race / defeat)
   params     = settings for that kind          timeLimit / maxRange = fail if out of time / you walk this far away
   repeatable = can be won more than once       cooldown / declineCooldown = seconds before it's offered again
   reward / repeatReward = REWARDS keys (treats, buff: [kind, secs], restore). unlockLines join the NPC's chatter after the first win.
   text keys: offer, offerAgain, accept, decline, active, success, fail (+ optional timeout / left / fainted / abandoned)
   placeholders: {progress} {best} {time} {wins}
   --------------------------------------------------------------------- */
export const CHALLENGES = {
  fireflyCatch: {
    giver: 'Fern', title: 'Firefly Catch', kind: 'collect', timeLimit: 30, maxRange: 22, repeatable: true, cooldown: 25, declineCooldown: 20,
    params: { count: 6, minRadius: 3, radius: 10, color: 0xfff08a, size: 0.16, height: 1.2, drift: 2.2, label: 'fireflies' },
    reward: { treats: 1, buff: ['feather', 25] }, repeatReward: { treats: 1 },
    text: {
      offer: "Psst! My fireflies wriggled out of their jar... Can you catch all 6 in {time} seconds? They're a little shy~",
      offerAgain: 'The fireflies escaped AGAIN. Another round? Your best time is {best}.',
      accept: 'Yay! Go go go, catch them~!',
      decline: 'Aww, okay. They do look pretty floating around...',
      active: "You've got {progress}! Hurry hurry~",
      success: 'You caught every single one! Here, a Feather-Step for your speedy feet!',
      fail: "Eep, they slipped away! That's okay, fireflies are tricky.",
      abandoned: 'Giving up? No worries, those fireflies were cheating anyway.',
    },
  },
  lanternDash: {
    giver: 'Lio', title: 'Lantern Dash', kind: 'race', timeLimit: 24, maxRange: 26, repeatable: true, cooldown: 20, declineCooldown: 20,
    params: { count: 6, radius: 9, color: 0xffc86a },
    reward: { treats: 1 }, repeatReward: { treats: 1 },
    text: {
      offer: "I'm writing a ballad about a speedy hero, but I need inspiration! Run through every lantern ring in {time} seconds?",
      offerAgain: 'Encore! Think you can beat {best}?',
      accept: 'Ready... set... dash! ♪',
      decline: 'No rush! Ballads can be slow songs too.',
      active: '{progress}! Run, run, my lute is getting excited!',
      success: 'Bravo! That run deserves a whole verse. Take a treat, hero!',
      fail: 'So close! The ballad will have a dramatic sequel.',
      left: "Hey, the course was back this way! Let's try again later.",
    },
  },
  moonberryHarvest: {
    giver: 'Pim', title: 'Moonberry Harvest', kind: 'collect', timeLimit: 40, maxRange: 24, repeatable: false, cooldown: 15, declineCooldown: 20,
    params: { count: 5, minRadius: 4, radius: 11, color: 0xc7a8ff, size: 0.18, height: 0.45, label: 'moonberries' },
    reward: { treats: 3, restore: true },
    unlockLines: ['These moonberry tarts are the best batch yet, all thanks to you!', 'The crows keep asking who picked the berries. I tell them: a hero did.'],
    text: {
      offer: 'My moonberry tarts need fresh berries, but my knees are too old for picking. Could you gather 5 in {time} seconds?',
      offerAgain: 'Want to try the berry picking again, dear?',
      accept: "Wonderful! They glow purple, you can't miss them.",
      decline: "Not to worry, I'll make cinnamon buns instead.",
      active: '{progress} so far! The oven is warming up.',
      success: 'Perfect berries! Three tarts for you, fresh and warm. Come back anytime!',
      fail: "Oh dear, the berries went back to sleep. Let's try another time.",
    },
  },
  wispTrial: {
    giver: 'Old Bramble', title: 'Wisp Trial', kind: 'defeat', timeLimit: 45, maxRange: 20, repeatable: true, cooldown: 40, declineCooldown: 30,
    params: { spawn: { wisp: 3 }, minRadius: 5, radius: 9 },
    reward: { buff: ['moon', 30], treats: 2 }, repeatReward: { treats: 1, restore: true },
    text: {
      offer: 'Your spellwork shows promise. A trial, then? I shall summon three wisps; banish them within {time} seconds.',
      offerAgain: 'Back for another trial? Your record stands at {best}.',
      accept: 'Very well. Wisps, arise!',
      decline: 'Wise, perhaps. A mage should know her limits.',
      active: '{progress}. Focus, young one!',
      success: 'Splendid! The stones approve. Take this Moon-Hop charm as your prize.',
      fail: 'The wisps have the better of you today. Rest, and return stronger.',
      fainted: 'Up you get. Every great mage has fainted at least once. I did it twice this morning.',
    },
  },
};
