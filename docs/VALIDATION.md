# Validation record

## iPad touch-stage prototype — September 15, 2026

A new lightweight iPad testing scene is available at `?ipad-stage`. It deliberately avoids the full city stream and uses the existing procedural arena, A-Frame scene owner, shared Three runtime, `fly-controls` controller, weapon component, enemy component and result lifecycle. The goal is a fast mobile/touch playability surface, not a premium-content replacement.

**September 17 physical iPad Safari update:** real-device play feedback failed the current control-feel gate. The user reported that camera movement and gameplay were really bad, barely worked, and did not move properly. This supersedes the earlier in-app browser completion as a usability signal. The in-app browser still proves route lifecycle and rendering, but physical iPad Safari rejects the current touch-control model. The next pass should follow `docs/IPAD_CONTROL_RETHINK.md` and build a separate mobile-first assisted route/camera experiment instead of continuing to tune the existing dual-stick `fly-controls` mapping.

- `src/mission/ipad-stage.ts` defines the stage speed, chase camera, cyan charge gate, amber shield gate, Warden point and extraction point.
- `src/components/ipad-stage-run.ts` implements a short loop: launch, fly through one gate, receive either four charged shots or 45 shield, defeat one Warden, then hold in the extraction ring.
- `src/flight-input.ts` now samples a browser touch-flight state through the same adapter path used by gamepad input. `fly-controls` remains the only movement/look owner.
- `src/App.tsx` adds the `?ipad-stage` mode, touch-only launch path, projected stage targets, and onscreen touch controls for move, aim, altitude up/down, boost, fire and reload. The controls use `touch-action: none`.
- Touch aim was repaired after play feedback that aiming was unstable: the AIM pad now publishes drag-relative look deltas instead of a held virtual-stick offset, and `FlightInputAdapter` consumes `lookMode: delta` samples once so `fly-controls` cannot keep rotating while the thumb is held still.
- September 15 play-first pass, after direct gameplay feedback that aim still felt unreliable: the iPad stage now clamps touch look deltas, moves HUD readouts away from the pads, moves the first gates and Warden into a cleaner lane, weakens the iPad Warden for tutorial pacing, adds iPad-only weapon lock assist for the active Warden, and spawns the extraction ring dynamically ahead of the player after the kill.
- `src/components/game-manager.ts` now resets, starts, scores and stores best results for `ipad-stage` separately from Ridge, Bridgehead and wave mode.
- Earlier automated coverage: `npm test` passes **101/101**, including regressions for touch sampling, one-shot touch aim deltas and the iPad stage reward/extraction lifecycle. `npm run typecheck` passes. The September 15 play-first tuning pass intentionally did not rerun `npm test` at the user's request to prioritize visible gameplay and snapshots.
- `npm run build` passes. Latest production bundle from the completed play-first pass: `dist/assets/index-DwKbeEIz.js`.
- Production preview smoke at `http://127.0.0.1:4178/?ipad-stage&playtest` loaded the stage menu, launched the touch stage, showed live HUD, CHARGE/SHIELD target labels, onscreen MOVE/AIM pads and UP/DOWN/BOOST/FIRE/RELOAD buttons. Browser console warnings/errors were empty. The smoke screenshot showed **44 draws / 37,326 triangles / 45 geometries** in the playtest build. The final preview also verified `http://127.0.0.1:4178/ipad-stage`, root-relative mode links from that path, and LAN access at `http://192.168.4.53:4179/ipad-stage` with A-Frame's HTTPS/device-sensor prompt disabled for flat iPad testing. A follow-up smoke on the repaired bundle used fresh preview `http://127.0.0.1:4180/ipad-stage`, launched the touch stage, showed the HUD/gates/MOVE/AIM/buttons, and captured zero browser warnings/errors.
- Browser playthrough on the rebuilt `http://127.0.0.1:4180/ipad-stage?play-v10` used the visible touch controls only: launched from the menu, flew through the shield gate, killed the Warden from a deliberately imperfect off-left aim angle, spawned the extraction ring directly ahead, flew into it and reached the **SECTOR SECURED** result. Result snapshot: score **1603**, shield route, **20s**, **6 shots**, **0 hull lost**, **0 charges spent**. Browser console warnings/errors were empty.

