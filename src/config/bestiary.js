/* ---------------------------------------------------------------------
   BESTIARY: the journal's page for every monster and boss (screen: src/ui/JournalUI.js). Numbers (health, damage,
   speed, XP) come from COMBAT.enemies and where they live from the planets' rosters (config/planets.js); this file
   holds the words: what it is, how it attacks and how to beat it.
     name      the page title (bosses use their own `name` from COMBAT.enemies)
     blurb     a line or two about it
     attacks   [name, what it does]
     counters  tips for beating it
     from      where it comes from, for monsters no planet's roster lists (a slimeling)
     lore      bosses: their story (the page also lists what wakes them, from PLANETS[i].boss.summon)
   Keys must match COMBAT.enemies; `npm test` checks every monster has a page.
   --------------------------------------------------------------------- */

export const BESTIARY_ENTRIES = {
  goblin: {
    name: 'Goblin', blurb: 'Quick, cheeky raiders that come in gangs. They dart in, stab and dart out again.',
    attacks: [['Lunge', 'A quick wind-up, then a leaping stab.'], ['Hit and run', 'Backs off after each hit, and flees when badly hurt.']],
    counters: ['Strike as it lands its lunge, then chase it down before it recovers.', 'Areas (Frost Nova, Whirlwind) catch a whole gang at once.'],
  },
  ogre: {
    name: 'Ogre', blurb: 'Slow, huge and very sturdy. Shrugs off knockback and most slows.',
    attacks: [['Ground slam', 'A long wind-up with a red warning circle, then a slam that sends you flying.']],
    counters: ['Step out of the red circle, then punish the long recovery.', 'Stay behind it: it turns slowly while winding up.'],
  },
  wisp: {
    name: 'Wisp', blurb: 'A floating spark that keeps its distance and pelts you from afar.',
    attacks: [['Homing orb', 'A slow orb that curves after you.']],
    counters: ['Sidestep late: the orb turns, but not sharply.', 'Close in fast (Blink, Dash, Leap): it has little health.'],
  },
  slime: {
    name: 'Slime', blurb: 'A bouncy blob that lives by the ponds. Hurts to touch.',
    attacks: [['Body slam', 'Hops at you; touching it hurts.'], ['Split', 'Bursts into two slimelings when defeated.']],
    counters: ['Fight from range, and keep moving between its hops.', 'Save an area attack for the slimelings it leaves behind.'],
  },
  slimeling: {
    name: 'Slimeling', blurb: 'A little piece of slime, quicker and jumpier than the whole.', from: 'Splits off a defeated slime.',
    attacks: [['Nip', 'Quick hops; touching it hurts a little.']],
    counters: ['One or two hits each: sweep them up together.'],
  },
  puffcap: {
    name: 'Puffcap', blurb: 'A walking mushroom with a short fuse. It runs right at you, then pops.',
    attacks: [['Spore blast', 'Lights its fuse when close (a warning circle), then explodes for heavy damage.']],
    counters: ['Back away once the fuse is lit: the blast only reaches 3m.', 'Hit it from range before it arrives.', 'A stagger snuffs the fuse.'],
  },
  ramhorn: {
    name: 'Ramhorn', blurb: 'A stubborn ram that charges in straight lines and doesn\'t look where it\'s going.',
    attacks: [['Charge', 'Paws the ground, then charges far and fast, knocking you flat.']],
    counters: ['Sidestep the charge at the last moment.', 'Stand in front of a tree or rock: if it crashes, it\'s dazed and takes +50% damage.'],
  },
  thornmole: {
    name: 'Thornmole', blurb: 'Digs under the ground and bursts up beneath you in a spray of thorns.',
    attacks: [['Eruption', 'Burrows toward you (you can\'t hit it), then erupts under a warning circle.']],
    counters: ['Keep moving when it digs, and leave the circle.', 'It stays exposed for a moment after erupting: hit it then.'],
  },
  hexlantern: {
    name: 'Hexlantern', blurb: 'A floating lantern that keeps other monsters fighting.',
    attacks: [['Mending light', 'Heals hurt monsters near it.'], ['Ward', 'Shields an ally, halving the damage it takes.']],
    counters: ['Defeat it first: everything else gets easier.', 'It hangs back, so reach it with ranged attacks or a dash.'],
  },
  hydra: {
    lore: 'Old Bramble swears the lake hydra was a single, harmless eel until somebody tried to chop it in half. '
      + 'Now it guards the deep water, and a warm, speckled egg it will not explain.',
    blurb: 'A mini boss: a heavy, many-headed serpent that keeps to its lake. It grows a new head at two-thirds and one-third of its health.',
    attacks: [['Bite', 'One head rears back over a wedge in front of it, then snaps.'], ['Acid spit', 'Every head spits a glob that curves after you; more heads, more globs.'],
      ['Sweep', 'With four heads or more, they all rear and sweep a wide arc in front.']],
    counters: ['Stay beside or behind it: the bites and the sweep only reach forward.', 'Close in when it spits, back off when the wedge appears.', 'Hit it hard early: every new head means more acid.'],
  },
  basilisk: {
    lore: 'Travellers in Emberfall leave little stone statues by the road. Most of them used to be travellers. '
      + 'The basilisk does not hunt so much as it waits for somebody to look at it.',
    blurb: 'A mini boss: a quick serpent-lizard roaming the far wilds. Its gaze turns anyone looking at it to stone.',
    attacks: [['Petrifying gaze', 'Its eyes blaze brighter and brighter, then flare: if you are facing it, you are turned to stone for a moment.'],
      ['Tail whip', 'A spin through the marked circle around it.'], ['Lunge', 'It marks a lane and darts along it, jaws first.'], ['Venom', 'Once enraged: a fan of venom.']],
    counters: ['When its eyes blaze, turn your back: run away from it until they flare, then turn and strike.', 'Jump over the tail whip.', 'Sidestep the lunge, then punish it while it recovers.'],
  },
  gloomcap: {
    lore: 'Once the gentlest mushroom of the old woods, it drank the gloom that pooled under the lanterns until it grew a crown of it. '
      + 'The villagers sealed its glade with three thorn stones, and it has been sulking behind them ever since.',
    blurb: 'The Moss King of Lanternmoss, grown huge and gloomy in the shade of the old woods. Faster and angrier as it weakens.',
    attacks: [['Slam', 'A ground slam with a warning circle.'], ['Charge', 'Rushes in a straight line; a crash leaves it dazed.'],
      ['Spore volley', 'A fan of homing spores.'], ['Shockwave', 'A ring that rolls outward (from 60% health).'], ['Summon', 'Calls slimelings and wisps to help (from 60% health).']],
    counters: ['Jump over the shockwave ring.', 'Bait the charge into a tree or rock, then hit it while it\'s dazed.', 'Clear the summons quickly with an area attack.'],
  },
  pyrrhax: {
    lore: 'Pyrrhax hatched in Emberfall\'s first eruption and has been counting its hoard ever since. Its elites carry ember sigils: '
      + 'bring three to the lair and it comes to see who dares, because a dragon never ignores a knock on its door.',
    blurb: 'The Red Wyrm of Emberfall, guarding its hoard among the mesas. At half health it becomes an Inferno.',
    attacks: [['Bite', 'A quick snap in front of it.'], ['Tail sweep', 'A spin all around it.'], ['Fire breath', 'A long cone of fire that sweeps across.'],
      ['Fireballs', 'Lobbed fireballs that leave burning pools.'], ['Leap', 'Leaps high and crashes down where you stood.']],
    counters: ['Jump over the tail sweep.', 'Get behind or beside it for the breath: it sweeps, so keep going round.', 'Keep moving when it leaps; punish the landing.'],
  },
  malgrath: {
    lore: 'A fallen star-lord who froze Frostveil to keep its warmth for himself. He hides from friendship like other monsters hide from fire, '
      + 'so he only answers a hero the village trusts, and only under the stars.',
    blurb: 'The Winged Demon Lord of Frostveil, the last and strongest boss. Fights on foot, then takes to the air at half health.',
    attacks: [['Greatsword combo', 'Two wide swings and a slam.'], ['Fissure', 'A crack racing along the ground.'], ['Hellfire', 'Pillars of fire around you.'],
      ['Doom', 'A huge circle that kills outright: leave it!'], ['Dive', 'Swoops down onto you from the sky.'], ['Barrage', 'Waves of homing bolts.'],
      ['Meteor rain', 'Fire falls across the arena.'], ['Strafe', 'A burning run across the ground.']],
    counters: ['Doom is one-hit: always leave its circle, whatever else is happening.', 'He is grounded for a moment after each dive: that\'s your window.', 'Keep your dodge for Fissure and Strafe: they\'re fast.'],
  },
};

/** What a page says it drops (the rolls themselves live in config/chests.js). */
export const BESTIARY_DROPS = {
  monster: 'Sometimes: moonberries, the planet\'s crafting material, food, tonics or a piece of gear. Now and then a Lantern Key.',
  boss: 'Its treasure chest: the planet\'s crown, rare or legendary gear, coins and more.',
  miniBoss: 'Always: a rare haul of coins and items where it falls (the Hydra also guards a dragontoad egg).',
};
