# Lanternmoss visual upgrade plan

> **PLANNING ONLY — NOT FOR EXECUTION YET.**
> This document proposes a future visual update. Creating it does not authorize implementation,
> asset production or purchases, an engine migration, changes to the active roadmap, or a release.
> Every visual TODO below is proposed and unchecked. Activate only the agreed stages after a separate
> instruction to proceed. Existing authorized gameplay work continues under its own TODOs.

**Prepared:** 2026-10-13, Asia/Manila.<br>
**Target:** an original, rounded, expressive, tactile cozy style inspired by Animal Crossing: New Horizons.<br>
**Recommended starting point:** the existing Three.js browser game and repository.<br>
**Planning IDs:** `V01`–`V18`; these are independent of the numbered gameplay TODOs in [TODO.md](../../TODO.md).

## 1. Recommendation and timing

Use the completed **TODO 27a: Archipelago and tide loop** as the stable checkpoint before beginning
visual implementation. It was still active at the start of this review, then completed and merged during
documentation. If this plan is activated, establish the art direction, performance budgets and asset conventions,
and build one small playable village scene before committing to a full conversion.

**Do not wait for every remaining gameplay TODO to finish.** TODOs 27–42 include several complete worlds,
new encounters, caves, social systems, mobile support and multiplayer. Finishing all of them first would
mean creating many more models, effects and screens in the old style, then redoing them. Starting a full
visual replacement before that checkpoint would have competed with tide/terrain integration. The checkpoint
is now available, so planning/prototyping can be prioritized before 27b's larger asset batches if authorized.

The recommended compromise is a stable checkpoint followed by a bounded visual experiment:

1. Confirm the accepted 27a checkpoint and recheck repository status. Its completion does not release Tidewhisper.
2. Activate V01–V04 to agree the target, scope, measurements and production conventions.
3. Complete V05–V07 to make presentation replaceable and build the village prototype.
4. Pass the prototype gate before authoring large asset sets or changing the normal campaign presentation.
5. Upgrade the released three worlds incrementally through V08–V13 while preserving gameplay ownership.
6. Apply the proven style to Tidewhisper, caves, Duskhollow and the Moon through V14–V16 as their gameplay
   prerequisites become ready. Respect the existing content and release gates.
7. Complete final optimization and release acceptance through V17–V18 for an explicitly selected release scope.

This is a proposed sequencing change, not an edit to TODO.md. If a Tidewhisper release is the immediate
priority, finishing 27b–27h before the visual prototype is a valid alternative, with the acknowledged
cost of replacing more finished art later. Do not interrupt a feature midway to adopt this plan.

