# Red Horizon Visual Director Review

Created September 15, 2026 after a critical review of the first real-model path image pass.

## Verdict

The real-model direction is better than the old Bridgehead corridor, but the first image pass was still not good enough for premium visual direction.

The level choice is right: the supplied model has a strong left cannon platform, central chasm, real upper crossing, lower utility pipe run, right industrial court and outpost extraction. The execution needed a stricter game-art rule: route art must look like it belongs to the level, not like a debug spline drawn through it.

## Scale read

The Warden was not numerically huge in the Blender data. The first real-model pass used a 2.15 m Warden next to a 1.8 m AVI jetbike/rider envelope, which is only about 1.2× player height. The image still made the Warden feel too large because the camera staged it as a foreground monster in a dense vehicle arena.

The better target for the current asset is **elite rival scale**:

- Warden preview height: about 2.05 m.
- The Warden should stand on a clear combat platform with red state art, not just loom over the bike.
- If we later want a true boss, the right answer is a mech/turret/guardian silhouette built around the Warden, not only scaling the humanoid until it feels like a kaiju.

## Route read

The biggest flaw was the path. A hover vehicle can leave the ground, but the art must tell the player when that is intentional.

Measured Blender raycasts showed:

- Several court/pipe/deck points sit within about 0.3–1.2 m of the actual level surface, which is usable for a hover lane.
- One high-route point is about 15.8 m above the ground over the chasm. That can work only as an explicit air-gate jump, not as a normal lane.
- A low-route drop point raycast hit overhead tower/cliff geometry, proving that vertical measurements alone are not enough there; it needs staged gates and camera review.
- The Warden foot position was slightly below the local surface and should be lifted onto the court.

The second pass should use:

1. **Surface decals** on bridge, deck, pipe and court surfaces.
2. **Vertical air gates** where the jetbike leaves the ground or crosses a chasm.
3. **Small route rings** at decision and reward points.
4. **No thick continuous floating ribbons** in close gameplay shots.

## Real-game comparison

The professional reference is not “copy WipEout” or “copy Star Wars.” The lesson is how those games make speed readable.

- Anti-gravity racers such as WipEout sell flight through authored tracks, barriers, pads and lanes. The vehicle can hover, but the road still owns the composition.
- Speeder and hoverboard games sell freedom by keeping the vehicle visually tied to terrain, ramps, dust, rails, tricks, obstacles or pursuit lines.
- Open-world hover traversal works when the player can read the safe surface, the jump moment and the landing target before committing.

For Red Horizon, that means the full level supplies the spectacle, while the mission layer must supply readable surfaces, gates and combat staging. The old floating line failed that test.

## Revised art direction

The new target is:

**Cannon launch → chasm air gate → high deck charge or low pipe shield → Warden court → outpost extraction.**

The images should make these rules obvious:

- High route is a fast, exposed surface lane after a deliberate chasm air gate.
- Low route is a lower, narrower pipe/utility lane with shield and side entry.
- The Warden is an elite rival inside the industrial court, with state visuals and line-of-sight cover.
- Extraction is a separate outpost target that gives the route a clean finish.

## Development implication

Do not build gameplay from the first image pass as-is. Build from the revised layout and visuals:

- `art/real-path/red-horizon-real-path-layout.json`
- `scripts/build-red-horizon-real-model-path.py`
- `art/real-path/red-horizon-real-model-path-contact.png`

Runtime should turn the design into:

- deck/pipe/court decals,
- 3D air gates,
- simplified collision matching the hover lane,
- Warden state art,
- first-player route comprehension tests.
