/* ---------------------------------------------------------------------
   QUESTS: multi-step favours villagers ask for (runtime: src/gameplay/quests/Quests.js). Unlike challenges (one timed
   activity), a quest is a list of steps done at your own pace, possibly across planets.
     giver     NPC name (npcDefs.js)          planet  offered from this planet index on (default 0)
     hearts    only offered once the giver's friendship reaches this many hearts (TODO 33; default 0 = anyone)
     steps     in order, each { kind, text (tracker), ... }:
                 collect  { item, count }              have this many in the bag
                 deliver  { to, item, count, say }     talk to `to` with them in the bag (they're handed over)
                 talk     { to, say }                  talk to `to`
                 defeat   { enemy ('any' or a type), count }
                 reach    { planet }                   travel to that planet (index)
               any step may also give: [[itemId, n]] items to the hero when it completes
     give      optional [[itemId, n]] handed over when the quest is accepted
     reward    { coins, xp, items: [[itemId, n]] } when the last step is done
     text      offer / accept / decline (the giver), done (the giver's last words, said with the reward)
   A quest whose giver stays behind on a planet you leave is dropped. Text may use {hero} {planet} ...
   --------------------------------------------------------------------- */

export const QUESTS = {
  darkLighthouse: {
    giver:'Marlo',title:'The Dark Lighthouse',planet:'tidewhisper',
    steps:[
      {kind:'collect',item:'seaglass',count:6,text:'Gather 6 Seaglass for the lens'},
      {kind:'deliver',to:'Marlo',item:'seaglass',count:6,text:'Bring the lens glass to Marlo',say:'Smooth and clear! I can set this into a new lens. Now we need fuel.'},
      {kind:'collect',item:'wood',count:6,text:'Gather 6 Wood for lighthouse fuel'},
      {kind:'deliver',to:'Marlo',item:'wood',count:6,text:'Bring the fuel to Marlo',say:'Dry wood and a clear lens. Ready to bring our light back?'},
      {kind:'talk',to:'Marlo',text:'Light the lighthouse with Marlo',say:'There! A steady light over Tidewhisper again. The causeway opens at low tide; Mirelure waits beyond it.'},
    ],
    reward:{coins:80,xp:120,items:[['coastalChowder',2]]},
    text:{offer:'The squall cracked our lighthouse lens and soaked the fuel. Bring six seaglass and six wood to relight it?',
      accept:'Start with the glass. Look for smooth turquoise pieces washed onto the beaches.',decline:'The sea will keep turning. Come back when you have a moment.',done:'Take this chowder for the crossing. And remember: not every light out there is ours.'},
  },
  humStones: {
    giver: 'Old Bramble', title: 'The Humming Stones',
    steps: [
      { kind: 'collect', item: 'glowcap', count: 4, text: 'Gather 4 Glowcaps' },
      { kind: 'deliver', to: 'Old Bramble', item: 'glowcap', count: 4, text: 'Bring the Glowcaps to Old Bramble',
        say: 'Splendid! Now, a pinch of glowcap on each stone... Hear that? The wisps beyond the lanterns certainly did.' },
      { kind: 'defeat', enemy: 'wisp', count: 3, text: 'Calm 3 wisps beyond the lanterns' },
      { kind: 'talk', to: 'Old Bramble', text: 'Tell Old Bramble the wisps are calm', say: 'The stones are humming in tune at last! Well. Nearly in tune.' },
    ],
    reward: { coins: 40, xp: 60, items: [['moonHopCharm', 1]] },
    text: {
      offer: 'The standing stones have gone sour, {hero}. Help an old wizard re-tune them? It involves mushrooms. And mild peril.',
      accept: 'Wonderful! Start with four Glowcaps: they grow wild all over Lanternmoss.',
      decline: 'No hurry. The stones have waited a thousand years. They can sulk a little longer.',
      done: 'For you: a Moon-Hop charm. Jump high, traveller.',
    },
  },
  pieDelivery: {
    giver: 'Pim', title: 'Pie Delivery',
    steps: [
      { kind: 'collect', item: 'moonberry', count: 3, text: 'Pick 3 Moonberries' },
      { kind: 'deliver', to: 'Pim', item: 'moonberry', count: 3, text: 'Bring the Moonberries to Pim', give: [['moonberryTart', 2]],
        say: 'Perfect, ripe and squishy! Here, two fresh tarts: one for Lio, one for Fern. No nibbling!' },
      { kind: 'deliver', to: 'Lio', item: 'moonberryTart', count: 1, text: 'Deliver a tart to Lio', say: 'A tart?! For me? I shall write it a sonnet. Then eat it.' },
      { kind: 'deliver', to: 'Fern', item: 'moonberryTart', count: 1, text: 'Deliver a tart to Fern', say: "It's bigger than my head! Thank youuu~" },
      { kind: 'talk', to: 'Pim', text: 'Tell Pim the tarts arrived', say: 'They liked them? Oh, my heart is a warm loaf.' },
    ],
    reward: { coins: 30, items: [['honeyBun', 2]] },
    text: {
      offer: "I promised tarts to Lio and Fern, but I'm out of moonberries! Could you pick me three?",
      accept: 'Bless you! Moonberries glow purple in the wilds, you can\'t miss them.',
      decline: 'Oh, alright. Maybe I can make a... beige tart. Hm.',
      done: 'Two honey buns, warm from the oven. For the road!',
    },
  },
  firstHarvest: {
    giver: 'Pim', title: 'First Harvest',
    give: [['carrotSeeds', 4]],
    steps: [
      { kind: 'collect', item: 'moonCarrot', count: 3, text: 'Grow 3 Moon Carrots in the farm by the village' },
      { kind: 'deliver', to: 'Pim', item: 'moonCarrot', count: 3, text: 'Bring the Moon Carrots to Pim',
        say: "Look at them! Crunchy, silvery, perfect. These are going straight into a stew. Well. After I admire them." },
    ],
    reward: { coins: 25, xp: 40, items: [['strawHat', 1]] },
    text: {
      offer: "The little farm plot past the houses has been empty all year. Fancy growing something? I'll give you seeds!",
      accept: 'Here: moon carrot seeds. Till a plot with a hoe, plant, and water them. Rain helps too! A hoe is on my shelf.',
      decline: 'Maybe another day. The soil will wait. Soil is very patient.',
      done: 'Every farmer needs a hat. This one was my granny\'s. Wear it well!',
    },
  },
  songsAfar: {
    giver: 'Lio', title: 'Songs of Other Worlds',
    steps: [
      { kind: 'reach', planet: 1, text: 'Travel to Emberfall' },
      { kind: 'collect', item: 'emberShard', count: 3, text: 'Find 3 Ember Shards' },
      { kind: 'deliver', to: 'Lio', item: 'emberShard', count: 3, text: 'Bring the Ember Shards to Lio', say: 'Listen! They hum in B-flat. Warm, crackly B-flat.' },
      { kind: 'reach', planet: 2, text: 'Travel to Frostveil' },
      { kind: 'collect', item: 'frostPetal', count: 3, text: 'Find 3 Frost Petals' },
      { kind: 'deliver', to: 'Lio', item: 'frostPetal', count: 3, text: 'Bring the Frost Petals to Lio', say: 'And these chime in A! Fire and frost... the ballad is complete!' },
    ],
    reward: { coins: 40, xp: 150, items: [['featherCharm', 1]] },
    text: {
      offer: "Every planet has its own music, they say. Bring me a little sound from each world we visit? It's a long tune.",
      accept: 'Splendid! Nothing to do until we reach the next planet. Then: listen to the rocks.',
      decline: 'Then I shall hum alone. Dramatically.',
      done: 'Take this charm. Every hero needs a fast exit after a long song.',
    },
  },
  dragonForge: {
    giver: 'Cinder', title: 'Dragonfire Forge', planet: 1,
    steps: [
      { kind: 'collect', item: 'emberShard', count: 4, text: 'Gather 4 Ember Shards' },
      { kind: 'defeat', enemy: 'ramhorn', count: 2, text: 'Defeat 2 ramhorns' },
      { kind: 'deliver', to: 'Cinder', item: 'emberShard', count: 4, text: 'Bring the shards to Cinder', say: 'Good shards. Hot, angry, perfect. Stand back.' },
    ],
    reward: { coins: 100, xp: 80, items: [['featherCharm', 1]] },
    text: {
      offer: "My forge needs ember shards, and the ramhorns keep butting my gatherers. Fetch four and teach two ramhorns some manners?",
      accept: 'Good. Shards glow on the slopes. Ramhorns glow with rage. Easy to tell apart.',
      decline: "Suit yourself. I'll keep hammering cold iron. Loudly.",
      done: "A Feather-Step charm, forged in dragonfire. Well. Near dragonfire. Don't tell anyone.",
    },
  },
  frostHearts: {
    giver: 'Tuva', title: 'Warm Hearts', planet: 2,
    steps: [
      { kind: 'defeat', enemy: 'thornmole', count: 3, text: 'Chase off 3 thornmoles' },
      { kind: 'collect', item: 'frostPetal', count: 4, text: 'Gather 4 Frost Petals' },
      { kind: 'deliver', to: 'Tuva', item: 'frostPetal', count: 4, text: 'Bring the petals to Tuva', say: 'They never melt, these. Like a promise. Thank you.' },
    ],
    reward: { coins: 90, xp: 120, items: [['moonberryTart', 2]] },
    text: {
      offer: 'Thornmoles are digging up my frost-petal garden. Chase three away, then help me replant?',
      accept: "Thank you! Feel the ground tremble, then jump. That's the thornmole dance.",
      decline: 'I understand. The cold makes everyone a little tired.',
      done: 'Two moonberry tarts. I traded a very confused bard for them.',
    },
  },

  // ---- personal quests (TODO 33): a villager only asks these of a real friend, once the `hearts` they need are
  //      earned (config/friendship.js; the gate is in src/gameplay/quests/Quests.js offerable) ----
  brambleStarChart: {
    giver: 'Old Bramble', title: 'The Star Chart', hearts: 5,
    steps: [
      { kind: 'collect', item: 'amethyst', count: 3, text: 'Mine 3 Amethysts for the chart' },
      { kind: 'deliver', to: 'Old Bramble', item: 'amethyst', count: 3, text: 'Bring the amethysts to Old Bramble',
        say: 'Set one here, one here, and the last one... there. Look up, {hero}. That is where I was born.' },
    ],
    reward: { coins: 120, xp: 150, items: [['amethystBand', 1]] },
    text: {
      offer: 'I have never shown anyone this. There is a chart I have been finishing for sixty years, and it wants three amethysts. Will you help me finish it?',
      accept: 'Clear stones, mind. The copper veins on Lanternmoss give the best ones.',
      decline: 'Of course. It has waited sixty years. It can wait for a Tuesday.',
      done: 'Take the band. It was the first thing I ever enchanted, and I would rather it went travelling than sat in a drawer.',
    },
  },
  pimsHarvestTable: {
    giver: 'Pim', title: 'The Long Table', hearts: 5,
    steps: [
      { kind: 'collect', item: 'pumpkin', count: 3, text: 'Grow or gather 3 Pumpkins' },
      { kind: 'collect', item: 'sunWheat', count: 4, text: 'Gather 4 Sun Wheat' },
      { kind: 'deliver', to: 'Pim', item: 'pumpkin', count: 3, text: 'Bring the pumpkins to Pim',
        say: 'Oh, they are beauties. Right. Everyone eats tonight, and nobody eats standing up.' },
    ],
    reward: { coins: 110, xp: 140, items: [['pumpkinPie', 2], ['honeyBun', 3]] },
    text: {
      offer: 'I want to put the long table out in the square and feed the whole village, like we used to. Three pumpkins and four sun wheat, and I will do the rest?',
      accept: 'Bless you. I will start the ovens now, which is optimistic of me.',
      decline: 'No rush, love. The table has been in the barn nine years. One more week will not hurt it.',
      done: 'Look at them all out there. Take the pie home, {hero}. You have earned the first slice twice over.',
    },
  },
  liosLostVerse: {
    giver: 'Lio', title: 'The Lost Verse', hearts: 5,
    steps: [
      { kind: 'collect', item: 'moonberry', count: 4, text: 'Pick 4 Moonberries for the ink' },
      { kind: 'deliver', to: 'Lio', item: 'moonberry', count: 4, text: 'Bring the moonberries to Lio',
        say: 'Moonberry ink. The only thing that will hold the last verse. Watch. There. Finished at last.' },
      { kind: 'talk', to: 'Fern', text: 'Ask Fern to come and hear the finished song',
        say: 'He finished it? After all this time? Oh, tell him I am coming. Tell him I am running.' },
    ],
    reward: { coins: 100, xp: 130, items: [['moonberryTart', 2]] },
    text: {
      offer: 'There is a song I have never finished. One verse short, for eleven years. I think I could finish it now, if you brought me moonberries for the ink.',
      accept: 'Four should do. They grow where the moss glows brightest.',
      decline: 'Eleven years, {hero}. What is a few more days between friends?',
      done: 'It is finished. It was always about this place, you know. It just took me eleven years to notice.',
    },
  },
  fernsQuietGrove: {
    giver: 'Fern', title: 'The Quiet Grove', hearts: 5,
    steps: [
      { kind: 'collect', item: 'sweetleaf', count: 5, text: 'Gather 5 Sweetleaf for the grove' },
      { kind: 'deliver', to: 'Fern', item: 'sweetleaf', count: 5, text: 'Bring the sweetleaf to Fern',
        say: 'Here, and here, and one by the water. There. Something will grow here now, and it will be ours.' },
    ],
    reward: { coins: 90, xp: 130, items: [['flowerCrown', 1], ['sweetleaf', 3]] },
    text: {
      offer: 'There is a bare patch past the pond that nobody visits. I would like to make it somewhere worth sitting. Will you help me plant it?',
      accept: 'Five sweetleaf, picked gently. They remember being pulled.',
      decline: 'The patch is patient. So am I. Mostly.',
      done: 'Sit with me a moment. This is the first thing I have planted that somebody else helped with.',
    },
  },
  cindersCommission: {
    giver: 'Cinder', title: "The Smith's Own Work", hearts: 5, planet: 1,
    steps: [
      { kind: 'collect', item: 'fireOpal', count: 2, text: 'Find 2 Fire Opals' },
      { kind: 'deliver', to: 'Cinder', item: 'fireOpal', count: 2, text: 'Bring the opals to Cinder',
        say: 'Right. Out of my forge, you. Come back at dusk and do not knock.' },
    ],
    reward: { coins: 140, xp: 160, items: [['opalBrooch', 1]] },
    text: {
      offer: "Thirty years of other people's swords, {hero}. I want to make one thing for myself, and it needs two fire opals. Will you find them?",
      accept: 'Deep veins, under the slopes. An iron pick, nothing softer.',
      decline: 'Thirty years. I can wait a week without crying about it.',
      done: 'I made two. One for the shelf, one for you. Do not argue with a smith about a gift.',
    },
  },
  tuvasThaw: {
    giver: 'Tuva', title: 'The Thaw Lanterns', hearts: 5, planet: 2,
    steps: [
      { kind: 'collect', item: 'frostDiamond', count: 2, text: 'Find 2 Frost Diamonds' },
      { kind: 'deliver', to: 'Tuva', item: 'frostDiamond', count: 2, text: 'Bring the diamonds to Tuva',
        say: 'Two lights for the pass. Nobody freezes between those posts now. Nobody else, I mean.' },
    ],
    reward: { coins: 130, xp: 160, items: [['diamondCharm', 1]] },
    text: {
      offer: 'I lost someone on the pass, a long time ago, between two posts with no light on them. I want to set lanterns there. Two frost diamonds, and it is done. Will you?',
      accept: 'They sit deep, in the blue ice. Take your time and keep warm.',
      decline: 'It has been dark a long while. A little longer will not change it.',
      done: 'There. Lit, and they will stay lit. Thank you for not asking me anything about it.',
    },
  },
  marlosCharts: {
    giver: 'Marlo', title: "The Keeper's Charts", hearts: 5, planet: 'tidewhisper',
    steps: [
      { kind: 'collect', item: 'pearl', count: 3, text: 'Dive for 3 Pearls' },
      { kind: 'deliver', to: 'Marlo', item: 'pearl', count: 3, text: 'Bring the pearls to Marlo',
        say: 'Three pearls, three safe channels weighted down and marked. Any boat that reads this gets home. That is the whole job, really.' },
    ],
    reward: { coins: 150, xp: 170, items: [['tidePendant', 1]] },
    text: {
      offer: 'I have been charting the safe channels for twenty years and never finished it. Three pearls to weight the corners, and it goes on the wall for good. Help me finish?',
      accept: 'Clams, in the shallows at low water. Mind the shellbacks.',
      decline: 'Twenty years, {hero}. The sea is in no hurry and neither am I.',
      done: 'It is done, and written down where it outlasts me. Take the pendant: the light goes with you now.',
    },
  },
};