Remaining gaps: this is not real iPad/Safari evidence. Touch controls and full route completion were visually verified in the in-app browser, but no physical iPad, mobile Safari gesture behavior, external-device networking, audio audition or foreground mobile performance has been certified. The browser evaluate sandbox still cannot reliably read A-Frame component expandos, so live smoke relies on visible HUD/AX state, screenshots, browser logs and earlier unit tests.

## Premium concept image set — September 15, 2026

A four-plate premium concept set was generated from the real Twin Bridge Blender reference images using the built-in ImageGen workflow. The images are saved as remote-viewable JPGs in `docs/images/`, with project PNG copies under ignored `art/concepts/red-horizon-premium/` and prompt/provenance metadata in `art/concepts/red-horizon-premium/manifest.json`.

- `docs/images/red-horizon-premium-concept-contact.jpg` shows the four premium mood targets together: bridgehead start, route choice, Warden combat and extraction.
- `docs/images/red-horizon-premium-concept-truth-map.jpg` pairs each premium concept with its Blender truth plate and records the build rule: exact route/collision/camera coordinates still come from `art/real-path/red-horizon-real-path-layout.json`.
- `docs/RED_HORIZON_PREMIUM_CONCEPT_IMAGE_REVIEW.md` records the multi-discipline studio review score: 86/100, passing as a premium concept target while preserving the runtime-art and collision boundary.
- The concepts improve the premium art target through richer Martian atmosphere, material wear, route color language, Warden telegraph readability and extraction payoff.
- The generated images are not runtime geometry evidence. Bridge widths, towers, pad dressing, fog, VFX and material detail are aspirational until rebuilt in Blender/runtime against the supplied `level1.glb`, `avi-jetbike.glb` and `enemy.glb` source set.
- `python scripts/verify-red-horizon-premium-concepts.py` passes and verifies the tracked JPG hashes, source-reference links, model references, full prompts and truth-level caveats.

Remaining gaps: implement the useful concept details as real Blender/runtime assets, run browser captures from the same beats, validate collision/camera with natural input, and keep publication rights evidence separate from visual mood approval.

## Real-model path image pass — September 15, 2026

The old Bridgehead visual target and the later cannon-launch composition were rejected as the next design direction. The current pass uses the supplied level, navmesh, AVI jetbike and Warden files as the visual source of truth. The selected mission is now **Twin Bridge Run**: start on a measured left bridgehead surface, choose the real upper bridge or real lower bridge, fight the Warden in the right industrial court and extract at the far-right outpost pad.

- `art/real-path/real-level-feature-report.json` was generated by importing `public/models/level1.glb` in Blender 5.2.1 and converting mesh bounds into the same normalized full-level coordinate frame used by `scripts/build-full-level.py`. The report found the actual upper bridge sequence around `z≈-11.8` and the lower bridge sequence around `z≈10.7`.
- `art/real-path/red-horizon-real-path-layout.json` now records the Twin Bridge Run path contract, including real model anchors, high/low route points, Warden position, extraction path, camera contract and current limitations. The cannon is recorded only as a background landmark.
- `scripts/build-red-horizon-real-model-path.py` opened `art/full-level/full-level.blend`, added non-runtime route overlays, imported the actual `avi-jetbike.glb` and `enemy.glb` for scale, rendered eight raw images and saved a separate local design scene at `art/real-path/red-horizon-real-model-path.blend`. Runtime GLBs were not exported or modified by this script.
- `scripts/annotate-red-horizon-real-model-path.py` produced eight annotated design images, a contact sheet, and remote-viewable JPGs under `docs/images/`. Obsolete `red-horizon-cannon-launch.jpg`, `red-horizon-chasm-fork.jpg` and `red-horizon-low-pipe-crossing.jpg` were removed so remote evidence does not show the rejected direction.
- The latest Blender pass uses Workbench rendering for fast design iteration. Visual review confirmed the route is based on the supplied model, the high bridge shot clearly shows the upper bridge modules, the Warden reads as an elite rival rather than a giant replacement boss, and extraction is a separate outpost target.
- Grounding receipts in `art/real-path/manifest.json` show all 9 high-route points, all 9 low-route points and all 4 extraction points rendered as `surface-decal`; no route point is flagged `air-gate-needed`. The measured hover lane is 0.45 m above the raycast surface at each point.
- Python syntax checks passed for both scripts with `python -m py_compile`.

