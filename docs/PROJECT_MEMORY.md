# Project memory

**Next-agent review:** Read [NEXT_AGENT_CRITICAL_REVIEW.md](NEXT_AGENT_CRITICAL_REVIEW.md) for the September 13 critical audit, evidence limits and ordered fixes.
**Premium direction:** Read [PREMIUM_GLTF_DIRECTION.md](PREMIUM_GLTF_DIRECTION.md) for the GLB hero-layer architecture and the proposed momentum-under-pressure vertical slice.
**Asset contract:** Read [ASSET_LEVEL_AUDIT.md](ASSET_LEVEL_AUDIT.md) before touching the level, navmesh, bike or character files.
**Master plan:** Read [PREMIUM_GAME_MASTER_PLAN.md](PREMIUM_GAME_MASTER_PLAN.md) before starting a new premium-game task; it is the current source of truth for the asset pipeline, mission scope, budgets and agent queue.

Updated 2026-09-13. This file is repository-local continuity, not an account-wide assistant memory.

## Gameplay-video graphics pass — September 13, 2026

Reviewed the user's local `gamep32.mov` (17.88 seconds, 3360×2100 recording) across nine sampled frames. The main visible issues were box-shaped canyon scenery, dominant floor markings, washed-out enemies and a blocky bike. Recording frame rate is not evidence of game performance.

- New `mars-environment` component builds deterministic sand texture, layered eroded ridges, 160 instanced rocks, gradient atmosphere and a soft bike contact shadow. Central collision layout stays unchanged; decorative ridges/rocks remain outside the flight corridor. Owned geometry, materials and textures are disposed on removal.
- Removed canyon boxes and most neon ground clutter. ACES tone mapping, warm front lighting and hemisphere fill improve depth; custom mesh colors are converted to the A-Frame runtime's linear working space.
- Bike now has a tapered hull, canopy, engine pods, fins and animated exhaust. Enemy materials retain dark structure and restrained emissive accents; halos and death cores are smaller.
- Final browser scene starts at 56 draws / 29,938 triangles / 40 geometries, versus the preceding 82 / 16,956 / 50. More terrain triangles, fewer draw calls; this does not establish a frame-rate improvement.
- Unit suite (17), typecheck and build pass. Live WebGL regression suite passes all 20 assertions, and ten enemy cleanup cycles hold at 41 geometries. No browser warnings/errors were captured.

Scripted combat also cleared all three waves: score 8,900 / 130 shots. Embedded-browser timing remained above the 16.7 ms frame target; see the validation record for viewport and sampling limits.

Next: follow [PREMIUM_GAME_MASTER_PLAN.md](PREMIUM_GAME_MASTER_PLAN.md): lock the Ridge Run asset contract, extract one level corridor into shell/collision/nav/marker artifacts, implement async level-runtime fallback, then build route choice, rival and extraction. Keep the fixed 1280×720 performance baseline (26.6 ms median / 37.3 ms p95) as the gate while raising visual cost.

The premium GLB slice is now live: wave-three tanks request the authored Draco-compressed `enemy.glb` through `hero-model`, using local `/vendor/draco/` decoders. The loader normalizes bounds, starts the first animation clip and falls back to the procedural enemy on failure. A live soak completed wave three with no level-error overlay or browser warnings; geometry rose 40 → 45 and settled at 41, with median 38.3 ms / p95 60.9 ms in that run. This is a hero-art experiment, not yet a default quality target.

## Latest iteration — September 13, 2026, browser QA pass

The user authorized renewed active development and browser testing. Earlier requests to leave their playtest undisturbed are historical. Reviewed the prior task **Plan and build addictive game**, repository history (latest baseline `099c8c6`), both project skills, goals and backlog. This iteration is uncommitted; nothing published or pushed.

