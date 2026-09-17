# iPad control rethink

September 17, 2026

## Current result

The physical iPad Safari playtest failed the control-feel gate. The user reported that camera movement and gameplay were "really, really bad", barely worked, and did not move properly. Treat this as a design failure of the current touch-control model, not as a sensitivity-only bug.

The current `?ipad-stage` still has useful engineering value: fast load, small arena, touch UI plumbing, separate stage scoring, Warden/extraction lifecycle and tests. It should not be treated as a candidate mobile control scheme.

## Likely causes

- Touch input is routed through `FlightInputAdapter` into desktop-oriented `fly-controls`. That path was built for mouse and gamepad assumptions, not touch ergonomics.
- The AIM pad uses drag deltas consumed once per frame. This avoids endless spin, but it also makes camera movement depend on touch-event cadence and thumb motion in a way that can feel discontinuous or inert.
- Two-stick free flight plus separate UP/DOWN/BOOST/FIRE buttons asks too much of thumbs during combat.
- The chase camera, yaw-plane movement and pitch-only aim are understandable on desktop but too indirect on a flat touchscreen.
- The stage asks the player to move, aim, manage altitude, boost and shoot before the camera model has earned trust.

## New mobile direction

Do not keep polishing the current dual-stick `fly-controls` mapping as the main iPad path. Build the next iPad experiment as a separate mobile-first control model.

Recommended next experiment: **assisted route flight**.

- Auto-forward at a modest constant speed after launch.
- Left thumb steers horizontally and optionally controls altitude with a forgiving vertical band.
- Camera yaw follows the bike's travel direction and objective, not a raw right-stick camera.
- Right thumb aims a weapon reticle or target bias, not the whole camera.
- Warden combat should use generous soft lock and clear telegraphs.
- The first task should be "fly through a big gate and hit a large target", not full 3D dogfighting.

Acceptance for the next experiment:

- On physical iPad Safari, a first run can steer through one gate without fighting the camera.
- The player can keep the Warden on screen without using a second camera stick.
- FIRE can be tapped while steering without losing directional control.
- Failure feels like a route/combat mistake, not input confusion.
- The user says it is at least controllable before any art or mission expansion continues.

## Implementation boundary

Keep `fly-controls` for desktop Bridgehead/Twin Bridge. Do not risk desktop feel while exploring mobile.

Create a separate mobile control component or mode for the next iPad prototype. It may still reuse `FlightInputAdapter` types if useful, but it should own its own camera-follow and steering rules. Update tests to prove desktop `fly-controls` behavior remains unchanged.
