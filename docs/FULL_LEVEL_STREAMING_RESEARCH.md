# Full-level scene design and streaming research

## Recommendation and evidence boundary

Preserve the supplied level's complete visual identity through a persistent simplified crater/outpost silhouette, then bring detailed regions into memory as the player approaches them. Start with a complete scene survey and one playable route across its landmarks. Implement visibility and level-of-detail selection before adding a bounded fetch/decode/eviction scheduler. These solve different problems and require different evidence.

The current `level-runtime` loads one authored GLB and one collision manifest together, activating them before a mission or staging them for reset. It does not stream the full source scene. Loading `level1.glb` once and hiding distant nodes would improve some rendering costs, but would still fetch and parse the whole file. A successful full-scene screenshot would demonstrate visual loading, not streaming, good flight geometry or a finished mission.

This report combines direct repository inspection with primary technical documentation and first-party game-design presentations checked September 13, 2026. Facts, measurements, proposals and acceptance targets are labeled. No new export, browser benchmark or player observation is claimed here. Current source was inspected read-only; concurrent implementation may supersede particular file details.

### Current implementation checkpoint: full-level survey

An experimental `?full-level` **survey** has been approved and is being implemented alongside this report. Its proposed export preserves the source's complete relative placement under one uniform `0.1` normalization, partitions the level into four spatial quadrants, and creates two LOD files per quadrant: eight GLBs. Four low-detail files preload; high detail is requested near a quadrant's bounding box, with enter distance `12` and exit distance `20` in normalized runtime units. The high-detail cap is two, including in-flight requests; low detail remains resident while high resources can be disposed.

Verified implementation checkpoint: eight derived GLBs exported and reimported, original source hash unchanged. All-low geometry is172,065 triangles; each high quadrant is capped below200k. Files total19,763,576 bytes, including about8.52MB for the four coarse files. This exceeds the original5.17MB source transfer because geometry instances are baked and embedded textures duplicated; it is a streaming-behavior proof, not a download-size improvement. Top, oblique and actual-low renders are in `art/full-level/`. Welding derived geometry before simplification corrected observed cliff tearing. The original was also visually inspected in Don McCurdy's glTF Viewer; it displayed339 validator warnings, not yet triaged.

Packaged Chrome survey loaded all4 coarse chunks before launch; three scripted near/far cycles passed real detail request/load, cap and eviction checks. Every far reset returned74 geometries/43 textures with zero streamed asset errors. Selection also enforces a350k visible-environment-triangle budget, so it may admit fewer than2 detailed quadrants. 42 Node tests, typecheck and build pass. These are lifecycle/resource counts, not human flight/collision evidence or a measured60FPS claim; GPU texture disposal is tested by counts, total CPU bitmap memory is not certified.

The survey deliberately has no gameplay collision or combat and is not a mission-ready level. Free camera passage through geometry in this mode must not be described as repaired flight physics. Its purpose is to inspect the whole source arrangement and demonstrate bounded visual detail loading. The semantic five-region design, instancing, stable collision and authored mission route below remain recommended next work; the four-quadrant survey is a smaller technical experiment, not a substitute for those gates.

## What the complete source scene contains

The source is a faceted dark-rock crater or chasm with two narrow bridges, an isolated elevated industrial tower, a denser modular base and cyan-lit machinery. These observations come from [the Blender overview](../art/inspection/level1.png). They support a high exposed crossing and a lower protected approach as a coherent design direction. A single elevated overview does not prove the lower passage is navigable, that bridges provide sufficient boost clearance, or that every visible structure is a usable interior.

The [Blender 5.2.1 report](../art/inspection/level1.json) records 2,298 objects, 2,292 mesh objects, 1,169,700 triangles summed across those mesh objects, 13 materials and 15 image entries. All reported images are 512×512, even one whose name contains “8k”; image names must not substitute for dimensions. The [inspection script](../scripts/inspect-models.py) calculates triangle equivalents as polygon-vertex-count minus two, once per mesh object, so repeated objects contribute repeatedly. This is an imported-scene accounting measure, not a frame's visible triangle count.

