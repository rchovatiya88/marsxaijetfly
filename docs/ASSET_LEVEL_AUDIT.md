# Level and model audit

September 13, 2026

## What the files actually are

| Asset | Evidence | Decision |
|---|---|---|
| `level1.glb` | 4.93 MB, Draco, 2,298 nodes, 393 meshes, about 1.245M position vertices, 13 materials, 15 textures, no animation | Source city kit. Extract one route corridor offline; do not render whole file in the browser mission. |
| `level1_navmesh.glb` | 147 KB, one Draco mesh, about 70,958 position vertices, no textures, transformed/oriented differently from the current arena | Ground navigation source only after route alignment and re-export. Not a 3D flight collider. |
| `enemy.glb` | 1.01 MB, Draco, skinned mesh, six clips: `Baka_Idle`, `Baka_Run`, `Baka_Walk`, `Baka_Punch`, `Baka_Swipe`, `Baka_Dying` | One or two elite rivals. Normalize bounds and select clips by state. |
| `avi.glb` | 1.48 MB, skinned character, ten idle/run/strafe/punch clips | Briefing/cockpit character, not an ambient crowd. |
| `jetbickavi.glb` | 4.79 MB, six meshes, one clip, 4096² textures; one embedded image is labeled PNG but has an invalid signature | Repair offline, reduce to a hero variant of roughly 1–1.5 MB and two materials before shipping. |
| `gun.glb` | 4.88 MB, one mesh, three 4096² textures, tiny source scale | Good authored weapon candidate only after texture reduction and decimation. |

The navmesh's rough bounds are hundreds of world units wide and its transform differs from the current `x ±25`, `z -47..24`, `y 1.8..26` flight volume. The existing `simple-navmesh-constraint` is a ground raycast helper, not pathfinding. YUKA currently steers planar targets; it does not understand the city’s bridges, rooms or vertical routes.

## The correct Blender/Unity/JavaScript division

Blender or Unity should be the authoring and baking environment. JavaScript/A-Frame/Three should be the runtime. Export five intentional artifacts for the first mission:

1. `ridge-run-shell.glb`: one extracted corridor, static meshes merged by material, two LODs and reduced textures.
2. `ridge-run-collision.glb`: low-poly boxes, capsules and planes for player/projectile collision.
3. `ridge-run-navmesh.glb`: aligned ground-only surface for tanks and crawlers.
4. `ridge-run-markers.json`: player start, high/low/broken route anchors, cover, gates, enemy spawns, elite intro and extraction.
5. A far-background shell: low-cost silhouettes outside the active route.

The active runtime loads the visual shell asynchronously with a procedural fallback. It does not wait for a city download before the mission can become playable. The player remains in a 3D flight volume using collision geometry; ground AI uses the navmesh; flying enemies use a separate spline/air-lane graph. Do not use one navmesh for all three problems.

## The premium game goal

Red Horizon is a short authored sortie about converting speed into combat advantage:

1. Briefing and a visible route choice.
2. High exposed boost lane, low protected lane, or broken hazardous lane.
3. One ambush with a clear high/low or cover/exposure answer.
4. One elite rival whose idle, run, attack and death animations communicate state.
5. Extraction, score and a reason to retry with a different line.

The first 60 seconds must contain a route choice, a readable telegraph, one cover maneuver and one visible reward. Endless random waves remain useful as a QA mode; they are not the premium product loop.

## Budget and acceptance

The first route should target no more than 30 visible static draws, 250k visible triangles and 1.5 MB of first-mission art before combat effects. Measure at fixed 1280×720 with renderer draw/triangle counts, frame samples, load time and resource stability. A passing slice requires the authored route to be visible, one branch to change combat outcome, collision and projectile occlusion to agree with the collision proxy, ground enemies to remain on the navmesh, GLB failure to preserve a playable fallback, and five fresh players to understand the route and most choose another run. Scripted victory alone is not evidence of premium value.

Do not depend on a hidden browser tab continuing realtime gameplay. Browsers throttle background rendering. Pause simulation on document visibility loss and use idle time only for short, low-priority asset preparation.
