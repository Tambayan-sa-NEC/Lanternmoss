/* ---------------------------------------------------------------------
   VILLAGER FRIENDSHIP (TODO 33): the villagers become friends, not only quest givers and a shop.
   Rules: src/gameplay/friendshipRules.js (pure) · runtime: src/gameplay/Friendship.js · screen: the Journal's Friends tab.

   FRIENDSHIP        the numbers every villager shares.
     hearts            how many hearts a friendship can reach
     thresholds        points needed for 0, 1, 2 ... hearts (length hearts + 1, rising); the last one is the maximum
     talk.points       the first chat of each day (talking again the same day is free, and worth nothing)
     quest.points      finishing a quest that villager gave you
     gift.perDay       gifts one villager accepts in a day; gift.points = what each kind of present is worth
     greetFrom         hearts before they greet you by name instead of their ordinary opening line
     waveFrom          hearts before they wave when they spot you across the square
     wave              near/far (m): the band they wave across, and seconds before the same friend waves again
     door              from = hearts before they start leaving presents at your cottage door; chance = per friend, per day
     shop              the keeper's thank-you: perHeart off every price, never more than max (src/gameplay/wallet.js)

   TASTES            what each villager likes, by name (npcDefs.js travelers and the planets' locals).
     favourite / liked / disliked   item ids; anything else is a neutral present
     says              the reaction line for each of the four, with its portrait expression and emote bubble
     chatter           warm lines unlocked by the first heart, mixed into their ordinary chatter
     rewards           the heart ladder, in order. Each { hearts, kind, ... }:
                         items     { items: [[itemId, n]] }   handed over there and then
                         recipe    { recipe }                 a second way to learn a discovery recipe (config/crafting.js)
                         discount  { }                        the shopkeeper takes FRIENDSHIP.shop off their prices
                         keepsake  { item }                   their own vanity piece, made for you and nobody else
                         quest     { quest }                  unlocks the personal quest they only ask a real friend
   A villager with no entry here still makes friends: DEFAULT_TASTES gives them their planet's material and food, so a
   local who arrives with a new world (Wick, the Lamplighter) works before anyone writes their tastes down.
   --------------------------------------------------------------------- */

export const FRIENDSHIP = {
  hearts: 5,
  thresholds: [0, 20, 45, 80, 125, 180],
  talk: { points: 5 },
  quest: { points: 30 },
  gift: { perDay: 1, points: { favourite: 25, liked: 14, neutral: 6, disliked: -8 } },
  greetFrom: 1,
  waveFrom: 2,
  wave: { near: 6, far: 24, cooldown: 30 },
  door: { from: 3, chance: 0.45 },
  shop: { perHeart: 0.04, max: 0.2 },
};

