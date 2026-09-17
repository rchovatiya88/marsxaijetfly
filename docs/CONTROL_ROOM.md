# Red Horizon control room

Last updated: September 17, 2026.

## What this project is

Red Horizon is a premium paid single-player Mars jetbike game. The current recommended path is a free browser demo that proves the hook, followed later by a paid full downloadable edition. This repository is not ready for public launch, payments, storefront setup, or paid-edition claims.

## Current truth

- The desktop/A-Frame prototype has useful gameplay, mission, enemy, weapon, result-screen, asset-loading and build/test infrastructure.
- Bridgehead is the main playable candidate, but it still needs natural human playtest evidence before it can be called premium-ready.
- The iPad touch-stage plumbing works as an experiment, but the physical iPad Safari control feel failed. Treat that as a control-design failure, not a small sensitivity bug.
- The repo is clean and synced with `origin/main` after the latest documentation/skill updates.
- Codex weekly usage was last observed at about 87 percent used, 13 percent remaining, with no banked reset credits.

## What failed

The current iPad model routes touch input into the desktop-oriented `fly-controls` path. That makes camera movement and gameplay feel bad on real iPad Safari. Do not keep polishing the current dual-stick touch mapping as the main mobile solution.

## Best next gameplay experiment

Build a separate mobile-first assisted route-flight prototype:

- Auto-forward at modest speed after launch.
- Left thumb steers the bike and optionally controls altitude with a forgiving vertical band.
- Camera follows travel direction and objective framing instead of acting like a raw right-stick camera.
- Right thumb biases aim or target lock instead of controlling the whole camera.
- Fire must be usable while steering.
- First proof should be one large gate plus one large target, not full 3D dogfighting.

Acceptance is simple: on physical iPad Safari, the user can steer through one gate, keep the target on screen, fire without losing control, and say it feels controllable.

## What Codex can do now

- Keep this control-room doc updated.
- Make one tightly scoped implementation branch for the assisted mobile prototype.
- Preserve desktop `fly-controls` and Bridgehead behavior while adding mobile-specific code.
- Run `npm test`, `npm run typecheck`, and `npm run build` after gameplay changes.
- Push small, understandable commits.

## What to avoid while usage is low

- Do not install more plugins unless a specific missing capability blocks the next step.
- Do not do broad research sweeps.
- Do not generate more art, trailers, store assets, or public pages.
- Do not add payments, entitlement logic, accounts, or storefront work.
- Do not call the game premium-ready based on automated tests alone.

## Next move

Use remaining Codex usage only for planning and one small code slice. The recommended code slice is:

1. Add a separate assisted mobile control mode for `?ipad-stage`.
2. Keep desktop `fly-controls` unchanged.
3. Make the test route simpler: one big gate, one big target, generous aim assist.
4. Build and test.
5. Retest on physical iPad Safari before expanding content.

