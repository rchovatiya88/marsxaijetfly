# Bridgehead Run — scene-first player action plan

September 13, 2026. This is the authored sequence for revision 2, with critique
from the actual rendered candidate. It is a design and geometry contract, not a
human playtest or a passing acceptance score. The first revision-2 Blender scene
was saved at 15:46:24 local time before its layout was activated in runtime code.

The single coordinate source is `art/bridgehead/bridgehead-v2-layout.json`.
`art/bridgehead/bridgehead-v2.blend` consumes it and contains linked full-level
context, actual hero meshes, the complete route paths, checkpoint empties,
physical structures and matching collision references. Runtime must consume that
same file through the generated mission contract. Never edit both copies by eye.

## Why the previous candidate did not yet match the design

The actual WebGL capture `evidence/runtime-inspection/launch-1789328034130.png`
shows a seated bike facing a very short bridge approach and an industrial outpost
that reads as miniature. Its JSON records 1280×720 pixels, 80° vertical FOV,
camera 2.5 m high / 6.2 m back and an inherited bike displacement of −0.5 m. Its
35.8% projected AABB height is conservative; it is not opaque-pixel occupancy.
The bike should not be enlarged again to address the environment scale.

The original 0.1 normalization produced an approximately 81×72 m environment,
source bridge decks about 1 m wide and a 4.706 m bike. The lower gate was only
10 m from launch: one second at 10 m/s. The lower crossing took 1.6 seconds and
the high crossing only 0.5 seconds at full boost. The mandatory lower climb began
only 1 m beyond its exit, making the intended maneuver hard to anticipate.

Ten programmatic-input wins took approximately 10.4 seconds high / 10.7 seconds
low, all with full hull. That helper knows every waypoint, uses sideways movement
without looking toward each route segment and aims from internal enemy state.
Those times demonstrate an extremely short ideal execution; they do not establish
natural steering, fair reactions or a novice completion distribution. A 90-second
run caused by being lost would not solve the authored-duration problem.

The actual court capture `court-1789328103473.png` also exposed a separate Warden
normalization defect: the visible posed creature disagreed with its unposed bounds
and aiming target. Revision 2 evaluates `Baka_Idle` before fitting the creature.
The Blender posed reference is 1.874 m wide, 2.15 m high and 1.176 m deep. Body
scale, a visible aim point and combat state must agree before balancing damage.

## Physical and camera contract

The entire original visual environment and resident terrain collision are scaled
threefold for Bridgehead only. Survey mode retains its existing coordinates.
The new route overlay is already authored in final world metres and stays at
identity. Source buildings and 3 m source bridge widths now fit a roughly 1 m
wide bike; the new supported bridge surfaces are 5 m wide, not 15 m.

The player root is the normalized assembly base, without the old −0.5 m hover
displacement. Nominal bike size remains 0.980×1.8×4.706 m. The conservative visual
envelope is X±0.53, Y[−0.03,1.84], Z±2.38 m. Runtime body collision must cover its
nose, tail and rider, including yaw sweeps; the old single 0.7 m sphere did not.
Measured muzzle sockets are local (−0.10,0.62,−2.40) and (+0.10,0.62,−2.40), just
ahead of the actual front steering nose. Hover/roll remain removed for this match.

The camera is 2.5 m up, 6.2 m back and 1.2 m over the right shoulder at 80° vertical
FOV. The shoulder offset addresses the correctly sized Warden being hidden by the
bike during downward aiming. Source or cover collision may shorten the boom.
Look pitch changes aiming; yaw owns the bike heading. W/S must remain horizontal,
with E/Q supplying altitude. Movement is 8 m/s, boost 16 m/s. Table times below
exclude looking, braking, missed turns and decision time.

## Common opening: what the player sees and does

Launch at **(−57,−4.5,32.1)** facing east. The amber bridge is ahead. Two authored
holographic labels separate **CHARGE / CLIMB** to the left from **SHIELD / COVER**
to the right. The labels describe rewards and the maneuver; color is redundant.
The menu states the encounter objective, not a list of implementation details.

The player first tests forward movement, then chooses. Following amber is a
direct, descending crossing with a protected court arrival. Taking cyan means
turning north, climbing around the cannon, descending onto the northern bridge
and committing to a boosted gate. **There is no live threat on either bridge in
this slice.** High means an exposed court arrival and charged shots; it must not
be advertised as an actively attacked bridge or an inherently shorter route.

The lower gate is now 30 m away: at least 3.75 seconds of straight travel at normal
speed. The upper branch starts with a visible left turn. Releasing movement stops
translation, so a new player can look at the branch without involuntary travel.

## Lower route: shield, climb, cover and a deliberate peek

