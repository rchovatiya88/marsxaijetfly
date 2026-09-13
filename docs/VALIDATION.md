# Validation record

Baseline recorded September 13, 2026. This is a playable development prototype, not a release certification.

## Video-driven graphics verification — September 13, 2026

Reviewed `/Users/ronakchovatiya/Downloads/gamep32.mov`: 17.88-second, 3360×2100, 60 Hz video. Sampled nine frames across the clip and inspected an enlarged combat frame. The recording shows firing, movement, reload and pause. It does not measure renderer frame time.

Replaced box canyon scenery and excessive floor markings with deterministic textured sand, layered faceted ridges, instanced rocks, atmospheric sky and a bike contact shadow. Redesigned the procedural bike and reduced enemy glow/halo and explosion-core size. A second screenshot-driven pass corrected overly beige ground, dark cover faces and a fog-dimmed sun through color-space conversion and light placement.

- `npm test`: 17/17 pass; `npm run typecheck` and `npm run build`: pass. Fixed a cosmetic exhaust update's missing-element assumption exposed by the reload fixture.
- Packaged WebGL build at `http://127.0.0.1:4173/?playtest`: all 20 browser assertions pass. Ten spawn/remove cycles: **41 geometries every cycle**. No captured browser warning/error logs.
- Initial scene: **56 draw calls, 29,938 triangles, 40 geometries**, compared with 82 / 16,956 / 50 before this art pass. These are resource counts, not an FPS claim.
- Screenshots inspected during both fixed regression shots and moving wave-two combat: canyon layers, textured floor, ship silhouette, enemies, bolts, HUD and atmosphere render correctly. Existing collider locations and combat rules are preserved.
- Final scripted combat: **wave-three victory, score 8,900, 130 shots**. Captured 1,026 frame intervals, median 35.9 ms / p95 52.7 ms; panel reported 540×654 render pixels during this embedded-browser run. Different viewport and host conditions prevent direct comparison with earlier timing samples. Geometry 40 → 43 at result, settling to 41. No captured warnings/errors after combat.
- Repeated fixed baseline: embedded Chromium, explicit 1280×720 viewport, 1279×720 render pixels, same scripted pilot and warmup. Wave-three victory scored 13,300 in 1,170 frame intervals; median **26.6 ms** / p95 **37.3 ms** (about 37.6 median FPS, still below a 60 FPS frame budget). Geometry 40 → 43 at result, settling to 41. This is a reproducible diagnostic sample, not a hardware-wide guarantee.
- Cursor/scripted coverage only in this iteration; new pointer capture, other browsers and a controlled hardware benchmark remain untested.
- Authored-model soak after the local Draco decoder fix: wave-three victory, 944 frame intervals, median 38.3 ms / p95 60.9 ms at the embedded viewport, geometry 40 → 45 and settling to 41. No browser warning/error logs and no level-error overlay. The higher cost is expected when the animated GLB elite is present; it needs a dedicated quality-budget decision before wider use.

## Latest browser QA iteration — September 13, 2026

This section supersedes conflicting historical observations below. Tested the final packaged build at `http://127.0.0.1:4173/?playtest`; normal play at the same URL without the query. Start development with `npm start` and production preview with `npm run build && npm run preview`.

- `npm test`: **17 passing**. Added swept boost/overhang/slide collision, reciprocal cover rays, valid spawning, malformed/denied settings storage, stationary enemy projectile damage and 3D range, one-geometry star field/disposal, and chase-camera clearance.
- `npm run typecheck`, `npm run build`: **pass**. A-Frame's classic vendor-script warning is expected; the script is copied beside the bundle.
- Production package: approximately **3.1 MB** (previously 51 MB). Original assets remain in the repository. Distribution licenses are still a separate release review.
- Actual browser fixtures: **20 assertions** covering renderer existence, swept collision, ascent/slide, reciprocal cover, safe spawn, paused clock/reload, held-input clearing, rotated ray aim, actual target damage, visible twin bolts, bounded bolt pool, enemy charge/dodge/cover, ten spawn/remove cycles, stable geometry, and lethal-damage mission termination.
- Cleanup geometry counts across ten enemy spawn/remove cycles: **53, 51, 51, 51, 51, 51, 51, 51, 51, 51**. Active registrations returned to zero. This proves the tested enemy lifecycle, not ten complete restarts or absence of every memory leak.
- Normal UI verification: invert-Y enabled and volume 0.25 persisted after refresh, then were restored to defaults. Pointer capture was rejected with a recoverable message. Cursor launch, Escape pause and cursor resume were observed through UI actions.
- Rendered victory and defeat overlays were observed. Scripted pilot uses ordinary `shoot()`, cooldown, ammo and reload; it changes aim/strafe input but does not directly kill enemies or override health. QA runs use a separate best-score key.