**Preserving the version you like:** [TODO 43: Classic release checkpoint](../../TODO.md#43-preserve-the-classic-version-before-a-visual-upgrade-core-checkpoint)
records a tagged release, restore-tested runnable archive, separate save backups and an optional side-by-side
worktree. If the chosen route is to finish the current track first, complete that checkpoint before starting the
visual overhaul. An earlier accepted milestone can also be preserved without finishing every optional TODO.
The checkpoint preserves the existing edition; adding it does not activate this visual plan or require a new project.

## 2. Current project and unfinished work

This snapshot is based on TODO.md, implementation notes, project logs and the working tree on 2026-10-13.
Recheck it at activation: an unchecked parent heading or an old suggested-addition entry alone is not
proof that a feature remains unfinished. Some completed parents retain historical headings.

| Existing work | Observed status | Implication for the visual update |
| --- | --- | --- |
| TODOs 1–18: core game, HUD, characters, environments and gameplay checks | Implemented; optional hero color/outfit variants remain open in TODO 4 | Reuse the playable foundation. Character variants are optional follow-up scope, not a prerequisite. |
| TODOs 19–23: saves, performance tooling, tutorial, crafting and balance | Implemented in their documented scope | Preserve old saves, tutorial cues and balance. TODO 20's performance target remains unvalidated on Iris Xe; its tooling is complete, its target is not certified. |
| TODOs 24–25c: portals, home, placeables and structures | Implemented | New house/furniture assets must fit existing interaction footprints, snapped construction and camera cutaways. |
| TODOs 26a–26d: catalog, mechanics, physics, progression and content gate | Implemented | Reuse planet IDs, mechanic ownership and unreleased-world guards. Do not replace this infrastructure with visual code. |
| TODO 27a: Tidewhisper terrain and tides | Completed during this review; feature `2864ffc` merged as `ce7c8aa`, with publication record `e7afab9` | Stable checkpoint is available. Its log records 199 unit tests, 33 simulations and 720p/1080p Low browser acceptance; these are 27a results, not visual-plan verification. Water appearance must consume the same live sea/lagoon queries as physics. |
| TODOs 27b–27h: Tidewhisper ecosystem, economy, village, roster, encounters and release | Pending | Agree the shared style before large bespoke asset production where practical. All Tidewhisper release requirements still apply. |
| TODOs 28a–28e: gear sets and hero talent depth | Pending | Reserve attachment points, set appearance hooks and UI space. Visual tasks do not implement talent or set rules. |
| TODOs 29a–29g: cave lighting, layout, indoor combat, persistence, puzzles and rollout | Pending | Coordinate lighting/material work with 29a. Surface visual rollout does not require all five caves to exist. |
| TODOs 30a–30i: Duskhollow | Pending | Its lantern mechanic and accessible enemy variants require dedicated visual acceptance. Needs 27h, 28a–28e and 29a as already specified. |
| TODOs 31a–31g: rematches and New Game+ | Pending | Preserve attack readability and distinguish new signatures visually when implemented. Do not add rematch gameplay as part of this plan. |
| TODOs 32a–32g: Lantern Moon | Pending | Art coverage follows its unlock, gravity and boss dependencies; retain the no-farm/no-cave scope. |
| TODOs 33–39: friendship, bounties, pet care, living village, museum, festivals and photo mode | Pending | Prepare reusable expression, prop and UI conventions now. These systems need not be finished to release an Act I visual update. |
| TODOs 40–41: mobile and multiplayer | Pending | Design responsive UI and actor-instance ownership now; touch input and networking stay separate gameplay projects. |
| TODO 42: wiki | Pending | Use current asset IDs and a repeatable image-capture process; do not build the wiki in the visual project. |
| Suggested additions | Gamepad, broader accessibility, real audio and other optional work remain proposed | Integrate relevant visual accessibility checks. Keep audio replacement, new input systems and parked Windward out of this scope. |

### Dependency policy

The visual plan owns presentation; TODO.md owns mechanics, content availability and campaign progression.
Finishing V14, for example, does not finish TODO 27h. A prettier development world remains unreleased
until the gameplay/content gate and actual hardware evidence pass.

Avoid dependency cycles: V03 measures existing scenes; V07 tests the new pipeline in a slice; V14–V16
reuse that pipeline but wait for their own gameplay stages. Future worlds do not block V07 or the Act I
conversion. TODO 29a supplies shared darkness support before Duskhollow-specific material acceptance.

| Workstream | Start condition | Completion/release condition |
| --- | --- | --- |
| Visual direction and budgets, V01–V04 | Separate activation instruction and stable 27a checkpoint | Direction, asset-policy change, target devices and provisional budgets agreed |
| Visual architecture and prototype, V05–V07 | V01–V04 complete | Prototype looks coherent, preserves behavior and meets its agreed measurement gates |
| Act I conversion, V08–V13 | V07 accepted; each TODO's dependencies met | Every released Act I asset/screen in scope converted and checked |
| Tidewhisper visuals, V14 | V07 accepted; individual content tasks available | 27a–27h accepted before normal campaign release; V14 covers its visual inventory |
| Caves and Duskhollow, V15 | V07 accepted; 29a ready; relevant cave/Dusk stages available | Cave rollout stages and 30i accepted for each released destination |
| Moon and rematch visuals, V16 | V07 accepted; relevant 31/32 stages available | Relevant rematch stages and 32g accepted before those encounters/destinations are exposed |
| Visual release, V17–V18 | Selected content coverage complete | Full project tests, browser acceptance, compatibility and applicable performance evidence pass |

## 3. What the style change means

The goal is a Lanternmoss interpretation: rounded characters and foliage, soft material transitions,
expressive faces, warm readable interiors and carefully composed villages. Retain the witch, warrior,
archer, lanterns, moss, fantasy creatures, spherical planets and action combat. Produce original assets
and interface designs. The reference guides proportions, surface treatment and mood.

| Element | Current implementation | Proposed direction |
| --- | --- | --- |
| Characters | Procedural multipart chibi rigs with faceted heads and geometric faces | Smoother silhouettes, readable faces, consistent rigs and expressive animation |
| Scenery | Code-built low-poly props, vertex-color variation and ink outlines | Rounded modular forms, restrained painted detail and intentional silhouette variation |
| Materials | Three-band toon ramp, emissive materials and inverted-hull outlines | Compare soft toon and restrained standard-material treatments; choose through measurement |
| Lighting | Warm glows, bloom and a paper/grain post-process | Softer contact/shadow cues, controlled glow and consistent time-of-day exposure |
| Terrain/water | Procedural terrain and shared moving-water support | Smoother surface presentation, readable paths/shores, stylized ripples and bounded foam |
| Camera | Third-person orbit on local planetary up, indoor/showcase views | Calmer framing and transitions while keeping combat, slopes and interiors readable |
| Interface | Storybook panels, Grandstander + Nunito, dense combat HUD | Consistent spacing and softer surfaces with equally clear values, key hints and telegraphs |

Do not assume that removing outlines, adding polygons or increasing bloom alone will achieve the target.
Review models, textures, lighting, camera and interface together in the prototype.

### Scope boundaries

- Change presentation without changing damage, progression, quests, economy, world seeds or interaction rules.
- Keep the current repository and Three.js baseline initially. The package pins Three.js to **0.160.0**;
  current online documentation is not proof that every listed extension is supported by that installed version.
- Propose a hybrid pipeline: authored character/hero assets and signature props, with procedural terrain,
  placement and suitable repeated scenery retained where useful.
- Changing the README/TODO.md assumption of **“no asset files”** is an explicit product-direction decision
  at V02. It is proposed here and has not been approved by this planning request. Procedural audio can remain.
- Do not flatten the planets, replace the combat system, add new gameplay, migrate saves unnecessarily,
  implement mobile/networking, or port the engine within a visual TODO.
- Keep a temporary development comparison/fallback path while conversion is underway; decide its removal
  at V18 instead of maintaining two permanent art pipelines by default.

## 4. Platform and project decision

| Option | Recommendation | Reconsider when |
| --- | --- | --- |
| Existing browser game, existing repository | Default for the prototype and first visual release | Measured loading, runtime or authoring constraints prevent the agreed scope after focused optimization |
| Desktop packaging of the browser game | Optional distribution work after the prototype | Players need installation/offline desktop distribution; benchmark separately because packaging alone supplies no graphics improvement |
| New native-first Godot project | Separate, bounded comparison prototype only if a concrete need emerges | Native-first distribution and editor-driven scene production become stronger requirements than JavaScript reuse |
| New project solely for new art | Not recommended | An independently justified engine/product change has been agreed |

Three.js provides a glTF loader with scene and animation data, supporting the proposed authored-asset
approach. Verify usage against the pinned version before implementation. See the official
[GLTFLoader documentation](https://threejs.org/docs/pages/GLTFLoader.html).

Godot also supports browser exports, but its documented web rendering and language restrictions differ
from native builds. Any future comparison must test the actual intended export, not just the editor.
See [Godot web export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
These references were checked on 2026-10-13 and must be rechecked if an engine decision is activated later.

A platform comparison, if needed, should reproduce only the same small village scene, walking,
conversation and one combat-readability example. Compare loading, frame time, memory, asset iteration
and the cost of porting existing saves, gameplay and verification. End it with a written decision;
do not let it silently become a second full game.

## 5. Plan structure and estimates

Legend: `[ ]` proposed, `[~]` active after authorization, `[x]` accepted. All items below are `[ ]`.
Tags describe proposed importance: **(foundation)**, **(core)**, **(polish)** and **(conditional)**.
Sizes follow TODO.md: **S** smaller than smelting, **M** about pet selection, **L** about resource/survival
work, **XL** larger. These are relative scope labels, not time guarantees.

| Phase | Visual TODOs | Result | Gate |
| --- | --- | --- | --- |
| V-A. Scope and direction | V01–V02 | Agreed original style and boundaries | G0: direction and asset policy |
| V-B. Budgets and foundations | V03–V06 | Measured baseline, pipeline, adapters and renderer prototype | G1: technical readiness |
| V-C. Playable proof | V07 | One polished playable village corner | G2: prototype go/no-go |
| V-D. Released-game conversion | V08–V13 | Shared actors, environments, effects and UI across Act I | G3: Act I coverage |
| V-E. Expansion integration | V14–V16 | World-specific visuals for available expansion content | Per-world content gates |
| V-F. Optimization and delivery | V17–V18 | Accepted release with maintenance documentation | G4: release readiness |

The five-hour implementation-session convention from the Phase D review remains useful. A visual TODO
here is a **parent package**, not a promise to complete it in five hours. Before activating a package,
split its sub-TODOs into branches that fit that limit including verification and publication. Art work
also needs its own estimate and review allowance; a model may need several iterations before integration.
Do not count commissioned work, learning Blender, unavailable hardware or approval waiting as completed
engineering work.

At V07, record actual hours for modeling, rigging, animation, integration and review of each representative
asset. Estimate later batches as asset count × measured production cost, plus integration, review,
performance and regression work. Do not assign a confident whole-project delivery date before that evidence.

## Phase V-A: Scope and direction

### TODO V01. Baseline inventory and scope checkpoint (foundation)

**Goal:** know exactly what will change and what must remain compatible.<br>
**Why:** an asset count based only on the village misses bosses, furniture, portraits, world variants and menus.<br>
**Size:** M. **Needs:** activation and accepted 27a checkpoint.<br>
**Touches:** TODO.md, README.md, `src/models/`, `src/world/`, `src/ui/`, `styles/main.css`, existing screenshots.<br>
**Risk:** ongoing content work makes the inventory stale. **Recommendation:** inventory by stable IDs and owning TODO.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V01.1 Asset and screen inventory** | List released and planned heroes, villagers, companions, wildlife, enemies, bosses, props, structures, resources, item art, effects, portraits and screens. Record variants, usage, owner and current builder. |
| [ ] **V01.2 Representative captures** | Capture matched seed/camera/time/preset views of village, field, combat, interior, farm, building, weather, title and inventory. Keep comparison images outside baseline screenshots until rollout acceptance. |
| [ ] **V01.3 Compatibility map** | Record model-return fields, animation references, collider ownership, equip sockets, generation randomness and save IDs. Identify code that assumes a particular model part. |
| [ ] **V01.4 Release scope** | Propose Act I as the first coherent visual release; track expansions separately. Record pending gameplay dependencies and explicitly decide whether Tidewhisper is included in that first release. |

**Acceptance:** every released category has an owner, a representative view and a conversion status;
27a is verified independently; planned worlds are labeled planned; scope is concrete enough to count assets.

### TODO V02. Art direction and asset-policy decision (foundation)

**Goal:** a repeatable style guide that an artist or future contributor can follow.<br>
**Why:** consistency across assets matters more than increasing detail individually.<br>
**Size:** M, with art iteration estimated separately. **Needs:** V01.<br>
**Touches:** proposed `docs/art-direction.md`, `docs/typography.md`, eventual README/TODO assumption updates.<br>
**Risk:** drifting toward a generic reference imitation or inconsistent asset packs. **Recommendation:** retain Lanternmoss motifs.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V02.1 Direction comparison** | Compare two or three original treatments of the same hero, tree and cottage: softened procedural, authored painted, and hybrid. Review at gameplay scale as well as close-up. |
| [ ] **V02.2 Style specification** | Specify proportions, bevel/rounding, palette, roughness, texture detail, outlines, glow, shadow softness, face language and silhouette rules. Include accepted and rejected examples with reasons. |
| [ ] **V02.3 Asset and audio policy** | Decide whether to replace the code-only visual assumption with a hybrid asset pipeline. Define asset source/credit records and editable-source ownership. Keep procedural audio unless separately scoped. |
| [ ] **V02.4 Direction gate G0** | Record the selected treatment, reference frames, target devices and scope exclusions. Update active roadmap assumptions only after approval to adopt the direction. |

**Acceptance:** one selected direction, a practical style guide and an explicit asset-policy decision;
all remain proposals until this stage is activated and reviewed.

## Phase V-B: Budgets and foundations

### TODO V03. Performance and loading baseline (foundation)

**Goal:** set achievable budgets before adding richer art.<br>
**Why:** current performance tooling exists, but the documented default-quality target is not yet met on available hardware.<br>
**Size:** M–L. **Needs:** V01–V02.<br>
**Touches:** `scripts/performance.mjs`, `src/config/render.js`, `src/core/performance.js`, `docs/performance.md`.<br>
**Risk:** treating fewer triangles or a headless sim as proof of browser frame rate. **Recommendation:** measure real scenes and GPUs.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V03.1 Reproducible current baseline** | Record device/GPU/browser, viewport, preset, build, seed, camera and scene; measure mean/p95 frame time, composer calls/triangles, loading and resource counts. Separate old checked-in measurements from new evidence. |
| [ ] **V03.2 Bottleneck experiments** | Measure actors, outlines, bloom/MSAA, lights/shadows, terrain and transparency independently. Choose the highest-impact fix rather than increasing scene complexity first. |
| [ ] **V03.3 Proposed asset budgets** | Allocate per-asset and per-scene triangles, materials, textures, rigs, lights, shadow casters and download budgets. Set initial experimental limits using the budget table below, then confirm against the renderer prototype. |
| [ ] **V03.4 Hardware and release requirements** | Identify how actual Iris Xe measurements will be obtained and distinguish the 1080p High project target from the 720p Low expansion gate. Preserve unknown/unvalidated statuses until measured. |

**Acceptance:** reproducible baseline, accepted provisional budgets and a measurable performance plan;
count ceilings remain enforced; there is a stated resolution for missing required hardware evidence.

### TODO V04. Asset authoring, export and loading pipeline (foundation)

**Goal:** one documented path from editable source to a usable browser asset.<br>
**Why:** a polished model is not production-ready until its scale, animations, textures and lifecycle work in game.<br>
**Size:** L. **Needs:** V02–V03.<br>
**Touches:** proposed asset manifest, runtime asset directories, authoring sources and an asset inspection scene.<br>
**Risk:** inconsistent scales, excessive material slots or export features incompatible with r160. **Recommendation:** export a tiny reference kit first.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V04.1 Authoring contract** | Define Blender/tool version, units, local +Y up, facing direction, pivot, transforms, naming, skeleton, sockets and animation names. Document mapping from local up to spherical terrain orientation. |
| [ ] **V04.2 Reference exports** | Export one static prop and one animated actor as GLB/glTF. Verify geometry, UVs, colors, normal orientation, alpha, skeleton and animation against the pinned Three.js loader. |
| [ ] **V04.3 Manifest and ownership** | Map stable semantic asset IDs to files, variants, bounds, LODs, sockets and animation metadata. Separate editable sources from runtime exports; record creator/source/license and export settings. Decide large-file handling before large art batches. |
| [ ] **V04.4 Runtime lifecycle** | Define preload/cache/clone/dispose ownership, progress UI, retry/failure behavior and versioned asset paths. Load per-world assets deliberately; use correctly independent skeletons/material instances where needed. Test repeated travel and abandoned loads. |

**Acceptance:** a contributor can reproduce both exports; loader compatibility is confirmed; two actor
instances animate independently; resource counts settle after repeated load/dispose cycles; failures are understandable.

### TODO V05. Presentation adapters and deterministic compatibility (foundation)

**Goal:** replace appearances without rewriting movement, AI, interactions or saved state.<br>
**Why:** current model builders return parts that callers animate directly, and geometry construction can consume randomness.<br>
**Size:** L. **Needs:** V01, V04.<br>
**Touches:** `src/models/`, `src/entities/`, `src/render/Batcher.js`, `src/render/actorCulling.js`, save/layout fixtures, sim harness.<br>
**Risk:** changing generated IDs, attack timing or NPC behavior while replacing meshes. **Recommendation:** adapt one actor and one prop first.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V05.1 Actor view contract** | Define visual root, semantic pose/actions, equip sockets, expression changes, bounds and disposal. Adapt one existing actor without moving its physics root or changing logic ownership. |
| [ ] **V05.2 Static scenery route** | Separate placement/collider descriptors from the chosen visual asset. Decide which assets use instancing, UV-preserving merging or existing procedural batching. The current Batcher drops non-position attributes, so textured imports need an explicit route. |
| [ ] **V05.3 Randomness and saves** | Preserve seeded draw schedules where old placement depends on builder draws; keep cosmetic choices away from gameplay RNG. Compare saved IDs/layout fixtures and behavior results before/after replacement. A cosmetic rebuild must not reroll loot or move saved buildings. |
| [ ] **V05.4 Test and fallback route** | Keep headless simulations independent of asynchronous graphics downloads through an adapter compatible with the existing harness. Keep a temporary development comparison path; exercise import failure, travel, Continue and cleanup in browsers. |

**Acceptance:** the adapted actor/prop preserve movement, interaction and save/layout behavior;
full suites remain meaningful; culling, animation and disposal still have one clear owner.

### TODO V06. Materials, lighting and camera prototype (core)

**Goal:** prove a coherent treatment in the real renderer at acceptable cost.<br>
**Why:** authored assets alone will not remove the current faceted/toon/post-process look.<br>
**Size:** L. **Needs:** V03–V05.<br>
**Touches:** `src/render/materials.js`, `src/render/meshes.js`, `src/systems/RenderSystem.js`,
`src/systems/CameraSystem.js`, `src/world/sky.js`, `src/world/water.js`, graphics settings.<br>
**Risk:** adding expensive shadows or a fixed camera that obscures combat. **Recommendation:** compare bounded alternatives.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V06.1 Material comparison** | Compare soft toon and restrained standard-material treatments using the same assets; validate texture color spaces, smooth normals, roughness and emissive ranges. Establish UI/output color consistency. |
| [ ] **V06.2 Light and post-process comparison** | Test contact/blob or baked cues against a bounded dynamic shadow option. Tune bloom, exposure, fog, outline width and paper grain together. Avoid enabling costly ambient occlusion or many real lights by default. |
| [ ] **V06.3 Camera comparison** | Test calmer follow damping, framing, FOV and conversation transitions while retaining manual orbit, collision avoidance, aiming and planetary up. Include slopes, jumps, swimming, dollhouse interiors and showcases. |
| [ ] **V06.4 Quality and settings mapping** | Specify High/Medium/Low fallbacks that preserve actor silhouettes, targets and hazards. Respect existing graphics preferences; document any intentional default changes and safe old-setting mapping. |

**Acceptance:** matched day/night/interior/combat views agree with V02; the chosen treatment satisfies
V03's prototype budgets; low quality preserves gameplay cues and camera control remains usable.

## Phase V-C: Playable proof

### TODO V07. One polished village corner and prototype gate (core)

**Goal:** validate the complete style and production effort before a full conversion.<br>
**Why:** this is the evidence for whether the current browser project can support the desired result.<br>
**Size:** L–XL, split art and integration stages. **Needs:** V04–V06.<br>
**Touches:** development inspection scene/harness, representative assets, existing dialogue/movement/combat paths.<br>
**Risk:** a staged screenshot looks good while the playable game fails. **Recommendation:** acceptance includes a repeatable play sequence.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V07.1 Slice kit** | Finish one witch, one villager, one companion, a cottage exterior and small interior, tree, rock, path, water edge, lantern, resource and chest. Reuse existing gameplay rather than adding systems. |
| [ ] **V07.2 Playable sequence** | Walk, turn, idle, talk, gather, open the chest, enter/exit, equip an item and exercise a representative existing attack/hazard. Review daytime, nighttime and weather at normal camera distance. |
| [ ] **V07.3 Review and measurements** | Compare baseline and candidate captures; check silhouette, texture density, faces, shadow contact, horizon, UI and combat cues. Record real asset-production effort, frame time, loading, memory/resource lifecycle and browser errors. |
| [ ] **V07.4 Gate G2** | Decide proceed, revise or hold. Record approved images, measured limits, asset cost and a batch estimate. If browser or authoring constraints remain material after targeted fixes, propose the bounded platform comparison from section 4. |

**Acceptance:** a playable slice accepted visually and technically, unchanged gameplay outcomes and
no required test failure; no full production rollout until the go decision is recorded. Missing target
hardware evidence blocks certification, even if further development is separately allowed.

## Phase V-D: Released-game conversion

### TODO V08. Heroes, equipment and character presentation (core)

**Goal:** consistent polished models and animations for all three heroes.<br>
**Why:** the player sees their hero continuously, including selection, inventory, combat and travel.<br>
**Size:** XL across three hero batches and integration. **Needs:** V07.<br>
**Touches:** `src/models/heroes.js`, `src/models/humanoid.js`, `src/models/vanity.js`, player animation,
`src/gameplay/characters.js`, equipment/held items, CharacterSelect and inventory previews.<br>
**Risk:** new animation shifts attack/hit timing or equipment placement. **Recommendation:** gameplay timing drives presentation.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V08.1 Shared rig and movement set** | Define idle, walk, run, turn, jump, fall, land, swim, hurt and faint states. Avoid foot sliding at current move speeds and support local planetary up. |
| [ ] **V08.2 Witch, warrior and archer batches** | Produce three identifiable silhouettes with their signature weapons and ability actions. Keep damage, aim, cost and cooldown timing authoritative in existing gameplay code. |
| [ ] **V08.3 Equipment and vanity** | Fit worn/held gear, tools, hats and capes to sockets; test swapping and save restoration. Reserve future set/lantern hooks for 28/30; optional outfit/color variants remain separately scoped. |
| [ ] **V08.4 Preview consistency** | Update character selection, bag preview and portrait generation from the accepted model treatment. Check hero switching, showcase camera, independent instances and weapon bounds. |

**Acceptance:** all heroes play through movement and their full ability sets, gear restores correctly,
previews match gameplay and low-detail views preserve recognition and telegraphs.

### TODO V09. Villagers, companions and wildlife (core)

**Goal:** expressive living characters with consistent faces and movement.<br>
**Why:** cozy presentation depends on recognizable personalities and believable small actions.<br>
**Size:** XL in inventory-defined batches. **Needs:** V07–V08.<br>
**Touches:** `src/models/villagers.js`, `src/models/creatures.js`, NPCs, companions, wildlife,
`src/ui/portraits.js` and related portrait/menu renderers.<br>
**Risk:** costly rigs or changing schedules to fit animations. **Recommendation:** share animation families and preserve behavior.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V09.1 Villager kit** | Convert released locals and travelers with recognizable silhouette/clothing variants; implement talk, listen, blink, sleep and existing expressions without changing dialogue/schedules. |
| [ ] **V09.2 Companion kit** | Convert every released pet; preserve follow/stay/passive/attack, petting, abilities, faint/recovery and name/menu states. Keep distinct body families and bounded material counts. |
| [ ] **V09.3 Wildlife kit** | Convert released land, water, flying and rare creatures in batches; preserve fleeing, schedules, catches and friendship/gift behavior. Align animation with existing speeds and distances. |
| [ ] **V09.4 Future action hooks** | Define animation/expression requests for gifts, feeding, waving, station use and festival emotes. These hooks prepare TODOs 33/35/36/38 without implementing their systems. |

**Acceptance:** inventory coverage is explicit; characters remain readable in field and portrait views;
schedules, rare rewards, pet state and saved unlocks are unchanged; crowd cost meets budgets.

### TODO V10. Terrain, vegetation, resources and water (core)

**Goal:** a coherent outdoor landscape with tactile detail and clear navigation.<br>
**Why:** scenery occupies most of the image and must hold together across large areas and presets.<br>
**Size:** XL across terrain, foliage, resources and water batches. **Needs:** V07.<br>
**Touches:** `src/world/terrain.js`, `planet.js`, `scatter.js`, `props.js`, `water.js`, resource builders and spatial batching.<br>
**Risk:** visual terrain diverges from walkable geometry or textured assets break batching. **Recommendation:** preserve authoritative surfaces and placement.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V10.1 Surface presentation** | Improve grass/soil/rock/sand and path blending while keeping heights, slope checks and stable placement. Check seams, steep cliffs and spherical UV/projection behavior. |
| [ ] **V10.2 Vegetation kit** | Convert each released tree kind, grass, flowers and mushrooms with shared palette/material families, wind and distance detail. Preserve resource-node state and silhouettes on Low. |
| [ ] **V10.3 Resource and crop states** | Convert ore, forage, chopped/depleted/regrowing nodes and every crop stage. Distinguish interactable resources from decorative copies; preserve IDs and readable maturity states. |
| [ ] **V10.4 Water and shores** | Add restrained color depth, shoreline transitions, ripples/foam and fishing readability. Match moving sea, lagoon and pond queries; test swimming/wading and high-water boundaries without modifying physics. |

**Acceptance:** no visible/walkable mismatch; no placement-ID drift; all released flora/resources covered;
the landscape remains legible and within scene budgets on every preset.

### TODO V11. Buildings, interiors, furniture and construction (core)

**Goal:** inviting places that remain usable with the existing home/building systems.<br>
**Why:** rounded models need to fit precise doorways, sockets and construction footprints.<br>
**Size:** XL in exterior/interior/modular batches. **Needs:** V07, V10.<br>
**Touches:** `src/world/props.js`, `interiors.js`, `homeCottage.js`, `placeables.js`, `structures.js`,
station/chest models and existing building/camera integration.<br>
**Risk:** decorative overhangs hide doors or break snapped modular seams. **Recommendation:** author from footprint templates.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V11.1 Village exterior kit** | Convert cottages, mushroom houses, lamps, signs, fences, gates and stations; preserve entrances, protected areas, paths and interaction markers. |
| [ ] **V11.2 Interior and furniture kit** | Convert released rooms, furniture, bed/oven/bookshelf/storage interactions and claimed-home slots; preserve dollhouse visibility, sleeping NPC placement and Continue positions. |
| [ ] **V11.3 Player construction kit** | Fit floors, walls, doors, windows and roofs to existing 4 m tiles and attachment rules. Match preview and final asset bounds; support cutaways without breaking materials or textures. |
| [ ] **V11.4 Placement and restoration pass** | Test valid/invalid ghosts, rotation, placement, pickup, dependencies, storage and saved reconstruction on slopes/near water. Keep existing collision footprints unless a separately reviewed gameplay change is needed. |

**Acceptance:** all placed/owned pieces restore and remain usable; modular seams and doors work;
camera cutaways are readable and existing building/home browser checks pass.

### TODO V12. Enemies, bosses, combat effects and weather (core)

**Goal:** polished fantasy encounters with equally clear action cues.<br>
**Why:** a soft cozy style must still communicate attack direction, timing, danger and damage windows.<br>
**Size:** XL in regular-enemy and encounter batches. **Needs:** V07–V08, V10.<br>
**Touches:** monster/boss/mini-boss builders, enemy presentation, `src/fx/`, hazards/telegraphs and weather visuals.<br>
**Risk:** prettier effects hide hazards or animation timing diverges from combat. **Recommendation:** review readability before spectacle.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V12.1 Released enemy roster** | Convert every regular enemy and its existing state cues; keep silhouettes distinct from friendly wildlife and preserve behavior/hitbox ownership. |
| [ ] **V12.2 Act I encounters** | Convert Gloomcap, Pyrrhax, Malgrath, Hydra variants and Basilisk. Cover summon, attacks, transitions, stun/vulnerable windows, defeat and reward states, including flight/gaze mechanics. |
| [ ] **V12.3 Ability and hazard language** | Standardize friendly, hostile, target and interaction shapes; tune trails, impacts, ultimate markers, rings, damage numbers and hit-stop presentation. Essential cues must survive bloom off, outlines off and Low. |
| [ ] **V12.4 Weather and reduced effects** | Convert rain, snow, ash/embers, fog and ambient particles with bounded pools and transparency. Respect density settings and reduced-motion/flash preferences; leave weather's gameplay ownership unchanged. |

**Acceptance:** every released attack has a readable cue and damage window; all heroes retain current
combat outcomes; heavy weather does not obscure essential signals or exceed budgets.

### TODO V13. Interface, item art and accessibility (core)

**Goal:** make the whole interface match the accepted world style while preserving usability.<br>
**Why:** changing only the 3D view leaves the title, portraits, HUD and menus visibly disconnected.<br>
**Size:** XL across screen families. **Needs:** V07–V09, V11–V12.<br>
**Touches:** `src/ui/`, `src/ui/itemArt.js`, `src/models/items.js`, `styles/main.css`, `index.html`, typography docs/settings.<br>
**Risk:** hiding important combat information to reduce clutter. **Recommendation:** reorganize hierarchy and test real usage.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V13.1 UI tokens and typography** | Specify panel surfaces, spacing, radii, borders, focus, text sizes and semantic colors. Reassess Grandstander + Nunito through real screens before changing fonts. |
| [ ] **V13.2 HUD and dialogue** | Update vitals, skills, hotbar, pet/boss cards, compass, prompts, quest/tutorial panels, toasts and dialogue. Preserve resource/cooldown/key information and remapped bindings. |
| [ ] **V13.3 Menu and icon families** | Convert title, character/pet select, bag/crafting/enchanting, shop, home/building controls, portals, journal/bestiary/achievements, fainting, settings/keys and save/import flows. Match item icons and world models to semantic IDs. |
| [ ] **V13.4 Accessibility/responsive audit** | Check 720p/1080p, HUD/text scaling, keyboard focus, click/tap details, long names, disabled/error states and color-independent hazard meanings. Reserve future touch controls without claiming TODO 40 complete. |

**Acceptance:** screen inventory complete; menus remain usable with existing inputs and settings;
essential information does not depend only on hover or color; no layout overlap at supported test sizes.

## Phase V-E: Expansion integration

### TODO V14. Tidewhisper visual integration (conditional core)

**Goal:** apply the proven art system to the full island world.<br>
**Why:** tides, shores and original creatures require more than recoloring Act I assets.<br>
**Size:** XL following 27's content batches. **Needs:** V07, relevant V08–V13 kits and owning 27 stages.<br>
**Touches:** Tidewhisper config/content builders, tide/water presentation and its screens/effects.<br>
**Risk:** final art masks unfinished world content. **Recommendation:** track gameplay and visual acceptance separately.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V14.1 Island kit** | After accepted 27a, style sandbars, tidal pools, ocean/lagoon shores, causeways and lighthouse forms; verify low/high tide and drained lagoon presentation from shared queries. |
| [ ] **V14.2 Ecosystem and economy kit** | Follow 27b–27c for palms, kelp/coral, wildlife/rare creature, resources/crops, gear and mist/squall art. Keep material families and new effects within budgets. |
| [ ] **V14.3 Village and encounters** | Follow 27d–27g for Marlo, homes/quest props, the original roster, Old Ironclaw and Mirelure. Preserve bell armor, lure, sluice and arena readability. |
| [ ] **V14.4 Release alignment** | With 27h, complete inventory/visual checks and real release measurements; refresh affected images. The optional otter requires a separate scope decision and demonstrated budget headroom. |

**Acceptance:** every required Tidewhisper visual state covered; tide and encounter cues are clear;
27h and its actual hardware/content requirements pass before release.

### TODO V15. Cave and Duskhollow visual integration (conditional core)

**Goal:** attractive, accessible darkness with shared technical ownership.<br>
**Why:** caves and lantern-bound combat cannot depend on bloom or a high-end preset for visibility.<br>
**Size:** XL across lighting, cave kit and Dusk content. **Needs:** V07, relevant shared kits, 29a;
then the corresponding 29/30 stages.<br>
**Touches:** shared materials/light presentation, cave kit and Duskhollow content.<br>
**Risk:** duplicate lighting systems or unreadable darkness. **Recommendation:** one light-radius contract, distinct world styling.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V15.1 Shared darkness treatment** | Coordinate with 29a's shader light-radius support and real-light cap; adapt imported and procedural materials. Match the gameplay lantern radius visually, with a readable ambient floor. |
| [ ] **V15.2 Cave art kit** | Follow 29b–29g for entrances, rooms, ore, switches, stones, plates, keys, locked doors, guardians and shortcuts. Test flat interior orientation, combat camera and puzzle-state clarity. |
| [ ] **V15.3 Dusk ecosystem and village** | Follow 30a–30d for canopy, glowmoss, light footprints, lantern/oil states, shade crops, Wick, stalk houses and Old Road lamps. Preserve safe-light and flame-return cues. |
| [ ] **V15.4 Dusk encounters and acceptance** | Follow 30e–30i for regular enemies, Grandmother and Umbra, including beetle alternatives and both presentation variants' cues. Check Low/bloom-off, minimum visibility and dense fog. |

**Acceptance:** no cue relies on expensive glow/shadow effects; mechanics and visible light agree;
spider/beetle variants are equally usable; each cave/Dusk release retains its owning gameplay gate.

### TODO V16. Rematches and Lantern Moon integration (conditional core)

**Goal:** visual cohesion through endgame variants and the secret destination.<br>
**Why:** reused attacks need recognizable signatures while new gravity/eclipse states need dedicated feedback.<br>
**Size:** XL following relevant 31/32 stages. **Needs:** V07, relevant shared kits, owning 31/32 dependencies;
V15's light treatment before Moon darkness acceptance.<br>
**Touches:** rematch effects/models, lunar content and secret presentation guards.<br>
**Risk:** cosmetic reuse obscures a new attack or reveals secret content early. **Recommendation:** verify state-driven presentation.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V16.1 Rematch signatures** | Follow 31a–31f for new attack cues, difficulty presentation and rewards without changing original encounter visuals accidentally. Reuse the same accepted signature assets when Nyxra borrows them. |
| [ ] **V16.2 Lunar landscape and inhabitants** | Follow 32a–32c for craters, translucent moonglass, star lilies, rabbits/foxes, meteors, floating lanterns and the observatory/Lamplighter. Bound transparency/particles and preserve Moon scope. |
| [ ] **V16.3 Lunar combat and resolution** | Follow 32d–32f for roster, low-gravity actions, gravity wells, eclipse and rekindling; match aerial hit/escape windows and restore normal light/gravity presentation after travel. |
| [ ] **V16.4 Secret release alignment** | With 32g, audit title/journal/wiki captures for masking, compare repeated visits and Continue after resolution, and complete hardware evidence. If NG+ exists, verify visual/settings state respects its preservation rules. |

**Acceptance:** rematch cues distinguish new moves; Nyxra's sequence is readable; secret masking and
post-resolution state are correct; 32g gates release; no Moon farm/cave is added by this plan.

## Phase V-F: Optimization and delivery

### TODO V17. Whole-release optimization and compatibility (core)

**Goal:** a complete visual scope that performs reliably and preserves existing adventures.<br>
**Why:** a good prototype does not prove a populated village, boss fight or repeated world travel is safe.<br>
**Size:** L–XL based on measured failures. **Needs:** V08–V13 and any V14–V16 content selected for release.<br>
**Touches:** rendering, asset lifecycle, quality settings, performance/browser scripts and compatibility fixtures.<br>
**Risk:** loosening budgets or accepting leaks to finish. **Recommendation:** optimize measured bottlenecks and preserve gates.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V17.1 Population and renderer optimization** | Measure worst representative actors/weather/furniture/encounters; batch/instance shared meshes, limit material slots and alpha overdraw, tune LOD/culling and shadow/post-process cost. Never cull gameplay state with a mesh. |
| [ ] **V17.2 Loading and resource stability** | Measure first load, cached load and per-world transitions; tune preload/compression after compatibility proof. Repeat travel, hero switches, menu previews and reset cycles; verify bounded geometry/texture/material counts. |
| [ ] **V17.3 Save and layout acceptance** | Run old-v1 fixture and current save round trips for indoor/outdoor, equipment, home/building, resources, pets and unlocked travel. Confirm IDs/placement and selected quality do not alter saved gameplay results. |
| [ ] **V17.4 Hardware/preset evidence** | Run the browser matrix and exact project/content performance fixtures on stated hardware. Refresh measurements with build IDs; fix regressions. Missing required Iris Xe evidence remains a blocking release limitation. |

**Acceptance:** all applicable suites and browser/performance gates pass; no unexplained resource growth,
layout drift or old-save loss; measured limits and remaining nonblocking issues are documented truthfully.

### TODO V18. Release review, documentation and maintenance (core)

**Goal:** a reviewable, tested visual release with an understandable production workflow.<br>
**Why:** future worlds and contributors need conventions and verified examples rather than a one-off conversion.<br>
**Size:** M–L. **Needs:** V17.<br>
**Touches:** README tour, screenshots, art/pipeline docs, credits, release notes, TODO/log status.<br>
**Risk:** claiming completion while mixed assets or failed checks remain. **Recommendation:** accept a defined scope and retain honest coverage.

| Sub-TODO | Description and deliverable |
| --- | --- |
| [ ] **V18.1 Final coverage and play review** | Reconcile manifest/inventory, screenshots, tests and selected world scope. Play the first hour and representative late encounters; track any mixed-style leftovers explicitly. |
| [ ] **V18.2 Documentation and images** | Update README's visual/asset assumptions, art direction, pipeline, credits, settings/performance notes and affected tour captures. Keep future wiki imagery tied to actual released data. |
| [ ] **V18.3 Production handoff** | Document source-to-export steps, adding a variant, rig/socket/action conventions, budget measurement and asset retirement. Reserve future hooks for social systems/photo mode without marking them implemented. |
| [ ] **V18.4 Gate G4 and publication** | Decide the comparison/fallback path's retirement. Follow AGENTS.md's feature completion workflow, record checks/merge/push/inclusion/branch cleanup, and publish only the agreed accepted visual scope. |

**Acceptance:** release scope is coherent, documents/images match the build, all required checks pass,
and the merge/push/cleanup evidence is recorded. Expansions outside the selected scope remain pending.

## 6. Proposed budgets and measurement rules

Existing acceptance rules take precedence over this plan's experimental starting points. These numbers
are proposals for V03/V07 to calibrate, not current measurements or approved new production ceilings.

| Metric | Existing requirement or proposed starting point | How to verify |
| --- | --- | --- |
| Project performance target | Existing: steady 60 FPS at 1920 × 1080, default High, Iris Xe-class graphics; target remains unvalidated | Full project fixture plus populated/combat cases on identified hardware; record mean/p95 and GPU/browser |
| Expansion release target | Existing: actual Iris Xe, 1280 × 720, Low; village/night/weather each at least 90 samples, p95 ≤ 1000/60 ms | Owning release reports under `docs/releases/`; preserve contentGate checks |
| Act I scene counts | Existing calls/triangles: Lanternmoss 1050/310000, Emberfall 900/280000, Frostveil 850/280000 | Whole-composer counts through existing performance script; do not silently raise limits for new art |
| Hero/villager reference mesh | Proposed prototype starting range: 3k–8k triangles, 1–2 material slots per actor, excluding separately budgeted equipment | Export inspection and populated runtime scene; split/reduce if crowd cost is excessive |
| Common static prop | Proposed starting range: 100–1500 triangles, normally one shared material family | Asset inspection plus repeated-prop scene; use instancing or appropriate spatial batches |
| Textures | Proposed: 256–512 px shared prop atlases; 512–1024 px hero/major-asset atlases; exceptions justified by gameplay distance | Inspect compressed transfer and decoded texture cost, mipmaps and repeated usage |
| Real lights/shadows | Retain cave proposal's approximately four-real-light cap; prototype with at most one dynamic shadow-casting light and bounded caster range | Measure each light/shadow option independently; imported assets obey shared light contracts |
| Loading payload | Proposed prototype goal: ≤15 MB compressed for the first playable slice's code/visual payload; ≤10 MB added per subsequent world asset pack | Cold network trace with all dependencies counted, cache disabled, transfer and decode recorded separately |
| Time to playable | Proposed slice goal: ≤8 s cold and ≤3 s warm on an agreed desktop device/network; record the network profile before testing | From navigation to controllable hero; include downloads, decoding and shader warmup |
| Lifecycle | Proposed: resource counts settle to an explainable cached steady state after ten travel/reset cycles | Track renderer texture/geometry counts and application cache ownership; do not assert portable heap thresholds without evidence |

The historical checked-in performance results use Intel UHD and report roughly 18–19 FPS at High in
their full 2026-10-10 samples. They are a warning about headroom, not a fresh measurement of today's
working tree. Low-quality count compliance alone does not prove the target frame rate. See
[performance notes](../performance.md) and [content acceptance](../content-release.md).

## 7. Verification and implementation workflow, when activated

Every activated implementation stage follows [AGENTS.md](../../AGENTS.md). Work on a feature branch,
bring it up to date with the default branch, run **all** `npm test` and `npm run sim` checks, plus relevant
browser/feature checks, fix failures, commit and merge the tested tree, push when a remote exists,
verify inclusion and then delete the feature branch. Rerun affected checks if merge resolution changes
tested code. Never merge or delete a feature branch while a required check fails.

Use focused tests for meaningful contracts: save/layout stability, independent instances, animation
event timing, water/light query alignment and cleanup. Screenshots and actual WebGL measurements verify
appearance and rendering; the headless simulation renderer cannot certify graphical quality or GPU speed.
Do not add tests that merely assert the presence of every art file without exercising its contract.

| Acceptance area | Minimum representative coverage |
| --- | --- |
| Gameplay regression | Full unit/sim suites; all three heroes, complete ability sets and representative enemies/bosses |
| Save compatibility | Unmodified `tests/fixtures/save-v1.json`, current Continue/import/export, gear/pets, placed pieces, indoor state and world deltas |
| Placement determinism | Existing layout fixture/IDs, different visual quality/density, repeat generation and restored construction |
| Browser rendering | Edge/Chromium and Firefox initially; add Safari when included in supported scope. Record unavailable platforms explicitly. No page, shader, missing-asset or load errors |
| Camera and visibility | Village/field/cliff/water, interior cutaways, crowded construction, showcase, jump, orbit, aiming and telegraphs |
| UI | 1280 × 720 and 1920 × 1080, supported HUD scaling, keyboard/mouse, remapped keys, long labels, focus and failure states |
| Quality/accessibility | High/Medium/Low, bloom/outline off, reduced motion/effects and color-independent action cues; essential resources/hazards remain visible |
| Time/weather/mechanics | Day/night, heaviest weather, pause/sleep, travel/Continue; tides/light/gravity on their owning available worlds |
| Resource lifecycle | Repeated travel, character/pet switches, title resets, preview disposal, failed/aborted loads and shared asset cleanup |
| Performance | Exact existing fixture plus actor crowd, combat, furnished home/building and world-specific mechanism stress scenes |

Use existing `scripts/*-smoke.mjs`, `scripts/screenshots.mjs` and `scripts/performance.mjs` where relevant.
Add a narrowly scoped visual/asset inspection helper only if the existing harness cannot exercise the new
contract. Refresh only affected reference captures during a batch, then the complete selected tour at release.
Inspect screenshots manually; tolerate documented rasterization differences rather than accepting an
unreviewed pixel-diff threshold as aesthetic approval.

Record meaningful work, decisions, limitations and verification in `docs/logs/` using the six-column
table. Until visual IDs are formally adopted, use `TODO N/A` and put the V-ID in ACTION/REMARK. Do not
check off gameplay TODOs merely because their planned models are complete.

## 8. Asset inventory and handoff template

V01 creates an inventory using this shape; the example row describes a future record, not an existing asset.

| Asset ID | Category/world | Owning gameplay TODO | Source and runtime export | Rig/actions or sockets | LOD/material/texture budget | Status and evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Example: `hero.witch` | Hero/shared | Existing hero; future talent hooks 28 | Editable source path and versioned GLB path, to be assigned | Movement/ability names and weapon/vanity sockets | Measured counts and agreed limits, to be assigned | Proposed; captures, test build and reviewer to be recorded |

Each accepted asset needs a source owner, reproducible export settings, semantic ID, size/pivot,
materials/texture policy, gameplay-view bounds, optional collision reference, animation/sockets,
quality behavior and disposal ownership. Track planned and released world variants separately.

Suggested future artifact layout, subject to V04 review:

- `assets/models/`, `assets/textures/`: runtime exports, organized by shared kits and world.
- `art/source/`: editable source or a documented versioned external source store if files are too large.
- `docs/art-direction.md`: approved style guide and reference frames.
- `docs/asset-pipeline.md`: export, rig, manifest, loading and ownership contracts.
- `docs/art-inventory.md`: coverage, budgets, owners and acceptance evidence.
- `docs/screenshots/visual-review/`: comparison evidence during conversion, separate from released tour images.

These directories/documents are proposals; this planning task does not create assets or new runtime systems.

## 9. Risks and mitigation

| Risk | Likely consequence | Planned mitigation |
| --- | --- | --- |
| Art-production cost underestimated | Full conversion stalls after the first attractive scene | Measure source/rig/animation/review effort in V07; prioritize player/village kit; estimate by inventory batches |
| Richer materials erase performance headroom | New style feels worse to play | V03 bottleneck work and budgets before production; bounded materials/lights; browser hardware gate |
| Imported assets bypass current batching | Draw calls rise even with modest polygon counts | V05 explicitly chooses an instancing/UV-preserving route; measure repeated props/crowds |
| Asset loading disrupts deterministic generation | Saved resources/buildings shift or sims change | Preserve authoritative placement and required seeded draws; test layout fixtures and RNG-sensitive outcomes |
| Direct part animation resists a new rig | Repeated special-case code and timing regressions | Semantic adapter contract; convert one actor first; game rules own hit windows |
| Darkness or soft colors weaken combat cues | Unfair fights on cheap screens or Low | Shape/value hierarchy, ambient visibility floor, bloom-off tests and consistent accessible variants |
| Changed bounds break buildings/camera | Doors, roofs, previews or interiors become unusable | Author to footprint templates; separate visual bounds from physical rules; test restoration/cutaways |
| Expansion and visual branches overlap | Conflicts or duplicated implementation | Stable stage checkpoints; one owner per shared renderer/material change; rebase and rerun checks |
| Mixed-style rollout persists | The game looks unfinished outside the village | Maintain asset/screen inventory and select a coherent release scope; G3 coverage review |
| Engine migration expands unexpectedly | Gameplay and verification are rebuilt before visual validation | Existing project first; only a bounded, separately activated engine comparison if evidence warrants it |

## 10. Review gates and future roadmap overlap

| Gate | Decision | Required evidence |
| --- | --- | --- |
| G0, after V02 | Adopt the direction and hybrid asset policy? | Original style examples, selected scope, ownership policy and target devices |
| G1, after V06 | Is the technical pipeline ready for a playable slice? | Reproducible exports, adapter/save/layout checks, material/camera comparison and provisional budgets |
| G2, after V07 | Proceed with conversion, revise, or hold? | Playable slice, matched views, actual browser measurements and real asset-production costs |
| G3, after V08–V13 | Is the selected Act I scope visually complete? | Inventory/screen coverage, all heroes/encounters and low-quality readability |
| Per-world gates | Is each expansion ready for release? | Its owning TODO release criteria plus visual inventory and actual hardware performance evidence |
| G4, after V17–V18 | Publish the selected visual release? | Full passing checks, compatibility, coherent captures/docs, measured acceptance and branch workflow records |

TODO 33 can use the expression/gift presentation hooks; 34 can use the sign/board kit; 35 can use pet
food/outfit sockets and beds; 36 can use work-action hooks; 37 can use modular display furniture; 38
can use bounded decoration/emote variants. TODO 39 remains the owner of photo-mode controls and export,
although this plan supplies consistent scene/camera treatment. TODO 40 remains the owner of touch play,
and 41 of network state; visual assets should already allow multiple independent actor instances.
TODO 42 remains the owner of wiki generation and publication, using the agreed asset IDs and captures.

**Proposed next step after activation:** re-audit current TODO status and complete the stable-checkpoint
review in V01. **Until then, this document is a planning reference and no visual implementation is authorized.**
