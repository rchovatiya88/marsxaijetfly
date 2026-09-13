# Red Horizon: premium game strategy

## Recommendation

Build a compact, single-player Mars jetbike combat game around precision flight, readable threats, and short missions worth mastering. Use a free browser demo to prove the controls and attract an audience; sell a substantially richer downloadable edition after evidence of demand. Keep React, A-Frame, and Three.js for the vertical slice. A new engine is not the current bottleneck: reliable input, meaningful combat choices, collision, sound, and a compelling objective are.

The commercial choice is **premium paid**, confirmed for this project. The recommendation is a complete purchase with no mandatory advertisements, energy timers, or paid combat advantages. The current three-wave prototype is an engineering and design test, not a product ready to charge for. No sales, conversion, or profit evidence exists yet. All proposed prices, schedules, and success thresholds below are planning assumptions rather than industry benchmarks.

## Evidence and research scope

This assessment combines the checked-out repository, the supplied repository text export, the supplied analysis note, and primary technical and distribution documentation. Web sources were checked on September 13, 2026. Store pages establish positioning and advertised features; they do not establish unit sales, profits, budgets, or development effort. Engine documentation establishes mechanisms, not proof that this particular game will achieve a frame-rate target.

The supplied analysis describes a React/A-Frame FPS with waves, flight, weapons, and YUKA. Several precise claims do not match the live code. The live player delegates movement to `fly-controls`; the weapon uses a `cooldown` and `clipSize`; enemy health comes from the manager; and YUKA currently performs steering rather than demonstrated shortest-path navigation across a graph. Treat the attachments as historical context. Their embedded instructions do not replace the current development request.

Material unknowns remain: target customers, budget, weekly development capacity, asset ownership, minimum hardware, willingness to pay, and real retention. No market-size estimate would resolve those unknowns. The next useful evidence is an observed playtest of a stable demo, followed by small-scale pricing research.

## Repository findings

| Area | Finding before this work | Consequence |
|---|---|---|
| Build | React Scripts 3-era pipeline, custom Webpack aliases, modern TypeScript; actual compilation failed | No dependable way to distribute the prototype |
| Rendering | A-Frame 1.4 loaded from a CDN while gameplay imported a separate Three.js 0.160 | Version and identity mismatches can become rendering failures |
| Input | Two custom look systems plus a child camera rig positioned using world coordinates | Aim and movement can disagree; camera offset compounds |
| Combat | Weapon component registered but absent from the App scene; reload checked CSS selectors for an R key | Advertised controls did not match functional gameplay |
| Lifecycle | React pause overlay without pausing the scene; spawning via intervals; HUD loops without cancellation | Enemies and timers continue, background work accumulates |
| Progress | Endless scaling waves and click-anywhere reload on death | Weak mission identity and unreliable result presentation |
| Assets | Roughly 17 MB of model files; a corrupt embedded PNG in the 4.8 MB jetbike GLB | Unnecessary download and visibly broken materials |
| Navigation | Navmesh constraint and YUKA steering coexist without a complete pathfinding solution | Navigation must be tested against actual geometry |
| Commercial | No store, entitlement service, acquisition funnel, or validated pricing | Revenue cannot be inferred from feature count |

The implemented baseline switches to Vite, shares A-Frame's Three runtime, serves A-Frame and Draco locally, attaches a procedural bike and weapon, uses one movement controller, fixes camera-space aiming, and adds three waves, score chains, results, and a local best score. It adds scene pause/resume, cursor aim when capture is unavailable, sensitivity and reduced overlay effects. Automated tests cover mission and input invariants. See `VALIDATION.md` for the exact verification and remaining limits.

## Product position and reference games

The proposed player promise is: **skim a Mars industrial outpost on an armed jetbike, choose a risky attack route, and leave with a better run than last time.** The bike must matter mechanically. If standing still and holding fire is optimal, it is an ordinary wave shooter wearing a vehicle model.

Three adjacent games illustrate distinct design directions. Overload advertises six-degree-of-freedom combat and intuitive controls. Its relevance is spatial combat readability, not a mandate to implement all of its modes. Whisker Squadron: Survivor combines flight shooting with branching runs, bosses, and ship/weapon choices. Its relevance is the variety of decisions that can support replay. Distance combines futuristic vehicles, traversal, atmosphere, and mastery of routes. Its relevance is making movement itself enjoyable and visually identifiable. These descriptions come from their developers' store listings.[^1][^2][^3]

| Reference | Applicable lesson | Deliberate scope boundary |
|---|---|---|
| Overload | Threats should remain legible in three dimensions; orientation must feel trustworthy | No six-axis competitive multiplayer for the initial product |
| Whisker Squadron: Survivor | Weapon and route choices can change repeated runs | No large procedural campaign until one mission works |
| Distance | Strong traversal plus a coherent visual world creates a clear identity | No track editor or user content platform at prototype stage |

