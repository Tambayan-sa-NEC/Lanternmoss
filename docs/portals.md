# Village lantern gates

Press the interact key (default **E**) beside the lantern gate at the village square’s edge. The destination
picker pauses the adventure. Choose a destination, or close it with **Esc**. Each reachable world lights one
lantern in its world colour. The compass marks the gate and points back to it after a boss win.

A boss win opens its world and the next campaign world for free travel. Winning or opening treasure no longer
starts a trip. Unopened treasure and uncollected loot remain on the original world, including when the bag is full.
The existing arrival heal still applies. Portal travel uses the warp sound and an input-locked fade in both directions.

A **Wayfarer’s Key** opens the next locked campaign world for a **one-way** trip. The destination picker says
that the return route will cost another key until that destination’s boss falls. A key is consumed only when a valid
destination is chosen at the gate. Cancelling, choosing the current world, attempting a distant locked world or
having no key costs nothing. Spending a second key opens the way back to an unlocked world; revisiting the still
locked world costs a key again. Defeating its boss opens its routes permanently for this adventure.

An actual locked **Lantern chest** has a **4%** chance to contain a Wayfarer’s Key. A **no-hit boss win** also earns
one, once per planet per adventure; a recorded fight must exist and the hero must take no hits. This reward is
independent of lifetime achievement rewards. Saving and continuing a fight preserves whether the hero has been
hit, so reloading cannot turn a damaged fight into a no-hit key reward. Mini boss loot sharing the rare loot table
does not roll travel keys. Ordinary Lantern Keys still only open locked chests.

## State between visits

| State | Return visit |
| --- | --- |
| World bosses and defeated mini bosses | Stay beaten; no reward replay. Harder rematches belong to TODO 31. |
| Ordinary monsters | Respawn from the roster. Kill history remains in the lifetime journal. |
| Outdoor and indoor chests | Opened lids stay open; boss treasure and ground pickups remain collectible. |
| Resource nodes, trees and rocks | Rest timers decrease by unpaused adventure time spent away; no offline growth. |
| Farm plots and crops | Retain tilled/planted/growth state; crops keep existing active-world growth and daily watering rules. |
| Travelling villagers and companions | Follow the hero, retaining adventure progress. |
| Cinder and Tuva | Remain on Emberfall and Frostveil; local story memory and unfinished quests wait for a return. |

The existing house/lore/oven state remains keyed by stable planet and house IDs. Local dialogue memory now uses
planet/name keys, with a fallback for older v1 saves. Quests no longer drop or skip unavailable earlier-world steps;
local hand-ins outside the current world show the destination to return to and have no misleading compass target.
Building is added in TODO 25; the per-planet save registry is ready for its future state owner.

## Save contract and checks

Save version **1** remains readable. Portal restrictions, one-time key rewards and fight eligibility are adventure
state. Each planet keeps seed-relative chest lid IDs and resource cooldown IDs; their generated geometry, scenery,
normal roster and unused nodes are omitted. Only the boss chest needs a saved location. Existing ground pickup
stacks and plot state stay as small gameplay snapshots, independent of meshes. Legacy full node/chest snapshots
still load. World camp offsets now use the world seed, so play randomness cannot move regenerated resource sites.

An arrival autosaves its destination. Saving/exporting during departure is refused, preserving the last complete
snapshot rather than mixing the origin with spent keys and destination restrictions. A fresh adventure clears all
world and portal progress. Device settings and the lifetime journal remain separate.

Run `npm test` and `npm run sim`; `npm run sim -- portals chests villagers save` focuses on travel and persistence.
Optional real browser verification: `node scripts/portals-smoke.mjs` (locally installed `puppeteer-core`, Edge or
`CHROME` pointing at Chromium). It checks actual E interaction, destination buttons, focus, Escape, key consumption,
reload restrictions, all three heroes, locals, 720p/1080p layout and browser errors.