Direct reading of the GLB JSON confirms 393 mesh definitions and 2,298 nodes. Of those mesh definitions, 224 are referenced by more than one node. The eight most reused definitions have 139, 106, 69, 59, 56, 56, 51 and 43 node references. The only declared used/required extension is `KHR_draco_mesh_compression`; there is no declared LOD or GPU-instancing extension. Resource reuse in glTF therefore creates an opportunity to batch repeated modules, but does not prove those modules already render as GPU batches.

The source file is 5,165,060 bytes, approximately 4.93 MiB. Its SHA-256 is `44de04d5ad33ccfd7f3e7ccab24040c6901a543306f1d2bdfa7c2330347455db`. The imported Blender bounds span roughly 847×761×572 source units. These bounds are expressed in the imported Blender coordinate space, not approved game dimensions. The old approximately 355k triangle figure must not be treated as the total scene submission budget.

### Required scene survey

Create a source-object map before selecting cuts. Record each relevant object's stable source node/index, world transform, bounds, geometry/material identity, repeated-use count and semantic role. Retain original names for provenance, but assign readable authoring labels separately. Generic names such as `Scene.240` do not identify a prop's gameplay use.

The minimum visual survey is a top view, four cardinal oblique views, an underside/chasm view, close-ups of both bridge connections and one player-height walk/fly-through per proposed lane. Overlay candidate chunk boundaries and identify cross-boundary meshes. Record openings that are only visual, one-sided surfaces, camera traps, and collisions that would need a simpler proxy. Keep the tower and base silhouette recognizable when viewing the whole level from launch.

A proposed five-region partition is shown below. These are semantic planning regions, not verified export collections or current runtime IDs. Final boundaries should follow inspected occlusion and traversal, not an arbitrary square grid.

| Proposed region | Source identity to preserve | Gameplay purpose | Streaming consideration |
|---|---|---|---|
| Launch rim | Near crater lip and visible distant tower | Orient player; demonstrate flight before danger | Must be ready at launch |
| Bridge crossing | One inspected narrow bridge and its attachments | Exposed boost line and charge opportunity | Preload before the fork; preserve bridge silhouette at every LOD |
| Lower chasm | Faceted rock recesses below the crossing | Cover and alternate altitude line | Inspect/author real clearance; dark corners cannot conceal late geometry |
| Industrial court | A selected area of the dense base | Ambush and grounded Warden encounter | Highest detail near combat; keep requests quiet during telegraphs |
| Tower/extraction | Isolated elevated tower and its approach | Persistent destination and result payoff | Far representation always visible; near detail requested ahead of arrival |

## LOD, culling and streaming are separate mechanisms

| Mechanism | What changes | What it does not inherently change | Evidence required |
|---|---|---|---|
| Frustum or region visibility | Which resident objects are submitted | Downloaded data, decoded assets or retained textures | Draw/triangle changes while turning and moving |
| Geometry LOD | Which representation of a resident feature is drawn | Residency if all alternatives are already loaded | Lower distant geometry cost with stable silhouette |
| Asset streaming | Which files are requested, decoded, retained and released | Collision correctness or visual quality | Network request order, resident-byte estimates and eviction/reload evidence |
| Draco | Compressed geometry representation on transfer | Lower geometric detail or fewer object submissions | Byte/decode comparison and unchanged shape |
| GPU instancing | Many transforms share a geometry/material draw batch | Elimination of invisible instances inside a batch | Reduced draws plus appropriate cell visibility |
| GPU texture compression | Texture storage/transcode representation | Smaller topology or better level design | Actual supported format, memory estimate and visual comparison |