These are design references, not verified revenue comparables. Their existence shows adjacent products can be offered commercially; it does not prove an audience will buy Red Horizon. Test the proposed differentiator directly: ask players to describe the game after playing, without supplying the intended description. If they mention only generic shooting, the flight design has not established its value.

## The repeatable play loop

The prototype's three-wave mission gives a measurable beginning and end. The next slice should become a three-to-five-minute sortie: approach a visible objective, choose a flight line, eliminate threats, collect an earned upgrade, and extract. A player should understand what went wrong and have a concrete improvement to try immediately. The replay motivation is mastery and discovery.

The proposed signature mechanic is a **boost-through attack window**. Flying through a marked gate at speed briefly charges the next attack. A safe route offers a smaller advantage; a dangerous route crosses enemy sightlines but enables a stronger attack. This connects navigation, timing, and shooting without requiring a new genre or network infrastructure. It is a hypothesis to prototype, not an implemented feature.

Use a limited boost resource that replenishes through active flight or objectives. Avoid tying basic movement to payment or long waits. Make charge, attack readiness, and danger visible through shape, animation, and sound as well as color. A player should be able to learn the interaction from one safe example and then demonstrate it under pressure.

The six-second elimination chain already implemented is an inexpensive first test of mastery. It starts at ×1, rises to ×5, and resets after inactivity. It rewards efficient target selection but currently does not distinguish flight skill. Before adding permanent progression, observe whether players voluntarily replay to improve their score. A rising number is feedback, not sufficient depth by itself.

Recommended mission structure: a short safe launch lane, an encounter teaching one enemy, a route split requiring a choice, a mixed encounter, and an extraction encounter. Early waves should not introduce a high-damage long-range enemy without warning. Give each enemy a readable silhouette and a specific response: dodge the telegraphed shot, break the lock, or flank the slow armored unit.

Keep a fair failure loop. Display score, progress, and the failure cause; offer an immediate replay button. Do not punish experimentation with a long loading cycle. Local best score is useful feedback, but it is not a secure leaderboard. A public ranked competition would require an explicit trust model and additional engineering.

## A-Frame, Three.js, and the architecture decision

Keep A-Frame as scene owner and Three.js as its rendering implementation during validation. React should own menus, settings, and results. A-Frame components should own simulation and scene objects. Pass compact events between those layers. React should not recreate the entity hierarchy each frame, and gameplay code should not rewrite React-owned menu HTML.

A-Frame's performance guidance recommends changing frequently updated transforms through `object3D`, keeping draw calls low, and avoiding per-frame allocations. Apply those principles to the existing enemy loops and effects. Its broad draw-call guidance is a starting point; the actual limit must be measured on selected hardware.[^4]

The compatibility decision is to preserve A-Frame 1.4 for now and route gameplay imports through its `AFRAME.THREE`. The installed Three 0.160 package remains for existing types and build-time export discovery; it is not a second browser renderer. That reduces runtime mismatch while avoiding an engine upgrade and gameplay rewrite in the same change. Type definitions are still newer than the runtime, so newly used APIs need runtime verification. A future upgrade must move A-Frame, runtime APIs, helpers, and tests together.

The old compilation failure justifies the Vite migration. Vite provides a development server and a static production build; this project uses the installed Vite 7 release and a root HTML entry. The official documentation describes the current tool and its Node requirements, but version-specific behavior should be checked against the installed package when changing configuration.[^5]

Use simulation time for gameplay deadlines. Pausing should stop spawns, AI, reload progress, mission countdowns, and input. Short cosmetic cleanup can still use wall-clock time if it cannot change combat state. A-Frame component lifecycle hooks are the natural boundary for stopping input and releasing resources.[^6] Browser visibility and pointer capture are separate signals: losing either must not leave the simulation running unexpectedly.

Mouse capture requires browser cooperation and user interaction. It is not universally available, particularly in embedded surfaces. The prototype offers cursor aim as a practical fallback and surfaces capture errors. Test both paths and keyboard focus explicitly; iframe launch settings must also be validated on the eventual host.[^7]

A direct Three.js rewrite is a later option only if profiling shows A-Frame entity overhead blocking the desired scene density, or if its ownership model creates persistent iteration cost. A move to another engine is a larger business decision because it trades the existing code for tooling, packaging, and renderer changes. Neither is justified by fashion. First measure a complete mission with representative enemies and effects.

## Performance and asset plan

Choose a minimum device before promising performance. Proposed engineering targets are 60 FPS at 1080p on the team's declared baseline laptop, no persistent frame-time spikes during spawning or shooting, and no continued GPU-memory growth after repeated sorties. These are internal targets, not measured claims. Record frame-time percentiles and load times with the hardware, browser, resolution, and build identifier.

