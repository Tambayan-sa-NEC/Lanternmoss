/* GEAR SETS (TODO 28a): wearing two or three different pieces of one world's set adds a bonus on top of the pieces'
   own stats. Pure rules: src/items/sets.js; the effects run in combat/damage.js (hits), entities/enemies/Enemy.js (the
   burn), gameplay/itemUse.js + combat/damage.js (healing) and gameplay/Needs.js (swimming). Shown on the bag's
   equipment side and in each piece's tooltip.
     name      shown in the bag and tooltips
     color     the bonus line's tint in the bag
     pieces    item ids in the set; only distinct ids count (two of the same piece count once), and only pieces the
               hero can wear (every set piece is any-hero armour, head, feet or trinket)
     bonuses   [{ at, text, effects }]: active once `at` pieces are worn. A higher tier's effects replace the lower
               tier's for the same key, so each tier lists its full values.
   effects (several sets' effects combine: numbers add, burn / chill keep the stronger):
     healing     share added to all healing: food and potions, health regeneration and Mend (0.15 = +15%)
     burn        { share, time }: every hit of the hero's own sets the monster burning for `time` seconds, dealing
                 `share` of that hit over the burn (a hit at least as strong refreshes it; a weaker one leaves the stronger
                 burn to run out, so a big hit cannot be kept burning by small ones)
     chill       { slow, time }: every hit of the hero's own slows the monster by `slow` for `time` seconds
                 (monsters' slowResist applies; it never weakens a stronger slow already on them)
     swimEnergy  share cut from the energy swimming costs (0.5 = half)
     knock       extra knockback on every hit of the hero's own (bosses and heavy monsters resist it as usual)
     lanternOil  share cut from how fast a belt lantern burns oil (0.4 = it lasts two thirds longer); Duskhollow only
     lanternRadius  share added to a lit lantern's reach (0.15 = +15%); both are applied in
                 src/world/mechanics/lantern.js, so they follow the worn set like every other stat */
export const SETS = {
  moss: {
    name: 'Moss set', color: '#8fd07a', pieces: ['mossHood', 'mossCloak', 'wanderBoots'],
    bonuses: [
      { at: 2, text: 'Healing +15%', effects: { healing: 0.15 } },
      { at: 3, text: 'Healing +30%', effects: { healing: 0.3 } },
    ],
  },
  ember: {
    name: 'Ember set', color: '#ff8a4a', pieces: ['emberHelm', 'emberMail', 'emberBoots'],
    bonuses: [
      { at: 2, text: 'Hits burn for 40% more over 3 s', effects: { burn: { share: 0.4, time: 3 } } },
      { at: 3, text: 'Hits burn for 70% more over 3 s', effects: { burn: { share: 0.7, time: 3 } } },
    ],
  },
  frost: {
    name: 'Frost set', color: '#9fd8ff', pieces: ['frostCirclet', 'frostMantle', 'snowstepBoots'],
    bonuses: [
      { at: 2, text: 'Hits chill: 20% slower for 1.5 s', effects: { chill: { slow: 0.2, time: 1.5 } } },
      { at: 3, text: 'Hits chill: 35% slower for 2 s', effects: { chill: { slow: 0.35, time: 2 } } },
    ],
  },
  dusk: {
    name: 'Dusk set', color: '#bfa8ff', pieces: ['duskHood', 'duskMantle', 'duskBoots', 'duskLantern'],
    bonuses: [
      { at: 2, text: 'Your lantern burns 40% slower', effects: { lanternOil: 0.4 } },
      { at: 3, text: 'Your lantern burns 60% slower and reaches 15% further', effects: { lanternOil: 0.6, lanternRadius: 0.15 } },
    ],
  },
  tide: {
    name: 'Tide set', color: '#70dfd7', pieces: ['tideCirclet', 'tideMantle', 'tideBoots', 'tidePendant'],
    bonuses: [
      { at: 2, text: 'Swimming costs half the energy', effects: { swimEnergy: 0.5 } },
      { at: 3, text: 'Breaker: hits also push monsters back', effects: { swimEnergy: 0.5, knock: 2.5 } },
    ],
  },
};

/** Burning damage lands in ticks this far apart (seconds). */
export const BURN_TICK = 0.5;
