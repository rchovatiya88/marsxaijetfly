# Bridgehead Run: vertical-slice contract and adversarial scorecard

Design review: September 13, 2026. Status: acceptance contract with an implemented engineering candidate, not a human playtest result or premium-ready certification. This document does not replace historical evidence in `VALIDATION.md`. It makes the next build decision explicit.

Latest candidate evidence: `?bridgehead` implements ordered entry/exit traversal, exclusive route rewards, the real Warden GLB with idle/attack/run/death state mapping, a 1.2 s disarmed recovery, pause-safe extraction, a result with route/time/shots/charges/hull telemetry, and retry. The packaged smoke passes 38 assertions and 46 Node tests/typecheck/build pass; it also rejects a pre-entry exit skip and an unboosted high-route reward. Win resets settle at 85 geometries/53 textures and nine additional scripted loss resets remain flat at 86 geometries, with no captured warning/error logs. It covers a rendered loss, duplicate-terminal rejection and ten scripted loss/retry cycles, but those are not natural full sorties. Because this scorecard awards only complete halves, the candidate has **no certified score yet**: ordinary-input traversal, the remaining failure matrix, fixed foreground performance and every player-facing criterion remain unrecorded.

The latest embedded diagnostic used an exact 1280×720 renderer surface and measured 112 scripted combat frame waits at 30.8 ms median / 33.0 ms p95. It fails the engineering p95 threshold and is not one of the required declared foreground runs. Do not award the performance half from this evidence.

## Decision

Build one **Bridgehead Run** mission on the actual full-level bridges and right outpost. Keep the small Ridge Run as a regression/mechanic fixture and `?full-level` as a clearly labelled survey until the new mission passes its own checks. The whole environment supplies context; only an authored, collision-verified corridor supplies gameplay. Do not add waves, a third route, a campaign or a second weapon before this slice is evaluated.

The desired player statement is: “I took the exposed upper bridge for three charged shots, dodged the Warden's volley, then extracted.” The alternative must be equally legible: “I took the lower bridge for a shield and a protected approach.” These are hypotheses to observe, not words to put into a tester's mouth.

## Evidence and limits

Reviewed: `AGENTS.md`, `PREMIUM_GAME_MASTER_PLAN.md`, `FULL_LEVEL_GAME_DESIGN.md`, `PROJECT_MEMORY.md`, `ROADMAP.md`, `VALIDATION.md`, the premium-playtest skill, `src/mission/ridge-run.ts`, `src/components/ridge-run.ts`, shared world/streaming code, and the full-level manifest and top render. Relevant prior research lives in `FULL_LEVEL_STREAMING_RESEARCH.md` and `RIDGE_RUN_RESEARCH.md`.

Observed source geometry is a dark chasm with two bridges, a western elevated tower and eastern industrial court. The asset-authoring agent measured the normalized south bridge segments at X -10.8 to 7.2, Y -3.42, Z 10.70, and north segments at X -6.94 to 1.06, Y -1.01, Z approximately -11.8. These are reported segment placements, **not certified traversable deck surfaces**. Buildings are approximately 2 m high. The latest runtime hero measures approximately 1.306 m wide, 2.4 m high and 6.275 m long: declaring `targetLength: 4.8` alongside a height target did not establish a 4.8 m maximum length.

The source normalization is uniform 0.1, horizontally centered, Y-up runtime. Manifest bounds are X [-40.1801, 40.5409], Y [-36.9988, 17.6077], Z [-35.1794, 36.3796]. Full-level survey spawn is outside the southern bounds and above the highest landmark; it is an inspection camera, not the mission start.

Current Ridge code has choice → Warden → extraction → complete, three double-damage shots consumed even on misses, no charge expiry, 30 shield, and a one-second extraction. Gates only support forward -Z crossings; Warden and extraction are fixed arena coordinates. That component does **not** implement this new route. Current full-level streaming evidence demonstrates deferred detail requests and bounded tested GPU resource counts, not terrain collision, fun, or target-hardware frame rate. No fresh-player evidence is available for this contract.

## Weighted 100-point scorecard

