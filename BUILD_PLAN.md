# Build sequence

Follow the progression described in [Building games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra), using the supplied screenshots and this repository's concept art as visual references. This is a plan for a fresh implementation, not a claim of access to the original source.

## Showcase milestones

The [official showcase](https://developers.openai.com/showcase/void-explorer) supplies the main milestone order. The technical sections below expand these milestones; their numbering is not a separate mandatory execution order.

1. Generate the game concepts — initial three-scene sheet created; further visual review remains.
2. Build the first vertical slice — implemented: manual flight, reachable destinations, and descent to surface hover.
3. Make flight and navigation feel right — direct targeting, searchable visual galaxy/system charts, pulse travel, obstacle-aware autopilot, and closing-speed arrival feedback implemented; damped handling/camera, atmospheric motion feedback and editable eight-stop routes are implemented; player/device feel review remains.
4. Upgrade rendering — sun-aware sky and atmospheric rims, local haze, animated water normals, and near-ground ship shadows implemented in WebGPU and WebGL; hardware profiling and further rendering polish remain.
5. Refine the spacecraft concept — dedicated turnaround sheet created, with a documented geometry contract.
6. Build and integrate AURORA — authored Blender model, compact GLB and mechanical landing gear integrated; further visual polish remains.
7. Make exploration physical — landing, walking, reboarding, takeoff, and local expedition saves implemented.
8. Keep the world coherent — shared terrain, water shading, cloud layers, persistent rock fields, obstacle-aware landing, and saved exploration implemented; adaptive cube-sphere flight terrain, predictive ground streaming, mesh morphing, and bounded terrain reuse are now implemented; rotating worlds and surface attachment are now implemented; further refinement remains.

## Incremental commits

Commit each coherent, reviewable milestone as work progresses. Separate art, implementation, and substantive fixes when they are independently useful. Run appropriate checks before implementation commits, record material limitations, and avoid accumulating the entire game in one final commit. Commit only project work; do not include unrelated changes or push unless requested.

## 1. Establish the experience and art direction — in progress

The first concept sheet covers orbital flight, atmospheric descent, and high-speed travel. Preserve the prompt and review the balance between faceted geometry and detail. Dedicated AURORA turnaround references and an authored Blender model are now present. A coastal landing sheet now establishes sparse fan vegetation and recognizable column landmarks. Further visual refinement remains.

The eventual experience: choose a visible star, accelerate toward it, approach a planet, descend continuously to its terrain, land, explore, board, and take off.

## 2. Build the first playable flight scene — implemented

Start with TypeScript, Vite, and Three.js, one authored or procedural placeholder ship, and one procedural planet. Establish acceleration, braking, steering, chase camera, pause, settings, and readable navigation. Verify rendering support on the target browser before choosing the initial backend; retain the simulation independently of rendering.

## 3. Add inspection and repeatable playtests

Expose a small development-only inspection API for position, target, flight mode, altitude, terrain readiness, and rendering counters. Create repeatable orbit, fast-travel, descent, and landing scenes. Use unit tests for generation and coordinate invariants, and browser tests for actual journeys using controls.

## 4. Represent the universe across scales — integer-cell addresses and interstellar scale implemented

Generate deterministic star systems and planet descriptions from seeds. Render distant stars from those real descriptions. Canonical integer cells and bounded kilometer offsets now separate physical addresses from the local simulation/rendering frame. Interstellar spacing is expanded 100 million times across roughly 15 light-years, preserving local system layouts and surface precision. Pulse speed scales with deep-space clearance and slows safely near systems. Charts, target selection, distance displays, and version-4 saves share the same addresses; version-2/3 saves migrate to their original system-relative or planet-relative locations.

## 5. Make descent continuous — adaptive planetary and precise local terrain implemented

Use one terrain sampling function for planet shape, water, biome colors, and ground collision. Add cube-sphere terrain with adaptive refinement and worker generation. Keep coarse coverage visible until replacement terrain is ready. Tie atmosphere and clouds to altitude; reduce approach speed near the surface and along shallow trajectories.

Current progress: manual flight now checks the ship envelope against rendered ground and rock volumes, stops residual high-speed travel at contact, and holds at the edge of detailed coverage until replacement terrain arrives. Worker-generated terrain now grades from dense walking cells to a 48 km horizon radius, with a buried outer seam closure and shared rendered/collision triangles. Coast depth colors and procedural ground materials add detail. A drifting cloud shell now follows the terrain, and seeded rock/mineral fields provide local geometry with walking collisions. A worker-generated cube-sphere quadtree now adapts the full planet to observer distance with shared edges and bounded detail; ground generation predicts travel ahead of the ship. Planetary mesh morphing, bounded in-memory reuse, and cross-session IndexedDB storage of native planetary/contact meshes are implemented. The disk cache shares 32 MiB/48-entry limits across workers and falls back to generation when unavailable or corrupt. Native biome colors, dry-ground vegetation and bounded landmark clusters are now implemented. Independent persistent tile uploads remain; three authored destinations and seven saved observations are implemented.

## 6. Add landing and surface exploration — implemented with rotating-world attachment

Require visible ground and collision data to agree before landing. Check slope and ship clearance. Add walking, boarding, takeoff, and persistent expedition state. Keep landed craft attached to rotating terrain. Verify complete journeys and reload behavior rather than relying solely on prepared screenshots.

## 7. Measure performance and improve rendering

Track frame timing, draw calls, triangle counts, terrain queue size, discarded work, and transferred buffers. Budget geometry by screen size, share indexed vertices, stabilize refinement, and avoid main-thread generation stalls. Compare the same scenes before and after changes. Evaluate WebGPU and shader-based atmosphere, water, lighting, and retro presentation while preserving simulation behavior.

Current progress: both binary stars contribute directional lighting. Sky color and haze follow local sun elevation, altitude, and planet palette; night skies retain visible stars. High graphics adds a bounded 1,024² ship shadow map near the ground. Shared water normals animate continuously across globe and local meshes without changing collision or coast geometry. Seeded clouds and instanced rock fields are now integrated. WebGPU now uses node materials for these effects and a native bloom pass, with automatic WebGL fallback and explicit compatibility settings. Volumetric weather, physical scattering, terrain self-shadowing, reflections, and hardware profiling remain.

## 8. Develop and integrate the authored ship — initial model implemented

Generate consistent turnaround references before modeling. Build and inspect the ship in Blender, preserve an editable source, and export a runtime model with a restrained material and draw-call budget. Match the four separate wings, canopy, engines, and lights established in the visual studies. Check the silhouette and cost in real flight scenes.

## 9. Polish and validate the full expedition

Refine terrain continuity, atmospheres, ring lighting, speed effects, sound, graphics settings, and saved progress. Test targeting a distant star, traveling to its system, descending, landing, walking, saving/reloading, boarding, and leaving again. Capture comparable images and performance measurements on the actual target hardware.

The article's separate ocean and 2D game experiments are reference material, not additional games in this project. Techniques such as coherent procedural water can be applied where useful.

## Stage boundary

The user authorized game implementation after the concept milestone. A playable expedition is now present in `game/`, including worker-generated terrain, continuous descent, triangle-based safe landing, walking, reboarding, takeoff, saved progress, rotating worlds, integer-cell interstellar addressing, and cross-session terrain reuse. This is not the finished reference game. Coastal concepts, seeded biome regions, vegetation and recognizable surface landmarks are now present. Further terrain streaming refinement and spacecraft/presentation polish remain later stages. See `game/IMPLEMENTATION.md` for the current architecture and limits.

## Next implementation milestone

Mechanical gear is complete. Return to the wider coastal visual-quality milestone: richer ground surfaces and stronger nearby cliff/foreground composition, then distant terrain, clouds and shoreline/water finish. Preserve existing terrain/save compatibility and the ship contact contract. Flight/camera response, route planning, three authored destinations, layered audio and touch controls are implemented. Release validation still needs physical phones, actual Safari and lower-powered hardware; whole-scene environment acceptance remains active.

### Completed rotating-world implementation plan

1. Add deterministic axial rotation driven by saved simulation time. Keep generated geometry, cache keys, terrain sampling and scenery identities in the native planet frame; transform world-space queries at the boundary.
2. Transport landed craft, walkers, landing destinations and takeoff with that frame. Use surface-relative atmospheric flight, tapering rotation coupling between 130 and 260 km; retain inertial flight above it. Pause rotation during ground restoration.
3. Save attached poses in planet coordinates with a versioned rotation clock. Migrate existing stationary version-2 expeditions at zero rotation, including scenery clearings.
4. Verify transformed triangle contact, stable scenery, complete surface journeys, delayed ground restoration, pause/reset and both renderers. Commit the coherent implementation and validation milestones, then update the private build.

### Completed universe scale and terrain persistence plan

1. Introduce integer cells with bounded kilometer offsets, widen interstellar spacing while retaining local system layouts, and rebase the working frame away from surfaces. Keep charts, star rendering, targeting and pulse travel consistent with the same addresses.
2. Migrate version-2/3 expeditions without losing their system-relative or planet-relative locations. Save version-4 addresses independently of the current rendering origin.
3. Persist disposable native planetary/contact meshes in a versioned, bounded IndexedDB cache. Generation remains authoritative; unavailable, corrupt or full storage must never prevent exploration. Independent per-tile refinement remains a later terrain architecture change.
4. Verify cell boundaries, remote surface precision, legacy migration, long-distance arrival, cross-session terrain hits, cache limits and blocked storage, then run complete expeditions on both backends and publish privately.

### Completed richer exploration implementation plan

1. Preserve a coastal landing concept sheet and its exact prompt. Translate its faceted vegetation, open clearings, and landmark silhouettes into bounded runtime geometry.
2. Add seeded native-frame biome regions and consistent ground colors across globe, adaptive planet and contact terrain. Preserve terrain heights and invalidate older cached colors.
3. Add dry-ground fan plants, desert succulents, and recognizable stone/crystal landmark clusters with shared conservative collision bounds. Keep placement stable through movement, rotation and reload; protect older saved ship/player poses from new obstacles.
4. Show the local biome and nearest landmark on the surface instruments. Verify placement, geometry/collision bounds, save migration, shoreline landing/walking and both renderers; publish privately after the full production expedition checks.

### Coastal visual quality recovery — active

The generated study and runtime are visibly far apart. Feature completion is not visual acceptance. This milestone takes priority over landing-gear animation.

1. Establish a repeatable, production-accessible Lumen Coast expedition: a violet landing shelf, teal coves, offshore rock formations and layered ridges. Keep the coast part of the continuously traversable rotating planet and the authoritative collision heightfield. Version changed terrain so existing saves retain their original geography.
2. Replace smooth foreground and column/plant blockouts with faceted relief, irregular rock silhouettes and broad clustered fan foliage. Keep geometry budgets and conservative collision bounds explicit.
3. Correct the cyan lighting wash and scanline veil; refine stone color, shore water and cloud scale on both renderers. Preserve warm sunlight, cool shadows and readable ivory spacecraft materials.
4. Validate landing, walking, rotation, save/reload, boarding and takeoff; review actual runtime screenshots at shore and landscape viewpoints on WebGL and WebGPU. Acceptance requires readable coastline, foreground detail, broken rock silhouettes, distant relief and warm/cool separation. Record remaining differences from the concept honestly.
5. Commit coherent implementation and validation milestones and publish the verified private build. Hardware profiling, full concept parity and global biome art remain subsequent work.

First recovery pass implemented: versioned Lumen Coast geography, production entry, violet dry-ground correction, clustered faceted scenery, bay view control, cleaner lighting and material refinements. See [the runtime review](art/COASTAL_RUNTIME_REVIEW.md) for actual images and remaining differences. The wider visual milestone remains active: refine terrain silhouettes/materials and cloud lighting before returning to gear animation.

### Terrain detail pass — completed

1. Preserve terrain profiles 1 and 2 exactly; introduce profile 3 for new expeditions with eroded ridges, subsidiary peaks and stepped rock shelves outside the protected landing/walking area.
2. Extend coastal mesh detail to the nearby island/ridge views while keeping contact buffers below the existing 100,000-vertex/200,000-triangle limits. Keep the same mesh authoritative for contact and walking.
3. Add native-frame geological color bands, mineral variation and filtered small-scale normal detail on both renderers. Retain the existing water and lighting behavior.
4. Check legacy coastal save restoration, geometry/cache bounds and complete coastal excursions. Compare actual approach/on-foot images before committing the validated result and publishing privately.


Terrain pass delivered and reviewed on both rendering backends: profile-3 ridge detail, denser nearby contact terrain, geological material variation and filtered fine normals, with old geography preserved. All 80 unit tests, type checking, scoped lint, the static build and both complete production journeys pass. Actual comparison images and remaining gaps are in [the runtime review](art/COASTAL_RUNTIME_REVIEW.md). This closes the bounded terrain pass; the wider visual recovery milestone remains active.

### Coastal lighting, clouds and water — completed

1. Improve cloud shape/depth and directional lighting; maintain readable sky, warm sunlight and cool shaded ground at the repeatable Lumen Coast viewpoints.
2. Add terrain shading/self-shadowing within a measured cost budget; avoid flat uniform mountain faces and preserve both renderer paths.
3. Refine broad water glare, reflection breakup and shoreline transitions without moving collision heights or invalidating saves.
4. Review the actual approach, bay and parked-ship views and complete saved excursions on both backends. Then continue foreground art placement and spacecraft material/gear polish. Real-device profiling and broader release validation remain open.


Implementation scope: keep the existing cloud shell and add directional billow shading with bounded noise samples; widen the High-quality sun shadow to cover nearby relief using one 1536-square map; add filtered multi-scale water normals and varying roughness to break the broad glare. Preserve terrain profiles and all saved poses. Compare production coastal views and test day/night plus High/Low transitions on both backends. These are stylized approximations; volumetric weather and scene-reflection water remain later work.


Delivered the bounded lighting pass: directional cloud billows, clearer sky/haze, nearby terrain self-shadowing and filtered water swell/roughness. The final production coastal saved excursion passes on WebGL and WebGPU; day/night and High/Low shadow transitions also pass. All 80 unit tests, type checking, scoped lint and the static build pass. The software WebGPU walking wait was extended to 40 seconds after observing continued movement reaching the same roughly 28 m in about 29 seconds; no journey assertion was removed. See the runtime review for final images, measured scene cost and remaining visual limits.

### Coastal scene reconstruction — first pass delivered

User authorized planning and implementation against the coastal concept on 15 September 2026. The latest bay screenshot shows that foreground decoration alone cannot close the gap: near islands and towers block the vista, the clearing is empty, and regular material bands dominate the rocks.

1. Introduce terrain profile 4 for new expeditions. Keep profiles 1–3 byte-for-byte compatible in height sampling, and retain the safe landing/exit shelf. Open the central bay, distribute broken island silhouettes across middle distance, and add layered distant ridges. All land remains part of the rotating, traversable collision heightfield.
2. Build a reusable faceted rock/plant geometry kit with fractured crowns, basal rubble and broad folded leaves. Compose foreground clusters around the ship and overlook, protect both exit routes, and retain bounded instancing and collision envelopes. Existing terrain profiles keep their scenery positions and dimensions.
3. Replace regular geological stripes with localized, irregular stone variation and filtered cracks on both renderers. Refine ship material separation without changing the authored geometry/contact contract. Evaluate sky/water against the new composition and make bounded corrections where needed.
4. Validate terrain-profile migration, ground/prop collision bounds, open walking lanes, rotation, and complete saved excursions. Compare actual approach, parked-ship, on-foot bay and mobile images on WebGL and WebGPU. Keep actual captures and an honest visual review in the repository.
5. Commit coherent implementation and validation milestones and publish the verified private build. Acceptance for this pass is a visibly richer, open playable coastal vista; full concept parity remains unproven. Gear animation, global biome art, volumetric weather, scene reflections and real-device profiling follow.

Delivered: profile-4 bay/island composition, protected foreground shelf relief, a bounded fractured-rock/fan kit, composed scenery with gravel reservations, quieter geological materials, coastal cloud banks, AURORA material adjustments and immediate expedition camera alignment. All 83 unit tests, type checking, scoped lint and the static build pass; production saved excursions and older coastal restoration pass on both backends. See the runtime review for actual images and measured cost. This closes the bounded reconstruction pass, not the wider visual-recovery milestone or concept-parity work.

### Next art and presentation work

1. Improve bespoke cliff/boulder shapes and surfaces, and foreground composition from several walking positions. The safe central clearing and distant ridges still look simple.
2. Address procedural water highlights and shoreline transitions. Cloud banks remain sparse solid approximations; volumetric weather and scene reflections are separate later work.
3. Add authored spacecraft panel/recess detail, then mechanical gear animation. The material pass and entry-camera correction are delivered; broader flight/camera feel remains open.
4. Continue old/new saved-expedition checks and desktop/mobile image comparisons on both backends. Profile real devices before raising geometry/shader budgets or claiming release readiness.

### Water and nearby stone finish — delivered

1. Replace the visibly periodic ocean swell/highlight bands with a small deterministic, mipmapped wave texture shared by both backends. Keep phases in native planet coordinates, separate fine and broad scales, and reduce solar glare at the lighting stage. Preserve ocean heights, shore geometry and expedition formats.
2. Refine shoreline color transitions so mixed coastal triangles do not become broad white rims. Actual foam, scene reflections and displaced water remain separate work.
3. Add deterministic boulder/landmark shape variants and face-level mineral/crevice color detail within the existing prop collision envelopes. Retain placements, walking lanes and the 700-instance limit; record any draw-call cost.
4. Inspect approach, bay, parked-ship and landmark viewpoints; verify full new/legacy saved coastal journeys and day/night plus High/Low rendering on WebGL and WebGPU. Commit implementation and the actual screenshot review, then update the private build.


Delivered: shared filtered ocean wave detail, reduced specular glare, a narrower teal shore blend, and three bounded rock/landmark variants with spatial face colors. The original geometry and save contracts are preserved. All 85 unit tests, type checking, scoped lint and the static build pass. Full new/legacy coastal journeys pass on both renderers using Apple M4 Max/Metal; day/night and High/Low checks also pass. Actual captures, software-rendering limitations and the corrected return-to-ship test are recorded in [the runtime review](art/COASTAL_RUNTIME_REVIEW.md).

Next prioritize more sculpted cliff/foreground forms and authored spacecraft panels/recesses, then mechanical landing gear. The broad clearing, early coarse approach terrain, simple cloud lobes and remaining solar glare keep the wider concept-quality milestone open. Profile a wider range of devices before increasing shader or geometry budgets.

### Sculpted coastal formations — delivered

1. Rebuild the coastal sentinel and large foreground rock geometry with broad broken crowns, offset buttresses, deep vertical clefts and stepped faces. Keep every vertex within each existing prop's collision envelope; preserve placements, terrain profiles, saved poses and both walking lanes.
2. Allocate detail by visible size: use inexpensive chipped gravel for sub-meter stones and richer outcrops for the existing large coastal foreground groups. Keep the 700-prop cap and demonstrate that the coastal scenery triangle total does not exceed the previous kit. Keep shader complexity unchanged.
3. Review the bay, parked ship and closer foreground views, including native planet rotation and saved restoration. Run geometry/budget checks and complete new/legacy coastal journeys on WebGL and WebGPU, using the available Metal hardware path.
4. Preserve actual runtime captures and a candid review, commit coherent milestones, and update the private build. Broader terrain sculpting, spacecraft surface detail and mechanical gear remain subsequent work.


Delivered: chipped coastal sentinel crowns, split foreground outcrops and cheaper sub-meter gravel, with unchanged placement and collision/save contracts. Tests prove closed, bounded geometry and no increase in scenery triangles at four coastal positions. The final scene adds four draw groups in the bay while reducing the observed triangle count. All 87 unit tests, type checking, scoped lint and the build pass; complete new/legacy production journeys pass on both renderers. [The runtime review](art/COASTAL_RUNTIME_REVIEW.md) preserves actual images and remaining limits.

Next bounded implementation: authored AURORA panel/recess detail while preserving its dimensions, landing pads and engine/gear part contract; then mechanical gear animation. The larger environment still needs authored surface finish, better distant terrain and cloud/water work to approach the concept.

### AURORA surface detail — delivered

1. Replace uninterrupted nacelle armor with individually shaped plates and recessed access panels. Add selective wing hatches, cockpit-shoulder vent detail and fin seams using the existing seven materials.
2. Preserve the 28.8 m span, full model bounds, landing-pad locations, independently visible LandingGear and two named engine cores. Keep the export below the existing 5,000-triangle/14-mesh contract with no textures or decoder dependencies.
3. Regenerate the editable Blender source, studio image, GLB and measured asset report from the repository script in a fresh background Blender process. Review both studio and actual flight/parked views.
4. Validate the asset contract, authored/fallback loading and complete new/legacy saved coastal journeys on both renderers. Commit the model and actual review, then update the private build. Mechanical gear animation follows this bounded surface-detail pass.


Delivered: segmented nacelle armor, actual recessed service panels, wing hatches, shoulder louvers and fin seams, retaining exact bounds, all three pad centers, 12 runtime meshes and seven materials. The final export has 3,932 triangles and no external resources. Actual runtime review caught and removed overlapping panel backs; an asset regression check now protects both upper wells. All 88 unit tests, type checking, scoped lint and the static build pass. Authored/fallback loading and complete production orbital and new/legacy coastal journeys pass on both renderers. [The runtime review](art/COASTAL_RUNTIME_REVIEW.md) preserves final screenshots and limitations.

Next bounded milestone: mechanical landing-gear deployment and retraction, preserving final pad positions, collision/saved-pose contracts and both renderer paths. Wider terrain, cloud/water finish and device profiling remain open.


### Mechanical landing gear — delivered

1. Rig the authored legs with folding hinges and counter-rotating pads; retain deployed pad centers, full deployed bounds, seven materials and the existing mesh/triangle budgets. Preserve an editable Blender rig and the fallback craft.
2. Drive deployment from simulation time. Hold the final descent until the gear locks; lift clear before retracting. Restore landed/walking saves fully deployed and flight saves stowed, including delayed model/terrain loading, without changing the save schema.
3. Test deployed contact and the animated envelope, interruption/reset/pause and restoration. Review actual flight/landing/takeoff and complete new/legacy production excursions on both renderers.
4. Commit coherent asset/runtime and validation milestones, preserve actual review captures, and update the private build. Environment concept parity remains unfinished.


Delivered: six-joint folding gear with level pads, simulation-driven deployment/downlock, clearance-delayed retraction, and immediate saved-pose restoration. The fallback and delayed authored loading use the same deployment state. Deployed dimensions and pad positions are unchanged, with 12 meshes / 3,932 triangles / seven materials retained. All 90 unit tests, type checking, scoped lint and the static build pass. Authored/fallback and delayed-load saved journeys, plus complete production orbital and new/legacy coastal excursions, pass on WebGL and WebGPU. Actual captures and limitations are in [the runtime review](art/COASTAL_RUNTIME_REVIEW.md). Folded pads remain exposed; bay doors, telescoping hydraulics and suspension are future polish. The wider environment still falls short of the concept.

### Full completion objective — active

The user authorized completing every remaining area in the supplied summary. Track requirement-level evidence in [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md). Continue through environment art, flight/camera/effects/routes, authored destinations and streaming, layered audio, mobile controls, broad-browser/performance checks and final release validation. Do not declare the overall game complete after an individual bounded milestone.

Ground material, fuller cloud coverage, layered procedural audio and complete touch controls are implemented. The concept comparison remains open: expanded cloud banks still look geometric, distant cliffs remain coarse, and shoreline/foreground composition needs further work.

Current flight/release pass:
1. Integrate damped angular response with the exact exponential time integral; bound combined inputs and clear angular drift at autopilot/surface/reset transitions.
2. Make chase-camera rotation and speed FOV respond consistently across display rates. Preserve terrain collision, saved poses and autopilot destinations.
3. Validate 20/30/60/144 Hz behavior and full production excursions on both backends.
4. Extend repeatable journeys to Firefox and WebKit, and record warmed frame pacing on available hardware. Keep browser emulation distinct from actual phone certification.
5. Publish validated milestones privately, then continue the larger environment, route-planning, destinations and streaming requirements in the completion audit.

### Saved route planning — implementation and validation

1. Queue up to eight unique chart destinations, display their bearing and direct leg lengths, and reorder/remove stops through the existing map.
2. Follow each leg with the existing obstacle-aware autopilot. Engage pulse for distant legs, consume only reached stops, and retain the unfinished itinerary when steering/throttle/braking or editing interrupts it.
3. Persist optional routes in compatible expedition saves. Validate IDs and limits atomically; restoration always leaves the route paused. Keep older saves without a route valid.
4. Check ordered arrivals, manual interruption, editing, saved restoration, desktop/mobile chart layout and production journeys. Publish with the verified sound/touch/handling/browser milestones.

Next environment pass remains the highest visual priority: improve distant terrain forms and cloud-bank silhouettes, then shoreline/foreground composition. The concept gap is still visible; the completion audit must remain open through those changes, authored destinations, streaming refinement and remaining device validation.

### Coastal cliff and cloud silhouette pass — delivered

1. Add terrain profile 5 for new expeditions, retaining exact profiles 1–4 and the protected landing/walking shelf. Shape broken cliff shoulders and gullies into the authoritative heightfield.
2. Reallocate the coastal contact grid: retain sub-300 m walking detail and at-most-75 m cells to 3 km, use at-most-400 m cells across the visible 3–18 km ridges, and relax the remote horizon. Stay below 100,000 vertices/200,000 triangles; old profiles keep their original grids.
3. Replace the cloud banks' flattened bases with overlapping rounded billows and softer shaded undersides, retaining bounded instancing and native planetary placement.
4. Verify profile-4 restoration, new geometry/collision budgets, both production journeys and actual paired coast views. Judge the result against the concept, then commit the validated work.


Delivered: profile-5 cliff shoulders, denser visible ridge geometry at the same vertex/triangle budget, rounded cloud bases, and removal of the giant background wall. Profiles 1–4 and protected surface poses remain compatible. All 103 unit tests and complete production journeys on both renderers pass, including saved coastal profiles 3–5. The next visual work is shoreline depth/breakers, distant material treatment and foreground composition; authored destinations, streaming refinement and remaining device validation stay in the full completion audit.

### Depth-aware coastal water — delivered

1. Carry signed terrain elevation through globe/contact/adaptive mesh generation, worker transfer, bounded caches and LOD morphing. Reject old cached buffers and retain all collision positions and saved geography.
2. Use the shared depth field for teal shallows, deeper offshore color, moving shoreward foam bands and stronger wave-normal breakup on both WebGL and WebGPU.
3. Verify depth sampling, memory accounting, cache validation and morph continuity, then compare actual coast/water views and complete old/new saved expeditions on both backends. Commit and publish only the validated result; do not claim scene-reflection or physical-wave geometry from shading effects.

Delivered: shared signed-depth buffers, matching WebGL/WebGPU shallows and filtered foam bands, stronger ripple shading and cache/morph compatibility. All 105 unit tests, type checking, scoped lint and the static build pass. Actual-canvas animation/color and disk-restoration checks pass on both backends; full production orbital/coastal journeys preserve profiles 3–5. Foam visibility and water-light composition remain visual polish, alongside distant material and foreground/cloud integration. Continue with authored destinations, speed/atmosphere feedback and streaming refinement while retaining the full completion audit.

### Flight motion and atmospheric feedback — delivered

1. Replace elapsed-time-times-speed dust with continuously integrated, heading-aligned streaks. Scale their range and visibility for atmospheric flight, cruise and pulse; keep the central aiming corridor clear.
2. Add bounded, tapered wing vapor in dense atmosphere at speed, with restrained turn response. Preserve ship geometry, simulation/camera poses, collision and saves; freeze effects with simulation time and hide them during surface operations.
3. Verify pause/reset/turn and quality behavior, bounded geometry and frame-rate independence. Inspect actual moving gameplay on WebGL/WebGPU, run full production journeys and retain captures before private publication.

Delivered: integrated heading-aligned streaks with atmosphere/cruise/pulse envelopes and short, soft-edged wing vapor. The central view stays clear, Low halves the streak count, and both effects obey pause/reset and surface state. All 108 unit tests, type checking, scoped lint, the static build, motion checks and full production journeys pass on both renderers. Elevated-flight review exposed distant terrain striping and Low-quality planet shimmer; investigate these during the next terrain/material pass. Authored destinations, streaming refinement and remaining environment/device acceptance remain open.

### Terrain and distant shader artifact review — delivered

1. Isolate elevated coastal striping and small-planet shimmer with repeatable paused views and individual render layers. Distinguish geometry, overlapping surfaces and unfiltered shader detail before editing.
2. Fix the demonstrated causes while retaining saved terrain profiles and collision agreement; filter detail by projected pixel size where appropriate.
3. Preserve before/after gameplay evidence on both renderers and both quality settings. Verify affected geometry/material invariants, streaming and complete saved production expeditions before publication.

Delivered: cell-aspect normal blending reduces dense contact-grid lighting stripes, broader filtered weather replaces tiny orbital cloud speckles, and powered ring patterns filter toward analytic averages below pixel scale. All 109 tests, type checks, scoped lint, static build and dual-renderer High/Low/day/night plus full production saved journeys pass. Geometry, collision, saved profiles and transferred cache payloads are unchanged. Independent terrain refinement and full concept acceptance remain open. Next expand authored exploration destinations and saved discovery progress, then continue streaming and foreground/cloud integration.

### Authored destinations and expedition journal — delivered

1. Author distinct desert and ice sites alongside Lumen Coast, using fixed native coordinates, deliberate landmark arrangements, open landing/walking routes and local survey observations. Keep terrain geometry and existing saved poses intact.
2. Expose sites in the chart and provide continuous orbital-to-surface guidance. New-expedition shortcuts may start near a site, but ordinary navigation must reach it through flight. Manual input cancels guidance safely.
3. Let players approach observations on foot, record them, and revisit a journal with descriptions and progress. Persist discoveries and the selected site compatibly; validate malformed records before changing live state.
4. Verify dry/even landing footprints, prop budgets/collisions, rotation, navigation, actual walking surveys and saved restoration. Review distinctive views and full production journeys on both renderers, then publish the validated result.


Delivered: Ember Relay and Glass Choir join Lumen Coast with seven saved observations, a responsive field journal, fixed collidable landmark kits, and continuous rotating-world site guidance. New-expedition shortcuts and ordinary interplanetary travel both work. Walking tests protect the complete survey/return loop, and optional save fields preserve older expeditions. Paired production captures and the visual limitations are in [the runtime review](art/COASTAL_RUNTIME_REVIEW.md). The wider environment concept gap remains open.

### Terrain-streaming continuity and load behavior — active

1. Measure sustained surface travel through repeated patch replacements, recording worker generation, upload/morph costs, cache behavior and rendered frame pacing separately. Include warm and cold paths on both renderers; retain actual device/browser context.
2. Inspect the stretched grid and distant terrain revealed at the authored sites. Refine independent terrain regions within explicit geometry/memory budgets while keeping shared boundaries watertight and the collision surface authoritative.
3. Preserve every saved terrain profile, native rotation, landing footprint and walking pose. Verify seam/LOD transitions and landing during background work, including stale worker replies and cache restoration.
4. Compare actual moving gameplay and both renderer captures, then rerun production journeys before publication. Continue foreground/cloud/water integration and the remaining physical-device validation afterward; the full completion objective stays active.


Measurement finding: a 30-second traverse replaces roughly 45 contact patches, exceeding the 32 MiB disk cache working set. A shorter repeated route confirms four disk hits, but every hit still prepares normals and the circular seam on the main thread. The first implementation moves these derived buffers to the worker while preserving cached authoritative geometry. Delivered and measured: mean ground application falls from 8.87 to 1.47 ms on WebGL and 12.86 to 2.95 ms on WebGPU in the initial 30-second samples. All 116 unit tests and terrain/storage/production browser journeys pass on both renderers. Standard WebGPU also passes after a water-shader channel-access fix. Raw timings, cached repeats and hardware limitations are retained in art/benchmarks/streaming-2026-09-17. Independent terrain-region refinement remains next.

### Square outer contact regions — delivered

Replace the tensor-product grid outside the protected 1.2 km walking square with a quadtree of square regions. Share every boundary vertex across region resolutions and interpolate added protected-boundary vertices from the old walking triangles. Serialize a compact integer query tree so collision tests the rendered triangles without a main-thread spatial-index rebuild. Preserve all terrain height profiles, rotating-world transforms and save poses.

Use 75 m outer cells close to the protected core, 300 m cells through the profile-5 ridges, and progressively larger distant regions. Retain the existing 100,000-vertex/200,000-triangle ceiling and bounded worker/cache lifecycle. Bump only the disposable cache revision. Verify topology, all five saved walking surfaces, region boundaries, storage, moving flight, authored-site loops and both production renderers. Measure sustained/cached traversal before private publication. Region topology is independently refined; complete contact patches are still transferred and replaced together. All 123 unit tests, both renderer journeys, authored-site surveys, sustained/cached traversal and Firefox/WebKit production regressions pass. The measured CPU/memory tradeoffs and actual gameplay captures are retained in the art review.

### Next environment integration pass

The shared-edge outer mesh removes the narrow cliff corridor, but current captures still show solid, separate cloud lobes, repetitive close-ground texture, sparse foreground composition and broad pale hills around the authored sites. Improve cloud edges, density and sunlight response first using bounded geometry/shading that works during orbit, flight and walking. Compare day/night and High/Low views on both renderers, then refine foreground rock/fan/dust groupings while retaining safe walking lanes and landing footprints. The concept remains the visual acceptance reference; a passing feature or shader test is not whole-scene acceptance.

### Soft coastal cloud volumes — delivered

Replace the 240 opaque cloud lobes with 16 volume bounds and one shared material/atlas. Seed four 48³ density fields, interpolate their atlas slices, and integrate translucent density along the viewing ray. Store a density gradient alongside the field for bounded lighting cost; keep native world placement and binary-sun daylight response. Use 32 ray steps on High and 16 on Low, retaining a fixed 1.69 MiB atlas and 192 bounding-box triangles.

Check close/interior/rotated-light views, the night-side sky, live quality changes and system disposal/recreation on both renderers. Review on-foot production scenes, preserve captures and record cold versus settled timing limits. The local banks are stylized density volumes with approximate gradient lighting and opaque-depth testing; they are not a full weather or multiple-scattering simulation. Whole-scene cloud/ground/shoreline integration remains part of visual acceptance.

Implemented: shared density/gradient atlas, per-bank camera and binary-sun coordinates, soft ray-integrated edges, and live High/Low detail updates. All 125 unit tests, TypeScript, scoped lint and the static build pass. Both renderer cloud fixtures and full production orbital/coastal saved journeys pass. Retained timing samples show loading/frame outliers; final device/performance and whole-scene art acceptance remain open. Browser-engine checks and private publication are recorded in the runtime review.

### Ground scale and overlook foreground — delivered

Reduce the generated slate repeat from six meters to 2.4 meters, blend a rotated phase to interrupt mirroring, and use slope-aware dust patches to give the clearing quieter areas. Keep native texture phase stable through terrain recentering on both renderers. Add three low rock/fan groups outside the protected landing area and both walking routes, retaining the 700-prop cap. Compare actual walking and parked-ship views against the coastal study; verify route clearance, saved journeys, fallback material and both renderer shaders before publication. Whole-scene visual acceptance remains open.

Delivered: finer slate and fallback scale, dual-phase dust-blended material, three validated low foreground groups and paired walking/side/ship captures. The 126-test suite passes, along with affected tests after final fan sizing, both production renderers and Firefox/WebKit material reviews. Next examine distant terrain/light separation and shoreline composition against the concept, retaining the broader physical-device/performance requirements.

### Distant haze and coastal water integration — delivered

Separate the fog tint from the bright sky horizon, retaining cooler distant layers with less opaque haze and cooler indirect fill. Add native radial weathering on steep rock faces to break up plain triangle fills without changing the walking surface. Replace the dominant long wave pairs with a balanced periodic spectrum at smaller detail/swell scales, then break foam bands with the same moving fields and make foam rougher than open water. Preserve exact terrain, water/collision levels, native texture phase, saves and geometry budgets. Compare current before/after walking, elevated-flight and near-water views on both renderers; retain night/orbit/quality and animation/cache coverage. Judge against the coastal study before publication, without claiming scene reflections or physical wave geometry.

Delivered: separate cooler haze, filtered steep-face weathering, balanced fine-wave normals and broken foam using approximate shore distance. All 126 unit tests, final type/lint/build checks, both full production renderer journeys and Firefox/WebKit material reviews pass. Before/after water and paired walking/night views are retained in the runtime review. The visual gap remains visible in broad terrain facets, cloud/landscape composition and the approximate shoreline.

### Coastal loading and sustained frame pacing — active

The retained production WebGPU sample includes a 1.45-second coastal hitch. Two isolated profiling runs reproduce a smaller 183.3 ms cold-entry stall, with synchronous scenery generation and first-use material node setup in the trace; they do not establish the cause of the original outlier. Reduce confirmed preparation costs while preserving exact prop placement, collisions and saved scenes. Measure cold entry separately from settled play, retain outliers and compare both renderers. Continue whole-scene visual acceptance and broader physical-device validation afterward.

Initial implementation moves contact-entry scenery generation to the existing contact worker, including disk hits. Native prop coordinates are transformed at reply time; the main thread retains saved exclusion filtering and refuses fields more than 150 m from the pilot or belonging to another body. Fresh fields can also satisfy the landing check without regenerating placement. Unit coverage compares all five coast profiles and both authored destinations against the existing generator under world rotation, and protects legacy clearings and stale-reply fallback. Later walking/stale-focus generation and first-use material setup remain synchronous; measure this bounded change before claiming broader performance improvement.

Following the material-setup CPU stack into the built source identifies the second large task as `groundTextureData`, the 512² procedural fallback/relief generator. It now runs once at contact-worker startup and transfers the exact 1 MiB RGBA field before any contact mesh reply. Keep the same texture content, filtering and memory; verify transferred-buffer installation and actual image-failure rendering. Main-thread graph setup/upload are separate remaining costs, not the demonstrated cause of that procedural-generation task.

Worker-preparation milestone delivered locally: all 130 unit tests, type/lint/build, and both renderer production/site/fallback journeys pass. Main-thread scenery CPU samples fall from 80–83 ms to 5–6 ms; the exact procedural texture is also generated in the worker. Retained cold-entry maxima remain 283/100 ms, with external-image upload visible in the slower trace. Firefox and WebKit saved coastal production journeys also pass. The milestone is privately published as v34. Next address the remaining image/resource upload and whole-scene visual/device acceptance.

Next implementation prepares the optional ground image during startup: await decoding, upload through the active renderer, then enable flight. Bound the image wait to 1.5 seconds and preserve procedural/late-image behavior; cancellation must not touch a disposed GPU view. Verify normal, failed, stalled and late-loading image paths, then compare the same cold-entry CPU/frame captures. This changes when work happens, not image quality or total GPU upload cost. Continue the whole-scene art review after validating this specific cost.

Ground-image preparation is implemented and validated: all 135 unit tests, type/build/changed-module lint, six checks per renderer and Firefox/WebKit normal/late-image cases pass. Both cold-entry profiles have no sampled external-image upload and frame maxima around 50 ms; the earlier broader outlier/device limitations remain. The WebKit interruption was correlated with a 441-second host sleep and passed unchanged on repeat. Next return to large-scale coastal forms, cloud coverage/light and shoreline integration against the actual study, retaining native geography and safe surface routes.

The bounded image-preparation pass is privately published as v35. Continue the full environment comparison and outstanding hardware/performance requirements; this publication does not close the complete-game objective.

### Error-guided coastal cliff tessellation — delivered

Use nine native height samples per candidate region to locate ledges, gullies and shore crossings. Prioritize the largest normalized errors through three refinement levels, with a 28,000-leaf ceiling and unchanged total mesh limits. Retain the protected walking grid, all saved geography profiles, shared boundaries and authoritative triangle collision. Recompute this topology in the existing worker and invalidate disposable revision-8 caches. Review actual bay/ship views and measure coastal streaming on both renderers before publishing; broader cloud/foreground/shoreline composition and hardware acceptance remain open.

Delivered: bounded error-guided cliff/shore tessellation, shared boundaries, unchanged protected walking geometry and a zero-weight legacy-height optimization. All 141 unit tests, type/lint/build, both renderer production/normal/fallback and moving-coast/shoreline-cache checks pass. Firefox and WebKit walking/High/Low ground views pass. Native landscape sampling error falls from 45.21 m to 19.07 m; the coastal traversal improves despite the added geometry. WebGPU still has occasional 83 ms frames. Continue cloud/landscape light and foreground/shore composition, plus broader physical-device acceptance.


Private publication verified: Sites v36, source `a074fb2a400c6c93dda23393ea8292ffdcfc2726`, deployment `appgdep_6aabbaac20288191a443b7c07af437c0`, status `succeeded` on 17 September 2026. Published game source matches root commit `249e260` (tree `a97317760faf2209f90adeec4e58b8950c2e76ac`). Cliff refinement and reduced coastal height/scenery work are delivered; full visual/device acceptance remains open. Public GitHub was not pushed.


### Coastal sky and survey-stop foreground — delivered

Broaden the cloud composition above the ridges, add smaller billows, correct stretched-volume lighting and distinguish lit edges from denser interiors. Keep High/Low costs explicit and review close/inside/rotated/night views on both renderers. Add low rock/fan groups beside the first survey stop, retain both routes and the ship footprint, and protect version-2 saved poses with a bounded one-time scenery migration. Compare the combined actual landscape with the coastal study before publishing; whole-scene shoreline finish and physical-device validation remain open.

Implemented: wider varied cloud banks, smaller billows, inverse-scale lighting and bounded High-quality self-shadowing; three low foreground groups and scoped version-3 save migration. All 143 unit tests, type/lint/build, both production renderers and close/interior/rotated/night cloud checks pass. Extended walking reaches the existing steep shelf boundary at about 64 m and safely returns; the initial 88 m test assumption was corrected without changing terrain. Retained captures and timing limits are in the cloud-lighting benchmark and runtime review. Whole-scene art and physical-device acceptance remain open.

Final extended-walk/quality checks also pass on Firefox and WebKit. Runtime, screenshots, rejected drafts and raw frame records are committed; no whole-scene or physical-device completion claim is made.


Private publication verified: Sites v37, source `cdb1ecd3f008fe6763ba48cd6df91af217d768f9`, deployment `appgdep_6aae59b1936c8191bd0f19e14e1c203f`, status `succeeded` on 19 September 2026 at 09:45:44 UTC. Published game source matches root commit `165dfd8` (tree `d9d5c6605c0243318e2202b13697c5f8e15d3c74`). The archive contains the exact 35 validated static output files plus normalized hosting metadata. Cloud lighting, foreground composition and scoped old-save migration are delivered; whole-scene art and physical-device acceptance remain open. Public GitHub was not pushed.


### Stone and ground material integration — validated locally

Give solid-color foreground stones the existing slate/grit treatment at physical scale, with shallow filtered relief, subtle bedding and dust on upward faces. Keep stable per-prop texture phases through recentering/rotation and use the same GLSL-derived material on both renderers. Reuse the existing prepared texture/image rather than allocating another image; preserve all geometry, placement, collision and save records. Review actual bay, ship, cliff-edge and non-coastal site views, image-failure fallback, and frame pacing before private publication. Full shoreline/whole-scene and physical-device acceptance remain open.

Implemented: shared physical-scale slate/grit, filtered shallow relief, bedding and upward-face dust on instanced stones. Stable identity phases and actual instance-scale checks protect recentering/rotation. All 144 unit tests, type/lint/build, and seven production checks per renderer pass. Image fallback, both authored destinations, saved journeys and cliff-edge return are verified. Both settled renderer samples retain 16.7 ms medians and 16.8 ms maxima on the measured desktop; broader hardware and cold/moving outliers remain open.

Final Firefox/WebKit High/Low and cliff-edge/return material reviews also pass. Actual captures and bounded cost measurements are retained in the stone-material benchmark and runtime review.


Paused at the user's request on 19 September 2026 after committing the validated stone-material pass as root `8dff610`. Sites version 38 is saved but **not deployed**: source `9d3c1b667f3157a5794b9d66a7dffca3e521d08f`, tree `56f9443220ceab7a54d254d42441b9aa4121fd5a`, saved version ID `appgprj_6aa6863a38b481919adb6b70858ea4eb~appgver_f9d4263e74308191bc49acd28ac5335e`. The archive was verified against all 35 static output files plus normalized hosting metadata. The live private build remains v37. Resume only when requested; inspect current access and state before publishing the saved version. Public GitHub was not pushed.
