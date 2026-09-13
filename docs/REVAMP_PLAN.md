# Red Horizon revamp plan

> Historical architecture proposal. The current decision is to retain A-Frame and build the playable Ridge Run experiment. No engine spike is scheduled without a reproducible profile implicating runtime overhead. Old payload/collision claims below predate the repaired baseline; consult `VALIDATION.md` and `RIDGE_RUN_PRD.md`.

Updated 2026-09-13. This is a planning document, not a commitment to throw away the current prototype.

## Day 0 evidence now available

The latest iteration implemented the measurement panel, shared swept collision, fair ranged attacks, bolt pooling, star batching and production asset pruning inside the existing runtime. Package size is 3.1 MB. Three scripted full victories and twenty browser assertions are recorded in `docs/VALIDATION.md`. The latest 720p embedded-browser combat sample measured 32.2 ms median / 42.5 ms p95; the original 1080p target remains unmet. No direct-Three spike has been created. First isolate ordinary-browser CPU/GPU cost and compare idle frame pacing; these embedded samples alone do not establish A-Frame as the bottleneck. The proposed spike below remains a bounded comparison, not permission to delete the working build.

## Recommendation

If performance still feels bad after the combat repair, run one short direct-Three.js spike before adding more gameplay. Do not spend weeks polishing the current A-Frame stack until the spike answers whether the game feels better with a leaner renderer loop.

The likely target architecture is React for menus and HUD, plain Three.js for the game scene, and small TypeScript systems for input, flight, combat, enemy AI, collision, effects, and mission state. A-Frame is useful for fast scene assembly and WebXR demos, but this project is becoming a premium arcade shooter where frame pacing, combat feel, asset control, and restart reliability matter more than declarative entities.

## What went wrong in the current stack

The prototype inherited a broad A-Frame demo-style codebase, then grew into a game. That left several costs layered together:

- Many runtime objects are DOM entities, which makes spawning, querying, effects, health bars, hitboxes, and cleanup more expensive than plain object arrays.
- Combat used repeated DOM queries, scene-wide raycasts, debug logs, and transient entities during shots and kills.
- The level and public asset folder are large. The repository currently has about 43 MB in `public` and the built `dist`, including demo images/audio/scripts that are not part of the Mars game.
- Some GLBs are unsuitable for current gameplay: the original bike has a corrupt embedded PNG, and the enemy model was scaled to `.0001`, making visual and hitbox alignment fragile.
- The gameplay architecture mixes React, A-Frame lifecycle, document events, YUKA, setTimeout effects, and scene pause state. That makes correctness harder than it needs to be.

These problems can be reduced inside A-Frame, but the repairs increasingly look like bypassing A-Frame's convenience layer.

## A-Frame versus direct Three.js

| Question | Keep A-Frame | Move To Direct Three.js |
|---|---|---|
| Fastest path to a visible browser prototype | Strong | Medium |
| Fine control over frame loop, pools, raycasts, and memory | Medium | Strong |
| Works well with DOM-like scene authoring | Strong | Weak |
| Works well for a custom arcade game loop | Medium | Strong |
| WebXR-ready abstractions | Strong | Medium |
| Debugging performance costs | Medium | Strong |
| Long-term premium-game maintainability | Medium | Strong, if scoped carefully |

The reason to leave A-Frame is not that A-Frame is bad. The reason is that this game wants a tight simulation/render loop, pooled effects, direct asset ownership, and explicit performance budgets. Plain Three.js gives us fewer hidden layers between input, aim, raycasts, objects, and the GPU.

## Decision rule

Do not rewrite from taste. Rewrite only if a five-day spike proves at least two of these:

- 60 FPS or materially better frame-time stability on the user's actual machine at 1080p.
- Cold load meaningfully improves after asset pruning and direct scene loading.
- Shooting, aiming, enemy damage, restart, and pause become simpler than their A-Frame equivalents.
- The prototype can complete ten restarts without stale entities, growing memory, or broken input.
- The code needed for one wave is smaller and easier to reason about than the current active A-Frame path.

If the spike does not prove those, keep A-Frame and focus on asset pruning, pooling, collision, and mission design.

## Proposed new architecture

Keep:

- React/Vite/TypeScript.
- Existing premium direction and roadmap.
- The original Mars level as a temporary visual reference.
- Current mission rules as the first behavior target: move, shoot, three enemies, score, win/fail.

Replace:

- A-Frame scene/components with a direct Three.js `Game` class.
- DOM entities with arrays/maps of game objects.
- Per-shot entity creation with pooled meshes or pure HUD feedback.
- A-Frame pause/play with explicit `game.pause()`, `game.resume()`, and simulation time.
- A-Frame raycaster/entity traversal with direct ray tests against enemy bounds and a simplified collision mesh.

Core modules:

- `game/GameApp.ts`: owns renderer, scene, camera, clock, resize, pointer lock, pause/resume, dispose.
- `game/Input.ts`: keyboard, mouse, pointer lock, cursor fallback, focus loss.
- `game/FlightController.ts`: position, rotation, velocity, boost, bounds, collision calls.
- `game/Combat.ts`: weapon cooldown, reload, ray origin/direction, hit resolution.
- `game/Enemies.ts`: enemy pool, simple AI, hitboxes, damage, death.
- `game/Mission.ts`: wave spawning, score chains, win/fail, local best.
- `game/Assets.ts`: GLTF loading, Draco, material sharing, disposal.
- `game/Effects.ts`: pooled muzzle, hit, death, boost visuals.
- `game/Collision.ts`: simplified static colliders and swept movement.

React should render the menu, HUD, settings, pause, and results. The game should emit small state snapshots or events to React rather than letting React own frame-by-frame simulation.

## Five-day spike

### Day 0: Measurement baseline

- Add a debug overlay that shows FPS, frame-time p50/p95, draw calls, triangles, textures, geometries, and heap if available.
- Record current A-Frame prototype on the user's machine: cold load, first mission start, firing, enemy death, pause/resume, three restarts.
- Remove unused demo assets from a temporary package build and record bundle size separately from code changes.

Done when we have numbers, not vibes.

### Day 1: Direct Three shell

- Create `src/three-game/` without deleting A-Frame.
- Render a full-screen Three scene with the same camera feel, procedural bike, simple Mars ground, and imported level or placeholder level.
- Keep React HUD/menu intact behind a feature flag such as `VITE_GAME_ENGINE=three`.

Done when both engines can run from Vite and the Three shell has resize, disposal, pointer lock, and cursor fallback.

### Day 2: Flight and collision

- Port flight controls to direct Three objects.
- Add a simple collision representation, even if it starts as boxes/planes around the main level routes.
- Implement swept movement so boost cannot tunnel through thin walls.

Done when flying feels at least as good as the current prototype and collision failures are recorded.

### Day 3: Combat loop

- Add enemies as pooled low-poly meshes with box/sphere hit volumes.
- Implement weapon cooldown, reload, crosshair hit feedback, damage, death, and score.
- Use pooled effects only.

Done when the user can kill three enemies without visible frame collapse or missed obvious shots.

### Day 4: Mission and restart

- Implement one three-wave sortie or a smaller one-wave equivalent if collision takes longer.
- Add pause/resume, failure, victory, and replay without page reload.
- Run ten consecutive restarts.

Done when restart does not leak objects, listeners, or state.

### Day 5: Compare and decide

- Compare current A-Frame against the Three spike on the same hardware and same screen size.
- Compare code complexity: files touched, moving parts, known bugs, reload behavior, input reliability.
- Decide one of three outcomes:
  - Move forward with direct Three.js.
  - Keep A-Frame but backport specific spike optimizations.
  - Stop engine work and focus on design because engine was not the bottleneck.

## Performance budget for either engine

Target the first sellable demo at:

- 60 FPS at 1080p on the user's chosen baseline laptop.
- p95 frame time under 20 ms during normal combat.
- No single shot or death effect causing a visible stall.
- Under 150 draw calls for the prototype mission.
- Under 100k visible triangles for the prototype mission unless profiling proves headroom.
- Initial playable payload under 15 MB compressed.
- Ten restarts without increasing renderer memory counts.

These are internal targets. Record actual machine, browser, resolution, build hash, and settings.

## Asset cleanup plan

- Move non-game demo images/audio/scripts out of `public` or exclude them from production packaging.
- Keep only `level1.glb`, `level1_navmesh.glb`, current procedural/generated assets, vendor runtime, and required licenses in the first demo package.
- Build an asset ledger with source, license, commercial rights, attribution, file size, triangle count, texture sizes, and whether it ships in the demo.
- Create simplified collision meshes. Do not use the visual level mesh as the only collision source.
- Normalize imported art in Blender or a preprocessing script instead of hardcoding extreme scales.

## Risks

- A rewrite can burn time without improving game fun. Keep the spike bounded.
- Direct Three.js gives more control but fewer guardrails; we must own input, lifecycle, disposal, and resize carefully.
- The current level asset may be the main performance problem. If so, switching engines without replacing or optimizing assets will not save the game.
- A premium game still needs a fun hook. Engine work must serve the boost-route combat idea, not replace design validation.

## Next action

Start with Day 0. Measure the current build on the user's machine, then create the direct Three.js spike behind a feature flag. Do not delete the A-Frame prototype until the comparison proves the new path.


Browser pacing caveat: a separate page with no game/WebGL measured 300 requestAnimationFrame samples at 49.3 ms median / 51.5 ms p95 in the same automation environment. This is slower than the combat samples, so automated scheduling/visibility/host effects confound those FPS values. Resource counts, collision checks and mission outcomes are still observed evidence; do not infer a hardware FPS ceiling, reliable speedup, or engine bottleneck from these timings. Repeat in a normal foreground browser with CPU/GPU tools.

A repeat with the game tab closed measured 17.0 ms median / 33.6 ms p95 (300 idle frames). This reinforces the need to isolate tab/workload conditions; it does not prove all combat cost is automation. Installed A-Frame source also confirmed scene.pause() still renders. The app now suspends its animation loop on document hidden and restores rendering on visibility return, while gameplay remains explicitly paused until resumed.
