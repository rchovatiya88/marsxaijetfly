# Bridgehead image-driven iteration

September 13, 2026. Actual WebGL images were saved locally in the ignored `evidence/runtime-inspection/` folder, paired with camera/player/asset metadata. They were saved using the explicit development QA image controls. Posed views reset, position and pause the sortie; they are image inspection evidence, not player or ordinary-input completion evidence. Frozen candidate 01 remains a local ignored evidence artifact.

## Current textured Blender pass

The latest pass replaces the untextured route overlay with a textured Blender-authored vertical-slice kit. `scripts/build-bridgehead-v2.py` now creates custom mesh plates instead of default cube primitives, adds bevel normals, assigns embedded 64px panel/grain texture images, keeps the 19 collision references exact, and links the original full level at scale three for context. The exported playable GLB is `public/models/bridgehead-route.glb`, SHA-256 `9ce7bc765f3b4ae4c111f1202772a6de05e4fb58b761e2a228813908e440387b`, with 2,593 triangles, 5 materials and 5 embedded textures.

Blender review images regenerated after the texture pass:

- `art/bridgehead/v2-overview.png` confirms the two bridges, court, extraction pad and source level read as one authored space.
- `art/bridgehead/v2-low-turn.png` caught a backwards `RISE + TURN` label; the label orientation was fixed and the image was regenerated.
- `art/bridgehead/v2-high-court.png` and `art/bridgehead/v2-low-cover.png` confirm the Warden, cover blocks, exit pad and bike scale are readable from the player camera.

Final runtime captures from the production build:

- `evidence/runtime-inspection/low-bridge-1789330501158.png` shows the textured low bridge lane, orange route language and bike clearance.
- `evidence/runtime-inspection/court-1789330502704.png` shows the textured court, Warden, cover, exit pad and streamed source context in the built game.
- The matching JSON files record the build script URL, camera, body envelope, renderer counts and route/collision metadata.

Browser smoke on the same production build passed both routes and loss/retry lifecycle. These captures prove rendering/framing of the packaged slice; they do not replace natural traversal or human playtest evidence.

## Before: images and findings

| Runtime image | Observed problem | Design response |
|---|---|---|
| `launch-1789328034130.png` | A 4.706 m bike faces bridges and buildings that read as miniatures; low entry is only 10 m ahead. | Scale the entire environment by three, preserve the bike dimensions and measure new hover heights from surfaces. |
| `fork-1789328043658.png` | The branch does not provide enough travel space to establish a steering decision. | Author a west-rim climb and descent plus a distinct low bridge and east turn bay. |
| `high-bridge-1789328078793.png` | Small source bridge and oversized flight rings dominate an extremely short crossing. | Keep gate radii close to bike scale; enlarge the surrounding world, not all gate dimensions. |
| `low-bridge-1789328093506.png` | Nose and tail extend far outside the 0.7 m center collider. | Cover the measured full body with continuous translation and rotation collision. |
| `court-1789328103473.png` | Warden appears huge and displaced from aiming center. | Normalize the displayed idle skin pose; the r147 static mesh box was measuring bind geometry. |
| `court-1789328305620.png` | Corrected Warden size reveals bike occlusion during downward aiming. | Author a 1.2 m shoulder camera offset and inspect the same aim again. |
| `extraction-1789328112677.png` | Extraction and cover use the old scene scale. | Measure a supported court floor, cover and raised extraction platform before implementing their new positions. |

## Design before integration

`art/bridgehead/bridgehead-v2-layout.json` records the measured spatial contract: source scale, body envelope, real weapon sockets, camera, movement, route paths, all 19 visible solid proxies and combat timings. The Blender authoring scene and play-by-play document accompany it. Neither a rendered image nor a waypoint list proves natural traversal.

The independent `evidence/bridgehead-collision-v2.json` decodes the actual four resident coarse GLBs, applies scale three, and checks full-body movement plus turns across seven low-route and ten high-route legs. Every leg reaches its endpoint without collision or a blocked turn. Shared world rays are clear from the high arrival to the Warden and blocked from the low arrival. Its 18-sphere CPU query median is 1.331 ms and p95 is 2.747 ms over 1,000 warmed queries. These are local CPU diagnostics, not frame-time acceptance or high-detail visual collision equivalence.

## Follow-through

After the Blender scene is saved and its runtime art admitted, repeat the same views, then fly both routes using forward movement, yaw and altitude controls. Inspect the descent, bridge exits, cover peek, Warden response and extraction. Retain failed runs and their corrections. Use the existing scorecard unchanged; do not award human criteria from posed pictures or programmatic replay.

