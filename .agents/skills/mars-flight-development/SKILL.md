---
name: mars-flight-development
description: Develop and verify Mars Jetbike flight, weapons, A-Frame lifecycle, or rendering in this repository. Use for gameplay changes and runtime debugging.
---

Read `AGENTS.md` and `docs/VALIDATION.md` from the repo root before choosing a change. The active application is `src/index.tsx` → `App.tsx` → `aframe-init.ts`; old demo files and public/index.html are not the running game.

Use `fly-controls` as the single movement/look owner. Keep the child camera rig in local coordinates and compute aim from camera world coordinates. The Vite Three bridge intentionally shares A-Frame's runtime; do not introduce a second renderer or rely only on newer Three typings.

For lifecycle changes, verify pause during initial delay, enemy spawning, reload, held boost/fire, and the interval between waves. Scene pause does not cancel setInterval/setTimeout. Keep gameplay deadlines on ticks, and release owned resources/listeners on removal. The manager owns results and emits events to React.

For combat changes, test near/far targets, rotated player aim, cover, duplicate death and target removal. The original jetbike model has an invalid embedded PNG; retain it as source evidence and use the procedural bike until an asset repair is explicitly implemented.

Run `npm test`, `npm run typecheck`, and `npm run build` after a meaningful gameplay edit. Typecheck covers the active entry graph; test harnesses use mocked DOM/A-Frame and cannot prove WebGL behavior. Play the affected path in a real browser and record pointer-lock versus cursor-aim coverage separately. Update `docs/VALIDATION.md` and the next task in `docs/PROJECT_MEMORY.md` with measured results and remaining limitations.
