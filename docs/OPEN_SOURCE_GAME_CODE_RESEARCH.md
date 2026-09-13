# Open-source game code and camera references

## Recommendation

Retain A-Frame and the existing flight controller for Bridgehead Run. Use the version-matched Three pointer-lock implementation as the input lifecycle reference; use camera-controls as a reference for near-plane camera collision; use Dive for a bounded enemy-perception/reaction experiment. Sketchbook is a useful vehicle design reference, not a maintained replacement engine. Current Ecctrl is a serious R3F controller reference but is incompatible with this repository's React/Three versions without a separate migration project.

This shortlist distinguishes inspectable game source from libraries and distinguishes permissively licensed code from unverified art. No external code was copied, dependencies installed, game demos executed, or runtime files changed. “Playable” below means the official project supplies a game/demo entry, not that its present deployment was successfully playtested. Research snapshot: September 13, 2026. Maintenance observations concern the default branch; a repository's latest push can concern another branch or tag and is not synonymous with a recent default-branch code commit.

## Ranked shortlist

Ranking is an engineering judgment for the existing game, prioritizing controller ownership, useful bounded modules, inspected license text and integration cost over popularity.

| Rank | Reference | Type and best use | License inspected | Adoption decision |
|---|---|---|---|---|
| 1 | Three.js r147 PointerLockControls | First-person input reference; lock/unlock and listener lifecycle | MIT, r147 copyright 2010–2022 Three authors | Adapt lifecycle expectations into `fly-controls`; do not attach a second controller |
| 2 | yomotsu/camera-controls | Camera library; near-plane collision, damping, boundaries | MIT, copyright 2017 @yomotsu | Study corner-ray collision; isolated compatibility spike only if existing camera remains inadequate |
| 3 | Mugen87/dive | Playable Three/Yuka shooter showcase; perception/reaction and weapon separation | MIT, copyright 2019 Dive authors | Reuse narrowly scoped patterns, not entire game or old dependencies |
| 4 | swift502/Sketchbook | Third-person playground with airplane/helicopter/vehicle source | MIT, copyright 2020 swift502 | Reference for vehicle camera/input separation; archived, so no wholesale foundation swap |
| 5 | aframevr/a-blast | A-Frame VR shooter demo; pooled projectile/entity lifecycle | MIT, copyright 2015–2016 A-Frame authors | Audit existing pooling against its pattern; avoid old VR/build stack |
| 6 | pmndrs/ecctrl | R3F/Rapier controller toolkit and examples, including vehicles | MIT, copyright 2023–2026 Erdong Chen; NOTICE also inspected | Research-only for this build; modern peer requirements prevent drop-in use |