/** The four who travel with you, and the locals of the released worlds. */
export const TASTES = {
  'Old Bramble': {
    favourite: ['amethyst', 'mossRune'], liked: ['glowcap', 'springWater', 'moonberry'], disliked: ['stone', 'saltedFish'],
    says: {
      favourite: { t: 'An amethyst of that clarity! Do you know what I can do with this? Neither do I. Yet. Thank you, {hero}.', e: 'excited', emote: 'star' },
      liked: { t: 'Ah, useful. Genuinely useful. That happens so rarely around here.', e: 'happy', emote: 'heart' },
      neutral: { t: 'A present? For me? I shall put it somewhere safe and then forget where.', e: 'happy', emote: 'heart' },
      disliked: { t: 'A rock. You have brought me a rock. Thank you, I suppose, for the rock.', e: 'thinking', emote: '!' },
    },
    chatter: [
      { t: "Between us, {hero}: the stones don't hum for just anyone. They've grown fond of you." },
      { t: 'Sit with me a while. The spell can wait. Most of them can, that is the secret.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['springWater', 2], ['amethyst', 1]] },
      { hearts: 3, kind: 'recipe', recipe: 'infusedMoonCharm' },
      { hearts: 4, kind: 'keepsake', item: 'brambleHat' },
      { hearts: 5, kind: 'quest', quest: 'brambleStarChart' },
    ],
  },
  Pim: {
    favourite: ['sunWheat', 'pumpkin'], liked: ['moonberry', 'moonCarrot', 'honeyBun'], disliked: ['gloomquartz', 'seaweed'],
    says: {
      favourite: { t: 'Oh, look at this wheat! Plump and golden. There will be buns tomorrow, and the first one is yours.', e: 'excited', emote: 'heart' },
      liked: { t: 'Straight into the pot with it. You always bring the good ones.', e: 'happy', emote: 'heart' },
      neutral: { t: "That's kind of you! I'll find a shelf for it, somewhere between the flour and the jam.", e: 'happy', emote: 'heart' },
      disliked: { t: "I can't bake with that, love. But I'll keep it, because you brought it.", e: 'thinking', emote: '!' },
    },
    chatter: [
      { t: 'Come round the back later, {hero}. There is a tray cooling that nobody has counted.' },
      { t: 'You know what I like about you? You eat properly. Most adventurers live on dried fish and hope.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['honeyBun', 2], ['moonberryTart', 1]] },
      { hearts: 3, kind: 'discount' },
      { hearts: 4, kind: 'keepsake', item: 'pimsApron' },
      { hearts: 5, kind: 'quest', quest: 'pimsHarvestTable' },
    ],
  },
  Lio: {
    favourite: ['moonberryTart', 'pearl'], liked: ['honeyBun', 'sweetleaf', 'grilledFish'], disliked: ['stone', 'charcoal'],
    says: {
      favourite: { t: 'A tart! I shall compose something for it. Something short. I am going to eat it immediately.', e: 'excited', emote: '♪' },
      liked: { t: 'For me? That is the third nicest thing anyone has done for me this year. The list is short.', e: 'happy', emote: '♪' },
      neutral: { t: 'A gift! I shall work it into a verse. Something rhyming with... hm. I will think of something.', e: 'happy', emote: 'heart' },
      disliked: { t: 'Charcoal. Right. Nothing rhymes with charcoal, you know. Nothing good.', e: 'thinking', emote: '!' },
    },
    chatter: [
      { t: 'I wrote a verse about you, {hero}. It is mostly accurate. The dragon was smaller.' },
      { t: 'Stay for one more song? Everyone always leaves before the good part.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['moonberryTart', 2]] },
      { hearts: 3, kind: 'recipe', recipe: 'perchChowder' },
      { hearts: 4, kind: 'keepsake', item: 'liosCape' },
      { hearts: 5, kind: 'quest', quest: 'liosLostVerse' },
    ],
  },
  Fern: {
    favourite: ['sweetleaf', 'moonCarrot'], liked: ['glowcap', 'springWater', 'moonberry'], disliked: ['charcoal', 'ironIngot'],
    says: {
      favourite: { t: 'Sweetleaf! Still green, still breathing. You picked it kindly, I can tell.', e: 'excited', emote: 'heart' },
      liked: { t: 'Oh, this is lovely. It still smells of the place it grew.', e: 'happy', emote: 'heart' },
      neutral: { t: 'For me? I shall plant it. Not everything grows, but everything can be planted.', e: 'happy', emote: 'heart' },
      disliked: { t: 'It is so... finished. Nothing left in it that wants to grow. Thank you anyway.', e: 'sad', emote: '!' },
    },
    chatter: [
      { t: "The flowers lean when you walk past, {hero}. They've decided about you, and so have I." },
      { t: 'Come to the pond at dusk. The little lights come out, and they are not shy of you now.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['sweetleaf', 3], ['moonberry', 2]] },
      { hearts: 3, kind: 'recipe', recipe: 'infusedLeafCharm' },
      { hearts: 4, kind: 'keepsake', item: 'fernsCrown' },
      { hearts: 5, kind: 'quest', quest: 'fernsQuietGrove' },
    ],
  },
  Cinder: {
    favourite: ['fireOpal', 'ironIngot'], liked: ['emberShard', 'copperIngot', 'firePepper'], disliked: ['frostPetal', 'snowPlum'],
    says: {
      favourite: { t: 'A fire opal. Hah! Stand back, {hero}, the forge is going to have an opinion about this.', e: 'excited', emote: 'star' },
      liked: { t: 'Good stock. Clean. I will make something out of this that outlives us both.', e: 'happy', emote: 'heart' },
      neutral: { t: 'Everything is worth something at a forge. Even this. Thank you.', e: 'happy', emote: 'heart' },
      disliked: { t: 'Frost. In my forge. You are lucky I like you.', e: 'thinking', emote: '!' },
    },
    chatter: [
      { t: 'You have got the hands for this work, you know. Come by, I will show you the trick with the hammer.' },
      { t: 'The fire is lower in the evenings. Easier to talk over. Come by then, if you like.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['ironIngot', 2], ['emberShard', 2]] },
      { hearts: 3, kind: 'recipe', recipe: 'emberRune' },
      { hearts: 4, kind: 'keepsake', item: 'cindersCape' },
      { hearts: 5, kind: 'quest', quest: 'cindersCommission' },
    ],
  },
  Tuva: {
    favourite: ['frostDiamond', 'snowPlum'], liked: ['frostPetal', 'iceTrout', 'plumPorridge'], disliked: ['firePepper', 'emberShard'],
    says: {
      favourite: { t: 'A frost diamond, whole and unclouded. The cold has been kind to you, {hero}.', e: 'excited', emote: 'star' },
      liked: { t: 'Mm. This will keep. Everything worth having up here keeps.', e: 'happy', emote: 'heart' },
      neutral: { t: 'A gift, in this weather. You carried it all the way up here. That is the part I like.', e: 'happy', emote: 'heart' },
      disliked: { t: 'It burns. Take it back before it melts something I need.', e: 'surprised', emote: '!' },
    },
    chatter: [
      { t: 'There is hot plum porridge on the stove. There is always enough for one more. That is you now.' },
      { t: 'The snow keeps a record of everyone who walks the pass. Yours is a good set of tracks.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['plumPorridge', 2], ['frostPetal', 2]] },
      { hearts: 3, kind: 'recipe', recipe: 'frostRune' },
      { hearts: 4, kind: 'keepsake', item: 'tuvasHood' },
      { hearts: 5, kind: 'quest', quest: 'tuvasThaw' },
    ],
  },
  Marlo: {
    favourite: ['pearl', 'seaglass'], liked: ['coral', 'saltedFish', 'coastalChowder'], disliked: ['charcoal', 'stone'],
    says: {
      favourite: { t: 'A pearl off this coast. The sea gives those to about one person a season, and it chose you.', e: 'excited', emote: 'star' },
      liked: { t: 'That will do nicely. Sit down, the kettle is on and the tide is slow.', e: 'happy', emote: 'heart' },
      neutral: { t: 'Everything washes up somewhere. Nice to have something arrive on purpose for once.', e: 'happy', emote: 'heart' },
      disliked: { t: 'Charcoal, in a lighthouse. I will keep it well away from the lens, if it is all the same to you.', e: 'thinking', emote: '!' },
    },
    chatter: [
      { t: 'The lamp turns easier when there is someone to talk to. Come up any evening, {hero}.' },
      { t: 'I keep the light for strangers. I keep the kettle on for friends. Mind which door you use.' },
    ],
    rewards: [
      { hearts: 2, kind: 'items', items: [['coastalChowder', 2], ['seaglass', 2]] },
      { hearts: 3, kind: 'recipe', recipe: 'goldenBanquet' },
      { hearts: 4, kind: 'keepsake', item: 'marlosCape' },
      { hearts: 5, kind: 'quest', quest: 'marlosCharts' },
    ],
  },
};

/** A villager nobody has written tastes for yet: their world's material and its cooking, and plain reactions. */
export const DEFAULT_TASTES = {
  favourite: [], liked: [], disliked: [],
  says: {
    favourite: { t: 'Oh, this is exactly right. Thank you, {hero}.', e: 'excited', emote: 'heart' },
    liked: { t: 'That is kind of you. It will get good use.', e: 'happy', emote: 'heart' },
    neutral: { t: 'A present? Well now. Thank you, traveller.', e: 'happy', emote: 'heart' },
    disliked: { t: 'Ah. I am not sure what to do with this one. But thank you.', e: 'thinking', emote: '!' },
  },
  chatter: [{ t: 'Good to see you again, {hero}. The place is better for having you in it.' }],
  rewards: [],
};