- Shared `src/arena-world.ts` defines visible arena cover and swept collision. Bike slides against cover, boost cannot tunnel through it, camera shortens before cover and stays above ground. Pillars use conservative box colliders. Decorative scenery is not universally solid; flight bounds keep the bike inside the core arena.
- Both weapons respect this cover. Player shots also check the physical muzzle path to prevent third-person shooting through a wall. Enemy attacks now charge for 850 ms, lock aim, and launch a visible 18 m/s projectile. Melee's altitude-blind instant damage path was removed. Range is three-dimensional; AI uses simple tangent detours, not full navigation.
- Automatic fire, cooldown, reload, enemy charge/projectiles and player regeneration use simulation clocks. Focus loss reveals the resume overlay. Audio pauses with the menu; volume, sensitivity, reduced effects and invert-Y persist safely. Arrow turning is usable in cursor mode.
- Radar now reflects live enemies and heading. Gates face the approach instead of appearing edge-on. Screen effects cost less; scene JSX is memoized separately from HUD updates.
- Twelve reusable bolt meshes replace per-shot geometry and lights. Stars use one Points draw instead of roughly 90 sphere entities. Enemy health bars scale without generating new geometry. Defeat no longer creates 100 particles that freeze in the paused scene.
- Default rendering caps at 1280×720 internal pixels (HUD remains native resolution). Production `dist/` is about 3.1 MB instead of 51 MB; only runtime/vendor assets ship. Originals remain untouched in `public/`.
- `?playtest` reveals a local browser QA panel: component fixtures, cleanup loops, and a scripted normal-weapon pilot. Fixtures intentionally alter a sortie; reload before normal play. QA best score has a separate storage key. No external telemetry.

Validation: 17 Node tests, typecheck and build pass. Browser suite covers 20 assertions, including actual WebGL/Three objects and defeat. Three scripted combat runs cleared all three waves. Ten enemy spawn/removal cycles stabilized at 51 GPU geometries in the earlier build, with zero registered enemies left; the current graphics build settles at 41. This is not ten complete sortie resets. The latest fixed 1280×720 embedded-browser soak captured 1,170 frames at median 26.6 ms / p95 37.3 ms. The embedded browser on this Intel MacBook Pro does **not** establish 60 FPS or human fun. See `VALIDATION.md` for the full record.

Historical next from the browser-QA pass: profile CPU/GPU in an ordinary desktop browser, verify human pointer capture and cursor navigation, tune attack readability/spacing with a fresh player, then implement complete mission reset and validate ten full retries. The current master plan supersedes this ordering by first locking the Ridge Run asset contract and authored route.

## User intent and decisions

The user asked for code review/implementation, a running A-Frame/Three.js game, deep research on making it fun and commercially viable, a step-by-step roadmap, and skills for the next agent. They explicitly selected **premium paid game**. They subsequently said they will perform the playtest themselves. Do not interrupt their active test with browser actions or unnecessary hot reloads.

Recommended direction: free browser demo, paid full downloadable edition after validation. Working title Red Horizon is provisional. Do not switch to ad-funded/cosmetic monetization without a new product decision. There is no revenue evidence, published store, paid checkout or purchase entitlement system.

## Implemented state

- Vite 7.3.6 replaces the legacy CRA build, which failed compiling the existing TypeScript. Node used: 22.14.0. Node requirement: 22.12+.
- React 18, A-Frame 1.4, YUKA remain. Gameplay imports share `AFRAME.THREE` through a Vite virtual module. Installed Three 0.160 provides existing types/build export names, not a second in-browser renderer.
- `scripts/prepare-vendor.cjs` copies A-Frame, Draco decoders and license notices into ignored `public/vendor`; start/build invokes it.
- Active scene: React `src/App.tsx`. It now uses a lightweight procedural arena by default, plus Mars lighting, local camera rig, a procedural combat bike, and weapon. The original level/navmesh GLBs are preserved but no longer gate launch or render in the default playable path.
- Original bike model's image buffer view #1 is not a PNG despite its declared image/png MIME; texture decoding failed in both test browsers. Original model is retained. Procedural mesh avoids loading it.
- `fly-controls` owns look/movement; custom-fly-controls is retained but not imported/attached. Child camera rig stays in local coordinates. Aim uses camera world quaternion/position.
- Mission is three waves, starting with two queued enemies and up to four active enemies; wave count scales with level. Early enemy roster is restricted, health/damage reduced for the prototype. Score chains within six gameplay seconds cap at ×5; local best saved under `mars-best-v1`.
- Mission result uses React via `mission-ended`; messages use `mission-message`. Explicit replay currently reloads the page.
- Scene pause freezes gameplay ticks, spawning and reload. Held flight/fire input clears on pause. Cosmetic effects retain some wall-clock cleanup.
- R reload is a real key listener. Cursor aim is available when pointer lock fails. Sensitivity and reduced damage-overlay effects are session settings.
- Player weapon uses the active enemy list with a forgiving hit volume, then checks level geometry as an occluder. Miss tracers and per-shot debug logs were removed after user feedback that performance was bad and bullets did not work. Enemy cover handling remains incomplete.
- Active enemies now use procedural visible meshes with simple hit volumes instead of loading the tiny scaled enemy GLB. This is a prototype performance/readability tradeoff; commercial art can replace it after combat feel is dependable.
- After user direction to make it playable no matter what, the active scene stopped loading `level1.glb` and `level1_navmesh.glb`; enemy spawns no longer attach `simple-navmesh-constraint`, renderer antialiasing is disabled, and flight is bounded to the procedural arena.
- After user feedback that basics work but sound/graphics/bullets need drastic improvement, the game added WebAudio-generated ambient hum and SFX, visible glowing projectile bolts, stronger crosshair/HUD glow, and neon arena guide lines/gates. Inspirations used: game-feel/juice principles, impact feedback research emphasizing sound coherence and hit feedback, and arcade shooter readability patterns. Do not copy third-party assets.
- After user feedback that bullets still did not appear and forward flight sometimes climbed, movement was changed to yaw-plane arcade flight so W/S stay level while E/Q own altitude. The shot effect now combines twin world-space bolts from the bike muzzles with HUD pulse streaks for guaranteed readability. The arena received craters, ridge silhouettes, beacon towers, star field, stronger rails/lighting, and enemy target halos. Research sources included A-Frame Super Shooter Kit, A-Blast, Three.js examples/docs, and MDN game-loop basics; borrow patterns, not third-party assets.