Three's `LOD` selects among objects at configured distances and supports transition hysteresis. It does not define network requests or evict inactive children.[^1] Thus, three loaded GLBs under an LOD object may consume more memory than one original even while they reduce visible triangles. A streaming scheduler must decide which levels are resident and provide a valid lower-detail representation until the preferred one is ready.

`MSFT_lod` is a vendor glTF extension describing ordered node/material detail levels. Its specification permits distance selection or progressive loading by an implementation; clients that do not implement it use the highest referenced level and ignore the lower alternatives.[^2] The inspected A-Frame loader has no `MSFT_lod` handler. Merely exporting this extension would not activate progressive loading in this game.

The installed GLTFLoader requests its main file as an `arraybuffer`, then calls `parse` after that load completes. That path does not expose incremental rendering of partial GLB byte ranges. A compact whole-scene GLB is still a whole-file operation. For the first implementation, use separately addressable chunk/LOD files and an application manifest rather than writing a range-request GLB parser.

## Actual runtime compatibility

The project runs A-Frame 1.4.0. Its local `src/lib/three.module.js` imports `super-three`; the installed package is **0.147.1**. The separately installed Three 0.160 package provides types and build-time export enumeration. `vite.config.mjs` maps `three` imports to `window.AFRAME.THREE`. Newer documentation is therefore a reference for concepts; the installed source and an actual runtime fixture determine API availability.

| Capability | Inspected installed source | Implementation decision |
|---|---|---|
| `LOD.addLevel(object,distance,hysteresis)` | Present in `super-three/src/objects/LOD.js` | Can use distance selection with hysteresis; scheduler owns loading |
| `InstancedMesh` | Present; constructor sets `frustumCulled=false` | Explicitly control cell visibility; do not assume modern automatic instance bounds |
| Modern `InstancedMesh.computeBoundingSphere()` | Absent in inspected class | Compute external cell bounds; do not copy current-doc calls blindly |
| `EXT_mesh_gpu_instancing` | Handler present in installed GLTFLoader | Verify a tiny exported fixture; suitable for compatible static repeated props |
| `KHR_texture_basisu` / KTX2 | Loader/system support present | Requires configured local transcoder and capability detection; current level loader does not wire it |
| `EXT_meshopt_compression` | Handler and system decoder getter present | Requires decoder setup and awaited readiness; current level loader only sets Draco |
| `MSFT_lod` | No handler found | Use explicit manifest scheduling; do not claim extension support |
| `THREE.Cache` | Enabled by A-Frame's `src/lib/three.js` | Account for retained download/image data when designing eviction |

The current Three documentation lists a broader extension set than this older runtime, and describes KTX2/Meshopt configuration explicitly.[^3] Use one version-compatible helper path at a time. A new compression path should pass a self-contained sample before processing the full level. An engine upgrade is not a prerequisite for basic chunk visibility or separate-file streaming.

A-Frame's guidance supports direct Three transform/visibility changes, reuse of temporary objects, and avoiding excessive work in ticks.[^4] Keep the chunk scheduler as a small owner of Three groups; do not convert thousands of static nodes into separate A-Frame entities. Recompute priorities at a bounded frequency or when camera/route state changes. The physics and weapon systems should not traverse the visual city per shot.

## Chunking and instancing strategy

First classify source geometry by reuse and function. Repeated static modules with identical geometry and compatible material state are instancing candidates. Unique large rock surfaces, bridge assemblies and landmark silhouettes are candidates for per-region merging or dedicated LODs. Animated creatures remain independent from static level batching.

Khronos distinguishes glTF data reuse from GPU instancing. Its extension guidance explicitly notes the culling tradeoff of large instance groups and recommends grouping nearby instances into cells for large worlds.[^5] The inspected source's repeated meshes are useful evidence for this strategy. They are not proof that every copy can be grouped: differing materials, transparency, special effects and hierarchy-dependent behavior need review.