Remote-viewable JPGs are tracked under `docs/images/` for chat review. Heavy `.blend` and PNG render outputs remain local ignored art evidence.

Remaining gaps: this is design evidence, not a runtime acceptance pass or final art. The real-model path still needs exported mission markers, resident simplified collision, runtime route rewards, browser captures from the same eight beats, natural mouse/route playtests, foreground performance and rights records saved in the repo before any publication claim.

## Current mouse stability repair — September 13, 2026

A human play report found vertical mouse movement was unstable: moving up/down could make the camera feel like it was spazzing out. The fix keeps `fly-controls` as the only camera/input owner and changes the mouse path rather than replacing A-Frame: vertical mouse gain is now intentionally lower than yaw, cursor-mode jump deltas are rejected and re-anchored, pointer-lock deltas are clamped, and invalid deltas still do nothing.

- `npm test` passes **98/98**, including a new regression where a huge cursor Y jump and a huge pointer-lock Y delta cannot snap pitch to its clamp.
- `npm run typecheck` passes and `npm run build` passes. Production bundle: `dist/assets/index-CpCt9gB4.js`.
- Production preview smoke at `http://127.0.0.1:4177/?bridgehead&playtest` launched through cursor aim and reached the live Bridgehead HUD. Browser automation could read the DOM but not A-Frame component objects from its evaluate sandbox, so live injected mouse-spike telemetry remains covered by the Node component regression rather than page telemetry.

Remaining gaps: natural human mouse feel must be retested in the foreground browser, especially pointer-lock mode and right-drag cursor mode, before claiming this is comfortable enough for acceptance.

## Current input adapter polish — September 13, 2026

Red Horizon now has a small flight input adapter in `src/flight-input.ts` for standard browser gamepad sampling. It keeps `fly-controls` as the single movement/look owner: gamepad move/look/boost samples are merged into the existing yaw-only movement, pitch-only camera aim, camera collision and player velocity path. Mouse capture and cursor-drag behavior remain separate and unchanged.

- `npm test` passes **97/97**, including new adapter tests for deadzone handling, normalized 3D move vectors, boost/altitude mapping and `fly-controls` integration without mouse capture or drag mode.
- `npm run typecheck` passes and `npm run build` passes. Production bundle: `dist/assets/index-CN17VFPw.js`.
- Production preview smoke at `http://127.0.0.1:4176/?bridgehead&playtest` reached the live Bridgehead HUD through cursor-aim fallback after the change: route guidance, HUD, tactical map and renderer telemetry were visible. This verifies the browser-safe launch path still works; it is not physical gamepad hardware evidence.
- The collision-library decision is unchanged: retain the resident triangle collider in production. If future foreground profiling shows collision query/build cost is a real blocker, evaluate a pinned `three-mesh-bvh` broadphase against `scripts/benchmark-triangle-collider.cjs`, existing route sweeps and reciprocal cover tests before admitting a dependency.

Remaining gaps: physical gamepad feel, controller remapping UI, touch/mobile input, real pointer-lock full-route pass, natural human route completion and foreground performance remain manual acceptance items.

## Current textured Bridgehead visual slice — September 13, 2026

This supersedes the untextured v2 route-art counts below. The authored Blender scene at `art/bridgehead/bridgehead-v2.blend` now rebuilds `public/models/bridgehead-route.glb` from custom editable meshes with bevel normals and embedded panel/grain texture images. The export receipt is `art/bridgehead/verification.json`: GLB SHA-256 `9ce7bc765f3b4ae4c111f1202772a6de05e4fb58b761e2a228813908e440387b`, **215,660 bytes**, **2,593 triangles**, **5 meshes**, **5 materials**, **5 embedded textures**, 217 editable mesh objects, 19 exact collision references and 16 mission markers. The original `public/models/level1.glb` source hash remains `44de04d5ad33ccfd7f3e7ccab24040c6901a543306f1d2bdfa7c2330347455db` and is linked as scale-three context.

