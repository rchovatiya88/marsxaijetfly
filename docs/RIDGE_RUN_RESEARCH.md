# Ridge Run design and production research

## Recommendation

The strongest next investment is a small playable route where flight changes the combat outcome, supported by an inspectable Blender asset pipeline. The existing documentation describes substantial technical repair but no uncoached evidence that players value the movement decision. More scene detail can support that decision once the route works; it cannot demonstrate replay interest on its own.

Research checked September 13, 2026. Sources below are official exporter/specification/tool documentation, developer-authored product descriptions and first-party conference presentations. Product listings establish advertised features, not sales, production cost or suitability for this project's audience. The proposed mechanics, budgets and participant thresholds belong to this project. They are not published research findings.

## Design evidence and application

Valve's playtesting presentation treats designs as hypotheses to test iteratively, distinguishes direct observation from verbal reports and measured statistics, and notes that each method carries bias. It specifically cautions that think-aloud reporting can interfere with play, and that averages can hide important individual behavior. This supports separating an uncoached first run from later questions and combining local event records with observation.[^1]

Application: ask a player to play a sortie, record what happens, and postpone route explanation until after their spontaneous replay decision. Investigate a specific prediction, such as “players use the low route to break the volley,” rather than a global satisfaction score. The five- and ten-player gates in the PRD are economical qualitative checkpoints. They do not estimate population retention, willingness to pay or commercial conversion with statistical confidence.

Jason Mitchell's presentation explains visual hierarchy through silhouettes, value placement, environment restraint and lighting that supports navigation. Its character and environment examples show how art direction can communicate actionable information. Those examples come from different games and rendering technology, so they support an art principle rather than a shader prescription for A-Frame.[^2]

Application: test the fork and rival as large shapes before textures. Keep the low lane readable inside shade, give threat cues a different shape from charge hardware, and avoid equal-contrast decoration throughout the scene. Validate a moving player-camera view at gameplay resolution. Concept art should show the same decisions, camera height and cover lines that the level will support.

The id Software presentation on DOOM describes a combat philosophy built around speed and player aggression, including resource incentives that encourage engagement. Its published abstract is evidence of the developers' philosophy; it is not a controlled study showing any mechanic improves every game.[^3]

Application: give flight a tangible combat payoff through a single charge gate, then test whether players knowingly use it. Do not copy DOOM's resource economy or remove existing reload/cover merely because another game emphasizes different tools. Ridge Run's lower route deliberately preserves cover as a meaningful answer. The relevant question is whether this game's movement and combat reinforce each other.

## Adjacent products

| Primary developer source | Advertised design | Useful experiment for Ridge Run | Scope limit |
|---|---|---|---|
| Refract, Distance | Vehicle traversal includes flight and shortcuts; adventure and time/medal mastery modes | A route can provide a replay objective before large progression systems | No editor, multiplayer or full parkour controller implied |
| Flippfly, Whisker Squadron: Survivor | Flight shooting, branching campaign choices, bosses and loadout variety | A repeated flight mission can change through consequential choices | Begin with one spatial fork; no roguelite campaign implied |
| id Software, DOOM GDC abstract | Speed/aggression connected to combat systems | Test a reward that depends on an intentional maneuver | No claim of design transfer or equal production scope |

Distance's developer description explicitly presents survival to the end and flight-discovered shortcuts as part of its vehicle experience.[^4] Whisker Squadron's developer listing advertises tactical route choices within a multi-act flight-shooter campaign.[^5] These are reference structures, not verified profitability comparisons. Their feature count should not set the first slice's production budget. Their art and code are not supplied project assets.

Design inference: Ridge Run can combine route mastery with a combat window while remaining distinct in theme and implementation. The inference is testable: after playing, people should explain a decision involving altitude, boost or cover and choose a different approach on replay. If they describe only continuous shooting, the core promise is not established, regardless of visual improvement.

## Blender MCP and version discipline

The official Blender Lab page currently lists Blender 5.1 or newer, an add-on, an LLM client and an MCP server as separate setup requirements. It describes add-on installation and MCP bundle/source installation paths. A downloaded `mcp-1.0.3` folder by itself is not evidence that the extension is installed, its service is listening, or this client is connected.[^6]

The page also states that generated Python is executed without data-protection guards. For this production workflow, operate on derived scene files, keep local transport configuration explicit and avoid applying arbitrary retrieved scripts. Verification should be a harmless version/scene-name query followed by a bounded temporary-object operation and cleanup in a new working file. Record installed Blender version, add-on version, transport, client registration and one successful tool response. A command-line Blender export is a valid authoring fallback but must be reported separately from MCP connectivity.