Use one instanced group per geometry/material combination **per region**, not one world-wide batch. The old runtime's disabled instance frustum culling makes explicit region-level visibility particularly important. A far-away region should not be rendered solely because one object of its batch is near the player. Never infer one material equals one draw for a multi-primitive model or multi-pass effect.

Merge only within a semantic region and a compatible material group. A global merge could collapse draw count while defeating useful visibility boundaries, increasing overdraw and making eviction impossible. Keep transparent objects separately ordered and minimize them around readable gate silhouettes. Preserve nonvisual marker/collision data outside the merged render mesh.

Treat boundary-spanning geometry deliberately. A bridge touching two regions can belong to a small always-resident connector group or to a parent region with an expanded bound. Cutting the same bridge into independently unavailable halves creates holes at exactly the point where the bike accelerates. LOD cuts must preserve its contact edges and navigable aperture. Avoid coplanar duplicates when switching a full-scene proxy to detailed pieces.

## Texture and geometry memory

JPEG/PNG transfer size does not predict GPU allocation. Three's texture guide gives the useful approximate RGBA8-plus-mipmaps model `width × height × 4 × 4/3`.[^6] With that assumption, one 512² texture is about 1.33 MiB, a 1024² texture about 5.33 MiB and a 4096² texture about 85.33 MiB. These are calculations, not observed allocations. Actual format, mip policy, reuse and browser behavior can change them.

The source level's 15 reported 512² image entries would be approximately **20 MiB** if each became one distinct RGBA8 texture with a full mip chain. This is an illustrative upper accounting set, not a measured whole-scene GPU total: some images may share storage or create multiple texture objects, and geometry, render targets and browser resources are additional. Copying that full image set into five independent chunk GLBs could negate geometry-memory savings if separate loads create duplicate textures.

Track unique image content hashes and texture usage while exporting. The initial simple implementation may accept bounded duplicate textures to avoid cache complexity, but must quantify them. A later shared texture registry needs reference counting and compatible sampling/color interpretation. Serving one URL does not automatically mean all loaded GLBs share one GPU texture. Embedded images can have distinct lifetimes even when they contain identical bytes.

KTX2/Basis can encode texture data intended for GPU-compressed formats, with the loader selecting/transcoding to a supported target.[^7][^8] It is a separate optimization from Draco geometry compression. Compare final texture quality, byte size, transcode time and runtime-supported storage. First keep a PNG/JPEG fallback until the local transcoder path has actual browser coverage.

For geometry estimates, sum unique attribute and index buffer byte lengths across resident resources; record instance matrices separately. Avoid multiplying the imported 1.17 million triangles by an assumed fixed vertex stride and calling the result exact memory. Shared vertex/index buffers, attribute layouts and Draco-decoded topology can differ. Draco's specification requires decoding geometry data; it does not prescribe a smaller visual triangle count.[^9]

WebGL does not provide a portable query for all available video memory. MDN recommends estimating a budget and managing cached resources within it.[^10] Therefore, report estimated bytes alongside renderer counts and browser memory observations, with their limits. “40 geometries” is not a byte budget and cannot alone certify the absence of memory leaks.

## Proposed manifest and scheduler contract

Keep a versioned full-level manifest with: source hash; export version; coordinate convention; world-to-game transform; global bounds; persistent proxy URI; collision-manifest URI; mission-marker URI; and chunk entries. Each chunk needs stable ID, bounds, semantic region, neighbor IDs, LOD URIs, byte/triangle/material estimates, required decoder extensions, shared resource IDs and priority hints. Store actual exporter counts, not desired budget values.

Proposed state progression:

```text
unrequested → queued → fetching → decoding → ready → visible
                    ↘ failed              ↘ retained → evicted
```

States must be observable in QA. Give each request a mission/scene generation token; late results for an invalid generation are disposed, not attached. Limit active requests and decoded-ready backlog separately. Network concurrency alone cannot prevent a burst of parse work or first-upload stalls. An initial proposal is at most two chunk requests and one activation at a time, with activation deferred if the current frame already exceeded its budget; tune this from evidence.

