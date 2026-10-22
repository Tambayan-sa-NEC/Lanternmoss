/* ---------------------------------------------------------------------
   BESTIARY: the journal's page for every monster and boss (screen: src/ui/JournalUI.js). Numbers (health, damage,
   speed, XP) come from COMBAT.enemies and where they live from the planets' rosters (config/planets.js); this file
   holds the words: what it is, how it attacks and how to beat it.
     name      the page title (bosses use their own `name` from COMBAT.enemies)
     blurb     a line or two about it
     attacks   [name, what it does]
     counters  tips for beating it
     from      where it comes from, for monsters no planet's roster lists (a slimeling)
     drops     optional: what it leaves besides the usual monster drops (config/chests.js MONSTER_DROPS.extra)
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
  shellback: {
    name: 'Shellback', blurb: 'A broad crab behind a barnacled front plate. It scuttles sideways and always turns that plate your way, slowly.',
    attacks: [['Pinch', 'Raises both claws over a warning circle in front of it, then snaps them shut.']],
    counters: ['Hits from the front glance off the plate: circle round it faster than it can turn.', 'After a pinch it can\'t turn for a moment: that\'s your chance to get behind it.',
      'A dazed Shellback forgets its plate, and a blow landing right on top of it goes past it.'],
    drops: 'Often a shell or two as well.',
  },
  jellybell: {
    name: 'Jellybell', blurb: 'A glowing jellyfish that drifts wherever the tide takes it: up onto the flats as the sea rises, back out as it falls.',
    attacks: [['Stinging ring', 'Swells and glows, then pulses a ring of stings across the water around it.']],
    counters: ['Step out of the ring or jump over it while it swells.', 'It can\'t leave the water: fight it from the shore.',
      'Left high and dry by the tide, it can only flop back toward the sea, and can\'t sting.'],
    drops: 'Sometimes a piece of seaglass as well.',
  },
  surfSkipper: {
    name: 'Surf skipper', blurb: 'A mudskipper raider that lurks in the surf with only its sail fin showing, then leaps out at anyone near the water.',
    attacks: [['Ambush leap', 'Surfaces, marks a lane and leaps along it, jaws first.']],
    counters: ['Under deep water nothing can hit it: wait for it to come to you.', 'Sidestep the leap, then punish it on the beach before it scurries back.',
      'Stand well back from the water and it has to show itself in the shallows first.', 'Stagger it as it surfaces and it flounders in the shallows, open to everything.'],
    drops: 'Sometimes a silver sprat as well.',
  },
  shadeling: {
    name: 'Shadeling', blurb: 'A shape that is only a shadow until your light catches it. Out in the dusk it slides over the ground after you; it cannot be touched there, and it cannot touch you either.',
    attacks: [['Clawing dark', 'Rears up and strikes - but only where it is standing in light.']],
    counters: ['It is solid only in light. Keep it inside your lantern, or fight it where a waylamp or moonwell burns.',
      'A sudden light drives it off: relight a lamp beside it, or pour oil into an empty lantern.',
      'Fire sends it fleeing too, so a Fireball or a burning set clears a path.',
      'If your lantern runs dry it cannot hurt you, but you cannot hurt it either: refill and try again.'],
    drops: 'Often a pinch of lumen dust as well.',
  },
  mosslurk: {
    name: 'Mosslurk', blurb: 'A cluster of glowcaps with teeth. It sits among the real ones, perfectly still, and waits for someone to reach for it.',
    attacks: [['Ambush', 'Springs when you pick it, or when you walk right over it, rearing up over a warning circle before the first bite.']],
    counters: ['It always shows its warning circle before biting: step back out of it.',
      'Count the caps. A real patch does not blink.', 'It is slow once sprung, so back away and fight it at range.'],
    drops: 'Often a few glowcaps as well - the ones it was wearing.',
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
  ironclaw: {
    lore: 'The bell hung in the old lighthouse until the night the Lantern Angler drew a ship onto the rocks and both went down. '
      + 'Ironclaw found it on the sea bed, crawled in, and has been carrying it about ever since. It hates being rung.',
    blurb: 'A mini boss: a giant hermit crab in a sunken bronze bell, guarding the black pearl beds on the far beach. The bell takes no damage at all.',
    attacks: [['Pinch', 'Rears its great claw over a wedge in front of it, then snaps.'], ['Charge', 'Marks a lane and barrels along it.'],
      ['Bell ring', 'Strike the bell and it rings out a stunning shockwave after a short glow.'], ['Toll', 'From its second shell: it rears and slams the bell down, sending a shockwave rolling out.']],
    counters: ['Jump over the shockwaves.', 'Hit its face, not the bell: tucked in its shell it only takes a little damage.',
      'At 66% and 33% it crawls out to swap shells: that\'s your window, from any side.', 'At low tide, bait a charge across the wet sand: it gets stuck, soft and open. It only falls for it once per shell.'],
    drops: 'Two black pearls, and the pearl beds it guards are yours to gather.',
  },
  mirelure: {
    lore: "Ships once steered by the lighthouse at Tidewhisper. Then a second light began to glow in the lagoon, softer and nearer, "
      + "and the ships turned toward it. Mirelure has hidden in the deep ever since Marlo's lamp went dark, and she does not like it lit again.",
    blurb: 'The Lantern Angler of Tidewhisper, hiding in the lagoon with only her lantern lures showing. At half health she smashes the sluice and is beached.',
    attacks: [['False lures', 'She lights several lures; strike a false one and it bursts in your face.'], ['Geyser', 'A warning circle under you, then a spout of water.'],
      ['Bite', 'Surfaced or beached: a snap over a wedge in front.'], ['Thrash', 'Beached: she flails, hitting all around her.'], ['Roll', 'Beached: she marks a lane and rolls along it.']],
    counters: ['Watch her breathing bubbles: the real lure dims in time with them. Strike it and she surfaces.', 'Step out of geyser circles.',
      'Once the lagoon drains, she is beached and open to everything: hit hard before the water creeps back.', 'Sidestep the roll and stay out of the thrash circle.'],
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
