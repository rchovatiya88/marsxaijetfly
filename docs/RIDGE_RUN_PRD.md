# Ridge Run product and level design

## Decision and evidence status

Build a dependable playable sortie first, then replace its approved blockout with Blender-authored GLBs. Ridge Run is a proposed 3–5 minute Mars jetbike mission about choosing a flight line to create a combat advantage. The first playable experiment has **two branches, one charge interaction, one rival and extraction**. The hazardous third branch in the older master plan is reserved for a later iteration. This is a deliberate scope proposal to make the central decision testable sooner.

This document defines intended behavior, not a record of completed implementation. Repository observations below come from the September 13, 2026 memory, validation, asset audit and critical review, supplemented by the new Blender 5.2.1 inspection renders and JSON in `art/inspection/`. A generated concept image is an art target, not an in-engine screenshot. No fresh-player results or premium demand are established here.

The latest request explicitly prioritizes a playable version before real GLB scenes. That resolves the older documents' sequencing conflict: restore launch/combat/retry and establish the benchmark first; inspect models and prepare art in parallel; replace gameplay geometry only when its collision and mission consequences are verified. A-Frame remains the active runtime.

## Player promise

“I skimmed under the bridge to break the lock, climbed into the gate, and spent my charged shot when the rival opened.”

The game should reward anticipation, confident movement and clear recovery. Movement must change incoming danger or attack opportunity. A player who misses the gate can still win through ordinary shooting and cover. A player who chooses the exposed route should gain a useful advantage while accepting a visible threat. The mission should end with a specific improvement to attempt on the next run.

Initial audience hypothesis: desktop players who enjoy short arcade vehicle-combat or traversal challenges. Keyboard/mouse and cursor fallback are the immediate input paths. Full six-axis simulation, multiplayer, procedural campaign, economy, multiple weapons and a branching narrative are outside this slice.

## What exists and what must be created

| Area | Documented baseline | Work required for Ridge Run |
|---|---|---|
| Flight | One yaw-plane movement controller, separate altitude, boost, swept box collision, chase-camera clearance | Tune readable lane widths and approach speed against actual controller; retain control invariants |
| Combat | Ordinary weapon, reload, pooled bolts, shared cover, telegraphed enemy projectiles | One charged-shot consequence and explicit rival attack/recovery state |
| Mission | Three-wave procedural arena and React results | Authored branch progression, ambush, rival resolution and extraction |
| Retry | Historical page-reload retry; full reset unproven in existing record | Verify current session implementation; ten complete result/retry cycles before calling reset reliable |
| Art | Procedural bike/arena; optional authored enemy layer | Inspected source contact sheets, coherent corridor shell, repaired hero bike, named rival clips |
| Navigation | Planar steering and a ground-ray helper | Authored bounded ground anchors first; separate flight lanes; actual pathfinding only if required |
| Performance | Older embedded-browser timings above the 60 FPS goal and confounded by browser pacing | New Windows foreground baseline with build/settings/hardware and repeated traversal/combat |
| Product evidence | Automated success and historical visual review | Uncoached understanding, intentional movement, voluntary replay and later paid-value evidence |

Inherited model facts: `level1.glb` has 2,298 nodes and 393 glTF mesh definitions; its full layout is unsuitable as an automatic mission import. `level1_navmesh.glb` has a different source transform and is ground data. `enemy.glb` has six named idle/walk/run/attack/death clips. The source bike contains an invalid embedded PNG. `gun.glb` needs scale and texture reduction.

New visual evidence changes the design: [the level render](../art/inspection/level1.png) shows a faceted dark-rock crater/chasm, two narrow bridges, an elevated isolated industrial tower and a dense modular base with cyan machinery. It is a vertical industrial outpost, not a generic flat city. [The enemy render](../art/inspection/enemy.png) shows a hulking spiked rocky humanoid. Use it as the **Warden**, a grounded sentinel, rather than inventing a bike-riding chase rival. [The bike render](../art/inspection/jetbickavi.png) shows a long ski-like nose, seated rider and rear engine; magenta materials visibly confirm that its texture presentation needs repair. The inspected gun is a gray/blue science-fiction rifle; the `avi` character is an armored humanoid.

The [new level report](../art/inspection/level1.json) records 2,292 mesh objects and 1,169,700 triangles summed over imported objects in Blender 5.2.1. Those object totals include scene instances and are not the same quantity as 393 source mesh definitions. Do not reuse the old approximately 355k triangle claim as a whole-scene render budget.

## Mission layout and pacing