Prioritize the current region, both candidate branch entrances, the likely next region, then background polish. Around a fork, do not assume the player has committed before crossing the choice plane. Keep both valid approaches represented. Use travel time and camera visibility as signals: distance alone can unnecessarily load hidden regions through a wall or fail to prepare a visible tower.

Calculate lead distance from measured worst-supported arrival speed and loading latency: `lead distance ≥ max speed × (p95 fetch + decode + upload latency + safety interval)`. For example, 20 units/s and 1.5 seconds total readiness latency require at least 30 units before adding any safety interval. Those numbers illustrate the calculation; they are not current benchmark results. Include turning/reversal tests because a fast bike can revisit a just-evicted region.

Provide hysteresis for both visual LOD and residency. Example experiment: enter near detail inside a threshold, leave only beyond 1.2 times it, and retain the last region briefly unless memory pressure requires eviction. Record threshold units after world normalization. Maintain a minimum dwell interval to avoid thrashing. If the preferred LOD fails, keep its valid lower representation and suppress immediate retry loops.

The persistent full-level proxy should preserve crater silhouette, bridge spans, tower and major base masses. Detailed regions replace corresponding proxy regions rather than drawing coplanar surfaces over them. Keep an explicit coverage map so every visible location has exactly one intended structural representation. Fog may soften a distant transition but must not hide a missing close bridge or threat.

## Gameplay and physics must survive visual streaming

The current collider world is a validated set of axis-aligned boxes used by player movement, camera clearance, spawning and projectile occlusion. It is suitable for bounded simplified cover, not arbitrary sloped rock or curved bridge geometry. Expanding to the whole visual level requires an inspected collision design; loading more GLBs cannot make those queries understand missing surfaces.

For the first full-scene route, keep the complete mission's simplified collision and marker data resident and fixed. Stream **visual detail only**. That is affordable if the approved route uses a modest proxy set and avoids the dangerous problem of walls appearing or disappearing around an active player. Extra background regions can remain inaccessible or outside mission bounds until their physics is authored; the game must communicate the playable space honestly.

If later collision streaming is required, activate connected physics regions before entry, preserve overlaps at boundaries and forbid eviction while player, camera sweep or live projectile can intersect them. Use a dedicated spatial broad phase once box count justifies it. The current validator's 512-box cap is a safety bound, not proof that 512 linear tests per query meet the frame budget.

The separate imported ground navmesh remains ground navigation data. It must not be used to clamp a flying player to terrain. The grounded Warden can remain on authored anchors in the initial mission; additional ground patrols require proved navigation connectivity. Air lanes define design intent and AI choreography, not an excuse to steer the player against their input.

## Whole-scene game-design plan

The full scene should make a sortie understandable through landmark relationships. Start where the isolated tower and both sides of the chasm are visible. Present a high bridge route and a lower approach before forcing a turn. Reconverge at the industrial court so the route can change preparation for the same Warden encounter. Extraction should reuse the tower established at launch rather than introduce an unrelated destination late.

Valve's visual-design presentation supports silhouette hierarchy, restrained background contrast and lighting that assists navigation.[^11] Apply that principle by keeping cyan charge cues distinct from ambient cyan machinery using shape, animation and clear placement. A repeated industrial light should not look like an interactive gate. The dark rocky Warden needs a contrasting ground or light backdrop against the dark chasm. Preserve that backdrop across LOD transitions.

The current prototype's offensive high reward and defensive low reward test marker choice. An authored route must additionally test actual exposure and cover. Use the same encounter while changing approach: high should expose the bike to a readable lock with dodge room; low should interrupt that line of sight while costing travel time. A route cannot be called safer merely because it grants shield.

The first playable full-scene mission should include launch, demonstration, fork, consequence, Warden and extraction. Its intended 3–5 minute duration is a pacing hypothesis, not a timer requirement. Retain the current short arena experiment as a control. Do not add a second boss, broad inventory or campaign until the spatial route produces intentional behavior.

