# Project memory

## Current textured Bridgehead visual slice — September 13, 2026

Read [VALIDATION.md](VALIDATION.md) and [BRIDGEHEAD_PLAY_BY_PLAY.md](BRIDGEHEAD_PLAY_BY_PLAY.md) first. Bridgehead is still the default Red Horizon slice, but the latest asset pass is now a textured Blender build rather than the earlier untextured route overlay. `scripts/build-bridgehead-v2.py` rebuilds `art/bridgehead/bridgehead-v2.blend`, `public/models/bridgehead-route.glb`, `art/bridgehead/verification.json`, the `art/bridgehead/textures/` PNGs and the ten Blender review stills. Current route GLB: SHA-256 `9ce7bc765f3b4ae4c111f1202772a6de05e4fb58b761e2a228813908e440387b`, 215,660 bytes, 2,593 triangles, 5 meshes, 5 materials, 5 embedded textures. The source level remains linked at scale 3 and the original source GLB hash is preserved.

The new visual pass keeps the 19 exact gameplay collision boxes and 16 markers, adds custom mesh plates with bevel normals and panel/grain textures, and fixes the low-route `RISE + TURN` label so it reads correctly from the incoming camera. Runtime guidance now uses play-by-play action labels and sends the low-route player to the north peek marker when cover blocks line-of-sight to the armored Warden.

Verification after this pass: `npm test` 95/95, `npm run typecheck` pass, `npm run build` pass with `dist/assets/index-DjLJ3PCI.js`. Final packaged browser smoke on `http://127.0.0.1:4175/?bridgehead&playtest` passed high and low routes, real GLB Warden combat, extraction, retry and loss lifecycle. High used 14 shots, low 17; win resets settled at 75 geometries/54 textures, loss resets at 77 geometries. Final runtime captures were saved locally under the ignored `evidence/runtime-inspection/` folder.

This is still not a premium-ready acceptance pass. The open gates are natural human route completion, native captured-mouse feel, ten natural win/loss retries, declared foreground performance and a scored fresh-player cohort. Owner rights attestation is already recorded; do not ask for it again unless an actual release/legal artifact is being prepared.

## Current full-level collision candidate — September 13, 2026

Read [BRIDGEHEAD_CANDIDATE_2026-09-13.md](BRIDGEHEAD_CANDIDATE_2026-09-13.md) first. Bridgehead is now the default page, with stable collision from all 172,065 resident coarse triangles plus seven Blender-matched solid proxies. Source terrain sampling corrected the high lane to Y3.2, low-bank climb, Warden feet to Y0 and extraction to Y4. The new 207 KB route GLB, editable `.blend`, eleven markers and four composition captures are in `art/bridgehead/`. Chase camera is 2.5/6.2; speed is 10 m/s, boost 20. Mission owns its height limits even after environment-load failure. Warden is stationary, preserves telegraphs and recovers bounded missing-actor faults on ticks.

71 tests/typecheck/build pass. Final 42-assertion browser smoke passed. Ten full programmatic-input wins/retries used no position or health edits after launch and settled at 83 geometries/51 textures every pair. Both explicit environment-failure branches also won. Fixed 1280x720 embedded combat p95 is32.5ms; empty-page control p95 is31.6ms, so foreground hardware performance remains unverified. Mouse capture was rejected by the embedded browser; drag recovery was observed. The owner's rights confirmation is recorded in `BRIDGEHEAD_ITERATION_REVIEW.md`; do not ask again.

Frozen candidate: `evidence/bridgehead-candidate-01`, ID `170838fed376056a0ecc27400c9d2054918e6df2c6c188e6d446dbb61a8644f9`. No premium pass: native/captured full routes, ten natural full win/loss cycles, declared foreground performance, five formative players and the fresh ten-player scored cohort remain. Next work is those observations on the frozen bytes, then fixes tied to measured failures. Do not substitute synthetic input or agent opinions for the scorecard's human halves.

**Next-agent review:** Read [NEXT_AGENT_CRITICAL_REVIEW.md](NEXT_AGENT_CRITICAL_REVIEW.md) for the September 13 critical audit, evidence limits and ordered fixes.
**Premium direction:** Read [PREMIUM_GLTF_DIRECTION.md](PREMIUM_GLTF_DIRECTION.md) for the GLB hero-layer architecture and the proposed momentum-under-pressure vertical slice.
**Asset contract:** Read [ASSET_LEVEL_AUDIT.md](ASSET_LEVEL_AUDIT.md) before touching the level, navmesh, bike or character files.
**Master plan:** Read [PREMIUM_GAME_MASTER_PLAN.md](PREMIUM_GAME_MASTER_PLAN.md) before starting a new premium-game task; it is the current source of truth for the asset pipeline, mission scope, budgets and agent queue.

