# Red Horizon premium Blender scene rebuild

Created: September 15, 2026

This pass answers the visual-design question: yes, the premium concept images can be recreated inside Blender using the actual supplied Red Horizon level, AVI jetbike and Warden assets. The current build is a truthful visual-target scene in real model space. It preserves the supplied level materials/textures and adds lighting, fog, route language and staged gameplay beats around them. It is not final shipped runtime art yet.

The rebuilt scene is saved locally at `art/concepts/red-horizon-premium-blender/red-horizon-premium-blender-target.blend`. The `.blend` and raw PNG renders are intentionally ignored by Git because they are heavy local art sources. The tracked evidence is the build script, manifest, verification script and web-viewable JPG review images.

## Review images

- Contact sheet: `docs/images/red-horizon-premium-blender-contact.jpg`
- Concept-match sheet: `docs/images/red-horizon-premium-blender-concept-match.jpg`
- Shot 1: `docs/images/red-horizon-premium-blender-01-bridgehead-start.jpg`
- Shot 2: `docs/images/red-horizon-premium-blender-02-route-choice.jpg`
- Shot 3: `docs/images/red-horizon-premium-blender-03-warden-combat.jpg`
- Shot 4: `docs/images/red-horizon-premium-blender-04-extraction.jpg`

## What was built

The build script opens `art/full-level/full-level.blend`, reads the measured Twin Bridge layout from `art/real-path/red-horizon-real-path-layout.json`, and creates a non-destructive art-direction layer over the existing model. The source GLBs are not overwritten.

The scene adds:

- A Mars dusk lighting setup with a low sun, warm world color, mist and layered fog cards.
- Preservation receipts for the supplied level material slots and embedded image textures.
- New materials only for added route lanes, rings, fog cards, beacon beams and other visual-target dressing.
- Surface-projected route dressing for the high charge bridge, low shield bridge and extraction path.
- AVI jetbike placements at the start, route choice, combat and extraction beats.
- The supplied Warden model staged at the combat court with red telegraph rings and a projectile lane.
- A green extraction beacon and hold ring on the real outpost surface.
- Four authored cameras matching the intended play beats.

The manifest records source hashes for:

- `public/models/level1.glb`
- `public/models/avi-jetbike.glb`
- `public/models/enemy.glb`
- `art/full-level/full-level.blend`
- `art/real-path/red-horizon-real-path-layout.json`

## Critical read

This version fixes the earlier core problem: it is no longer inventing a replacement scene, and it no longer replaces the supplied level texture identity. The bridgehead, route split, Warden court and extraction pad are all staged on the supplied level in the measured coordinate space. The player and Warden are imported from the real project models, so scale and silhouette are at least grounded in the actual assets.

It still does not fully match the premium concept images. The concept art has denser skyline silhouettes, better atmospheric layering, stronger localized practical lights, dust trails, exhaust energy, bridge-detail dressing and more cinematic shadows. The current Blender rebuild establishes where those things belong; it does not yet model all of them as final assets.

My current studio score for this corrected pass is 76/100 as a concept-to-Blender rebuild. It passes the truth requirement because it uses the real scene, real source level textures and real characters. It misses premium finish because too much of the beauty is still lighting/VFX dressing rather than authored production geometry.

## What it would take to fully match the concept

The next pass should be treated as production art, not another camera-only render pass.

1. Lock scale and composition.
   - Keep the measured Twin Bridge path from `art/real-path/red-horizon-real-path-layout.json`.
   - Keep the supplied Warden and AVI jetbike scale unless a new measured scale receipt proves a better runtime target.
   - Define four camera plates as the official visual targets for gameplay implementation: start, route choice, Warden combat and extraction.

2. Build real modular dressing in Blender.
   - Add bridge-edge armor, lamps, cable trays, antenna clusters, caution trim, outpost props and gate structures as editable meshes or admitted licensed assets.
   - Place those objects on the actual supplied surfaces, with receipts, rather than replacing the level.
   - Keep collision separate from visual dressing until gameplay testing proves what should block the player.

3. Add production texture layers without removing the supplied texture identity.
   - Keep the existing source materials as the base look unless a stronger licensed texture set is admitted.
   - Add decals, trim sheets, scorch marks and route paint for path readability instead of relying only on glowing guide strips.
   - Bake or pack any new texture outputs with clear license/provenance receipts.

4. Upgrade lighting and atmosphere.
   - Add volumetric dust/haze layers, canyon-backdrop silhouettes, practical lights along the bridge, beacon shafts, Warden arena warning lights and vehicle exhaust illumination.
   - Tune cameras with focal length, depth-of-field and color management per plate.
   - Produce before/after render reviews after every lighting pass.

5. Turn the visual target into runtime content deliberately.
   - Export only optimized runtime GLBs and textures.
   - Keep the heavy `.blend`, raw renders and bake intermediates ignored.
   - Add simple authored colliders where needed and verify route sweeps, Warden combat, extraction and camera behavior separately.
   - Use `three-mesh-bvh` only if broader mesh collision becomes necessary and measured performance supports it.

6. Re-test against the acceptance goal.
   - Side-by-side concept vs Blender vs runtime screenshots.
   - Natural mouse/camera playthrough for both routes.
   - Collision route verification for high and low paths.
   - Foreground performance measurement on target hardware.
   - Fresh-player comprehension pass.

## Rebuild and verify

Run the Blender scene build from the repository root:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python 'scripts/build-red-horizon-premium-blender-scene.py'
python scripts/annotate-red-horizon-premium-blender-scene.py
python scripts/verify-red-horizon-premium-blender-scene.py
```

The verifier checks the tracked evidence and source hashes. It treats the local `.blend` as optional because the blend source is intentionally ignored by Git and can be regenerated.
