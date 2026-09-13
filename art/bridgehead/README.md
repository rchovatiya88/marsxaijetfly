# Bridgehead scene and route kit — revision 2

The current scene is `bridgehead-v2.blend`, authored from the single Y-up metre
contract `bridgehead-v2-layout.json`. The full supplied level is linked from
`../full-level/full-level.blend` and instanced at scale 3. The original source
meshes are preserved. The route GLB is already authored at this final world scale
and must be loaded at identity: `public/models/bridgehead-route.glb`.

The current kit contains **2,497 triangles, five meshes/materials, zero textures
and 168,084 bytes**. It includes two 5 m bridge decks, navigation glyphs, a supported
24 m court with cover, and an 8 m extraction platform. All 19 physical boxes,
including supports and gate posts, match the layout's exact collision array.
Surface paint and explicitly holographic text/arrows are non-solid decoration.
The stable resident source triangle collider remains separate from this kit.

`verification.json` records GLB hash, bounds, import/export round-trip results,
markers, boxes, source preservation and evidence limits. `bridgehead-markers.json`
is an inspection receipt; the complete coordinate source remains the layout JSON.
The runtime contract is generated from that JSON rather than transcribed by eye.

The Blender scene contains editable named meshes, collision reference boxes,
route path curves, checkpoint/socket empties, actual hero meshes and review
cameras. The player is normalized to assembly base zero at 1.8 m high and 4.706 m
long; the old runtime half-metre local hover offset is removed. The Warden is
evaluated in Baka_Idle before its 2.15 m height normalization. Using its bind-pose
box would produce the wrong width and center. Measured muzzle sockets are at
player-local (±0.10, 0.62, −2.40).

The first scene save preceded runtime activation. The player action plan is
`../../docs/BRIDGEHEAD_PLAY_BY_PLAY.md`: choice, climb/align, crossing, bank turn,
cover or open counterattack, and extraction. This is the scene and design contract;
90–180 seconds for a first attempt is a hypothesis until observed. No wait, extra
enemy or wave was added to force a duration. The Warden's 425 HP follows an actual
seven-hit exposure-window observation and preserves two charged versus three
ordinary attack windows in the authored plan.

The `v2-*.png` files are nine posed Blender views and a full-context overview,
1280×720 with 80° vertical FOV, 2.5 m camera height, 6.2 m distance and 1.2 m shoulder.
`v2-cameras.json` records each pose. A render-only correction fixed the actor yaw
sign at north-facing views; it did not alter the exported route geometry. These
are offline composition checks, not browser-input or fresh-player evidence. Actual
runtime captures live in `../../evidence/runtime-inspection/` and acceptance
receipts are managed separately by the runtime validation work.

The scale study `scale3-study.json` samples the full source around the routes,
court and extraction. Court floor top Y1.5 clears the highest contained source
vertex Y1.23. Extraction top Y6 clears the highest sampled surface Y5.54. The
western rock shelf requires an 8.4 m player base followed by the separately marked
descent beyond X−30. Seventeen approach legs clear the sampled visual body by at
least 1.21 m. The independent continuous full-body runtime sweep is recorded in
`../../evidence/bridgehead-collision-v2.json`; sampling alone is not proof of a
continuous route or ordinary-input success.

Reproduce from the repository root without using the user's Blender GUI:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/build-bridgehead-v2.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/render-bridgehead-v2.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/inspect-bridgehead-scale-study.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/inspect-bridgehead-hero-sockets.py
```

`game-dev` was unavailable on PATH, so production used the documented direct
Blender Python fallback in `../../docs/BLENDER_MCP_SETUP.md`. The owner's rights
attestation is accepted in `../../docs/BRIDGEHEAD_ITERATION_REVIEW.md`; this receipt
is not an independent license audit or a claim of premium acceptance. No provider
job, payment, external publication or GUI scene operation was performed.

The older `bridgehead-route.blend`, `source-ground-samples.json`,
`low-ground-samples.json` and images without the `v2-` prefix are historical
revision-1 studies. Their original scale, coordinates and seven-box overlay do
not describe the current runtime and must not overwrite the v2 layout.