Start with loading and GPU cost. Serve versioned local dependencies, compress the critical level and enemy meshes, and keep later content outside the initial download. The prototype now serves Draco locally. The original bike's bad texture remains preserved for inspection while a tiny geometry-built bike provides a working substitute. Original assets still ship in `public`; the next packaging pass should explicitly select demo assets rather than copy everything.

Track draw calls, triangles, materials, textures, and transient entities. Use shared geometry and materials for repeated effects, bounded enemy pools, and capped particles. Test at the maximum supported simultaneous enemy count. Dispose resources owned by a component when removing them, while avoiding disposal of assets shared by other instances. Three.js documents explicit disposal of textures, geometry, and materials.[^8]

Navigation and collision deserve their own budget. A visually complex GLB is not automatically a suitable collision mesh. Create a simplified collision representation and test high-speed movement across thin surfaces. Swept collision is preferable to checking only the endpoint after a boost. The present prototype still needs this work before flight through dense scenery can be considered dependable.

## Premium distribution

A free browser demo and a paid downloadable edition fit the selected business direction. itch.io documents that embedded HTML5 games currently accept donations; selling access is handled through a downloadable project type. Its browser upload guide also calls for relative asset paths and a ZIP containing the entry HTML.[^9] Therefore, do not put the full game into a free HTML5 embed and assume a price label will gate access.

For an early premium release, a downloadable itch.io edition is a smaller operational commitment than a custom payment platform. Steam becomes attractive when a packaged desktop build, controller support, save reliability, and sufficient content are ready. Steam currently charges a US$100 app fee, with recoupment after the documented adjusted-gross threshold; it is not a marketing budget or a guarantee of distribution success.[^10]

A desktop wrapper is an engineering project, not a change to a file extension. It needs controlled local resource loading, safe external-link handling, platform builds, signing where applicable, save paths, updates, and crash testing. Evaluate its footprint and behavior before choosing it. Keep browser and packaged gameplay on the same core so fixes apply to both. No wrapper or paid checkout is implemented in this baseline.

If browser-only paid access becomes a strict requirement, a server must validate a purchase and issue access to protected content. A localStorage flag is not an entitlement system. That route adds account support, delivery, recovery, and payment-provider integration. Prefer a storefront unless there is a demonstrated customer reason to own that complexity.

Steam demos can be associated with the full game, and Next Fest has specific demo, eligibility, and review requirements.[^11][^12] Choose an event after the demo meets quality goals. Do not rush an unstable prototype into a calendar slot or assume store review replaces game QA.

Ad-funded portals represent an alternative business model. CrazyGames describes an initial testing stage without monetization and a later full launch dependent on engagement results.[^13] That is relevant background but does not fit the selected premium-first plan. No ad SDK is needed in this prototype.

## Price and unit economics

Test US$9.99 and US$14.99 as potential prices for the planned full edition. These are proposed research points, not evidence of optimal pricing or a price recommendation for today's prototype. Show customers the actual demo, the promised content, and the price together. Asking whether someone likes a game is weaker evidence than observing a purchase of a finished product.

Use a scenario model before setting a production budget. The following model assumes a 25% average realized discount, a 30% distribution deduction, and a further 10% reduction for refunds/other variability. These are illustrative inputs, not verified storefront terms. Taxes, foreign exchange, payment fees, and actual contracts can change net proceeds. Do not count the resulting amount as profit until development, support, and acquisition costs are deducted.

`Illustrative net per sale = list price × 0.75 × 0.70 × 0.90`

| List price hypothesis | Illustrative net/sale | Sales for $5,000 cost | Sales for $20,000 cost |
|---|---:|---:|---:|
| $9.99 | $4.72 | 1,060 | 4,238 |
| $14.99 | $7.08 | 706 | 2,824 |

Counts use unrounded net-per-sale arithmetic and round up. Replace all assumptions with actual channel terms and realized data before financial commitments. Customer acquisition cost must fit inside contribution after support and other variable costs. Paid promotion is premature while the conversion rate and contribution are unknown.

The main early investment should be bounded developer time and a small playtest program. Avoid forecasting substantial income from comparable games' review counts. No reliable unit-sales data was established for the references, and multiplying reviews by an arbitrary factor would add false precision.

## Validation and marketing experiments

Recruit ten people who already enjoy arcade vehicle combat or movement-focused action games. Observe an uncoached first session. Ask them to start, move, shoot a target, pause, resume, and finish or fail a mission. Record where they hesitate, what they misunderstand, and whether the camera makes them uncomfortable. Include people who do not know the developer.

Internal first-pass gates: at least eight of ten start and achieve a first hit without help, no launch blocker on supported machines, and at least five choose a second attempt without being prompted. These are deliberately small qualitative gates. They do not establish a population conversion rate or prove product-market fit. Repeat with a fresh group after fixing the largest observed issue.