For each row, award half its points for the engineering criterion and half for the player-facing criterion. A half is awarded only in full, when its whole criterion has recorded evidence; unknown or partial evidence earns zero for that half. Record exact build, test procedure, hardware, settings, sample and evidence path. This prevents attractive art or many unit tests from masking an unusable mission.

| Category | Weight | Engineering half | Player-facing half |
|---|---:|---|---|
| Flight and camera | 20 | Both routes traversed with ordinary inputs; zero tunnelling/trapping at authored boundaries; captured and cursor input, pause/resume and retry verified | At least 8/10 fresh players launch, steer and make an unassisted first hit within 90 seconds; no camera-occlusion blocker |
| Route decision and readability | 20 | Ordered markers, exclusive rewards and real exposure/cover differences verified on both branches | At least 8/10 explain the reward and cost of their chosen route after the run; at least 5/10 intentionally try the other branch on a voluntary replay |
| Combat fairness and feel | 20 | One consistent telegraph/lock/projectile/recovery loop, reciprocal cover, coherent hit/death feedback; no attack through blocking cover | At least 8/10 identify what hit them and demonstrate one intentional dodge or cover response; no unavoidable damage reported and reproduced |
| Mission completeness | 15 | Natural-input wins on both branches plus loss, retry, invalid crossing, asset failure and paused extraction; exactly one result per run | At least 8/10 know the current objective at launch, fork and extraction; at least 7/10 complete within three attempts without coaching |
| Visual/audio identity | 10 | Launch/fork/bridge/court captures checked against authored route; no missing materials, LOD holes or occlusion mismatch; sound/mute/reduced effects verified | At least 8/10 distinguish route, enemy threat and exit without relying solely on color; bike and Warden silhouettes readable in motion |
| Performance and lifecycle | 10 | Three fixed foreground runs at 1280×720 on declared target hardware: p95 frame interval ≤20 ms, p99 ≤33.3 ms after warmup, no streaming hitch >100 ms; ten complete win/loss/retry cycles show no monotonic post-settle resource growth | All ten sessions launch without a supported-browser blocker; controls remain responsive during detail changes and recovery from focus loss |
| Replay and result clarity | 5 | Result explains route, shots/charge spent, damage and time; replay preserves renderer and separates QA score; no duplicate reward exploit | At least 5/10 independently elect another run before being asked to replay and can name a concrete thing they intend to improve |
| **Total** | **100** | | |

These numerical targets are internal acceptance hypotheses, not industry benchmarks or sales predictors. Use a five-person formative round to find blockers, then a fresh ten-person round on one frozen candidate for scoring. A person coached through the route cannot be counted as an unassisted success. Record attrition and every failure; do not replace inconvenient sessions. Route-experiment participation must remain voluntary.

### Single acceptance gate

**PASS only with ≥90/100 on one frozen build, at least half of every category's points, both halves of Flight, Route Decision and Combat, and every hard prerequisite below satisfied. Otherwise FAIL/NOT YET.** No category may be discarded to compensate with polish elsewhere, and the three core gameplay categories must pass completely. Do not retroactively relax scoring after seeing results.

Hard prerequisites: zero unresolved crash, softlock, wrong-result, through-cover damage, input-loss or collider-streaming defects; both branches completed through ordinary browser input without teleport/direct health modification; ten full retry cycles; declared foreground performance conditions; all required source/derived assets have documented commercial rights before a *premium-ready* label. Without rights, an internal design/engineering pass may be recorded but not a release-ready claim. No passing score authorizes publication or proves demand.

## Route and marker proposal

Coordinate proposals below are **authoring targets**, not a loadable mission manifest. X/Z refer to the normalized original layout. Every Y marked `deck + offset` must be measured in Blender and checked against the actual collision body reference point and chase camera. Do not silently substitute Y=0. Inspect/render exact bridge endpoints before binding gate normals. Keep these proposals out of `public/mission` until round-trip and swept traversal checks pass.

