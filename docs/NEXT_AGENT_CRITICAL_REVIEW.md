# Critical handoff: Red Horizon

Reviewed September 13, 2026 against the current uncommitted working tree, active source, validation record and the supplied gameplay recording. This is a review and work order, not a claim that every possible defect has been found. No new gameplay changes were made during this review.

## Verdict

This is a working three-wave combat prototype, not yet a persuasive premium game. It has repaired controls and combat, a more coherent Mars backdrop, and useful engineering fixtures. It has not proved that flight creates interesting decisions, that people want another run, or that it runs smoothly on the intended hardware. More decorative geometry will not answer those questions.

The latest graphics work improved scenery more than level design. Rocky ridges surround a largely flat rectangular arena containing primitive cover, luminous rings and posts. The ship is a better procedural silhouette, but the scene still reads as a test arena. That is a visual judgment from the video and subsequent browser screenshots, not a measured player consensus.

Do not describe scripted victories as fun, reduced draw calls as higher FPS, or stable enemy geometry as a complete leak-free lifecycle.

## Preserve these repairs

Read AGENTS.md, PROJECT_MEMORY.md, VALIDATION.md and both project skills. Preserve the single fly-controls controller, A-Frame-owned Three runtime, camera world-space aim, shared cover rules, simulation-owned combat deadlines, pooled player bolts and React menu/result ownership. The latest source is NOT represented by HEAD alone: many modifications and five new source/test files are uncommitted. Inventory and preserve the working tree before editing. Do not reset it or revive obsolete demos to make a clean diff.

## Priority 1: performance evidence is insufficient and the target is unmet

**Confirmed:** previous 1280×720 embedded-browser combat measured median 32.2 ms/p95 42.5 ms. A repeated fixed 1280×720 soak now measures 26.6/37.3 ms over 1,170 frames, while the latest graphics run reported 35.9/52.7 ms at 540×654. These runs still do not establish a hardware-wide graphics regression or improvement. None demonstrates 60 FPS. The initial art-pass counts changed from 82 draws/16,956 triangles/50 geometries to 56/29,938/40. We exchanged submissions for triangles; only the fixed soak provides a fairer frame-time comparison.

**Fix:** declare minimum hardware and exact CSS viewport, device pixel ratio, internal canvas dimensions and quality preset. Build once; use a seeded encounter and repeat the same camera/input route after warmup. Capture CPU main-thread, GPU where supported, frame intervals and allocation/GC evidence in ordinary desktop Chrome. Repeat three times, with an idle-browser control. Diagnose the largest cost before changing engine or visual quality. Keep the same benchmark after each optimization.

**Acceptance:** reproducible measurements with build identity and settings; the declared target holds through representative combat, not only the menu. If the target cannot be met, explicitly revise supported settings/hardware rather than quietly shrinking the render resolution. Current internal 1280×720 cap and disabled antialiasing also make a large display look soft/jagged; expose deliberate quality choices only after profiling.

## Priority 2: the game lacks a demonstrated reason to fly

**Confirmed scope:** three waves, one weapon, score chains, ground pursuers and bounded flight. There is no authored route/extraction mission or implemented gate-charge mechanic in the active scene. Glowing rings imply an interaction the current mission does not provide.

**Risk to test:** circling and holding fire may dominate play; altitude and boost may add freedom without meaningful tradeoffs. A scripted pilot winning does not prove this exploit or disprove it.

**Fix:** run an uncoached session first. Record first hit, first understood threat, deaths, confusion and voluntary replay. Then implement ONE flight/combat experiment: boost through a clearly signaled gate to earn an empowered shot, with a short alternate route and a threatening encounter. Compare it with the existing wave arena. Do not build nine missions or an upgrade tree before this earns another run.

**Acceptance:** fresh players can explain why movement matters and voluntarily replay. Use the roadmap's ten-player/eight-first-hit/five-replay targets as internal decision gates, not market facts.

## Priority 3: enemy encounters and aim need honest tuning

**Confirmed in enemy-component.ts:** seek toward the player, stop near ten horizontal units, a perpendicular detour when cover blocks sight, and separationBehavior.active = false. This is not robust pathfinding or tactical coordination. Normal/fast/tank roster changes do not establish distinct tactical roles. **Unverified risks:** bunching, repeated corner failure, enemies that cannot pressure altitude, synchronized warnings and trivial circular strafing.

**Fix:** reproduce a corner jam and four-enemy clustering with deterministic fixtures before choosing steering changes. Add bounded separation and explicit attack slots if evidence supports them. Give one enemy a different readable job rather than another health multiplier. Test maximum altitude, stationary play, perpetual strafe and cover abuse. Maintain the existing dodgeable 850 ms warning and reciprocal cover rules while tuning.

**Confirmed in weapon-component.ts/findEnemyHit:** generous fallback aim radius grows with distance and caps at four world units. That supports accessibility but can reward visibly missed shots and make impact location disagree with the enemy silhouette. This is a deliberate assist with unvalidated tuning, not proof of a broken ray.

**Fix/acceptance:** provide a debug hit-volume/assist overlay; record edge-of-target hits at near/mid/far ranges and beside cover. Tune assist in screen angle and ensure impact feedback communicates the selected target. Human observers should understand hits and misses; all existing cover/rotated-camera tests must remain green.

## Priority 4: restart is still a page reload

**Confirmed:** App.tsx result button calls window.location.reload(). Ten enemy spawn/remove cycles do not test ten complete sorties. Full reset ownership remains unproven.

**Fix:** add one explicit mission-reset path that clears pending effects, enemies, registrations, input, projectiles, clocks, score/combo, camera, player health/ammo and HUD/result state while preserving settings. Avoid spreading reset logic across unrelated event handlers. Track who owns every listener and timer.