Updated 2026-09-13. This file is repository-local continuity, not an account-wide assistant memory.

## Bridgehead Run candidate and adversarial review — September 13, 2026

The full-level playable is now isolated at `?bridgehead`; the original `?full-level` LOD survey remains available and is not relabelled as gameplay. Bridgehead uses the streamed whole layout, a lower +X launch, separate measured north/south bridge entry and exit gates, exclusive charged-shot/shield rewards, one animated GLB Warden, authored cover proxies, pause-safe extraction, score/result and reset. The selected bridge exit must be crossed before the Warden spawns. `src/components/bridgehead-run.ts` owns the mission and `src/mission/bridgehead-run.ts` owns its deterministic data/helpers. `PlaytestPanel` has a dedicated two-route smoke at `?bridgehead&playtest`.

The designer, artist and skeptical-player reviews are `BRIDGEHEAD_RUN_SCORECARD.md`, `ART_DIRECTION_CRITICAL_BRIEF.md` and `PLAYER_ADVOCATE_AUDIT.md`. They intentionally contradict earlier assumptions: source bridges run +X and are only about 1 m wide; previous height-first hero normalization made the current bike about 6.275 m long, not 4.8 m. Active gameplay therefore uses `targetHeight: 1.8`, no minimum length, and a closer 1.45/5.4 chase camera. The narrow source deck is visual context below an airborne lane until a Blender route study proves clearance. No new asset bytes were produced in this iteration.

Current evidence: 46 tests/typecheck/build pass. Browser Bridgehead smoke passes 38 assertions across invalid routing, both win routes and the loss path, including rejection of pre-entry exit and unboosted-high shortcuts, ordered bridge traversal, real GLB load, idle/attack/run/death animation selection, a 1.2 s disarmed recovery, ordinary weapon wins (8 high /12 low shots), the 900 ms death hold, paused extraction, result telemetry/retry, streaming budgets, one rendered loss, duplicate-terminal rejection and ten scripted loss/retry cycles. Win resets settle at 85 geometries/53 textures; the nine additional loss resets stay flat at 86 geometries, with zero final browser warnings/errors. Results expose route, time, shots, charges spent and hull lost so a replay has concrete improvement targets. The browser run found and fixed a real A-Frame integration bug: animation selection now uses `playAnimation` instead of colliding with A-Frame's reserved `play` lifecycle hook. Ordinary launch/drag aim was visually inspected. Scripted route placement/damage is not natural traversal or human evidence, and scripted resets do not satisfy the ten natural full-sortie prerequisite. The scorecard requires >=90/100 plus hard gates; this candidate cannot be called premium-ready until ordinary-input route completion, fixed four-view capture, foreground performance, natural full retries, asset rights and fresh-player results are recorded. `game-dev` is unavailable locally, so no sealed capture bundle exists.

Latest embedded performance datum: a calibrated 1280×720 renderer surface (1463×823 CSS viewport on this host) produced 112 scripted Warden-combat frame waits at 30.8 ms median / 33.0 ms p95. This misses the scorecard's ≤20 ms p95 target and is not a foreground GPU trace, so it narrows the next task to profiling/optimization without establishing a hardware ceiling.

## Latest authored Ridge Run checkpoint — September 13, 2026

Full-level design follow-up: the user's screenshot confirmed the complete source level has a strong bridge/chasm/outpost composition but the player could read too small in gameplay. Runtime `hero-model` now supports `targetLength`; the active AVI jetbike uses `targetHeight: 2.4` and `targetLength: 4.8` while keeping the combat hitbox unchanged. `scripts/build-avi-player.py` now scales the standalone bike body larger under AVI and retargets hands/feet; rebuilt `public/models/avi-jetbike.glb` reimports cleanly. Browser preview confirms the larger bike appears in `?full-level`, though the survey's 25m aerial start still makes the vehicle read like an overview marker. Two generated design boards are saved as `art/concepts/full-level-route-design.png` and `art/concepts/full-level-chase-camera.png`; the actionable mission plan is `docs/FULL_LEVEL_GAME_DESIGN.md`. These are design targets, not runtime proof of a full mission.

Whole-level expansion approved after player fix: `?full-level` is a working experimental survey of the complete source layout, not a combat mission. Four spatial quadrants × two separate GLBs, coarse resident and selective high fetch/eviction (12m entry/20m exit, <=2 requests and highs, <=350k visible environment triangles). Source preserved in `art/full-level/full-level.blend`; top/oblique/low renders inspected; original also loaded/orbited in glTF Viewer after extension permission update (339 source warnings untriaged). Assets:172,065 coarse triangles, ~8.52MB initial coarse transfer,19,763,576 bytes all8GLBs. Duplication/baked instances make this larger than original; shared textures/instancing are next optimization, not claimed complete.

