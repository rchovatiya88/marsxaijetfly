# Red Horizon Premium Concept Images

Created September 15, 2026 as a concept-art target for the Twin Bridge Run vertical slice.

These images are premium visual targets generated from the current Blender/source-model reference plates. They are not new level assets and they do not replace the supplied models. Use them to guide lighting, materials, VFX, camera staging and gameplay readability while keeping runtime geometry tied to `art/real-path/red-horizon-real-path-layout.json`.

## What was produced

| Plate | Web image | Source truth | How to use it |
| --- | --- | --- | --- |
| Bridgehead start hero gameplay | `docs/images/red-horizon-premium-concept-01-bridgehead-start.jpg` | `docs/images/red-horizon-left-bridgehead-start.jpg` | First playable camera target: start on real bridgehead, canyon/route ahead, cannon as landmark. |
| Upper/lower bridge route choice | `docs/images/red-horizon-premium-concept-02-route-choice.jpg` | `docs/images/red-horizon-bridge-route-split.jpg` | Route-readability target: high charge language, low shield language, both surface-attached. |
| Warden court combat | `docs/images/red-horizon-premium-concept-03-warden-combat.jpg` | `docs/images/red-horizon-warden-court.jpg` | Combat staging target: supplied Warden as elite rival, attack telegraph, cover, projectile lanes. |
| Extraction outpost victory beat | `docs/images/red-horizon-premium-concept-04-extraction.jpg` | `docs/images/red-horizon-extraction-outpost.jpg` | Finish target: green hold beacon on the real outpost pad, route aftermath visible behind. |

Review sheets:

- `docs/images/red-horizon-premium-concept-contact.jpg`
- `docs/images/red-horizon-premium-concept-truth-map.jpg`

Detailed provenance, prompts, hashes and truth-level notes are in `art/concepts/red-horizon-premium/manifest.json`. The critical studio review is in [RED_HORIZON_PREMIUM_CONCEPT_IMAGE_REVIEW.md](RED_HORIZON_PREMIUM_CONCEPT_IMAGE_REVIEW.md). Run `python scripts/verify-red-horizon-premium-concepts.py` to verify the tracked web images and manifest links.

## Critical read

The images hit the premium mood target: warm Martian atmosphere, clearer bridge language, stronger jetbike fantasy, Warden combat readability and a more satisfying extraction objective. They also deliberately add aspirational detail that does not exist yet in the runtime: richer material wear, wider/cleaner lane dressing, denser towers, stronger atmospheric fog, VFX beacons and more readable bridge rail/marker language.

Treat the generated art as a target, not proof. The next Blender/runtime work should rebuild the useful ideas from these plates onto the supplied level:

1. Add surface-anchored route dressing to the real upper and lower bridges.
2. Add a clear bridgehead spawn pad and first-camera framing without moving the start off the measured surface.
3. Add Warden state art: red attack ring, projectile lane, and cover silhouettes in the real court.
4. Add a green extraction beacon and hold ring on the measured outpost pad.
5. Upgrade material mood through lighting, fog, decals, dust, emissive strips and texture polish while preserving `level1.glb`, `avi-jetbike.glb` and `enemy.glb` as the source model set.

## Rejection rules

Reject any future concept or implementation if it:

- replaces the supplied level, AVI jetbike or Warden with unrelated assets;
- makes the Warden building-sized;
- turns the cannon back into the playable start;
- makes route lines float above the model;
- hides the player path behind beauty lighting;
- implies collision widths or structures that are not rebuilt and tested against the Twin Bridge route contract.