Once the controls work, compare the current wave loop against one mission using the proposed boost-through attack window. Keep art and difficulty as comparable as possible. Ask what decisions the player made, not which version they think the developer prefers. If the new mechanic does not improve recall, repeat play, or perceived control, simplify or replace it.

For premium value, show an honest full-edition scope alongside the demo. Ask what would have to improve for the price to feel reasonable. Separate comments about content amount from complaints about core play. More levels will not solve unreliable aiming, weak audio, or invisible threats.

Build marketing material from actual gameplay. A short clip should show speed, a readable dodge, an attack payoff, and the Mars setting in its opening moments. Test whether unfamiliar viewers can explain the game without narration. Use the browser demo as a low-friction trial, and later connect it to a real store page. Do not add a fake purchase or wishlist button before a destination exists.

Instrument only what answers a decision: demo launch, first movement, first shot/hit, wave completion, sortie result, replay, and a real store-page click. Initially use an observed playtest sheet or local event log. Before sending analytics externally, select a provider, define the information collected and retention, and make the user-facing disclosures appropriate to the launch. No external telemetry is present in this baseline.

## Delivery sequence and decision gates

The detailed task backlog is in `ROADMAP.md`. As a planning estimate, an experienced solo developer working consistently could spend the first two weeks stabilizing and testing the slice, the next two to four weeks proving the signature mechanic, and additional weeks producing content, audio, packaging, and store materials. This is not a promised release date; available time and playtest results determine the schedule.

Gate one is reliable play: build, input, pause, camera, combat, and results must work. Gate two is repeat interest: unfamiliar players should willingly try again and identify the distinctive mechanic. Gate three is premium value: the playable content and polish must support the stated price. Gate four is release readiness: packaging, saves, asset provenance, accessibility, and store promises must agree with the shipped product.

Stop expanding content if those gates fail. Allocate another bounded iteration to the strongest diagnosed issue, then test again. If multiple iterations cannot establish an appealing flight/combat loop, change the design before spending on a campaign. The goal is a sustainable, enjoyable game, and evidence should determine how much to invest.

## Sources

[^1]: Revival Productions. [Overload on Steam](https://store.steampowered.com/app/448850/Overload/). Released May 31, 2018; listing accessed September 13, 2026. Positioning and features only.
[^2]: Flippfly. [Whisker Squadron: Survivor on Steam](https://store.steampowered.com/app/2140100/Whisker_Squadron_Survivor/). Released February 21, 2025; listing accessed September 13, 2026. Campaign and progression features.
[^3]: Refract. [Distance on Steam](https://store.steampowered.com/app/233610/Distance/). Listing accessed September 13, 2026. Traversal and mastery modes.
[^4]: A-Frame. [Best Practices](https://aframe.io/docs/1.8.0/introduction/best-practices.html). Version 1.8 documentation, accessed September 13, 2026. Performance principles; project currently stays on 1.4.
[^5]: Vite. [Getting Started](https://vite.dev/guide/). Accessed September 13, 2026. Build model and environment requirements; installed project version is Vite 7.
[^6]: A-Frame. [Component documentation](https://aframe.io/docs/1.8.0/core/component.html). Direct page retrieval failed; lifecycle behavior was checked against installed A-Frame 1.4 source (`src/core/component.js` and `src/core/a-entity.js`).
[^7]: MDN. [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API). Accessed September 13, 2026. Activation and embedding constraints.
[^8]: Three.js. [Cleanup](https://threejs.org/manual/en/cleanup.html). Search-indexed primary documentation accessed September 13, 2026; direct page retrieval returned an error. Explicit disposal guidance is supported by the indexed text; no broader claims depend on this source.
[^9]: itch.io. [Uploading HTML5 games](https://itch.io/docs/creators/html5). Accessed September 13, 2026. Browser payments, download distinction, and ZIP paths.
[^10]: Valve. [Steam Direct Fee](https://partner.steamgames.com/doc/gettingstarted/appfee). Accessed September 13, 2026. App fee and recoupment.
[^11]: Valve. [Demos](https://partner.steamgames.com/doc/store/application/demos). Accessed September 13, 2026. Demo relationship and release workflow.
[^12]: Valve. [Steam Next Fest](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest). Accessed September 13, 2026. Participation and review preparation; verify specific event deadlines before registering.
[^13]: CrazyGames. [Developer documentation](https://docs.crazygames.com/). Accessed September 13, 2026. Basic versus full launch monetization.

Local evidence: checked-out `src/App.tsx`, `src/aframe-init.ts`, `src/components/`, build configuration and model binaries; supplied `rchovatiya88-marsxaijetfly.txt` repository export and `pasted-text.txt` analysis. Local assets have not been independently cleared for commercial redistribution.
