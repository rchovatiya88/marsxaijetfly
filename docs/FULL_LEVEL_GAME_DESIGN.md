# Full Level Game Design

Created September 13, 2026 from the approved whole-level survey, the user's screenshot, and the two generated concept boards in `art/concepts/`.

This is a design target, not proof of runtime completion. The current `?full-level` mode streams the source layout for survey flight only. The next playable version should use the complete level as visual context while keeping gameplay inside one authored route with fixed collision, markers and encounter logic.

## Visual Direction

Use the existing level identity as the anchor:

- A deep black crater chasm is the central danger and spectacle.
- The lower-left bridge is the launch/readability bridge.
- The upper bridge creates the exposed high route and points toward the left tower.
- The right industrial court is the Warden arena and extraction platform.
- Cyan light means power, route tech or active machinery.
- Amber light means danger, cover edge or extraction.
- Dark basalt and red dust should separate playable lane, cover and abyss.

Generated references:

- `art/concepts/full-level-route-design.png`: wide level board showing the full route hierarchy.
- `art/concepts/full-level-chase-camera.png`: chase-camera target showing the rider and jetbike at readable vehicle scale.

## Player Scale

The screenshot exposed that the player can read too small against the level. A later Blender measurement showed the first scale fix conflated screen occupancy with world scale: height-first normalization produced an approximately 6.275 m long bike against approximately 1 m source bridge decks. The Bridgehead candidate fixes framing first:

- `targetHeight: 1.8`
- `targetLength: 0` (no minimum-length enlargement)
- chase boom: `cameraHeight: 1.45`, `cameraDistance: 5.4`

The combat hitbox remains separate at `1.2 x 1.8 x 1.2`, so readability can improve without inflating damage or collision fairness. The next visual pass should verify the actual browser framing from three distances:

- launch view behind the bike,
- bridge midpoint against railings,
- outpost approach against buildings and Warden.

The current `?full-level` survey still starts around 25m above the level and remains an aerial inspection view. The separate `?bridgehead` candidate starts lower with a chase camera. Its narrow source bridges are visual landmarks beneath authored airborne lanes until Blender clearance and surface measurements are complete.

## Mission Shape

Working mission name: **Bridgehead Run**.

1. Launch Rim: player starts on the lower-left approach with tower and outpost visible.
2. Speed Check: short safe stretch teaches boost, yaw and altitude before the chasm.
3. Fork: high exposed bridge grants a charged burst; low canyon route grants shield or cover.
4. Bridge Commitment: the matching exit marker must be crossed; this prevents selecting a reward and skipping the landmark.
5. Warden Court: right outpost becomes the main combat arena. The current candidate starts the fight only after Bridge Commitment; a separate pressure-lane encounter remains deferred.
6. Extraction: cyan/amber beacon activates after Warden defeat and requires a short hold.

This should reuse the Ridge Run rule: movement choice changes combat outcome. The full level should not become a sightseeing mode with enemies sprinkled everywhere.

## Level Authoring Contract

Build the first playable full-level route as separate authored data:

- visual: selected source modules or LOD chunks remain cosmetic,
- collision: simplified boxes and ramps, always resident during the mission,
- markers: launch, fork gates, encounter anchors, Warden court, extraction,
- occlusion: same simplified boxes used by player movement, camera clearance and projectiles,
- streaming: visual detail only; never stream collision under an active player.

Initial collision target:

- 35 or fewer boxes for the playable route,
- no sloped bridge physics until tested,
- no arbitrary source mesh collision,
- no mission objective outside the authored route bounds.

## Encounter Plan

High route:

- Faster line over the exposed bridge.
- One cyan gate grants three charged shots.
- Less cover, earlier Warden line of sight.

Low route:

- Longer line through rocks and lower platforms.
- Shield reward or brief damage resistance.
- More cover and a safer Warden entry angle.

Warden court:

- Warden remains the actual grounded enemy silhouette.
- Named GLB clips now map idle, chase, the 850 ms attack telegraph and death. A resolved projectile forces a 1.2 s disarmed idle recovery, and the defeated model remains for a 900 ms simulation-time death window. All three clocks use simulation time. Human visual review must still tune timing/readability before admission.
- Place cover so the player uses flight angle and altitude, not only circle-strafing.

## Art Tasks

1. Make a top-down route paintover from the streamed level screenshot.
2. In Blender, create a `full-level-route.blend` scene with only the first playable lane, simple route markers and scale references.
3. Export a visual shell and a separate collision/marker package.
4. Verify a browser screenshot at launch, fork, bridge, and Warden court.
5. Only after the route is playable, polish materials, lights, dust and cyan/amber route language.

## Acceptance Gate

Do not call the full level playable until all are true:

- real browser route can be completed without scripted teleporting,
- player bike reads as a vehicle at bridge/outpost scale,
- both routes are understandable without explanation,
- collision, camera clearance and projectile occlusion agree,
- five fresh players can describe what changed because of their route,
- reset returns stable resource counts after repeated sorties.
