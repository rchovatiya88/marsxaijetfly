# Red Horizon — Mars Jetbike

A playable React + A-Frame + Three.js combat-flight prototype. Ridge Run is the default: choose a high/low route through a Blender-authored canyon, defeat the GLB Warden and extract. The real bike uses a separate repaired-material GLB. `?arena` retains three-wave combat; a failed authored-level load retains the procedural fallback. The product direction is premium paid; this is still a prototype, not a release-ready game.

## Run

`?full-level` opens the experimental complete-level LOD survey. Four coarse chunks stay resident; nearby detail loads separately under request/residency/triangle caps. This is free inspection flight, **not terrain collision or a combat mission**. `?full-level&playtest` exposes the repeatable streaming test. Research, design and next implementation gates: `docs/FULL_LEVEL_STREAMING_RESEARCH.md`.

Use Node 22.12 or newer.

```sh
npm ci --legacy-peer-deps
npm start
```

Open http://localhost:5173. Click **Launch Sortie**; if mouse capture is blocked, choose **Play with drag aim**. Hold right mouse to aim, or left mouse to aim and fire. Hovering over menus no longer turns the bike.

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
npm run ai:audit
```

Production files are in `dist/`. Start/build copies pinned local A-Frame and Draco dependencies into `public/vendor`. Vite's root `index.html` is the active HTML entry. Old CRA/Webpack files and `public/index.html` are historical and are not used by the current build. Typecheck covers the active entry and imports; unused legacy demos are not certified.

The Vite Three bridge reuses A-Frame's runtime. The separate Three package supplies existing types and build-time export names. Avoid adding runtime APIs solely because newer types contain them.

## Development plan

Start the current route experiment at `http://127.0.0.1:4173/?ridge-run` after `npm run build` and `npm run preview`. The default URL remains three-wave combat. Ridge Run currently uses the procedural arena: choose the boosted high gate for three double-damage shots or the low gate for 30 shield, defeat the real-GLB Warden, then hold inside extraction. Retry resets in place.

The next production work is documented in [Ridge Run PRD](docs/RIDGE_RUN_PRD.md), [research](docs/RIDGE_RUN_RESEARCH.md), [Blender MCP setup](docs/BLENDER_MCP_SETUP.md), and [inspected asset ledger](docs/ASSET_LEDGER.md). Editable candidate layout and manual export instructions are in [art/ridge-run](art/ridge-run/README.md). [Generated concepts](art/concepts/README.md) are intended art direction, not screenshots of the build.

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

The prototype now has shared swept cover collision, telegraphed enemy projectiles, live radar, pooled shot effects and in-place mission reset. It still needs ordinary-browser performance profiling, human balance and long-session tests, asset-rights verification, and paid-edition packaging. Nothing has been published or monetized.


## Repeatable browser QA

Open `http://127.0.0.1:4173/?playtest` after building and starting preview. **Run browser checks** exercises actual A-Frame/Three objects and cleanup, then ends in defeat. Reload before **Run combat soak**, which drives an ordinary-weapon scripted pilot through up to 90 seconds of combat and reports frame timing and renderer counts. These are engineering tests, not human playtests. QA best score is stored separately. The normal game URL hides all QA controls.

A small browser-only pacing baseline is available from the development server at `http://127.0.0.1:5173/tests/browser-frame-baseline.html`. It is excluded from production packaging. See `docs/VALIDATION.md` for measurements and limitations.