| Marker | Proposed X / Z (m) | Proposed height | Facing / purpose |
|---|---|---|---|
| launch | -19 / 10.7 | measured west approach deck + safe hover offset | +X toward south bridge; start behind a clearly visible fork |
| fork | -14 / 10.7 | same clearance as launch | Preview lower bridge ahead and upper-route breadcrumb to left/north |
| low-entry | -9 / 10.7 | measured south deck + safe hover offset | +X; shield gate on bridge entry, not at a hidden canyon floor |
| low-exit | 6 / 10.7 | same verified south deck clearance | +X; require crossing before encounter approach credit |
| low-cover-approach | 12 / 1 | measured east route deck + safe hover offset | -Z; author two cover silhouettes, do not assume ornamental props are solid |
| high-approach | -11 / -11.8 | measured west north-bridge approach + safe hover offset | +X; west-rim northbound route needs its own corridor validation |
| high-entry | -5.5 / -11.8 | measured north deck + safe hover offset | +X boosted crossing; gate radius initially 2.8 m only if real clearance supports it |
| high-exit | 0 / -11.8 | same verified north deck clearance | +X; silhouette the Warden approach from here |
| court-entry | 8 / -12 | measured court deck + safe hover offset | +X or final authored approach normal; common checkpoint after either branch |
| warden-anchor | 14 / -16 | measured court floor (feet, not hover offset) | Faces entry; verify ground footprint and unobstructed aim before acceptance |
| extraction | 22 / -14 | measured court/platform deck + safe hover offset | Radius 4 m provisional; move inside a real clear platform if footprint fails |

The south bridge is ~2.4 m lower than the north segment placements. It is a **lower bridge route**, not evidence of a traversable canyon floor. The northern detour is not demonstrably faster from this launch; cut the promise “high is faster.” Its provisional advantage is damage/exposure, while low offers shield/protected arrival. Measure route distance and traversal time before adjusting rewards. If west-rim routing is impossible without major rebuilding, move launch to a verified shared west-side staging platform; do not move source scenery arbitrarily just to preserve these numbers.

Hero clearance is a first-order design question: a 6.275 m vehicle can look as if it cuts through rails even if its much smaller combat collider is technically clear. Agree desired bike proportions, then author corridor widths and camera sweeps around the measured result. Do not increase damage hitboxes merely to fix art clipping. Place an accurately sized pilot dummy and camera frustum in the Blender authoring scene.

## Mission state contract

All durations use simulation time and freeze on pause. One mission-generation token owns asynchronous work; stale callbacks cannot award progress, spawn an actor or alter active collision. Load and validate collision/markers before launch; visual LOD may change during flight but collision and objective geometry may not.

| State | Entry / player task | Exit guard and result |
|---|---|---|
| Ready | Show one-sentence mission, input choice, both route symbols; resident collision and objective silhouettes ready | Explicit launch; reset inputs, clocks, rewards, score, enemy ownership and prior positions |
| Launch | Safe 5–10 second yaw/boost stretch toward visible fork; no incoming fire | Ordered fork volume crossed; timer starts at launch, not after loading |
| Choice | Upper: 3 charged shots/exposed; lower: 30 shield/cover. Show text plus distinct icons | Valid swept forward entry crossing; reward once; lock route. High requires boost and ≥14 m/s initially, tune after real travel measurement |
| Traverse | Follow chosen bridge; opposite route cannot pay out; show endpoint not an offscreen abstract arrow | Chosen exit crossed after its entry, then court-entry; shortcuts do not skip ordered markers |
| Warden | One grounded sentinel, no roaming swarm. Start threat only after arrival/intro so streaming never delivers surprise damage | Confirmed lethal damage event for owned Warden advances; disappearance/removal is a recoverable fault, not a kill |
| Extract | Beacon activates with progress display; move to the clear court platform | Continuous 1 second inside radius; leaving resets hold; paused time adds zero; award completion once |
| Result / Failed | Show understandable performance and retry. No live projectiles or scoring after terminal state | Explicit retry returns Ready using same renderer; new mission generation, clean state |

For Warden tuning, begin with one ranged cycle: 0.85 s visible wind-up, aim lock before a dodgeable volley, then 1.2 s recovery. These timings are proposals, not current animation synchronization. Idle/attack/death use the supplied named clips; if an attack clip does not fit the projectile, use clear wind-up pose plus effects rather than pretending a rifle exists. No second attack until players can read the first. Retain three charged shots/no expiry for comparability; do not introduce the older timed one-shot hypothesis simultaneously. Initial shield is 30, not vague damage resistance.