Valve's playtesting account supports repeated hypothesis-driven observation and warns that measured aggregates alone miss context.[^12] Watch fresh players before explaining the route; record whether their actions match the intended tradeoff and whether they independently choose another run. Ask about route consequences after the replay decision. Five-player exploratory and ten-player confirmation gates are project choices, not statistically validated commercial thresholds.

## Staged execution and measurable gates

| Stage | Deliverable | Acceptance gate |
|---|---|---|
| 0. Whole-scene understanding | Source map, multi-view survey, bridge/chasm clearance notes, candidate regions | All major landmarks mapped; original hash preserved; source/object/triangle measures distinguished |
| 1. Reproducible baseline | Foreground production build, fixed camera/input scenario, hardware/settings metadata | Three comparable runs; frame p50/p95, per-region counts, load/decode timings and idle pacing documented |
| 2. Full-scene visibility proof | Persistent low-detail whole-scene proxy plus two independently addressable region candidates | All major landmarks recognizable; no uncovered boundary; separate URLs verified; source GLB not silently requested |
| 3. LOD proof | Near/far representation for one bridge/base region with explicit visibility owner | Reduced distant submissions; no threshold flicker or changing traversable silhouette; exact runtime APIs tested |
| 4. Actual streaming | Bounded request queue, generation guards, ready backlog, eviction policy | Network trace shows deferred detail requests; unloaded bytes/resources bounded; reversal/re-entry succeeds |
| 5. Playable route | Stable mission colliders, high/low approach, Warden/extraction | Both routes complete; boost/camera/projectile tests pass at chunk boundaries; failures retain playable proxy |
| 6. Player validation | Fresh-player observations and one focused revision | Most explain route consequence; internal target ≥5/10 voluntary replays; no supported-machine launch blocker |
| 7. Scope decision | Measured art/runtime budget and bounded additional missions | Expand only after reliability and replay evidence; premium value remains separate from a single slice |

Initial performance targets remain the master plan's ≤30 visible static route draws, ≤250k visible route triangles and p95 ≤16.7 ms on a declared baseline. They are aspirational acceptance thresholds, not newly achieved numbers. The older ≤1.5 MB initial-art target is already below the current 2.63 MB authored shell; reconcile the real transfer budget explicitly rather than preserving contradictory claims. Full-level storage can exceed launch transfer if later files are genuinely deferred.

Before optimizing, define which hardware/settings must pass. Record CSS viewport, DPR, actual canvas pixels, browser/OS/GPU, build hash plus dirty status, scenario seed and surrounding workload. Never report a resolution reduction as an unexplained frame-rate improvement. A GPU timing query, where supported, should be reported separately from requestAnimationFrame intervals and CPU work.

Streaming-specific tests: cold cache; warm cache; slow transfer; missing chunk; corrupt JSON; missing decoder; detail completing after reset; component removal during decode; repeated high/low route reversal; pausing during pending work; tab loss/resume; ten complete retries; and repeated eviction/reload of a region. Require zero uncaught errors, unchanged collision behavior, no duplicated enemies/results and a bounded post-cleanup resource plateau. A failed optional chunk must not terminate the mission.

Track the maximum frame interval around activation separately from whole-run p95, since a single visible hitch can disappear in a long percentile sample. Initial diagnostic gate: no activation-associated main-thread task over 50 ms and no unexplained frame spike over twice the steady-state p95; these are proposed investigation triggers, not universal player-perception thresholds. If they fail, reduce a chunk, spread preparation, simplify materials or lower simultaneous work before expanding streaming.

## Resource ownership and remaining risks

The current `disposeHeroModel` deduplicates geometry, materials, textures and skeletons within one root before disposal. A cross-chunk shared resource cache will need ownership across roots; blindly calling this helper when one chunk leaves could dispose resources another chunk still uses. Conversely, retaining cache references indefinitely can defeat eviction even when scene objects disappear.

