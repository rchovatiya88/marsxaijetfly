# Red Horizon premium game master plan

This document is the working contract for building a small premium game from the current prototype. It is written for future agents, artists and gameplay programmers. It separates verified repository facts from design decisions and experiments. It does not authorize installing software, publishing a build, spending money or opening a store account.

## 1. North-star outcome

Red Horizon is a short, authored Mars jetbike sortie about converting momentum into combat advantage. The player chooses a line through a dangerous canyon, uses boost and altitude to arrive at the right angle, reads enemy intent, spends a charged weapon burst during an exposed window, and extracts.

The first premium-quality slice is one replayable 3–5 minute mission named **Ridge Run**. It needs one excellent route, one rival, one meaningful branch and one satisfying result screen. It does not need a campaign, shop, procedural world, online service or payment system yet.

The player should be able to describe the experience in one sentence:

> “I chose the high line, threaded the gate, broke the rival’s lock and escaped with a clean run.”

The current three-wave arena is a combat and engineering test mode. It is useful for regression and tuning, but it is not the premium product loop. Do not expand random waves, enemy counts or decorative scenery before Ridge Run proves that flight changes decisions.

### Product sequence

1. Make Ridge Run understandable and replayable in a browser demo.
2. Test the route/combat hook with fresh, uncoached players.
3. Repair and optimize the hero bike and authored route assets.
4. Add a small set of authored missions that reuse the proven grammar.
5. Decide whether the evidence supports a downloadable premium edition.
6. Only then evaluate store, price, saves, controller support and distribution obligations.

The premium direction is a hypothesis chosen by the project owner. It is not evidence of demand. Proposed prices and player-count gates remain experiments, not facts.

## 2. Verified starting point

The active runtime is React → `src/App.tsx` → A-Frame 1.4 → the shared A-Frame Three runtime. Vite aliases gameplay `three` imports to `window.AFRAME.THREE`; do not create a second renderer. `fly-controls` owns movement and look. React owns menus/results; gameplay emits `mission-message` and `mission-ended`.

The current branch contains a functioning procedural arena, swept box collision, reciprocal cover checks, pooled player bolts, telegraphed enemy projectiles, settings, radar, local QA and an optional GLB hero layer. The current fixed embedded-browser diagnostic is below the desired 60 FPS budget: 1280×720, 1,170 warmed frame intervals, 26.6 ms median and 37.3 ms p95. The latest authored enemy GLB soak completed wave three with 38.3 ms median and 60.9 ms p95 at a smaller embedded viewport. These are diagnostics on one machine, not a hardware-wide guarantee.

The repository assets are not ready to be dropped into the active arena:

| Asset | Verified facts | Correct use |
|---|---|---|
| `public/models/level1.glb` | About 4.93 MB, Draco, 2,298 nodes, 393 meshes, 13 materials, 15 textures, roughly 1.245M position vertices, no animation | Source city kit. Extract one corridor offline. Never render the entire file in the first mission. |
| `public/models/level1_navmesh.glb` | About 147 KB, one Draco mesh, roughly 71k position vertices, no textures, orientation and scale unlike the current arena | Ground navigation source after alignment and re-export. Never use as the 3D flight collider. |
| `public/models/enemy.glb` | About 1 MB, skinned mesh, six clips: `Baka_Dying`, `Baka_Idle`, `Baka_Punch`, `Baka_Run`, `Baka_Swipe`, `Baka_Walk` | One or two elite rivals. Select clips by state; never assume array order. |
| `public/models/avi.glb` | About 1.48 MB, skinned character with ten idle/run/strafe/combat clips | One briefing or cockpit character, not a crowd. |
| `public/models/jetbickavi.glb` | About 4.79 MB, six meshes, one clip, large textures; one embedded image is invalid despite a PNG MIME label | Repair and reduce to a hero variant before shipping. Keep procedural fallback. |
| `public/models/gun.glb` | About 4.88 MB, one mesh, three large textures and tiny source scale | Reduce textures and geometry before using as a mounted weapon. |

The current `simple-navmesh-constraint` is a raycast ground helper, not a pathfinding solution. Current YUKA steering is planar and does not understand the city’s bridges, rooms or vertical routes. `traceWorld()` and `moveInWorld()` understand the hand-authored boxes only. This is why the level must gain an explicit collision export and marker manifest rather than being switched on by one JSX attribute.