License/source links and immutable review snapshots appear below. The MIT texts permit commercial modification/distribution subject to preserving copyright and permission notices. This is a code-license screen, not a warranty of third-party asset rights or a complete legal audit. Each upstream license should accompany any substantial copied adaptation in the distributed notices bundle. [Three license](https://github.com/mrdoob/three.js/blob/r147/LICENSE), [camera-controls license](https://github.com/yomotsu/camera-controls/blob/c51601107e266097edf6a9caa57bfa9eaa77427c/LICENSE), [Dive license](https://github.com/Mugen87/dive/blob/7176136cf6c29eddfd620df2bf0d09a532680763/LICENSE), [Sketchbook license](https://github.com/swift502/Sketchbook/blob/62f4b7986fd1ce1e4f91daba89ef032c20a6ce55/LICENSE), [A-Blast license](https://github.com/aframevr/a-blast/blob/1984d1adb7845399fabd8672909ce1c74ccd5cf7/LICENSE), [Ecctrl license](https://github.com/pmndrs/ecctrl/blob/e2cab804f9f15661a642e76f52d09f0b2db63f35/LICENSE).

## Version and maintenance evidence

| Project | Reviewed default-branch commit | Commit date (UTC) | Maintenance interpretation |
|---|---|---|---|
| Three.js | `e45cbf7ff66df079cfa39d9699ccb42729934be1` | 2026-09-13 | Active upstream; camera source deliberately reviewed at old r147 to match local runtime |
| camera-controls | `c51601107e266097edf6a9caa57bfa9eaa77427c` | 2026-02-02 | Not archived; repository push 2026-09-09, but do not call that a default-branch implementation update |
| Dive | `7176136cf6c29eddfd620df2bf0d09a532680763` | 2022-04-09 | Not archived, but stale default branch; latest repository push 2023-04-29 |
| Sketchbook | `62f4b7986fd1ce1e4f91daba89ef032c20a6ce55` | 2024-10-10 | Archived/read-only; useful historical source, not active maintenance |
| A-Blast | `1984d1adb7845399fabd8672909ce1c74ccd5cf7` | 2018-08-24 | Old default branch; push 2022-02-26 does not establish modern compatibility |
| Ecctrl | `e2cab804f9f15661a642e76f52d09f0b2db63f35` | 2026-09-06 | Recent default-branch activity; package 2.0.2 inspected |

These dates were checked through GitHub's repository and commits APIs, rather than search-engine crawl dates. Recheck before adoption. Primary records: [Three commit](https://github.com/mrdoob/three.js/commit/e45cbf7ff66df079cfa39d9699ccb42729934be1), [camera-controls commit](https://github.com/yomotsu/camera-controls/commit/c51601107e266097edf6a9caa57bfa9eaa77427c), [Dive commit](https://github.com/Mugen87/dive/commit/7176136cf6c29eddfd620df2bf0d09a532680763), [Sketchbook repository/archive status](https://github.com/swift502/Sketchbook), [A-Blast commit](https://github.com/aframevr/a-blast/commit/1984d1adb7845399fabd8672909ce1c74ccd5cf7), [Ecctrl commit](https://github.com/pmndrs/ecctrl/commit/e2cab804f9f15661a642e76f52d09f0b2db63f35).

## Camera and input references

### Three.js PointerLockControls

The inspected r147 implementation connects mouse, pointer-lock-change and pointer-lock-error listeners to the element's owning document, matches the actual locked element, exposes lock/unlock events, and disconnects listeners on disposal. This supplies a concrete audit checklist for lifecycle correctness. It directly manipulates camera orientation and is a first-person controller; it does not provide our chase boom, collision, keyboard flight acceleration or cursor-drag fallback. [Version-matched source](https://github.com/mrdoob/three.js/blob/r147/examples/jsm/controls/PointerLockControls.js).

Recommendation: retain `fly-controls` as sole transform owner. Audit it for canvas-specific lock ownership, error handling, pause clearing, listener teardown and camera/player yaw separation. Test relative mouse deltas only while actually locked; test cursor movement only during the intended canvas drag. Current documentation describes APIs newer than r147, including the modern Controls base and an unadjusted-movement option; do not copy current examples blindly into the old runtime. [Current official documentation](https://threejs.org/docs/pages/PointerLockControls.html).

### camera-controls

The library accepts an explicitly installed Three namespace, supports smooth camera transitions and boundaries, and documents collision against a mesh list. Its documented collision technique uses four rays associated with camera near-plane corners and explicitly warns of the performance cost. That is more relevant to edge clipping than merely testing one center ray. It is still not a complete continuous swept-volume proof. [Official README](https://github.com/yomotsu/camera-controls/blob/c51601107e266097edf6a9caa57bfa9eaa77427c/readme.md), [implementation](https://github.com/yomotsu/camera-controls/blob/c51601107e266097edf6a9caa57bfa9eaa77427c/src/CameraControls.ts).

The inspected package declares Three >=0.126.1, which includes our runtime numerically. That is not evidence it was tested with A-Frame's super-three fork or this nested camera rig. Its current development dependencies use substantially newer Three. A spike would have to install the existing `AFRAME.THREE` namespace, update from A-Frame ticks, and transform world/local camera coordinates correctly. Never let camera-controls and `fly-controls` both own orientation or DOM input. [Package manifest](https://github.com/yomotsu/camera-controls/blob/c51601107e266097edf6a9caa57bfa9eaa77427c/package.json).

Preferred adaptation is smaller: run near-plane/corner clearance queries against the same always-resident box proxies as movement and projectiles, shorten the boom immediately on obstruction, and recover smoothly when clear. Do not raycast all streamed decorative triangles or allow an LOD swap to change the collision answer. This is a proposed project-specific implementation, not a feature already supplied by camera-controls.

## Playable game references

### Dive: strongest shooter architecture match

Dive is an official Three.js/Yuka shooter-AI showcase with a linked game entry. The package pins Three 0.113.0 and Yuka 0.7.0. Existing local use of Yuka makes its decomposition relevant, but the old renderer/dependency versions argue against copying the application scaffold. [Repository and demo link](https://github.com/Mugen87/dive), [package](https://github.com/Mugen87/dive/blob/7176136cf6c29eddfd620df2bf0d09a532680763/package.json).

Concrete source candidates are `src/core/WeaponSystem.js`, `src/entities/Enemy.js`, `src/controls/FirstPersonControls.js` and the separate `src/weapons/Projectile.js`/`Bullet.js`. The inspected weapon system separates reaction time and aim accuracy from weapon inventory/selection, and the controls expose connect/disconnect and velocity reset. These are useful reference boundaries for predictable Warden behavior and clean retries. [Weapon system](https://github.com/Mugen87/dive/blob/7176136cf6c29eddfd620df2bf0d09a532680763/src/core/WeaponSystem.js), [controls](https://github.com/Mugen87/dive/blob/7176136cf6c29eddfd620df2bf0d09a532680763/src/controls/FirstPersonControls.js).

Do not import its fuzzy multi-weapon selection merely because it exists: Bridgehead currently needs one readable enemy cycle. A bounded adaptation would separate “target seen,” “wind-up started,” “aim locked,” “projectile launched” and “recovering,” recording them in local QA. All clocks must remain simulation-owned and paused with A-Frame. This is a recommendation, not a finding that Dive implements our exact telegraph design or collision rules. Its code license does not independently verify every model, texture or sound asset; copy no art under this recommendation.

### Sketchbook: strongest vehicle reference, archived

Sketchbook provides a third-person Three/Cannon playground and a linked demo, with vehicle and character-control source. `CameraOperator.ts` separates target, radius, sensitivity and follow mode; `InputManager.ts` and input receiver interfaces provide an ownership pattern. `Airplane.ts` uses Cannon bodies and spring simulators, and separate helicopter source exists. [Repository](https://github.com/swift502/Sketchbook), [camera](https://github.com/swift502/Sketchbook/blob/62f4b7986fd1ce1e4f91daba89ef032c20a6ce55/src/ts/core/CameraOperator.ts), [airplane](https://github.com/swift502/Sketchbook/blob/62f4b7986fd1ce1e4f91daba89ef032c20a6ce55/src/ts/vehicles/Airplane.ts).

Study camera target versus vehicle orientation and continuous visual spring response. Do not import its physics world, character boarding system, jQuery UI or Webpack-era application. Its package uses Three 0.113.0, while the airplane imports Cannon directly and assumes a vehicle/body framework absent from our AABB flight solver. A physically simulated airplane's roll/lift behavior would also contradict the current deliberate level-yaw jetbike design. [Package](https://github.com/swift502/Sketchbook/blob/62f4b7986fd1ce1e4f91daba89ef032c20a6ce55/package.json).

Archive status is a material downside: a familiar-looking vehicle demo is not evidence that bugs or browser changes will be maintained. Borrow a narrowly tested mathematical response or ownership pattern, with attribution if copying substantial code, rather than assuming the whole game is a supported platform.

### A-Blast: closest framework, oldest architecture

A-Blast is an A-Frame WebVR shooter demo. Its bullet system keeps active bullets and delegates request/return to a pool helper; bullet/enemy types and component/system responsibilities are separated. This is directly recognizable in an A-Frame project and is suitable for auditing the current projectile pool. [Repository](https://github.com/aframevr/a-blast), [bullet system](https://github.com/aframevr/a-blast/blob/1984d1adb7845399fabd8672909ce1c74ccd5cf7/src/systems/bullet.js), [pool helper](https://github.com/aframevr/a-blast/blob/1984d1adb7845399fabd8672909ce1c74ccd5cf7/src/lib/poolhelper.js).

The old VR interaction model, global registry and build stack are not a contemporary React desktop-game template. Use it to ask whether every projectile has one owner, one return path and complete reset state; do not replace existing pooled bolts solely to resemble the example. Prevent duplicate returns and stale references explicitly in local tests. [Package](https://github.com/aframevr/a-blast/blob/1984d1adb7845399fabd8672909ce1c74ccd5cf7/package.json).

## R3F alternatives and legal exclusions

### Ecctrl: maintained but migration-only

Ecctrl 2.0.2 is a physics-driven R3F/Rapier toolkit, not a complete premium shooter. Its tree exposes vehicle, input, time and animation modules; `src/vehicles/EcctrlVehicle.tsx`, `ShapeCastWheel.tsx`, `ThrustPropeller.tsx`, and `src/gravity/EcctrlCameraControls.tsx` are concrete starting points for an isolated future vehicle-controller study. The camera wrapper imports Drei and React and is not a standalone A-Frame component. [Repository](https://github.com/pmndrs/ecctrl), [camera source](https://github.com/pmndrs/ecctrl/blob/e2cab804f9f15661a642e76f52d09f0b2db63f35/src/gravity/EcctrlCameraControls.tsx), [vehicle source](https://github.com/pmndrs/ecctrl/blob/e2cab804f9f15661a642e76f52d09f0b2db63f35/src/vehicles/EcctrlVehicle.tsx).

The actual inspected peer dependencies require React/ReactDOM >=19.2.7, Fiber >=9.4, Rapier >=2.2.0 and Three >=0.184.0. The official Fiber project states Fiber 8 pairs with React 18 and Fiber 9 with React 19. Installing current Ecctrl into this React 18/A-Frame project by overriding peer checks would not solve the architecture mismatch. [Ecctrl package](https://github.com/pmndrs/ecctrl/blob/e2cab804f9f15661a642e76f52d09f0b2db63f35/package.json), [Fiber version guidance](https://github.com/pmndrs/react-three-fiber).

Ecctrl's inspected NOTICE identifies example character animations as based on Quaternius's Universal Animation Library under CC0. That is useful specific provenance, not permission to assume all external example media everywhere are CC0. Preserve the MIT copyright/license and relevant NOTICE information when redistributing substantial portions. [NOTICE](https://github.com/pmndrs/ecctrl/blob/e2cab804f9f15661a642e76f52d09f0b2db63f35/NOTICE).

### Excluded: doom-react-three-fiber

The repository `eugeniosegala/doom-react-three-fiber` advertises a playable React 18/R3F shooter and has a default-branch commit dated April 13, 2026 (`b48daeb3f91b8d8175a1d59d6a9c0c6c3b47caa0`). However, the GitHub license API returned 404, the recursively inspected tree exposed no LICENSE/COPYING/NOTICE file, and the README contained no license grant. Exclude it from copy/adapt recommendations until explicit licensing and art provenance are supplied. [Repository/README](https://github.com/eugeniosegala/doom-react-three-fiber), [reviewed commit](https://github.com/eugeniosegala/doom-react-three-fiber/commit/b48daeb3f91b8d8175a1d59d6a9c0c6c3b47caa0).

Public source visibility is not permission to reproduce or distribute derivatives. GitHub's own guidance distinguishes viewing/forking a public repository from an open-source license grant. Branding and imagery associated with another game also merit separate rights review. No permission was requested and none is inferred. [GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## Compatibility contract for this repository

Local package inspection confirms A-Frame 1.4.0 depends on super-three ^0.147.0; installed super-three is 0.147.1. React is 18 and the Vite bridge resolves gameplay Three imports to `window.AFRAME.THREE`. Newer installed Three types are not evidence of runtime API availability. These are local observations, not upstream compatibility promises.

Any adapted code must follow these boundaries:

1. One renderer and one Three namespace. Never create an R3F Canvas over the live A-Frame scene or bundle a second Three to satisfy a foreign example.
2. One input/transform owner. Reference controllers supply patterns; `fly-controls` remains responsible for flight/look. Camera collision may propose a safe boom transform, not independently rotate the pilot.
3. One simulation clock. Convert foreign requestAnimationFrame/setTimeout behavior into pause-safe A-Frame updates; teardown must cancel listeners and invalidate pending work.
4. One resident collision contract. Camera/player/projectiles query supported world proxies. Do not use changing visual LOD meshes as authoritative blockers.
5. React owns menu/results. Port gameplay state/events, not external DOM mutation or foreign UI frameworks.
6. Independent art rights. Avoid vendoring any external game's textures, levels, sounds or logos until their individual provenance is recorded.

## Exact next-agent work order

**First task: camera/input audit, not dependency installation.** Read the pinned r147 PointerLockControls source and camera-controls near-plane collision section, then compare `fly-controls` and chase-camera behavior against them. Create a baseline fixture at the three existing cover boxes. Include a rotated player, close wall, corner, overhead obstruction, fast reverse motion, cursor drag, failed pointer lock, Escape, focus loss and retry. Record safe camera position, local/world conversion, listener count and unchanged renderer identity.

If clipping is reproduced, implement the smallest project-native near-plane/boom-clearance improvement using shared proxies. Preserve immediate obstruction contraction and bounded recovery; measure added queries and frame cost. The acceptance gate is zero reproduced camera-through-cover cases in the fixed matrix, unchanged weapon occlusion and no input/reset regression—not merely an aesthetically smoother orbit. A library trial becomes justified only if this bounded change cannot meet the gate.

**Second task: Warden behavior instrumentation.** Use Dive's separation of reaction and aiming concerns to audit the current Warden. Record sight acquired/lost, wind-up, locked aim, projectile launch and recovery as simulation events. Verify that pause freezes each phase, cover interrupts the intended phases consistently, and death/reset prevents later attacks. Keep one weapon and one enemy; reject unrelated fuzzy selection or navigation expansion.

**Third task: attribution and integration receipt.** Before copying any substantial source, record upstream commit, exact files/functions, full license text, changes and dependency assumptions in a third-party ledger. Preserve the associated notices in packaged output and add tests around the adaptation. An idea-level independent implementation can still cite its reference, but do not disguise copied source as an original implementation.

**Deferred task: isolated R3F evaluation only after authorization.** If an engine migration is later requested, build a separate comparison containing the same route, camera, target hardware and quality settings. Establish React/Fiber/Rapier version compatibility first. Compare measurable input/collision/maintenance benefits with the cost of rebuilding mission lifecycle, streaming and tested A-Frame integrations. Ecctrl's active development alone is not sufficient reason to migrate.

## Source inventory and limitations

All citations above are original repositories, source files, license files or official documentation. License bodies were inspected directly, not inferred from repository badges. The source review covered named modules and selected implementation sections, not full security audits of entire repositories. No dependency installation or clean-build verification of these external projects was performed. Maintenance dates are snapshot evidence, not promises of support.

The strongest immediate evidence-based conclusion is that reusable patterns exist without importing another game's engine. The remaining uncertainty is whether those patterns materially improve Bridgehead's measured camera/control failures. That question is answered by the bounded local comparison, not by GitHub stars, a polished upstream screenshot or a new framework's feature list.