The cumulative columns end at protected court arrival. These are geometric lower
bounds for a pilot following the path continuously at 8 m/s, not promised times.

| Beat | Player root / facing target | Concrete player action | Distance, cumulative | Ideal time, cumulative |
| --- | --- | --- | ---: | ---: |
| L1 Align | (−42,−6.5,32.1), east | Hold W, lower gently with Q while looking at the amber entrance. Keep the bridge centered. | 15.1 m | 1.9 s |
| L2 Commit | Entry (−27,−8.2,32.1), east | Cross the entry forward. Receive 30 shield once; opposite reward locks. | 30.2 m | 3.8 s |
| L3 Traverse | Exit (21,−8.2,32.1), east | Fly over the visible 5 m deck; see the raised turn cue before reaching the bank. | 78.2 m | 9.8 s |
| L4 Rise before turn | (30,−6.4,32.1) | Release boost if used, press E, then look left/north. The bay is 9 m beyond the exit instead of 1 m. | 87.4 m | 10.9 s |
| L5 Follow bank | (30,−1,6), north | Hold W with controlled E to follow the ascending bank. Avoid a diagonal shortcut across the cliff. | 114.1 m | 14.3 s |
| L6 Approach court | (45,3.2,−12), northeast | Turn toward the raised court and complete the climb. Identify the amber cover face. | 137.9 m | 17.2 s |
| L7 Take protection | (53,3.2,−16), northeast | Arrive behind the western cover block. The Warden activates; the cover interrupts both weapon lines. | 146.8 m | 18.4 s |
| L8 Draw the attack | Peek (55,3.2,−25), then aim at (69,2.55,−27) | Move around the north end of cover. Look at the Warden's torso. A direct attempt to fire through cover must remain blocked. | Combat movement | Measured in play |
| L9 Answer and counter | Withdraw toward (53,3.2,−16), or strafe in the open | When tracking becomes the locked-shot cue, break the line. Return to the peek when EXPOSED appears and spend a burst. Repeat. | Combat movement | Measured in play |

The protected route is not a passive shield bonus. The player controls when to
leave cover, draws a shot, denies that shot with the same wall, then obtains an
unobstructed counterattack angle. If a new player waits forever behind cover, the
current objective must explicitly say to peek around its north side. It should
not merely point at an occluded enemy.

## Upper route: climb, descend, boost and respond in the open

The high route is 181.4 m to its court arrival. Only the 21 m gate-to-exit segment
uses the 16 m/s timing below; all other legs use 8 m/s. The longer approach costs
about three additional ideal seconds, offset by a stronger first exposure burst.

| Beat | Player root / facing target | Concrete player action | Distance, cumulative | Ideal time, cumulative |
| --- | --- | --- | ---: | ---: |
| H1 Choose left | (−48,−4.5,32.1) | Move into the fork, look north before turning. Do not pass the amber gate accidentally. | 9.0 m | 1.1 s |
| H2 Start climb | (−45,1,12), north | Turn toward the cyan arrows and hold W/E. The cannon becomes the left-side landmark. | 30.1 m | 3.8 s |
| H3 Clear rock shelf | (−45,8.4,−21), north | Continue the measured climb; do not aim directly across the cannon foundation. | 63.9 m | 8.0 s |
| H4 Align east | (−45,8.4,−35.4) | Release forward, look right toward the northern bridge, then move east. | 78.3 m | 9.8 s |
| H5 Reach descent lip | (−30,8.4,−35.4) | Stay high until past the rock lip. The DESCEND cue marks where dropping becomes safe for the bike tail. | 93.3 m | 11.7 s |
| H6 Descend onto bridge | (−21,−0.7,−35.4), east | Use W/Q together, release Q near the marked hover height. The route now sits about 2 m over the actual bridge deck. | 106.1 m | 13.3 s |
| H7 Commit boost | Entry (−18,−0.7,−35.4) | Hold W/Shift through the gate. Receive three charged shots once; a missed/unboosted crossing gives a visible retry approach. | 109.1 m | 13.6 s |
| H8 Cross | Exit (3,−0.7,−35.4) | Keep the gate line centered while boosted. Release boost before the bank climb. | 130.1 m | 14.9 s |
| H9 Clear east bank | (9,3.2,−35.4) | Rise over the bank before entering the outpost. The next marker is above the actual wall/roof surface. | 137.2 m | 15.8 s |
| H10 Exposed arrival | (53,5.6,−33), aim at (69,2.55,−27) | Follow the court approach, find the Warden and keep an open lateral escape direction. | 181.4 m | 21.4 s |
| H11 Dodge and spend charge | Escape toward (54,5.6,−39), then re-aim | Move across the locked shot, recognize EXPOSED, then fire the charged burst. Do not spend charge into the guarded phase. | Combat movement | Measured in play |