Use the inspected crater's bridge/chasm contrast as the mission identity. Extract one bridge approach and a lower passage through the dark rock; both converge at a compact Warden court below the isolated tower. Reuse a limited set of the source base's industrial silhouettes. The extraction beacon, charge hardware, navigable lower passage and court layout are new authoring work. The source bridges exist visually, but their current clearance and collision have not been approved for boost traversal.

```text
Launch / safe gate demonstration
             |
       Fork overlook
        /         \
High: bridge lip  Low: chasm dogleg
charge gate      two cover breaks
        \         /
        Shared ambush
             |
       Warden court
             |
     Extraction beacon
```

The timing below is an intended first-run rhythm, not a countdown and not measured duration. Never advance a spatial objective merely because its expected time elapsed.

| Approximate elapsed time | Beat | Player decision | Required feedback |
|---|---|---|---|
| 0–15 seconds | Launch lane | Move, aim and approach one broad safe gate | Controls readable; destination mast visible; no unavoidable damage |
| 15–30 seconds | Safe charge demonstration | Boost through gate, then fire at a low-pressure target | Gate reacts, charge icon fills, empowered hit looks/sounds distinct |
| 30–60 seconds | Fork and first warning | Choose exposed high lane or shaded low lane | Both entrances readable before commitment; warning has dodge and cover answers |
| 60–105 seconds | Route consequence and ambush | Spend charge quickly or use cover to create an opening | Clear difference in damage exposure or attack opportunity; branches reconverge |
| 105–195 seconds | Rival court | Bait the volley, reposition and attack recovery | Visible wind-up, locked aim, projectile travel and recovery cue |
| 195–240 seconds | Extraction | Cross beacon volume after rival resolution | Objective switches immediately; finish cannot trigger twice |
| Up to 300 seconds | First-run recovery allowance | Recover from missed gates or extra combat cycles | No unwinnable state caused by missed charge; useful result explanation |

Build the earliest prototype within the proven flight volume if necessary. It may be shorter than three minutes; label it a mechanic experiment. Lengthen the corridor only after camera, collision and maneuver distances work. Size gate openings from bike swept radius and camera clearance, then measure time-to-cross at cruise and boost. Do not force an arbitrary world scale inherited from the city GLB.

## Current implementation target: optional arena experiment

The implementation agent is building an optional `?ridge-run` mode in the existing arena, intended as an approximately one-minute mechanic experiment. This section records that concrete implementation target; consult the session validation record for what has actually passed. It does not implement the full authored route or the 3–5 minute pacing above.

| Element | Prototype rule |
|---|---|
| High gate | Center `(-6, 10, -8)`, radius `2.8`; forward crossing toward `-Z`, boost held and speed at least `14` |
| High reward | Three double-damage shots; misses consume a shot; no six-second expiry |
| Low gate | Center `(6, 3.5, -8)`; grants `30` shield |
| Warden | Position `(0, 0, -30)` |
| Extraction | Center `(0, 3.5, -41)`, radius `4`; hold inside for one second after the required combat resolution |

Coordinates are runtime Y-up metres. The authored Blender shell and 24 matching conservative collision boxes are now integrated, with both high bridge and roofed low routes passing solver traversal tests. Marker exports match gate constants. This proves traversability, not meaningful tactical balance: human playtests must still test exposure, protection, readability and fun. Keep `?arena` for comparison. Full scene: `art/ridge-run/ridge-run.blend`; runtime shell excludes preview actors/gates so gameplay owns their state.

## Next comparative hypothesis: one timed empowered shot

The next comparative design hypothesis is one stored empowered shot, granted by crossing an armed gate in its forward direction while boost is held. Proposed tuning: twice normal shot damage, six seconds of simulation lifetime, consumed by the next eligible shot, including a miss. This is **not the current prototype rule**, which grants three shots without timed expiry. Compare it only after the simpler reward experiment has evidence. No stacking. Crossing backward, remaining inside a gate, or oscillating across its plane cannot farm rewards. Each gate grants once per run. A miss gives normal impact feedback and visibly consumes charge; do not silently refund it.

Use a swept gate-plane crossing with a bounded aperture so high speed cannot skip activation. Record the granted gate ID and route once. Pause freezes charge duration. Retry restores all gates and removes charge. Present a shape/icon and short text such as “CHARGED SHOT” as well as color and sound. Values are test inputs, not balance facts.

