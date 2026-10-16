# Cooking, brewing and enchanting

Open the bag with **I** or **Tab**. **Craft** filters recipes by station; **Enchant** applies runes to combat gear.
Stand near a village station to use it. Existing recipes, first tools and quest recipes are available immediately.

**Craft x5** makes five complete recipe batches. **Smelt all** makes the largest batch of the selected smelting
recipe that your materials, fuel, coins and bag can support, including charcoal. The displayed number is the output
quantity. Fuel is pooled across the batch; the last fuel piece may supply more heat than needed. Ingredients are
removed before fuel is counted, so the same wood or ember shard cannot pay both costs. Crafted charcoal is not
reused within the same batch. If the complete output does not fit, nothing is spent. Star a known recipe to pin it
above other recipes in the current filter. Favourites and recipe knowledge travel with your adventure.

## Discoveries

Read a bookshelf in any village house to learn the next local book recipe. Repeat to learn the remaining notes.
Chests add one unread local recipe scroll, skipping recipes already learned and scrolls already in your bag or on
that planet's ground. Pick up a scroll and **Use** it; duplicate learned scrolls stay in your bag. For rune recipes,
defeat the corresponding monster, then open its **Journal → Bestiary** page and choose **Learn recipe**. The journal
records defeated monsters across adventures, while learned recipes belong to the current adventure. The Craft tab
shows each locked recipe's source. Villager lessons remain part of the future friendship feature (TODO 33).

| Source | Recipe | Station |
| --- | --- | --- |
| Lanternmoss bookshelf | Perch Chowder; Infused Moon-Hop Charm | Cooking Pot; Brewing Stand |
| Emberfall bookshelf | Ember Pepper Broth | Cooking Pot |
| Frostveil bookshelf | Glacial Plum Soup; Infused Feather-Step Charm | Cooking Pot; Brewing Stand |
| Lanternmoss chest scrolls | Golden Harvest Banquet; Restorative Elixir | Cooking Pot; Brewing Stand |
| Emberfall chest scroll | Emberheart Tonic | Brewing Stand |
| Frostveil chest scroll | Glacial Guard Tonic | Brewing Stand |
| Ogre bestiary page | Moss Rune | Forge |
| Ramhorn bestiary page | Ember Rune | Forge |
| Hexlantern bestiary page | Frost Rune | Forge |

## Meals and brewing

Each world's fish combine with crops to make a hearty meal. Golden koi, pumpkin, wheat and herbs make the rare
Golden Harvest Banquet. A meal may restore health, energy or your hero's resource, and grants **one meal buff**.
Eating another buff meal replaces the previous meal effect. Potion and pet timers stay independent. If a potion
and meal grant the same effect, the effect uses the longer remaining duration; its power is applied only once.
Existing Pumpkin Pie, Veggie Stew, Ember Skewer, Plum Porridge and Koi Feast follow this rule too.

At the brewing stand, **Spring Water** uses one wood for a filled wooden flask. Advanced tonics combine these
flasks with sweetleaf and rare gems or planet materials. Restorative Elixir restores 120 HP and 90 resource;
Emberheart grants Mighty for 120 seconds; Glacial Guard grants Stoneskin for 180 seconds. Infusing a Moon-Hop or
Feather-Step charm with a rune and water extends its effect from 30 to 90 seconds. Ordinary recipes retain their
original costs.

## One rune per piece

Craft runes at the forge using one material and one gem from their world, then open **Enchant** and choose a bag
or worn weapon, armour piece or trinket. Applying a rune costs one rune. Applying a different rune replaces the
previous enchantment; the previous rune is not returned. Reapplying the same rune spends nothing. Vanity gear and
another hero's weapons cannot be enchanted. Rarity stays the same.

| Rune | Ingredients | Fixed bonus |
| --- | --- | --- |
| Moss | 3 Glowcaps + 1 Amethyst | +12 maximum HP, +0.5 HP regeneration |
| Ember | 3 Ember Shards + 1 Fire Opal | +4% damage |
| Frost | 3 Frost Petals + 1 Frost Diamond | +12 maximum resource, +0.5 resource regeneration |

Bonuses add after rarity scaling and remain subject to the existing gear stat caps. Gear details show the current
rune. Enchantments survive equipping, dropping, travel, saving and importing. There are no rarity upgrades.

Checks: `npm test`, `npm run sim -- crafting`, and `node scripts/crafting-smoke.mjs` for actual browser clicks,
720p/1080p layout, enchanting and reload persistence. The browser script needs optional `puppeteer-core` and Edge
(or set `CHROME` to another Chromium executable).
