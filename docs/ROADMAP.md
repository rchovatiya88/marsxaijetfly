# Red Horizon delivery roadmap

**Next-agent review:** Read [NEXT_AGENT_CRITICAL_REVIEW.md](NEXT_AGENT_CRITICAL_REVIEW.md) for the September 13 critical audit, evidence limits and ordered fixes.
**Premium vertical slice:** Read [PREMIUM_GLTF_DIRECTION.md](PREMIUM_GLTF_DIRECTION.md); the next design experiment is one authored Ridge Run route with an animated GLB elite rival.
**Asset constraint:** Read [ASSET_LEVEL_AUDIT.md](ASSET_LEVEL_AUDIT.md); do not load `level1.glb` wholesale or attach its navmesh directly to the 3D flight controller.
**Master plan:** Read [PREMIUM_GAME_MASTER_PLAN.md](PREMIUM_GAME_MASTER_PLAN.md) for the ordered Ridge Run milestones and agent acceptance gates.

The selected business model is premium paid. Current working title: Red Horizon. Names, price points, and content quantities are hypotheses until tested. This backlog describes the path from today's prototype to a sellable game; unchecked items are not implemented promises.

## Current progress — September 13 browser QA iteration

- Whole-source survey implemented at `?full-level`, including bounded actual LOD fetch/eviction and42 passing tests. Read `FULL_LEVEL_STREAMING_RESEARCH.md` and `art/full-level/README.md` for verified costs and scene evidence. Next adaptation is a mapped bridge/outpost mission with fixed collision/markers; do not equate survey flight with collision-ready gameplay. Optimize duplicated textures/instance baking before expanding downloads.

- Latest authored pass: Ridge Run is default with real level-derived shell, repaired-material seated bike and GLB Warden. Both exported collision routes and 33 automated tests pass; both browser mission branches win/reset. Full scene is `art/ridge-run/ridge-run.blend`. Mouse hover drift and stale drag anchors are fixed.
- Immediate queue: (1) human foreground mouse/route playtest, (2) visible mesh/collision boundary tuning, (3) Warden attack/death choreography, (4) material and measured performance polish, (5) provenance and external playtest gates. Automated success does not close premium validation.

- P1.1: embedded-browser fixtures and three scripted full victories now verified; human input and Chrome/Firefox/Safari coverage remain open.
- P1.2: simplified swept cover collision, sliding, vertical bounds and chase-camera clearance implemented/tested. Exact art colliders and human corner testing remain.
- P1.3: 3D ranged attacks, shared cover, 850 ms telegraph and dodgeable projectiles implemented/tested. Human threat readability and enemy spacing remain.
- P1.5/P1.6: generated audio, pause/mute, persisted volume/sensitivity/reduced effects/invert-Y implemented. Mix audition and remapping remain.
- P3.1/P3.2: real frame measurements captured, bolts pooled, stars batched, healthbar geometry churn and shot lights removed. Embedded-browser median is about 31 FPS at 720p; 60 FPS gate not met.
- P3.3: production packaging reduced from about 51 MB to 3.1 MB; source assets preserved. Nested-path hosted-browser verification remains.
- P3.5: local fixture/soak panel exists at `?playtest`, with no external telemetry. This is engineering QA, not a human behavior analytics export.

## Active execution order — Windows / Blender pass

Use [RIDGE_RUN_PRD.md](RIDGE_RUN_PRD.md) as the design work order and [VALIDATION.md](VALIDATION.md) for completed checks. Blender MCP setup, model renders, a material-repaired bike candidate and generated concepts now have concrete artifacts; see [ASSET_LEDGER.md](ASSET_LEDGER.md) and [BLENDER_MCP_SETUP.md](BLENDER_MCP_SETUP.md).