The high route offers the gate plus a clear lateral dodge space but exposes the player to a warning volley. The low route blocks that warning with two solid cover edges and takes a modest detour. It retains an ordinary-damage path to victory. Do not tune both damage received and rival health differently between branches at first: isolate the effect of charge and exposure before introducing additional variables.

For the Warden, start with one ranged cycle: observe/aim → wind-up → fixed aim → projectile volley → recovery. Its rocky monster silhouette supports a planted sentinel role. The volley emitter is a proposed adaptation, not a source animation feature. Preserve at least the baseline 850 ms warning initially. Charge should shorten a successful recovery punish, not be a mandatory key. Ordinary shots remain useful. Cover and lateral/vertical movement should both answer the volley. Keep the Warden stationary or between authored valid ground anchors. A later telegraphed ground slam can use the existing attack clips after visual timing review, but is not required for the first experiment.

Map the actual GLB's named clips after viewing them. An existing punch or swipe is not automatically a convincing ranged attack; use an original muzzle emitter and explicit warning cue, or reserve that clip for a grounded close attack in a later iteration. Never describe the humanoid asset as a flying rival vehicle without building that adaptation. A missing clip must select a safe idle/procedural presentation without changing damage timing.

Result screen: outcome, elapsed mission time, route taken, charged hits, damage taken and local best. The initial mastery goals are clean extraction, a successful empowered hit and a faster alternative route. Avoid opaque score multipliers as the only explanation. Give failure cause in player language, such as “Caught by the rival volley.”

## Art direction and concept-image brief

Proposed visual identity: retain the source's faceted dark-rock chasm and cyan industrial accents, add Mars-red dust and warm sunset rim light, and keep the low route in cool readable shade. This is a re-lighting/material treatment proposal, not a claim the source is already red. Extraction uses an amber beacon with a distinct broad shape. The dark Warden needs a pale dust or controlled light backdrop to separate it from dark rock. Color is never the sole route or threat signal.

The near field carries the bike, gate aperture and usable cover edges. The middle distance carries the fork and rival silhouette. Far ridges are simplified shapes with atmospheric separation. Keep a relatively quiet patch of value behind the next decision. Avoid adding emissive strips to every structure: lighting hierarchy should identify the relevant gate and threat.

Create three clearly labeled concept images after source inspection:

1. **Player-camera approach:** third-person bike in the lower frame, high gate to one side, low shaded passage to the other, extraction mast behind the rival court; readable at 1280×720.
2. **Mission overview:** elevated three-quarter layout showing launch, two branches, reconvergence, rival and extraction. Mark route function separately from decorative buildings.
3. **Rival moment:** warning projectile line, two legitimate escape directions, intact cover edge and a visible charged-shot opportunity. No invented cinematic effect that obscures the target.

Use verified model renders as references where available. Each image caption must say “design target” and list any invented landmarks or remodeled assets. Match one concept composition with an in-engine screenshot later; a beautiful illustration does not satisfy the visual gate. Source principles and their limits are in [RIDGE_RUN_RESEARCH.md](RIDGE_RUN_RESEARCH.md).

The generated [Ridge Run direction image](../art/concepts/ridge-run-direction.png) has been visually reviewed as a **design target**. Its bridge/chasm contrast, isolated tower, warm dust and cyan gate support the inspected source identity. The navigable lower passage, extraction beacon, remodeled bike, Warden weapon/emitter treatment and enlarged Warden scale are invented or exaggerated. The image does not approve that boss size or prove a gun exists on the supplied creature. Recheck the Warden against the actual enemy render and player-camera scale before modeling; retain its grounded sentinel role. The overview arrows are planning annotations, not a playable collision map.

## Blender-to-runtime handoff

Preserve all source GLBs. Work in `art/ridge-run/ridge-run.blend` or another explicitly recorded derived file. Collections: `VIS_NEAR`, `VIS_MID`, `VIS_FAR`, `COL_PLAYER`, `COL_PROJECTILES`, `NAV_GROUND`, `ROUTE_MARKERS`, `LIGHTING_PREVIEW`, `DEBUG_ONLY`. Export only intentional collections. Apply and record transforms; verify the Blender Z-up to glTF Y-up conversion using a test marker and forward arrow.

The canonical handoff remains the master plan's shell, collision proxy, ground navmesh, far shell and `public/mission/ridge-run.markers.json`. Marker JSON must contain a schema version, coordinate convention, unique IDs, route IDs, world positions, normalized forward vectors, trigger dimensions and explicit next-state references. Validate finite values, missing references and duplicate IDs before activating a mission. Names alone must not silently define combat behavior.

