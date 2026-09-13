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
| Mouse / arrow keys | Aim / turn |
| Left click / hold | Fire |
| Shift | Boost |
| R | Reload |
| Escape | Pause |

Sensitivity, reduced screen effects, invert-Y and audio volume persist between runs. Best score is local to the browser. The full human playtest checklist is in [docs/VALIDATION.md](docs/VALIDATION.md).

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
- [Premium game master plan](docs/PREMIUM_GAME_MASTER_PLAN.md)
- [Level and asset audit](docs/ASSET_LEVEL_AUDIT.md)
- [Repository agent guidance](AGENTS.md)

Two reusable development/product skills live in `.agents/skills/`. The original models are preserved. The active bike and default arena are procedural because playability and frame time are the current priority; an embedded texture in the original jetbike GLB is corrupt.

The prototype now has shared swept cover collision, telegraphed enemy projectiles, live radar and pooled shot effects. It still needs ordinary-browser performance profiling, human balance tests, complete mission reset, asset-rights verification, and paid-edition packaging. Nothing has been published or monetized.


## Repeatable browser QA

Open `http://127.0.0.1:4173/?playtest` after building and starting preview. **Run browser checks** exercises actual A-Frame/Three objects and cleanup, then ends in defeat. Reload before **Run combat soak**, which drives an ordinary-weapon scripted pilot through up to 90 seconds of combat and reports frame timing and renderer counts. These are engineering tests, not human playtests. QA best score is stored separately. The normal game URL hides all QA controls.

A small browser-only pacing baseline is available from the development server at `http://127.0.0.1:5173/tests/browser-frame-baseline.html`. It is excluded from production packaging. See `docs/VALIDATION.md` for measurements and limitations.