- Blender 5.2.1 LTS regenerated the review image set: `art/bridgehead/v2-launch.png`, `v2-fork.png`, `v2-high-descent.png`, `v2-low-bridge.png`, `v2-low-turn.png`, `v2-high-court.png`, `v2-low-cover.png`, `v2-low-peek.png`, `v2-exit.png` and `v2-overview.png`. Visual review caught a reversed `RISE + TURN` low-route callout; the label facing routine was corrected and the renders were regenerated.
- Production build passes with runtime `dist/assets/index-DjLJ3PCI.js`. `npm test` passes **95/95**, `npm run typecheck` passes, and `npm run build` passes.
- Final in-app-browser packaged smoke at `http://127.0.0.1:4175/?bridgehead&playtest` passed both authored routes plus the loss/retry lifecycle. High route defeated the Warden in **14 shots**; low route in **17 shots**. Both win-route resets settled at **75 geometries / 54 textures**. Loss/retry cycles settled at **77 geometries** without growth. Embedded combat scheduling was **521 samples, 30.8 ms median / 33.2 ms p95** at a 713x720 render surface. This is still an embedded-browser diagnostic, not the scorecard foreground-performance proof.
- Runtime image captures from the final build were saved locally in the ignored `evidence/runtime-inspection/` folder: `launch-1789330496177.png`, `fork-1789330497800.png`, `high-bridge-1789330499426.png`, `low-bridge-1789330501158.png`, `court-1789330502704.png` and `extraction-1789330504263.png`, each with matching JSON metadata. They are posed inspection captures, not natural-input or human-comprehension evidence.
- Mission guidance now names player actions from the play-by-play and the low-route armored Warden objective points to the north peek marker when cover blocks line-of-sight. The same cover state remains owned by the active collision world.

Remaining acceptance gaps are unchanged: no fresh-player cohort, no natural native captured-mouse full-route pass, no declared foreground hardware performance session, no scored human acceptance, and no independently inspected commercial-rights file. Owner attestation remains recorded; no publication or storefront action occurred.

## Current full-level collision candidate — September 13, 2026

Full detail and reproducible procedures: [BRIDGEHEAD_CANDIDATE_2026-09-13.md](BRIDGEHEAD_CANDIDATE_2026-09-13.md). This supersedes older visual-only terrain and camera statements below.

- 71 tests, typecheck and production build pass. Frozen runtime `index-RxlphQpx.js`; ID `170838fed376056a0ecc27400c9d2054918e6df2c6c188e6d446dbb61a8644f9`.
- 42 actual-browser smoke assertions pass with zero captured warnings/errors. Final win/reset and short loss/reset geometry stays83; textures51. Pause-safe extraction, named animations, terminal result uniqueness, missing-actor recovery, QA score isolation, streaming and fallback have recorded checks.
- Ten full programmatic-input wins/retries completed without position/health injection after launch. Five pairs all settle at83 geometries/51 textures/172065 fixed collision triangles. High9 shots, low14 shots, 100 hull each. Both missing-environment/route-art branches also completed, settling40 geometries/4 textures. Programmatic, scripted loss and human evidence remain separate.
- Real coarse-GLB CPU sweep diagnostics clear the two route paths at radius0.7; seven authored solids exactly match Blender receipt and eleven marker positions. All original source bytes preserved. New route art207480 bytes/2852 triangles/5 materials/0 textures; Blender roundtrip and four80° vertical-FOV compositions inspected.
- Final embedded1280x720 combat:119 waits, median30.6ms/p9532.5ms. Empty page:300 frames, median31.2ms/p9531.6ms. This misses <=20ms and cannot certify target-hardware performance. Native capture rejected by embedded browser; recovery through drag aim observed. Human flight feel, natural full win/loss retries, foreground performance and the fresh-player score remain open. Rights recorded as owner attestation; no independently inspected license files or release certification.

Baseline recorded September 13, 2026. This is a playable development prototype, not a release certification.

## Bridgehead Run candidate — September 13, 2026

