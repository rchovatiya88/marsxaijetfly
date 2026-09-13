# Project graph

Generated from the current repository on 2026-09-13. This graph distinguishes the active Red Horizon runtime from legacy/demo files that are still present in the repo.

## Active runtime

```mermaid
flowchart TD
  Browser["Browser"]
  IndexHtml["index.html"]
  VendorAFrame["public/vendor/aframe.min.js"]
  ReactEntry["src/index.tsx"]
  App["src/App.tsx"]
  Init["src/aframe-init.ts"]

  Browser --> IndexHtml
  IndexHtml --> VendorAFrame
  IndexHtml --> ReactEntry
  ReactEntry --> Init
  ReactEntry --> App
  App --> Scene["A-Frame scene"]

  Init --> Utils["utils / particle-system"]
  Init --> Hitbox["hitbox-component"]
  Init --> SpriteAnim["spritesheet-animation-component"]
  Init --> SpriteParticles["sprite-particles-component"]
  Init --> Fly["fly-controls"]
  Init --> Player["player-component"]
  Init --> Weapon["weapon-component"]
  Init --> Enemy["enemy-component"]
  Init --> Manager["game-manager"]
  Init --> Navmesh["simple-navmesh-constraint"]

  Scene --> Arena["procedural arena"]
  App --> World["arena-world.ts: shared cover / collision"]
  App --> Settings["settings.ts: local preferences"]
  App --> QA["PlaytestPanel.tsx: optional browser QA"]
  Scene --> PlayerEntity["#player"]
  Scene --> Manager

  PlayerEntity --> Player
  PlayerEntity --> Fly
  PlayerEntity --> CameraRig["#camera-rig / #camera"]
  PlayerEntity --> Jetbike["#jetbike"]
  Jetbike --> Weapon

  Manager --> EnemySpawn["spawn enemies"]
  EnemySpawn --> Enemy
  Enemy --> Yuka["YUKA steering"]
  Enemy --> Player
  Weapon --> Enemy
  Weapon --> World
  Enemy --> World
  Fly --> World
  Fly --> Player
  Navmesh -. legacy, not attached .-> NavmeshAsset["preserved navmesh GLB"]
```

## Gameplay ownership

```mermaid
flowchart LR
  React["React App"]
  AFrame["A-Frame scene"]
  Manager["game-manager"]
  Fly["fly-controls"]
  Weapon["weapon-component"]
  Enemy["enemy-component"]
  Player["player-component"]

  React -- launch/pause/cursor fallback/settings --> AFrame
  AFrame -- mission-message / mission-ended --> React
  Manager -- waves / score / activeEnemies / elapsed time --> Enemy
  Manager -- results --> React
  Fly -- movement / look / velocity --> Player
  Weapon -- camera-world ray / ammo / reload --> Enemy
  Enemy -- damage / AI / death --> Manager
  Enemy -- damage --> Player
  Player -- player-died --> Manager
```

## Build and vendor flow

```mermaid
flowchart TD
  Package["package.json scripts"]
  Prepare["scripts/prepare-vendor.cjs"]
  PublicVendor["public/vendor"]
  Vite["vite.config.mjs"]
  ThreeBridge["virtual three bridge to AFRAME.THREE"]
  Dist["dist/"]

  Package --> Prepare
  Prepare --> PublicVendor
  Package --> Vite
  Vite --> ThreeBridge
  Vite --> Dist
```

## Active versus legacy

```mermaid
flowchart TD
  Active["Active path"]
  Legacy["Legacy/demo path"]

  Active --> A["index.html"]
  Active --> B["src/index.tsx"]
  Active --> C["src/App.tsx"]
  Active --> D["src/aframe-init.ts"]
  Active --> E["src/components/fly-controls.ts"]
  Active --> F["src/components/player-component.ts"]
  Active --> G["src/components/weapon-component.ts"]
  Active --> H["src/components/enemy-component.ts"]
  Active --> I["src/components/game-manager.ts"]
  Active --> J["src/components/simple-navmesh-constraint.ts"]
  Active --> K["tests/gameplay.test.cjs"]

  Legacy --> L["public/index.html"]
  Legacy --> M["src/demo-scene.ts"]
  Legacy --> N["src/components/custom-fly-controls.ts"]
  Legacy --> O["firework / particle demo components"]
  Legacy --> P["public/images/demo/*"]
  Legacy --> Q["public debug scripts"]
```

## Current pressure points

```mermaid
flowchart TD
  Perf["Performance still bad"]
  Assets["43 MB public/dist payload"]
  AFrameDOM["DOM/entity lifecycle overhead"]
  Level["Large visual level used in gameplay checks"]
  Effects["Transient effects and timers"]
  Collision["No dependable swept collision yet"]
  Revamp["Direct Three.js spike"]
  Repair["A-Frame optimization path"]

  Perf --> Assets
  Perf --> AFrameDOM
  Perf --> Level
  Perf --> Effects
  Perf --> Collision

  Assets --> Repair
  Effects --> Repair
  Collision --> Repair
  AFrameDOM --> Revamp
  Level --> Revamp
  Level --> Repair
```

## Next graph targets

- Add a measured performance graph after Day 0 from `docs/REVAMP_PLAN.md`.
- If the Three.js spike starts, add a second graph for `src/three-game/` and compare it against this A-Frame graph.
- Remove legacy/demo nodes from production packaging once asset cleanup starts.
