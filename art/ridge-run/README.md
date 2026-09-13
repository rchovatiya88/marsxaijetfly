# Ridge Run candidate layout study

## Authored source-module scene (latest)

`ridge-run.blend` is the newer authored scene. `ridge-run-scene.png` is its inspected render. It contains real mesh modules extracted from `public/models/level1.glb`: rock cliffs/spires, bridge decks, supports, barracks, comms tower, antenna, containers and landing surfaces. They are rearranged around the active game's route coordinates and restyled with seven warm/industrial palette materials. Source meshes are copied and normalized into explicit target bounds; original GLBs remain unchanged. This is a compact source-kit assembly, not the entire city loaded wholesale.

The `ACTORS_PREVIEW` collection contains the actual material-repaired jetbike study (height 2.2 m, rotated toward runtime -Z) and actual enemy GLB (2.15 m tall) for scale review. Rider action `ArmatureAction.001` and Warden action `Baka_Idle` are explicitly assigned with their Blender action slots at frame 1; conflicting NLA tracks are muted. Gate/extraction preview rings are also in this collection. They are excluded from the environment export so runtime actors and mission rings stay independent. `NAV` is reserved; this scene does not claim a baked navigation mesh.

Rebuild the authored version from the repository root:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python scripts/build-ridge-scene.py
```

Generated runtime handoff:

- `public/models/ridge-run-shell.glb`: 7 static material meshes, 33,197 triangles, 2,629,384 bytes in the verified build.
- `public/mission/ridge-run-world.json`: 24 conservative AABBs and exact flight bounds, runtime Y-up metres.
- `public/mission/ridge-run-markers.json`: named runtime coordinates/radii, preserved from the original route contract.
- `ridge-run-scene-verification.json`: source hash, individual extracted source-object provenance and export/reimport counts.

The shell was successfully exported, rendered and reimported as seven meshes. Static geometry is beneath the 30-draw/250k-triangle target, but its 2.63 MB uncompressed size exceeds the earlier 1.5 MB first-mission aspiration. Browser frame time and loading must still be measured. Cliff AABBs deliberately approximate irregular silhouettes; gameplay testing must identify where this feels too conservative. Source license/provenance remains unverified for commercial publication.

For manual editing, save a copy of `ridge-run.blend` first. Edit VIS surfaces and corresponding COL boxes together, preserve marker coordinates, then re-export VIS only using Selected Objects / GLB / Y Up. Regenerate world JSON from the revised COL geometry before runtime use; a manual visual GLB export does not update collision JSON automatically. The build script currently defines the authoritative box layout. Rebuilding overwrites generated scene outputs but not source GLBs.

The older files below remain as the separately labeled initial blockout study.

Original low-poly spatial study authored September 13, 2026 with Blender 5.2.1 LTS. This is a **candidate layout**, not the game's active collision or a production art level. No supplied city/model was imported, changed or copied; city corridor extraction remains a separate task.

Open `ridge-run-blockout.blend` to edit. View `ridge-run-blockout.png` for the inspected isometric render: launch pad, left elevated cyan bridge route, right sheltered amber passage, red Warden placeholder, cyan extraction ring. The low passage roof is deliberately hidden in the preview render to expose its gate; the shell GLB retains the roof. The player and Warden boxes are scale/location placeholders.

## Rebuild

From the repository root, run:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python scripts/build-ridge-blockout.py
```

This regenerates the files in this folder, including the `.blend`; save manual edits to a different filename before rebuilding. It uses a separate Blender process and does not save global preferences or touch a GUI scene. No source asset files are read or overwritten.

## Collection contract

| Collection | Purpose | Export |
| --- | --- | --- |
| VIS | Original blockout surfaces, route dashes, rings and placeholders | `ridge-run-shell.candidate.glb` |
| COL | Separate simple static collision study boxes | `ridge-run-collision.candidate.glb` |
| NAV | High/low reference strips, hidden from render | No nav export: these are not a baked connected navmesh |
| ROUTE_MARKERS | Named empties with coordinate/radius metadata | `ridge-run-markers.candidate.glb` plus JSON |
| LIGHTING_PREVIEW | Camera, lights and explanatory labels | Excluded from GLB exports |

Coordinates are metres. Runtime is Y-up; Blender authoring uses `(gameX, -gameZ, gameY)`. glTF export uses `export_yup=True`, restoring the runtime convention.

| Marker | Runtime XYZ | Radius |
| --- | --- | --- |
| player_spawn | (0, 3, 12) | — |
| high_gate | (-6, 10, -8) | 2.8 |
| low_gate | (6, 3.5, -8) | 2.8 |
| warden | (0, 0, -30) | — |
| extraction | (0, 3.5, -41) | 4 |

## Verification

`verification.json` records successful reimport of all three exports: 35 shell objects, 18 collision objects and 5 markers. Marker positions were asserted within 1 mm after round trip. The PNG was rendered and visually inspected; the low roof was changed to a cutaway to make both route choices visible. This validates authoring export/import and diagram readability, not browser performance, active mission collision, baked navigation or player fun.

## Manual edit/export handoff

1. Save a working copy of the `.blend`. Keep the five collection names and marker names stable.
2. Adjust sightlines and corridor dimensions around the marker contract. Hide COL/NAV for beauty review; show them to inspect clearances. Re-enable the low roof's render icon for a closed-passage view.
3. Select objects from only the desired export collection. File → Export → glTF 2.0: Binary `.glb`, Selected Objects, Y Up and Custom Properties. Exclude cameras/lights and preview labels.
4. Export into a new candidate filename. Reimport to verify coordinates/materials and compare marker JSON. Changing marker locations also requires updating the JSON; a manual export alone does not update it.
5. Review clearance at actual bike speed, high-route visibility and low-route escape before runtime integration. Collision tuning and navigation baking need dedicated validation.

Nothing here is placed in `public/` or automatically loaded by the browser. Replace placeholders incrementally with validated authored corridor assets only after this route proves useful in playtests.
