# Whole level: experimental survey assets

This export preserves the supplied level's complete arrangement of rock chasm, two cross-chasm bridges, raised cannon platform and dense industrial outpost. It is a survey environment, not a validated combat mission. Source license/provenance still needs verification before commercial publication.

`full-level.blend` contains the complete normalized geometry with original material appearance; `full-level-oblique.png` and `full-level-top.png` are direct Blender renders. Both were visually inspected. The images confirm the deep central chasm, west raised cannon and eastern dense outpost; they are not generated concept art. Geometry in the editable scene remains at original detail, merged into four material-grouped quadrants.

## Reproduce

From repository root:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python scripts/build-full-level.py
```

This reads `public/models/level1.glb` and writes only `art/full-level/` plus `public/models/level1-stream/`. Rebuilding replaces derived outputs; preserve manual edits under a different filename. Original source bytes are hashed before and after and asserted unchanged. Ridge Run files are not touched.

## Runtime contract

`public/models/level1-stream/manifest.json` uses version 1, metres, Y-up global coordinates, `bounds.min/max`, `spawn`, and four `chunks`. Each chunk has an ID, global center, radius, AABB and two `lods` with relative app-root URL, triangle count and byte count. No per-chunk placement transform is required. Objects are assigned by their centers; large objects can overlap quadrant bounds, but each object belongs to only one chunk.

All geometry is uniformly scaled by 0.1 and centered horizontally. Vertical source datum is retained. Measured runtime bounds are approximately X -40.18..40.54, Y -37.00..17.61, Z -35.18..36.38. Safe initial survey spawn is (0, 24.60774, 44.37959), above and in front of the entire geometry. This is an aerial inspection location, not a ground spawn.

| Quadrant | Original triangles | High LOD | Low LOD |
| --- | ---: | ---: | ---: |
| q00 | 42,459 | 42,459 | 6,335 |
| q01 | 87,578 | 87,578 | 13,000 |
| q10 | 831,285 | 197,159 | 121,931 |
| q11 | 208,378 | 199,870 | 30,799 |

LOD index 0 is capped at 200k triangles per chunk; index 1 targets 15% of original triangles. Coincident split vertices are welded on derived copies before decimation to prevent torn cliff faces. High q10/q11 are deliberately simplified. The complete original 1,169,700 triangles remain in source and the Blender scene. All-low visible total is 172,065 triangles. Promote selectively under a total visible-triangle budget; a limit on the number of high chunks alone cannot guarantee 350k triangles. Replace low with high rather than drawing both at once.

Draco compression is enabled. Valid source textures are reduced to at most 1024 pixels on the longest edge, and embedded separately in each GLB. This duplicates image data and bakes original instances, so aggregate export bytes exceed the original source file. The first all-low set is about 8.52 MB; all eight files together are about 19.76 MB. Shared textures and instanced kit geometry are the next size optimization, not assumed complete here.

To render the actual all-low files for visual comparison, run Blender in background mode with `--python scripts/render-full-level-low.py`; this writes `full-level-low.png` without changing the saved authoring scene.

The actual all-low render was inspected after correcting split-vertex tearing: the central chasm, both bridges and outpost remain recognizable. Rock faces become smoother and small cannon/rail details lose definition, so this is suitable for distant survey display rather than proof of close-up premium art quality.

## Evidence and limitations

`verification.json` records Blender version, unchanged source SHA-256, image sizes, per-file reimport results and the manifest. All eight files must reimport before the final receipt is produced. Offline imports/renders do not establish browser frame rate or streaming memory stability.

No collision mesh, ground navigation, route triggers, enemy spawns or combat balancing are supplied by this survey export. The deeply varying ground height makes a flat arena collision model inappropriate. Human route design should select an actual bridge/outpost path, then author matching collision and navigation as a separate mission. Low-detail decimation can reduce thin rails and small props; compare those areas before adopting low LOD as collision or gameplay cover.