### Combat profiling observations

Host: MacBookPro15,1, six-core 2.2 GHz Intel Core i7, macOS 15.7.9. Browser: Codex embedded Chromium, reported Chrome 152.0.0.0. Timings are requestAnimationFrame intervals after a two-second warmup while scripted combat runs. Browser automation, background host work and random encounters affect measurements; these are diagnostic samples, not controlled benchmarks.

| Build stage | Pixels | Outcome | Shots | Samples | Median frame | p95 frame | GPU geometry start → result |
|---|---|---|---:|---:|---:|---:|---|
| Cover/projectile fixes, before star batching | 1920×1080 | Wave 3 victory, score 8,900 | 128 | 1,062 | 34.9 ms | 47.0 ms | 111 → 142 |
| Batched stars, pooled bolts, memoized scene | 1920×1080 | Wave 3 victory, score 8,900 | 100 | 801 | 38.3 ms | 49.4 ms | 50 → 58 |
| Balanced resolution, cheaper overlays, production | 1280×720 | Wave 3 victory, score 8,900 | 117 | 1,045 | 32.2 ms | 42.5 ms | 50 → 57 |

The older 82 draw calls / 16,956 triangles / 50 geometry count belongs to the pre-graphics build and is retained only as historical context. The current graphics build starts around 56 draws / 29,938 triangles / 40 geometries; fixed 1280×720 combat reached 26.6 ms median / 37.3 ms p95 in the latest sample. **The 60 FPS goal remains unmet in this environment.** Result geometry includes transient effects and settles near 41.

### Bugs found by the loop

- A-Frame 1.4 expects renderer precision `medium`, not `mediump`; the latter produced a warning and fell back to low precision. Corrected using installed runtime schema.
- The first browser fixture incorrectly called A-Frame's guarded `pause()` on an already paused component. Corrected the fixture to transition play → held inputs → scene pause; the real lifecycle passes.
- Original Node mocks lacked weapon transforms and real camera vectors needed for muzzle/camera clearance. Replaced those stubs with real Three objects.
- Per-shot muzzle lights survived the first pooling pass; removed in the second pass.
- Defeat allocated 100 particles immediately before freezing simulation; removed after observing its 100-geometry jump.

Remaining: human enjoyment, precise mouse capture, Firefox/Safari, controlled GPU/CPU profile, complete in-place retry, ten full sorties, controller/mobile, audio mix audition, full navigation/spacing, and commercial asset validation. Desktop Chrome automation was unavailable. Some cosmetic effects still use wall-clock cleanup, but combat deadlines are simulation-owned.

## Automated checks

| Check | Result | Scope |
|---|---|---|
| `npm run build` | Pass | Vite static bundle in dist; local runtime/Draco files prepared |
| `npm run typecheck` | Pass | src/index.tsx and transitive imports, plus active declarations |
| `npm test` | 11 passing | Actual component methods transpiled into a mocked A-Frame/DOM harness |
| `git diff --check` | Pass | Whitespace/patch consistency |
| Repo skill validator | Both pass | Frontmatter/name/scaffold validation, not behavioral proof |

Regression tests cover:

1. Paused mission clock does not spawn; resumed ticks do.
2. Kill chains increment, cap at five, and expire after six seconds.
3. Wave three produces exactly one victory and does not schedule wave four.
4. Death emits a failure result and stops progression.
5. Reload advances only through ticks; pause stops automatic firing.
6. Flight pause clears held movement, boost and velocity.
7. Forward flight stays level while the camera is pitched upward.
8. Keyup clears altitude input even if the scene is paused.
9. Weapon rays follow a camera's world transform under a rotated parent.
10. Weapon fire damages an active enemy through the current forgiving combat hit volume.
11. Weapon visual bolts originate from both bike muzzles.

The harness does not emulate GPU rendering, pointer-lock permissions, real raycast collisions against the imported level, or human balance. Unused old demo files are intentionally outside the active-entry typecheck and still contain declaration errors. The build warns that the classic vendor A-Frame script is not bundled as an ES module; it is intentionally copied and loaded before the application.

## Observed browser behavior