Keep the pressure lane as a spatial approach, **cut its extra enemies/turrets for this slice**. It should establish high exposure versus low cover against the Warden, not consume the entire charged reward before the featured encounter. If line of sight cannot differ using real geometry and supported proxies, the route mechanic is still unproven even when gates award different numbers.

No forced 3–5 minute padding. First target a legible 90–180 second natural sortie and measure completion distribution; increase duration only through a demonstrated additional decision. The prior one-minute mechanic fixture and eventual 3–5 minute mission are separate scopes. Results should reward mastery without making the longer safe route an automatic loser; report route-specific personal bests before adding an overall speed leaderboard.

## Contradictions and required cuts

1. Historical “source city,” “bike rival,” three branches and “never whole level” prose conflicts with the observed chasm/Warden and approved whole-layout survey. New mission uses whole visual context, two branches and one grounded Warden; do not revive historical art assumptions.
2. “Boxes and ramps” conflicts with the current AABB solver and “no slope physics.” First author conservative boxes and flat playable approaches; ramps require a separate implementation and regression gate, not merely an exported mesh.
3. “High is faster” lacks path evidence. Use exposed damage route versus shield/cover route until timed traversal establishes a speed claim.
4. Ambient cyan machinery competes with cyan objectives; amber cannot simultaneously mean danger, safety and extraction. Preserve ambient cyan at low intensity. Use a distinctive charge icon/ring, shield icon/chevrons, threat red shape/pulse, and extraction beacon plus explicit EXIT label. Color is redundant, not the sole signal.
5. A 4.8 m scale declaration is not the measured 6.275 m bike length. Set one definitive normalization policy, then validate near railings before polishing screenshots.
6. Survey LODs contain duplicated textures and baked repeated geometry; all derived storage exceeds original. Do not call this optimization successful from triangle counts alone. Keep initial coarse context and stable route silhouette, then compare real load/frame/memory measurements before instancing/shared-texture work.
7. Current -Z gates cannot implement the proposed +X bridge crossings. Use marker normals with swept signed-plane intersection and ordered progress, not copied Ridge coordinates.
8. Current Warden-detached condition can treat actor removal as victory. The new state machine requires authoritative lethal resolution, including reset/async-removal tests.
9. Current one-minute speed bonus reaches zero after 60 seconds; a longer mission cannot inherit its economy unchanged. Defer score medals until measured route times; keep a transparent completion reward and route-specific records.
10. Passing 42 automated tests and scripted route wins cannot supply the missing player-facing scorecard halves. Do not inflate a current score by treating unobserved claims as “mostly done.”

## Bounded execution and critique loop

1. **Author:** measure proposed deck/approach/court points; settle bike dimensions; save route Blender scene, annotated top view, marker JSON and ≤35 supported collision boxes. Preserve original sources and record transform/hash. Reject markers without safe swept approach, camera room and visible destination.
2. **Implement:** separate Bridgehead mode/state machine; consume versioned marker normals and resident collision; ordered branches; exclusive rewards; one grounded Warden cycle; one extraction/result. Keep Ridge regressions and survey unchanged.
3. **Adversarial QA:** wrong-way crossing, diagonal boost, altitude bypass, both-gate attempt, pre-entry court shortcut, Warden removal, paused lethal/extraction, lose-and-retry, load failure, stale async completion and ten full sorties. Capture ordinary-input traversal, not just teleports.
4. **Formative observation:** five fresh players, uncoached; note exact confusion and input sequence. Ask neutral questions after the run: “What happened at the fork?” “Why did you take that path?” “What would you do next?” Do not explain before recording.
5. **One dominant fix:** choose the blocker with the largest effect on completion/route comprehension; change one coherent system, rerun unchanged regressions and captures. Do not respond to confusion with more decorative assets.
6. **Frozen candidate:** recruit a fresh ten-player sample and run the scorecard. Failed category triggers one bounded redesign and a new candidate/sample, not cherry-picked rescoring. If route choice still fails after that loop, cut the branch and prove one strong flight/combat route before expanding.

This document creates no playtest evidence, runtime integration, export or publication. The premium-playtest skill influenced the separation of engineering proof, uncoached behavior and commercial readiness; all three must remain visible in handoff.