42 tests/typecheck/build pass. Final packaged Chrome streaming smoke passed3 near/far cycles: each reset74 geometries/43 textures, no streamed errors. Resource timing shows low files requested359–513ms after page load; first high files12,775ms only after approach, then refetched on reentry. Source level1.glb was not requested by survey. Full-level is explicitly no terrain collision/combat; default Ridge remains playable. Next plan in `FULL_LEVEL_STREAMING_RESEARCH.md`: choose actual bridge/outpost route, map stable collision/markers, retain visual-only streaming, then human playtest. Premium readiness, full CPU bitmap lifetime and foreground performance are not established.

Latest player/camera correction: `avi.glb` is now seated on the separately supplied `C:/Users/roncho/Documents/OrnaLabs/MarsX/Models/jetbick.glb`. Editable `art/player/avi-jetbike.blend`, render and SHA/reimport receipt accompany `public/models/avi-jetbike.glb` (1,982,588 bytes, six meshes, all imported images valid). This supersedes the old material-replacement rider. Original valid source textures downsampled to1024; helper sphere excluded. Runtime pose is baked/static, not newly animated. Player uses yaw only; local camera pitch no longer swings the boom or pitches the bike, roll disabled, pitch±60°, sensitivity doubled. Chrome canvas diagonal drags and pause/resume observed; capture request was rejected by automation. Both Ridge smoke branches pass with54 geometries/6 textures after reset; 35 unit tests/typecheck/build pass.

Supersedes earlier graybox/pending-admission statements below. The default game now loads `public/models/ridge-run-shell.glb` and matching `public/mission/ridge-run-world.json` atomically before launch, with a bounded procedural fallback. The exported environment has seven meshes, 33,197 triangles and 24 conservative collision boxes. Static shell is 2,629,384 bytes, above the earlier 1.5 MB aspiration. Source GLBs remain untouched.

`art/ridge-run/ridge-run.blend` is the full authored scene, with actual level-derived canyon/bridge/outpost modules and actual bike/Warden preview actors. Actors and gate previews are excluded from the shell export because gameplay owns them. `scripts/build-ridge-scene.py` and `scripts/ridge-preview.py` reproduce the assembly. Scene was opened in a separate Blender window without closing the user's existing windows.

Ridge player now uses `jetbike-hero.glb` with replacement materials, corrected heading and the seated `ArmatureAction.001` animation. Warden remains actual enemy GLB with idle animation. Sky stays visible when procedural terrain is hidden. Mouse fallback now requires a canvas-originating drag, uses client coordinates, clears stale anchors on pause/reentry, and excludes UI from aiming/firing. Locked mode remains relative; true pointer-lock feel still needs a human foreground-browser pass.

33 Node tests pass including both exported-world route sweeps, marker correspondence, loader fallback/disposal and mouse regressions. Browser authored Ridge smoke passed both routes (17 assertions), 8/11 shots to Warden defeat, pause-safe extraction and renderer reuse; both resets returned 54 geometries/4 textures. Actual canvas drag visibly changed aim; seated player and sky were visually verified. Scripted routes are not uncoached usability evidence.

Next: human mouse/route playtest, collision-to-visible-mesh tuning, Warden attack/death choreography, texture/material polish, target-hardware measurement and source-license verification. Do not call this a complete premium game.

## Earlier Windows / Blender checkpoint — September 13, 2026

The owner explicitly requested Blender MCP setup, model viewing, concept images, a game-design PRD, a playable-first Ridge Run implementation, and multiple-agent research/build work. This authorizes local setup, derived art and gameplay work. Premium completion still requires real playtests and release evidence.

Read `RIDGE_RUN_PRD.md` for the active design, `RIDGE_RUN_RESEARCH.md` for sourced reasoning, `BLENDER_MCP_SETUP.md` for the verified connection, and `ASSET_LEDGER.md` for new model evidence. These supersede conflicting historical sequencing below. Keep A-Frame; first stabilize/reset and test the two-route mechanic, then integrate an authored corridor.

Blender 5.2.1 LTS is installed. Official MCP server configured as `blender_official`; read-only end-to-end query passed against the existing GUI bridge on loopback 9876. A fresh Codex session may be needed for native tool discovery. The supplied download is the add-on; the separate official server is installed in an isolated Python environment. The user's GUI scene was preserved.

All six supplied GLBs were imported/rendered in Blender, with hashes and reports under `art/inspection/`. Actual level: dark faceted chasm, bridges, industrial outpost and isolated tower. Actual enemy: spiked rock humanoid; use as ground Warden. Do not invent bike-rival animations. Whole-city expanded object triangles are 1,169,700, not the older ambiguous 355k figure. Original bike visibly has broken textures; a separate 1.57 MB material-replacement study in `art/staging/` was viewed in the independent glTF viewer. It is not yet admitted to gameplay.

