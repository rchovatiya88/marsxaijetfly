# Bridgehead level blueprint

September 13, 2026. Document-only authoring plan. No Blender, GLB or image bytes changed. Current runtime is a tested engineering candidate; the geometry below distinguishes measured source surfaces from proposed authoring coordinates. Proposed marker changes must migrate mission constants, tests and geometry together.

## Coordinate contract and source evidence

Use `art/full-level/full-level.blend` as the normalized source scene, preserving it. Runtime coordinates are Y-up metres; Blender coordinates are **(runtime X, -runtime Z, runtime Y)**. Existing stream GLBs already use global normalized positions: never apply a second 0.1 scale or chunk-center translation. Original `level1.glb` normalization is uniform 0.1 with horizontal recentering, recorded in `public/models/level1-stream/manifest.json`.

Measured south bridge segment centers: X -10.80..7.20, Y -3.42, Z 10.70. North bridge: X -6.94..1.06, Y -1.01, Z approximately -11.8. Decks are approximately 1 m wide. These are two distinct cross-chasm bridges separated north/south by approximately 22.5 m, not adjacent lanes.

Read-only downward rays from Blender Z40 into the full-detail normalized scene produced:

| Runtime X,Z | First visible surface Y | Up-normal | Meaning |
| --- | ---: | ---: | --- |
| -19,10.7 | -2.140 | 0.876 | Sloped launch rock under existing foot anchor -0.8 |
| -16,0 | -1.806 | 0.966 | Western approach sample |
| -12,-11.8 | 1.440 | 0.983 | Raised rock before high gate; current Y1.2 foot anchor would clip |
| -9,-11.8 | -1.050 | 0.999 | North gate sample |
| 1,-11.8 | -0.959 | 1.000 | North exit deck |
| 7,-11.8 | -0.590 | 1.000 | Eastern high approach sample |
| -9,10.7 / 7,10.7 | -3.388 | 1.000 | South deck top at both gate ends |
| 13,8 | -12.594 | -0.441 | First hit is downward-facing; not a safe landing floor |
| 23,-10 | -0.709 | 0.311 | Steep visual geometry above current Warden feet -2.4 |
| 32,-15 | 1.364 | 0.947 | Visual rock above current extraction Y-1.4 |
| 14,-4 | -0.506 | 0.640 | Irregular west cover location |
| 26,-17 | 2.050 | 0.778 | Irregular east cover location |
| 28,-5 | -2.760 | 0.840 | Irregular court-core location |

A first-hit ray can hit roof, rock or underside. It is not walkability certification. A 6×6 court sample across X16..31/Z-20..-5 ranged from Y-3.17 to2.49 with varied normals; there is no measured single flat Warden court. These facts invalidate treating the existing three cover boxes as complete terrain collision.

## Authoring layout: version 1 proposal

Keep source bridges as scenic structures beneath **airborne** lanes. Do not promise riding between their rails. Current hero target is now height1.8 with no length expansion, giving approximately width0.98/height1.8/length4.71 from the inspected asset proportions. Reconfirm after any player rebuild. The earlier 6.275 m observation refers to the superseded height2.4 configuration.

Plan a 4 m clear lateral lane and at least 4.5 m clear vertical envelope, with an additional unobstructed camera sweep behind the player. Turns use approximately 6 m or larger radius as a starting study. These are proposed geometry dimensions, not completed speed tests. Gates are upright in the YZ plane, crossed toward **+X**; use normal (1,0,0). Gate radius2.5 and exit radius2.8 remain current values.

Every proposed position below is a runtime foot/vehicle-root anchor unless stated otherwise. Source-hit clearance must be tested along the entire swept envelope, not only at these points.

| Marker name | Proposed runtime XYZ | Purpose / migration |
| --- | --- | --- |
| MRK_PlayerStart | (-19,-0.8,10.7) | Retain current start; face +X (yaw -90° for local -Z forward) |
| MRK_Low_Approach | (-14,-2.2,10.7) | South bridge alignment after safe launch stretch |
| MRK_Low_Entry | (-9,-2.2,10.7) | Existing low entry; amber paired beacons |
| MRK_Low_Exit | (7,-2.2,10.7) | Existing low exit; reward traversal completion |
| MRK_Low_Climb | (10,0.5,10.7) | Explicit airborne climb; no assumed ground landing |
| MRK_Low_Turn | (13,4.0,3) | Smooth turn toward raised court; clear the source underside gap |
| MRK_Low_CourtEntry | (17,4.0,-3) | Sheltered court approach; verify full source sweep |
| MRK_High_ApproachWest | (-19,3.8,0) | Ascend before northward travel along western rim |
| MRK_High_Align | (-16,3.8,-11.8) | Turn to face +X before entry |
| MRK_High_PreEntry | (-12,3.8,-11.8) | Root is2.36m above measured rock; replaces unsafe low approach |
| MRK_High_Entry | (-9,3.8,-11.8) | Raise current high entry fromY1.2 to3.8; migrate runtime constant |
| MRK_High_Exit | (1,3.8,-11.8) | Raise matching exit fromY1.2 to3.8 |
| MRK_High_CourtEntry | (13,4.0,-11.8) | Exposed outpost approach after north bridge |
| MRK_Warden_Foot | (23,3.25,-10) | Proposed new raised floor; current -2.4 is embedded in source slope |
| MRK_Extraction | (32,5.2,-15) | Hover capture over raised platform; current -1.4 is below source rock |

The high approach travels farther from the existing southern spawn; do not describe it as inherently faster without timing both paths. Its benefit should be charged shots, with exposure/longer positioning as the cost. A protected low approach requires real occluding cover; shield reward alone does not make geometry protected.

