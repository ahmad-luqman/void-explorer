# Build sequence

Follow the progression described in [Building games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra), using the supplied screenshots and this repository's concept art as visual references. This is a plan for a fresh implementation, not a claim of access to the original source.

## Showcase milestones

The [official showcase](https://developers.openai.com/showcase/void-explorer) supplies the main milestone order. The technical sections below expand these milestones; their numbering is not a separate mandatory execution order.

1. Generate the game concepts — initial three-scene sheet created; further visual review remains.
2. Build the first vertical slice — implemented: manual flight, reachable destinations, and descent to surface hover.
3. Make flight and navigation feel right — direct targeting, searchable visual galaxy/system charts, pulse travel, obstacle-aware autopilot, and closing-speed arrival feedback implemented; further handling and route-planning polish remain.
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

Current progress: manual flight now checks the ship envelope against rendered ground and rock volumes, stops residual high-speed travel at contact, and holds at the edge of detailed coverage until replacement terrain arrives. Worker-generated terrain now grades from dense walking cells to a 48 km horizon radius, with a buried outer seam closure and shared rendered/collision triangles. Coast depth colors and procedural ground materials add detail. A drifting cloud shell now follows the terrain, and seeded rock/mineral fields provide local geometry with walking collisions. A worker-generated cube-sphere quadtree now adapts the full planet to observer distance with shared edges and bounded detail; ground generation predicts travel ahead of the ship. Planetary mesh morphing, bounded in-memory reuse, and cross-session IndexedDB storage of native planetary/contact meshes are implemented. The disk cache shares 32 MiB/48-entry limits across workers and falls back to generation when unavailable or corrupt. Native biome colors, dry-ground vegetation and bounded landmark clusters are now implemented. Independent per-tile refinement and unique authored points of interest remain.

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

Mechanical gear is complete. Return to the wider coastal visual-quality milestone: richer ground surfaces and stronger nearby cliff/foreground composition, then distant terrain, clouds and shoreline/water finish. Preserve existing terrain/save compatibility and the ship contact contract. Flight/camera feel, route planning, distinctive destinations and audio remain later work; release validation still needs broader browsers and real devices.

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