Implementation status belongs in the setup report, not in this research recommendation. The official page was available as indexed source text during research; direct fetch returned an access error. No particular Codex configuration shape, port or add-on operator is inferred from the page. Inspect the actual downloaded package instructions for those details.

## Export behavior that changes the plan

Blender's exporter supports glTF meshes, PBR materials, textures, extras and supported animation. Exported geometry can contain more vertices than the Blender mesh because UV and normal discontinuities split vertices, and nontriangle faces are triangulated. Therefore, Blender's visible vertex count is not the shipped runtime geometry budget.[^7]

The current development manual documents custom properties and GPU-instancing export, while the Blender 5.0 manual describes selected-object export, Y-up conversion and animation action modes. It also documents action-slot behavior changes starting with Blender 4.4. These references are version-qualified; the 5.3 development manual is not evidence of the installed release's exact API.[^7][^8]

Application: query installed export options, save an explicit preset, export one reference object, and re-import it before processing the corridor. Validate actual animation names after export. Do not assume an older “same NLA track name” recipe still produces the intended multi-object clips. Keep named clips mapped to game states and preview each, including death. Export preview lights only if deliberately supported by the runtime.

The glTF specification defines its coordinate system and interchange structures, including application-specific extras. It does not provide this game's collision, route cost or mission state semantics.[^9] A marker schema and validation step are therefore essential. Runtime convention should be written once, tested with an asymmetric marker arrangement and used consistently for shell, collision and route JSON. Never apply a second axis conversion to data already exported in glTF coordinates.

Recommendation: keep the first exported corridor on basic metallic-roughness materials with conventional image formats. Optimize its material count, texture dimensions and visible mesh selection before adding optional compression/extensions. A newer generic viewer may support features the older A-Frame runtime cannot. Download compression and rendering cost are separate measurements.

## Inspecting assets is three separate checks

Don McCurdy's viewer is a drag-and-drop WebGL glTF 2.0 viewer built on Three.js. It is a useful independent visual check, and its repository documents a local development path.[^10] The supplied hosted page exposes file selection. Opening that page does not mean a project model was viewed.

Khronos' validator produces a JSON report with issues and asset statistics; its checks include GLB structure, references, accessors, animation data and images. It offers browser and command-line use.[^11] A structurally valid asset can still have an unsuitable scale, silhouette, license or frame cost. Some extension-specific content requires additional tool/runtime verification. Treat unsupported checks as limits rather than quietly passing them.

Use three receipts per derived asset: a validator report, neutral-light viewer captures with animation notes, and an actual A-Frame load with counts and console evidence. Add source hashes, exporter version and license status. A screenshot cannot establish full structural validity; a clean validator report cannot establish gameplay collision. Both are necessary inputs to the runtime acceptance test.

## Asset-specific decisions from local records

The existing `ASSET_LEVEL_AUDIT.md` reports a large city source, a differently transformed ground navmesh, two skinned characters, a corrupt-bike texture and an oversized weapon texture set. The new Blender 5.2.1 renders in `art/inspection/` make the design more specific. The level is a dark faceted crater/chasm crossed by two narrow bridges, with an isolated tower and dense industrial outpost. The enemy is a spiked rocky humanoid; a grounded Warden fits its silhouette better than the older generic rival suggestion. The bike has a long ski-like nose, rider and rear engine but renders magenta. These are observed still-image features, not evidence of working collision or animation transitions.

The new JSON counts 2,292 imported mesh objects and 1,169,700 triangles summed per object for the level. Repeated mesh instances contribute to this count, while the older 393 figure describes glTF mesh definitions. These are different measures; neither source byte size nor unique mesh count describes all submitted geometry. Use the new report for scene scope and actual runtime telemetry for visible triangles. The older approximately 355k whole-level claim is not an adequate budget.

Choose one bridge/chasm section and a small set of inspected industrial silhouettes for the corridor. Preserve that vertical contrast as the level's identity. Build a genuinely traversable lower lane, widened gameplay clearances, charge hardware and the Warden court in a derived Blender file. Reserve the `avi` character for a later briefing presentation unless it contributes immediately to comprehension. Repair the bike on a copy with a deliberate replacement texture; do not pretend a missing original texture has been recovered.

The source navmesh may help grounded characters after alignment, but it cannot contain the rules for unrestricted vertical bike movement. Likewise, exporting a collider GLB does not make the current box-only gameplay functions read it. The first art integration should match the proven blockout collider data. Ground anchors can serve the first rival while navmesh support remains a separate task.

## Performance and evidence limitations