- Embedded browser and desktop Chrome rendered the launch menu and imported level.
- Automated Launch clicks encountered pointer-lock rejection in both surfaces. The error was visible and the app remained recoverable.
- Cursor-aim fallback started the mission and displayed the gameplay HUD.
- Enemy spawning and rendered enemy models were observed in the arena.
- Ammo changed from 30 to 29 during interaction; Escape displayed Hold Position with resume controls.
- The original bike produced texture errors. Binary inspection found invalid PNG data in an embedded image. The subsequent procedural bike removes that asset from the active scene.
- Local Draco serving, critical model readiness gating, procedural bike and final world-aim changes pass compilation/tests; a complete human mission after those final changes has not been observed by the agent.
- September 13 performance/combat repair: player shots now use the active enemy list and a forgiving hit volume before checking the level mesh; miss tracers and per-shot debug logs were removed; enemies use procedural visible meshes instead of loading the tiny scaled enemy GLB. Automated browser playthrough after this repair has not been performed.
- September 13 playability repair: the active scene now uses a lightweight procedural arena instead of loading/rendering `level1.glb` and `level1_navmesh.glb`; launch readiness no longer waits on those GLBs. Browser smoke test in the in-app browser reached the HUD with two hostiles visible in cursor mode. The automation surface paused the scene after focus changes, so a full human mission is still the deciding test.
- September 13 juice pass: added WebAudio-generated ambient hum and SFX for shots, hits, kills, reload and player damage; added visible glowing projectile bolts; improved HUD/crosshair glow; added neon arena guide lines and gates. In-app browser smoke test reached cursor mode with HUD, neon arena and a visible shot bolt.
- September 13 readability repair: forward movement now stays horizontal regardless of pitch, with E/Q owning altitude. The procedural arena adds craters, ridges, beacon towers, star field, stronger guide rails, and enemy target halos. Player shots now render twin world bolts plus HUD pulse streaks. Hidden in-app browser smoke test launched cursor mode, rendered the upgraded arena, fired once, dropped ammo from 30 to 29, and captured visible twin shot streaks. A full human three-wave completion remains unverified.

The user volunteered to perform further tests. Browser control was stopped to leave that playtest undisturbed. Development URL: http://localhost:5173. Production preview URL: http://localhost:4173. Local servers may need restarting if the environment closes them.

## Manual test sheet

Record browser/version, machine, screen resolution, input mode, build/date and result for each item. Do not mark these complete merely because unit tests pass.

- [ ] Cold load reaches an enabled launch button quickly in the procedural arena.
- [ ] Real user click captures mouse; rejection remains recoverable.
- [ ] Cursor fallback allows movement/aim/fire, including after Escape/resume.
- [ ] WASD and E/Q feel predictable; diagonal movement is not faster. Automated check now confirms forward flight does not climb while looking up.
- [ ] Shift boost behaves correctly near level boundaries.
- [ ] Rotated aim matches crosshair hits at near/far ranges.
- [ ] R reload works with a partially depleted magazine.
- [ ] Pause while holding fire/boost; resume without unintended input.
- [ ] Pause during wave delay and reload; no gameplay progress while paused.
- [ ] Switch tabs during either input mode and recover the game without refresh.
- [ ] Clear all three waves and observe score/result/local best; retry.
- [ ] Die and observe defeat; retry without stale input.
- [ ] Storage unavailable: results still display and retry works.
- [ ] Procedural arena cover and enemy hit volumes behave consistently; document cover inconsistencies.
- [ ] Reduced overlay setting and sensitivity are usable at the target screen size.
- [ ] Ten sorties: record resource/latency growth and any errors.

## Known release gaps

Player collision is currently bounded by a simple arena, not a final collision system. Enemy shooting/melee range and cover fairness need revision. Audio, settings persistence, controller support, reliable mobile interaction, paid delivery, versioned progression saves, asset provenance, and measured performance targets remain open. Cosmetic timers may still run while paused. Reload-based replay and copying unused public assets are acceptable prototype shortcuts but should be replaced before premium release. Cursor mode hides the scene on tab loss without always revealing the resume overlay; Escape is the current recovery path.


Browser pacing caveat: a separate page with no game/WebGL measured 300 requestAnimationFrame samples at 49.3 ms median / 51.5 ms p95 in the same automation environment. This is slower than the combat samples, so automated scheduling/visibility/host effects confound those FPS values. Resource counts, collision checks and mission outcomes are still observed evidence; do not infer a hardware FPS ceiling, reliable speedup, or engine bottleneck from these timings. Repeat in a normal foreground browser with CPU/GPU tools.

A repeat with the game tab closed measured 17.0 ms median / 33.6 ms p95 (300 idle frames). This reinforces the need to isolate tab/workload conditions; it does not prove all combat cost is automation. Installed A-Frame source also confirmed scene.pause() still renders. The app now suspends its animation loop on document hidden and restores rendering on visibility return, while gameplay remains explicitly paused until resumed.