Two generated concept boards live in `art/concepts/` with prompts and limitations. They depict intended art, not running gameplay. Read `VALIDATION.md` for the latest implementation checks. Build reproducibility required repairing the stale lockfile; production packaging needed an explicit enemy GLB copy. Source rights remain unverified.

Implemented optional `?ridge-run` mechanic experiment in the existing arena: high boosted forward gate grants three double-damage shots, low gate grants 30 shield; real GLB Warden then one-second extraction. Normal replay resets in place. The new Blender candidate (`art/ridge-run/ridge-run-blockout.blend`) has separate shell/proxy/marker exports with round-trip checks, but is not runtime collision. Exporting a collision GLB does not automatically teach the box solver new geometry. Hero GLB lifecycle now owns resource disposal, rejects late loads after removal, and normalizes in local space. The Warden currently plays idle; attack/death animation choreography remains future work.

Final verification: 24 Node tests, typecheck/build, 23 wave browser assertions, and 17 Ridge assertions pass. Five repeated Ridge smoke pairs (ten short scripted runs) returned 41 geometries/2 textures each reset. Final wave-three soak won with 93 shots, 989 samples, 31.2 ms median/32.1 ms p95 at 1280×720, settling to 41 geometries. These embedded samples do not establish a foreground hardware limit. Preview is `http://127.0.0.1:4173/?ridge-run`, dev is port 5173; restart servers if no longer running. No commits, publishing or storefront changes were made.

Next: validate both prototype routes and repeated resets, then obtain uncoached player evidence. Author/validate a bridge-chasm corridor with matching box collision and marker data; activate new gameplay layouts only at launch/retry. Keep ordinary-browser CPU/GPU measurement and full-length ten-sortie evidence open until actually observed. Five-player then ten-player replay gates remain hypotheses; no premium-ready or revenue claim is justified.

## Historical checkpoint before Windows / Blender work

Current status is a playable three-wave combat prototype with stronger visuals, pooled bolts, pooled stars, deterministic cover collision, weapon hit-volume work, and pause-safe input clearing. The build is functional and currently the best in-repo baseline is a 1,170-frame warmed desktop-like sample at roughly `26.6 ms` median / `37.3 ms` p95 in embedded Chromium at fixed `1280×720` (still below the 60 FPS target). This is engineering evidence, not a premium-game validation.

Priority ordering for the next bounded agent pass:

1. Create and archive one fixed browser benchmark baseline (hardware/viewport/build/replay seed/settings + CPU+GPU timing + resource telemetry) before adding feature polish.
2. Implement and validate a true in-place mission reset (no page reload) with ten complete win/fail/retry cycles.
3. Complete one uncoached playtest pass (cold start, first hit, pause/recover, pointer path), then prototype the Ridge Run decision gate (boost-through gate, route choice, rival telegraph) against current waves.
4. Repair the highest-impact blocker found in steps 1–3, then rerun unchanged checks and browser fixtures.
5. Keep asset migration aligned to the Ridge Run contract (`ASSET_LEVEL_AUDIT.md`), with async fallback until authored assets are valid.

Hard constraints remain unchanged:

- Preserve `fly-controls`, `mission-message`, and `mission-ended` ownership boundaries with React menus/results.
- Keep A-Frame as the active scene owner and Three runtime bridge as runtime contract until spike gates prove a cleaner migration.
- Preserve source assets; do not depend on `level1.glb`/`level1_navmesh.glb` as full mission defaults.
- Do not treat scripted scripts as human proof. Human usability evidence is still the production gate.

Next agent handoff target: first validate performance and input-retry reliability, then implement Ridge Run authored route/missions only after those gates pass.

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

## Input adapter polish — September 13, 2026

`src/flight-input.ts` now samples browser gamepads and feeds standard move/look/boost state into `fly-controls`, preserving the existing mouse, camera, collision and A-Frame ownership contracts. Verification: `npm test` 97/97, `npm run typecheck` pass, `npm run build` pass with `dist/assets/index-CN17VFPw.js`. A production preview at `http://127.0.0.1:4176/?bridgehead&playtest` launched through cursor aim and reached the live Bridgehead HUD. No physical gamepad or natural pointer-lock route was certified; keep those on the manual acceptance sheet.

BVH remains a measured spike only. Use `scripts/benchmark-triangle-collider.cjs` and the existing route/cover regression tests to compare a pinned `three-mesh-bvh` broadphase if collision query/build cost becomes a demonstrated foreground bottleneck.