1. Stabilize the running build and in-place reset; test both optional Ridge Run gate/reward paths, Warden resolution, extraction, pause and retry. Keep forced lifecycle fixtures distinct from ten complete combat sorties.
2. Capture fixed 1280×720 diagnostics on this Windows host, then a foreground CPU/GPU baseline with three comparable runs. Embedded timing does not certify hardware performance.
3. Observe five fresh players: route understanding, intentional maneuver, first hit, pause recovery and voluntary replay. Select one dominant blocker and retest after its fix.
4. Turn the approved two-route blockout into a Blender-authored bridge/chasm corridor. Export visual shell, supported box proxies, aligned ground data and versioned markers. The hazardous third route is deferred. Preserve source city and bike; the grounded Warden matches the actual model.
5. Load optional art with failure fallback, activate collider/marker changes only at launch/retry, verify both branches again and repeat the same benchmark. Map named Warden animation states and review bike/camera clearance before admission.
6. Test a fresh ten-player group, then decide content scope, saves/controller/accessibility, packaging, provenance and premium value. Full edition work follows evidence of the slice's clarity and replay.

Keep the phase gates below—scripted victories do not establish enjoyment, replay intent, or paid value.

## Phase 0 — runnable prototype

- [x] Replace the failing legacy build with Vite; preserve original game components and level assets.
- [x] Use one Three runtime owned by A-Frame; vendor A-Frame and Draco locally.
- [x] Attach the bike weapon, fix R reload, use the camera world transform for aiming.
- [x] Remove competing look control from the active scene and correct camera rig coordinates.
- [x] Pause scene simulation, spawns and reload; clear held input; cancel the HUD loop on teardown.
- [x] Add a three-wave sortie, ×1–×5 chains, victory/defeat results and local best score.
- [x] Add clear controls, sensitivity, reduced overlay effects, and cursor-aim fallback.
- [x] Add regression tests, research, agent memory, and two repo skills.

## Phase 1 — dependable combat (next)

| ID | Task | Dependency | Done when | Estimate |
|---|---|---|---|---|
| P1.1 | Run uncoached desktop playtests on Chrome, Firefox and Safari; include real mouse capture | Phase 0 | Launch, aim, move, reload, pause/resume and results verified; failures recorded with hardware | 1–2 days |
| P1.2 | Add swept player collision against a simplified level mesh | P1.1 | Boost cannot tunnel through walls; no trapping at corners; vertical flight bounds stable | 2–4 days |
| P1.3 | Make enemy shooting respect cover, use 3D range, and telegraph attacks | P1.2 | Same cover blocks both sides; player can recognize and dodge a shot | 2–3 days |
| P1.4 | Replace hardcoded enemy scale with asset normalization and align hitboxes | P1.1 | Silhouette and hitbox agree at near and far distances; no invisible target hits | 1–2 days |
| P1.5 | Introduce shot, hit, boost, damage, reload and mission audio with volume controls | P1.1 | Sound starts on interaction; pause/mute works; clear feedback without excessive volume | 1–3 days |
| P1.6 | Save sensitivity, motion and audio settings; add invert-Y and remapping | P1.1 | Preferences survive refresh and denied storage is handled | 1–2 days |
| P1.7 | Replace page reload restart with a complete mission reset | P1.3 | Ten consecutive restarts show no stale enemies, listeners, timers or GPU growth | 2–3 days |

Gate: ten external sessions, eight unassisted first hits, zero supported-browser launch blockers. These are internal acceptance targets, not industry statistics. Diagnose failures before adding content.

## Phase 2 — distinctive flight (design proof)

| ID | Task | Dependency | Done when | Estimate |
|---|---|---|---|---|
| P2.1 | Prototype boost-through charge gates and one empowered shot | P1.2–P1.5 | Route selection changes attack opportunities and can be learned without a manual | 2–3 days |
| P2.2 | Author one 3–5 minute mission: launch, fork, mixed encounter, extraction | P2.1 | Objective always visible; completion has a satisfying payoff | 3–5 days |
| P2.3 | Add two mutually exclusive mission upgrades | P2.2 | Both choices meaningfully change the next encounter; neither is always best | 2–3 days |
| P2.4 | Compare wave-only and gate/route versions with fresh players | P2.3 | Evidence identifies whether the new mechanic improves replay and recall | 2 days |
| P2.5 | Establish visual identity and a ten-second gameplay clip | P2.4 | Viewers can describe the flight/combat hook without explanatory narration | 2–3 days |

