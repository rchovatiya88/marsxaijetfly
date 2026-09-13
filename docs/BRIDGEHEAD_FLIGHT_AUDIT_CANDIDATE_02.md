# Bridgehead flight and combat audit for candidate 02

September 13, 2026. This is an implementation audit of candidate 01 and a capture procedure for the next authored iteration. Candidate 01 remains frozen under `evidence/bridgehead-candidate-01`. This document is not a fresh-player score and does not change the acceptance contract.

## The short completion time is a design finding

The recorded ten programmatic wins ended with 100 hull; highs used nine shots and lows fourteen. The replay knows enemy state and exact landmarks. That establishes repeatability, while leaving the depth of the encounter unproven. `docs/BRIDGEHEAD_CANDIDATE_2026-09-13.md` and `evidence/bridgehead-browser-input.json` retain the original evidence.

The active weapon deals 25 damage at a 0.16-second cooldown. Against 280 hull, ideal ordinary fire needs twelve hits, lasting eleven intervals or 1.76 seconds. Three charged hits reduce that to nine hits/eight intervals or 1.28 seconds. These are theoretical best cases, not human performance. Misses and aiming explain longer recorded shot counts.

The Warden locks its target at the beginning of its 850 ms warning. Normal flight moves 8.5 m during that warning, while its projectile tests a 0.9 m hit radius. After a miss, the bolt can continue for three seconds, then starts 1.2 seconds of disarmed recovery. A stationary target can therefore be killed before the first complete attack/recovery cycle. Continuous strafe is an inexpensive answer to every identical warning; the current evidence does not show a reason to stop, choose cover or time a charge.

The Warden does not exist until court arrival. Consequently neither bridge has incoming fire. “Exposed high route” currently describes an arrival sightline, not sustained danger on the route. The reward distinction is implemented, but the source bridge is scenery during a safe transit. Unlimited boost is available on both branches.

The next Blender play-by-play should show a safe launch, a readable fork, distinct approaches, a visible enemy warning, at least one intentional spatial response, a readable opportunity to strike, and extraction. Length should come from those decisions rather than slowing the player simply to reach a target duration. Agree those beats and their spaces before changing weapon or enemy numbers.

## Measured contracts that must agree in the next scene

| Concern | Candidate 01 implementation | Consequence to inspect |
|---|---|---|
| Player collision | One sphere of radius 0.7 m at the player root | A roughly 4.7 m bike has nose/tail outside the protected volume. A center sweep cannot certify no body penetration while turning. |
| Hero origin | `hero-model` normalizes its model minimum Y to zero, inside `#jetbike` | Body placement depends on the bike entity transform as well as its model bounds. |
| Legacy hover | `weapon-component` animates `#jetbike` local Y from -0.5 to -0.45 and rolls it by about one degree | Prior Blender clearance calculations with bike base at player Y overstate body clearance by roughly 0.5 m. The previous minimum 0.818 m becomes about 0.318 m before accounting for roll. This arithmetic is not a new surface sweep. |
| Camera | Local boom height 2.5 m, distance 6.2 m; a 0.25 m swept camera radius shortens it against the fixed world | Near the north turn, the art study found a cannon behind the player. Actual shortened-camera framing must be captured, not inferred from the nominal boom. |
| Projectile origins | Legacy local offsets `(±0.72,-0.55,-1.6)` under the hovering bike | Effects begin about 1.0 m below player Y and about 0.55 m below the normalized GLB base. These are not authored muzzle sockets. |
| Player cover gate | Camera ray chooses a hit; one center muzzle ray determines whether damage may occur | The visible left/right bolts are not individually traced. A center-clear, side-blocked arrangement can still draw a bolt through cover; align collision and both authored sockets. |
| Aim assist | Minimum 1.4 m target width/depth; angular forgiveness grows with distance, up to radius 4 m | Around 12 m camera distance, the fallback radius is approximately 1.64 m, wider than the actual Warden. Capture off-body aim and explain the intended forgiveness before reducing it. |
| High reward guard | Boost plus total velocity ≥14 m/s, followed by a swept +X center crossing | The check is not normal speed through the plane. A fast oblique crossing can qualify. Decide whether the authored maneuver demands forward speed, body clearance, or simply crossing while boosted. |
| West approach | North-rim approach is guidance, not a mandatory gate | A valid high entry can be reached by another airborne path. Do not claim the whole illustrated detour is enforced. |

The actor model, player collider and weapon sockets should share one explicitly authored local origin. Preserve the readable hero dimensions while checking nose, tail, head and camera, including yaw beside cover and a bridge-post near miss. Enlarging scenery changes travel distances and framing; it does not itself repair a single-sphere body mismatch.

## Posed runtime capture tour

`src/bridgehead-capture-tour.ts` exports `BRIDGEHEAD_CAPTURE_VIEWS` and `poseBridgeheadCapture(scene, viewId, launch)`. It is restricted to `?playtest`. The helper resets, launches, pauses and directly places inspection views at launch, fork, high bridge, low bridge, court and extraction. Court waits for the Warden GLB. It leaves gameplay paused.

Each call returns the exact build script, player position, bike local transform, camera world position/local boom/FOV, renderer dimensions and counts, hero/Warden world bounds, conservative projected bounds and crosshair overlap, and center/left/right muzzle-to-focus world traces. Pair the JSON with the matching screenshot. Projected AABB overlap is not an opaque-pixel occlusion measurement. Posed placement is not ordinary flight, combat or retry evidence.

Use the same six views before and after the Blender/code integration. In addition to the stills, retain moving input captures for the north turn, both bridge exits and the approach-to-combat transition. Only those moving captures can show transient clipping, camera shortening, misleading collision, or a threat appearing before it is legible.

No scene-dependent gameplay fix was made by this audit. Body origin, enlarged environment, socket placement and the encounter play-by-play remain subject to the shared Blender agreement and subsequent runtime verification.
