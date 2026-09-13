# Validation record

Baseline recorded September 13, 2026. This is a playable development prototype, not a release certification.

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