- A separate `?bridgehead` candidate now uses the complete streamed level as visual context while keeping the existing `?full-level` survey intact. The implemented loop is launch -> choose measured north/south bridge entry -> receive an exclusive charged-shot/shield reward -> cross the matching bridge exit -> defeat one GLB Warden -> pause-safe extraction -> scored result/retry. Entry and exit crossings are swept along +X to match the measured bridge direction; the Warden cannot spawn before the chosen bridge is crossed. Collision is three authored combat-cover proxies and bounded flight volume; it is not a Blender-certified terrain collider.
- Three adversarial role reviews are recorded in `BRIDGEHEAD_RUN_SCORECARD.md`, `ART_DIRECTION_CRITICAL_BRIEF.md`, and `PLAYER_ADVOCATE_AUDIT.md`. The art review disproved the earlier 4.8 m runtime-size assumption: the previous height-first normalization produced an approximately 6.275 m long bike against approximately 1 m source bridge decks. Active runtime now targets 1.8 m height with no minimum-length expansion and uses a closer 1.45 m / 5.4 m chase boom. The source deck remains visual context beneath a flight channel; no rail-clearance claim is made.
- `npm test`: **46/46 pass**. Typecheck and production build pass. Tests cover +X swept gates, exclusive rewards, transparent completion score, detached-Warden rejection, pause-safe extraction, named animation selection/cross-fade, and existing control/rendering contracts.
- Packaged in-app-browser `?bridgehead&playtest` smoke passed **38 functional assertions** across invalid routing, both routes and the loss path: a pre-entry exit cannot skip the fork, an unboosted high entry cannot grant a reward, ordered entry/exit traversal, exclusive rewards, Warden GLB load, named idle/attack/run/death animation mapping, explicit 1.2 s disarmed recovery, ordinary weapon wins in 8/12 shots, paused extraction, result mastery telemetry, cleanup/retry, stream budgets, renderer reuse, one rendered loss result, duplicate-terminal rejection and ten scripted loss/retry cycles. Result payload/UI report route, time, shots, charged shots spent and hull lost. Death remains visible for a 900 ms simulation-time animation window before removal. Win-route resets settled at **85 geometries / 53 textures**; the nine additional loss resets held at **86 geometries every cycle**, showing a stable one-geometry warmed state rather than monotonic growth. The final console had zero warnings/errors. The browser run exposed and fixed an A-Frame lifecycle-name collision by moving animation selection from the reserved `play` hook to `playAnimation`. This fixture scripts route placement, aim, damage and retries, so it is lifecycle/combat evidence rather than natural traversal or player evidence.
- Exact-render diagnostic: the in-app browser was calibrated to **1280×720 renderer pixels** (1463×823 CSS viewport in this host). Across the two scripted Warden fights, 112 `requestAnimationFrame` waits measured **30.8 ms median / 33.0 ms p95**. This misses the scorecard's ≤20 ms p95 target and is not a foreground GPU trace; scheduling, visibility and automation remain confounders. It is a regression datum, not a performance certification or proof of the bottleneck.
- Ordinary `?bridgehead` launch was visually inspected. The compact menu kept both launch buttons visible, the lower chase view framed the bike at roughly one-fifth of the current viewport, the direct gate and upcoming landscape were visible, and a canvas drag changed aim and spent two rounds. The automation API could not sustain movement keys, so ordinary-input route completion, pointer-lock feel, four fixed 1280x720 route captures, foreground frame time and fresh-player comprehension remain open.
- The optional Game Development Studio CLI is not installed (`game-dev` command unavailable), so no sealed adapter run or hardware-performance claim exists. Repository tests/browser telemetry were used without installing or substituting tooling.

## Whole-level streaming survey — September 13, 2026

- Full-level screenshot/design follow-up: two generated concept boards were created from the user's screenshot and saved under `art/concepts/`. `docs/FULL_LEVEL_GAME_DESIGN.md` records route, scale and mission assumptions. A first pass declared `targetHeight: 2.4` and `targetLength: 4.8`, and the AVI jetbike was rebuilt with a larger body and clean reimport. The later measured art review above found that height-first normalization actually yielded about 6.275 m length; the Bridgehead candidate corrects runtime framing/scale while the aerial survey remains an inspection view.

