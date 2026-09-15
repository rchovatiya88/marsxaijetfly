# Red Horizon Premium Concept Image Review

Created September 15, 2026 for the Twin Bridge Run vertical slice.

Goal: produce beautiful premium game visuals that guide development while staying anchored to the supplied `level1.glb`, `avi-jetbike.glb`, `enemy.glb`, the current Blender route plates, and `art/real-path/red-horizon-real-path-layout.json`.

## Studio review verdict

Overall score: **86 / 100**. The package passes as a premium visual target and production guide. It does not pass as runtime-art evidence, final collision evidence, or release evidence.

| Plate | Score | Verdict | Critical notes |
| --- | ---: | --- | --- |
| Bridgehead start hero gameplay | 88 | Pass | Strong first playable mood: vehicle, route, cannon landmark, and canyon depth read well. Must be rebuilt on the measured bridgehead surface; the concept invents richer pavement and building dressing. |
| Upper/lower bridge route choice | 90 | Pass | Best gameplay plate: cyan high route and amber low route are readable, and the split is understandable in one glance. Bridge widths, route pickups, rails, and towers are aspirational until rebuilt in Blender/runtime. |
| Warden court combat | 86 | Pass with scale check | Strong combat promise: elite-rival Warden, red telegraph, cover, and projectile lane. Needs exact Warden scale lock and a camera pass against the real court so it does not drift into a kaiju boss fantasy. |
| Extraction outpost victory beat | 80 | Conditional pass | Beautiful finish target and clear green objective language. This plate drifts the most because the pad, towers, and settlement density are richer than the supplied outpost; build only the beacon/hold-ring idea first. |

## Role reviews

Art director: the images finally have the premium Red Horizon mood: warm Mars sunset, dust depth, readable metal/rock contrast, and a stronger fantasy for the AVI jetbike. The best ideas to preserve are the red-orange atmosphere, cyan/amber route language, red Warden danger state, and green extraction payoff.

Gameplay director: the concepts are useful because each plate corresponds to one player action: launch, choose a route, fight the Warden, and extract. The route-choice image is the clearest implementation target because it teaches the player the two-route decision without a text wall.

Technical artist: the images should drive lighting, decals, VFX, fog, emissives, and material polish. They should not drive collision size or mesh replacement. Any bridge widening, pad dressing, or tower density must be rebuilt from source-model-aligned Blender additions and measured against performance.

Source-truth reviewer: the package is acceptable only because it includes a truth-map sheet and manifest. The generated concepts change silhouettes and scenic density. Development must keep exact route, collision, camera, and scale contracts in `art/real-path/red-horizon-real-path-layout.json`.

## Build tasks created by the review

1. Blender level artist: add non-destructive route dressing to the real upper and lower bridges: cyan charge markers for the upper bridge and amber shield markers for the lower bridge.
2. Blender environment artist: create a lighting/material pass on the supplied level using warm Mars key light, dust haze, worn metal decals, subtle emissive strips, and rock color variation.
3. Character/vehicle artist: stage the supplied AVI jetbike and Warden at locked scale for the four gameplay beats; do not replace either silhouette.
4. Gameplay developer: convert the visual route language into runtime mission markers, exclusive high/low rewards, Warden attack tells, and extraction hold feedback.
5. Camera/input developer: capture the same four beats in the running browser with the fixed mouse camera and verify that pitch/yaw feel stable while the path stays readable.
6. QA/playtest: run a human route-completion pass for upper route, lower route, Warden kill, extraction, retry, and failure recovery before raising the acceptance score above concept-target status.

## Acceptance boundary

This concept package meets the premium concept-art target because it gives the game team a beautiful, coherent visual goal tied to the current mission beats. The next acceptance gate is implementation: the same four beats must be visible in Blender/runtime captures using the supplied models and measured route contract.