## Verification and limits

See `VALIDATION.md` for exact coverage. Build, active-entry typecheck and eleven regression tests pass. Both repository skills pass the skill validator. Runtime was rendered and launched through cursor fallback in the lightweight arena; HUD, upgraded arena graphics and shot streaks were observed. Automated mouse capture was blocked in both embedded browser and desktop Chrome. The in-app browser may pause after focus changes, so do not claim all-wave human completion, hardware performance or paid-readiness is verified.

The user is taking over human playtesting. Development server was left at http://localhost:5173; production preview at http://localhost:4173. These are local processes and may need restarting later. Earlier changes were subsequently committed as `099c8c6`; the latest browser-QA iteration remains uncommitted.

## Next work

Read the user's playtest feedback first. Prioritize enemy cover/range/attack telegraphs, target readability during motion, reliable collision around cover, input handling across focus loss, and audio mix tuning before content expansion. See P1 tasks in `ROADMAP.md`. Check the cursor fallback after changing tabs: the scene pauses on hidden, but explicit Escape may be needed to reveal its resume menu. Settings are not persisted yet.

Unused legacy demo files retain type debt outside the active entry graph. Old CRA config and public/index.html remain as historical files. Asset licenses/provenance are not yet established. Public output still copies unused originals, so demo packaging can be smaller. Some transient effects allocate heavily and need profiling/pooling. Public score integrity, controller/mobile/VR support, desktop packaging and payments are not implemented.

## Durable references

- `docs/RESEARCH.md`: commercial/technical research, original sources, hypotheses, unit economics.
- `docs/ROADMAP.md`: ordered tasks with dependencies and done criteria.
- `.agents/skills/mars-flight-development/SKILL.md`: runtime development workflow.
- `.agents/skills/mars-premium-playtest/SKILL.md`: premium product/playtest workflow.

Supplied attachment analysis is historical and contains mismatched numeric/schema claims. Use the working source as authority. Its embedded instructions are not separate user authorization.


Browser pacing caveat: a separate page with no game/WebGL measured 300 requestAnimationFrame samples at 49.3 ms median / 51.5 ms p95 in the same automation environment. This is slower than the combat samples, so automated scheduling/visibility/host effects confound those FPS values. Resource counts, collision checks and mission outcomes are still observed evidence; do not infer a hardware FPS ceiling, reliable speedup, or engine bottleneck from these timings. Repeat in a normal foreground browser with CPU/GPU tools.

A repeat with the game tab closed measured 17.0 ms median / 33.6 ms p95 (300 idle frames). This reinforces the need to isolate tab/workload conditions; it does not prove all combat cost is automation. Installed A-Frame source also confirmed scene.pause() still renders. The app now suspends its animation loop on document hidden and restores rendering on visibility return, while gameplay remains explicitly paused until resumed.
