# Pets

`config/pets.js` defines every pet: its body (`fly`: owl, wisp, dragon whelp; `walk`: wolf, fox, otter), attack, ability,
health and how it's unlocked. `gameplay/Pets.js` owns what outlives one pet body (bodies are rebuilt after travel, a
house or a swap): which pets are unlocked and which one is out, names, the command, health and fainting, the ability
cooldown, and which pet each hero last took (`gameplay/petPicks.js`, in localStorage). Bodies (`entities/companions/`) ask it what to do; `petBrain.js` picks targets by command and lands hits
(`source: 'pet'`, which also earns XP). Pet level = hero level. Unlocks listen on `core/events.js` (`questcomplete`,
`chestopened`), so quests and chests don't know pets exist. Pets are chosen on the pet step of character select and in
the pet menu (`ui/PetMenu.js`, which pauses the world; bodies then idle through `pose(dt)`); both screens share
`ui/petViews.js`, and `Pets.presenting` brings the pet round in front of the hero for the camera. A new pet = an entry in `PETS`, a model (a critter look or
a flyer builder), an ability handler in `gameplay/petAbilities.js` and two glyphs in `ui/icons.js`; `npm test` checks
all of that is in place.

The Tidewhisper otter unlocks when The Dark Lighthouse is completed. **Pearl Dive** (`V`) works beside a submerged,
ready clam bed in Tidewhisper: the otter dives, spends that bed and brings back one pearl. Its 90-second cooldown and
two successful dives per in-game day cap the extra yield. A dry, spent or out-of-range bed gives no pearl and spends
no cooldown. The daily count and cooldown survive Continue and travel; a new day renews the count. Tidewhisper and
its otter remain unavailable in normal play while the world is unreleased. Candidate tests expose both without
changing the release flag.
