/* ---------------------------------------------------------------------
   QUESTS: multi-step favours villagers ask for (runtime: src/gameplay/quests/Quests.js). Unlike challenges (one timed
   activity), a quest is a list of steps done at your own pace, possibly across planets.
     giver     NPC name (npcDefs.js)          planet  offered from this planet index on (default 0)
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
};
