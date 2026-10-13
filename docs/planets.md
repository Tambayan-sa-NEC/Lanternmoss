# Planet catalog and release rules

World content lives in `src/config/planets/<id>.js`. `src/config/planets.js` imports those files in campaign order and
exports three views:

| View | Includes | Used for |
| --- | --- | --- |
| `PLANET_CATALOG` | Released worlds and unfinished metadata | Release order and future-world development |
| `PLANETS` | Only entries with `released: true` | Generation, runtime indices, destinations and saved planet ids |
| `CAMPAIGN_PLANETS` | Released non-secret worlds | Main-adventure completion |

Each entry has a stable `id`, `name`, positive `act`, and explicit boolean `released` and `secret` fields. The starting
world must be released and non-secret. Released entries also need generation data; full content acceptance is the next
groundwork stage, TODO 26d. Keep a new world unreleased until its own release stage passes that checklist. Tidewhisper,
Duskhollow and the Lantern Moon currently contain only unfinished metadata and cannot be selected or generated.

The original runtime order remains Lanternmoss, Emberfall, Frostveil. Their seeds, placement lists and generated
resource/chest/scenery/farm/house/portal/boss positions are unchanged. A simulation checks them against layout digests
captured before this extraction. Numeric runtime indices remain supported, but saved state and world-specific content
use ids. Version-1 saves retain their format; unreleased/unknown destination ids and deltas are discarded, and an unknown
current destination falls back to Lanternmoss.

Normal boss wins open the immediate next main world. A Wayfarer's Key can still open the next locked released world
one way, or the route home; it cannot skip an unreleased main-world entry. Unfinished worlds are absent from the title
and destination picker. Direct transition/load calls also refuse unreleased entries before changing world state.

A released entry may declare a registered `mechanic` id. Unknown modules disable that destination and direct
loads refuse it before replacing the current world. Mechanic state loads before entry and population, is saved
independently per planet, and receives separate frame/skip/away hooks. See [the mechanic contract](mechanics.md).
The original worlds declare no mechanic; actual expansion modules remain later-stage work.

A released secret world needs an explicit `unlock` gate, for example:

```js
unlock: { bosses: ['duskhollow'], night: true, rareGifts: ['requiredGiftId'] }
```

All listed bosses and adventure rare gifts must be present; `night: true` also requires night. A missing gate stays
locked. Keys never substitute for these conditions. Until the gate passes the picker masks the world as `?`; after its
own boss is beaten, return access stays open. Continue may restore a valid released-world save without rechecking the
arrival time of day. A trip accepted at night keeps a transient authorization through its fade, so dawn cannot strand
the hero midway; that authorization is consumed on arrival. The Moon remains unreleased with no active gate; its actual five-friendship unlock and persistent
discovery behavior belong to TODO 32. Secrets do not block main-campaign completion or become the next ordinary key trip.

The original `allBosses` achievement keeps its id and rewards and requires the three named Act I bosses, so adding a
world cannot raise its goal or substitute a different boss. The level cap, Act II title treatment and new achievements
remain TODO 26d work.

Planet-specific villagers and interiors are also config:

- `npcs.locals` contains each local's name, appearance key, home house index, placement/schedule, animation key and
  dialogue. Runtime appearance/animation registries live in `entities/npc/npcDefs.js`; new looks need a builder there.
- Local positions use a `square` anchor with angle/distance, or a `stones` anchor with distance. Homes are explicit,
  so reordering campaign entries does not move Cinder or Tuva into the wrong house.
- `npcs.arrivals` maps traveler names to `{ t, e? }`. Only the original Emberfall/Frostveil entries use `legacy: true`
  to preserve their existing numeric dialogue slots; later-world reactions append after the original base dialogue.
- `houses` overrides shared house definitions by house index. `null` disables an entry; `resolveHouse` accepts a
  planet id or its runtime index. Local dialogue saves accept configured names and matching `<planetId>:<name>` keys,
  plus the old unqualified names for compatibility.

Regular worlds retain the growing-roster rule. A deliberately small secret world can declare
`population: { min: 3 }` instead. Its roster must meet that positive integer minimum; ordinary worlds cannot use the
override. This changes only the population check, not the required original enemy behaviors or full content checklist.

Verify with `npm test`, `npm run sim` and `node scripts/planet-catalog-smoke.mjs`. The browser helper owns its temporary
server on port 8103 and closes its browser/server on exit; it checks real key travel, local homes, restored dialogue,
version-1 Continue and 720p/1080p layouts on the lowest graphics preset.