The local records contain several incompatible historical budgets and embedded-browser frame samples. Later notes show that idle-browser pacing was itself inconsistent. Consequently, the older samples neither prove an A-Frame bottleneck nor a hardware frame-rate ceiling. The master plan's ≤30 static route draws, ≤250k visible route triangles, ≤1.5 MB art transfer and p95 ≤16.7 ms are current internal targets, not measured success.

A new comparison should record actual Windows hardware, browser, build plus dirty status, seed, input route, warmup, CSS viewport, DPR, internal render size and quality. Repeat three times in a foreground browser with comparable surrounding workload. Report frame intervals separately from available CPU/GPU timing. A reduction in calls or transfer bytes is useful but does not by itself prove smoother combat.

Measure launch, both routes, rival animation, repeated effects and ten complete retries. Optional art must not alter physics midway through a run; activate a validated world configuration at a clear mission boundary. Keep fallback and authored scenarios comparable so an art regression can be isolated.

## Research-to-execution decisions

Proceed with a two-route blockout; a single timed stored charge shot is the next comparison hypothesis. The current implemented experiment instead grants three powered shots on high or 30 shield on low, as recorded in the PRD. The original third branch and content expansion remain deferred until clarity and replay pass. Perform model inspection and Blender setup alongside engineering stabilization, then use real assets to reinforce the approved geometry. Create concept targets after inspecting source renders, and compare them to an actual runtime camera before declaring visual progress.

The next unresolved evidence is practical: actual pointer capture on the current machine, complete retry behavior, ordinary-browser frame pacing, the visual usefulness of specific source modules, and independent players' route comprehension. Additional broad market research cannot substitute for these observations. Pricing and packaging research can follow a successful slice and a concrete full-edition scope.

## Sources

[^1]: Mike Ambinder, Valve. [Valve's Approach to Playtesting: The Application of Empiricism](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf), GDC, March 2009. Design hypotheses, observation bias, experiments and measurement; especially PDF pages 5, 13–27 and 30–39. Accessed September 13, 2026.
[^2]: Jason Mitchell, Valve. [Connecting Visuals to Gameplay at Valve](https://cdn.fastly.steamstatic.com/apps/valve/2008/MIGS08_ConnectingVisualsToGameplay.pdf), MIGS, November 2008. Silhouette/read hierarchy and navigational lighting; especially PDF pages 9, 15–18, 27 and 57–62. Accessed September 13, 2026.
[^3]: Kurt Loudy and Jake Campbell, id Software. [Embracing Push Forward Combat in DOOM](https://www.gdcvault.com/play/1024940/Embracing-Push-Forward-), GDC 2018. Published session abstract; no unseen talk details inferred. Accessed September 13, 2026.
[^4]: Refract. [Distance](https://store.steampowered.com/app/233610/Distance/), developer Steam listing, released September 18, 2018. Advertised vehicle traversal/shortcuts and mastery modes only. Accessed September 13, 2026.
[^5]: Flippfly LLC. [Whisker Squadron: Survivor](https://store.steampowered.com/app/2140100/Whisker_Squadron_Survivor/), developer Steam listing, released February 21, 2025. Advertised branching flight-shooter structure only. Accessed September 13, 2026.
[^6]: Blender Foundation. [MCP Server](https://www.blender.org/lab/mcp-server/), undated official setup page, indexed text accessed September 13, 2026; direct fetch was unavailable. Requirements, integration components and execution warning.
[^7]: Blender Foundation. [glTF 2.0, Blender 5.3 development manual](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html), indexed September 11, 2026 version, accessed September 13, 2026. Supported features, mesh conversion and custom data. Development documentation, not installed-release certification.
[^8]: Blender Foundation. [glTF 2.0, Blender 5.0 manual](https://docs.blender.org/manual/id/5.0/addons/import_export/scene_gltf2.html), Indonesian-locale page with English exporter sections, accessed September 13, 2026. Actions/NLA, 4.4 action-slot change, selected export and Y-up options.
[^9]: Khronos Group. [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), living specification, indexed source accessed September 13, 2026. Coordinate and interchange contract; project-specific semantics remain external.
[^10]: Don McCurdy. [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer) and [hosted viewer](https://gltf-viewer.donmccurdy.com/), repository/interactive tool, accessed September 13, 2026. Independent visual inspection surface.
[^11]: Khronos Group. [glTF-Validator](https://github.com/KhronosGroup/glTF-Validator), repository documentation, accessed September 13, 2026. Validation scope and JSON reporting.

Local references: the thirteen originally inventoried project Markdown files (including `AGENTS.md`, `README.md` and the particle README), both project skills, and the new six Blender inspection renders in `art/inspection/`. Level/enemy JSON reports provide current imported-object evidence. Historical statements in the older files are not new measurements. The PRD resolves scope and staging for the next experiment; implementation status remains in the session validation record.
