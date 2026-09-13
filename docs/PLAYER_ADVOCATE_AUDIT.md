# Player advocate audit — September 13, 2026

Verdict: Ridge Run is an inspectable action prototype, but dependable first-run completion remains unproved. The full-level mode is a useful survey tool, not a playable mission. More scene detail does not close this gap.

## Evidence limits

One expert agent performed a fresh-tab UI audit in Chrome at `http://127.0.0.1:4173/` and `?full-level`, with 1920×865 screenshots. The local dist entry identified `index-B6ITRBdl.js`; Git HEAD was `c04bd2c`, with working-tree changes. No runtime fixtures, direct component calls, teleporting, artificial damage or state inspection were used in this audit. Actions were visible UI clicks, keyboard taps and canvas drags.

This is **not an uncoached human playtest**: the agent previously implemented parts of this game and read its design. Human sample size is zero. The browser API exposes key presses but not a documented sustained key hold, so boost-through navigation, full natural route completion and simultaneous steering/fire were not established. Failure to complete with these tools must not be reported as a player failure. Real captured mouse, right-button dragging, comfort, audio quality and reliable frame time were not evaluated.

Existing profile settings were sensitivity 1, invert-Y enabled, reduced effects enabled, volume 0.7; these were preserved. They are not assumed factory defaults. Prior automated victory/resource results are recorded separately in VALIDATION.md and do not become human evidence here.

## Observed sequence

1. Default launch: menu explained the high/low rewards, Warden and extraction. Drag launch succeeded. Two gates were visible; cyan high-left was clearer than amber low-right against the orange background. Vehicle remained near the middle of the gate sightline.
2. D and W taps visibly shifted the scene. A left drag from approximately (950,430) to (1010,460) changed yaw/pitch and consumed five rounds (30 to 25). Bike did not visibly pitch with the view. Eight more W taps produced limited forward movement; the low gate was not crossed in this audit.
3. Escape displayed HOLD POSITION. Drag resume restored play; R displayed RELOADING. No restart or recovery blocker was observed on that path.
4. Full-level menu briefly showed PREPARING FLIGHT, then enabled launch. At 1920×865, the primary launch button was near the lower edge and the drag-launch fallback was below the initial fold; the semantic UI click scrolled to it.
5. Survey launch rendered the whole layout below the player at the displayed 25 m altitude. HUD declared no collision/combat but also retained SCORE, CHAIN, HOSTILES, hull, ammo and a large technical streaming line. Coarse 4/4, detail 0/2, 172,065 environment triangles, four requests and zero streaming errors were displayed.
6. Q/W taps and a short left drag changed the survey view; ammo dropped from 30 to 26. The terrain still read as an aerial model with the bike against the sky, rather than a vehicle moving through a place. Escape paused correctly. The audit ended paused.

## Provisional 100-point readiness rubric

These are skeptical reviewer scores for demonstrated first-run readiness, not measured enjoyment or market value. Unverified categories lose confidence/points; a low score is not proof every missing behavior is broken. Survey is scored against the requested playable-game goal, not its legitimate role as an editor inspection tool.

| Category | Maximum | Ridge | Full-level |
|---|---:|---:|---:|
| Launch and comprehensible entry | 10 | 8 | 7 |
| Control confidence and aim | 20 | 11 | 10 |
| Objective and route comprehension | 20 | 10 | 0 |
| Combat feedback and meaningful decision | 15 | 5 | 0 |
| Camera, scale and visual readability | 15 | 8 | 5 |
| Pause, recovery and replay | 10 | 8 | 5 |
| Verified performance/reliability | 10 | 4 | 4 |
| **Total** | **100** | **54** | **31** |

## Blockers and reproduction

| Priority | Finding | Reproduction / next verification |
|---|---|---|
| P1 | No evidence that an unfamiliar person can deliberately traverse either route and finish. Scripted positions bypass the most disputed interaction. | Fresh player opens default URL, gets only the shipped instructions, chooses a gate, hits Warden and extracts. Record errors and assistance verbatim. Do not substitute smoke buttons. |
| P1 | Full-level launch does not deliver a mission; its attractive layout can be mistaken for the promised game. | Open `?full-level`, launch: no objective/encounter and explicit no-collision notice. Keep it labelled survey until a real route has resident collision, targets and extraction. |
| P2 | Drag fallback is below the initial menu fold at the observed window height. | Open `?full-level` at 1920×865 with unchanged settings. Inspect before scrolling: primary launch is near bottom; fallback is below. Put both input choices ahead of long explanations/settings. |
| P2 | Low gate has weak contrast against orange terrain; rider overlaps its approach sightline. | Default drag launch and small right yaw: compare cyan high gate with pale amber low gate behind bike. Verify from moving player view, including reduced effects/color-vision variants; do not judge only top-down art. |
| P2 | Full-level camera establishes an aerial inspection scale; enlarged bike does not establish ground-relative speed or vehicle scale. | Launch survey at 25 m and inspect screenshot: whole island below, rider against sky. Verify an authored lower launch view against railings/buildings before further mesh scaling. |
| P2 | Survey presents combat affordances it cannot fulfill and technical telemetry competes with the view. | Launch survey and read score/chain/hull/ammo/HOSTILES plus streaming counters. Left aim drag still spends ammunition despite no combat. Separate developer survey information from a player-facing mission HUD. |
| P2 hypothesis | Left-drag aim plus fire may waste high-route charged shots while lining up. The intended alternative is right drag, but right-drag ergonomics were not tested. | After high gate, ask fresh player to acquire Warden without coaching. Observe whether charged rounds are spent before target acquisition. Do not infer this failure from the earlier five ordinary rounds alone. |

## Challenge to the team

- Designer: a choice of three charged shots versus shield is a rules difference, not demonstrated tactical depth. Prove the player understands the consequence and deliberately chooses a different line on replay. Do not add turrets/upgrades before that.
- Artist: a bigger bike and a dramatic level board do not establish chase-camera composition. Compare actual launch, moving fork and Warden screenshots at the shipped camera/controls; preserve gate contrast and unobstructed aim over detail density.
- Engineer: 42 tests and repeated scripted victories are valuable integrity checks but bypass natural traversal. A stable renderer does not show that keyboard-plus-mouse steering feels controllable. Separate the automation coverage from the missing user outcome in every status update.
- QA/self-critique: this reviewer authored the controls and cannot supply fresh-player evidence. The heuristic score should guide the next test, never be presented as independent player validation.

## One acceptance gate

Before expanding Bridgehead Run content, observe **five fresh players**, with no coaching beyond shipped UI. At least **four of five** must launch, intentionally cross their chosen gate, register a Warden hit, pause/resume and reach extraction within **ten minutes**, without a blocking camera/input/collision defect; at least **three of five** must explain the route consequence in their own words. Record exact build/browser/settings and every intervention. This is a proposed internal decision gate, not an industry benchmark. If it fails, fix the most common blocker and repeat with fresh participants.