- `npm test`:42 pass; typecheck and production build pass (`index-B3G6fJO2.js`). Eight final GLBs reimported; actual-low render caught split-vertex decimation tears, corrected by welding derived copies before simplification. Original source hash unchanged.
- Full original inspected in Blender top/oblique renders and through official MCP screenshot of opened full-level scene. Don McCurdy viewer loaded/orbited original after Chrome permissions updated;339 validation warnings remain untriaged. A successful visual import is not a clean validator report.
- Packaged Chrome `?full-level&playtest`: all4 coarse chunks visible, whole layout screenshot reviewed;3 near/far cycles passed11 streaming assertions. All3 far returns74 geometries/43 textures, zero streamed errors. 172,065 coarse triangles, selective environment budget350,000. Source original remains1,169,700 triangles offline.
- Actual Resource Timing: manifest195ms; coarse q00/q01 at359ms, q10 at481ms, q11 at513ms; high q10/q01 only at12,775ms after scripted approach. Reentries refetched at13,306ms and13,837–13,838ms. This proves separate deferred requests, not incremental byte-range decoding or faster FPS. Requests can use browser HTTP cache.
- Complete derived storage19,763,576bytes; initial coarse~8.52MB. More than original5.17MB due to baked instances/duplicate textures. GPU counts plateau under tested cycles; total CPU/bitmap memory and target-hardware frame times remain open. No terrain collision, navmesh or combat in survey. Default Ridge and original sources preserved.

## Latest authored scene and mouse pass — September 13, 2026

AVI/new-bike follow-up:35 tests/typecheck/build pass (`index-CCHR1qcu.js`). Blender seated-pose render reviewed, playerGLB reimported (six meshes, valid textures), actual Chrome chase view reviewed and heading corrected180°. Diagonal drag changed yaw/pitch without pitching bike; Escape and drag resume worked. Pointer lock request rejected in automated Chrome, so human captured-mouse feel remains open. Both Ridge branches still passed17 assertions, ordinary8/11-shot wins, reset54 geometries/6 textures. New player source texture maps retained at1024; posed mesh static at runtime, editable armature in Blender. Source files preserved.

- `npm test`: 33/33 pass, including actual exported collision file traversal for both routes, authored marker matching, atomic level load, fallback, late disposal and three mouse regression cases.
- Final typecheck/build pass (`index-Cp4A2wx_.js`); wave browser regression suite also passes, with spawn/remove and ten forced retries stable at 41 geometries. Captured authored-scene console contained no errors. `git diff --check` passes with line-ending notices only.
- Embedded-browser Ridge smoke: 17 assertions pass on real shell/player/enemy GLBs. High/low routes defeated Warden using ordinary weapon logic in 8/11 shots, extracted, reset to 54 geometries/4 textures and reused the renderer. Locomotion/aiming in this fixture are scripted, not human playability evidence.
- Visually inspected final Blender render and running game: canyon/bridge/outpost shell, seated animated bike, high/low rings and restored sunset sky. Actual browser canvas drag visibly rotated view and fired only while left held. Native pointer-lock and right-drag human ergonomics remain unverified; unit tests cover locked relative input and drag gating.
- Export/reimport receipt: seven shell meshes, 33,197 triangles, 2,629,384 bytes; 24 conservative collision boxes. Above earlier 1.5 MB shell target; no new claim of 60 FPS or premium readiness. Both routes pass solver sweeps, but visible-mesh/proxy boundary polish remains.

## Earlier Windows / Blender / Ridge Run pass — September 13, 2026

This section supersedes older current-state claims. Host inventory: AMD Ryzen 5 5600X, NVIDIA GeForce RTX 3060, with Microsoft Remote Display Adapter also present. Browser: Codex embedded Chromium 152 on Windows; fixed 1280×720 viewport/render pixels for diagnostics. This does not prove which physical GPU serviced the browser or foreground hardware performance.

### Build and behavior