Collision must use surfaces the runtime actually supports. The current box solver does not acquire triangle-mesh collision merely because a collision GLB exists. First export or derive equivalent box data for that solver; add slope/mesh support only with matching swept-collision tests. Player and projectile occlusion must agree. Ground navmesh should be exported/aligned for the handoff, but a new navmesh runtime is not a prerequisite for a stationary or anchor-based rival.

Separate optional visual readiness from gameplay readiness. A late visual shell may replace matching fallback art; a different collider/marker layout must be staged and activated at launch or retry. Never move walls underneath an active player when an asynchronous download completes. GLB failure retains the same playable blockout route. The result must identify whether authored art or fallback was used in QA metadata.

| Deliverable | Acceptance evidence | If automation cannot complete it |
|---|---|---|
| Model inspection | Neutral-light overview plus relevant close-up/animation observations; bounds and texture errors | Human opens named model and captures the same views; agent records interpretation separately |
| Blender source | Opens with packed/resolved textures; collections and route markers visible | Provide exact file, collection list and missing operation |
| Exported shell | Independent viewer and actual A-Frame load; no missing textures | Human File → Export → glTF Binary, selected collection, then return file for validation |
| Collision/markers | Debug overlay and boost/weapon checks agree at each branch | Correct the indicated collider/marker in Blender, export only its artifact, rerun failing fixture |
| Hero animation | Explicit clip names and visual state mapping | Human previews each named action; no blind first-clip selection |

Initial master-plan budgets remain ≤30 static route draws, ≤250k visible route triangles and ≤1.5 MB initial art transfer. These are ceilings, not permission to spend the entire budget. The hero bike's old separate 1–1.5 MB suggestion conflicts with the total; stage hero art later or revise the total explicitly after measurement. Keep PNG/JPEG and basic PBR first. New extensions require a proved loader/decoder path in A-Frame's actual Three runtime.

## Ordered execution and acceptance

| Stage | Concrete output | Exit gate |
|---|---|---|
| 0. Dependable build | Running preview, launch/fire/hit/pause/result checks, complete reset, declared benchmark | Build/typecheck/tests; actual browser paths; ten complete retries; three comparable benchmark runs |
| 1. Decision prototype | Two-route blockout, charge demonstration, one rival, extraction | Both routes finish; charge/miss/pause/reset correct; no collision mismatch or softlock |
| 2. First player evidence | Five fresh-player observations | At least four explain the route tradeoff and at least three voluntarily replay; internal exploratory gate |
| 3. Authored scene | Inspected/normalized kit, Blender file, validated GLBs and markers | Same mission works with art or fallback; both branches and rival remain readable; fixed benchmark retained |
| 4. Slice proof | Revised build and a fresh ten-player cohort | Eight unassisted first hits, five voluntary replays, most explain movement advantage, zero supported launch blockers |
| 5. Premium candidate | Bounded content plan, controller/accessibility, saves, clean-machine package, asset provenance | Scope and price research supported by actual play; release obligations separately verified |

Stages 2 and 4 cannot be certified by an automated pilot. Participants are currently unobserved; prepare the build and sheet while awaiting genuine sessions. Thresholds are project hypotheses, not statistical estimates or outside industry standards. One mission reaching stage 4 is a validated slice, not proof a finished premium game exists.

## Playtest and repeat protocol

Record build hash and dirty status, scenario seed, hardware, browser, input mode, viewport/DPR/render pixels and quality. Initial instruction: “Play one sortie as you normally would.” Do not explain the charge gate or suggest a branch. Observe start, first hit, first gate, first threat response, route, damage cause, result and whether the player independently chooses replay. After the decision to stop/replay, ask: “What changed because of your route?” and “What would you try differently?”

After the uncoached run, separately test reload, pause during charge/volley, focus loss, cursor fallback and immediate retry. Mark these as instructed usability checks. Store anonymous participant IDs and local observation notes; no remote telemetry is needed. Distinguish player words from observer interpretation.

After each session batch, select one dominant failure, state a prediction, change one corresponding system, and repeat the same engineering scenario. Then use fresh players for first-run comprehension. Returning players are useful for mastery and regression but cannot become a fresh cohort again. If two focused design iterations still produce no intentional route choice or replay, simplify or replace the charge interaction before expanding the level.

Acceptance log template: `build | participant | input | first-hit time | first route | charge understood | intentional cover/dodge | result | replay chosen before prompt | observed blocker | player quote | next hypothesis`. Keep performance telemetry separate from this record.