**Acceptance:** ten complete win/fail/retry cycles, including pause during reload and effects. No duplicate damage/events, stale entities, held input, audio duplication or growing post-cleanup resources. Do not remove the reload fallback until reset passes.

## Priority 5: visual polish is incomplete

**Observed:** the environment now has layered ridges and textured sand, but playable cover remains boxes and cylinders; boundary rails look artificial; enemy bodies and rings remain simplistic. The warm palette can compress enemy/ground contrast. The bike contact shadow is a soft plane, not scene-wide lighting. These are constraints of the current art, not hidden photorealism features.

**Fix:** author a small coherent set of industrial cover silhouettes with readable collision edges, material hierarchy and scale cues. Make decorative rings either functional or visibly decorative. Spend detail near the player's path, not on more distant triangles. Test enemies against both sand and dark cover, including reduced-effects mode. Use coordinated impact sparks/brief flash rather than enlarging glowing spheres. Check sun, fog and custom material color conversion against A-Frame's actual Three version; newer typings are not runtime proof.

**Acceptance:** compare matching before/after camera positions and motion clips. Threats and cover stay readable at actual gameplay resolution; art changes preserve collision and benchmark budgets. Do not claim premium polish from one flattering still image.

## Priority 6: temporary effects still have fragmented ownership

**Confirmed:** enemy hit effects and damage text allocate DOM/A-Frame entities and use setTimeout cleanup; other legacy weapon effect helpers also contain timeouts. Not every helper is necessarily active. Combat timers are already tick-driven; do not falsely report that combat currently continues while paused.

**Fix:** trace active call sites, measure allocation during sustained hits, and remove dead helpers only after verifying imports/callers. Pool the expensive active effects and give them one simulation-lifetime/disposal owner. Decide explicitly whether cosmetic fades freeze during pause. Ensure callbacks cannot touch disposed or reset entities.

**Acceptance:** pause mid-impact and retry immediately; effects do not persist, jump unexpectedly or accumulate. Profile allocations and listener counts as well as GPU geometries. Stable geometries alone miss materials, textures, JS objects and listeners.

## Priority 7: QA coverage overstates neither usability nor reliability

**Passed previously:** 17 Node tests, typecheck, build, 20 live browser assertions, three-wave scripted victory. Last cleanup test held at 41 GPU geometries. This review did not rerun those unchanged checks.

**Missing:** reliable real pointer-capture automation, ordinary Chrome/Firefox/Safari coverage, ten full retries, controller/remapping, resize/DPR matrix, extended session, audio mix audition and uncoached enjoyment. Tests use mocks and local fixtures that intentionally alter the sortie. Seeded encounter/input replay is absent; manager spawning uses Math.random(). Latest embedded viewport variation weakens performance comparisons.

**Fix:** keep fixtures but add build/seed/settings metadata, explicit viewport capture, deterministic replay and separate human playtest notes. Test actual launch, focus loss, Escape, resume, reload, death and retry. Audit controls while settings inputs have focus. Test denied storage and failed audio/pointer APIs without blocking play. Never use a QA-altered sortie as a normal-play demonstration.

## Priority 8: architecture and documentation need containment

**Confirmed:** broad any types, string-based scene attributes and global document lookups make ownership difficult to verify. React owns menus/results, while some HUD values are mutated by gameplay components. A-Frame 1.4 runtime and Three 0.160 typings differ. Legacy components/configuration coexist with the active path. REVAMP_PLAN contains historical problems that later repairs resolved; older memory sections also contradict newer ones.

**Fix:** type the active component contracts, define one mission-state boundary and distinguish HUD ownership before expanding features. Archive obsolete documentation sections with explicit dates and superseded status; make one current status table authoritative. Verify runtime APIs against installed A-Frame code. Remove dead source only in a separate reversible cleanup with import checks. Do not undertake a direct-Three rewrite on taste: use the existing bounded spike rule and compare behavior/performance on identical content.

**Acceptance:** a new agent can identify the entry graph and current constraints without guessing which document is true; reset/state transitions have a single understandable owner; tests cover behavior rather than mirroring implementation.

## Priority 9: paid value is wholly unvalidated

Premium paid is the user's chosen direction. It is not evidence of demand. There is no validated price, sales forecast, content budget or proven replay loop. The current arena is not a credible full paid package. Do not implement checkout, publish or send outreach as part of this review.

Fix the playable slice, gather actual replay/clarity evidence, then test the proposed package and price hypotheses. Verify shipped asset provenance and license obligations before distribution. Preserve original supplied models, including the corrupt bike GLB; do not silently ship everything from public/. Commercial planning must follow observed value, not substitute for it.

## Work order for the next agent

1. Read this handoff and inspect the dirty working tree. Establish a fixed browser benchmark and reproduce one real usability/encounter defect.
2. Fix the highest measured performance or input blocker with a small diff; rerun existing checks and the identical scenario.
3. Implement and validate full reset before adding content. Keep separate evidence for enemy cleanup versus full retries.
4. Conduct or prepare a short uncoached playtest; record unresolved human judgments honestly if participants are unavailable.
5. Prototype one meaningful flight decision, then improve arena art to support that decision.
6. Update current docs with changed behavior, exact validation and remaining limitations. Leave screenshots/clips and a reproducible command/scenario for the next review.

Stop criteria: finish a bounded, verified improvement rather than accumulating unrelated polish. Do not declare the project finished until the performance, input/retry and human-play gates actually pass. Do not manufacture human evidence or keep rewriting architecture because testing is inconvenient.
