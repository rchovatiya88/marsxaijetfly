# Environment / character art review — September 13, 2026

## Decision

The next art deliverable should be one readable south-bridge-to-outpost approach with a correctly framed rider. More scenery, higher-detail chunks or another concept board will not resolve the current scale conflict. Preserve the whole level as background context and survey evidence; do not infer a playable route from the top-down composition.

This review is read-only for assets. It inspected source GLBs in background Blender, existing renders, export manifests, player build code and camera/normalization code. No new asset bytes were exported. Source scene arrangement, original images and Ridge Run were preserved.

## Measured landmarks, not inferred waypoints

Coordinates below are runtime Y-up metres using the existing manifest's 0.1 uniform scale and horizontal recentering. They were measured from the original objects' world-space bounding boxes in Blender. They identify geometry centers, not safe player positions or final collision surfaces.

| Landmark | Source identity | Measured location / extent |
| --- | --- | --- |
| South bridge (lower on top-down image) | `SM_Bld_Bridge_01`, `_1`…`_7`, `__1_`, `__1__1`…`__10_` | Deck segment centers X -10.80..7.20, Y -3.42, Z 10.70; each deck about 1 m wide, 0.09 m thick |
| North bridge | `SM_Bld_Bridge_01_8`…`_16` | Segment centers X -6.94..1.06, Y -1.01, Z -11.97..-11.64; deck about 1.04 m wide |
| Outpost comms body | `SM_Bld_Corp_Comms_01` | Center (13.92, -0.01, -11.72), approximate size (1.65, 1.27, 2.00) |
| Western cannon upper assembly | `SM_Bld_Planetary_Cannon_01` | Center (-22.07, 2.43, -11.81), approximate size (8.77, 1.19, 10.77); this excludes its separate base/pivot geometry |
| Survey camera/player spawn | streaming manifest | (0, 24.60774, 44.37959); safely above geometry, unsuitable as a first-playable launch |

The full-level top/oblique renders confirm two bridges separated by roughly 22.5 m along Z, a deep central chasm, dense eastern outpost and large western cannon. The two bridges do not form a ready-made adjacent fork. Their deck heights differ by only about 2.4 m. “Upper bridge” in a map must not silently become “high airborne route” in mission logic.

## Failures that matter

1. **The enlarged bike is not actually 4.8 m long.** Read-only import of current `public/models/avi-jetbike.glb` gives Blender bounds approximately (1.33145, 6.39498, 2.44607). Current `hero-model` chooses `max(heightScale, lengthScale)`; with 2.4/4.8 targets, resulting runtime width/height/length is approximately **1.306 / 2.4 / 6.275 m**. The length target is a minimum. A 1.306 m bike is wider than a 1 m bridge before lateral clearance, and longer than several outpost buildings. The collision hitbox remaining small does not fix visible rail penetration.
2. **Camera occupancy and physical scale were conflated.** Current chase offset is (0,2,8), and the survey starts around Y24.6. A high aerial view makes a large vehicle appear like a map marker. Increasing the mesh to counteract that makes the surrounding kit read as miniature. Establish a human/door/vehicle scale rule and tune camera distance/pitch/FOV independently.
3. **The player studio image does not match the concept rider.** The actual AVI render is a dark, thin torso with widely reaching arms and a large pale bike body. The concept shows a bulky, clearly separated rider, bent elbows and compact rear mass. Hand/grip and foot/rest contact need side and rear orthographic checks; the current three-quarter studio image alone cannot certify them. Static baked pose is acceptable for this slice, but must not be described as riding animation.
4. **Concept imagery invents assets and clearance.** The generated chase reference adds broad bridges, large route-facing buildings, paired large thrusters, a bright extraction tower and cinematic haze. Those are targets, not existing model capabilities. Its broad ride surface directly disagrees with measured 1 m decks. Do not use it to approve source-level collision or claim “the game looks like this.”
5. **Meaning of light colors is inconsistent.** `FULL_LEVEL_GAME_DESIGN.md` says amber means danger, cover or extraction; Ridge uses cyan for extraction and high gate, amber for safe low route. Make one grammar: cyan = active objective/high route, amber = protected alternative/edge guidance, red = hostile damage. Retain shapes/text or pulse differences so color is not the sole distinction. Avoid labeling the same amber both safe reward and threat.
6. **LOD success is not route readability.** The corrected actual-low render retains chasm/bridges/outpost but smooths cliffs and simplifies thin rails/cannon detail. It is suitable as distant context. The selected ride surface and approach landmark must retain authored near detail regardless of distant chunk promotion. Current 339 source-viewer warnings still need triage, especially any that affect selected route materials or geometry.

## Smallest art work package

First agree a world scale before changing bytes. My recommendation is to retain the existing survey normalization for background, author a separate **4 m clear flight channel** around the south bridge/eastern approach, and treat the source deck as a visual bridge beneath the hovering bike rather than a driveable 1 m road. This is a proposed dimension requiring actual speed/clearance testing, not a verified lane. If the design requires riding between source rails, uniformly rescaling the level is an alternative, but it affects streaming radii, speeds, every marker and collision contract; do not hide that change inside an art export.

Then bound the art iteration to three pieces:

- **Lane study:** source `art/full-level/full-level.blend`; proposed new destination `art/full-level/full-level-route.blend`. Isolate south bridge, east landing and the approach to the comms court. Add named launch/approach/court empties, a bike envelope and camera envelope. Measure east-rim continuity before selecting a Warden floor. Do not place Warden at the comms object's center; it is geometry, not a walkable-surface sample.
- **Player/camera study:** source `art/player/avi-jetbike.blend`; proposed new destination `art/player/avi-jetbike-camera-study.blend`. Keep the current runtime GLB intact. Add side/rear camera views and correct only hand/foot contact or seat placement demonstrated by those views. Prototype camera occupancy with the existing runtime asset before scaling the body again.
- **Route readability kit:** in the proposed route-study file, add one paired entrance beacon, one turn/landing signal and one extraction silhouette using existing materials. Keep the abyss dark, playable edges legible and outpost background quieter than the objective. No volumetric fog, many dynamic lights, new hero textures or decorative scatter in this iteration.

These are proposed exact source/destination pairs, not completed or newly authorized exports. Future runtime shell/collision/marker destinations must be resolved together after the route study. Collision remains resident and shared by movement, camera and projectiles; visual LOD does not define collision.

## One acceptance gate: four-view scale and route test

At fixed 1280×720 in the real browser, capture launch, south-bridge midpoint, east landing and court approach using ordinary flight input. All four must simultaneously show: rider and bike silhouette distinguishable; intended bike framing roughly 15–25% of screen height without hiding the next maneuver; at least one upcoming safe passage visible; no visible rail/wall penetration during a lateral clearance sweep; next objective identifiable by shape/light hierarchy. The percentage is a proposed composition target, not a measured pass. A fresh player must identify the next passage and explain which route is protected without coaching. Failure sends us back to camera/clearance/marker placement, not more asset production.

## Evidence references

- `art/full-level/full-level-top.png`, `full-level-oblique.png`, `full-level-low.png`, `verification.json` and streaming manifest: whole layout, normalized bounds and actual low-detail limits.
- `art/player/avi-jetbike.png`, `.json`, current GLB and `scripts/build-avi-player.py`: real player appearance, static pose and source provenance.
- `src/components/hero-model.ts` normalization and `src/components/fly-controls.ts` camera boom: actual size and framing behavior.
- `art/concepts/full-level-chase-camera.png`: aspirational comparison only.
- `docs/VALIDATION.md`: scripted lifecycle/streaming evidence; foreground human composition and route comprehension remain open.