Gate: at least five of ten players independently choose another run, and most can explain the flight mechanic. If it fails, allow one bounded redesign and retest before expanding production.

## Phase 3 — public demo candidate

| ID | Task | Dependency | Done when | Estimate |
|---|---|---|---|---|
| P3.1 | Profile representative load on an agreed minimum laptop | Phase 2 | Capture FPS/frame-time, draw-call and memory evidence at declared settings | 1–2 days |
| P3.2 | Pool effects, reuse raycast data, reduce material/draw-call count | P3.1 | Measured bottleneck improves without visual/gameplay regressions | 2–5 days |
| P3.3 | Package only necessary demo assets, local fonts and decoder licenses | P3.2 | Cold start and nested-path hosting work with no mandatory external runtime request | 1–2 days |
| P3.4 | Verify provenance/license for every shipped model, texture and audio file | Before public distribution | Asset ledger includes source, commercial rights and required attribution | 1–3 days |
| P3.5 | Add optional local playtest event export | P2.4 | Launch/first-hit/result/replay events include build version; no unsolicited external telemetry | 1 day |
| P3.6 | Prepare an honest demo page and feedback form draft | P3.3–P3.5 | Real screenshots, requirements, controls and clear prototype scope | 1–2 days |

Gate: public demo release candidate survives full browser QA, repeat runs, and asset review. Publication itself remains a separate distribution action.

## Phase 4 — paid full edition

Proposed scope to validate: three authored regions, roughly nine short missions, three substantially different weapons, a small upgrade system, one memorable boss, a time/score mastery mode, and reliable saves. This is an initial scope ceiling, not a feature commitment. Test willingness to pay for the actual package at proposed $9.99 and $14.99 price points before locking production costs.

| ID | Task | Dependency | Done when |
|---|---|---|---|
| P4.1 | Choose downloadable itch.io, Steam, or explicitly paid browser distribution | Demo evidence | Delivery model, actual fees and support obligations documented |
| P4.2 | Produce a packaged desktop proof, if choosing downloadable | P4.1 | Works on clean target OS; offline assets, saves, window resize and external links verified |
| P4.3 | Add controller support and accessibility pass | P4.2 | Complete mission without mouse; glyphs match active input; all menus operable |
| P4.4 | Expand authored content using the proven mission format | Phase 2 gate | Each region introduces a new decision, rather than only a color change |
| P4.5 | Add versioned save migration, reset, recovery, and backup | P4.2 | Update from prior build preserves progress; malformed save does not prevent startup |
| P4.6 | Produce store assets and accurate feature/support claims | P4.3–P4.5 | Trailer uses shipping gameplay; screenshots and supported platforms match the build |
| P4.7 | Price and budget review with actual unit economics | P4.6 | Development spend has a bounded downside and documented break-even assumptions |
| P4.8 | Ship candidate, perform platform review, and plan patch support | P4.7 | Release checklist passes, bugs triaged, rollback build retained |

Do not implement payment or entitlements as a client-side localStorage flag. Do not publish the complete paid edition as an unrestricted free browser demo. Accounts, store fees, contract acceptance, purchases and announcements need their own explicit user actions/authorization.

## First next-agent task

Start with [PREMIUM_GAME_MASTER_PLAN.md](PREMIUM_GAME_MASTER_PLAN.md), [ASSET_LEVEL_AUDIT.md](ASSET_LEVEL_AUDIT.md), `AGENTS.md`, the latest section in `docs/PROJECT_MEMORY.md` and `docs/VALIDATION.md`. Inventory the dirty tree and source assets, create the asset ledger and Ridge Run export contract, then run the fixed browser QA baseline before changing gameplay. Keep the single controller and shared runtime until comparative evidence supports migration.
