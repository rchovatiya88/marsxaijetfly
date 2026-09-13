# Premium GLB direction

September 13, 2026

## The product idea

Red Horizon should sell the feeling of piloting a dangerous, overpowered machine through a living Mars frontier. The premium hook is **momentum under pressure**: the player chooses a line through gates, cover and altitude, then cashes that line into a charged shot. Waves are a test harness for this fantasy, not the final product loop.

The first vertical slice should therefore contain one authored route, one elite rival and one meaningful flight decision. A player should be able to say, “I won because I threaded the ridge and hit the rival during its exposed turn,” rather than “I held fire until the wave ended.”

## What the A-Frame research changes

- A-Frame's `gltf-model` emits `model-loaded` and `model-error`; authored GLB loading must be asynchronous and must not block the active mission. See the [A-Frame gltf-model documentation](https://aframe.io/docs/1.8.0/components/gltf-model.html).
- A-Frame recommends doing continuous work in `tick`, throttling non-critical work, and mutating Three object transforms directly instead of repeatedly calling `setAttribute`. See [A-Frame best practices](https://aframe.io/docs/1.8.0/introduction/best-practices.html).
- A-Frame's material documentation supports custom shader components, but warns that complex shaders can be demanding. Keep the frontier shader restrained and spend GPU budget on hero silhouettes and readable effects. See [A-Frame materials](https://aframe.io/docs/1.8.0/components/material.html).
- Three's `AnimationMixer` is the correct runtime for GLB animation and can be paused by setting its time scale or by skipping updates. See [Three AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html).
- Three's GLTFLoader supports Draco and modern glTF extensions, but embedded image bitmaps need explicit resource care. See [Three GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

## Implemented first slice

`src/components/hero-model.ts` now loads an authored GLB as an optional quality layer. It measures the loaded bounds, normalizes height, centers the asset, audits roughness/metalness and starts its first animation clip through one mixer. The procedural enemy remains visible until the model is ready and remains the fallback if loading fails. Wave-three tank enemies request `public/models/enemy.glb`; this keeps the real asset in the playable path without making launch or combat depend on it.

This is deliberately a vertical slice, not permission to load the 5 MB level GLB into every mission. `level1.glb` contains 2,298 nodes and 393 meshes; it needs an authored streaming/LOD plan before it belongs in the default arena. The original bike GLB still has an invalid embedded PNG and remains preserved as source evidence.

The level’s 144 KB navmesh is also not a drop-in player collider: it is a 11,999-triangle surface with a much larger authored coordinate range than the current arena. Keep it hidden and use it for grounded navigation after preprocessing. The jetbike needs a separate 3D air-lane graph, while the visible level needs a low-poly collision proxy. The enemy asset exposes `Baka_Idle`, `Baka_Run`, `Baka_Walk`, `Baka_Punch`, `Baka_Swipe` and `Baka_Dying`; the hero loader now selects `Baka_Idle` explicitly instead of accidentally playing the first (death) clip.

## Real asset pipeline

Use Blender or Unity as authoring tools and JavaScript as the runtime, not as competing engines. The authoring export should produce five deliberate artifacts: a streamed visual shell, a low-poly collision shell, a grounded navmesh, an air-route/mission marker JSON file, and a far-background shell. A-Frame loads the visual chunks asynchronously; Three handles LOD and animation; the mission state machine owns objectives and route consequences. This keeps the rich source scene while giving the browser an honest frame budget.

The current source scene is 5.17 MB, 2,298 nodes, 393 meshes and roughly 355k triangles before combat. Rendering it whole would destroy the current budget. The first authored mission should load only the route chunk around the player and target roughly 50–100 static draws before enemies. The rest can be requested during quiet moments or left out of the demo.

## Next experiment

Author one “Ridge Run” encounter: a visible gate pair, a boost lane that exposes the player, a cover lane that costs time, and an elite rival that opens after its animation telegraph. Compare this against the current wave-only arena with fresh players. Measure whether players understand the route, use altitude/boost intentionally and volunteer a second run before adding content.
