# Red Horizon — Mars Jetbike

A playable React + A-Frame + Three.js combat-flight prototype. Clear three waves, chain eliminations for score multipliers, and improve your local best. The active build now uses a lightweight procedural arena so playability does not depend on the heavier imported Mars city GLBs. The product direction is a premium paid full game; this repository is currently the prototype and browser-demo foundation.

## Run

Use Node 22.12 or newer.

```sh
npm ci --legacy-peer-deps
npm start
```

Open http://localhost:5173. Click **Launch Sortie**; if mouse capture is blocked, choose **Play with cursor aim**.

| Control | Action |
|---|---|
| WASD | Fly |
| E / Q | Ascend / descend |
| Mouse | Aim |
| Left click / hold | Fire |
| Shift | Boost |
| R | Reload |
| Escape | Pause |

Sensitivity and reduced damage-overlay effects are available in the menu. Best score is local to the browser. The full human playtest checklist is in [docs/VALIDATION.md](docs/VALIDATION.md).

## Build and verify

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

Production files are in `dist/`. Start/build copies pinned local A-Frame and Draco dependencies into `public/vendor`. Vite's root `index.html` is the active HTML entry. Old CRA/Webpack files and `public/index.html` are historical and are not used by the current build. Typecheck covers the active entry and imports; unused legacy demos are not certified.

The Vite Three bridge reuses A-Frame's runtime. The separate Three package supplies existing types and build-time export names. Avoid adding runtime APIs solely because newer types contain them.

## Development plan

- [Research and premium strategy](docs/RESEARCH.md)
- [Step-by-step roadmap](docs/ROADMAP.md)
- [Project architecture graph](docs/PROJECT_GRAPH.md)
- [A-Frame versus Three.js revamp plan](docs/REVAMP_PLAN.md)
- [Verification and known gaps](docs/VALIDATION.md)
- [Next-agent memory](docs/PROJECT_MEMORY.md)
- [Repository agent guidance](AGENTS.md)

Two reusable development/product skills live in `.agents/skills/`. The original models are preserved. The active bike and default arena are procedural because playability and frame time are the current priority; an embedded texture in the original jetbike GLB is corrupt.

The prototype still needs collision work, enemy fairness, audio, human balance tests, asset-rights verification, and paid-edition packaging. Nothing has been published or monetized.