The DESCEND and east-bank rise are authored maneuvers with separate safe spaces.
They must be visible before the player needs them. If captured play shows that
the high route feels like following invisible waypoints, revise the scene cues
and bend shape; do not solve it with increasingly long objective text.

## One Warden cycle and the authored combat court

The new supported court floor is centered at (66,1.2,−24), 24×0.6×24 m, top Y1.5.
It covers measured uneven ground without moving source scenery. Warden feet are
at (69,1.5,−27). The western block at (59,3.1,−20), size 3×3.2×5 m, breaks the lower
arrival's line; the high arrival's line remains clear. The second cover piece and
court core create optional escape edges without closing the flight loop.

The agreed combat contract is **guarded → tracking → locked shot → exposed**.
Tracking lasts 0.95 seconds, the final lock 0.25 seconds, and the projectile travels
at 18 m/s. Recovery is a clearly marked 1.2-second exposure. The first attack starts
only after a valid court arrival and a clear weapon line. Pause freezes every phase.

The Warden has 425 HP. Guarding fully blocks damage; only the exposed phase takes
normal damage. With 25-damage rounds and a 0.16-second cadence, the observed runtime
produced seven reliable hits per 1.2-second window. Three double-damage charged
shots make a seven-hit first window worth 250 damage; seven normal hits deal 175,
so the high route can finish in two windows. The low route needs 17 hits across
three windows. Actual misses, reloads and target reacquisition can require more.
This makes the spatial response and counterattack necessary instead of merely
increasing uninterrupted firing time.

This tuning follows a specific failed iteration: the initial 450 HP contract
assumed eight hits per window, but the actual forward/yaw run delivered seven,
leaving 25 HP after the second window and requiring a third. Reducing HP to 425
preserves the clear exposure duration and restores the authored route distinction.
The adjusted two-window outcome still requires verification on the next candidate.

ARMORED and EXPOSED must have different shape/pulse/pose cues plus text; color alone
is insufficient. A guarded hit must explain why it did no damage. This is a tuning
contract requiring real runtime verification, not a claim that the new fight is fun.

## Extraction and replay

After confirmed lethal resolution, move upward into the clear exit corridor,
pass (76,7.8,−36), then reach **(90,7.8,−45)**. The 8 m square platform top is Y6,
above the measured local terrain, with visible supports and a distinct EXIT label.
Hold within radius 3.5 m for 1.5 simulation seconds. Leaving resets the hold; pause
adds no time. The route from either combat angle is approximately 40 m / five
ideal movement seconds, plus the climb and reacquisition as actually flown.

The result states route, shots, charged shots spent, hull lost and elapsed time.
The natural replay question is whether the player wants to try the other reward,
spend fewer rounds or make a cleaner dodge. Do not ask for a replay before recording
whether they independently choose one.

## Duration hypothesis and evidence-driven next step

Revision 2 supports roughly 18–21 seconds of ideal pre-combat travel and about
five seconds of exit travel, before actual looking, turning and combat. A skilled
complete run may still be much shorter than 90 seconds, and that is acceptable.
The 90–180 second first-attempt design hypothesis comes from learning the fork,
executing the climbs/turns, acquiring the target and answering multiple attack
windows; no timers should be added merely to force that duration.

Use these planning bands only until observed: launch/choice 5–10 s, route and
heading acquisition 25–45 s, first target/cover decision 8–15 s, combat 20–60 s,
exit/reorientation 8–15 s. Their overlap and variation matter; summing upper bounds
is not evidence. Record completion times, missed cues, missed windows, damage and
each unsolicited retry on the same candidate. A short clean run is success; a
long confused run is a design failure.

The scale study sampled 17 approach legs with the complete visual envelope and
found at least 1.21 m top-surface clearance. The independent runtime-collider
study sweeps the scaled actual coarse triangles with the full multi-sphere body,
including yaw. Neither substitutes for gameplay captures or natural input. Compare
launch, north climb, high descent, both bridge ends, low cover/peek, exposed aim
and extraction in the browser against their Blender counterparts. Select the
largest observed mismatch for the next change, then rerun the same views and paths.

The corrected offline views show the Warden visible beside the shoulder bike at
the high arrival and the low peek, and hidden by the actual western block at the
low arrival. They also expose a remaining scene cue weakness: the small horizontal
arrows become edge-on during the northward climbs, and the west-facing RISE + TURN
label reads backward after the player has turned past it. The next bounded art
proposal is upright climb chevrons facing each incoming path and one-sided text.
Do not count the route as independently legible merely because an informed pilot
can follow the runtime checkpoint markers. This proposal is not in the sealed v2
GLB and should receive its own before/after view and route-comprehension check.