- Repaired out-of-sync `package-lock.json`; original `npm ci --legacy-peer-deps` failed because the lock omitted current Vite dependencies. Regenerated the lock, then clean installation succeeded. Large lock diff removes stale CRA-era dependency graph. npm reported eight dependency findings (one low, five moderate, two high); release triage remains, no forced major upgrade was applied.
- `npm test`: **24/24 pass**; active-entry typecheck and production build pass. `git diff --check` passes, with Windows line-ending notices only. Candidate runtime bundle: `index-f85CJU-a.js`.
- Production now explicitly includes `models/enemy.glb` (1,054,800 bytes; SHA-256 `16415bf5a5b8dfa0440c7689451eb68f5a4b724ab74bb862a1cec7ceb54cdb69`). Earlier build config copied only vendor files, so earlier packaged authored-GLB claims must not be treated as proved model admission.
- In-place reset retains scene/renderer and restores player, input, enemies, effects, weapon, clocks, score and React result state. Browser wave fixtures passed **23 assertions**, including ten forced alternating win/defeat retries. Enemy cleanup and reset both returned 41 geometries across all ten fixture cycles. These forced endings are not ten full combat missions.
- Optional `?ridge-run`: high boosted forward gate grants three double-damage shots, low gate grants 30 shield; defeat Warden, hold extraction for one simulation second, reset. Real packaged Warden GLB loads. Named idle animation is used; final attack/death choreography is not implemented.
- Hero loader now uses A-Frame's own loader/Draco runtime, disposes owned resources and late loads after removal, and normalizes detached from translated enemy parents. Regression tests cover disposal and translated-parent alignment. Final browser screenshot visibly shows the spiked Warden aligned with the combat target.
- Ridge browser smoke passes **17 assertions**: both swept route choices/rewards, both real GLB loads, ordinary weapon defeats (high eight shots, low eleven), charge consumption, paused extraction, win, reset and renderer identity. Scripted movement/aiming places the pilot; it does not prove a human can navigate the route. Reset resource counts are 41 geometries / 2 textures on both routes. Captured warning/error logs were empty.
- Repeated the final Ridge smoke five times without reloading (ten short scripted route/combat/extraction runs). All returned 41 geometries / 2 textures after reset. This extends lifecycle evidence to real weapon kills and extraction, but still skips natural traversal through scripted positions and is not ten full-length human sorties.

### Asset and design evidence

Final production combat diagnostic (`index-f85CJU-a.js`, 1280×720): wave-three victory, score 11,900, 93 shots, 989 warmed frame intervals, median **31.2 ms**, p95 **32.1 ms**. Geometries 41 → 43 at result, settling to **41**. The earlier same-session build before hero cleanup settled at 45 after combat; final disposal removes that observed residual geometry. Encounters are not seeded and timings are embedded-browser scheduling samples, so this is not a controlled speedup or 60 FPS claim. Final wave/retry fixtures also passed all 23 assertions.

All six sources imported and rendered in Blender 5.2.1 LTS; hashes, bounds, images and animations recorded under `art/inspection`. Visual review established bridge/chasm/outpost level motifs and the grounded rocky Warden silhouette. The source bike renders magenta and has two images Blender cannot decode. A separate material-replacement study exports and displays in Don McCurdy's viewer; first white-emission defect was corrected on inspection. One viewer warning remains untriaged; runtime bike admission is not claimed.

Official Blender MCP was configured and verified through real MCP initialization, 26-tool discovery and successful read-only scene queries. The live GUI was preserved. New native tool discovery may require restarting Codex. See `BLENDER_MCP_SETUP.md`.

`art/ridge-run/` contains an editable candidate Blender blockout, render and separate shell/proxy/marker GLBs. Reimport succeeds; five marker coordinates round-trip within 1 mm. It is not integrated gameplay collision or extracted city art. Two generated concept boards and exact prompts are under `art/concepts/`; neither is a gameplay screenshot.

### Evidence still required

Natural input traversal of both routes, real pointer capture, ten full-length natural sorties, foreground CPU/GPU profiling, authored geometry collision/occlusion agreement, animation-state review, denied/failed asset browser matrix, fresh-player comprehension/replay and commercial provenance remain open. No human enjoyment, price acceptance or premium readiness is inferred from the automated passes. The PRD defines the observe → one fix → same regression → fresh-player retest loop.

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