Three documents separate texture/material disposal and explicit application responsibility for `ImageBitmap.close()`.[^13] The current helper disposes GPU-side texture objects but does not close image bitmaps or evict A-Frame's enabled cache. Add image ownership and cache lifetime rules before claiming memory streaming is complete. Do not close a bitmap still used by another texture, retained for reupload, or referenced by the shared loader cache.

Primary risks are whole-scene transfer disguised as streaming, oversized global instance batches, texture duplication across chunks, async late results after reset, resource disposal across shared roots, visual/physics mismatch and unclear route design. Each has a concrete gate above. A direct-Three rewrite, a custom progressive file format and a large navigation stack should remain optional until measurements identify a limitation that the current approach cannot reasonably address.

## Sources

[^1]: Three.js. [LOD](https://threejs.org/docs/pages/LOD.html), current API documentation, accessed September 13, 2026. Distance selection and hysteresis; installed behavior separately inspected.
[^2]: Microsoft contributors / Khronos glTF repository. [MSFT_lod specification](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Vendor/MSFT_lod/README.md), complete vendor extension, accessed September 13, 2026. Metadata and implementation-dependent progressive loading.
[^3]: Three.js. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), current documentation, accessed September 13, 2026. Supported extensions, decoder setup and bitmap caveat; current documentation is not an installed-version guarantee.
[^4]: A-Frame. [Best Practices](https://aframe.io/docs/1.8.0/introduction/best-practices.html), version 1.8 documentation, indexed text accessed September 13, 2026. Direct object transforms, tick allocations and throttling; project stays on 1.4.
[^5]: Khronos contributors. [EXT_mesh_gpu_instancing](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/README.md), ratified extension, accessed September 13, 2026. Data/GPU instancing distinction and spatial batching tradeoffs.
[^6]: Three.js. [Textures](https://threejs.org/manual/en/textures.html), indexed official manual text accessed September 13, 2026; direct retrieval unavailable. Approximate uncompressed texture-memory calculation.
[^7]: Khronos Group. [KHR_texture_basisu](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_texture_basisu/README.md), extension specification, accessed September 13, 2026. KTX2/Basis interchange.
[^8]: Three.js. [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html), current documentation, accessed September 13, 2026. Transcoder and renderer-capability configuration.
[^9]: Khronos Group. [KHR_draco_mesh_compression](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md), extension specification, accessed September 13, 2026. Decoded geometry and required extension behavior.
[^10]: MDN contributors. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), accessed September 13, 2026. Estimated VRAM budgets, batching and blocking API cautions.
[^11]: Jason Mitchell, Valve. [Connecting Visuals to Gameplay at Valve](https://cdn.fastly.steamstatic.com/apps/valve/2008/MIGS08_ConnectingVisualsToGameplay.pdf), MIGS, November 2008. Silhouettes/read hierarchy and navigational lighting; accessed September 13, 2026.
[^12]: Mike Ambinder, Valve. [Valve's Approach to Playtesting](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf), GDC, March 2009. Observation and iterative design experiments; accessed September 13, 2026.
[^13]: Three.js. [How to dispose of Objects](https://threejs.org/manual/en/how-to-dispose-of-objects.html), indexed official manual text accessed September 13, 2026. Shared resources, texture disposal and bitmap lifetime.

Local evidence inspected: `public/models/level1.glb` JSON; `art/inspection/level1.json` and its overview render; `scripts/inspect-models.py`; `src/components/level-runtime.ts`; `src/components/hero-model.ts`; `src/arena-world.ts`; `vite.config.mjs`; `scripts/prepare-vendor.cjs`; installed A-Frame glTF system and Three bridge; installed super-three package, LOD, InstancedMesh and GLTFLoader source. These source checks establish mechanisms and counts; actual in-browser compatibility, memory and performance remain execution gates.