## Proposed court and cover

Author a visibly supported industrial platform centered **(25,3.0,-12)**, size **(18,0.5,18)**, giving floorY3.25, X16..34 and Z-21..-3. This is a proposed new surface, not a discovered original platform. It sits above sampled local terrain, but dense source props must be inspected and locally masked/relocated in the derivative where they protrude. Do not place a floor through an unseen building and call it solved.

Start with these paired VIS/COL boxes, all in world XYZ:

| ID | Center | Size | Role |
| --- | --- | --- | --- |
| court-floor | (25,3,-12) | (18,0.5,18) | Stable Warden surface, camera/projectile floor |
| court-cover-west | (18,4.5,-6) | (2.5,2.5,3.5) | Break low-entry line of sight without blocking entry |
| court-cover-east | (28,4.5,-18) | (2.5,2.5,3.5) | Second defensive angle, clear extraction approach |
| court-core | (28,5,-7) | (4,3.5,3) | Outpost landmark and substantial cover |

Keep Warden/extraction trigger volumes clear of all boxes and source protrusions. Preserve a minimum4m clear loop around encounter blockers. Current runtime boxes at (14,-0.4,-4), (26,-0.4,-17), (28,0.4,-5) are migration references only; their positions/heights cannot be silently reused above the new floor.

## Blender collection and export contract

Proposed editable destination: `art/full-level/full-level-route.blend`, from preserved `art/full-level/full-level.blend`. No destination has been written by this planning pass.

```text
BRIDGEHEAD_ROOT
  SOURCE_CONTEXT_READONLY
  VIS_ROUTE_NEAR
  VIS_ROUTE_MID
  VIS_COURT
  COL_RESIDENT
  NAV_WARDEN_FLOOR
  ROUTE_MARKERS
  PLAYER_SCALE_REFERENCE
  CAMERA_SHOTS
  LIGHTING_PREVIEW
  DEBUG_CLEARANCE
```

Source context is excluded from the route overlay export to prevent duplicate streamed meshes/z-fighting. The runtime visual may combine existing chunks with a small new route/court overlay. Source masking must use stable authored IDs or a revised chunk export, not runtime name guesses after merge. Therefore exporting an overlay alone is insufficient if existing source solids protrude into the flight channel.

Proposed runtime destinations to resolve together before export: `public/models/bridgehead-route.glb`, `public/mission/bridgehead-world.json`, `public/mission/bridgehead-markers.json`. Marker schema needs version1, units, IDs, positions, normals, radius, routeId and ordered predecessor. World schema stays bounds plus unique finite positive-size boxes. Keep ≤35 resident proxies including walls/floor/cover. Do not add a decorative collision GLB if the runtime still consumes only boxes.

One collision definition must serve player sweeps, chase-camera clearance, projectile traces and enemy visibility. Visual LOD swaps never add/remove colliders. Do not use full source meshes or the unaligned navmesh as flight collision. Warden is fixed on the authored court in this iteration; no ground pathfinding claim unless NAV_WARDEN_FLOOR is baked, imported and tested. Any remaining cosmetic surface that intersects the reachable flight envelope must be removed, masked or covered by an honest collider.

## Camera / screenshot shot list

Capture at exact1280×720 renderer pixels, same build/FOV/exposure, with actual runtime player. Current proposed baseline uses local camera boom(0,1.45,5.4); keep yaw on the bike and pitch on the camera.

| Shot | Player position / heading | What must be visible |
| --- | --- | --- |
| SHOT_Launch | MRK_PlayerStart / +X | South entry, abyss edge, clear direction toward the north alternative; bike15–25% screen height |
| SHOT_NorthAlign | MRK_High_Align / +X | Raised cyan entry above the rock lip, north exit and outpost landmark |
| SHOT_SouthMid | (-1,-2.2,10.7) / +X | Rails below the airborne envelope, low exit, unobstructed next turn |
| SHOT_NorthMid | (-4,3.8,-11.8) / +X | Exposure and charged-route identity; no source rock clipping |
| SHOT_LowCourt | MRK_Low_CourtEntry / toward Warden | Real cover breaks enemy sightline; grounded feet on platform |
| SHOT_HighCourt | MRK_High_CourtEntry / toward Warden | Exposed arrival angle, telegraph silhouette and alternative dodge space |
| SHOT_Extraction | (28,5.2,-12) / toward extraction | Exit silhouette separate from threat; platform/contact cue and clear approach |

Add Blender side/rear orthographic player checks for grip, feet and seat contact, plus top-down lane-envelope view. These are specified shots only; no images were generated in this pass. Test moving camera sweeps at lane turns, not merely the static positions.

## Authoring checklist and one gate

1. Duplicate only into the named route-study file; record source/current manifest hashes.
2. Place marker empties and a measured current hero envelope before decorative work.
3. Sweep4m lane and camera envelopes through full-detail source; resolve every intersection locally.
4. Create the visible court floor, supports and three cover pieces; inspect dense source occlusion underneath/through them.
5. Pair VIS solids with resident COL boxes; verify all marker trigger volumes and Warden feet.
6. Export selected route overlay only, Y Up/metres/custom properties; generate JSON from authored data, then reimport and compare coordinates within1cm.
7. Migrate mission constants/gate heights/cover/world bounds as one versioned change. Keep survey and Ridge regression modes unchanged.
8. Record the seven actual browser views and natural-input traversal of both branches.

**Acceptance gate:** both routes can be flown with ordinary input through entry→exit→court→extraction, with zero visible/source-proxy penetration or camera trapping, while an uncoached tester identifies the next safe passage at each shot. A missed clearance, buried Warden/extraction or invisible northern option fails the gate even if every scripted mission assertion passes.