## 3. Research rules the implementation must follow

### A-Frame and glTF

A-Frame’s `gltf-model` component loads asynchronously and emits `model-loaded` or `model-error`. The mission must remain playable while optional art loads, and a model failure must fall back without becoming a level failure. Use a local Draco decoder path for compressed assets. See the [A-Frame glTF model documentation](https://aframe.io/docs/1.8.0/components/gltf-model.html).

A-Frame’s best-practices guidance treats `tick` as critical frame code, recommends throttling non-critical work and recommends mutating Three transforms directly instead of repeatedly calling `setAttribute`. Apply this to camera cues, route chunks, animation and effects. See [A-Frame best practices](https://aframe.io/docs/1.8.0/introduction/best-practices.html).

### Blender export

Blender’s glTF exporter supports selected/visible objects, custom properties exported as glTF extras, skinned/keyframe animation, NLA tracks and Draco compression. Use those features to make the exported files data-bearing rather than relying on fragile object-name guesses. See the [Blender 4.3 glTF manual](https://docs.blender.org/manual/en/4.3/addons/import_export/scene_gltf2.html) and its animation/export guidance.

### Three rendering

Use `THREE.LOD` for near/mid/far swaps, `InstancedMesh` for repeated static props and disabled matrix updates for truly static objects. Do not add a shader, shadow map or post-process effect without measuring it against the declared frame budget. See [Three LOD](https://threejs.org/docs/pages/LOD.html), the [Three update/performance manual](https://threejs.org/manual/en/how-to-update-things.html) and [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

Use one `AnimationMixer` per animated hero/rival root, choose clips by name, blend state transitions and skip mixer updates while paused. See [Three AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html).

### Navigation and background work

Treat the ground navmesh as a source for ground-agent navigation, not as player flight physics. A future Recast/Detour integration can provide actual path queries and worker-friendly navmesh data; [recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js) is a candidate to evaluate. Unity’s navigation-area model is useful for design: route areas can carry costs for danger, cover, mud, exposure or reward rather than changing movement speed directly. See [Unity navigation areas and costs](https://docs.unity3d.com/cn/2018.3/Manual/nav-AreasAndCosts.html).

Do not depend on a hidden tab continuing the mission. Browsers commonly pause `requestAnimationFrame` and throttle timers for hidden documents. Pause simulation on `visibilitychange`; reserve idle/background time for short asset preparation or worker decoding. See [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) and [MDN Background Tasks](https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API).

## 4. Mission design: Ridge Run

### Core loop

The first minute must provide four readable events:

1. A visible route choice.
2. A threat telegraph with at least two spatial answers.
3. A flight maneuver that changes combat state.
4. A visible reward or consequence.

Use three route branches that reconverge at the rival:

| Route | Advantage | Cost | Visual language |
|---|---|---|---|
| High boost lane | Fast arrival and weapon charge | Exposed to a lock-on volley | Bright gate, wind streaks, open skyline |
| Low cover lane | Safer approach and shorter enemy sightlines | Slower, less charge | Broken bridge, shadow, cover markers |
| Broken hazard lane | Large charge reward and shortcut | Rocks, heat damage or unstable geometry | Red warning lights, debris, fractured path |

The player is not choosing a cosmetic fork. The route must change arrival speed, rival state, available charge or incoming threat. A branch can be easier, faster or more profitable, but no route should be universally dominant.

### Mission state machine

Implement an explicit mission state machine rather than adding more conditions to `game-manager`:

```text
briefing
  -> launch
  -> route_choice
  -> route_traversal
  -> ambush
  -> rival_telegraph
  -> rival_exposed_window
  -> extraction
  -> result
```

Every state owns its enter/exit hooks, simulation deadlines, active enemies, route markers and objective text. A pause freezes state time. A retry resets the state machine in place after the reset milestone passes.

### Rival design

The elite rival should not be a tank with more health. Use the authored clips deliberately:

- `Baka_Idle`: readable waiting/guard state.
- `Baka_Run` or `Baka_Walk`: movement between authored anchors.
- `Baka_Punch`/`Baka_Swipe`: close threat with a clear wind-up.
- `Baka_Dying`: only after lethal resolution.

Give the rival one exposed-turn window caused by the player’s route choice. The player wins by reading state and selecting a line, not by holding fire for a longer health bar.

## 5. Blender production workflow

Blender and Unity are authoring tools in this plan. They do not replace the JavaScript runtime. If neither is installed on a machine, an agent must report that limitation and avoid pretending an export happened.

### Phase A — preserve and inventory

1. Never overwrite the supplied GLBs. Copy them into a dated source archive outside `public/` or a named `art/source/` directory.
2. Record filename, byte size, SHA-256, license/provenance, importer version and known defects in `docs/ASSET_LEDGER.md`.
3. Open each GLB in Blender and a browser glTF viewer. Record orientation, scale, texture failures, node names, animation names and visual bounds.
4. Keep a small `asset-inspect` report in version control so future agents do not re-infer the same facts.

### Blender learning path for agents

An agent who has never used Blender should complete these short exercises on a copy of the assets before touching the source scene. Save screenshots and the resulting test files in a temporary work area; do not commit large scratch exports.

| Session | Skill to learn | Exercise | Proof before continuing |
|---|---|---|---|
| 1. Navigation | Viewport orbit/pan/zoom, Outliner, Collections, local/global axes, transforms | Open `level1.glb`, find a landmark, inspect its transform and move only a duplicate | Can explain which axis is up, where the origin is and which collection will export |
| 2. Scene hygiene | Apply transforms, object/data names, linked duplicates, hidden/renderable state | Make `VIS_NEAR`, `COL_PLAYER` and `DEBUG_ONLY` collections from three copied props | Exported test GLB contains only the selected collection and opens in a viewer |
| 3. Materials | Principled BSDF, UVs, image dimensions, opaque/mask/blend alpha | Replace one broken texture on a copy, reduce one image to 1K, check normals/backface behavior | Browser screenshot shows correct color, normal and alpha behavior |
| 4. Optimization | Decimate/merge by material, LOD collections, instances, Draco export | Produce near/mid/far versions of one landmark and compare draw/triangle counts | Runtime report records byte size, draws and triangles for each version |
| 5. Collision/nav | Simplified colliders, walkable surfaces, normals, area tags | Build one ramp, one cover wall and one ground patch in `COL_*`/`NAV_GROUND` | Debug overlay agrees with player/projectile behavior and ground route |
| 6. Mission data | Empties, custom properties, facing vectors, naming discipline | Place the Ridge Run markers and export them as extras or JSON | Marker report lists every required ID, route and tag with coordinates |
| 7. Animation | Armature, actions, NLA tracks, clip names, rest pose | Import `enemy.glb`, preview idle/run/attack/death and map names explicitly | Browser plays idle on spawn, attack during telegraph and death after lethal damage |
| 8. Export validation | Selected/visible objects, Y-up, image output, Draco, animation mode | Export one complete test corridor and load it through A-Frame’s local decoder | `model-loaded` fires, no missing-image errors appear, fallback remains tested |

The agent should use the official [Blender glTF manual](https://docs.blender.org/manual/en/4.3/addons/import_export/scene_gltf2.html) as the reference while learning. If Blender is unavailable, stop at asset inspection and leave a precise export recipe for the next agent; do not improvise a binary rewrite or claim a processed asset.

Unity is an acceptable alternative authoring/baking environment when a teammate already has a reliable project. Use it for scene extraction, collision/navmesh baking and marker inspection only; export the same five artifacts and verify them in the A-Frame runtime. Do not move gameplay ownership into Unity or export a monolithic scene simply because Unity can import it.

### Phase B — make a Ridge Run Blender file

Create `art/ridge-run/ridge-run.blend` with these collections:

```text
RidgeRun_ROOT
  VIS_NEAR
  VIS_MID
  VIS_FAR
  COL_PLAYER
  COL_PROJECTILES
  NAV_GROUND
  ROUTE_MARKERS
  LIGHTING_PREVIEW
  DEBUG_ONLY
```

Use `VIS_*` for rendered art only. Use `COL_*` for simplified collision surfaces. Use `NAV_GROUND` only for walkable ground-agent navigation. Keep `DEBUG_ONLY` out of exports.

Extract one corridor from `level1.glb`; do not export the source city collection wholesale. Apply transforms, correct the coordinate convention, remove hidden/duplicate meshes, merge static geometry where materials permit, and make the route readable from the player camera. Preserve intentional silhouette landmarks, not every modular kit piece.

### Phase C — name the mission data

Create empties with exact names and custom properties:

```text
MRK_PlayerStart
MRK_RouteHigh_Start / MRK_RouteHigh_End
MRK_RouteLow_Start / MRK_RouteLow_End
MRK_RouteBroken_Start / MRK_RouteBroken_End
MRK_Gate_High_01 / MRK_Gate_Low_01
MRK_Cover_01 / MRK_Cover_02
MRK_Ambush_01
MRK_Rival_Intro
MRK_Rival_Expose
MRK_Extraction
```

Recommended custom properties:

```text
marker_type: player_start | route_start | route_end | gate | cover | spawn | rival | extraction
route_id: high | low | broken | shared
area_tags: safe, cover, hazard, boost, landing, ambush, extraction
cost: number
facing: degrees or authored forward vector
```

Export custom properties as glTF extras or produce a parallel `ridge-run-markers.json`. JSON is easier to validate and version; GLB extras are useful for art-local inspection. Use one canonical manifest in runtime.

### Phase D — build collision and nav data

For `COL_PLAYER`, replace detailed city geometry with boxes, capsules, ramps and planes that match the player’s actual flight volume. For `COL_PROJECTILES`, retain surfaces that should block shots and enemy bolts. Test with visible debug materials before export.

For `NAV_GROUND`, keep only ground-agent walkable surfaces. Remove bridges or vertical surfaces that are not intended for ground agents. Align origin, rotation, scale and winding to the visible route. Add area tags/costs in the manifest; do not assume an imported navmesh’s coordinate system matches the game.

Build a separate air graph from route markers and splines. Each air lane should contain ordered points, radius, recommended altitude, speed limit, hazard tags and branch cost. This is the player/rival choreography layer; it is not a navmesh.

### Phase E — materials, lighting and LOD

Use a small material palette: oxidized red metal, dark basalt, pale dust, warning emissive, rival accent and extraction gold. Prefer opaque or masked materials; blend transparency only when it earns a readable effect. Keep texture sizes appropriate to screen contribution.

Create near/mid/far representations:

- Near: hero landmarks, cover edges, rival arena, readable materials.
- Mid: simplified meshes and reduced texture resolution.
- Far: silhouettes or a single background shell.

Use Blender’s selected/visible export options, Draco where it helps download size, and deliberate image output. Test transparent materials and normals in the actual A-Frame runtime because exporter and viewer behavior can differ.

Lighting should establish the route, threat and extraction hierarchy. Use one broad warm key, cool fill, controlled fog and restrained emissive accents. Avoid adding many shadow-casting lights. If a dynamic light does not improve a decision or landmark, remove it.

### Phase F — export contracts

Export these files:

```text
public/models/ridge-run-shell.glb
public/models/ridge-run-shell-mid.glb       (optional if runtime LOD is insufficient)
public/models/ridge-run-collision.glb
public/models/ridge-run-navmesh.glb
public/models/ridge-run-far.glb
public/models/enemy-elite.glb
public/models/jetbike-hero.glb
public/models/avi-briefing.glb
public/mission/ridge-run.markers.json
```

Record an asset manifest with byte size, hashes, draw/triangle estimates, texture dimensions, decoder requirements and animation names. Never replace a source GLB without a ledger entry and browser validation.

## 6. Runtime architecture for future agents

### `level-runtime`

Create an A-Frame component that owns authored level art and data. Its public contract should be:

```ts
type LevelMarker = {
  id: string;
  type: 'player_start' | 'route_start' | 'route_end' | 'gate' | 'cover' | 'spawn' | 'rival' | 'extraction';
  routeId: 'high' | 'low' | 'broken' | 'shared';
  position: {x: number; y: number; z: number};
  forward: {x: number; y: number; z: number};
  tags: string[];
  cost?: number;
};

type LevelRuntime = {
  status: 'fallback' | 'loading' | 'ready' | 'failed';
  markers: LevelMarker[];
  whenReady(): Promise<void>;
  activateChunk(id: string): void;
  deactivateChunk(id: string): void;
  traceCollision(origin: Vec3, delta: Vec3): Hit | null;
  getRoute(routeId: string): AirLane;
  dispose(): void;
};
```

Load the shell and manifest asynchronously. Keep the fallback arena until the route is ready. Do not attach imported visual geometry as collision by accident. Use direct Three transforms and chunk visibility; do not create thousands of new A-Frame entities for static meshes.

### `mission-runtime`

Move Ridge Run state out of the wave-oriented manager. The manager can remain as a QA mode. The mission runtime owns state transitions, route consequences, objectives, score, rival phases, extraction and reset. React receives high-level result/message events and does not mutate scene-owned geometry.

### `nav-runtime`

Start with an authored waypoint/air graph because the player and rival need bounded 3D routes immediately. Add Recast/Detour only when ground-agent behavior needs real path queries. Keep navmesh processing off the render thread where practical. Expose a debug overlay that shows the exact surface and route chosen by an enemy.

### `hero-model`

The existing optional loader is the right pattern: asynchronous model, measured-bound normalization, local Draco, material audit and procedural fallback. Extend it with named animation actions and cross-fade methods:

```ts
play('idle' | 'run' | 'attack' | 'death', {fade: number}): void;
```

Cache immutable parsed GLB resources for at most the number of elite instances allowed by the mission. Do not create a new texture/material copy for every enemy. Dispose mixers and references on removal.

## 7. Performance contract

Measure the actual production preview build at a fixed 1280×720 viewport and declared device pixel ratio. Record build hash, browser, OS, renderer pixels, load time, draw calls, triangles, geometries, textures, frame interval median/p95 and result resource counts.

Initial Ridge Run budgets:

| Budget | Target |
|---|---:|
| Static route draws before combat | ≤30 |
| Visible route triangles before combat | ≤250,000 |
| First-mission art transfer | ≤1.5 MB after compression |
| Elite rivals active | 1–2 |
| Dynamic shadow-casting lights | 0 by default; prove each exception |
| Frame-time target on declared baseline | p95 ≤16.7 ms |
| Fallback mission startup | playable without authored GLB |

Do not interpret Draco download reduction as render performance. Do not optimize against a still image. Profile route traversal, combat, rival animation, effects and extraction separately. Compare quality presets only after one baseline is reproducible.

## 8. Verification gates

### Asset gate

- Source hashes and provenance recorded.
- Blender file opens without missing images.
- Exported GLB loads in an independent viewer and the actual A-Frame runtime.
- Marker manifest positions match visible landmarks.
- Collision debug overlay matches the route.
- Navmesh debug overlay matches ground-agent surfaces.
- Animation names and expected state clips are listed.

### Runtime gate

- Fallback starts without waiting for GLB.
- Authored route becomes visible when ready.
- GLB failure does not show a level error or break combat.
- Chunk activation/disposal does not grow geometries, materials, textures or listeners.
- Pause/visibility change freezes mission clocks, AI, reload and mixers.
- Retry resets the mission in place after the reset milestone.

### Gameplay gate

- A first-time player can identify the three route choices without narration.
- At least one route changes rival state or reward.
- Every attack has a telegraph and at least two spatial answers.
- The player uses boost/altitude/cover intentionally in observation.
- Extraction provides a clear payoff and route-specific score.
- Five fresh players can explain the route decision; most voluntarily replay.

### Commercial gate

- Do not add payments or entitlements to this prototype.
- Verify asset licenses and attribution before any public build.
- Test demo scope and replay evidence before price research.
- Treat proposed $9.99/$14.99 pricing as a later experiment, not a promise.

## 9. Agent operating procedure

Every agent working on this project should:

1. Read `AGENTS.md`, this plan, `docs/VALIDATION.md`, `docs/PROJECT_MEMORY.md` and the relevant skill.
2. Check `git status` and preserve all existing uncommitted work.
3. State which files and one acceptance gate it owns before editing.
4. Make one bounded change. Do not mix asset conversion, combat tuning and UI redesign in one opaque patch.
5. Run the relevant Node tests, typecheck and build.
6. Run the actual browser path at the declared viewport.
7. Record observed facts, not assumptions, in `docs/VALIDATION.md` and the next task in `docs/PROJECT_MEMORY.md`.
8. Leave a reproducible command, screenshot/clip description or fixture for the next agent.

### Agent task queue

#### A. Asset pipeline agent

Own `art/`, asset ledger and export scripts. Install/use Blender only if available and authorized. Extract one Ridge Run corridor, repair transforms/textures, create collections and export shell/collision/nav/markers. Acceptance is an independent viewer plus A-Frame load, not merely a successful Blender export.

#### B. Level runtime agent

Own `src/components/level-runtime.ts`, manifest types and chunk activation. Preserve the fallback arena. Acceptance is async load/failure fallback, marker access, collision proxy queries, disposal and stable resource counts.

#### C. Mission designer agent

Own `src/mission/` or equivalent authored state machine and `ridge-run.markers.json` integration. Keep wave QA mode separate. Acceptance is a complete launch → branch → ambush → rival → extraction mission with one branch consequence.

#### D. Navigation agent

Own air-lane graph first; evaluate Recast only after a concrete ground-agent defect. Acceptance is debug-visible route selection, no impossible ground traversal, and no per-frame player navmesh raycast.

#### E. Hero art agent

Own repaired `jetbike-hero.glb`, explicit enemy clip mapping and attachment sockets. Acceptance is idle/run/attack/death state correctness, target triangle/material budget and fallback behavior.

#### F. Performance agent

Own the fixed benchmark harness and renderer/resource telemetry. Acceptance is three repeated runs at declared viewport/settings with p95 evidence, plus a before/after comparison for every optimization.

#### G. Playtest agent

Own fresh-player scripts and observation sheets. Never coach route choice during the first run. Record exact confusion, first success, deaths, route selection and voluntary replay. Do not convert scripted QA results into human evidence.

#### H. Release-readiness agent

Own asset provenance, browser matrix, controller/accessibility checklist, saves/retry and distribution notes. It does not publish or purchase anything without a separate explicit action.

## 10. Ordered roadmap

### Milestone 0 — lock the contract

Complete the asset ledger, baseline benchmark, source hashes, route naming scheme and mission state diagram. No new content until this is committed to docs.

### Milestone 1 — create Ridge Run data

Author/export the corridor, collision proxy, ground navmesh, air lanes and markers. Keep the procedural fallback active. Verify scale/orientation in browser.

### Milestone 2 — stream and collide

Implement `level-runtime`, async chunk activation, marker access and collision/projection queries. Add debug overlays and resource disposal.

### Milestone 3 — play the route

Implement the authored state machine, route consequences, one ambush, one rival and extraction. Keep the QA wave mode untouched for regression.

### Milestone 4 — make the hero premium

Repair/reduce the bike, map explicit rival animation states, attach engine/weapon sockets, author lighting and effects around decisions, then retest the performance budget.

### Milestone 5 — prove the hook

Run uncoached fresh-player sessions. Fix confusion and dead strategies before adding missions. Require voluntary replay evidence.

### Milestone 6 — expand carefully

Reuse the route grammar for a small number of authored missions. Each new mission must introduce a decision, threat or traversal variation; a recolor does not count.

### Milestone 7 — evaluate premium distribution

Only after the playable slice has evidence of clarity and replay, evaluate downloadable packaging, saves, controller support, price experiments, asset rights and store obligations.

## 11. Non-negotiable mistakes to avoid

- Do not set `gltf-model="#level1"` and declare the level integrated.
- Do not use the imported navmesh as the player’s 3D flight collider.
- Do not load 393 city meshes into every mission.
- Do not let a cosmetic GLB error display as a mission failure.
- Do not start animations by array index.
- Do not let a hidden tab simulate unseen gameplay.
- Do not add random waves in place of an authored route decision.
- Do not claim premium value from a scripted victory or a pretty screenshot.
- Do not rewrite to direct Three.js until a measured spike proves the current architecture is the bottleneck.
- Do not overwrite supplied source assets or hide unverified licenses.

## Sources

1. [A-Frame glTF model component](https://aframe.io/docs/1.8.0/components/gltf-model.html)
2. [A-Frame best practices](https://aframe.io/docs/1.8.0/introduction/best-practices.html)
3. [A-Frame material and custom shader guidance](https://aframe.io/docs/1.8.0/components/material.html)
4. [Blender 4.3 glTF 2.0 exporter](https://docs.blender.org/manual/en/4.3/addons/import_export/scene_gltf2.html)
5. [Three.js LOD](https://threejs.org/docs/pages/LOD.html)
6. [Three.js performance/update manual](https://threejs.org/manual/en/how-to-update-things.html)
7. [Three.js AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html)
8. [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
9. [recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js)
10. [Unity navigation areas and costs](https://docs.unity3d.com/cn/2018.3/Manual/nav-AreasAndCosts.html)
11. [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
12. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
13. [MDN Background Tasks API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API)
